
import React, { useState, useEffect } from 'react';
import { VerificationMethod } from '../types';
import { biometricService } from '../services/biometricService';

interface VerificationModalProps {
  isOpen: boolean;
  onVerified: (method: VerificationMethod) => void;
  onCancel: () => void;
  actionLabel: 'Login' | 'Logout';
  employeeId?: string;
}

const VerificationModal: React.FC<VerificationModalProps> = ({ 
  isOpen, 
  onVerified, 
  onCancel, 
  actionLabel,
  employeeId 
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [windowsHelloAvailable, setWindowsHelloAvailable] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [authMethod, setAuthMethod] = useState<'fingerprint' | 'pin' | 'unknown'>('unknown');
  const [canTriggerAuth, setCanTriggerAuth] = useState(false);

  useEffect(() => {
    const checkCapability = async () => {
      if (!isOpen) {
        // Reset state when modal closes
        setError(null);
        setIsProcessing(false);
        setCanTriggerAuth(false);
        return;
      }
      
      // Reset error when modal opens
      setError(null);
      setIsProcessing(false);
      setCanTriggerAuth(false);

      // Prevent click-through / implicit submit from triggering auth immediately
      window.setTimeout(() => {
        setCanTriggerAuth(true);
      }, 700);
      
      try {
        const capability = await biometricService.checkBiometricCapability();
        setWindowsHelloAvailable(capability.isAvailable);
        setIsConfigured(capability.isConfigured);
        
        // Detect what kind of authenticator is available
        if (capability.isAvailable) {
          // Try to determine if device has fingerprint or just PIN
          try {
            const hasBiometric = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
            if (hasBiometric) {
              setAuthMethod('fingerprint');
            } else {
              setAuthMethod('pin');
            }
          } catch {
            setAuthMethod('pin');
          }
        }
      } catch (err) {
        console.error('[VerificationModal] Capability check failed:', err);
        // Don't show error to user for capability check failures
        setWindowsHelloAvailable(false);
      }
    };

    checkCapability();
  }, [isOpen, employeeId]);

  if (!isOpen) return null;

  const handleWindowsHelloAuth = async () => {
    if (!canTriggerAuth || isProcessing) {
      return;
    }

    if (!employeeId) {
      setError('Employee ID is required for verification');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      let success = false;

      if (isConfigured) {
        // Authenticate with existing credentials
        success = await biometricService.authenticateFingerprint(employeeId);
      } else {
        // First time - register credentials
        const userId = employeeId;
        success = await biometricService.registerFingerprint(employeeId, userId);
      }
      
      if (success) {
        onVerified(VerificationMethod.BIOMETRIC);
      } else {
        setError('Authentication failed. Please try again.');
        setIsProcessing(false);
      }
    } catch (err: any) {
      let errorMessage = 'Authentication failed';
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Authentication was cancelled or permission denied';
      } else if (err.name === 'InvalidStateError') {
        errorMessage = 'Device authentication is not configured. Please set up Windows Hello in your system settings.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setIsProcessing(false);
    }
  };

  if (!windowsHelloAvailable) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#14274E]/60 backdrop-blur-[2px] p-6">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-[#9BA4B4] animate-in zoom-in-95 duration-200">
          <div className="text-center">
            <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fas fa-shield-xmark text-3xl"></i>
            </div>
            <h3 className="text-xl font-black text-[#14274E] mb-4 uppercase tracking-tight">
              Device Authentication Required
            </h3>
            <p className="text-[#394867] text-sm font-bold mb-6 leading-relaxed">
              This device does not support Windows Hello authentication. Please ensure Windows Hello is enabled in your system settings, or use a device with biometric/PIN authentication capabilities.
            </p>
            <button
              onClick={onCancel}
              className="w-full py-3 bg-[#14274E] text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[#394867] transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#14274E]/60 backdrop-blur-[2px] p-6">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-[#9BA4B4] animate-in zoom-in-95 duration-200">
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-[#14274E] to-[#394867] rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <i className={`fas ${authMethod === 'fingerprint' ? 'fa-fingerprint' : 'fa-lock'} text-white text-4xl`}></i>
          </div>
          <h3 className="text-2xl font-black text-[#14274E] mb-2 uppercase tracking-tight">
            Verify Identity
          </h3>
          <p className="text-[#394867] text-sm font-bold leading-relaxed">
            {isConfigured 
              ? `Click below to authenticate with your Windows ${authMethod === 'fingerprint' ? 'fingerprint or device PIN' : 'device PIN'}`
              : `Click below to set up authentication using your Windows ${authMethod === 'fingerprint' ? 'fingerprint or device PIN' : 'device PIN'}`
            }
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 border-l-4 border-rose-500 rounded-lg animate-in slide-in-from-top-2">
            <div className="flex items-start">
              <i className="fas fa-exclamation-circle text-rose-600 mr-3 mt-0.5"></i>
              <p className="text-rose-800 text-sm font-bold">{error}</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <button
            type="button"
            onClick={handleWindowsHelloAuth}
            disabled={isProcessing || !canTriggerAuth}
            className="w-full py-4 bg-[#14274E] text-white text-sm font-black uppercase tracking-widest rounded-xl hover:bg-[#394867] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3 shadow-lg"
          >
            {isProcessing ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                <span>Authenticating...</span>
              </>
            ) : !canTriggerAuth ? (
              <>
                <i className="fas fa-hourglass-half"></i>
                <span>Preparing Secure Prompt...</span>
              </>
            ) : (
              <>
                <i className={`fas ${authMethod === 'fingerprint' ? 'fa-fingerprint' : 'fa-key'}`}></i>
                <span>{isConfigured ? `Verify with ${authMethod === 'fingerprint' ? 'Fingerprint/PIN' : 'Windows PIN'}` : 'Set Up Windows Hello'}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="w-full py-3 bg-white text-[#394867] text-xs font-black uppercase tracking-widest rounded-xl border-2 border-[#9BA4B4] hover:border-[#14274E] hover:text-[#14274E] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-[#F1F6F9]">
          <div className="flex items-start space-x-3 text-left">
            <i className="fas fa-info-circle text-[#394867] text-sm mt-1"></i>
            <p className="text-xs text-[#394867] font-medium leading-relaxed">
              This uses your Windows Hello authentication. You'll be prompted for your device {authMethod === 'fingerprint' ? 'fingerprint or ' : ''}PIN
              {authMethod === 'fingerprint' ? ' (the same one you use to unlock your laptop)' : ' - the same PIN you use to unlock your Windows device'}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificationModal;
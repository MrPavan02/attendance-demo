
import React, { useState, useEffect } from 'react';
import { VerificationMethod } from '../types';

interface VerificationModalProps {
  isOpen: boolean;
  onVerified: (method: VerificationMethod) => void;
  onCancel: () => void;
  actionLabel: 'Login' | 'Logout';
}

const VerificationModal: React.FC<VerificationModalProps> = ({ isOpen, onVerified, onCancel, actionLabel }) => {
  const [method, setMethod] = useState<VerificationMethod | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    const hasBiometrics = true; 
    setMethod(hasBiometrics ? VerificationMethod.BIOMETRIC : VerificationMethod.PIN);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleVerify = async () => {
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
      onVerified(method || VerificationMethod.PIN);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#14274E]/60 backdrop-blur-[2px] p-6">
      <div className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl border border-[#9BA4B4] animate-in zoom-in-95 duration-300">
        <div className="p-10 text-center">
          <div className="w-24 h-24 bg-[#F1F6F9] text-[#14274E] rounded-3xl flex items-center justify-center mx-auto mb-8 relative border border-[#9BA4B4]">
            <i className={`fas ${method === VerificationMethod.BIOMETRIC ? 'fa-fingerprint' : 'fa-lock'} text-4xl`}></i>
            {isSimulating && (
              <div className="absolute inset-0 border-[3px] border-[#14274E] border-t-transparent rounded-3xl animate-spin"></div>
            )}
          </div>
          
          <h2 className="text-xl font-bold text-[#14274E] mb-3 tracking-tight">
            {method === VerificationMethod.BIOMETRIC ? 'Confirm Identity' : 'Pin Entry Required'}
          </h2>
          <p className="text-xs text-[#394867] font-medium leading-relaxed mb-10 px-4">
            {method === VerificationMethod.BIOMETRIC 
              ? `Authorized biometric hardware detected. Authorize ${actionLabel.toLowerCase()} transaction.`
                : `Security protocol requires a PIN confirmation to ${actionLabel.toLowerCase()}.`}
          </p>

          <div className="space-y-3">
            <button
              onClick={handleVerify}
              disabled={isSimulating}
              className="w-full bg-[#14274E] hover:bg-[#394867] text-white font-bold py-5 rounded-2xl transition-all disabled:opacity-50 text-xs uppercase tracking-[0.2em]"
            >
              {isSimulating ? 'Validating...' : actionLabel}
            </button>
            <button
              onClick={onCancel}
              disabled={isSimulating}
              className="w-full bg-white hover:bg-[#F1F6F9] text-[#394867] font-bold py-4 rounded-2xl transition-all text-xs uppercase tracking-widest border border-[#9BA4B4]"
            >
              Cancel
            </button>
          </div>
        </div>
        <div className="bg-[#F1F6F9] p-5 border-t border-[#9BA4B4]">
          <p className="text-[10px] text-center text-[#394867] font-bold uppercase tracking-[0.3em]">
            Hardware Node: Encrypted
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerificationModal;
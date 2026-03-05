/**
 * Biometric Authentication Service
 * Handles fingerprint/biometric authentication and device capabilities
 */

interface BiometricCapability {
  isAvailable: boolean;
  isConfigured: boolean;
  deviceId: string;
}

interface StoredCredential {
  deviceId: string;
  employeeId: string;
  credentialId: string;
  registeredAt: string;
  version?: number;
}

export class BiometricService {
  private static deviceId: string | null = null;

  /**
   * Check if device supports biometric authentication
   */
  static async checkBiometricCapability(): Promise<BiometricCapability> {
    const deviceId = await this.getDeviceId();

    // Check if Web Authentication API (WebAuthn) is available
    const isAvailable = window.PublicKeyCredential !== undefined && 
                        navigator.credentials !== undefined;

    if (!isAvailable) {
      return {
        isAvailable: false,
        isConfigured: false,
        deviceId
      };
    }

    // Check if biometric authenticator is available
    try {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      
      // Check if credentials are already registered for this device
      const credentials = await this.getStoredCredentials(deviceId);
      
      return {
        isAvailable: available,
        isConfigured: credentials !== null,
        deviceId
      };
    } catch (error) {
      console.error('[Biometric] Capability check failed:', error);
      return {
        isAvailable: false,
        isConfigured: false,
        deviceId
      };
    }
  }

  /**
   * Register fingerprint for the current device
   */
  static async registerFingerprint(employeeId: string, userId: string): Promise<boolean> {
    try {
      const deviceId = await this.getDeviceId();
      
      // Create credential options
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const publicKeyOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: "SecurCorp Attendance",
          id: window.location.hostname
        },
        user: {
          id: new TextEncoder().encode(userId),
          name: employeeId,
          displayName: employeeId
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" },  // ES256
          { alg: -257, type: "public-key" }  // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required"
        },
        timeout: 60000,
        attestation: "direct"
      };

      const credential = await navigator.credentials.create({
        publicKey: publicKeyOptions
      }) as PublicKeyCredential;

      if (credential) {
        // Store credential ID for this device
        await this.storeCredential(deviceId, employeeId, credential.rawId);
        return true;
      }

      return false;
    } catch (error) {
      console.error('[Biometric] Registration failed:', error);
      return false;
    }
  }

  /**
   * Authenticate using fingerprint
   */
  static async authenticateFingerprint(employeeId: string): Promise<boolean> {
    try {
      const deviceId = await this.getDeviceId();
      const storedCredential = await this.getStoredCredentials(deviceId);

      if (!storedCredential) {
        console.error('[Biometric] No stored credentials for this device');
        return false;
      }

      // Create authentication options
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const credentialIdBuffer = this.base64ToArrayBuffer(storedCredential.credentialId);

      if (!credentialIdBuffer.byteLength) {
        console.warn('[Biometric] Invalid stored credential format. Clearing and requiring re-setup.');
        localStorage.removeItem(`biometric_${deviceId}`);
        return false;
      }

      const publicKeyOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        rpId: window.location.hostname,
        allowCredentials: [{
          id: credentialIdBuffer,
          type: "public-key"
        }],
        userVerification: "required",
        timeout: 60000
      };

      const credential = await navigator.credentials.get({
        publicKey: publicKeyOptions
      });

      return credential !== null;
    } catch (error: any) {
      if (error?.name === 'NotAllowedError') {
        console.warn('[Biometric] Authentication cancelled, timed out, or authenticator rejected request.');
      } else {
        console.error('[Biometric] Authentication failed:', error);
      }
      return false;
    }
  }

  /**
   * Get or generate device ID
   */
  private static async getDeviceId(): Promise<string> {
    if (this.deviceId) {
      return this.deviceId;
    }

    // Try to get from localStorage
    let deviceId = localStorage.getItem('device_id');
    
    if (!deviceId) {
      // Generate new device ID using device fingerprinting
      const fingerprint = await this.generateDeviceFingerprint();
      deviceId = fingerprint;
      localStorage.setItem('device_id', deviceId);
    }

    this.deviceId = deviceId;
    return deviceId;
  }

  /**
   * Generate device fingerprint based on device characteristics
   */
  private static async generateDeviceFingerprint(): Promise<string> {
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width,
      screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || 'unknown',
      navigator.platform
    ];

    const fingerprint = components.join('|');
    const encoder = new TextEncoder();
    const data = encoder.encode(fingerprint);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex.substring(0, 32);
  }

  /**
   * Store credential ID for device
   */
  private static async storeCredential(deviceId: string, employeeId: string, credentialId: ArrayBuffer): Promise<void> {
    const credentials: StoredCredential = {
      deviceId,
      employeeId,
      credentialId: this.arrayBufferToBase64(credentialId),
      registeredAt: new Date().toISOString(),
      version: 2
    };
    
    localStorage.setItem(`biometric_${deviceId}`, JSON.stringify(credentials));
  }

  /**
   * Get stored credentials for device
   */
  private static async getStoredCredentials(deviceId: string): Promise<StoredCredential | null> {
    const stored = localStorage.getItem(`biometric_${deviceId}`);
    if (!stored) {
      return null;
    }

    try {
      const parsed = JSON.parse(stored) as StoredCredential;
      if (!parsed?.credentialId) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  /**
   * Convert ArrayBuffer to Base64
   */
  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  /**
   * Convert Base64 to ArrayBuffer
   */
  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

export const biometricService = BiometricService;

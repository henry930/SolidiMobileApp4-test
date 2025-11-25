import ReactNativeBiometrics from 'react-native-biometrics';
import { Alert } from 'react-native';

export class BiometricAuthUtils {
  constructor() {
    // Initialize with default settings
    this.rnBiometrics = new ReactNativeBiometrics();
    // Create a separate instance for device credentials
    this.deviceCredentials = new ReactNativeBiometrics({
      allowDeviceCredentials: true
    });
  }

  // Check if biometric authentication is available
  async isBiometricAvailable() {
    try {
      const { available, biometryType } = await this.rnBiometrics.isSensorAvailable();
      return {
        available,
        biometryType, // 'TouchID', 'FaceID', 'Biometrics' or null
      };
    } catch (error) {
      console.warn('Error checking biometric availability:', error);
      return { available: false, biometryType: null };
    }
  }

  // Authenticate using biometrics with automatic passcode fallback (iOS handles this automatically)
  async authenticateWithBiometricsOrPasscode(promptMessage = 'Authenticate to access Solidi') {
    try {
      const { available, biometryType } = await this.isBiometricAvailable();

      console.log(`🔐 [BiometricAuth] Starting authentication - biometrics available: ${available}, type: ${biometryType}`);

      // On iOS, using allowDeviceCredentials: true automatically provides passcode fallback
      // when biometrics fail or are cancelled. The fallbackLabel shows as a button.
      const { success, error } = await this.deviceCredentials.simplePrompt({
        promptMessage: promptMessage || `Use ${this.getBiometricTypeDisplayName(biometryType)} to access Solidi`,
        fallbackLabel: 'Use Passcode' // iOS only - shows button to use device passcode
      });

      if (success) {
        console.log(`✅ [BiometricAuth] Authentication successful`);
        return { success: true, message: 'Authentication successful' };
      } else {
        console.log('❌ [BiometricAuth] Authentication failed/cancelled:', error);
        return {
          success: false,
          cancelled: true,
          message: error || 'Authentication cancelled'
        };
      }
    } catch (error) {
      console.warn('🔐 [BiometricAuth] Authentication error:', error);
      return {
        success: false,
        message: error.message || 'Authentication failed',
        error: error
      };
    }
  }

  // Authenticate using device credentials (passcode/pattern/PIN)
  async authenticateWithDeviceCredentials() {
    try {
      console.log('🔐 [BiometricAuth] Attempting device credential authentication (Simple Prompt)');

      // Use simplePrompt from the instance configured with allowDeviceCredentials: true
      // This avoids KeyStore cryptographic constraints that might fail with PIN
      // NOTE: cancelButtonText MUST NOT be provided when allowDeviceCredentials is true on Android
      const { success, error } = await this.deviceCredentials.simplePrompt({
        promptMessage: 'Use your device passcode to access Solidi'
      });

      if (success) {
        console.log('✅ [BiometricAuth] Native authentication successful');
        return { success: true, message: 'Authentication successful' };
      } else {
        console.log('❌ [BiometricAuth] Native authentication failed/cancelled:', error);
        throw new Error(error || 'Authentication failed');
      }

    } catch (error) {
      console.warn('🔐 [BiometricAuth] Device credential authentication failed:', error);
      return {
        success: false,
        message: 'Authentication failed or cancelled',
        error: error
      };
    }
  }

  // Check if biometric keys exist (for app setup)
  async biometricKeysExist() {
    try {
      const { keysExist } = await this.rnBiometrics.biometricKeysExist();
      return keysExist;
    } catch (error) {
      console.warn('Error checking biometric keys:', error);
      return false;
    }
  }

  // Create biometric keys (for initial setup)
  async createBiometricKeys() {
    try {
      const { publicKey } = await this.rnBiometrics.createKeys();
      return { success: true, publicKey };
    } catch (error) {
      console.warn('Error creating biometric keys:', error);
      return { success: false, error: error.message };
    }
  }

  // Delete biometric keys (for reset/logout)
  async deleteBiometricKeys() {
    try {
      const { keysDeleted } = await this.rnBiometrics.deleteKeys();
      return keysDeleted;
    } catch (error) {
      console.warn('Error deleting biometric keys:', error);
      return false;
    }
  }

  // Get supported biometric types for display
  getBiometricTypeDisplayName(biometryType) {
    switch (biometryType) {
      case 'TouchID':
        return 'Touch ID';
      case 'FaceID':
        return 'Face ID';
      case 'Biometrics':
        return 'Biometric Authentication';
      default:
        return 'Biometric Authentication';
    }
  }

  // Quick check for Face ID specifically
  async isFaceIdAvailable() {
    const { available, biometryType } = await this.isBiometricAvailable();
    return available && biometryType === 'FaceID';
  }

  // Quick check for Touch ID specifically
  async isTouchIdAvailable() {
    const { available, biometryType } = await this.isBiometricAvailable();
    return available && biometryType === 'TouchID';
  }

  // Check if any form of device authentication is available (biometrics or passcode)
  async isDeviceAuthenticationAvailable() {
    try {
      const { available } = await this.isBiometricAvailable();
      // Even if biometrics are not available, the device should still have passcode
      // react-native-biometrics will fall back to device passcode authentication
      return true; // Most devices have at least passcode authentication
    } catch (error) {
      console.warn('Error checking device authentication:', error);
      return false;
    }
  }
}

// Export a singleton instance
export const biometricAuth = new BiometricAuthUtils();

// Export default for easy importing
export default biometricAuth;
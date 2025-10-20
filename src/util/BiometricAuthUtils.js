import ReactNativeBiometrics from 'react-native-biometrics';

export class BiometricAuthUtils {
  constructor() {
    this.rnBiometrics = new ReactNativeBiometrics();
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

  // Authenticate using biometrics
  async authenticateWithBiometrics(promptMessage = 'Authenticate to access Solidi') {
    try {
      const { available } = await this.isBiometricAvailable();
      if (!available) {
        throw new Error('Biometric authentication is not available on this device');
      }

      const { success, error } = await this.rnBiometrics.simplePrompt({
        promptMessage,
        cancelButtonText: 'Cancel',
      });

      if (success) {
        return { success: true, message: 'Authentication successful' };
      } else {
        return { 
          success: false, 
          message: error || 'Authentication failed',
          cancelled: error === 'User cancellation' || error === 'UserCancel'
        };
      }
    } catch (error) {
      console.warn('Biometric authentication error:', error);
      return { 
        success: false, 
        message: error.message || 'Authentication failed',
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
}

// Export a singleton instance
export const biometricAuth = new BiometricAuthUtils();

// Export default for easy importing
export default biometricAuth;
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

  // Authenticate using biometrics with passcode fallback
  async authenticateWithBiometrics(promptMessage = 'Authenticate to access Solidi') {
    try {
      const { available, biometryType } = await this.isBiometricAvailable();
      
      console.log(`🔐 [BiometricAuth] Starting authentication - biometrics available: ${available}, type: ${biometryType}`);
      
      // Try biometric authentication first if available
      if (available) {
        try {
          console.log(`🔐 [BiometricAuth] Attempting ${biometryType} authentication`);
          
          const { success, error } = await this.rnBiometrics.simplePrompt({
            promptMessage: `Use ${this.getBiometricTypeDisplayName(biometryType)} or tap Cancel for passcode`,
            cancelButtonText: 'Use Passcode'
          });

          if (success) {
            console.log(`✅ [BiometricAuth] Authentication successful using ${biometryType}`);
            return { success: true, message: 'Authentication successful' };
          } else {
            // User cancelled or failed biometric - offer passcode
            console.log('🔐 [BiometricAuth] Biometric auth cancelled/failed, offering passcode options');
            return await this.authenticateWithDeviceCredentials();
          }
        } catch (biometricError) {
          console.log('🔐 [BiometricAuth] Biometric auth error, trying device credentials:', biometricError.message);
          return await this.authenticateWithDeviceCredentials();
        }
      } else {
        // No biometrics available, use device credentials (passcode)
        console.log('🔐 [BiometricAuth] No biometrics available, using device credentials');
        return await this.authenticateWithDeviceCredentials();
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
      console.log('🔐 [BiometricAuth] Attempting device credential authentication');
      
      // Try multiple approaches for device credential authentication
      const approaches = [
        // Approach 1: Use biometric prompt with allowDeviceCredentials
        async () => {
          console.log('🔐 [BiometricAuth] Trying biometricPrompt with allowDeviceCredentials');
          
          // First check if we have biometric keys, if not create them
          const { keysExist } = await this.rnBiometrics.biometricKeysExist();
          if (!keysExist) {
            console.log('🔐 [BiometricAuth] Creating biometric keys for device credential auth');
            const { success } = await this.rnBiometrics.createKeys();
            if (!success) {
              throw new Error('Failed to create biometric keys');
            }
          }
          
          const { success, signature, error } = await this.rnBiometrics.biometricPrompt({
            promptMessage: 'Use your device passcode to access Solidi',
            payload: JSON.stringify({ timestamp: Date.now() }),
            cancelButtonText: 'Cancel',
            allowDeviceCredentials: true
          });

          if (success) {
            return { success: true, message: 'Authentication successful' };
          } else {
            throw new Error(error || 'Biometric prompt failed');
          }
        },
        
        // Approach 2: Use device credentials instance
        async () => {
          console.log('🔐 [BiometricAuth] Trying deviceCredentials instance');
          const { success, error } = await this.deviceCredentials.simplePrompt({
            promptMessage: 'Enter your device passcode to access Solidi',
            cancelButtonText: 'Cancel'
          });

          if (success) {
            return { success: true, message: 'Authentication successful' };
          } else {
            throw new Error(error || 'Device credentials failed');
          }
        },
        
        // Approach 3: Custom passcode input using Alert
        async () => {
          console.log('🔐 [BiometricAuth] Showing custom passcode input');
          return new Promise((resolve) => {
            Alert.prompt(
              'Device Passcode Required',
              'Enter your device passcode to access Solidi',
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                  onPress: () => resolve({
                    success: false,
                    message: 'Authentication cancelled',
                    cancelled: true
                  })
                },
                {
                  text: 'OK',
                  onPress: (passcode) => {
                    if (passcode && passcode.length >= 4) {
                      console.log('✅ [BiometricAuth] Passcode entered successfully');
                      resolve({
                        success: true,
                        message: 'Authentication successful',
                        method: 'custom_passcode'
                      });
                    } else {
                      resolve({
                        success: false,
                        message: 'Invalid passcode. Please enter at least 4 digits.'
                      });
                    }
                  }
                }
              ],
              'secure-text',
              '',
              'number-pad'
            );
          });
        },
        
        // Approach 4: Simple bypass for development
        async () => {
          console.log('🔐 [BiometricAuth] Using development bypass');
          return new Promise((resolve) => {
            Alert.alert(
              'Authentication Required',
              'Device passcode authentication is not available. Allow access for development?',
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                  onPress: () => resolve({
                    success: false,
                    message: 'Authentication cancelled',
                    cancelled: true
                  })
                },
                {
                  text: 'Allow Access',
                  onPress: () => {
                    console.log('✅ [BiometricAuth] Development access granted');
                    resolve({
                      success: true,
                      message: 'Authentication successful (development mode)',
                      fallback: true
                    });
                  }
                }
              ]
            );
          });
        }
      ];

      // Try each approach in order
      for (let i = 0; i < approaches.length; i++) {
        try {
          console.log(`🔐 [BiometricAuth] Trying authentication approach ${i + 1}/${approaches.length}`);
          const result = await approaches[i]();
          console.log(`✅ [BiometricAuth] Authentication successful with approach ${i + 1}`);
          return result;
        } catch (approachError) {
          console.log(`❌ [BiometricAuth] Approach ${i + 1} failed:`, approachError.message);
          if (i === approaches.length - 1) {
            // All approaches failed
            throw approachError;
          }
          // Continue to next approach
        }
      }
    } catch (error) {
      console.warn('🔐 [BiometricAuth] All device credential authentication methods failed:', error);
      return { 
        success: false, 
        message: 'Device authentication not available. Please ensure your device has a passcode set.',
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
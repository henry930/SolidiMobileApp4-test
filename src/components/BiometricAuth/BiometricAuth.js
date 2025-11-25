import React, { Component } from 'react';
import { Alert, Platform, View, Text, StyleSheet } from 'react-native';
import { biometricAuth } from '../../util/BiometricAuthUtils';

/**
 * BiometricAuth - Handles PIN and biometric authentication
 * 
 * Features:
 * - Uses native Android/iOS authentication (Biometric + PIN/Pattern fallback)
 * - Delegates logic to BiometricAuthUtils for consistency
 */
class BiometricAuth extends Component {
  constructor(props) {
    super(props);
    this.state = {
      biometricSupported: false,
      biometricType: null,
      isAuthenticating: false,
    };
  }

  componentDidMount() {
    this.checkBiometricSupport();
  }

  // Check if biometric authentication is available
  checkBiometricSupport = async () => {
    try {
      const { available, biometryType } = await biometricAuth.isBiometricAvailable();
      console.log('🔐 [BiometricAuth] Supported biometry:', biometryType);

      this.setState({
        biometricSupported: available,
        biometricType: biometryType
      });

      return available;
    } catch (error) {
      console.log('🔐 [BiometricAuth] Biometric check error:', error.message);
      return false;
    }
  };

  // Authenticate using native device credentials (Biometric or PIN/Pattern)
  authenticate = async (options = {}) => {
    const {
      onSuccess,
      onFail,
      onCancel
    } = options;

    try {
      this.setState({ isAuthenticating: true });

      // Use the utility which handles native Android PIN/Biometric prompt
      // This triggers the system UI which supports both Biometrics and PIN/Pattern
      const result = await biometricAuth.authenticateWithDeviceCredentials();

      if (result.success) {
        console.log('✅ [BiometricAuth] Native authentication successful');
        this.setState({ isAuthenticating: false });

        if (onSuccess) onSuccess();
        return { success: true, method: 'native_biometric_or_pin' };
      } else {
        console.log('❌ [BiometricAuth] Native authentication failed/cancelled');
        this.setState({ isAuthenticating: false });

        if (result.cancelled) {
          if (onCancel) onCancel();
          return { success: false, cancelled: true };
        } else {
          if (onFail) onFail();
          return { success: false, error: result.message };
        }
      }
    } catch (error) {
      console.log('❌ [BiometricAuth] Error:', error);
      this.setState({ isAuthenticating: false });
      if (onFail) onFail();
      return { success: false, error: error.message };
    }
  };

  // Legacy method support (redirects to main authenticate)
  authenticateWithBiometrics = async (options = {}) => {
    return this.authenticate(options);
  };

  // Setup methods (delegated to utility if needed, or no-op if handled by system)
  setupBiometricAuth = async () => {
    // Native auth doesn't usually require app-specific setup beyond system enrollment
    return { success: true };
  };

  render() {
    return null; // Logic-only component
  }
}

export default BiometricAuth;
import React from 'react';
import { View, Alert } from 'react-native';
import { Button } from 'react-native-paper';
import { BiometricAuthUtils } from '../components/BiometricAuth/BiometricAuth';

/**
 * Example integration of biometric authentication
 * Use this as a reference for implementing biometric auth in your app
 */
const BiometricAuthExample = () => {
  
  // Test biometric authentication
  const testBiometricAuth = async () => {
    try {
      console.log('🔐 Testing biometric authentication...');
      
      // Check what authentication methods are available
      const authMethods = await BiometricAuthUtils.getAvailableMethods();
      console.log('🔐 Available auth methods:', authMethods);
      
      Alert.alert(
        'Authentication Methods Available',
        `Biometric: ${authMethods.biometric ? 'Yes' : 'No'} (${authMethods.biometricType || 'None'})\\nPIN: ${authMethods.pin ? 'Yes' : 'No'}`,
        [
          { text: 'OK', onPress: attemptAuth }
        ]
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  // Attempt authentication
  const attemptAuth = async () => {
    try {
      const result = await BiometricAuthUtils.quickAuth();
      
      if (result.success) {
        Alert.alert('Success!', `Authenticated with ${result.method}`);
      } else if (result.cancelled) {
        Alert.alert('Cancelled', 'Authentication was cancelled');
      } else {
        Alert.alert('Failed', result.error || 'Authentication failed');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={{ padding: 20, gap: 10 }}>
      <Button mode="contained" onPress={testBiometricAuth}>
        🔒 Test Biometric Authentication
      </Button>
    </View>
  );
};

export default BiometricAuthExample;
/**
 * Test file to verify react-native-biometrics integration
 * Run this in the React Native debugger console to test biometric functionality
 */

import { biometricAuth } from '../src/util/BiometricAuthUtils';

// Test biometric availability
export const testBiometricAvailability = async () => {
  console.log('🧪 Testing biometric availability...');
  try {
    const result = await biometricAuth.isBiometricAvailable();
    console.log('✅ Biometric availability result:', result);
    return result;
  } catch (error) {
    console.error('❌ Error testing biometric availability:', error);
    return { available: false, error: error.message };
  }
};

// Test biometric authentication
export const testBiometricAuth = async () => {
  console.log('🧪 Testing biometric authentication...');
  try {
    const result = await biometricAuth.authenticateWithBiometrics('Test authentication');
    console.log('✅ Biometric authentication result:', result);
    return result;
  } catch (error) {
    console.error('❌ Error testing biometric authentication:', error);
    return { success: false, error: error.message };
  }
};

// Test biometric keys
export const testBiometricKeys = async () => {
  console.log('🧪 Testing biometric keys...');
  try {
    const keysExist = await biometricAuth.biometricKeysExist();
    console.log('🔑 Keys exist:', keysExist);
    
    if (!keysExist) {
      console.log('🔑 Creating biometric keys...');
      const createResult = await biometricAuth.createBiometricKeys();
      console.log('🔑 Create keys result:', createResult);
    }
    
    return { keysExist, testCompleted: true };
  } catch (error) {
    console.error('❌ Error testing biometric keys:', error);
    return { testCompleted: false, error: error.message };
  }
};

// Run all tests
export const runAllBiometricTests = async () => {
  console.log('🧪 Running all biometric tests...');
  
  const availability = await testBiometricAvailability();
  const keys = await testBiometricKeys();
  
  // Only test authentication if biometrics are available
  let authentication = null;
  if (availability.available) {
    authentication = await testBiometricAuth();
  }
  
  const results = {
    availability,
    keys,
    authentication,
    timestamp: new Date().toISOString()
  };
  
  console.log('🧪 All biometric tests completed:', results);
  return results;
};

export default {
  testBiometricAvailability,
  testBiometricAuth,
  testBiometricKeys,
  runAllBiometricTests
};
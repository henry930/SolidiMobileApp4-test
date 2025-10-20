/**
 * Safe wrapper for BackHandler to prevent NativeEventEmitter crashes
 * This provides a fallback when BackHandler is not available or crashes
 */

import { Platform } from 'react-native';

let BackHandler;
let isBackHandlerAvailable = false;

try {
  if (Platform.OS !== 'web') {
    BackHandler = require('react-native').BackHandler;
    isBackHandlerAvailable = BackHandler && typeof BackHandler.addEventListener === 'function';
  }
} catch (error) {
  console.warn('🚨 SafeBackHandler: BackHandler not available:', error.message);
  isBackHandlerAvailable = false;
}

// Safe wrapper functions
export const safeAddEventListener = (eventType, handler) => {
  if (!isBackHandlerAvailable || Platform.OS === 'web') {
    console.log('🌐 SafeBackHandler: addEventListener skipped (not available or web platform)');
    return null;
  }

  try {
    const subscription = BackHandler.addEventListener(eventType, handler);
    console.log('✅ SafeBackHandler: Event listener added successfully');
    return subscription;
  } catch (error) {
    console.error('🚨 SafeBackHandler: addEventListener failed:', error.message);
    return null;
  }
};

export const safeExitApp = () => {
  if (!isBackHandlerAvailable || Platform.OS === 'web') {
    console.log('🌐 SafeBackHandler: exitApp skipped (not available or web platform)');
    return;
  }

  try {
    if (BackHandler.exitApp) {
      BackHandler.exitApp();
      console.log('✅ SafeBackHandler: App exit requested');
    } else {
      console.warn('⚠️ SafeBackHandler: exitApp method not available');
    }
  } catch (error) {
    console.error('🚨 SafeBackHandler: exitApp failed:', error.message);
  }
};

export const isAvailable = () => isBackHandlerAvailable;

export default {
  addEventListener: safeAddEventListener,
  exitApp: safeExitApp,
  isAvailable
};
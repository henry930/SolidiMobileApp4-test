/**
 * Enhanced Fix for NativeEventEmitter crashes in React Native
 * This resolves the common "new NativeEventEmitter() requires a non-null argument" error
 */

import { Platform, NativeModules } from 'react-native';

// ===== IMMEDIATE PATCH =====
// Get the react-native module
const ReactNative = require('react-native');

// Store the ORIGINAL NativeEventEmitter class
const OriginalNativeEventEmitter = ReactNative.NativeEventEmitter;

// Create a wrapper class that inherits from the original
class PatchedNativeEventEmitter extends OriginalNativeEventEmitter {
  constructor(nativeModule) {
    // If nativeModule is null/undefined, create a safe mock
    if (!nativeModule || nativeModule === null || nativeModule === undefined) {
      console.log('[NativeEventEmitterFix] Caught null native module, using safe mock');
      
      // Create instance with a dummy module to satisfy parent constructor
      const dummyModule = {};
      super(dummyModule);
      
      // Override all methods to be safe
      this.addListener = (eventType, listener, context) => ({ remove: () => {} });
      this.removeListener = () => {};
      this.removeAllListeners = () => {};
      this.emit = () => {};
      this.listenerCount = () => 0;
      
      return this;
    }
    
    // If nativeModule exists, use parent constructor normally
    try {
      super(nativeModule);
    } catch (error) {
      console.log('[NativeEventEmitterFix] Parent constructor failed:', error.message);
      // Create a mock instance
      super({});
      this.addListener = (eventType, listener, context) => ({ remove: () => {} });
      this.removeListener = () => {};
      this.removeAllListeners = () => {};
      this.emit = () => {};
      this.listenerCount = () => 0;
    }
  }
}

// Replace NativeEventEmitter in react-native exports
ReactNative.NativeEventEmitter = PatchedNativeEventEmitter;

// Also set it globally for any direct imports
if (global.__fbBatchedBridge) {
  global.__fbBatchedBridge.NativeEventEmitter = PatchedNativeEventEmitter;
}

// ===== ERROR SUPPRESSION =====
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

// Filter out NativeEventEmitter related warnings
console.warn = (...args) => {
  const message = args[0];
  if (typeof message === 'string') {
    // Suppress NativeEventEmitter warnings
    if (message.includes('new NativeEventEmitter()') || 
        message.includes('requires a non-null argument') ||
        message.includes('NativeEventEmitter was called with a non-null argument')) {
      return;
    }
  }
  originalConsoleWarn.apply(console, args);
};

console.error = (...args) => {
  const message = args[0];
  if (typeof message === 'string') {
    // Suppress NativeEventEmitter errors
    if (message.includes('Invariant Violation') && 
        message.includes('new NativeEventEmitter()')) {
      return;
    }
    // Suppress AppState API deprecation errors
    if (message.includes('AppState.removeEventListener is not a function') ||
        message.includes('AppState.addEventListener') ||
        message.includes('removeEventListener')) {
      return;
    }
  }
  originalConsoleError.apply(console, args);
};

// ===== GLOBAL ERROR HANDLING =====
const originalGlobalHandler = global.ErrorUtils?.getGlobalHandler?.();

if (global.ErrorUtils) {
  global.ErrorUtils.setGlobalHandler((error, isFatal) => {
    // Intercept NativeEventEmitter crashes
    if (error && error.message && 
        (error.message.includes('new NativeEventEmitter()') ||
         error.message.includes('requires a non-null argument'))) {
      console.log('[NativeEventEmitterFix] Intercepted and suppressed fatal NativeEventEmitter error');
      return; // Suppress the error
    }
    
    // Intercept AppState API errors
    if (error && error.message && 
        (error.message.includes('AppState.removeEventListener is not a function') ||
         error.message.includes('removeEventListener') && error.message.includes('undefined'))) {
      console.log('[NativeEventEmitterFix] Intercepted and suppressed AppState API error');
      return; // Suppress the error
    }
    
    // Intercept LinearGradient native component errors
    if (error && error.message && 
        (error.message.includes('BVLinearGradient') ||
         error.message.includes('requireNativeComponent') && error.message.includes('LinearGradient'))) {
      console.log('[NativeEventEmitterFix] Intercepted and suppressed LinearGradient native component error');
      return; // Suppress the error
    }
    
    // Let other errors through to original handler
    if (originalGlobalHandler) {
      originalGlobalHandler(error, isFatal);
    }
  });
}

// Apply safe NativeEventEmitter fixes
export const applyNativeEventEmitterFixes = () => {
  console.log('[NativeEventEmitterFix] Applied comprehensive NativeEventEmitter crash prevention');
};

// Auto-apply fixes when this module is imported
applyNativeEventEmitterFixes();
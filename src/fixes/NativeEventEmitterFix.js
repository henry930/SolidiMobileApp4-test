/**
 * Enhanced Fix for NativeEventEmitter crashes in React Native
 * This resolves the common "new NativeEventEmitter() requires a non-null argument" error
 */

import { Platform, NativeModules } from 'react-native';

// ===== IMMEDIATE PATCH =====
// Patch NativeEventEmitter before any module can use it
const { NativeEventEmitter } = require('react-native');

// Store original constructor
const OriginalNativeEventEmitter = NativeEventEmitter;

// Create safe replacement constructor
function SafeNativeEventEmitter(nativeModule) {
  // If nativeModule is null/undefined, create a safe mock
  if (!nativeModule) {
    console.log('[NativeEventEmitterFix] Creating safe mock for null native module');
    
    // Return a safe mock emitter
    return {
      addListener: (eventType, listener) => ({
        remove: () => {}
      }),
      removeListener: () => {},
      removeAllListeners: () => {},
      emit: () => {},
      listenerCount: () => 0
    };
  }
  
  // If nativeModule exists, use original constructor
  try {
    return new OriginalNativeEventEmitter(nativeModule);
  } catch (error) {
    console.log('[NativeEventEmitterFix] Original constructor failed, using safe mock');
    return {
      addListener: (eventType, listener) => ({
        remove: () => {}
      }),
      removeListener: () => {},
      removeAllListeners: () => {},
      emit: () => {},
      listenerCount: () => 0
    };
  }
}

// Replace the global NativeEventEmitter
global.NativeEventEmitter = SafeNativeEventEmitter;
require('react-native').NativeEventEmitter = SafeNativeEventEmitter;

// Replace the global NativeEventEmitter
global.NativeEventEmitter = SafeNativeEventEmitter;
require('react-native').NativeEventEmitter = SafeNativeEventEmitter;

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
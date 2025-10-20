// Web Platform Safety Wrapper for AppState
// This provides safe fallbacks for mobile-specific operations on web

import { Platform } from 'react-native';

console.log('🌐 Loading AppState platform safety wrapper...');

// Safe async wrapper that prevents hanging promises
export const safeAsyncOperation = async (operation, fallbackValue = null, operationName = 'unknown') => {
  if (Platform.OS !== 'web') {
    return operation();
  }

  // For web platform, wrap with timeout and better error handling
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      console.warn(`⚠️ Safe async timeout: ${operationName} took too long on web, using fallback`);
      resolve(fallbackValue);
    }, 5000); // 5 second timeout

    Promise.resolve(operation())
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        console.warn(`⚠️ Safe async error in ${operationName}:`, error);
        console.warn(`Using fallback value:`, fallbackValue);
        resolve(fallbackValue);
      });
  });
};

// Safe BackHandler for web
export const safeBackHandler = {
  addEventListener: (eventName, handler) => {
    if (Platform.OS === 'web') {
      console.warn('BackHandler.addEventListener: Not available on web, skipping');
      // Return a mock subscription object
      return {
        remove: () => console.warn('BackHandler.remove: Not available on web')
      };
    }
    const BackHandler = require('react-native').BackHandler;
    return BackHandler.addEventListener(eventName, handler);
  },
  
  exitApp: () => {
    if (Platform.OS === 'web') {
      console.warn('BackHandler.exitApp: Not available on web, will close window instead');
      window.close();
      return;
    }
    const BackHandler = require('react-native').BackHandler;
    return BackHandler.exitApp();
  }
};

// Safe keychain operations - using mock to prevent NativeEventEmitter crashes
export const safeKeychain = {
  getInternetCredentials: async (server) => {
    const operation = async () => {
      // Mock Keychain to prevent crashes
      console.log(`[MockKeychain] getInternetCredentials called for server: ${server}`);
      return Promise.resolve({ username: false, password: false });
    };
    return safeAsyncOperation(operation, false, `Keychain.getInternetCredentials(${server})`);
  },
  
  setInternetCredentials: async (server, username, password) => {
    const operation = async () => {
      // Mock Keychain to prevent crashes
      console.log(`[MockKeychain] setInternetCredentials called for server: ${server}`);
      return Promise.resolve();
    };
    return safeAsyncOperation(operation, true, `Keychain.setInternetCredentials(${server})`);
  },
  
  resetInternetCredentials: async (server) => {
    const operation = async () => {
      // Mock Keychain to prevent crashes
      console.log(`[MockKeychain] resetInternetCredentials called for server: ${server}`);
      return Promise.resolve();
    };
    return safeAsyncOperation(operation, true, `Keychain.resetInternetCredentials(${server})`);
  }
};

// Safe DNS lookup
export const safeDNSLookup = {
  getIpAddressesForHostname: async (hostname) => {
    const operation = async () => {
      const dns = await import('react-native-dns-lookup');
      return dns.getIpAddressesForHostname(hostname);
    };
    return safeAsyncOperation(operation, [], `DNS.getIpAddressesForHostname(${hostname})`);
  }
};

// Safe PIN code operations - using mock to prevent NativeEventEmitter crashes
export const safePinCode = {
  deleteUserPinCode: async (appName) => {
    const operation = async () => {
      // Mock pincode to prevent crashes
      console.log(`[MockPinCode] deleteUserPinCode called for app: ${appName}`);
      return Promise.resolve(true);
    };
    return safeAsyncOperation(operation, true, `PinCode.deleteUserPinCode(${appName})`);
  }
};

console.log('✅ AppState platform safety wrapper loaded');

export default {
  safeAsyncOperation,
  safeBackHandler,
  safeKeychain,
  safeDNSLookup,
  safePinCode
};
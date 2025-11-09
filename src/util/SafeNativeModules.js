/**
 * Targeted fix for NativeEventEmitter issues in React Native
 * Specifically addresses react-native-qrcode-scanner and react-native-permissions
 */

import { Platform } from 'react-native';

// Safe wrapper for QRCodeScanner to prevent NativeEventEmitter issues
export const SafeQRCodeScanner = {
  create: () => {
    try {
      if (Platform.OS === 'web') {
        console.log('[SafeQRCodeScanner] Web platform detected, returning null');
        return null; // Web version handled separately
      }
      
      console.log('[SafeQRCodeScanner] Attempting to load react-native-qrcode-scanner...');
      // Try to import QR scanner safely
      const QRCodeScanner = require('react-native-qrcode-scanner');
      const scanner = QRCodeScanner.default || QRCodeScanner;
      console.log('[SafeQRCodeScanner] Successfully loaded QRCodeScanner:', !!scanner);
      return scanner;
    } catch (error) {
      console.warn('[SafeQRCodeScanner] Failed to load QRCodeScanner:', error.message);
      console.warn('[SafeQRCodeScanner] Error stack:', error.stack);
      return null;
    }
  }
};

// Safe wrapper for Permissions to prevent NativeEventEmitter issues
export const SafePermissions = {
  request: (permission) => {
    try {
      const permissions = require('react-native-permissions');
      return permissions.request(permission);
    } catch (error) {
      console.warn('[SafePermissions] Failed to request permission:', error.message);
      return Promise.resolve('denied');
    }
  },
  
  check: (permission) => {
    try {
      const permissions = require('react-native-permissions');
      return permissions.check(permission);
    } catch (error) {
      console.warn('[SafePermissions] Failed to check permission:', error.message);
      return Promise.resolve('denied');
    }
  },

  PERMISSIONS: (() => {
    try {
      const permissions = require('react-native-permissions');
      return permissions.PERMISSIONS;
    } catch (error) {
      console.warn('[SafePermissions] Failed to load PERMISSIONS:', error.message);
      return {};
    }
  })(),

  RESULTS: (() => {
    try {
      const permissions = require('react-native-permissions');
      return permissions.RESULTS;
    } catch (error) {
      console.warn('[SafePermissions] Failed to load RESULTS:', error.message);
      return {
        DENIED: 'denied',
        GRANTED: 'granted',
        BLOCKED: 'blocked',
        UNAVAILABLE: 'unavailable'
      };
    }
  })()
};

console.log('[SafeNativeModules] Safe wrappers initialized for QRScanner and Permissions');
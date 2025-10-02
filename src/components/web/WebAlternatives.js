// Web alternatives for React Native components that don't work on web
import React from 'react';
import { View, Text, Alert, Platform } from 'react-native';
import { Button } from 'react-native-paper';

// Import web file pickers
import { WebDocumentPicker, WebImagePicker, WebRNFS } from './WebFilePickers';

// Web alternative for QR Scanner
export const QRCodeScanner = ({ onRead, style, ...props }) => {
  if (Platform.OS === 'web') {
    return (
      <View style={[{ 
        padding: 20, 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        minHeight: 200
      }, style]}>
        <Text style={{ fontSize: 16, marginBottom: 16, textAlign: 'center' }}>
          📱 Camera scanning not available on web
        </Text>
        <Text style={{ fontSize: 14, color: '#666', marginBottom: 20, textAlign: 'center' }}>
          Use the mobile app to scan QR codes
        </Text>
        <Button
          mode="outlined"
          onPress={() => {
            onRead?.({ data: 'demo-qr-code-data' });
          }}
          icon="qrcode"
        >
          Simulate QR Scan (Demo)
        </Button>
      </View>
    );
  }
  
  // Return original component for mobile
  const { QRCodeScanner: OriginalQRCodeScanner } = require('react-native-qrcode-scanner');
  return <OriginalQRCodeScanner onRead={onRead} style={style} {...props} />;
};

// Web alternative for Camera
export const RNCamera = ({ style, ...props }) => {
  if (Platform.OS === 'web') {
    return (
      <View style={[{ 
        padding: 20, 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#000',
        minHeight: 300
      }, style]}>
        <Text style={{ color: 'white', fontSize: 16, textAlign: 'center' }}>
          📷 Camera not available on web
        </Text>
        <Text style={{ color: '#ccc', fontSize: 14, marginTop: 8, textAlign: 'center' }}>
          Use the mobile app for camera features
        </Text>
      </View>
    );
  }
  
  // Return original component for mobile  
  // Temporarily commented out VisionCamera for build testing
  // const { RNCamera: OriginalRNCamera } = require('react-native-vision-camera');
  // return <OriginalRNCamera style={style} {...props} />;
  
  // Temporary fallback - return null for mobile when VisionCamera is disabled
  return null;
};

// Web alternative for Apple Pay and native payments
export const PaymentRequest = {
  canMakePayment: () => {
    if (Platform.OS === 'web') {
      return Promise.resolve(false);
    }
    // Temporarily commented out react-native-payments for build testing
    // const { PaymentRequest: OriginalPaymentRequest } = require('react-native-payments');
    // return OriginalPaymentRequest.canMakePayment();
    return Promise.resolve(false);
  },
  
  show: (paymentDetails) => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Web Payment', 
        'Native payments not available on web. Redirecting to web payment gateway...',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => {
            // Here you could redirect to a web payment gateway
            window.open('https://your-payment-gateway.com', '_blank');
          }}
        ]
      );
      return Promise.reject(new Error('Native payments not available on web'));
    }
    
    // Temporarily commented out react-native-payments for build testing
    // const { PaymentRequest: OriginalPaymentRequest } = require('react-native-payments');
    // return new OriginalPaymentRequest(paymentDetails).show();
    return Promise.reject(new Error('Payments temporarily disabled for build testing'));
  }
};

// Web alternative for Keychain
export const Keychain = {
  setInternetCredentials: (server, username, password) => {
    if (Platform.OS === 'web') {
      // Use localStorage as fallback (not secure, but functional for development)
      const credentials = { username, password };
      localStorage.setItem(`keychain_${server}`, JSON.stringify(credentials));
      return Promise.resolve();
    }
    
    // Return original for mobile
    const OriginalKeychain = require('react-native-keychain');
    return OriginalKeychain.setInternetCredentials(server, username, password);
  },
  
  getInternetCredentials: (server) => {
    if (Platform.OS === 'web') {
      const stored = localStorage.getItem(`keychain_${server}`);
      if (stored) {
        return Promise.resolve(JSON.parse(stored));
      }
      return Promise.resolve(false);
    }
    
    // Return original for mobile
    const OriginalKeychain = require('react-native-keychain');
    return OriginalKeychain.getInternetCredentials(server);
  },
  
  resetInternetCredentials: (server) => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(`keychain_${server}`);
      return Promise.resolve();
    }
    
    // Return original for mobile
    const OriginalKeychain = require('react-native-keychain');
    return OriginalKeychain.resetInternetCredentials(server);
  }
};

// Web alternative for File System - use new implementation
export const RNFS = Platform.OS === 'web' ? WebRNFS : require('react-native-fs');

// Web alternative for Document Picker
export const DocumentPicker = Platform.OS === 'web' ? WebDocumentPicker : require('react-native-document-picker');

// Web alternative for Image Picker
export const launchCamera = Platform.OS === 'web' 
  ? WebImagePicker.launchCamera 
  : require('react-native-image-picker').launchCamera;

export const launchImageLibrary = Platform.OS === 'web'
  ? WebImagePicker.launchImageLibrary
  : require('react-native-image-picker').launchImageLibrary;

export default {
  QRCodeScanner,
  RNCamera,
  PaymentRequest,
  Keychain,
  RNFS,
  DocumentPicker,
  launchCamera,
  launchImageLibrary
};
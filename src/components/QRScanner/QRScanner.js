import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Platform,
  Linking,
  Modal,
  Dimensions,
} from 'react-native';
import SecureAppBridge from '../../util/SecureAppBridge';

// Conditional imports based on platform
let Camera, check, request, PERMISSIONS, RESULTS, WebQRScanner;

if (Platform.OS === 'web') {
  WebQRScanner = require('../web/WebQRScanner').default;
  } else {
    // Import Camera directly from react-native-camera
    try {
      const RNCamera = require('react-native-camera');
      Camera = RNCamera.RNCamera;
      console.log('[QRScanner] Camera imported:', !!Camera);
    } catch (error) {
      console.error('[QRScanner] Failed to import Camera:', error);
    }
    
    // Import permissions
    const { SafePermissions } = require('../../util/SafeNativeModules');
    check = SafePermissions.check;
    request = SafePermissions.request;
    PERMISSIONS = SafePermissions.PERMISSIONS;
    RESULTS = SafePermissions.RESULTS;
  }const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const QRScanner = ({ visible, onScanSuccess, onClose, title = 'Scan QR Code' }) => {
  console.log('[QR-SCAN] 🎬 QRScanner component props:', {
    visible,
    onScanSuccess: typeof onScanSuccess,
    onClose: typeof onClose,
    title
  });

  // Use web version on web platform
  if (Platform.OS === 'web' && WebQRScanner) {
    return (
      <WebQRScanner 
        visible={visible}
        onScanSuccess={onScanSuccess}
        onClose={onClose}
        title={title}
      />
    );
  }

  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);

  useEffect(() => {
    if (visible) {
      // Notify SecureApp that camera/modal is opening
      SecureAppBridge.setCameraActive(true);
      checkCameraPermission();
      // Reset scanning states when opening
      setIsScanning(false);
      setScanSuccess(false);
    } else {
      // Notify SecureApp that camera/modal is closing
      SecureAppBridge.setCameraActive(false);
    }
    
    // Cleanup on unmount
    return () => {
      if (visible) {
        SecureAppBridge.setCameraActive(false);
      }
    };
  }, [visible]);

  const checkCameraPermission = async () => {
    console.log('🎥 QRScanner: Checking camera permission...');
    console.log('🎥 Platform:', Platform.OS);
    
    setIsLoading(true);
    
    try {
      const permission = Platform.OS === 'ios' 
        ? PERMISSIONS.IOS.CAMERA 
        : PERMISSIONS.ANDROID.CAMERA;

      // First check if permission is already granted
      console.log('🎥 Checking current permission status:', permission);
      let result = await check(permission);
      console.log('🎥 Current permission status:', result);
      
      // If not granted, request permission
      if (result !== RESULTS.GRANTED && result !== 'granted') {
        console.log('🎥 Permission not granted, requesting...');
        result = await request(permission);
        console.log('🎥 Permission request result:', result);
      } else {
        console.log('✅ Permission already granted, skipping request');
      }
      
      if (result === RESULTS.GRANTED || result === 'granted') {
        console.log('✅ Camera permission GRANTED');
        setHasPermission(true);
        setIsLoading(false);
      } else if (result === RESULTS.DENIED || result === RESULTS.BLOCKED || result === 'blocked') {
        console.log('❌ Camera permission DENIED or BLOCKED');
        setHasPermission(false);
        setIsLoading(false);
        showPermissionAlert();
      } else if (result === RESULTS.UNAVAILABLE) {
        console.log('⚠️ Camera UNAVAILABLE');
        setHasPermission(false);
        setIsLoading(false);
        Alert.alert(
          'Camera Not Available',
          'Camera is not available on this device.',
          [{ text: 'OK', onPress: onClose }]
        );
      } else if (result === RESULTS.LIMITED || result === 'limited') {
        // iOS 14+ limited permission - treat as granted
        console.log('⚠️ Camera permission LIMITED, treating as granted');
        setHasPermission(true);
        setIsLoading(false);
      } else {
        console.log('⚠️ Unknown permission result:', result);
        setHasPermission(false);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('❌ Permission check error:', error);
      setHasPermission(false);
      setIsLoading(false);
      showPermissionAlert();
    }
  };

  const showPermissionAlert = () => {
    Alert.alert(
      'Camera Permission Required',
      'Please allow camera access in your device settings to scan QR codes.',
      [
        { text: 'Cancel', onPress: onClose, style: 'cancel' },
        { text: 'Open Settings', onPress: openSettings },
      ]
    );
  };

  const openSettings = () => {
    Linking.openSettings();
    onClose();
  };

  const handleBarCodeRead = (scanResult) => {
    // Prevent multiple scans
    if (isScanning || scanSuccess) {
      console.log('[QR-SCAN] ⏭️ Skipping duplicate scan');
      return;
    }
    
    console.log('[QR-SCAN] 📸 Barcode detected');
    
    // Handle both event structures
    const data = scanResult?.data || scanResult?.barcodes?.[0]?.data;
    
    if (data) {
      console.log('[QR-SCAN] ✅ Data extracted:', data);
      console.log('[QR-SCAN] 🎬 Setting success state');
      
      setIsScanning(true);
      setScanSuccess(true);
      
      console.log('[QR-SCAN] ⏰ Starting 800ms timer...');
      
      // Show success feedback briefly, then call parent callback
      setTimeout(() => {
        console.log('[QR-SCAN] ⏰ Timer done! Calling parent callback');
        console.log('[QR-SCAN] � onScanSuccess type:', typeof onScanSuccess);
        
        if (typeof onScanSuccess === 'function') {
          onScanSuccess(data);
          console.log('[QR-SCAN] ✅ Parent callback completed');
        } else {
          console.error('[QR-SCAN] ❌ onScanSuccess is not a function!');
        }
      }, 800);
    } else {
      console.log('[QR-SCAN] ⚠️ No data in scan result');
    }
  };

  const renderPermissionDenied = () => (
    <View style={styles.permissionContainer}>
      <Text style={styles.permissionTitle}>Camera Permission Required</Text>
      <Text style={styles.permissionText}>
        To scan QR codes, please allow camera access in your device settings.
      </Text>
      <TouchableOpacity style={styles.settingsButton} onPress={openSettings}>
        <Text style={styles.settingsButtonText}>Open Settings</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <Text style={styles.loadingText}>Checking camera permissions...</Text>
    </View>
  );

  const renderScanner = () => {
    console.log('🎥 Rendering scanner component...');
    console.log('🎥 Camera available:', !!Camera);
    
    if (!Camera) {
      console.error('❌ Camera is null!');
      return (
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionTitle}>Camera Not Available</Text>
          <Text style={styles.permissionText}>
            The camera component failed to load. Please restart the app.
          </Text>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return (
      <View style={styles.scannerContainer}>
        <View style={styles.headerContainer}>
          <Text style={styles.titleText}>{title}</Text>
          <Text style={styles.instructionText}>
            Position the QR code within the frame to scan
          </Text>
        </View>
        
        <Camera
          style={styles.camera}
          type={Camera.Constants?.Type?.back || 'back'}
          flashMode={Camera.Constants?.FlashMode?.off || 'off'}
          onBarCodeRead={handleBarCodeRead}
          barCodeTypes={[
            Camera.Constants?.BarCodeType?.qr,
            Camera.Constants?.BarCodeType?.code128,
            Camera.Constants?.BarCodeType?.code39,
            Camera.Constants?.BarCodeType?.ean13,
          ].filter(Boolean)}
          captureAudio={false}
          onCameraReady={() => console.log('📷 Camera ready! Starting barcode detection...')}
          onMountError={(error) => {
            console.error('Camera mount error:', error);
            Alert.alert('Camera Error', 'Failed to start camera. Please restart the app.');
          }}
          androidCameraPermissionOptions={{
            title: 'Camera Permission',
            message: 'We need your permission to use the camera to scan QR codes',
            buttonPositive: 'OK',
            buttonNegative: 'Cancel',
          }}
        >
          <View style={styles.cameraOverlay}>
            <View style={[
              styles.scanFrame,
              scanSuccess && styles.scanFrameSuccess
            ]} />
            {scanSuccess ? (
              <View style={styles.successContainer}>
                <Text style={styles.successIcon}>✓</Text>
                <Text style={styles.scanHintSuccess}>QR Code Scanned!</Text>
              </View>
            ) : (
              <Text style={styles.scanHint}>
                {isScanning ? 'Processing...' : 'Point camera at QR code'}
              </Text>
            )}
          </View>
        </Camera>
        
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (!visible) return null;

  console.log('🎥 QRScanner render - isLoading:', isLoading, 'hasPermission:', hasPermission, 'Camera:', !!Camera);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {isLoading ? renderLoading() : hasPermission ? renderScanner() : renderPermissionDenied()}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  qrContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  headerContainer: {
    padding: 20,
    paddingTop: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
  },
  titleText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 16,
    color: '#cccccc',
    textAlign: 'center',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: '#00FF00',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  scanFrameSuccess: {
    borderColor: '#00FF00',
    backgroundColor: 'rgba(0, 255, 0, 0.15)',
    borderWidth: 4,
  },
  successContainer: {
    marginTop: 20,
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 48,
    color: '#00FF00',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  scanHint: {
    marginTop: 20,
    fontSize: 16,
    color: '#ffffff',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  scanHintSuccess: {
    fontSize: 18,
    color: '#00FF00',
    fontWeight: 'bold',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  marker: {
    borderColor: '#00FF00',
    borderWidth: 3,
    borderRadius: 12,
  },
  topView: {
    flex: 0,
    backgroundColor: 'transparent',
  },
  bottomView: {
    flex: 0,
    backgroundColor: 'transparent',
  },
  closeButton: {
    backgroundColor: '#007AFF',
    marginHorizontal: 40,
    marginVertical: 30,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#ffffff',
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 20,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  settingsButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  settingsButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#666666',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
  },
});

export default QRScanner;
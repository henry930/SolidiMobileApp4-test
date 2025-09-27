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
import QRCodeScanner from 'react-native-qrcode-scanner';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const QRScanner = ({ visible, onScanSuccess, onClose, title = 'Scan QR Code' }) => {
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      checkCameraPermission();
    }
  }, [visible]);

  const checkCameraPermission = async () => {
    setIsLoading(true);
    try {
      const permission = Platform.OS === 'ios' 
        ? PERMISSIONS.IOS.CAMERA 
        : PERMISSIONS.ANDROID.CAMERA;

      const result = await request(permission);
      
      switch (result) {
        case RESULTS.GRANTED:
          setHasPermission(true);
          break;
        case RESULTS.DENIED:
        case RESULTS.BLOCKED:
          setHasPermission(false);
          showPermissionAlert();
          break;
        case RESULTS.UNAVAILABLE:
          setHasPermission(false);
          Alert.alert(
            'Camera Not Available',
            'Camera is not available on this device.',
            [{ text: 'OK', onPress: onClose }]
          );
          break;
        default:
          setHasPermission(false);
          break;
      }
    } catch (error) {
      console.error('Permission check error:', error);
      setHasPermission(false);
      showPermissionAlert();
    }
    setIsLoading(false);
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

  const handleBarCodeRead = (e) => {
    if (e.data) {
      onScanSuccess(e.data);
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

  const renderScanner = () => (
    <View style={styles.scannerContainer}>
      <View style={styles.headerContainer}>
        <Text style={styles.titleText}>{title}</Text>
        <Text style={styles.instructionText}>
          Position the QR code within the frame to scan
        </Text>
      </View>
      
      <QRCodeScanner
        onRead={handleBarCodeRead}
        showMarker={true}
        markerStyle={styles.marker}
        cameraStyle={styles.camera}
        topViewStyle={styles.topView}
        bottomViewStyle={styles.bottomView}
        checkAndroid6Permissions={false}
        reactivate={true}
        reactivateTimeout={3000}
      />
      
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Text style={styles.closeButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );

  if (!visible) return null;

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
  headerContainer: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#000000',
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
    height: screenHeight * 0.6,
    width: screenWidth,
  },
  marker: {
    borderColor: '#ffffff',
    borderWidth: 2,
    borderRadius: 8,
  },
  topView: {
    backgroundColor: 'transparent',
  },
  bottomView: {
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
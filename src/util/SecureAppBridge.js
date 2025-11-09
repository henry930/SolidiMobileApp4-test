/**
 * SecureAppBridge - Bridge to communicate with SecureApp component
 * 
 * This bridge allows components (like QRScanner, Camera modals) to notify
 * SecureApp when they are active, preventing unwanted authentication triggers
 * from AppState changes caused by full-screen modals.
 */

class SecureAppBridge {
  constructor() {
    this.secureAppInstance = null;
    this.cameraActiveCount = 0; // Track nested camera/modal opens
  }

  // Register the SecureApp instance
  registerSecureApp(instance) {
    console.log('🌉 [SecureAppBridge] Registering SecureApp instance');
    this.secureAppInstance = instance;
  }

  // Unregister the SecureApp instance
  unregisterSecureApp() {
    console.log('🌉 [SecureAppBridge] Unregistering SecureApp instance');
    this.secureAppInstance = null;
    this.cameraActiveCount = 0;
  }

  // Notify that camera/modal is opening
  setCameraActive(isActive) {
    if (isActive) {
      this.cameraActiveCount++;
      console.log('📸 [SecureAppBridge] Camera opened (count:', this.cameraActiveCount, ')');
    } else {
      this.cameraActiveCount = Math.max(0, this.cameraActiveCount - 1);
      console.log('📸 [SecureAppBridge] Camera closed (count:', this.cameraActiveCount, ')');
    }

    const shouldBeActive = this.cameraActiveCount > 0;

    if (this.secureAppInstance && typeof this.secureAppInstance.setCameraActive === 'function') {
      this.secureAppInstance.setCameraActive(shouldBeActive);
    } else {
      console.warn('⚠️ [SecureAppBridge] SecureApp instance not available');
    }
  }

  // Check if camera is active
  isCameraActive() {
    return this.cameraActiveCount > 0;
  }
}

// Export a singleton instance
export default new SecureAppBridge();

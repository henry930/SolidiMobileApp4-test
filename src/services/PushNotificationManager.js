import messaging from '@react-native-firebase/messaging';
import { Platform, PermissionsAndroid, Alert, DeviceEventEmitter } from 'react-native';

class PushNotificationManager {
    constructor() {
        this.token = null;
    }

    /**
     * Request permission for push notifications
     * @returns {Promise<boolean>} true if permission granted
     */
    async requestPermission() {
        try {
            if (Platform.OS === 'android') {
                // Android 13+ requires explicit permission
                if (Platform.Version >= 33) {
                    const granted = await PermissionsAndroid.request(
                        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
                    );
                    return granted === PermissionsAndroid.RESULTS.GRANTED;
                }
                // Android 12 and below - permission granted by default
                return true;
            }

            // iOS permission request
            const authStatus = await messaging().requestPermission();
            const enabled =
                authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                authStatus === messaging.AuthorizationStatus.PROVISIONAL;

            if (enabled) {
                console.log('Push notification authorization status:', authStatus);
            }

            return enabled;
        } catch (error) {
            console.error('Error requesting push notification permission:', error);
            return false;
        }
    }

    /**
     * Get FCM device token
     * @returns {Promise<string|null>} FCM token or null
     */
    async getToken() {
        try {
            const token = await messaging().getToken();
            console.log('FCM Token:', token);
            this.token = token;
            return token;
        } catch (error) {
            console.error('Error getting FCM token:', error);
            return null;
        }
    }

    /**
     * Register device for push notifications
     * @param {string} userId - User ID to associate with token
     * @returns {Promise<string|null>} FCM token or null
     */
    async registerDevice(userId) {
        try {
            // Request permission first
            const hasPermission = await this.requestPermission();
            if (!hasPermission) {
                console.log('Push notification permission denied');
                return null;
            }

            // Get FCM token
            const token = await this.getToken();
            if (token) {
                // Send token to backend
                await this.sendTokenToBackend(userId, token);
                console.log('Device registered for push notifications');
            }

            return token;
        } catch (error) {
            console.error('Error registering device:', error);
            return null;
        }
    }

    /**
     * Send FCM token to backend server
     * @param {string} userId - User ID
     * @param {string} token - FCM token
     */
    async sendTokenToBackend(userId, token) {
        try {
            // AWS SNS API endpoint (same as iOS)
            const API_BASE_URL = 'https://e80gxrvbm8.execute-api.us-east-1.amazonaws.com/dev';

            const deviceInfo = {
                token: token,  // Backend expects 'token' not 'deviceToken'
                userId: userId,
                deviceId: await import('react-native-device-info').then(m => m.default.getUniqueId()),
                platform: Platform.OS,
            };

            console.log('📤 Registering Android device with backend:', deviceInfo);

            const response = await fetch(`${API_BASE_URL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(deviceInfo),
            });

            if (!response.ok) {
                throw new Error(`Failed to register token: ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ Android device registered successfully:', data);
        } catch (error) {
            console.error('❌ Error sending Android token to backend:', error);
            // Don't throw - allow app to continue even if backend registration fails
        }
    }

    /**
     * Setup notification event listeners
     */
    setupNotificationListeners() {
        // Handle foreground notifications
        messaging().onMessage(async remoteMessage => {
            console.log('Foreground notification received:', remoteMessage);

            // Show custom banner for foreground notifications
            if (remoteMessage.notification) {
                DeviceEventEmitter.emit('SHOW_NOTIFICATION_BANNER', {
                    title: remoteMessage.notification.title || 'Notification',
                    body: remoteMessage.notification.body || '',
                    onPress: () => {
                        console.log('Notification banner pressed');
                        // Navigate or handle press
                    }
                });
            }
        });

        // Handle background/quit state notifications
        messaging().setBackgroundMessageHandler(async remoteMessage => {
            console.log('Background notification received:', remoteMessage);
            // Process notification in background
        });

        // Handle notification that opened the app
        messaging().onNotificationOpenedApp(remoteMessage => {
            console.log('Notification opened app from background:', remoteMessage);
            // Navigate to specific screen based on notification data
            this.handleNotificationNavigation(remoteMessage);
        });

        // Check if app was opened from a notification (quit state)
        messaging()
            .getInitialNotification()
            .then(remoteMessage => {
                if (remoteMessage) {
                    console.log('App opened from quit state by notification:', remoteMessage);
                    this.handleNotificationNavigation(remoteMessage);
                }
            });

        // Handle token refresh
        messaging().onTokenRefresh(token => {
            console.log('FCM token refreshed:', token);
            this.token = token;
            // TODO: Send new token to backend
        });
    }

    /**
     * Handle navigation when notification is tapped
     * @param {object} remoteMessage - Notification message
     */
    handleNotificationNavigation(remoteMessage) {
        // TODO: Implement navigation logic based on notification data
        console.log('Handle notification navigation:', remoteMessage.data);
    }

    /**
     * Unregister device from push notifications
     */
    async unregisterDevice() {
        try {
            await messaging().deleteToken();
            this.token = null;
            console.log('Device unregistered from push notifications');
        } catch (error) {
            console.error('Error unregistering device:', error);
        }
    }

    /**
     * Check if push notifications are enabled
     * @returns {Promise<boolean>}
     */
    async isEnabled() {
        try {
            const authStatus = await messaging().hasPermission();
            return authStatus === messaging.AuthorizationStatus.AUTHORIZED;
        } catch (error) {
            console.error('Error checking notification status:', error);
            return false;
        }
    }
}

export default new PushNotificationManager();

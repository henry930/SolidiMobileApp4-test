// Native iOS Push Notification Service (AWS SNS Only - No Firebase)
import { Platform, Alert } from 'react-native';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import DeviceInfo from 'react-native-device-info';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationStorageService from '../storage/NotificationStorageService';

// TODO: Replace with your actual API Gateway endpoint after deployment
const API_BASE_URL = process.env.PUSH_NOTIFICATION_API_URL || 'https://your-api-gateway-url';

const STORAGE_KEY = '@push_notification_registered';

class PushNotificationService {
    constructor() {
        this.deviceToken = null;
        this.userId = null;
    }

    /**
     * Initialize push notifications
     * @param {string} userId - User identifier
     */
    async initialize(userId) {
        if (!userId) {
            console.warn('PushNotificationService: No userId provided');
            return false;
        }

        this.userId = userId;

        if (Platform.OS === 'ios') {
            return await this.initializeIOS();
        } else if (Platform.OS === 'android') {
            console.warn('Android push notifications not implemented yet');
            return false;
        }

        return false;
    }

    /**
     * Initialize iOS push notifications
     */
    async initializeIOS() {
        try {
            // Request permissions
            const permissions = await PushNotificationIOS.requestPermissions({
                alert: true,
                badge: true,
                sound: true,
            });

            console.log('📱 Push notification permissions:', permissions);

            if (!permissions.alert) {
                console.warn('Push notification permissions denied');
                return false;
            }

            // Set up notification handlers
            this.setupIOSHandlers();

            // Register for remote notifications
            PushNotificationIOS.addEventListener('register', this.onRegistered.bind(this));
            PushNotificationIOS.addEventListener('registrationError', this.onRegistrationError.bind(this));
            PushNotificationIOS.addEventListener('notification', this.onNotificationReceived.bind(this));
            PushNotificationIOS.addEventListener('localNotification', this.onLocalNotification.bind(this));

            console.log('✅ iOS push notifications initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize iOS push notifications:', error);
            return false;
        }
    }

    /**
     * Set up iOS notification handlers
     */
    setupIOSHandlers() {
        // Handle notification when app is in foreground
        PushNotificationIOS.addEventListener('notification', async (notification) => {
            console.log('📬 Notification received (foreground):', notification);

            // Save to storage
            await this.saveNotification(notification);

            // Update badge
            const unreadCount = await NotificationStorageService.getUnreadCount();
            PushNotificationIOS.setApplicationIconBadgeNumber(unreadCount);

            // Show alert
            const data = notification.getData();
            Alert.alert(
                data.title || 'Notification',
                data.body || data.message || '',
                [{ text: 'OK' }]
            );

            notification.finish(PushNotificationIOS.FetchResult.NoData);
        });
    }

    /**
     * Handle device token registration
     */
    async onRegistered(deviceToken) {
        console.log('📱 Device token received:', deviceToken);
        this.deviceToken = deviceToken;

        // Register with backend
        await this.registerDevice(deviceToken);
    }

    /**
     * Handle registration error
     */
    onRegistrationError(error) {
        console.error('❌ Push notification registration error:', error);
    }

    /**
     * Handle notification received
     */
    async onNotificationReceived(notification) {
        console.log('📬 Notification received:', notification);

        // Save to storage
        await this.saveNotification(notification);

        // Update badge
        const unreadCount = await NotificationStorageService.getUnreadCount();
        PushNotificationIOS.setApplicationIconBadgeNumber(unreadCount);

        // Finish handling
        notification.finish(PushNotificationIOS.FetchResult.NoData);
    }

    /**
     * Handle local notification
     */
    async onLocalNotification(notification) {
        console.log('📬 Local notification received:', notification);
        await this.saveNotification(notification);
    }

    /**
     * Save notification to storage
     */
    async saveNotification(notification) {
        try {
            const data = notification.getData ? notification.getData() : notification;

            await NotificationStorageService.saveNotification({
                title: data.title || data.aps?.alert?.title || 'Notification',
                body: data.body || data.message || data.aps?.alert?.body || '',
                data: data,
                timestamp: Date.now(),
            });

            console.log('💾 Notification saved to storage');
        } catch (error) {
            console.error('Failed to save notification:', error);
        }
    }

    /**
     * Register device with backend
     */
    async registerDevice(deviceToken) {
        try {
            const deviceInfo = {
                deviceToken,
                userId: this.userId,
                platform: Platform.OS,
                deviceId: await DeviceInfo.getUniqueId(),
                deviceName: await DeviceInfo.getDeviceName(),
                systemVersion: DeviceInfo.getSystemVersion(),
                appVersion: DeviceInfo.getVersion(),
                buildNumber: DeviceInfo.getBuildNumber(),
            };

            console.log('📤 Registering device with backend:', deviceInfo);

            const response = await fetch(`${API_BASE_URL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(deviceInfo),
            });

            if (!response.ok) {
                throw new Error(`Registration failed: ${response.status}`);
            }

            const result = await response.json();
            console.log('✅ Device registered successfully:', result);

            // Mark as registered
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
                deviceToken,
                userId: this.userId,
                registeredAt: Date.now(),
            }));

            return true;
        } catch (error) {
            console.error('❌ Failed to register device:', error);
            return false;
        }
    }

    /**
     * Check if device is already registered
     */
    async isRegistered() {
        try {
            const data = await AsyncStorage.getItem(STORAGE_KEY);
            if (!data) return false;

            const { userId, deviceToken } = JSON.parse(data);
            return userId === this.userId && !!deviceToken;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get current device token
     */
    getDeviceToken() {
        return this.deviceToken;
    }

    /**
     * Update badge count
     */
    async updateBadgeCount() {
        if (Platform.OS === 'ios') {
            const unreadCount = await NotificationStorageService.getUnreadCount();
            PushNotificationIOS.setApplicationIconBadgeNumber(unreadCount);
        }
    }

    /**
     * Clear badge count
     */
    clearBadge() {
        if (Platform.OS === 'ios') {
            PushNotificationIOS.setApplicationIconBadgeNumber(0);
        }
    }

    /**
     * Clean up
     */
    cleanup() {
        if (Platform.OS === 'ios') {
            PushNotificationIOS.removeEventListener('register');
            PushNotificationIOS.removeEventListener('registrationError');
            PushNotificationIOS.removeEventListener('notification');
            PushNotificationIOS.removeEventListener('localNotification');
        }
    }
}

export default new PushNotificationService();

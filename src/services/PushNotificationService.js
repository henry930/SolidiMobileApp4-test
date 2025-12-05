// Native iOS Push Notification Service (AWS SNS Only - No Firebase)
import { Platform, Alert, PermissionsAndroid, DeviceEventEmitter } from 'react-native';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import DeviceInfo from 'react-native-device-info';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationStorageService from '../storage/NotificationStorageService';

// TODO: Replace with your actual API Gateway endpoint after deployment
const API_BASE_URL = 'https://u4o3rayvl6.execute-api.us-east-1.amazonaws.com/dev';

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
            return await this.initializeAndroid();
        }

        return false;
    }

    /**
     * Phase 1: Initialize device and request permissions (on app install)
     * Registers device with a temporary ID before user logs in
     */
    async initializeDevice() {
        console.log('📱 [PushNotification] Phase 1: Initializing device...');

        if (Platform.OS === 'ios') {
            try {
                // Set up event listeners FIRST
                this.setupIOSHandlers();
                console.log('✅ Event listeners set up');

                // Check current permission status
                const checkPermissions = await PushNotificationIOS.checkPermissions();
                console.log('📱 Current permissions:', checkPermissions);

                // Request permissions (will show dialog if not already granted)
                const permissions = await PushNotificationIOS.requestPermissions({
                    alert: true,
                    badge: true,
                    sound: true,
                });

                console.log('✅ [iOS] Permissions granted:', permissions);

                // The 'register' event should fire automatically after requestPermissions
                // But if permissions were already granted, we might need to wait
                console.log('⏳ Waiting for device token from iOS...');

                // Device token will be received via 'register' event
                // and stored locally until user logs in
                return true;
            } catch (error) {
                console.error('❌ Failed to initialize device:', error);
                return false;
            }
        } else if (Platform.OS === 'android') {
            return await this.initializeAndroid();
        }

        return false;
    }

    /**
     * Phase 2: Map device token to user ID (on first login)
     * Updates the backend with the actual user ID
     */
    async updateUserMapping(userId) {
        console.log('📱 [PushNotification] Phase 2: Mapping device to user:', userId);

        this.userId = userId;

        // Wait up to 5 seconds for device token if not available yet
        let attempts = 0;
        while (!this.deviceToken && attempts < 10) {
            console.log(`⏳ Waiting for device token... (attempt ${attempts + 1}/10)`);
            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
        }

        if (!this.deviceToken) {
            console.warn('⚠️ Device token not available after 5 seconds');
            console.warn('⚠️ Will register when token arrives');
            // DEBUG: Show timeout alert
            // Alert.alert('Token Timeout', 'Device token not available after 5s wait');
            return false;
        }

        console.log('✅ Device token available, checking if already registered...');

        // Check if already registered with same token and user
        const existingData = await AsyncStorage.getItem(STORAGE_KEY);
        console.log('📱 [CHECK] Existing data from AsyncStorage:', existingData);

        if (existingData) {
            const parsed = JSON.parse(existingData);
            const { deviceToken: savedToken, userId: savedUserId } = parsed;
            console.log('📱 [CHECK] Parsed data:', parsed);
            console.log('📱 [CHECK] Saved token:', savedToken);
            console.log('📱 [CHECK] Current token:', this.deviceToken);
            console.log('📱 [CHECK] Saved userId:', savedUserId);
            console.log('📱 [CHECK] Current userId:', userId);
            console.log('📱 [CHECK] Tokens match:', savedToken === this.deviceToken);
            console.log('📱 [CHECK] UserIds match:', savedUserId === userId);

            if (savedToken === this.deviceToken && savedUserId === userId) {
                console.log('✅ Device already registered with same token and user, skipping registration');
                // DEBUG: Show skipped alert
                // Alert.alert('Registration Skipped', 'Device already registered with same token/user');
                return true;
            }
        }

        console.log('📤 Device not registered or token/user changed, registering now...');

        // Register/update device with actual user ID
        return await this.registerDevice(this.deviceToken);
    }

    /**
     * Initialize iOS push notifications
     */
    async initializeIOS() {
        try {
            console.log('🚀 [iOS] Starting push notification initialization...');

            // Request permissions
            console.log('📱 [iOS] Requesting push notification permissions...');
            const permissions = await PushNotificationIOS.requestPermissions({
                alert: true,
                badge: true,
                sound: true,
            });

            console.log('📱 [iOS] Push notification permissions result:', JSON.stringify(permissions));

            if (!permissions.alert && !permissions.authorizationStatus) {
                console.warn('⚠️ [iOS] Push notification permissions denied');
                return false;
            }

            console.log('✅ [iOS] Push notification permissions granted');

            // Set up notification handlers
            console.log('🔧 [iOS] Setting up notification handlers...');
            this.setupIOSHandlers();

            // Register for remote notifications
            console.log('📝 [iOS] Registering event listeners...');
            PushNotificationIOS.addEventListener('register', this.onRegistered.bind(this));
            PushNotificationIOS.addEventListener('registrationError', this.onRegistrationError.bind(this));
            PushNotificationIOS.addEventListener('notification', this.onNotificationReceived.bind(this));
            PushNotificationIOS.addEventListener('localNotification', this.onLocalNotification.bind(this));

            console.log('✅ [iOS] iOS push notifications initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ [iOS] Failed to initialize iOS push notifications:', error);
            console.error('❌ [iOS] Error details:', error.message, error.stack);
            return false;
        }
    }

    /**
     * Initialize Android push notifications (AWS SNS - Native)
     */
    async initializeAndroid() {
        try {
            // Request notification permission for Android 13+ (API 33+)
            if (Platform.Version >= 33) {
                console.log('📱 Requesting Android POST_NOTIFICATIONS permission (API 33+)...');
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
                    {
                        title: 'Notification Permission',
                        message: 'Solidi needs permission to send you important notifications about your transactions and account.',
                        buttonPositive: 'Allow',
                        buttonNegative: 'Deny',
                    }
                );

                if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                    console.warn('❌ Push notification permission denied');
                    Alert.alert(
                        'Notifications Disabled',
                        'You won\'t receive important updates about your transactions. You can enable notifications in Settings.',
                        [{ text: 'OK' }]
                    );
                    return false;
                }

                console.log('✅ Push notification permission granted');
            } else {
                console.log('📱 Android API < 33, notification permission granted by default');
            }

            // Get FCM token
            const messaging = require('@react-native-firebase/messaging').default;

            // Firebase auto-initializes from google-services.json on Android
            // No need to call initializeApp() explicitly

            // Check if device is registered
            if (!messaging().isDeviceRegisteredForRemoteMessages) {
                await messaging().registerDeviceForRemoteMessages();
            }

            const token = await messaging().getToken();
            console.log('📱 FCM Token:', token);

            // Show token for debugging
            // Alert.alert('FCM Token', `Token: ${token.substring(0, 10)}...`);

            this.onRegistered(token);

            // Set up message handlers
            messaging().onMessage(async remoteMessage => {
                console.log('📬 FCM Message received (Foreground):', remoteMessage);
                DeviceEventEmitter.emit('SHOW_NOTIFICATION_BANNER', {
                    title: remoteMessage.notification?.title || 'Notification',
                    body: remoteMessage.notification?.body || '',
                    onPress: () => {
                        console.log('Notification banner pressed');
                    }
                });
                await this.saveNotification(remoteMessage);
            });

            messaging().setBackgroundMessageHandler(async remoteMessage => {
                console.log('📬 FCM Message received (Background):', remoteMessage);
                await this.saveNotification(remoteMessage);
            });

            // Handle token refresh
            messaging().onTokenRefresh(token => {
                console.log('🔄 FCM Token refreshed:', token);
                this.onRegistered(token);
            });

            console.log('✅ Android push notifications initialized');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Android push notifications:', error);
            console.error('Error details:', error.message, error.stack);
            return false;
        }
    }

    /**
     * Set up iOS notification handlers
     */
    setupIOSHandlers() {
        console.log('📱 Setting up iOS notification handlers...');

        // Handle device token registration
        PushNotificationIOS.addEventListener('register', (deviceToken) => {
            console.log('📱 [iOS Event] Register event fired');
            // DEBUG: Show token alert
            // Alert.alert('Token Received', `Token: ${deviceToken.substring(0, 10)}...`);
            this.onRegistered(deviceToken);
        });

        // Handle registration errors
        PushNotificationIOS.addEventListener('registrationError', (error) => {
            console.log('❌ [iOS Event] Registration error event fired');
            // Alert.alert('Registration Error', error.message);
            this.onRegistrationError(error);
        });

        // Handle notification when app is in foreground OR background
        PushNotificationIOS.addEventListener('notification', async (notification) => {
            console.log('📬📬📬 NOTIFICATION EVENT FIRED 📬📬📬');
            console.log('📬 Notification object:', notification);

            const data = notification.getData();
            console.log('📬 Notification getData():', JSON.stringify(data, null, 2));

            // Save to storage
            console.log('📬 About to call saveNotification...');
            await this.saveNotification(notification);
            console.log('📬 saveNotification completed');

            // Update badge
            const unreadCount = await NotificationStorageService.getUnreadCount();
            console.log('📬 Unread count:', unreadCount);
            PushNotificationIOS.setApplicationIconBadgeNumber(unreadCount);

            notification.finish(PushNotificationIOS.FetchResult.NoData);
        });

        // Handle local notifications
        PushNotificationIOS.addEventListener('localNotification', async (notification) => {
            console.log('📬 Local notification received:', notification);
            await this.saveNotification(notification);
        });

        console.log('✅ iOS push notification handlers set up');
    }

    /**
     * Handle device token registration
     */
    async onRegistered(deviceToken) {
        console.log('📱 Device token received:', deviceToken);
        this.deviceToken = deviceToken;

        // If we already have a userId (user logged in before token arrived), check if need to register
        if (this.userId) {
            console.log('📱 User ID already set, checking if need to register...');

            // Check if already registered with same token and user
            const existingData = await AsyncStorage.getItem(STORAGE_KEY);
            if (existingData) {
                const { deviceToken: savedToken, userId: savedUserId } = JSON.parse(existingData);
                if (savedToken === deviceToken && savedUserId === this.userId) {
                    console.log('✅ Device already registered, skipping duplicate registration');
                    return;
                }
            }

            console.log('📤 Registering device with user ID...');
            await this.registerDevice(deviceToken);
        } else {
            console.log('📱 No user ID yet, device token stored for later registration');
        }
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
            console.log('💾 [SAVE] Starting to save notification...');
            const data = notification.getData ? notification.getData() : notification;
            console.log('💾 [SAVE] Extracted data:', JSON.stringify(data, null, 2));

            // APNS payload structure: data._data.aps.alert.title and data._data.aps.alert.body
            // OR data.aps.alert.title and data.aps.alert.body
            const apsAlert = data._data?.aps?.alert || data.aps?.alert;

            // FCM payload structure: notification.notification.title and notification.notification.body
            const fcmNotification = notification.notification;

            const notificationToSave = {
                title: fcmNotification?.title || apsAlert?.title || data.title || data._data?.title || 'Notification',
                body: fcmNotification?.body || apsAlert?.body || data.body || data.message || data._data?.body || '',
                data: data,
                timestamp: Date.now(),
            };

            console.log('💾 [SAVE] Notification to save:', JSON.stringify(notificationToSave, null, 2));

            await NotificationStorageService.saveNotification(notificationToSave);

            console.log('✅ [SAVE] Notification saved to storage successfully');
        } catch (error) {
            console.error('❌ [SAVE] Failed to save notification:', error);
            console.error('❌ [SAVE] Error stack:', error.stack);
        }
    }

    /**
     * Register device with backend
     */
    async registerDevice(deviceToken) {
        try {
            const deviceInfo = {
                token: deviceToken,  // Backend expects 'token' not 'deviceToken'
                userId: this.userId,
                deviceId: await DeviceInfo.getUniqueId(),
                platform: Platform.OS,
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

            // DEBUG: Show success alert
            // Alert.alert(
            //     'Registration Success',
            //     `Device registered!\nToken: ${deviceToken.substring(0, 10)}...`
            // );

            // Check if this is first registration
            const existingData = await AsyncStorage.getItem(STORAGE_KEY);
            const isFirstRegistration = !existingData;

            // Mark as registered
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
                deviceToken,
                userId: this.userId,
                registeredAt: Date.now(),
            }));

            // Send welcome notification only on first registration
            if (isFirstRegistration) {
                console.log('📤 First registration detected, sending welcome notification');
                await this.sendWelcomeNotification();
            } else {
                console.log('✅ Device re-registered, skipping welcome notification');
            }

            return true;
        } catch (error) {
            console.error('❌ Failed to register device:', error);

            // DEBUG: Show error alert
            // Alert.alert(
            //     'Registration Failed',
            //     `Error: ${error.message}`
            // );

            return false;
        }
    }

    /**
     * Send welcome notification after first registration
     */
    async sendWelcomeNotification() {
        try {
            console.log('📤 Sending welcome notification...');

            const response = await fetch(`${API_BASE_URL}/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userIds: [this.userId],
                    title: 'Welcome to Solidi! 🎉',
                    body: 'Your device is now registered for push notifications. You\'ll receive important updates here.',
                    data: {
                        type: 'welcome',
                        screen: 'Home'
                    }
                }),
            });

            if (response.ok) {
                const result = await response.json();
                console.log('✅ Welcome notification sent:', result);
            } else {
                console.warn('⚠️ Failed to send welcome notification:', response.status);
            }
        } catch (error) {
            console.error('❌ Error sending welcome notification:', error);
            // Don't throw - welcome notification is not critical
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

// Create singleton instance
const pushNotificationService = new PushNotificationService();

// Set up iOS handlers immediately when module loads (before any notifications can arrive)
if (Platform.OS === 'ios') {
    console.log('📱 [Module Load] Setting up iOS handlers at module load time...');
    pushNotificationService.setupIOSHandlers();
}

export default pushNotificationService;

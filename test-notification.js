/**
 * Test Notification Script
 * 
 * This script simulates receiving a push notification by:
 * 1. Adding a notification to the storage
 * 2. Triggering the notification banner
 * 
 * To use: Add this to your App.js temporarily and call testNotification()
 */

import { DeviceEventEmitter } from 'react-native';
import NotificationStorageService from './src/storage/NotificationStorageService';

export const testNotification = async () => {
    console.log('🧪 Testing notification system...');

    // 1. Save notification to storage (for inbox)
    const testNotif = {
        title: 'Test Notification',
        body: 'This is a test notification! The banner should appear at the top.',
        data: { type: 'test', timestamp: Date.now() },
        timestamp: Date.now()
    };

    await NotificationStorageService.saveNotification(testNotif);
    console.log('✅ Notification saved to storage');

    // 2. Trigger the banner
    DeviceEventEmitter.emit('SHOW_NOTIFICATION_BANNER', {
        title: testNotif.title,
        body: testNotif.body,
        onPress: () => {
            console.log('📱 Notification banner tapped!');
        }
    });
    console.log('✅ Banner triggered');
};

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, DeviceEventEmitter } from 'react-native';
import NotificationStorageService from '../../storage/NotificationStorageService';

/**
 * Debug button to simulate receiving a push notification
 * This will trigger the banner AND save to inbox
 */
const TestNotificationButton = () => {
    const sendTestNotification = async () => {
        console.log('🧪 Simulating push notification...');

        const testNotif = {
            title: 'Test Push Notification',
            body: 'This simulates a real push notification! You should see the banner slide down.',
            data: { type: 'test', timestamp: Date.now() },
            timestamp: Date.now()
        };

        // 1. Save to storage (like a real notification would)
        await NotificationStorageService.saveNotification(testNotif);

        // 2. Trigger the banner (like PushNotificationManager does)
        DeviceEventEmitter.emit('SHOW_NOTIFICATION_BANNER', {
            title: testNotif.title,
            body: testNotif.body,
            onPress: () => {
                console.log('📱 Banner tapped!');
            }
        });

        console.log('✅ Test notification sent - banner should appear!');
    };

    return (
        <TouchableOpacity
            style={styles.button}
            onPress={sendTestNotification}
        >
            <Text style={styles.buttonText}>🧪 Test Banner</Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        position: 'absolute',
        bottom: 100,
        right: 20,
        backgroundColor: '#007AFF',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        zIndex: 9998,
    },
    buttonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    }
});

export default TestNotificationButton;

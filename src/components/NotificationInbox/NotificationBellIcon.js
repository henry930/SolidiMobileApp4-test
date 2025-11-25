import React, { useState, useEffect } from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import NotificationStorageService from '../../storage/NotificationStorageService';
import NotificationInbox from '../NotificationInbox/NotificationInbox';

const NotificationBellIcon = () => {
    const [unreadCount, setUnreadCount] = useState(0);
    const [inboxVisible, setInboxVisible] = useState(false);

    useEffect(() => {
        loadUnreadCount();

        // Add test notifications for demonstration
        addTestNotifications();

        // Refresh unread count every 5 seconds
        const interval = setInterval(loadUnreadCount, 5000);

        return () => clearInterval(interval);
    }, []);

    const addTestNotifications = async () => {
        try {
            // Check if test notifications already exist
            const existing = await NotificationStorageService.getNotifications();
            if (existing.length === 0) {
                // Add some test notifications
                await NotificationStorageService.saveNotification({
                    title: 'Welcome to Solidi!',
                    body: 'Your notification inbox is ready to use.',
                    data: { screen: 'Home' }
                });
                await NotificationStorageService.saveNotification({
                    title: 'Test Notification',
                    body: 'This is a test notification to demonstrate the inbox feature.',
                    data: { type: 'test' }
                });
                await NotificationStorageService.saveNotification({
                    title: 'Server Maintenance',
                    body: 'The server is currently under maintenance. Please try again later.',
                    data: { priority: 'high' }
                });
                loadUnreadCount();
            }
        } catch (error) {
            console.error('Failed to add test notifications:', error);
        }
    };

    const loadUnreadCount = async () => {
        try {
            const count = await NotificationStorageService.getUnreadCount();
            setUnreadCount(count);
        } catch (error) {
            console.error('Failed to load unread count:', error);
        }
    };

    const handlePress = () => {
        setInboxVisible(true);
    };

    const handleClose = () => {
        setInboxVisible(false);
        // Refresh unread count when inbox closes
        loadUnreadCount();
    };

    return (
        <>
            <TouchableOpacity
                style={styles.container}
                onPress={handlePress}
                testID="notification-bell-icon"
            >
                <Icon name="bell" size={24} color="#000" />
                {unreadCount > 0 && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>

            <NotificationInbox
                visible={inboxVisible}
                onClose={handleClose}
            />
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 0,
        marginRight: 0,
        marginLeft: 0,
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: -2,
        right: -2,
        backgroundColor: '#FF3B30',
        borderRadius: 8,
        minWidth: 16,
        height: 16,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 3,
        borderWidth: 1,
        borderColor: '#FFF',
    },
    badgeText: {
        color: '#FFF',
        fontSize: 9,
        fontWeight: 'bold',
    },
});

export default NotificationBellIcon;

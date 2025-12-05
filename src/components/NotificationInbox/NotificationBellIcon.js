import React, { useState, useEffect } from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { ImageButton } from 'src/components/atomic';
import { colors } from 'src/constants';
import NotificationStorageService from '../../storage/NotificationStorageService';
import NotificationHistoryService from '../../services/NotificationHistoryService';
import NotificationInbox from '../NotificationInbox/NotificationInbox';

const NotificationBellIcon = ({ userId }) => {
    const [unreadCount, setUnreadCount] = useState(0);
    const [inboxVisible, setInboxVisible] = useState(false);

    useEffect(() => {
        loadUnreadCount();

        // Refresh unread count every 5 seconds
        const interval = setInterval(loadUnreadCount, 5000);

        return () => clearInterval(interval);
    }, []);

    const loadUnreadCount = async () => {
        try {
            if (userId) {
                // Try to get unread count from API
                try {
                    const count = await NotificationHistoryService.getUnreadCount(userId);
                    setUnreadCount(count);
                    return;
                } catch (apiError) {
                    console.log('📡 API unavailable, using local storage for unread count');
                    // Fallback to local storage silently
                }
            }

            // Use local storage (fallback or no userId)
            const count = await NotificationStorageService.getUnreadCount();
            setUnreadCount(count);
        } catch (error) {
            console.error('Failed to load unread count:', error);
            // Set to 0 if all attempts fail
            setUnreadCount(0);
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
            <View style={styles.container}>
                <ImageButton
                    imageName='bell'
                    imageType='icon'
                    styles={styleBellButton}
                    onPress={handlePress}
                    testID="notification-bell-icon"
                />
                {unreadCount > 0 && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </Text>
                    </View>
                )}
            </View>

            <NotificationInbox
                visible={inboxVisible}
                onClose={handleClose}
                userId={userId}
            />
        </>
    );
};

const styleBellButton = {
    image: {
        iconSize: 27,
        iconColor: colors.greyedOutIcon,
    },
    view: {},
    text: {},
};

const styles = StyleSheet.create({
    container: {
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: '#FF3B30',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
        borderWidth: 2,
        borderColor: '#FFF',
    },
    badgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
});

export default NotificationBellIcon;

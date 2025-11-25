import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Modal,
    SafeAreaView,
    Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import NotificationStorageService from '../../storage/NotificationStorageService';

const NotificationInbox = ({ visible, onClose }) => {
    const [notifications, setNotifications] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (visible) {
            loadNotifications();
        }
    }, [visible]);

    const loadNotifications = async () => {
        try {
            const data = await NotificationStorageService.getNotifications();
            // Ensure data is always an array
            if (Array.isArray(data)) {
                setNotifications(data);
            } else {
                console.warn('NotificationInbox: Invalid data format, using empty array');
                setNotifications([]);
            }
        } catch (error) {
            console.error('Failed to load notifications:', error);
            // Set empty array on error to prevent crashes
            setNotifications([]);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await loadNotifications();
        } catch (error) {
            console.error('Failed to refresh notifications:', error);
        } finally {
            setRefreshing(false);
        }
    };

    const handleNotificationPress = async (notification) => {
        // Mark as read
        await NotificationStorageService.markAsRead(notification.id);
        await loadNotifications();

        // Show notification details
        Alert.alert(
            notification.title,
            notification.body,
            [
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => handleDelete(notification.id),
                },
                { text: 'OK' },
            ]
        );
    };

    const handleDelete = async (notificationId) => {
        await NotificationStorageService.deleteNotification(notificationId);
        await loadNotifications();
    };

    const handleMarkAllRead = async () => {
        await NotificationStorageService.markAllAsRead();
        await loadNotifications();
    };

    const handleClearAll = () => {
        Alert.alert(
            'Clear All Notifications',
            'Are you sure you want to delete all notifications?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear All',
                    style: 'destructive',
                    onPress: async () => {
                        await NotificationStorageService.clearAll();
                        await loadNotifications();
                    },
                },
            ]
        );
    };

    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        // Less than 1 minute
        if (diff < 60000) {
            return 'Just now';
        }

        // Less than 1 hour
        if (diff < 3600000) {
            const minutes = Math.floor(diff / 60000);
            return `${minutes}m ago`;
        }

        // Less than 24 hours
        if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return `${hours}h ago`;
        }

        // Less than 7 days
        if (diff < 604800000) {
            const days = Math.floor(diff / 86400000);
            return `${days}d ago`;
        }

        // Format as date
        return date.toLocaleDateString();
    };

    const renderNotification = ({ item }) => (
        <TouchableOpacity
            style={[styles.notificationItem, !item.read && styles.unreadNotification]}
            onPress={() => handleNotificationPress(item)}
        >
            <View style={styles.notificationIcon}>
                <Icon
                    name="bell"
                    size={24}
                    color={item.read ? '#999' : '#007AFF'}
                />
            </View>
            <View style={styles.notificationContent}>
                <View style={styles.notificationHeader}>
                    <Text style={[styles.notificationTitle, !item.read && styles.unreadText]}>
                        {item.title}
                    </Text>
                    <Text style={styles.notificationTime}>
                        {formatTimestamp(item.timestamp)}
                    </Text>
                </View>
                <Text style={styles.notificationBody} numberOfLines={2}>
                    {item.body}
                </Text>
                {item.data && Object.keys(item.data).length > 0 && (
                    <View style={styles.dataIndicator}>
                        <Icon name="attachment" size={12} color="#999" />
                        <Text style={styles.dataText}>Has data</Text>
                    </View>
                )}
            </View>
            {!item.read && <View style={styles.unreadDot} />}
        </TouchableOpacity>
    );

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <Icon name="bell-off-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No notifications yet</Text>
            <Text style={styles.emptySubtext}>
                You'll see your notifications here
            </Text>
        </View>
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Icon name="bell" size={24} color="#000" />
                        <Text style={styles.headerTitle}>Notifications</Text>
                        {notifications.filter(n => !n.read).length > 0 && (
                            <View style={styles.badge}>
                                <Text style={styles.badgeText}>
                                    {notifications.filter(n => !n.read).length}
                                </Text>
                            </View>
                        )}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity
                            onPress={async () => {
                                // Add a test notification
                                await NotificationStorageService.saveNotification({
                                    title: 'New Test Message',
                                    body: `Test notification sent at ${new Date().toLocaleTimeString()}`,
                                    data: { type: 'test', timestamp: Date.now() }
                                });
                                await loadNotifications();
                            }}
                            style={{ marginRight: 16 }}
                        >
                            <Icon name="plus-circle" size={24} color="#007AFF" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={onClose}>
                            <Icon name="close" size={24} color="#000" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Action Buttons */}
                {notifications.length > 0 && (
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={handleMarkAllRead}
                        >
                            <Icon name="check-all" size={18} color="#007AFF" />
                            <Text style={styles.actionText}>Mark all read</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={handleClearAll}
                        >
                            <Icon name="delete-outline" size={18} color="#FF3B30" />
                            <Text style={[styles.actionText, { color: '#FF3B30' }]}>
                                Clear all
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Notification List */}
                <ScrollView style={{ flex: 1 }}>
                    {notifications && notifications.length > 0 ? (
                        notifications.map((item, index) => (
                            <View key={item?.id || `notif-${index}`}>
                                {renderNotification({ item })}
                            </View>
                        ))
                    ) : (
                        renderEmpty()
                    )}
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    badge: {
        backgroundColor: '#FF3B30',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginLeft: 8,
    },
    badgeText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: 12,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
    },
    actionText: {
        marginLeft: 4,
        fontSize: 14,
        color: '#007AFF',
    },
    notificationItem: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        padding: 16,
        marginVertical: 4,
        marginHorizontal: 8,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    unreadNotification: {
        backgroundColor: '#F0F8FF',
        borderLeftWidth: 3,
        borderLeftColor: '#007AFF',
    },
    notificationIcon: {
        marginRight: 12,
        justifyContent: 'center',
    },
    notificationContent: {
        flex: 1,
    },
    notificationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    notificationTitle: {
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
        marginRight: 8,
    },
    unreadText: {
        fontWeight: 'bold',
    },
    notificationTime: {
        fontSize: 12,
        color: '#999',
    },
    notificationBody: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    dataIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    dataText: {
        fontSize: 11,
        color: '#999',
        marginLeft: 4,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#007AFF',
        marginLeft: 8,
        alignSelf: 'center',
    },
    emptyListContainer: {
        flex: 1,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#999',
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#CCC',
        marginTop: 8,
    },
});

export default NotificationInbox;

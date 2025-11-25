import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@notification_history';
const MAX_NOTIFICATIONS = 100; // Keep last 100 notifications

/**
 * Service to manage notification history storage
 */
class NotificationStorageService {
    /**
     * Save a notification to history
     * @param {object} notification
     */
    async saveNotification(notification) {
        try {
            const history = await this.getNotifications();

            const newNotification = {
                id: notification.messageId || `notif_${Date.now()}`,
                title: notification.notification?.title || notification.title || 'Notification',
                body: notification.notification?.body || notification.body || '',
                data: notification.data || {},
                timestamp: Date.now(),
                read: false,
                ...notification
            };

            // Add to beginning of array (most recent first)
            history.unshift(newNotification);

            // Keep only last MAX_NOTIFICATIONS
            const trimmedHistory = history.slice(0, MAX_NOTIFICATIONS);

            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedHistory));

            console.log('Notification saved to history:', newNotification.id);
            return newNotification;
        } catch (error) {
            console.error('Failed to save notification:', error);
            throw error;
        }
    }

    /**
     * Get all notifications from history
     * @returns {Promise<Array>}
     */
    async getNotifications() {
        try {
            const data = await AsyncStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Failed to get notifications:', error);
            return [];
        }
    }

    /**
     * Get unread notification count
     * @returns {Promise<number>}
     */
    async getUnreadCount() {
        try {
            const notifications = await this.getNotifications();
            return notifications.filter(n => !n.read).length;
        } catch (error) {
            console.error('Failed to get unread count:', error);
            return 0;
        }
    }

    /**
     * Mark notification as read
     * @param {string} notificationId
     */
    async markAsRead(notificationId) {
        try {
            const notifications = await this.getNotifications();
            const updated = notifications.map(n =>
                n.id === notificationId ? { ...n, read: true } : n
            );
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            console.log('Notification marked as read:', notificationId);
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    }

    /**
     * Mark all notifications as read
     */
    async markAllAsRead() {
        try {
            const notifications = await this.getNotifications();
            const updated = notifications.map(n => ({ ...n, read: true }));
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            console.log('All notifications marked as read');
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    }

    /**
     * Delete a notification
     * @param {string} notificationId
     */
    async deleteNotification(notificationId) {
        try {
            const notifications = await this.getNotifications();
            const filtered = notifications.filter(n => n.id !== notificationId);
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
            console.log('Notification deleted:', notificationId);
        } catch (error) {
            console.error('Failed to delete notification:', error);
        }
    }

    /**
     * Clear all notifications
     */
    async clearAll() {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([]));
            console.log('All notifications cleared');
        } catch (error) {
            console.error('Failed to clear notifications:', error);
        }
    }

    /**
     * Get notifications by date range
     * @param {number} startDate - Timestamp
     * @param {number} endDate - Timestamp
     */
    async getNotificationsByDateRange(startDate, endDate) {
        try {
            const notifications = await this.getNotifications();
            return notifications.filter(
                n => n.timestamp >= startDate && n.timestamp <= endDate
            );
        } catch (error) {
            console.error('Failed to get notifications by date range:', error);
            return [];
        }
    }
}

export default new NotificationStorageService();

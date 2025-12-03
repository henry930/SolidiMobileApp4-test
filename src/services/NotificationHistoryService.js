/**
 * Notification History Service
 * 
 * Fetches notification history from the backend API
 */

const API_BASE_URL = 'https://u4o3rayvl6.execute-api.us-east-1.amazonaws.com/dev';

class NotificationHistoryService {
    /**
     * Fetch notifications for a user
     * @param {string} userId - User identifier
     * @param {number} limit - Number of notifications to fetch (default: 50, max: 100)
     * @param {string} lastKey - Pagination token from previous response
     * @returns {Promise<Object>} Notification data
     */
    static async getNotifications(userId, limit = 50, lastKey = null) {
        try {
            if (!userId) {
                throw new Error('userId is required');
            }

            // Build query string
            const params = new URLSearchParams({
                userId: userId,
                limit: Math.min(limit, 100).toString()
            });

            if (lastKey) {
                params.append('lastKey', lastKey);
            }

            const url = `${API_BASE_URL}/notifications?${params.toString()}`;
            console.log('📥 Fetching notifications from:', url);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to fetch notifications');
            }

            console.log(`✅ Retrieved ${data.count} notifications`);
            if (data.hasMore) {
                console.log(`📄 More notifications available (lastKey: ${data.lastKey})`);
            }

            return {
                notifications: data.notifications || [],
                count: data.count || 0,
                hasMore: data.hasMore || false,
                lastKey: data.lastKey || null
            };

        } catch (error) {
            console.error('❌ Failed to fetch notifications:', error);
            throw error;
        }
    }

    /**
     * Fetch all notifications for a user (with pagination)
     * @param {string} userId - User identifier
     * @param {number} maxNotifications - Maximum number to fetch (default: 200)
     * @returns {Promise<Array>} All notifications
     */
    static async getAllNotifications(userId, maxNotifications = 200) {
        try {
            const allNotifications = [];
            let lastKey = null;
            let hasMore = true;

            while (hasMore && allNotifications.length < maxNotifications) {
                const remaining = maxNotifications - allNotifications.length;
                const limit = Math.min(remaining, 100);

                const result = await this.getNotifications(userId, limit, lastKey);
                
                allNotifications.push(...result.notifications);
                hasMore = result.hasMore;
                lastKey = result.lastKey;

                if (!hasMore) {
                    break;
                }
            }

            console.log(`✅ Retrieved ${allNotifications.length} total notifications`);
            return allNotifications;

        } catch (error) {
            console.error('❌ Failed to fetch all notifications:', error);
            throw error;
        }
    }

    /**
     * Mark notification as read (future implementation)
     * @param {string} userId - User identifier
     * @param {string} notificationId - Notification ID
     */
    static async markAsRead(userId, notificationId) {
        // TODO: Implement when mark-as-read endpoint is available
        console.log('📝 Mark as read not yet implemented');
        return { success: false, message: 'Not implemented' };
    }

    /**
     * Delete notification (future implementation)
     * @param {string} userId - User identifier
     * @param {string} notificationId - Notification ID
     */
    static async deleteNotification(userId, notificationId) {
        // TODO: Implement when delete endpoint is available
        console.log('🗑️ Delete notification not yet implemented');
        return { success: false, message: 'Not implemented' };
    }

    /**
     * Get unread notification count (calculated from fetched notifications)
     * @param {string} userId - User identifier
     * @returns {Promise<number>} Count of unread notifications
     */
    static async getUnreadCount(userId) {
        try {
            // Fetch recent notifications to count unread
            const result = await this.getNotifications(userId, 50);
            const unreadCount = result.notifications.filter(n => !n.read).length;
            
            console.log(`📊 Unread notifications: ${unreadCount}`);
            return unreadCount;

        } catch (error) {
            console.error('❌ Failed to get unread count:', error);
            return 0;
        }
    }

    /**
     * Sync notifications with local storage
     * @param {string} userId - User identifier
     * @param {Object} NotificationStorageService - Local storage service
     */
    static async syncWithLocalStorage(userId, NotificationStorageService) {
        try {
            console.log('🔄 Syncing notifications from server...');

            // Get all notifications from server
            const serverNotifications = await this.getAllNotifications(userId, 100);

            // Save to local storage
            for (const notification of serverNotifications) {
                await NotificationStorageService.saveNotification({
                    title: notification.title,
                    body: notification.body,
                    data: notification.data || {},
                    timestamp: notification.timestamp,
                    read: notification.read || false
                });
            }

            console.log(`✅ Synced ${serverNotifications.length} notifications to local storage`);
            return serverNotifications.length;

        } catch (error) {
            console.error('❌ Failed to sync notifications:', error);
            throw error;
        }
    }
}

export default NotificationHistoryService;

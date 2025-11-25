# Notification Inbox Integration Guide

## Overview

The notification inbox feature allows users to view all their notification history in the app. It includes:
- Bell icon in the header with unread badge
- Full notification inbox modal
- Read/unread status tracking
- Delete and clear all functionality

## Components Created

1. **NotificationStorageService** - Manages notification history in AsyncStorage
2. **NotificationInbox** - Full-screen modal showing notification list
3. **NotificationBellIcon** - Header icon with unread badge

## Integration Steps

### Step 1: Add Bell Icon to Header

Find your app's header component (usually in `App.js` or a navigation header) and add the notification bell icon next to the settings icon.

```javascript
import { NotificationBellIcon } from './src/components/NotificationInbox';

// In your header render:
<View style={styles.headerRight}>
  <NotificationBellIcon />  {/* Add this */}
  <SettingsIcon />
</View>
```

### Step 2: Example Header Integration

```javascript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NotificationBellIcon } from './src/components/NotificationInbox';
import SettingsIcon from './src/components/SettingsIcon';

const AppHeader = () => {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>Solidi</Text>
      <View style={styles.headerRight}>
        <NotificationBellIcon />
        <SettingsIcon />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default AppHeader;
```

### Step 3: Verify Notification Saving

The `PushNotificationService` has been updated to automatically save all notifications to storage. No additional code needed!

Notifications are saved when:
- Received in foreground
- Received in background
- App opened from notification

## Features

### Notification Bell Icon

- Shows unread count badge
- Updates every 5 seconds
- Opens inbox modal on tap
- Refreshes count when inbox closes

### Notification Inbox

- Lists all notifications (most recent first)
- Shows read/unread status
- Displays timestamp (relative time)
- Pull to refresh
- Tap notification to view details
- Mark all as read
- Clear all notifications
- Delete individual notifications

### Notification Storage

- Stores last 100 notifications
- Persists across app restarts
- Tracks read/unread status
- Includes notification data

## Testing

### 1. Send Test Notification

```bash
# After deploying AWS infrastructure and registering device
curl -X POST https://your-api-gateway-url/dev/send \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": ["your-user-id"],
    "title": "Test Notification",
    "body": "This is a test notification",
    "data": {
      "screen": "Home",
      "testId": "123"
    }
  }'
```

### 2. Verify in App

1. ✅ Notification appears on device
2. ✅ Bell icon shows badge (1)
3. ✅ Tap bell icon to open inbox
4. ✅ Notification appears in list
5. ✅ Tap notification to view details
6. ✅ Badge count decreases when marked as read

### 3. Test Multiple Notifications

Send multiple notifications and verify:
- Badge shows correct count
- Notifications appear in chronological order
- Pull to refresh works
- Mark all as read works
- Clear all works

## Customization

### Change Badge Color

Edit `NotificationBellIcon.js`:
```javascript
badge: {
  backgroundColor: '#FF3B30',  // Change this color
  // ...
}
```

### Change Max Notifications

Edit `NotificationStorageService.js`:
```javascript
const MAX_NOTIFICATIONS = 100;  // Change this number
```

### Customize Notification Item

Edit `NotificationInbox.js` - `renderNotification` function to change how notifications are displayed.

## Troubleshooting

### Badge Not Updating
- Check that notifications are being saved (check logs)
- Verify `loadUnreadCount` is being called
- Check AsyncStorage permissions

### Notifications Not Appearing in Inbox
- Verify `NotificationStorageService.saveNotification()` is being called
- Check console logs for errors
- Verify AsyncStorage is working

### Inbox Not Opening
- Check that `NotificationBellIcon` is properly imported
- Verify no modal conflicts
- Check console for errors

## API Reference

### NotificationStorageService

```javascript
// Save notification
await NotificationStorageService.saveNotification(notification);

// Get all notifications
const notifications = await NotificationStorageService.getNotifications();

// Get unread count
const count = await NotificationStorageService.getUnreadCount();

// Mark as read
await NotificationStorageService.markAsRead(notificationId);

// Mark all as read
await NotificationStorageService.markAllAsRead();

// Delete notification
await NotificationStorageService.deleteNotification(notificationId);

// Clear all
await NotificationStorageService.clearAll();
```

### NotificationBellIcon Props

No props required - it's a self-contained component.

### NotificationInbox Props

```javascript
<NotificationInbox
  visible={boolean}      // Show/hide modal
  onClose={() => {}}     // Called when modal closes
/>
```

## Next Steps

1. ✅ Components created
2. ⏳ Add `NotificationBellIcon` to your header
3. ⏳ Test with real notifications
4. ⏳ Customize styling to match your app
5. ⏳ Add deep linking for notification data

---

**Status**: Ready to integrate! 🎉

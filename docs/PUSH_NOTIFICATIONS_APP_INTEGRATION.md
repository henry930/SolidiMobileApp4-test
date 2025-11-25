/**
 * Example integration of PushNotificationService in your App
 * 
 * Add this code to your main App.js or wherever you handle user authentication
 */

import React, { useEffect } from 'react';
import PushNotificationService from './src/services/PushNotificationService';

function App() {
  // Your existing state and hooks
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize push notifications when user logs in
  useEffect(() => {
    const initializePushNotifications = async () => {
      if (user?.id) {
        try {
          console.log('Initializing push notifications for user:', user.id);
          const success = await PushNotificationService.initialize(user.id);
          
          if (success) {
            console.log('✅ Push notifications initialized successfully');
          } else {
            console.log('⚠️ Push notifications not enabled (permission denied or error)');
          }
        } catch (error) {
          console.error('❌ Failed to initialize push notifications:', error);
        }
      }
    };

    initializePushNotifications();
  }, [user]);

  // Clean up on logout
  const handleLogout = async () => {
    try {
      // Unregister push notifications
      await PushNotificationService.unregister();
      console.log('Push notifications unregistered');
      
      // Your existing logout logic
      setUser(null);
      // Clear auth tokens, navigate to login, etc.
      
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  // Example: Clear notifications when app becomes active
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        // Clear all notifications when app opens
        PushNotificationService.clearAllNotifications();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Your existing app render
  return (
    // Your app components
  );
}

export default App;

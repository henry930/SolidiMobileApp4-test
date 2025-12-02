// CRITICAL: Apply NativeEventEmitter fixes BEFORE ANY imports
import '../../fixes/NativeEventEmitterFix';

// Global Debug Control
const DEBUG_MODE = false; // Set to true to enable debug logging

// React imports
import React, { useContext, useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  StatusBar,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// MASSIVE DEBUG LOG TO VERIFY APP LOADING
console.log('🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀');
console.log('🚀 APP.JS IS DEFINITELY LOADING WITH OUR CHANGES!!! 🚀');
console.log('🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀');

// Platform-specific splash screen import
import { Platform } from 'react-native';

let SplashScreen;
if (Platform.OS === 'web') {
  SplashScreen = require('../../components/web/WebSplashScreen').default;
} else {
  SplashScreen = require('react-native-splash-screen').default;
}
import { PaperProvider } from 'react-native-paper';

// Internal imports
import { AppStateProvider } from '../data';
import { theme } from '../../constants';
// Universal Theme System
import { ThemeProvider, useTheme } from '../../styles/ThemeProvider';
// Biometric Authentication
import SecureApp from '../../components/BiometricAuth/SecureApp';
// Push Notifications
import PushNotificationManager from '../../services/PushNotificationManager';

// Disable Inspector completely in development
if (__DEV__) {
  console.disableYellowBox = true;

  // Additional Inspector disabling
  try {
    const { DevSettings } = require('react-native');
    if (DevSettings && DevSettings.setIsShakeToShowDevMenuEnabled) {
      DevSettings.setIsShakeToShowDevMenuEnabled(false);
    }
  } catch (e) {
    // DevSettings not available
  }
}

// Logger
import logger from '../../util/logger';
let logger2 = logger.extend('App');
let { deb, dj, log, lj } = logger.getShortcuts(logger2);

// Inner App component that uses the theme
const AppContent = () => {
  const { theme: universalTheme, colors, isWeb } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
  });

  const initialFunction = () => {
    try {
      if (DEBUG_MODE) console.log('🚀 App.initialFunction - Start');
      return;
    } catch (error) {
      console.error('❌ App.initialFunction error:', error);
    } finally {
      //setLoading(false);
    }
  }

  useEffect(() => {
    if (DEBUG_MODE) console.log('🎯 App useEffect triggered');
    initialFunction();
    // Hide splash screen immediately for debugging
    try {
      SplashScreen.hide();
      if (DEBUG_MODE) console.log('✅ SplashScreen.hide() completed');
    } catch (error) {
      console.log('❌ SplashScreen error:', error);
    }

    // Initialize Push Notifications
    const initPushNotifications = async () => {
      try {
        console.log('🔔 Initializing push notifications...');
        // Setup listeners for incoming notifications
        PushNotificationManager.setupNotificationListeners();

        // Wait a bit for the Activity to be fully attached
        setTimeout(async () => {
          try {
            // Request permission and get token
            const hasPermission = await PushNotificationManager.requestPermission();
            if (hasPermission) {
              const token = await PushNotificationManager.getToken();
              if (token) {
                console.log('✅ Push notifications initialized successfully');
                console.log('📱 FCM Token:', token);
              }
            } else {
              console.log('⚠️ Push notification permission denied');
            }
          } catch (error) {
            console.error('❌ Error requesting push notification permission:', error);
          }
        }, 2000); // Wait 2 seconds for Activity to be ready
      } catch (error) {
        console.error('❌ Error initializing push notifications:', error);
      }
    };

    initPushNotifications();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <StatusBar
        translucent={true}
        backgroundColor="transparent"
        barStyle="dark-content"
      />
      <View style={styles.container}>
        <PaperProvider theme={theme}>
          <SecureApp>
            {/* SecureApp just gates access, AppState handles authentication */}
            <AppStateProvider>
              {/* AppStateProvider renders the full app and handles auto-login */}
            </AppStateProvider>
          </SecureApp>
        </PaperProvider>
      </View>
    </SafeAreaView>
  );
};

let App = () => {
  log('========== start: helloWorld ==========');

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
};

// Basic styles for container
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
});

export default App;

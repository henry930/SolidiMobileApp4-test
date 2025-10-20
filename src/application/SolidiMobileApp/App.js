// Global Debug Control
const DEBUG_MODE = false; // Set to true to enable debug logging

// React imports
import React, { useContext, useEffect, useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
// Platform-specific splash screen import
import { Platform } from 'react-native';

// CRITICAL: Apply NativeEventEmitter fixes BEFORE any other imports
import '../../fixes/NativeEventEmitterFix';

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

// Disable Inspector completely in development
if (__DEV__) {
  console.disableYellowBox = true;
  
  // Additional Inspector disabling
  try {
    const {DevSettings} = require('react-native');
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
let {deb, dj, log, lj} = logger.getShortcuts(logger2);

// Inner App component that uses the theme
const AppContent = () => {
  const { theme: universalTheme, colors, isWeb } = useTheme();
  
  const styles = StyleSheet.create({
    container: {
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
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <PaperProvider theme={theme}>
        <SecureApp>
          <AppStateProvider>
            {/* AppStateProvider will render its own SafeAreaView and full app structure */}
          </AppStateProvider>
        </SecureApp>
      </PaperProvider>
    </SafeAreaView>
  );
};

let App = () => {
  log('========== start: helloWorld ==========');

  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
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

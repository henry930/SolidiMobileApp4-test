import React, { Component } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { biometricAuth } from '../../util/BiometricAuthUtils';
import AppStateContext from '../../application/data';
import SecureAppBridge from '../../util/SecureAppBridge';
import { SolidiLoadingScreen } from '../shared';
import PushNotificationService from '../../services/PushNotificationService';

/**
 * SecureApp - Wrapper component that enforces authentication before app access
 * 
 * This component can be used to wrap your main app and require authentication
 * before users can access the main functionality.
 */
class SecureApp extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isAuthenticated: false,
      authRequired: false, // TEMPORARILY DISABLED - Enable biometric authentication
      skipAuth: false, // Enable biometric authentication when app goes to background/idle
      showSetup: false, // Show setup screen for first-time users
      isLoading: true, // Add loading state to prevent premature rendering
      biometricInfo: { available: false, biometryType: null },
      authError: null,
      isAuthenticating: false,
      appState: 'unknown', // Track current app state
      showManualAuth: false, // Show manual authentication button after timeout
      isCameraActive: false, // Track if camera/modal is open to prevent auth during camera usage
      needsBiometrics: false, // Flag to indicate if biometric check is needed
      biometricVerified: false, // Flag to track if biometric verification passed
      shouldInitializePushNotifications: false, // Flag to initialize push notifications when context available
      pushNotificationsInitialized: false, // Track if push notifications have been initialized
    };

    // Idle timeout settings
    this.idleTimeoutDuration = 30 * 1000; // 30 seconds in milliseconds
    this.idleTimeoutId = null;
    this.lastActivityTime = Date.now();
    this.appStateChangeTime = null;
    this.lastAuthAttempt = 0; // Track last authentication attempt to prevent rapid retries
    this.lastStateChangeTime = 0; // Track last app state change to prevent rapid processing
    this.isFirstLaunch = true; // Track if this is initial app launch (not resume from background)


    // Bind methods
    this.resetIdleTimer = this.resetIdleTimer.bind(this);
    this.checkForIdleTimeout = this.checkForIdleTimeout.bind(this);
    this.handleUserActivity = this.handleUserActivity.bind(this);
  }

  async componentDidMount() {
    console.log('🚀 [SecureApp] Component mounted - starting biometric authentication');

    // Register with bridge so other components can communicate with us
    SecureAppBridge.registerSecureApp(this);

    // IMPORTANT: Wait for AppState context to initialize and check credentials
    // This prevents biometric auth from interfering with auto-login credential validation
    console.log('⏳ [SecureApp] Waiting for AppState to initialize...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Initialize biometric authentication
    await this.initializeBiometricAuth();

    // Listen for app state changes to re-authenticate when app becomes active
    console.log('🎧 [SecureApp] Registering AppState change listener...');
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
    console.log('🎯 [SecureApp] AppState listener registered:', !!this.appStateSubscription);
    console.log('🎯 [SecureApp] Current AppState:', AppState.currentState);

    // Manually trigger active event handler if app is already active
    // This ensures biometric check happens even if no state change event fires
    if (AppState.currentState === 'active') {
      console.log('🚀 [SecureApp] App already active - manually calling handleAppStateChange');
      setTimeout(() => {
        this.handleAppStateChange('active');
      }, 100);
    }

    // Start idle timeout monitoring
    this.startIdleMonitoring();
  }

  async componentDidUpdate(prevProps, prevState) {
    console.log('🔄 [SecureApp] componentDidUpdate called');
    console.log('🔄 [SecureApp] shouldInitializePushNotifications:', this.state.shouldInitializePushNotifications);
    console.log('🔄 [SecureApp] pushNotificationsInitialized:', this.state.pushNotificationsInitialized);

    // Initialize push notifications after biometric auth (context not available in SecureApp, use AsyncStorage)
    // IMPORTANT: Always attempt registration when shouldInitializePushNotifications is true,
    // even if pushNotificationsInitialized is true (FCM token might be obtained but device not registered)
    if (this.state.shouldInitializePushNotifications) {
      console.log('📱 [SecureApp] ============================================');
      console.log('📱 [SecureApp] Initializing push notifications after biometric auth');
      console.log('📱 [SecureApp] ============================================');

      try {
        // Get user identifier from AsyncStorage since context is not available
        const storedEmail = await AsyncStorage.getItem('user_email'); // Match AppState key
        const storedUserId = await AsyncStorage.getItem('userId');
        const userId = storedUserId || storedEmail || 'user-' + Date.now();

        console.log('📱 [SecureApp] STARTING PUSH NOTIFICATION INITIALIZATION');
        console.log('📱 [SecureApp] User ID:', userId);
        console.log('📱 [SecureApp] Platform:', Platform.OS);
        console.log('📱 [SecureApp] ============================================');

        const pushResult = await PushNotificationService.initialize(userId);

        console.log('📱 [SecureApp] ============================================');
        console.log('📱 [SecureApp] Push notification initialization result:', pushResult);
        console.log('📱 [SecureApp] ============================================');

        this.setState({
          pushNotificationsInitialized: true,
          shouldInitializePushNotifications: false
        });
      } catch (error) {
        console.error('❌ [SecureApp] ============================================');
        console.error('❌ [SecureApp] Failed to initialize push notifications:', error);
        console.error('❌ [SecureApp] Error message:', error.message);
        console.error('❌ [SecureApp] Error stack:', error.stack);
        console.error('❌ [SecureApp] ============================================');

        // Mark as initialized even on error to prevent retry loops
        this.setState({
          pushNotificationsInitialized: true,
          shouldInitializePushNotifications: false
        });
      }
    }
  }

  componentWillUnmount() {
    // Unregister from bridge
    SecureAppBridge.unregisterSecureApp();

    // Clean up app state listener using new subscription API
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }

    // Clean up idle timeout
    this.stopIdleMonitoring();
  }

  // Initialize biometric system - check availability and isLogout flag
  initializeBiometricAuth = async () => {
    try {
      console.log('🔍 [SecureApp] ========== INITIALIZING BIOMETRIC SYSTEM ==========');

      // Check if biometric authentication is available
      const info = await biometricAuth.isBiometricAvailable();
      console.log('🔍 [SecureApp] Biometric info:', info);

      // Check biometricsEnabled preference from Settings
      const biometricsEnabledFlag = await AsyncStorage.getItem('biometricsEnabled');
      // Default to true (enabled) if no preference is saved
      const biometricsEnabled = biometricsEnabledFlag === null ? true : biometricsEnabledFlag === 'true';

      // Check isLogout flag to determine if user is logged in
      const isLogoutFlag = await AsyncStorage.getItem('isLogout');
      const isLogout = isLogoutFlag === 'true' || isLogoutFlag === null; // true if logged out or never logged in

      console.log('==========================================');
      console.log('🔍🔍🔍 [SecureApp] BIOMETRIC PREFERENCE CHECK');
      console.log('🔍 [SecureApp] biometricsEnabled from Settings:', biometricsEnabled);
      console.log('🔍 [SecureApp] Raw isLogout flag value from AsyncStorage:', JSON.stringify(isLogoutFlag));
      console.log('🔍 [SecureApp] isLogoutFlag === "true":', isLogoutFlag === 'true');
      console.log('🔍 [SecureApp] isLogoutFlag === null:', isLogoutFlag === null);
      console.log('🔍 [SecureApp] Computed isLogout:', isLogout);
      console.log('🔍 [SecureApp] Decision: Will', (isLogout || !biometricsEnabled) ? 'SKIP' : 'SHOW', 'biometrics');
      console.log('==========================================');

      if (isLogout || !biometricsEnabled) {
        // User logged out, never logged in, or biometrics disabled - skip biometrics
        console.log('❌❌❌ [SecureApp] SKIPPING BIOMETRICS - User logged out, never logged in, or biometrics disabled in Settings');
        this.setState({
          biometricInfo: info,
          showSetup: false,
          isLoading: false,
          isAuthenticated: true,
          biometricVerified: true, // Skip biometrics
          needsBiometrics: false,
          shouldInitializePushNotifications: true // Initialize push notifications even without biometrics
        });
      } else {
        // User was logged in before and biometrics enabled - require biometrics
        console.log('✅✅✅ [SecureApp] SHOWING BIOMETRICS - User was logged in before and biometrics enabled');
        console.log('🔐🔐🔐 [SecureApp] Setting needsBiometrics = true, biometricVerified = false');
        this.setState({
          biometricInfo: info,
          showSetup: false,
          isLoading: false,
          isAuthenticated: true,
          biometricVerified: false,
          needsBiometrics: true // SHOW BIOMETRICS
        }, () => {
          console.log('🎯 [SecureApp] State updated - needsBiometrics:', this.state.needsBiometrics, 'biometricVerified:', this.state.biometricVerified);
          console.log('⏳ [SecureApp] Waiting for AppState active event to trigger biometric auth');
        });
      }

      console.log('✅ [SecureApp] Biometric system initialized');
      console.log('==========================================');

    } catch (error) {
      console.log('🔐 [SecureApp] Error during biometric setup:', error);
      this.setState({
        showSetup: false,
        isLoading: false,
        authError: error.message,
        isAuthenticated: true, // Still allow app to load
        biometricVerified: true, // Skip biometrics on error
        needsBiometrics: false,
        shouldInitializePushNotifications: true // Initialize push notifications
      });
    }
  };

  // Handle app state changes
  handleAppStateChange = async (nextAppState) => {
    console.log('🚨🚨🚨 [SecureApp] ===== APP STATE CHANGE EVENT =====');
    console.log('🚨 [SecureApp] nextAppState:', nextAppState);

    const { isAuthenticating, appState, isCameraActive } = this.state;

    // Prevent duplicate processing of the same state change
    if (appState === nextAppState) {
      console.log('🔍 [SecureApp] App state unchanged:', nextAppState, '- skipping duplicate');
      return;
    }

    console.log('🔍 [SecureApp] App state changed to:', nextAppState, 'from previous state:', appState);
    const now = Date.now();

    // Debounce rapid state changes, but NEVER debounce "active" state (resume is critical!)
    if (nextAppState !== 'active' && this.lastStateChangeTime && (now - this.lastStateChangeTime) < 500) {
      console.log('⚠️ [SecureApp] Rapid state change detected, debouncing...');
      return;
    }
    this.lastStateChangeTime = now;

    if (nextAppState === 'background' || nextAppState === 'inactive') {
      // Check if camera/modal is active - if so, ignore this state change
      if (isCameraActive) {
        console.log('📸 [SecureApp] Camera is active, ignoring app state change to:', nextAppState);
        this.setState({ appState: nextAppState }); // Still update appState for tracking
        return;
      }

      // Record when app went to background
      this.appStateChangeTime = now;
      console.log('🔍 [SecureApp] App going to background at:', new Date(now).toISOString());

      // App going to background - check if credentials exist and require biometrics on return
      // Check isLogout flag since context is not reliable
      const isLogoutFlag = await AsyncStorage.getItem('isLogout');
      const isLogout = isLogoutFlag === 'true' || isLogoutFlag === null;

      console.log('🔐 [SecureApp] Background detected - isLogout flag:', isLogoutFlag);
      console.log('🔐 [SecureApp] Background detected - computed isLogout:', isLogout);
      console.log('🔐 [SecureApp] Background detected - current needsBiometrics:', this.state.needsBiometrics);
      console.log('🔐 [SecureApp] Background detected - current biometricVerified:', this.state.biometricVerified);

      // Check if biometrics are enabled in Settings
      const biometricsEnabledFlag = await AsyncStorage.getItem('biometricsEnabled');
      // Default to true (enabled) if no preference is saved
      const biometricsEnabled = biometricsEnabledFlag === null ? true : biometricsEnabledFlag === 'true';

      console.log('🔐 [SecureApp] BACKGROUND - biometricsEnabled from Settings:', biometricsEnabled);

      // Require biometrics if user is logged in (isLogout=false) AND biometrics enabled
      if (!isLogout && biometricsEnabled) {
        console.log('🔐🔐🔐 [SecureApp] BACKGROUND - User is logged in and biometrics enabled - Setting needsBiometrics = true');
        this.setState({
          appState: nextAppState,
          needsBiometrics: true,
          biometricVerified: false
        }, () => {
          console.log('🎯 [SecureApp] BACKGROUND - State updated - needsBiometrics:', this.state.needsBiometrics, 'biometricVerified:', this.state.biometricVerified);
        });
      } else {
        console.log('🔐 [SecureApp] ❌ User not logged in or biometrics disabled - skipping biometric requirement');
        this.setState({
          appState: nextAppState
        });
      }

      // Stop idle monitoring while in background
      this.stopIdleMonitoring();

    } else if (nextAppState === 'active') {
      console.log('🔍 [SecureApp] ========================================');
      console.log('🔍 [SecureApp] APP BECOMING ACTIVE');
      console.log('🔍 [SecureApp] isFirstLaunch:', this.isFirstLaunch);
      console.log('🔍 [SecureApp] Current state - needsBiometrics:', this.state.needsBiometrics, 'biometricVerified:', this.state.biometricVerified);
      console.log('🔍 [SecureApp] ========================================');

      // Update app state first
      this.setState({ appState: nextAppState });

      // Wait a bit for AppState context to be available
      await new Promise(resolve => setTimeout(resolve, 100));

      // Get AppState context to check authentication
      const appStateContext = this.context;
      console.log('🔍 [SecureApp] AppState context available:', !!appStateContext);
      console.log('🔍 [SecureApp] Current mainPanelState:', appStateContext?.mainPanelState);
      console.log('🔍 [SecureApp] User authenticated:', appStateContext?.user?.isAuthenticated);
      console.log('🔍 [SecureApp] Has credentials:', appStateContext?.user?.apiCredentialsFound);

      // On first active state after component mount:
      // Check isLogout flag to determine if biometrics should be shown

      if (this.isFirstLaunch) {
        this.isFirstLaunch = false;

        // Show loading screen while checking logout state
        console.log('⏳ [SecureApp] Checking logout state...');
        this.setState({ isLoading: true });

        // Check if user logged out or never logged in
        const isLogoutFlag = await AsyncStorage.getItem('isLogout');
        const isLogout = isLogoutFlag === 'true' || isLogoutFlag === null; // true if logged out or never logged in

        console.log('✅✅✅ [SecureApp] FIRST ACTIVE STATE after mount');
        console.log('✅ [SecureApp] isLogout flag:', isLogoutFlag, '=> isLogout:', isLogout);

        if (isLogout) {
          // User logged out or never logged in - skip biometrics, show login
          console.log('✅ [SecureApp] User logged out or never logged in - skipping biometrics');
          this.setState({
            isLoading: false,
            needsBiometrics: false,
            biometricVerified: true,
            shouldInitializePushNotifications: true // Initialize push notifications
          });

          setTimeout(() => {
            if (appStateContext?.user?.isAuthenticated) {
              console.log('⏰ [SecureApp] Starting idle monitoring (user authenticated)');
              this.startIdleMonitoring();
            }
          }, 500);
          return;
        } else {
          // User was logged in before - check if biometrics are enabled
          const biometricsEnabledFlag = await AsyncStorage.getItem('biometricsEnabled');
          // Default to true (enabled) if no preference is saved
          const biometricsEnabled = biometricsEnabledFlag === null ? true : biometricsEnabledFlag === 'true';

          console.log('🔐 [SecureApp] User was logged in - checking biometric settings');
          console.log('🔐 [SecureApp] biometricsEnabled:', biometricsEnabled);

          if (biometricsEnabled) {
            // Biometrics enabled - require authentication
            console.log('🔐 [SecureApp] Biometrics ENABLED - SHOWING BIOMETRICS (first launch)');
            this.setState({
              isLoading: false,
              needsBiometrics: true,
              biometricVerified: false
            }, () => {
              console.log('🚀 [SecureApp] Triggering biometric authentication after first launch...');
              setTimeout(() => {
                this.performBiometricAuth();
              }, 300);
            });
          } else {
            // Biometrics disabled - skip authentication
            console.log('🔐 [SecureApp] Biometrics DISABLED - skipping authentication (first launch)');
            this.setState({
              isLoading: false,
              needsBiometrics: false,
              biometricVerified: true,
              shouldInitializePushNotifications: true // Initialize push notifications
            });

            setTimeout(() => {
              if (appStateContext?.user?.isAuthenticated) {
                console.log('⏰ [SecureApp] Starting idle monitoring (user authenticated)');
                this.startIdleMonitoring();
              }
            }, 500);
          }
          return; // Return here to avoid duplicate trigger below
        }
      }

      console.log('==========================================');
      console.log('🔄🔄🔄 [SecureApp] RESUME from background (not first launch)');
      console.log('🔄 [SecureApp] needsBiometrics:', this.state.needsBiometrics);
      console.log('🔄 [SecureApp] biometricVerified:', this.state.biometricVerified);
      console.log('🔄 [SecureApp] isFirstLaunch:', this.isFirstLaunch);
      console.log('==========================================');

      // Check if biometric verification is needed
      if (this.state.needsBiometrics && !this.state.biometricVerified) {
        console.log('✅✅✅ [SecureApp] RESUME - Biometric verification REQUIRED');
        console.log('🚀 [SecureApp] RESUME - Triggering performBiometricAuth in 300ms');
        setTimeout(() => {
          console.log('📢 [SecureApp] RESUME - NOW calling performBiometricAuth');
          this.performBiometricAuth();
        }, 300);
      } else {
        console.log('🔐 [SecureApp] RESUME - No biometric verification needed');
        this.setState({
          needsBiometrics: false,
          biometricVerified: true
        });
      }

      // Restart idle monitoring if user is authenticated
      setTimeout(() => {
        if (appStateContext?.user?.apiCredentialsFound) {
          console.log('⏰ [SecureApp] Restarting idle monitoring after resume');
          this.startIdleMonitoring();
        }
      }, 500);

      // Reset app state change time
      this.appStateChangeTime = null;
    } else {
      // Update app state for other states
      this.setState({ appState: nextAppState });
    }
  };

  // Perform biometric authentication
  // Check credentials and redirect to login page if no credentials found
  checkCredentialsAndRedirect = () => {
    console.log('🔍 [SecureApp] Checking credentials status...');

    const appStateContext = this.context;
    const hasCredentials = appStateContext?.user?.apiCredentialsFound;
    const isAuthenticated = appStateContext?.user?.isAuthenticated;

    console.log('🔍 [SecureApp] Has credentials:', hasCredentials);
    console.log('🔍 [SecureApp] Is authenticated:', isAuthenticated);

    if (!hasCredentials && !isAuthenticated) {
      console.log('🚪 [SecureApp] No credentials found - redirecting to login');

      // Redirect to login page through AppState
      if (appStateContext?.changeState) {
        appStateContext.changeState('Login');
      }
    } else {
      console.log('✅ [SecureApp] Credentials verified, continuing to app');
    }
  };

  performBiometricAuth = async () => {
    const { biometricInfo, isAuthenticating, needsBiometrics, biometricVerified } = this.state;
    const now = Date.now();

    // Skip if biometric verification not needed
    if (!needsBiometrics && biometricVerified) {
      console.log('⚠️ [SecureApp] Biometric verification not needed, skipping...');
      return;
    }

    // Prevent multiple simultaneous authentication attempts
    if (isAuthenticating) {
      console.log('⚠️ [SecureApp] Authentication already in progress, skipping...');
      return;
    }

    // Prevent rapid authentication attempts (less than 2 seconds apart)
    if (now - this.lastAuthAttempt < 2000) {
      console.log('⚠️ [SecureApp] Authentication attempted too quickly, debouncing...');
      return;
    }

    this.lastAuthAttempt = now;

    try {
      console.log('🔐 [SecureApp] Starting biometric authentication');
      this.setState({ isAuthenticating: true, authError: null });

      // Add a small delay to prevent rapid-fire authentication attempts
      await new Promise(resolve => setTimeout(resolve, 300));

      // Double-check state hasn't changed while we were waiting
      if (!this.state.needsBiometrics && this.state.biometricVerified) {
        console.log('⚠️ [SecureApp] Biometric verification no longer needed, cancelling auth');
        this.setState({ isAuthenticating: false });
        return;
      }

      if (this.state.isAuthenticating === false) {
        console.log('⚠️ [SecureApp] Authentication cancelled while waiting');
        return;
      }

      const authType = biometricAuth.getBiometricTypeDisplayName(biometricInfo.biometryType);
      // Use authenticateWithBiometricsOrPasscode to automatically fall back to device passcode
      const result = await biometricAuth.authenticateWithBiometricsOrPasscode(
        `Use ${authType} to access Solidi`
      );

      console.log('🔐 [SecureApp] Biometric authentication result:', result);

      if (result.success) {
        console.log('✅ [SecureApp] Biometric authentication successful');

        // Check AppState credentials status
        const appStateContext = this.context;
        console.log('🔍 [SecureApp] After biometric success - AppState context:', !!appStateContext);
        console.log('🔍 [SecureApp] After biometric success - hasCredentials:', appStateContext?.user?.apiCredentialsFound);
        console.log('🔍 [SecureApp] After biometric success - isAuthenticated:', appStateContext?.user?.isAuthenticated);

        // Clear fallback timer since auth succeeded
        if (this.authFallbackTimer) {
          clearTimeout(this.authFallbackTimer);
          this.authFallbackTimer = null;
        }
        this.setState({
          isAuthenticated: true,
          authError: null,
          biometricVerified: true,
          needsBiometrics: false,
          shouldInitializePushNotifications: true // Initialize push notifications after successful auth
        });

        // Biometric verification successful - credentials still exist, user can continue
        console.log('✅ [SecureApp] Biometric verification successful - app unlocked');

        // Reload user data and portfolio after biometric authentication
        if (appStateContext) {
          console.log('🔄 [SecureApp] Reloading cached data after biometric auth...');
          try {
            // Reload user profile data (triggered by biometric pass)
            if (appStateContext.loadUserInfo && appStateContext.loadUserStatus) {
              console.log('👤 [SecureApp] Reloading user profile data...');
              await appStateContext.loadUserInfo();
              console.log('✅ [SecureApp] User info reloaded');
              await appStateContext.loadUserStatus();
              console.log('✅ [SecureApp] User status reloaded');
            }

            // Reload portfolio/wallet balances (triggered by biometric pass)
            if (appStateContext.loadBalances) {
              console.log('💰 [SecureApp] Reloading portfolio balances...');
              await appStateContext.loadBalances();
              console.log('✅ [SecureApp] Balances reloaded');
            }

            // Prices update automatically every 30s, no need to reload here
            console.log('✅ [SecureApp] All cached data refreshed after biometric auth');
          } catch (error) {
            console.error('❌ [SecureApp] Failed to reload cached data:', error);
          }
        } else {
          console.log('⚠️ [SecureApp] Cannot reload cached data - AppState context not available');
        }

        // Start idle monitoring after successful authentication
        this.startIdleMonitoring();

        // Navigate back to previous page if available
        if (this.context && this.context.stateHistoryList && this.context.stateHistoryList.length > 1) {
          console.log('🔙 [SecureApp] Navigating back to previous page after authentication');
          // Use a small delay to ensure state is updated
          setTimeout(() => {
            this.context.decrementStateHistory();
          }, 100);
        }
      } else if (result.cancelled) {
        console.log('🔐 [SecureApp] Biometric authentication cancelled');
        this.setState({ authError: 'Authentication was cancelled' });
      } else {
        console.log('❌ [SecureApp] Biometric authentication failed:', result.message);
        this.setState({ authError: result.message || 'Authentication failed' });
      }
    } catch (error) {
      console.log('❌ [SecureApp] Biometric authentication error:', error);
      this.setState({ authError: error.message || 'Authentication failed' });
    } finally {
      this.setState({ isAuthenticating: false });
    }
  };

  // Handle authentication button press
  attemptSystemAuthentication = async () => {
    const { biometricInfo } = this.state;

    if (biometricInfo.available) {
      await this.performBiometricAuth();
    } else {
      // Fallback for devices without biometrics (credential/PIN authentication)
      try {
        console.log('🔐 [SecureApp] Fallback authentication - allowing access');
        this.setState({ isAuthenticated: true });
        // Reset idle timer after successful authentication
        this.resetIdleTimer();

        // Navigate back to previous page if available
        if (this.context && this.context.stateHistoryList && this.context.stateHistoryList.length > 1) {
          setTimeout(() => {
            this.context.decrementStateHistory();
          }, 100);
        }
      } catch (error) {
        console.log('❌ [SecureApp] Fallback authentication error:', error);
        this.setState({ authError: error.message || 'Authentication failed' });
      }
    }
  };



  // Idle monitoring methods
  startIdleMonitoring = () => {
    console.log('⏰ [SecureApp] Starting idle monitoring');
    const appStateContext = this.context;
    const hasCredentials = appStateContext?.user?.apiCredentialsFound;

    if (!hasCredentials) {
      console.log('⏰ [SecureApp] No credentials - idle monitoring disabled');
      return;
    }

    console.log('⏰ [SecureApp] Idle monitoring enabled (credentials exist)');
    this.resetIdleTimer();
  };

  stopIdleMonitoring = () => {
    console.log('⏰ [SecureApp] Stopping idle monitoring');
    if (this.idleTimeoutId) {
      clearTimeout(this.idleTimeoutId);
      this.idleTimeoutId = null;
    }
  };

  resetIdleTimer = () => {
    // Clear existing timeout
    if (this.idleTimeoutId) {
      clearTimeout(this.idleTimeoutId);
    }

    // Only set timeout if user has credentials
    const appStateContext = this.context;
    const hasCredentials = appStateContext?.user?.apiCredentialsFound;

    if (hasCredentials) {
      this.lastActivityTime = Date.now();

      this.idleTimeoutId = setTimeout(() => {
        this.checkForIdleTimeout();
      }, this.idleTimeoutDuration);

      console.log('⏰ [SecureApp] Idle timer reset, will check in', Math.round(this.idleTimeoutDuration / 1000), 'seconds');
    }
  };

  checkForIdleTimeout = () => {
    const now = Date.now();
    const timeSinceLastActivity = now - this.lastActivityTime;

    console.log('⏰ [SecureApp] Checking idle timeout. Time since last activity:', Math.round(timeSinceLastActivity / 1000), 'seconds');

    const appStateContext = this.context;
    const hasCredentials = appStateContext?.user?.apiCredentialsFound;

    if (timeSinceLastActivity >= this.idleTimeoutDuration && hasCredentials) {
      console.log('🔐 [SecureApp] Idle timeout reached, requiring biometric verification');

      // Check if user has credentials before requiring biometric check
      const appStateContext = this.context;
      const hasCredentials = appStateContext?.user?.apiCredentialsFound;

      if (hasCredentials && this.state.biometricInfo.available) {
        // Set flag to require biometric check
        this.setState({
          needsBiometrics: true,
          biometricVerified: false,
          authError: 'Session expired due to inactivity. Please authenticate again.',
          isAuthenticating: false
        });

        // Trigger biometric authentication
        setTimeout(() => {
          if (!this.state.isAuthenticating) {
            this.performBiometricAuth();
          }
        }, 100);

        // Stop monitoring until next authentication
        this.stopIdleMonitoring();

        // Optionally show a notification or alert
        this.showIdleTimeoutMessage();
      } else {
        console.log('ℹ️ [SecureApp] No credentials or biometrics unavailable, skipping idle timeout');
      }
    }
  };

  showIdleTimeoutMessage = () => {
    // This could be enhanced with a proper notification
    console.log('🔐 [SecureApp] Session expired due to inactivity');
  };

  handleUserActivity = () => {
    // Update last activity time and reset timer
    if (this.state.isAuthenticated) {
      this.resetIdleTimer();
    }
  };

  // Handle successful authentication
  handleAuthSuccess = (authResult) => {
    console.log('✅ [SecureApp] Authentication successful:', authResult);
    this.setState({ isAuthenticated: true });

    // You can add additional logic here, like logging the authentication event
    if (this.props.onAuthSuccess) {
      this.props.onAuthSuccess(authResult);
    }
  };

  // Handle logout
  handleLogout = () => {
    console.log('🔐 [SecureApp] User logged out');
    this.setState({ isAuthenticated: false });

    if (this.props.onLogout) {
      this.props.onLogout();
    }
  };

  // Skip authentication (for development/testing)
  skipAuthentication = () => {
    console.log('🔐 [SecureApp] Skipping authentication');
    this.setState({ isAuthenticated: true, authRequired: false });
  };

  // Handle setup completion
  handleSetupComplete = async () => {
    console.log('✅ [SecureApp] Setup completed, rechecking auth methods');
    this.setState({ showSetup: false });
    // Recheck authentication methods after setup
    await this.checkAuthRequirement();
  };

  // Handle setup skip
  handleSetupSkip = () => {
    console.log('⏭️ [SecureApp] Setup skipped - allowing access for now');
    this.setState({ showSetup: false, isAuthenticated: true, authRequired: false });
  };

  // Camera state management - used to prevent auth during camera/modal usage
  setCameraActive = (isActive) => {
    console.log('📸 [SecureApp] Camera state changed:', isActive ? 'ACTIVE' : 'INACTIVE');
    this.setState({ isCameraActive: isActive });
  };

  // Get camera state
  isCameraActive = () => {
    return this.state.isCameraActive;
  };

  render() {
    const {
      isAuthenticated,
      authRequired,
      showSetup,
      isLoading,
      biometricInfo,
      authError,
      isAuthenticating,
      needsBiometrics,
      biometricVerified
    } = this.state;
    const { children } = this.props;

    const appStateContext = this.context;
    console.log('🎨🎨🎨 ========================================');
    console.log('🎨 [SecureApp] RENDER called');
    console.log('🎨 needsBiometrics:', needsBiometrics);
    console.log('🎨 biometricVerified:', biometricVerified);
    console.log('🎨 isLoading:', isLoading);
    console.log('🎨 AppState.mainPanelState:', appStateContext?.mainPanelState);
    console.log('🎨 AppState.user.isAuthenticated:', appStateContext?.user?.isAuthenticated);
    console.log('🎨🎨🎨 ========================================');

    // Show loading screen while checking authentication requirements
    if (isLoading) {
      console.log('🎨 [SecureApp] Rendering loading screen');
      return (
        <View style={styles.container}>
          <SolidiLoadingScreen
            fullScreen={true}
            message="Initializing..."
            size="medium"
          />
          {this.state.showManualAuth && (
            <View style={styles.manualAuthOverlay}>
              <TouchableOpacity
                style={styles.authButton}
                onPress={() => this.performBiometricAuth()}
              >
                <Text style={styles.authButtonText}>Tap to Authenticate</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      );
    }

    // If biometric verification is not needed or already verified, show the main app
    if (!needsBiometrics || biometricVerified) {
      console.log('🎨 [SecureApp] Rendering main app (biometric verified or not needed)');
      return (
        <View
          style={styles.container}
          onTouchStart={this.handleUserActivity}
          onTouchMove={this.handleUserActivity}
          onScrollBeginDrag={this.handleUserActivity}
        >
          {children}
        </View>
      );
    }

    // Show biometric authentication screen - needs verification
    console.log('🎨 [SecureApp] Rendering BIOMETRIC VERIFICATION SCREEN');
    console.log('🎨 [SecureApp] needsBiometrics:', needsBiometrics, 'biometricVerified:', biometricVerified);
    console.log('🎨 [SecureApp] isAuthenticating:', isAuthenticating);

    const authType = biometricAuth.getBiometricTypeDisplayName(biometricInfo.biometryType);
    const hasError = authError && !isAuthenticating;

    // Show completely black screen with biometric overlay
    return (
      <View style={styles.container} onTouchStart={this.handleUserActivity}>
        {/* Always show black overlay when biometrics are required */}
        <View style={styles.authOverlay}>
          {/* Show error card if authentication failed */}
          {hasError ? (
            <View style={styles.authCard}>
              <Text style={styles.errorTitle}>⚠️ Authentication Failed</Text>
              <Text style={styles.errorText}>{authError}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={this.performBiometricAuth}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : isAuthenticating ? (
            /* Show authenticating indicator */
            <View style={styles.authIndicatorCard}>
              <Text style={styles.authIndicatorText}>
                🔐 Authenticating...
              </Text>
            </View>
          ) : (
            /* Show waiting for authentication message */
            <View style={styles.authIndicatorCard}>
              <Text style={styles.authIndicatorText}>
                🔐 Authentication Required
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
    marginTop: 20,
  },
  invisibleAuthContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 30,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#cc0000',
    marginBottom: 15,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 10,
    width: '100%',
  },
  retryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 40,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  authMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  errorContainer: {
    backgroundColor: '#ffe6e6',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ffcccc',
  },
  manualAuthOverlay: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  authButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 10,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    marginBottom: 20,
  },
  authButtonDisabled: {
    backgroundColor: '#cccccc',
    elevation: 0,
    shadowOpacity: 0,
  },
  authButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  helpText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  idleTimeoutText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 15,
    fontStyle: 'italic',
  },
  dimmedContent: {
    flex: 1,
    opacity: 1,
  },
  authOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  authCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 30,
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  authIndicator: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  authIndicatorCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minWidth: 200,
  },
  authIndicatorText: {
    color: 'white',
    fontSize: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  authIndicatorButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  authIndicatorButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

// Add context to access AppState for auto-login
SecureApp.contextType = AppStateContext;

export default SecureApp;
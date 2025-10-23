import React, { Component } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, AppState } from 'react-native';
import { biometricAuth } from '../../util/BiometricAuthUtils';
import AppStateContext from '../../application/data';

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
      authRequired: true, // Always require auth until we check
      skipAuth: false, // For development/testing
      showSetup: false, // Show setup screen for first-time users
      isLoading: true, // Add loading state to prevent premature rendering
      biometricInfo: { available: false, biometryType: null },
      authError: null,
      isAuthenticating: false,
      appState: 'unknown', // Track current app state
      showManualAuth: false, // Show manual authentication button after timeout
    };
    
    // Idle timeout settings
    this.idleTimeoutDuration = 5 * 60 * 1000; // 5 minutes in milliseconds
    this.idleTimeoutId = null;
    this.lastActivityTime = Date.now();
    this.appStateChangeTime = null;
    this.lastAuthAttempt = 0; // Track last authentication attempt to prevent rapid retries
    this.lastStateChangeTime = 0; // Track last app state change to prevent rapid processing
    

    
    // Bind methods
    this.resetIdleTimer = this.resetIdleTimer.bind(this);
    this.checkForIdleTimeout = this.checkForIdleTimeout.bind(this);
    this.handleUserActivity = this.handleUserActivity.bind(this);
  }

  async componentDidMount() {
    console.log('🚀 [SecureApp] Component mounted - starting biometric authentication');
    // Initialize biometric authentication
    await this.initializeBiometricAuth();
    
    // Listen for app state changes to re-authenticate when app becomes active
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
    
    // Start idle timeout monitoring
    this.startIdleMonitoring();
  }

  componentWillUnmount() {
    // Clean up app state listener using new subscription API
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }
    
    // Clean up idle timeout
    this.stopIdleMonitoring();
  }

  // Initialize biometric authentication
  initializeBiometricAuth = async () => {
    try {
      console.log('🔍 [SecureApp] Initializing biometric authentication...');
      
      // Check if biometric authentication is available
      const info = await biometricAuth.isBiometricAvailable();
      console.log('🔍 [SecureApp] Biometric info:', info);
      
      this.setState({ 
        biometricInfo: info,
        authRequired: true, 
        isAuthenticated: false, 
        showSetup: false,
        isLoading: false 
      });

      // If biometrics are available, auto-trigger authentication
      if (info.available) {
        console.log('🔍 [SecureApp] Auto-triggering biometric authentication');
        await this.performBiometricAuth();
      }
      
      // Set a timer to show manual authentication option if auto-auth doesn't complete
      this.authFallbackTimer = setTimeout(() => {
        if (!this.state.isAuthenticated) {
          console.log('🔍 [SecureApp] Showing manual authentication option');
          this.setState({ showManualAuth: true });
        }
      }, 5000); // Show manual option after 5 seconds
      
    } catch (error) {
      console.log('🔐 [SecureApp] Error during biometric setup:', error);
      this.setState({ 
        authRequired: true, 
        isAuthenticated: false, 
        showSetup: false,
        isLoading: false,
        authError: error.message 
      });
    }
  };

  // Handle app state changes
  handleAppStateChange = (nextAppState) => {
    const { isAuthenticating, appState } = this.state;
    
    // Prevent duplicate processing of the same state change
    if (appState === nextAppState) {
      console.log('🔍 [SecureApp] App state unchanged:', nextAppState, '- skipping duplicate');
      return;
    }
    
    console.log('🔍 [SecureApp] App state changed to:', nextAppState, 'from previous state:', appState);
    const now = Date.now();
    
    // Debounce rapid state changes
    if (this.lastStateChangeTime && (now - this.lastStateChangeTime) < 500) {
      console.log('⚠️ [SecureApp] Rapid state change detected, debouncing...');
      return;
    }
    this.lastStateChangeTime = now;
    
    if (nextAppState === 'background' || nextAppState === 'inactive') {
      // Record when app went to background
      this.appStateChangeTime = now;
      console.log('🔍 [SecureApp] App going to background at:', new Date(now).toISOString());
      
      // Lock the app when it goes to background
      this.setState({ 
        isAuthenticated: false, 
        authError: null,
        appState: nextAppState
      });
      
      // Stop idle monitoring while in background
      this.stopIdleMonitoring();
      
    } else if (nextAppState === 'active') {
      console.log('🔍 [SecureApp] App becoming active');
      
      // Update app state first
      this.setState({ appState: nextAppState });
      
      // Check how long the app was in background
      if (this.appStateChangeTime) {
        const backgroundDuration = now - this.appStateChangeTime;
        console.log('🔍 [SecureApp] App was in background for:', Math.round(backgroundDuration / 1000), 'seconds');
        
        // If app was in background for more than 30 seconds, require re-authentication
        const requireReauth = backgroundDuration > 30000; // 30 seconds
        
        if (requireReauth && this.state.biometricInfo.available && !isAuthenticating) {
          console.log('🔐 [SecureApp] Requiring re-authentication after background period');
          // Delay authentication slightly to ensure state is stable
          setTimeout(() => {
            if (!this.state.isAuthenticated && !this.state.isAuthenticating) {
              this.performBiometricAuth();
            }
          }, 100);
        } else if (!this.state.isAuthenticated && !isAuthenticating) {
          console.log('🔐 [SecureApp] User not authenticated, triggering auth');
          setTimeout(() => {
            if (!this.state.isAuthenticated && !this.state.isAuthenticating) {
              this.performBiometricAuth();
            }
          }, 100);
        } else if (isAuthenticating) {
          console.log('⚠️ [SecureApp] Authentication already in progress, not triggering another');
        }
      } else if (!this.state.isAuthenticated && this.state.biometricInfo.available && !isAuthenticating) {
        // First time activation or no previous state
        setTimeout(() => {
          if (!this.state.isAuthenticated && !this.state.isAuthenticating) {
            this.performBiometricAuth();
          }
        }, 100);
      } else if (isAuthenticating) {
        console.log('⚠️ [SecureApp] Authentication already in progress during app activation');
      }
      
      // Reset app state change time
      this.appStateChangeTime = null;
      
      // Restart idle monitoring only if authenticated (with delay)
      setTimeout(() => {
        if (this.state.isAuthenticated && !this.state.isAuthenticating) {
          this.startIdleMonitoring();
        }
      }, 200);
    } else {
      // Update app state for other states
      this.setState({ appState: nextAppState });
    }
  };

  // Perform biometric authentication
  performBiometricAuth = async () => {
    const { biometricInfo, isAuthenticating, isAuthenticated } = this.state;
    const now = Date.now();
    
    // Skip if already authenticated
    if (isAuthenticated) {
      console.log('⚠️ [SecureApp] User already authenticated, skipping auth...');
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
      if (this.state.isAuthenticated) {
        console.log('⚠️ [SecureApp] User authenticated while waiting, cancelling auth');
        this.setState({ isAuthenticating: false });
        return;
      }
      
      if (this.state.isAuthenticating === false) {
        console.log('⚠️ [SecureApp] Authentication cancelled while waiting');
        return;
      }
      
      const authType = biometricAuth.getBiometricTypeDisplayName(biometricInfo.biometryType);
      const result = await biometricAuth.authenticateWithBiometrics(
        `Use ${authType} to access Solidi`
      );
      
      console.log('🔐 [SecureApp] Biometric authentication result:', result);
      
      if (result.success) {
        console.log('✅ [SecureApp] Biometric authentication successful');
        // Clear fallback timer since auth succeeded
        if (this.authFallbackTimer) {
          clearTimeout(this.authFallbackTimer);
          this.authFallbackTimer = null;
        }
        this.setState({ isAuthenticated: true, authError: null });
        // Start idle monitoring after successful authentication
        this.startIdleMonitoring();
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
      // Fallback for devices without biometrics
      try {
        console.log('🔐 [SecureApp] Fallback authentication - allowing access');
        this.setState({ isAuthenticated: true });
        // Reset idle timer after successful authentication
        this.resetIdleTimer();
      } catch (error) {
        console.log('❌ [SecureApp] Fallback authentication error:', error);
        this.setState({ authError: error.message || 'Authentication failed' });
      }
    }
  };



  // Idle monitoring methods
  startIdleMonitoring = () => {
    console.log('⏰ [SecureApp] Starting idle monitoring');
    this.lastActivityTime = Date.now();
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
    
    // Only set timeout if user is authenticated
    if (this.state.isAuthenticated) {
      this.lastActivityTime = Date.now();
      
      this.idleTimeoutId = setTimeout(() => {
        this.checkForIdleTimeout();
      }, this.idleTimeoutDuration);
      
      console.log('⏰ [SecureApp] Idle timer reset, will check in', Math.round(this.idleTimeoutDuration / 60000), 'minutes');
    }
  };

  checkForIdleTimeout = () => {
    const now = Date.now();
    const timeSinceLastActivity = now - this.lastActivityTime;
    
    console.log('⏰ [SecureApp] Checking idle timeout. Time since last activity:', Math.round(timeSinceLastActivity / 60000), 'minutes');
    
    if (timeSinceLastActivity >= this.idleTimeoutDuration && this.state.isAuthenticated) {
      console.log('🔐 [SecureApp] Idle timeout reached, locking app');
      
      // Lock the app due to inactivity
      this.setState({ 
        isAuthenticated: false, 
        authError: 'Session expired due to inactivity. Please authenticate again.',
        isAuthenticating: false
      });
      
      // Stop monitoring until next authentication
      this.stopIdleMonitoring();
      
      // Optionally show a notification or alert
      this.showIdleTimeoutMessage();
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

  render() {
    const { 
      isAuthenticated, 
      authRequired, 
      showSetup, 
      isLoading, 
      biometricInfo, 
      authError, 
      isAuthenticating 
    } = this.state;
    const { children } = this.props;

    console.log('🎨 [SecureApp] Render - authRequired:', authRequired, 'isAuthenticated:', isAuthenticated, 'showSetup:', showSetup, 'isLoading:', isLoading);

    // Show loading screen while checking authentication requirements
    if (isLoading) {
      console.log('🎨 [SecureApp] Rendering loading screen');
      return (
        <View style={[styles.container, styles.loadingContainer]}>
          <Text style={styles.loadingText}>🔐 Initializing security...</Text>
          {this.state.showManualAuth && (
            <TouchableOpacity 
              style={styles.authButton}
              onPress={() => this.performBiometricAuth()}
            >
              <Text style={styles.authButtonText}>Tap to Authenticate</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    // If auth is not required or user is authenticated, show the main app
    if (!authRequired || isAuthenticated) {
      console.log('🎨 [SecureApp] Rendering main app (authenticated or no auth required)');
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

    // Show biometric authentication screen
    console.log('🎨 [SecureApp] Rendering authentication screen');
    
    const authType = biometricAuth.getBiometricTypeDisplayName(biometricInfo.biometryType);
    const hasError = authError && !isAuthenticating;
    
    return (
      <View style={styles.container} onTouchStart={this.handleUserActivity}>
        <View style={styles.authContainer}>
          <Text style={styles.authTitle}>
            {biometricInfo.available ? `🔐 ${authType} Required` : '🔐 Authentication Required'}
          </Text>
          
          {biometricInfo.available ? (
            <Text style={styles.authMessage}>
              Use {authType} to securely access your Solidi account
            </Text>
          ) : (
            <Text style={styles.authMessage}>
              Tap to authenticate and continue to the app
            </Text>
          )}
          
          {hasError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{authError}</Text>
            </View>
          )}
          
          <TouchableOpacity 
            style={[
              styles.authButton,
              isAuthenticating && styles.authButtonDisabled
            ]}
            onPress={this.attemptSystemAuthentication}
            disabled={isAuthenticating}
          >
            <Text style={styles.authButtonText}>
              {isAuthenticating ? 'Authenticating...' : 
               biometricInfo.available ? `Use ${authType}` : 'Continue to App'}
            </Text>
          </TouchableOpacity>
          
          {biometricInfo.available && !isAuthenticating && (
            <Text style={styles.helpText}>
              {biometricInfo.biometryType === 'FaceID' ? 
                'Position your face in front of the camera' :
                biometricInfo.biometryType === 'TouchID' ?
                'Place your finger on the Touch ID sensor' :
                'Follow the biometric authentication prompt'
              }
            </Text>
          )}
          
          {authError && authError.includes('inactivity') && (
            <Text style={styles.idleTimeoutText}>
              🕐 Auto-lock after 5 minutes of inactivity for your security
            </Text>
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
  errorText: {
    color: '#cc0000',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
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
});

export default SecureApp;
import React, { Component } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  SafeAreaView,
  Platform
} from 'react-native';
import { Button, Card, ActivityIndicator } from 'react-native-paper';
import BiometricAuth, { BiometricAuthUtils } from '../BiometricAuth/BiometricAuth';

/**
 * AuthScreen - Main authentication screen with biometric/PIN support
 * 
 * Features:
 * - Face ID / Touch ID authentication
 * - PIN code fallback
 * - Setup flows for new users
 * - Integration with app authentication state
 */
class AuthScreen extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      authMethods: {
        biometric: false,
        biometricType: null
      },
      isAuthenticating: false
    };

    this.biometricAuth = null;
  }

  componentDidMount() {
    this.initializeAuth();
  }

  // Initialize authentication and check available methods
  initializeAuth = async () => {
    try {
      this.setState({ isLoading: true });

      // Create biometric auth instance
      this.biometricAuth = new BiometricAuth({});
      await this.biometricAuth.componentDidMount();

      // Get available auth methods
      const authMethods = await BiometricAuthUtils.getAvailableMethods();
      console.log('🔐 [AuthScreen] Available auth methods:', authMethods);

      this.setState({
        authMethods,
        isLoading: false
      });

      // Auto-attempt authentication if methods are available
      if (authMethods.biometric) {
        this.attemptAuthentication();
      }

    } catch (error) {
      console.log('❌ [AuthScreen] Initialization error:', error.message);
      this.setState({ isLoading: false });
    }
  };

  // Attempt authentication with available methods
  attemptAuthentication = async () => {
    try {
      this.setState({ isAuthenticating: true });

      const result = await this.biometricAuth.authenticate({
        onSuccess: this.handleAuthSuccess,
        onFail: this.handleAuthFail,
        onCancel: this.handleAuthCancel
      });

      if (result.success) {
        this.handleAuthSuccess({ method: result.method || 'unknown' });
      } else {
        this.setState({ isAuthenticating: false });
      }

    } catch (error) {
      console.log('❌ [AuthScreen] Authentication error:', error.message);
      this.setState({ isAuthenticating: false });
      this.handleAuthFail(error.message);
    }
  };

  // Handle successful authentication
  handleAuthSuccess = (authInfo) => {
    console.log('✅ [AuthScreen] Authentication successful:', authInfo);
    this.setState({
      isAuthenticating: false
    });

    // Call parent success handler
    if (this.props.onAuthSuccess) {
      this.props.onAuthSuccess(authInfo);
    }
  };

  // Handle failed authentication
  handleAuthFail = (error) => {
    console.log('❌ [AuthScreen] Authentication failed:', error);
    this.setState({
      isAuthenticating: false
    });

    Alert.alert(
      'Authentication Failed',
      error || 'Unable to authenticate. Please try again.',
      [
        { text: 'Try Again', onPress: this.attemptAuthentication },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  // Handle cancelled authentication
  handleAuthCancel = () => {
    console.log('ℹ️ [AuthScreen] Authentication cancelled');
    this.setState({
      isAuthenticating: false
    });
  };

  // Render authentication button
  renderAuthenticateButton = () => {
    // Always show if we're initialized, as we rely on system auth which handles fallback
    return (
      <Button
        mode="contained"
        onPress={this.attemptAuthentication}
        disabled={this.state.isAuthenticating}
        style={styles.authButton}
        labelStyle={styles.authButtonLabel}
        testID="auth-authenticate-button"
      >
        🔒 Authenticate
      </Button>
    );
  };


  render() {
    const { isLoading, isAuthenticating } = this.state;

    // Show loading state
    if (isLoading) {
      return (
        <SafeAreaView style={styles.container} testID="auth-screen-loading">
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" testID="auth-loading-indicator" />
            <Text style={styles.loadingText} testID="auth-loading-text">Initializing security...</Text>
          </View>
        </SafeAreaView>
      );
    }

    // Main authentication screen
    return (
      <SafeAreaView style={styles.container} testID="auth-screen">
        <View style={styles.content}>
          <Card style={styles.authCard}>
            <Card.Content>
              <Text style={styles.title} testID="auth-title">Welcome Back</Text>
              <Text style={styles.subtitle} testID="auth-subtitle">
                Please authenticate to access your account
              </Text>

              <View style={styles.authMethods}>
                {this.renderAuthenticateButton()}

                {isAuthenticating && (
                  <View style={styles.authenticatingContainer} testID="auth-authenticating-container">
                    <ActivityIndicator size="small" testID="auth-authenticating-indicator" />
                    <Text style={styles.authenticatingText} testID="auth-authenticating-text">Authenticating...</Text>
                  </View>
                )}
              </View>
            </Card.Content>
          </Card>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => {
              if (this.props.onSkip) this.props.onSkip();
            }}
            testID="auth-skip-button"
          >
            <Text style={styles.skipText} testID="auth-skip-text">Skip for now</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  authCard: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
  },
  authMethods: {
    gap: 12,
  },
  authButton: {
    marginVertical: 6,
    paddingVertical: 8,
  },
  authButtonLabel: {
    fontSize: 16,
  },
  authenticatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  skipButton: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  skipText: {
    fontSize: 16,
    color: '#2196F3',
    textDecorationLine: 'underline',
  },
});

export default AuthScreen;
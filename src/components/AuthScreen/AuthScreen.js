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
        biometricType: null,
        pin: false
      },
      showPinCode: false,
      showSetupPinCode: false,
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
      if (authMethods.biometric || authMethods.pin) {
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
        allowBiometric: true,
        allowPin: true,
        onSuccess: this.handleAuthSuccess,
        onFail: this.handleAuthFail,
        onCancel: this.handleAuthCancel
      });
      
      if (result.showPinCode) {
        this.setState({
          showPinCode: true,
          isAuthenticating: false
        });
      } else if (result.success) {
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
      isAuthenticating: false,
      showPinCode: false
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
      isAuthenticating: false,
      showPinCode: false
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
      isAuthenticating: false,
      showPinCode: false
    });
  };

  // Setup PIN code for new users
  setupPinCode = () => {
    this.setState({ showSetupPinCode: true });
  };

  // Handle PIN code setup completion
  handlePinSetupComplete = async (pinCode) => {
    console.log('✅ [AuthScreen] PIN setup completed');
    
    this.setState({
      showSetupPinCode: false,
      authMethods: {
        ...this.state.authMethods,
        pin: true
      }
    });
    
    // Also setup biometric auth if available
    if (this.state.authMethods.biometric) {
      const setupResult = await this.biometricAuth.setupBiometricAuth();
      if (setupResult.success) {
        console.log('✅ [AuthScreen] Biometric setup also completed');
      }
    }
    
    Alert.alert(
      'Security Setup Complete',
      'Your authentication methods have been configured successfully.',
      [{ text: 'OK', onPress: this.attemptAuthentication }]
    );
  };

  // Render biometric authentication button
  renderBiometricButton = () => {
    const { biometric, biometricType } = this.state.authMethods;
    
    if (!biometric) return null;
    
    const getButtonText = () => {
      switch (biometricType) {
        case 'FaceID':
          return 'Authenticate with Face ID';
        case 'TouchID':
          return 'Authenticate with Touch ID';
        default:
          return 'Authenticate with Biometrics';
      }
    };
    
    const getIcon = () => {
      switch (biometricType) {
        case 'FaceID':
          return '👤';
        case 'TouchID':
          return '👆';
        default:
          return '🔒';
      }
    };
    
    return (
      <Button
        mode="contained"
        onPress={this.attemptAuthentication}
        disabled={this.state.isAuthenticating}
        style={styles.authButton}
        labelStyle={styles.authButtonLabel}
      >
        {getIcon()} {getButtonText()}
      </Button>
    );
  };

  // Render PIN authentication button
  renderPinButton = () => {
    const { pin } = this.state.authMethods;
    
    if (!pin) return null;
    
    return (
      <Button
        mode="outlined"
        onPress={() => this.setState({ showPinCode: true })}
        disabled={this.state.isAuthenticating}
        style={styles.pinButton}
        labelStyle={styles.pinButtonLabel}
      >
        🔢 Use PIN Code
      </Button>
    );
  };

  // Render setup options for new users
  renderSetupOptions = () => {
    const { biometric, pin } = this.state.authMethods;
    
    if (biometric || pin) return null;
    
    return (
      <Card style={styles.setupCard}>
        <Card.Content>
          <Text style={styles.setupTitle}>Secure Your App</Text>
          <Text style={styles.setupSubtitle}>
            Set up authentication to protect your account and data
          </Text>
          
          <Button
            mode="contained"
            onPress={this.setupPinCode}
            style={styles.setupButton}
          >
            🔒 Set up PIN & Biometric Auth
          </Button>
        </Card.Content>
      </Card>
    );
  };

  render() {
    const { isLoading, showPinCode, showSetupPinCode, isAuthenticating } = this.state;
    
    // Show loading state
    if (isLoading) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
            <Text style={styles.loadingText}>Initializing security...</Text>
          </View>
        </SafeAreaView>
      );
    }
    
    // Show PIN setup screen
    if (showSetupPinCode) {
      return (
        <SafeAreaView style={styles.container}>
          {this.biometricAuth && this.biometricAuth.setupPinCode(this.handlePinSetupComplete)}
        </SafeAreaView>
      );
    }
    
    // Show PIN entry screen
    if (showPinCode) {
      return (
        <SafeAreaView style={styles.container}>
          {this.biometricAuth && this.biometricAuth.authenticateWithPinCode(
            this.handleAuthSuccess,
            this.handleAuthFail
          )}
        </SafeAreaView>
      );
    }
    
    // Main authentication screen
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Card style={styles.authCard}>
            <Card.Content>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>
                Please authenticate to access your account
              </Text>
              
              <View style={styles.authMethods}>
                {this.renderBiometricButton()}
                {this.renderPinButton()}
                
                {isAuthenticating && (
                  <View style={styles.authenticatingContainer}>
                    <ActivityIndicator size="small" />
                    <Text style={styles.authenticatingText}>Authenticating...</Text>
                  </View>
                )}
              </View>
            </Card.Content>
          </Card>
          
          {this.renderSetupOptions()}
          
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => {
              if (this.props.onSkip) this.props.onSkip();
            }}
          >
            <Text style={styles.skipText}>Skip for now</Text>
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
  pinButton: {
    marginVertical: 6,
    paddingVertical: 8,
  },
  pinButtonLabel: {
    fontSize: 16,
  },
  authenticatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  authenticatingText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#666',
  },
  setupCard: {
    marginBottom: 20,
  },
  setupTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  setupSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    color: '#666',
  },
  setupButton: {
    marginVertical: 8,
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
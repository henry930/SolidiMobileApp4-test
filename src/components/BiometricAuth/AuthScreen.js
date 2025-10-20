import React, { Component } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput } from 'react-native';
import BiometricAuth, { BiometricAuthUtils } from './BiometricAuth';

/**
 * AuthScreen - Example implementation of biometric authentication
 * 
 * Shows how to integrate PIN/Face ID authentication into your app
 */
class AuthScreen extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isAuthenticated: false,
      authMethods: {},
      showPinCode: false,
      isLoading: false,
      // PIN setup states
      pinCode: '',
      confirmPinCode: '',
      pinStep: 'enter', // 'enter' or 'confirm'
    };
    
    this.biometricAuth = new BiometricAuth({});
    this.pinBiometricAuth = new BiometricAuth({});
  }

  async componentDidMount() {
    await this.checkAuthMethods();
  }

  // Check what authentication methods are available
  checkAuthMethods = async () => {
    try {
      const methods = await BiometricAuthUtils.getAvailableMethods();
      console.log('🔐 [AuthScreen] Available auth methods:', methods);
      
      this.setState({ authMethods: methods });
      
      // If Face ID is available, try it automatically
      if (methods.biometric) {
        console.log('🔐 [AuthScreen] Face ID available, attempting automatic authentication');
        this.authenticateWithBiometric();
      } else if (!methods.biometric && !methods.pin) {
        // If no auth methods are set up, show setup options
        this.showSetupOptions();
      }
    } catch (error) {
      console.log('🔐 [AuthScreen] Error checking auth methods:', error.message);
    }
  };

  // Show setup options for authentication
  showSetupOptions = () => {
    Alert.alert(
      'Set Up Security',
      'To secure your app, please set up authentication',
      [
        {
          text: 'Set Up Face ID',
          onPress: this.setupBiometric,
        },
        {
          text: 'Set Up PIN',
          onPress: this.setupPin,
        },
        {
          text: 'Later',
          style: 'cancel',
        },
      ]
    );
  };

  // Set up biometric authentication
  setupBiometric = async () => {
    try {
      this.setState({ isLoading: true });
      
      const result = await this.biometricAuth.setupBiometricAuth();
      
      if (result.success) {
        Alert.alert('Success', 'Biometric authentication set up successfully!');
        await this.checkAuthMethods();
        
        // Notify parent that authentication is now set up
        if (this.props.onAuthSuccess) {
          this.props.onAuthSuccess({ method: 'biometric_setup', setup: true });
        }
      } else {
        Alert.alert('Setup Failed', result.error || 'Failed to set up biometric authentication');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      this.setState({ isLoading: false });
    }
  };

  // Set up PIN code
  setupPin = () => {
    console.log('🔐 [AuthScreen] Starting PIN setup');
    this.setState({ showPinCode: true });
  };

  // Handle PIN setup completion
  handlePinSetupComplete = async () => {
    const { pinCode, confirmPinCode } = this.state;
    
    if (pinCode !== confirmPinCode) {
      Alert.alert('Error', 'PINs do not match. Please try again.');
      this.setState({ pinCode: '', confirmPinCode: '', pinStep: 'enter' });
      return;
    }
    
    if (pinCode.length !== 4) {
      Alert.alert('Error', 'PIN must be exactly 4 digits.');
      return;
    }
    
    console.log('✅ [AuthScreen] PIN setup completed with PIN:', pinCode);
    this.setState({ 
      showPinCode: false, 
      pinCode: '', 
      confirmPinCode: '', 
      pinStep: 'enter' 
    });
    
    Alert.alert('Success', 'PIN code set up successfully!');
    
    // Recheck auth methods
    await this.checkAuthMethods();
    
    // Notify parent that authentication is now set up
    if (this.props.onAuthSuccess) {
      this.props.onAuthSuccess({ method: 'pin_setup', setup: true });
    }
  };

  // Handle PIN input change
  handlePinChange = (value) => {
    // Only allow numbers and max 4 digits
    const numericValue = value.replace(/[^0-9]/g, '').slice(0, 4);
    
    if (this.state.pinStep === 'enter') {
      this.setState({ pinCode: numericValue });
      
      // Auto-advance to confirmation when 4 digits entered
      if (numericValue.length === 4) {
        setTimeout(() => {
          this.setState({ pinStep: 'confirm' });
        }, 500);
      }
    } else {
      this.setState({ confirmPinCode: numericValue });
      
      // Auto-complete when confirmation is 4 digits
      if (numericValue.length === 4) {
        setTimeout(() => {
          this.handlePinSetupComplete();
        }, 500);
      }
    }
  };

  // Reset PIN setup
  resetPinSetup = () => {
    this.setState({
      pinCode: '',
      confirmPinCode: '',
      pinStep: 'enter',
      showPinCode: false
    });
  };

  // Handle PIN setup failure
  handlePinSetupFail = () => {
    console.log('❌ [AuthScreen] PIN setup failed');
    Alert.alert('Error', 'PIN setup failed. Please try again.');
  };

  // Perform authentication
  authenticate = async () => {
    try {
      this.setState({ isLoading: true });
      
      const result = await this.biometricAuth.authenticate({
        onSuccess: (authResult) => {
          console.log('✅ [AuthScreen] Authentication successful:', authResult.method);
          this.setState({ 
            isAuthenticated: true, 
            showPinCode: false, 
            pinComponent: null,
            isLoading: false 
          });
          
          // Call your app's authentication success handler
          if (this.props.onAuthSuccess) {
            this.props.onAuthSuccess(authResult);
          }
        },
        onFail: (error) => {
          console.log('❌ [AuthScreen] Authentication failed:', error);
          this.setState({ isLoading: false });
          Alert.alert('Authentication Failed', error || 'Please try again');
        },
        onCancel: () => {
          console.log('🔐 [AuthScreen] Authentication cancelled');
          this.setState({ isLoading: false });
        }
      });

      // If result shows we need to show PIN code
      if (result.showPinCode && result.pinComponent) {
        this.setState({ 
          showPinCode: true, 
          pinComponent: result.pinComponent,
          isLoading: false 
        });
      } else if (result.success) {
        this.setState({ 
          isAuthenticated: true,
          isLoading: false 
        });
      } else if (result.error) {
        this.setState({ isLoading: false });
        Alert.alert('Authentication Error', result.error);
      }
    } catch (error) {
      this.setState({ isLoading: false });
      Alert.alert('Error', error.message);
    }
  };

  // Reset authentication methods
  resetAuth = async () => {
    Alert.alert(
      'Reset Authentication',
      'This will remove all authentication methods. Are you sure?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            const result = await this.biometricAuth.resetAuthentication();
            if (result.success) {
              Alert.alert('Success', 'Authentication methods reset successfully');
              this.setState({ 
                isAuthenticated: false,
                authMethods: {},
                showPinCode: false
              });
              await this.checkAuthMethods();
            } else {
              Alert.alert('Error', result.error || 'Failed to reset authentication');
            }
          },
        },
      ]
    );
  };

  // Logout
  logout = () => {
    this.setState({ isAuthenticated: false });
    if (this.props.onLogout) {
      this.props.onLogout();
    }
  };

  render() {
    const { 
      isAuthenticated, 
      authMethods, 
      showPinCode, 
      isLoading,
      pinStep,
      pinCode,
      confirmPinCode
    } = this.state;

    // Show PIN code screen
    if (showPinCode) {
      const { pinStep, pinCode, confirmPinCode } = this.state;
      const isEnterStep = pinStep === 'enter';
      const currentPin = isEnterStep ? pinCode : confirmPinCode;
      
      return (
        <View style={styles.container}>
          <View style={styles.pinSetupContainer}>
            <Text style={styles.title}>🔐 Set Up PIN Code</Text>
            <Text style={styles.subtitle}>
              {isEnterStep ? 'Enter a 4-digit PIN' : 'Confirm your PIN'}
            </Text>
            
            {/* PIN Display Dots */}
            <View style={styles.pinDotsContainer}>
              {[1, 2, 3, 4].map((index) => (
                <View
                  key={index}
                  style={[
                    styles.pinDot,
                    currentPin.length >= index && styles.pinDotFilled
                  ]}
                />
              ))}
            </View>
            
            {/* PIN Input */}
            <TextInput
              style={styles.pinInput}
              value={currentPin}
              onChangeText={this.handlePinChange}
              keyboardType="numeric"
              secureTextEntry={false}
              maxLength={4}
              placeholder="Enter PIN"
              placeholderTextColor="#999"
              autoFocus={true}
            />
            
            {/* Progress Text */}
            <Text style={styles.progressText}>
              {isEnterStep 
                ? `Step 1/2: ${pinCode.length}/4 digits` 
                : `Step 2/2: ${confirmPinCode.length}/4 digits`}
            </Text>
            
            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.button, styles.setupButton]} 
                onPress={this.handlePinSetupComplete}
                disabled={currentPin.length !== 4}
              >
                <Text style={styles.buttonText}>
                  {isEnterStep ? 'Continue' : 'Complete Setup'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.logoutButton]} 
                onPress={this.resetPinSetup}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    // Show authenticated state
    if (isAuthenticated) {
      return (
        <View style={styles.container}>
          <View style={styles.authenticatedContainer}>
            <Text style={styles.title}>🔓 Authenticated</Text>
            <Text style={styles.subtitle}>Welcome to your secure app!</Text>
            
            <TouchableOpacity 
              style={[styles.button, styles.logoutButton]} 
              onPress={this.logout}
            >
              <Text style={styles.buttonText}>Logout</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.resetButton]} 
              onPress={this.resetAuth}
            >
              <Text style={styles.buttonText}>Reset Authentication</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // Show authentication required state
    return (
      <View style={styles.container}>
        <View style={styles.authContainer}>
          <Text style={styles.title}>🔒 Authentication Required</Text>
          <Text style={styles.subtitle}>
            Please authenticate to access your account
          </Text>

          {/* Show available authentication methods */}
          <View style={styles.methodsContainer}>
            <Text style={styles.methodsTitle}>Available Methods:</Text>
            
            {authMethods.biometric && (
              <Text style={styles.methodText}>
                ✅ {authMethods.biometricType} Available
              </Text>
            )}
            
            {authMethods.pin && (
              <Text style={styles.methodText}>✅ PIN Code Available</Text>
            )}
            
            {!authMethods.biometric && !authMethods.pin && (
              <Text style={styles.methodText}>⚠️ No authentication methods set up</Text>
            )}
          </View>

          {/* Authentication button */}
          {(authMethods.biometric || authMethods.pin) && (
            <TouchableOpacity 
              style={[styles.button, styles.authButton]} 
              onPress={this.authenticate}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>
                {isLoading ? 'Authenticating...' : 'Authenticate'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Setup buttons */}
          {!authMethods.biometric && (
            <TouchableOpacity 
              style={[styles.button, styles.setupButton]} 
              onPress={this.setupBiometric}
            >
              <Text style={styles.buttonText}>Set Up Face ID</Text>
            </TouchableOpacity>
          )}
          
          {!authMethods.pin && (
            <TouchableOpacity 
              style={[styles.button, styles.setupButton]} 
              onPress={this.setupPin}
            >
              <Text style={styles.buttonText}>Set Up PIN</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  authenticatedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pinSetupContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pinDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 30,
  },
  pinDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#2196F3',
    backgroundColor: 'transparent',
    marginHorizontal: 10,
  },
  pinDotFilled: {
    backgroundColor: '#2196F3',
  },
  pinInput: {
    width: 200,
    height: 50,
    borderWidth: 2,
    borderColor: '#2196F3',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    backgroundColor: 'white',
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 30,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  methodsContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginBottom: 30,
    width: '100%',
  },
  methodsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  methodText: {
    fontSize: 14,
    marginBottom: 5,
  },
  button: {
    backgroundColor: '#2196F3',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginBottom: 10,
    minWidth: 200,
  },
  authButton: {
    backgroundColor: '#4CAF50',
  },
  setupButton: {
    backgroundColor: '#FF9800',
  },
  logoutButton: {
    backgroundColor: '#9E9E9E',
  },
  resetButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default AuthScreen;
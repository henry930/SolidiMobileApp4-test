import React, { Component } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import { Button, Title, Paragraph } from 'react-native-paper';
import { BiometricAuthUtils } from './BiometricAuth';

/**
 * PinSetupScreen - Authentication setup interface (Face ID preferred)
 */
class PinSetupScreen extends Component {
  constructor(props) {
    super(props);
    this.state = {
      authMethods: {},
      isLoading: false,
      setupComplete: false,
    };
  }

  async componentDidMount() {
    await this.checkCurrentAuthMethods();
  }

  checkCurrentAuthMethods = async () => {
    try {
      const methods = await BiometricAuthUtils.getAvailableMethods();
      console.log('🔐 [AuthSetup] Available auth methods:', methods);
      this.setState({ authMethods: methods });
    } catch (error) {
      console.log('❌ [AuthSetup] Error checking methods:', error);
    }
  };

  setupPinCode = async () => {
    try {
      this.setState({ isLoading: true });
      console.log('🔐 [PinSetup] Starting PIN setup...');
      
      // Import PinCode component dynamically - disabled to prevent NativeEventEmitter crashes
      // const { default: PinCodeScreen } = require('@haskkor/react-native-pincode');
      const PinCodeScreen = null; // Mock to prevent crashes
      
      // Set up PIN code
      const result = await BiometricAuthUtils.setupPinCode();
      console.log('✅ [PinSetup] PIN setup result:', result);
      
      if (result.success) {
        Alert.alert('Success', 'PIN has been set up successfully!');
        this.setState({ setupComplete: true });
        if (this.props.onSetupComplete) {
          this.props.onSetupComplete();
        }
      } else {
        Alert.alert('Error', result.error || 'Failed to set up PIN');
      }
    } catch (error) {
      console.log('❌ [PinSetup] Error setting up PIN:', error);
      Alert.alert('Error', 'Failed to set up PIN: ' + error.message);
    } finally {
      this.setState({ isLoading: false });
    }
  };

  setupFaceId = async () => {
    try {
      this.setState({ isLoading: true });
      console.log('🔐 [AuthSetup] Starting Face ID setup...');
      
      const result = await BiometricAuthUtils.setupBiometricAuth();
      console.log('✅ [AuthSetup] Face ID setup result:', result);
      
      if (result.success) {
        Alert.alert('Success', 'Face ID authentication has been enabled!');
        this.setState({ setupComplete: true });
        if (this.props.onSetupComplete) {
          this.props.onSetupComplete();
        }
      } else {
        Alert.alert('Error', result.error || 'Failed to enable Face ID authentication');
      }
    } catch (error) {
      console.log('❌ [AuthSetup] Error setting up Face ID:', error);
      Alert.alert('Error', 'Failed to set up Face ID: ' + error.message);
    } finally {
      this.setState({ isLoading: false });
    }
  };

  render() {
    const { authMethods, isLoading, setupComplete } = this.state;

    if (setupComplete) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <Title style={styles.title}>✅ Authentication Set Up!</Title>
            <Paragraph style={styles.description}>
              Your app is now secured with authentication. You'll be prompted to authenticate when you open the app.
            </Paragraph>
            <Button 
              mode="contained" 
              onPress={() => this.props.onComplete?.()}
              style={styles.button}
            >
              Continue to App
            </Button>
          </View>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Title style={styles.title}>🔐 Set Up App Security</Title>
          <Paragraph style={styles.description}>
            Secure your app with Face ID authentication:
          </Paragraph>

          <View style={styles.optionsContainer}>
            {authMethods.biometric && (
              <Button
                mode="contained"
                onPress={this.setupFaceId}
                disabled={isLoading}
                style={styles.button}
                icon="face-recognition"
              >
                Enable Face ID (Recommended)
              </Button>
            )}

            <Button
              mode="outlined"
              onPress={this.setupPinCode}
              disabled={isLoading}
              style={styles.button}
              icon="numeric"
            >
              Set Up PIN Code Instead
            </Button>

            <Button
              mode="text"
              onPress={() => this.props.onSkip?.()}
              disabled={isLoading}
              style={styles.skipButton}
            >
              Skip for Now
            </Button>
          </View>

          <View style={styles.statusContainer}>
            <Paragraph style={styles.statusText}>
              Available methods: {JSON.stringify(authMethods, null, 2)}
            </Paragraph>
          </View>
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
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 24,
    fontWeight: 'bold',
  },
  description: {
    textAlign: 'center',
    marginBottom: 40,
    fontSize: 16,
    lineHeight: 24,
  },
  optionsContainer: {
    marginBottom: 40,
  },
  button: {
    marginBottom: 16,
  },
  skipButton: {
    marginTop: 20,
  },
  statusContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
});

export default PinSetupScreen;
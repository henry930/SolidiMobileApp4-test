import React, { Component } from 'react';
import { View, Text, StyleSheet, Alert, SafeAreaView } from 'react-native';
import { Button, Title, Paragraph, Card } from 'react-native-paper';
import BiometricAuthUtils from '../components/BiometricAuth/BiometricAuthUtils';
import PinSetupScreen from '../components/BiometricAuth/PinSetupScreen';

/**
 * BiometricTestPage - Test page for biometric authentication
 */
class BiometricTestPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      authMethods: {},
      showSetup: false,
      authStatus: 'unknown',
    };
  }

  async componentDidMount() {
    await this.checkAuthStatus();
  }

  checkAuthStatus = async () => {
    try {
      const methods = await BiometricAuthUtils.getAvailableMethods();
      console.log('🔐 [BiometricTest] Auth methods:', methods);
      this.setState({ 
        authMethods: methods,
        authStatus: (methods.biometric || methods.pin) ? 'configured' : 'not_configured'
      });
    } catch (error) {
      console.log('❌ [BiometricTest] Error:', error);
      this.setState({ authStatus: 'error' });
    }
  };

  testAuthentication = async () => {
    try {
      Alert.alert('Info', 'Testing authentication...');
      const result = await BiometricAuthUtils.authenticate('Test authentication');
      
      if (result.success) {
        Alert.alert('Success', 'Authentication successful!');
      } else {
        Alert.alert('Failed', result.error || 'Authentication failed');
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  clearAuth = async () => {
    try {
      await BiometricAuthUtils.clearStoredCredentials();
      Alert.alert('Success', 'Authentication cleared');
      await this.checkAuthStatus();
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  render() {
    const { authMethods, showSetup, authStatus } = this.state;

    if (showSetup) {
      return (
        <PinSetupScreen
          onSetupComplete={() => {
            this.setState({ showSetup: false });
            this.checkAuthStatus();
          }}
          onSkip={() => this.setState({ showSetup: false })}
          onComplete={() => this.setState({ showSetup: false })}
        />
      );
    }

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Title style={styles.title}>🔐 Biometric Authentication Test</Title>
          
          <Card style={styles.card}>
            <Card.Content>
              <Paragraph style={styles.status}>
                Status: {authStatus}
              </Paragraph>
              <Paragraph style={styles.methods}>
                Available: {JSON.stringify(authMethods, null, 2)}
              </Paragraph>
            </Card.Content>
          </Card>

          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={() => this.setState({ showSetup: true })}
              style={styles.button}
              icon="cog"
            >
              Set Up Authentication
            </Button>

            <Button
              mode="outlined"
              onPress={this.testAuthentication}
              disabled={authStatus !== 'configured'}
              style={styles.button}
              icon="key"
            >
              Test Authentication
            </Button>

            <Button
              mode="outlined"
              onPress={this.checkAuthStatus}
              style={styles.button}
              icon="refresh"
            >
              Refresh Status
            </Button>

            <Button
              mode="text"
              onPress={this.clearAuth}
              style={styles.button}
              icon="delete"
            >
              Clear Authentication
            </Button>
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
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 20,
    fontWeight: 'bold',
  },
  card: {
    marginBottom: 20,
  },
  status: {
    fontSize: 16,
    marginBottom: 10,
  },
  methods: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  buttonContainer: {
    flex: 1,
  },
  button: {
    marginBottom: 12,
  },
});

export default BiometricTestPage;
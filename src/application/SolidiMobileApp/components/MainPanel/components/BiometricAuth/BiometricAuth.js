import React, { Component } from 'react';
import { View, StyleSheet, BackHandler } from 'react-native';
import AuthScreen from 'src/components/AuthScreen/AuthScreen';
import AppStateContext from 'src/application/data';

/**
 * BiometricAuth MainPanel Component
 * 
 * Integrates biometric authentication into the main app flow
 */
class BiometricAuth extends Component {
  static contextType = AppStateContext;

  componentDidMount() {
    // Prevent back button from bypassing authentication
    this.backHandler = BackHandler.addEventListener('hardwareBackPress', this.handleBackPress);
  }

  componentWillUnmount() {
    if (this.backHandler) {
      this.backHandler.remove();
    }
  }

  handleBackPress = () => {
    // Prevent going back from authentication screen
    return true;
  };

  // Handle successful authentication
  handleAuthSuccess = (authInfo) => {
    console.log('✅ [BiometricAuth MainPanel] Authentication successful:', authInfo);
    
    const appState = this.context;
    
    // Mark user as biometrically authenticated
    appState.setState(prevState => ({
      ...prevState,
      user: {
        ...prevState.user,
        biometricAuthenticated: true,
        lastBiometricAuth: Date.now()
      }
    }));
    
    // Navigate to appropriate screen based on user state
    if (appState.state.user.isAuthenticated) {
      // User has credentials, go to main app
      appState.setMainPanelState({
        mainPanelState: 'RegistrationCompletion', // or 'PersonalDetails' for returning users
        pageName: 'default'
      });
    } else {
      // New user, continue with registration process
      appState.setMainPanelState({
        mainPanelState: 'RegistrationCompletion',
        pageName: 'default'
      });
    }
  };

  // Handle skipping authentication (for development/testing)
  handleSkip = () => {
    console.log('ℹ️ [BiometricAuth MainPanel] Authentication skipped');
    
    const appState = this.context;
    
    // Continue to main app without biometric authentication
    if (appState.state.user.isAuthenticated) {
      appState.setMainPanelState({
        mainPanelState: 'RegistrationCompletion',
        pageName: 'default'
      });
    } else {
      appState.setMainPanelState({
        mainPanelState: 'RegistrationCompletion',
        pageName: 'default'
      });
    }
  };

  render() {
    return (
      <View style={styles.container}>
        <AuthScreen
          onAuthSuccess={this.handleAuthSuccess}
          onSkip={this.handleSkip}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});

export default BiometricAuth;
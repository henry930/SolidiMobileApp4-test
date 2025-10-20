// React imports
import React, { useContext, useEffect, useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

// Material Design imports
import {
  Appbar,
  Button,
  Card,
  HelperText,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';

// Other imports
import _ from 'lodash';
// import * as Keychain from 'react-native-keychain'; // Disabled to prevent NativeEventEmitter crashes

// Mock Keychain to prevent crashes
const Keychain = {
  getInternetCredentials: async (key) => {
    console.log(`[MockKeychain] getInternetCredentials called for key: ${key}`);
    return Promise.resolve({ username: false, password: false });
  },
  setInternetCredentials: async (key, username, password) => {
    console.log(`[MockKeychain] setInternetCredentials called for key: ${key}`);
    return Promise.resolve();
  },
  resetInternetCredentials: async (key) => {
    console.log(`[MockKeychain] resetInternetCredentials called for key: ${key}`);
    return Promise.resolve();
  }
};

// Internal imports
import AppStateContext from 'src/application/data';
import SolidiRestAPIClientLibrary from 'src/api/SolidiRestAPIClientLibrary';
import { StandardButton } from 'src/components/atomic';
import { Title } from 'src/components/shared';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import misc from 'src/util/misc';
import { colors } from 'src/constants';
import { sharedStyles as styles, textStyles as text, formStyles as forms } from 'src/styles';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('Login');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);




let Login = () => {

  let appState = useContext(AppStateContext);
  let [renderCount, triggerRender] = useState(0);
  let stateChangeID = appState.stateChangeID;

  let [challenges, setChallenges] = useState(['email', 'password']);
  let [errorMessage, setErrorMessage] = useState('');
  let [uploadMessage, setUploadMessage] = useState('');
  let [email, setEmail] = useState('');
  let [password, setPassword] = useState('');
  let [tfa, setTFA] = useState(''); // TFA = Two-Factor Authentication (Authenticator app on phone)
  let [disableLoginButton, setDisableLoginButton] = useState(false);

  let [passwordVisible, setPasswordVisible] = useState(false);




  // Initial setup.
  useEffect( () => {
    setup();
  }, []); // Pass empty array so that this only runs once on mount.


  let setup = async () => {
    try {
      await appState.generalSetup();
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
      
      // Load last used email from keychain for convenience
      await loadStoredEmail();
      
      triggerRender(renderCount+1);
    } catch(err) {
      let msg = `Login.setup: Error = ${err}`;
      console.log(msg);
    }
  }

  // Load stored email for convenience (not password for security)
  let loadStoredEmail = async () => {
    try {
      // Get app tier and name from constants or reasonable defaults
      let appTier = 'prod'; // Default to prod if not available
      let appName = 'SolidiMobileApp';
      let emailStorageKey = `LAST_EMAIL_${appTier}_${appName}`;
      let credentials = await Keychain.getInternetCredentials(emailStorageKey);
      if (credentials && credentials.username) {
        setEmail(credentials.username);
        log(`Loaded stored email: ${credentials.username}`);
      }
    } catch (err) {
      log(`Could not load stored email: ${err.message}`);
    }
  }

  // Store email for future convenience (not password for security)
  let storeEmail = async (emailToStore) => {
    try {
      // Get app tier and name from constants or reasonable defaults
      let appTier = 'prod'; // Default to prod if not available
      let appName = 'SolidiMobileApp';
      let emailStorageKey = `LAST_EMAIL_${appTier}_${appName}`;
      await Keychain.setInternetCredentials(emailStorageKey, emailToStore, 'placeholder');
      log(`Stored email for convenience: ${emailToStore}`);
    } catch (err) {
      log(`Could not store email: ${err.message}`);
    }
  }


  let getPasswordButtonTitle = () => {
    let title = passwordVisible ? 'Hide password' : 'Show password';
    return title;
  }




  let submitLoginRequest = async () => {
    let fName = `submitLoginRequest`;
    // test data
    /*
    email = 'johnqfish@foo.com';
    password = 'bigFish6';
    */
    setDisableLoginButton(true);
    try {
      if (! (email && password) ) {
        let msg;
        if (! email && password) {
          msg = 'Email is required.';
        } else if (email && ! password) {
          msg = 'Password is required.';
        } else {
          msg = 'Email and password are required.';
        }
        
        // Show error as popup alert
        Alert.alert(
          "Login Error",
          msg,
          [{ text: "OK", style: "default" }]
        );
        
        setDisableLoginButton(false);
        return;
      }
      // Log in.
      setUploadMessage('Logging in...');
      let output = await appState.login({email, password, tfa});
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
      // Check for security blocks.
      if (output == 'TFA_REQUIRED') {
        setChallenges('tfa');
        setUploadMessage('');
        setDisableLoginButton(false);
        return;
      }
      
      // Store email for convenience on successful login (but not password for security)
      await storeEmail(email);
      
      // Redirect to profile page on successful login.
      appState.changeState('PersonalDetails');
    } catch(err) {
      logger.error(err);
      
      // Show error as popup alert
      Alert.alert(
        "Login Error",
        err.message || "An error occurred during login. Please try again.",
        [{ text: "OK", style: "default" }]
      );
      
      setUploadMessage('');
      setDisableLoginButton(false);
    }
  }

  const theme = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      
      <Title>
        Secure Login
      </Title>

      <KeyboardAwareScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ 
          padding: 16,
          backgroundColor: theme.colors.background
        }}
        keyboardShouldPersistTaps='handled'
      >

        {/* Login Form Card */}
        <Card style={{ 
          marginBottom: 24,
          marginHorizontal: 16,
          elevation: 3
        }}>
          <Card.Content style={{ padding: 20 }}>
            <Text variant="titleMedium" style={{ 
              marginBottom: 20, 
              color: theme.colors.primary,
              textAlign: 'center',
              fontWeight: '600'
            }}>
              🔐 Sign In
            </Text>

            {/* Email Field */}
            {challenges.includes('email') && (
              <TextInput
                mode="outlined"
                label="Email Address"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                style={{ marginBottom: 16 }}
                left={<TextInput.Icon icon="email" />}
              />
            )}

            {/* Password Field */}
            {challenges.includes('password') && (
              <TextInput
                mode="outlined"
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!passwordVisible}
                autoCapitalize="none"
                style={{ marginBottom: 16 }}
                left={<TextInput.Icon icon="lock" />}
                right={
                  <TextInput.Icon
                    icon={passwordVisible ? "eye-off" : "eye"}
                    onPress={() => setPasswordVisible(!passwordVisible)}
                  />
                }
              />
            )}

            {/* Two-Factor Authentication */}
            {challenges.includes('tfa') && (
              <>
                <HelperText type="info" style={{ marginBottom: 8 }}>
                  📱 Two-Factor Authentication Required
                </HelperText>
                <Text variant="bodySmall" style={{ marginBottom: 16, color: theme.colors.onSurfaceVariant }}>
                  Please open Google Authenticator and enter the code for your Solidi account.
                </Text>
                <TextInput
                  mode="outlined"
                  label="Authentication Code"
                  value={tfa}
                  onChangeText={setTFA}
                  keyboardType="number-pad"
                  maxLength={6}
                  style={{ marginBottom: 16 }}
                  left={<TextInput.Icon icon="shield-key" />}
                />
              </>
            )}

            {/* Login Button */}
            <Button
              mode="contained"
              onPress={submitLoginRequest}
              disabled={disableLoginButton}
              style={{ marginBottom: 16, paddingVertical: 4 }}
              labelStyle={{ fontSize: 16, fontWeight: '600' }}
              icon="login"
            >
              Sign In
            </Button>

            {/* Upload Message */}
            {uploadMessage && (
              <HelperText type="info">
                {uploadMessage}
              </HelperText>
            )}

            {/* Start Again Button for TFA */}
            {challenges.includes('tfa') && (
              <Button
                mode="outlined"
                onPress={() => setChallenges('email password'.split(' '))}
                style={{ marginTop: 8 }}
                icon="restart"
              >
                Start Again
              </Button>
            )}
          </Card.Content>
        </Card>

        {/* Additional Actions */}
        <Card style={{ 
          marginHorizontal: 16,
          elevation: 2
        }}>
          <Card.Content style={{ padding: 20 }}>
            <Text variant="titleSmall" style={{ 
              marginBottom: 16, 
              color: theme.colors.primary,
              fontWeight: '600'
            }}>
              Need Help?
            </Text>
            
            <Button
              mode="text"
              onPress={() => appState.changeState('ResetPassword')}
              style={{ alignSelf: 'flex-start', marginBottom: 8 }}
              icon="key-variant"
            >
              Forgot Password?
            </Button>
            
            <Button
              mode="text"
              onPress={() => appState.changeState('Register')}
              style={{ alignSelf: 'flex-start', marginBottom: 8 }}
              icon="account-plus"
            >
              Create New Account
            </Button>
            
            <Button
              mode="text"
              onPress={() => appState.changeState('ContactUs')}
              style={{ alignSelf: 'flex-start' }}
              icon="help-circle"
            >
              Contact Support
            </Button>
          </Card.Content>
        </Card>

        <View style={{ height: 32 }} />
      </KeyboardAwareScrollView>
    </View>
  );

}


export default Login;

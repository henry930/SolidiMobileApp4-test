// React imports
import React, { useContext, useEffect, useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

// Material Design imports
import {
  ActivityIndicator,
  Appbar,
  Button,
  Card,
  HelperText,
  Portal,
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

  // Auto-login check - runs after setup is complete
  useEffect(() => {
    // Only attempt auto-login if:
    // 1. We have cached credentials
    // 2. User is not authenticated
    // 3. No manual login is in progress (button not disabled)
    // 4. No manual email/password entered yet
    if (appState.user.apiCredentialsFound && 
        !appState.user.isAuthenticated && 
        !disableLoginButton &&
        !email && 
        !password) {
      console.log('🔑 [LOGIN] Found cached credentials, scheduling auto-login...');
      
      // Add small delay to prevent race conditions with manual login
      setTimeout(() => {
        // Double-check conditions haven't changed
        if (appState.user.apiCredentialsFound && 
            !appState.user.isAuthenticated && 
            !disableLoginButton &&
            !email && 
            !password) {
          tryAutoLogin();
        } else {
          console.log('🔑 [LOGIN] Auto-login cancelled - conditions changed');
        }
      }, 100); // 100ms delay
    }
  }, [appState.user.apiCredentialsFound, disableLoginButton, email, password]);  // Run when credentials are found


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

  // Attempt auto-login with cached credentials
  let tryAutoLogin = async () => {
    // Prevent auto-login if manual login is in progress or user has entered credentials
    if (disableLoginButton || email || password) {
      console.log('⚠️ [LOGIN] Skipping auto-login - manual login in progress or user has entered credentials');
      return;
    }

    try {
      console.log('🔑 [LOGIN] Attempting auto-login with cached credentials...');
      
      // Check if we have valid API credentials
      if (!appState.user.apiCredentialsFound) {
        console.log('⚠️ [LOGIN] No cached credentials found for auto-login');
        return;
      }

      // Double-check we're not conflicting with manual login
      if (disableLoginButton) {
        console.log('⚠️ [LOGIN] Login button already disabled, skipping auto-login');
        return;
      }

      console.log('✅ [LOGIN] Cached credentials found, proceeding with auto-login');
      setUploadMessage('Signing in with saved credentials...');
      setDisableLoginButton(true);

      // Use the existing login method from appState
      const result = await appState.login();

      if (result && result.success) {
        console.log('✅ [LOGIN] Auto-login successful');
        setUploadMessage('Welcome back! Signing you in...');
        
        // Clear any previous error messages
        setErrorMessage('');
        
        // Redirect to appropriate page after successful auto-login
        setTimeout(() => {
          appState.setMainPanelState({
            mainPanelState: 'Home',
            pageName: 'default'
          });
        }, 1000);
        
      } else {
        console.log('❌ [LOGIN] Auto-login failed - credentials may be expired');
        setErrorMessage('Saved credentials expired. Please sign in again.');
        setUploadMessage('');
        setDisableLoginButton(false);
        
        // Don't clear credentials - let user try manual login
        // The credentials will be cleared only if manual login also fails
        // await appState.logout(true); // REMOVED: Don't clear credentials on auto-login failure
      }

    } catch (error) {
      console.error('❌ [LOGIN] Auto-login error:', error);
      setErrorMessage('Auto-login failed. Please sign in manually.');
      setUploadMessage('');
      setDisableLoginButton(false);
      
      // Don't clear credentials on error - let user try manual login
      // await appState.logout(true); // REMOVED: Don't clear credentials on error
    }
  }


  let getPasswordButtonTitle = () => {
    let title = passwordVisible ? 'Hide password' : 'Show password';
    return title;
  }




  let submitLoginRequest = async () => {
    let fName = `submitLoginRequest`;
    console.log('🚀 [LOGIN] Manual login attempt started', { 
      email: email ? 'provided' : 'missing', 
      password: password ? 'provided' : 'missing',
      disableLoginButton,
      apiCredentialsFound: appState.user.apiCredentialsFound 
    });
    
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
      
      // Redirect to home page on successful login.
      appState.changeState('Home');
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

      {/* Auto-login Loading Overlay */}
      {appState.user.isAutoLoginInProgress && (
        <Portal>
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <Card style={{
              padding: 32,
              backgroundColor: theme.colors.surface,
              borderRadius: 16,
              elevation: 8,
              alignItems: 'center',
              minWidth: 200
            }}>
              <ActivityIndicator 
                size="large" 
                color={theme.colors.primary}
                style={{ marginBottom: 16 }}
              />
              <Text variant="titleMedium" style={{ 
                color: theme.colors.primary,
                fontWeight: '600',
                marginBottom: 8
              }}>
                Signing you in...
              </Text>
              <Text variant="bodySmall" style={{ 
                color: theme.colors.onSurfaceVariant,
                textAlign: 'center'
              }}>
                Please wait while we securely authenticate your account
              </Text>
            </Card>
          </View>
        </Portal>
      )}
    </View>
  );

}


export default Login;

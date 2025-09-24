// React imports
import React, { useContext, useEffect, useState } from 'react';
import { View, ScrollView } from 'react-native';
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
import * as Keychain from 'react-native-keychain';

// Internal imports
import AppStateContext from 'src/application/data';
import SolidiRestAPIClientLibrary from 'src/api/SolidiRestAPIClientLibrary';
import { StandardButton } from 'src/components/atomic';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import misc from 'src/util/misc';
import { colors } from 'src/constants';
import { sharedStyles as styles, layoutStyles as layout, textStyles as text, cardStyles as cards, formStyles as forms } from 'src/styles';

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
      triggerRender(renderCount+1);
    } catch(err) {
      let msg = `Login.setup: Error = ${err}`;
      console.log(msg);
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
    setErrorMessage('');
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
        setErrorMessage(msg);
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
      // Change state.
      await appState.moveToNextState();
    } catch(err) {
      logger.error(err);
      setErrorMessage(err.message);
      setUploadMessage('');
      setDisableLoginButton(false);
    }
  }

  const theme = useTheme();

  return (
    <View style={[layout.flex1, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header elevated>
        <Appbar.Content title="Welcome Back" subtitle="Sign in to your account" />
        <Appbar.Action icon="account-circle" onPress={() => {}} />
      </Appbar.Header>

      <KeyboardAwareScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={layout.containerPadded}
        keyboardShouldPersistTaps='handled'
      >
        
        {/* Welcome Card */}
        <Card style={cards.elevated}>
          <Card.Content style={[layout.center, layout.paddingVertical]}>
            <Text variant="headlineMedium" style={[text.h2, { color: theme.colors.primary }]}>
              🔐 Secure Login
            </Text>
            <Text variant="bodyMedium" style={[text.bodyCenter, { color: theme.colors.onSurfaceVariant }]}>
              Access your cryptocurrency trading account
            </Text>
          </Card.Content>
        </Card>

        {/* Error Message */}
        {!_.isEmpty(errorMessage) && (
          <Card style={[cards.error, layout.marginBottomMd]}>
            <Card.Content>
              <Text style={{ color: theme.colors.onErrorContainer }}>
                ⚠️ <Text style={text.bold}>Error:</Text> {errorMessage}
              </Text>
            </Card.Content>
          </Card>
        )}

        {/* Login Form Card */}
        <Card style={{ marginBottom: 24 }}>
          <Card.Content>
            <Text variant="titleMedium" style={{ marginBottom: 16, color: theme.colors.primary }}>
              Sign In
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
        <Card>
          <Card.Content>
            <Text variant="titleSmall" style={{ marginBottom: 16, color: theme.colors.primary }}>
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

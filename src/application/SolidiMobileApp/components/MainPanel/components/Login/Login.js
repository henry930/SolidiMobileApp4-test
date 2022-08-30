// React imports
import React, { useContext, useEffect, useState } from 'react';
import { Text, TextInput, StyleSheet, View, ScrollView } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

// Other imports
import _ from 'lodash';
import * as Keychain from 'react-native-keychain';

// Internal imports
import AppStateContext from 'src/application/data';
import SolidiRestAPIClientLibrary from 'src/api/SolidiRestAPIClientLibrary';
import { Button, StandardButton } from 'src/components/atomic';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import misc from 'src/util/misc';
import { mainPanelStates } from 'src/constants';

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
      if (! appState.user.pin) {
        return appState.changeState('PIN', 'choose');
      } else if (appState.panels.buy.activeOrder) {
        return appState.changeState('ChooseHowToPay');
      } else if (! _.isEmpty(appState.stashedState)) {
        return appState.loadStashedState();
      } else {
        // Change to BUY state by default.
        return appState.changeState('Buy');
      }
    } catch(err) {
      log(err);
      setErrorMessage(err.message);
      setUploadMessage('');
      setDisableLoginButton(false);
    }
  }

  return (

    <View style={styles.panelContainer}>
    <View style={styles.panelSubContainer}>

      <View style={styles.heading}>
        <Text style={styles.headingText}>Login</Text>
      </View>

      {! _.isEmpty(errorMessage) &&
        <View style={styles.errorWrapper}>
          <Text style={styles.errorText}>
            <Text style={styles.errorTextBold}>Error: </Text>
            <Text>{errorMessage}</Text>
          </Text>
        </View>
      }

      <KeyboardAwareScrollView showsVerticalScrollIndicator={true} contentContainerStyle={{ flexGrow: 1 }} >

      { challenges.includes('email') &&
        <View style={styles.emailLineWrapper}>
          <Text style={styles.descriptionText}>Email address:</Text>
        </View>
      }

      { challenges.includes('email') &&
        <View style={styles.wideTextInputWrapper}>
          <TextInput
            style={styles.wideTextInput}
            onChangeText={setEmail}
            value={email}
            autoCapitalize={'none'}
            autoCorrect={false}
          />
        </View>
      }

      { challenges.includes('password') &&
        <View style={styles.passwordLineWrapper}>
          <Text style={styles.descriptionText}>Password:</Text>
          <Button title={getPasswordButtonTitle()}
            onPress={ () => { setPasswordVisible(! passwordVisible) } }
          />
        </View>
      }

      { challenges.includes('password') &&
        <View style={styles.wideTextInputWrapper}>
          <TextInput
            secureTextEntry={! passwordVisible}
            style={styles.wideTextInput}
            onChangeText={setPassword}
            value={password}
          />
        </View>
      }

      { challenges.includes('tfa') &&
        <View style={styles.emailLineWrapper}>
          <Text style={styles.descriptionText}>TFA (Two-Factor Authentication):</Text>
          <Text>{'\n'}Please switch to the Google Authenticator app and look up the TFA code for your Solidi account.</Text>
        </View>
      }

      { challenges.includes('tfa') &&
        <View style={styles.wideTextInputWrapper}>
          <TextInput
            style={styles.wideTextInput}
            onChangeText={setTFA}
            value={tfa}
          />
        </View>
      }

      <View style={styles.loginButtonWrapper}>
        <StandardButton title="Log in"
          onPress={ submitLoginRequest }
          disabled={disableLoginButton}
        />
        <View style={styles.uploadMessage}>
          <Text style={styles.uploadMessageText}>{uploadMessage}</Text>
        </View>
      </View>

      { challenges.includes('tfa') &&
        <StandardButton title="Start again"
          onPress={ () => { setChallenges('email password'.split(' ')) } }
          styles={styleStartAgainButton}
        />
      }

      <View style={styles.buttonWrapper}>
        <Button title="Forgot password?"
          onPress={ () => { appState.changeState('ResetPassword') } }
        />
      </View>

      <View style={styles.buttonWrapper}>
        <Button title="Don't have an account?"
          onPress={ () => { appState.changeState('Register') } }
        />
      </View>

      <View style={styles.buttonWrapper}>
        <Button title="Any other problem? Contact us."
          onPress={ () => { appState.changeState('ContactUs') } }
        />
      </View>

      </KeyboardAwareScrollView>

    </View>
    </View>

  );

}


let styles = StyleSheet.create({
  panelContainer: {
    paddingVertical: scaledHeight(15),
    paddingHorizontal: scaledWidth(15),
    width: '100%',
    height: '100%',
  },
  panelSubContainer: {
    paddingTop: scaledHeight(10),
    //paddingHorizontal: scaledWidth(30),
    height: '100%',
    //borderWidth: 1, // testing
  },
  heading: {
    alignItems: 'center',
    marginBottom: scaledHeight(40),
  },
  headingText: {
    fontSize: normaliseFont(20),
    fontWeight: 'bold',
  },
  bold: {
    fontWeight: 'bold',
  },
  descriptionText: {
    fontWeight: 'bold',
    fontSize: normaliseFont(18),
  },
  errorWrapper: {
    marginBottom: scaledHeight(30),
  },
  errorText: {
    fontSize: normaliseFont(14),
    color: 'red',
  },
  errorTextBold: {
    fontWeight: 'bold',
  },
  text1: {
    fontWeight: 'bold',
  },
  wideTextInputWrapper: {
    paddingVertical: scaledHeight(20),
    width: '80%',
    flexDirection: "row",
    justifyContent: 'space-between',
    alignItems: 'center',
    //borderWidth: 1, // testing
  },
  wideTextInput: {
    fontSize: normaliseFont(16),
    height: scaledHeight(40),
    width: scaledWidth(359), // 1 pixel left off so that right-hand border is not cut off.
    borderWidth: 1,
    borderRadius: scaledWidth(8),
    paddingHorizontal: scaledWidth(10),
    marginRight: scaledWidth(20),
  },
  emailLineWrapper: {
    paddingVertical: scaledHeight(5),
    //borderWidth: 1, // testing
  },
  passwordLineWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    //borderWidth: 1, // testing
  },
  loginButtonWrapper: {
    marginTop: scaledHeight(20),
    marginBottom: scaledHeight(10),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    //borderWidth: 1, // testing
  },
  buttonWrapper: {
    marginTop: scaledHeight(20),
    //borderWidth: 1, // testing
  },
  uploadMessage: {
    //borderWidth: 1, //testing
    paddingRight: scaledWidth(10),
  },
  uploadMessageText: {
    fontSize: normaliseFont(14),
    color: 'red',
  },
})


let styleStartAgainButton = StyleSheet.create({
  view: {
    marginTop: scaledHeight(30),
    marginBottom: scaledHeight(10),
    backgroundColor: 'purple',
  },
});


export default Login;

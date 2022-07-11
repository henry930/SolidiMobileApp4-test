// React imports
import React, { useContext, useEffect, useState } from 'react';
import { Text, TextInput, StyleSheet, View, ScrollView } from 'react-native';
import * as Keychain from 'react-native-keychain';

// Other imports
import _ from 'lodash';

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
  let stateChangeID = appState.stateChangeID;

  let [errorMessage, setErrorMessage] = useState('');
  let [uploadMessage, setUploadMessage] = useState('');
  let [email, setEmail] = useState('');
  let [password, setPassword] = useState('');
  let [disableLoginButton, setDisableLoginButton] = useState(false);




  // Initial setup.
  useEffect( () => {
    setup();
  }, []); // Pass empty array so that this only runs once on mount.


  let setup = async () => {
    try {
      await appState.generalSetup();
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
    } catch(err) {
      let msg = `Login.setup: Error = ${err}`;
      console.log(msg);
    }
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
      await appState.login({email, password});
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
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

      <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={{ flexGrow: 1 }} >

      {! _.isEmpty(errorMessage) &&
        <View style={styles.errorWrapper}>
          <Text style={styles.errorText}>
            <Text style={styles.errorTextBold}>Error: </Text>
            <Text>{errorMessage}</Text>
          </Text>
        </View>
      }

      <Text style={styles.descriptionText}>Email address:</Text>

      <View style={styles.wideTextInputWrapper}>
        <TextInput
          style={styles.wideTextInput}
          onChangeText={setEmail}
          value={email}
          autoCapitalize={'none'}
          autoCorrect={false}
        />
      </View>

      <Text style={styles.descriptionText}>Password:</Text>

      <View style={styles.wideTextInputWrapper}>
        <TextInput
          secureTextEntry={true}
          style={styles.wideTextInput}
          onChangeText={setPassword}
          value={password}
        />
      </View>

      <View style={styles.loginButtonWrapper}>
        <StandardButton title="Log in"
          onPress={ submitLoginRequest }
          disabled={disableLoginButton}
        />
        <View style={styles.uploadMessage}>
          <Text style={styles.uploadMessageText}>{uploadMessage}</Text>
        </View>
      </View>

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

      </ScrollView>

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


export default Login;

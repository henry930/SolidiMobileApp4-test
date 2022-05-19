// React imports
import React, { useContext, useState } from 'react';
import { Text, TextInput, StyleSheet, View } from 'react-native';
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

/* Notes

The PIN is stored in the Keychain under the app name e.g. "SolidiMobileApp".

The Login credentials (username and password) are stored under the domain e.g. "solidi.co".

*/




let Login = () => {

  let appState = useContext(AppStateContext);

  let [errorMessage, setErrorMessage] = useState(undefined);

  let [email, setEmail] = useState('');
  let [password, setPassword] = useState('');

  let submitLoginRequest = async () => {
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
        return;
      }
      // Log in.
      await appState.login({email, password});
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
    }
  }

  return (

    <View style={styles.panelContainer}>
    <View style={styles.panelSubContainer}>

      <View>

      <View style={styles.heading}>
        <Text style={styles.headingText}>Login</Text>
      </View>

      {errorMessage &&
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
        <StandardButton title="Log in" onPress={ submitLoginRequest } />
      </View>

      <View style={styles.buttonWrapper}>
        <Button title="Don't have an account? Click here."
          onPress={ () => { appState.changeState('Register') } }
        />
      </View>

      <View style={styles.buttonWrapper}>
        <Button title="Any problems? Contact us."
          onPress={ () => { appState.changeState('ContactUs') } }
        />
      </View>

      </View>

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
  },
  heading: {
    alignItems: 'center',
    marginBottom: scaledHeight(40),
  },
  headingText: {
    fontSize: normaliseFont(20),
    fontWeight: 'bold',
  },
  boldText: {
    fontWeight: 'bold',
  },
  descriptionText: {
    fontWeight: 'bold',
    fontSize: normaliseFont(18),
  },
  errorWrapper: {
    marginBottom: 30,
  },
  errorText: {
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
    height: scaledHeight(40),
    width: scaledWidth(360),
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: scaledWidth(10),
    marginRight: scaledWidth(20),
  },
  loginButtonWrapper: {
    marginTop: scaledHeight(30),
    marginBottom: scaledHeight(40),
  },
  buttonWrapper: {
    marginTop: scaledHeight(20),
    // borderWidth: 1, // testing
  },
})


export default Login;

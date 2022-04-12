// React imports
import React, { useContext, useState } from 'react';
import { Text, TextInput, StyleSheet, View } from 'react-native';
import * as Keychain from 'react-native-keychain';

// Other imports
import _ from 'lodash';

// Internal imports
import AppStateContext from 'src/application/data';
import SolidiRestAPIClientLibrary from 'src/api/SolidiRestAPIClientLibrary';
import { StandardButton } from 'src/components/atomic';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import misc from 'src/util/misc';
import { mainPanelStates } from 'src/constants';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('Login');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);




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
      // Load API Key and Secret from server.
      let apiClient = appState.apiClient;
      let apiRoute = 'login_mobile' + `/${email}`;
      let params = {password};
      let abortController = appState.createAbortController();
      let data = await apiClient.publicMethod({httpMethod: 'POST', apiRoute, params, abortController});
      let keyNames = 'apiKey, apiSecret'.split(', ');
      misc.confirmExactKeys('data', data, keyNames, 'submitLoginRequest');
      let {apiKey, apiSecret} = data;
      // Store these access values in the global state.
      _.assign(apiClient, {apiKey, apiSecret});
      appState.apiClient = apiClient;
      appState.user.isAuthenticated = true;
      _.assign(appState.user, {email, password});
      // Store the email and password in the secure keychain storage.
      let loginCredentialsStored = await Keychain.hasInternetCredentials(appState.domain)
      if (! loginCredentialsStored) {
        await Keychain.setInternetCredentials(appState.domain, email, password);
        let msg = `loginCredentials (email=${email}, password=${password}) stored in keychain under ${appState.domain})`;
        log(msg);
      }
      // Load user stuff.
      await appState.loadInitialStuffAboutUser();
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

      {errorMessage &&
        <View style={styles.errorWrapper}>
          <Text style={styles.errorText}>
            <Text style={styles.errorTextBold}>Error: </Text>
            <Text>{errorMessage}</Text>
          </Text>
        </View>
      }

      <Text style={styles.text1}>Email address:</Text>

      <View style={styles.wideTextInputWrapper}>
        <TextInput
          style={styles.wideTextInput}
          onChangeText={setEmail}
          value={email}
        />
      </View>

      <Text style={styles.text1}>Password:</Text>

      <View style={styles.wideTextInputWrapper}>
        <TextInput
          secureTextEntry={true}
          style={styles.wideTextInput}
          onChangeText={setPassword}
          value={password}
        />
      </View>

      <View style={styles.loginButtonWrapper}>
        <StandardButton title="Login" onPress={ submitLoginRequest } />
      </View>

      </View>

  );

}


let styles = StyleSheet.create({
  panelContainer: {
    paddingTop: scaledHeight(80),
    paddingHorizontal: scaledWidth(15),
    width: '100%',
    height: '100%',
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
  },
  wideTextInput: {
    height: 40,
    width: scaledWidth(360),
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: scaledWidth(10),
    marginRight: scaledWidth(20),
  },
  loginButtonWrapper: {
    marginTop: 10,
  },
})


export default Login;

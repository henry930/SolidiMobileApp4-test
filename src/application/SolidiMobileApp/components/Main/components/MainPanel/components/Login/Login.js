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

// Misc
let lj = (x) => console.log(JSON.stringify(x));


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
      let apiMethod = 'login_mobile' + `/${email}`;
      let params = {password};
      let data = await apiClient.publicMethod({httpMethod: 'POST', apiMethod, params});
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
      // Load and store user info.
      let data2 = await apiClient.privateMethod({httpMethod: 'POST', apiMethod: 'user'});
      let keyNames2 = `address_1, address_2, address_3, address_4,
bank_limit, btc_limit, country, crypto_limit, email, firstname, freewithdraw,
landline, lastname, mobile, mon_bank_limit, mon_btc_limit, mon_crypto_limit,
postcode, uuid, year_bank_limit, year_btc_limit, year_crypto_limit,
`.replace(/\n/g, ' ').replace(/,/g, '').split(' ').filter(x => x);
      misc.confirmExactKeys('data2', data2, keyNames2, 'submitLoginRequest');
      appState.user.userInfo = data2;
      // Change mainPanel.
      if (! appState.user.pin) {
        appState.setMainPanelState({mainPanelState: mainPanelStates.PIN, pageName: 'choose'});
      } else if (_.isEmpty(appState.stashedState)) {
        // Change to BUY state by default.
        appState.setMainPanelState({mainPanelState: mainPanelStates.BUY});
      } else {
        appState.loadStashedState();
      }
      return;
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
    borderLeftWidth: 1,
    borderRightWidth: 1,
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

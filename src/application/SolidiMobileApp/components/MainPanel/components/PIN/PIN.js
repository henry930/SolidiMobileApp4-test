// React imports
import React, { useContext, useState } from 'react';
import {
  KeyboardAvoidingView,
  StyleSheet,
  Dimensions,
  Text,
  View
} from 'react-native';
import PINCode, { hasUserSetPinCode } from '@haskkor/react-native-pincode';
import * as Keychain from 'react-native-keychain';

// Other imports
import _ from 'lodash';

// Internal imports
import { screenWidth, screenHeight } from 'src/util/dimensions';
import AppStateContext from 'src/application/data';
import { mainPanelStates } from 'src/constants';
import { Button } from 'src/components/atomic';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import SolidiRestAPIClientLibrary from 'src/api/SolidiRestAPIClientLibrary';
import misc from 'src/util/misc';




let PIN = () => {

  let appState = useContext(AppStateContext);

  /* By default, this will be the "Enter PIN" page.
  - If we can't find a PIN stored in the keychain, redirect to login page to authenticate the user.
  - The login page will redirect here, with pageName == 'choose'.
  - Note that "enter" and "choose" are specific internal strings used by the PINCode component.
  */

  let pinStatus = 'enter';
  if (appState.pageName === 'choose') {
    pinStatus = 'choose';
  }
  log({pinStatus});

  let _finishProcess = async () => {
    let pinStored = await hasUserSetPinCode(appState.appName);
    if (! pinStored) {
      log('pin not stored');
      // Future: Throw error ? In both "enter" and "choose", it should be stored by now.
    }
    // Load PIN from the keychain.
    let credentials = await Keychain.getInternetCredentials(appState.appName);
    let pin = credentials.password;
    if (pinStatus) {
      log(`PIN stored: ${pin}`);
    }
    // Store PIN in global state.
    appState.user.pin = pin;
    // If we have successfully entered the PIN, then look up the user's email and password.
    if (pinStatus === 'enter') {
      let loginCredentials = await Keychain.getInternetCredentials(appState.domain);
      // Example result:
      // {"password": "mrfishsayshelloN6", "server": "t3.solidi.co", "storage": "keychain", "username": "mr@pig.com"}
      let {username: email, password} = loginCredentials;
      let msg = `loginCredentials (email=${email}, password=${password}) loaded from keychain under ${appState.domain})`;
      log(msg);
      // Use the email and password to load the API Key and Secret from server.
      let {userAgent, domain} = appState;
      let apiClient = new SolidiRestAPIClientLibrary({userAgent, apiKey:'', apiSecret:'', domain});
      let apiRoute = 'login_mobile' + `/${email}`;
      let params = {password};
      let abortController = appState.createAbortController();
      let data = await apiClient.publicMethod({httpMethod: 'POST', apiRoute, params, abortController});
      if (data.error) {
        let msg = `Error in PIN._finishProcess: ${misc.jd(data)}`
        console.error(msg);
      }
      let keyNames = 'apiKey, apiSecret'.split(', ');
      misc.confirmExactKeys('data', data, keyNames, 'submitLoginRequest');
      let {apiKey, apiSecret} = data;
      // Store these access values in the global state.
      _.assign(apiClient, {apiKey, apiSecret});
      appState.apiClient = apiClient;
      appState.user.isAuthenticated = true;
      _.assign(appState.user, {email, password});
      // Load and store user info.
      await appState.loadUserInfo();
    }
    // Change mainPanel.
    if (_.isEmpty(appState.stashedState)) {
      // Change to BUY state by default.
      appState.setMainPanelState({mainPanelState: 'Buy'});
      return;
    } else {
      appState.loadStashedState();
    }
  }

  return (
    <View style={styles.panelContainer}>
      <PINCode
        status = {pinStatus}
        // Note: The PINCode component uses the pinCodeKeychainName to store a newly chosen PIN in the Keychain.
        pinCodeKeychainName = {appState.appName}
        touchIDDisabled = {true}
        finishProcess = {() => _finishProcess()}
        delayBetweenAttempts = {0.3}
        maxAttempts = {10}
        onClickButtonLockedPage = { () => {} }
        pinCodeVisible = {true}
        colorPassword = 'black'
        textPasswordVisibleSize = {normaliseFont(28)}
        stylePinCodeColorTitle = 'black'
        stylePinCodeColorSubtitle = 'black'
        stylePinCodeMainContainer = {styles.container}
        stylePinCodeTextTitle = {styles.stylePinCodeTextTitle}
        stylePinCodeCircle = {styles.stylePinCodeCircle}
        stylePinCodeButtonCircle = {styles.stylePinCodeButtonCircle}
        stylePinCodeTextButtonCircle = {styles.stylePinCodeTextButtonCircle}
        stylePinCodeButtonNumber = 'rgb(100, 100, 130)'
        stylePinCodeDeleteButtonColorHideUnderlay = 'rgb(50, 50, 100)'
        stylePinCodeDeleteButtonText = {styles.stylePinCodeDeleteButtonText}
      />
      <View style={styles.resetButtonWrapper}>
        { pinStatus == 'enter' &&
          <Button title="Reset PIN" styles={stylesResetButton} onPress={ () => { appState.choosePIN(); } } />
        }
      </View>
    </View>
  )

}


let styles = StyleSheet.create({
  panelContainer: {
    paddingTop: scaledHeight(0),
    paddingHorizontal: scaledWidth(15),
    width: '100%',
    height: '100%',
  },
  container: {
    backgroundColor: 'white'
  },
  stylePinCodeTextTitle: {
    fontWeight: '400',
  },
  stylePinCodeCircle: {
    backgroundColor: 'black',
  },
  stylePinCodeButtonCircle: {
    backgroundColor: 'rgb(235, 235, 235)',
  },
  stylePinCodeTextButtonCircle: {
    fontWeight: '700',
  },
  stylePinCodeDeleteButtonText: {
    fontWeight: '500',
  },
  resetButtonWrapper: {
    height: scaledHeight(60),
  },
})


let stylesResetButton = StyleSheet.create({
  view: {
    marginTop: scaledHeight(30),
    alignSelf: 'flex-start',
  },
});


export default PIN;

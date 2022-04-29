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

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('PIN');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);

/* Notes

The PIN is stored in the Keychain under the app name e.g. "SolidiMobileApp".

The Login credentials (username and password) are stored under the domain e.g. "solidi.co".

*/




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
  //log({pinStatus});

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
    // If the user has entered a PIN, then use it to look up the user's email and password.
    if (pinStatus === 'enter') {
      let loginCredentials = await Keychain.getInternetCredentials(appState.domain);
      // Example result:
      // {"password": "mrfishsayshelloN6", "server": "t3.solidi.co", "storage": "keychain", "username": "johnqfish@foo.com"}
      /* Issue:
      - The user may have logged out, in which case the email and password have been deleted.
      In this case:
      - Keychain.getInternetCredentials will return false.
      - We need to stop here and switch to Login page.
      */
      if (! loginCredentials) return appState.changeState('Login');
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
      if (data == 'DisplayedError') return;
      /* Issue:
      - The email and password may have changed (e.g. via the web application).
      In this case, we'll get a particular error. Need to catch it and switch to Login page.
      */
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
      // Load user stuff.
      await appState.loadInitialStuffAboutUser();
    }
    // If we've entered (or chosen) a PIN, and the app was locked, set appLocked to false.
    appState.appLocked = false;
    // Change state.
    if (appState.panels.buy.activeOrder) {
      return appState.changeState('ChooseHowToPay');
    } else if (! _.isEmpty(appState.stashedState)) {
      return appState.loadStashedState();
    } else {
      // Change to BUY state by default.
      return appState.changeState('Buy');
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

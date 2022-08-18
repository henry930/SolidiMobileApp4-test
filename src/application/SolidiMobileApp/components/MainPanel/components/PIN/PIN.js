// React imports
import React, { useContext, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import PINCode, { hasUserSetPinCode } from '@haskkor/react-native-pincode';
import * as Keychain from 'react-native-keychain';

// Other imports
import _ from 'lodash';
import Big from 'big.js';

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




let PIN = () => {

  let appState = useContext(AppStateContext);
  let stateChangeID = appState.stateChangeID;

  /* By default, this will be the "Enter PIN" page.
  - If we can't find a PIN stored in the keychain, redirect to login page to authenticate the user.
  - The login page will redirect here, with pageName == 'choose'.
  - Note that "enter" and "choose" are specific internal strings used by the PINCode component.
  */

  let pinStatus = 'enter';
  if (appState.pageName === 'choose') {
    pinStatus = 'choose';
  } else {
    pinStatus = 'enter'; // e.g. if we're testing this page, and pageName == 'default'.
  }
  log(`pinStatus = '${pinStatus}'`);




  // Initial setup.
  useEffect( () => {
    setup();
  }, []); // Pass empty array so that this only runs once on mount.


  let setup = async () => {
    try {
      await appState.generalSetup();
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
    } catch(err) {
      let msg = `PIN.setup: Error = ${err}`;
      console.log(msg);
    }
  }


  let _finishProcess = async () => {
    let pinStored = await hasUserSetPinCode(appState.pinStorageKey);
    if (! pinStored) {
      log('PIN not stored');
      // For both "enter" and "choose", the PIN should have been stored in the Keychain by now.
      // If not, however, switch to an error state.
      let message = `For an unknown reason, the PIN is not stored in the Keychain.`;
      this.state.switchToErrorState({message});
      return;
    }
    // Load PIN from the keychain.
    let credentials = await Keychain.getInternetCredentials(appState.pinStorageKey);
    let pin = credentials.password;
    // Store PIN in global state.
    appState.user.pin = pin;
    if (pinStored) {
      log(`PIN found in Keychain: ${pin}`);
    }
    // If the user has just entered the PIN successfully, log them in.
    if (pinStatus === 'enter') {
      // Look up the user's email and password using the login credentials key.
      let loginCredentials = await Keychain.getInternetCredentials(appState.loginCredentialsStorageKey);
      // Example result:
      // {"username":"johnqfish@foo.com","password":"bigFish6","storage":"keychain","server":"LOGIN_dev_SolidiMobileApp_t3.solidi.co"}
      /* Issue:
      - The user may have previously logged out, in which case the email and password have been deleted from the Keychain.
      In this case:
      - Keychain.getInternetCredentials will return false.
      - We need to stop here and switch to Login page.
      */
      if (! loginCredentials) return appState.changeState('Login');
      let {username: email, password} = loginCredentials;
      let msg = `loginCredentials (email=${email}, password=${password}) loaded from Keychain under ${appState.loginCredentialsStorageKey})`;
      log(msg);
      // Use the email and password to load the API Key and Secret from the server.
      let {userAgent, domain} = appState;
      let apiClient = new SolidiRestAPIClientLibrary({userAgent, apiKey:'', apiSecret:'', domain});
      let apiRoute = 'login_mobile' + `/${email}`;
      let params = {password};
      let abortController = appState.createAbortController();
      let data = await apiClient.publicMethod({httpMethod: 'POST', apiRoute, params, abortController});
      if (data == 'DisplayedError') return;
      /* Issue:
      - The email and password may have changed (e.g. by changes made via the web application).
      In this case, we'll get a particular error. Need to catch it and switch to Login page.
      */
      if (data.error) {
        let msg = `Error in PIN._finishProcess: ${misc.jd(data)}`
        console.log(msg);
        appState.changeState('Login');
        return;
      }
      let keyNames = 'apiKey, apiSecret'.split(', ');
      if (! misc.hasExactKeys('data', data, keyNames, 'submitLoginRequest')) {
        let message = `Response from server does not have exactly these keyNames: ${keyNames}. Instead, it has: ${_.keys(data)}.`;
        this.state.switchToErrorState({message});
        return;
      }
      let {apiKey, apiSecret} = data;
      // Store these access values in the global state.
      _.assign(apiClient, {apiKey, apiSecret});
      appState.apiClient = apiClient;
      appState.user.isAuthenticated = true;
      _.assign(appState.user, {email, password});
      // Load user stuff.
      await appState.loadInitialStuffAboutUser();
    }
    // If we've entered / chosen a PIN, and the app was locked, set appLocked to false.
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
        pinCodeKeychainName = {appState.pinStorageKey}
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
    //borderWidth: 1, //testing
  },
  container: {
    backgroundColor: 'white',
    //borderWidth: 1, //testing
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
    //borderWidth: 1, //testing
  },
})


let stylesResetButton = StyleSheet.create({
  view: {
    marginTop: scaledHeight(0),
    height: '100%',
    alignSelf: 'flex-start',
    //borderWidth: 1, //testing
  },
});


export default PIN;

// React imports
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

// Other imports
import _ from 'lodash';
import Big from 'big.js';

// Internal imports
import AppStateContext from 'src/application/data';
import { mainPanelStates, colors } from 'src/constants';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import { Button, StandardButton, ImageButton, Spinner } from 'src/components/atomic';
import misc from 'src/util/misc';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('Register');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);


/* Notes

Guide:
https://github.com/react-native-webview/react-native-webview

*/




let Register = () => {

  let appState = useContext(AppStateContext);
  let [renderCount, triggerRender] = useState(0);
  let firstRender = misc.useFirstRender();
  let stateChangeID = appState.stateChangeID;

  let pageName = appState.pageName;
  let permittedPageNames = 'default'.split(' ');
  misc.confirmItemInArray('permittedPageNames', permittedPageNames, pageName, 'Register');


  // Settings
  let basicAuth = '';
  if (appState.appTier == 'dev') {
    // A dev Solidi instance is behind a basic authentication barrier.
    let username = appState.devBasicAuth.username;
    let password = appState.devBasicAuth.password;
    basicAuth = `${username}:${password}@`;
  }
  uriSolidiWebsiteRegister = `https://${basicAuth}${appState.domain}/register`;


  // Initial setup.
  useEffect( () => {
    //setup();
  }, []); // Pass empty array so that this only runs once on mount.


  let setup = async () => {
    try {
      //await appState.loadBalances();
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
      triggerRender(renderCount+1);
    } catch(err) {
      let msg = `Register.setup: Error = ${err}`;
      console.log(msg);
    }
  }


  return (
    <View style={styles.panelContainer}>
    <View style={styles.panelSubContainer}>

      <View style={[styles.heading, styles.heading1]}>
        <Text style={styles.headingText}>Register</Text>
      </View>

      <View style={styles.webviewSection}>

        <WebView
          source={{ uri: uriSolidiWebsiteRegister }}
          startInLoadingState={true}
          renderLoading={() =>
            <View style={styles.loadingView}>
              <Spinner/>
            </View>
          }
          onMessage={(event) => {
            let data = event.nativeEvent.data;
            log(`Have received event from embedded webview, containing data = '${data}'`);
            if (data == 'Successful login') {
              /* Explanation:
              - This event is emitted by the front-end website in the callback that executes after a successful login.
              - After a successful registration, the front-end will log in using the supplied details.
              - We pick up the event here, and change to the Login screen.
              */
              appState.changeState('Login');
            }
          }}
        />

      </View>

    </View>
    </View>
  )

}


let styles = StyleSheet.create({
  panelContainer: {
    //paddingHorizontal: scaledWidth(15),
    paddingHorizontal: scaledWidth(0),
    paddingVertical: scaledHeight(5),
    width: '100%',
    height: '100%',
  },
  panelSubContainer: {
    paddingTop: scaledHeight(10),
    //paddingHorizontal: scaledWidth(30),
    paddingHorizontal: scaledWidth(0),
  },

  heading: {
    alignItems: 'center',
  },
  heading1: {
    marginTop: scaledHeight(10),
    //marginBottom: scaledHeight(40),
    marginBottom: scaledHeight(10),
  },
  headingText: {
    fontSize: normaliseFont(20),
    fontWeight: 'bold',
  },
  bold: {
    fontWeight: 'bold',
  },
  buttonWrapper: {
    marginTop: scaledHeight(10),
    //borderWidth: 1, // testing
  },
  webviewSection: {
    //borderWidth: 1, // testing
    height: scaledHeight(550),
    width: '100%',
  },
  loadingView: {
    height: '100%',
  },
});


export default Register;

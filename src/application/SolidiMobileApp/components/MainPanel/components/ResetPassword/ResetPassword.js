// React imports
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Text, TextInput, StyleSheet, View, ScrollView } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

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
import { out } from 'react-native/Libraries/Animated/Easing';
let logger2 = logger.extend('ResetPassword');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);


/* Notes


*/




let ResetPassword = () => {

  let appState = useContext(AppStateContext);
  let [renderCount, triggerRender] = useState(0);
  let firstRender = misc.useFirstRender();
  let stateChangeID = appState.stateChangeID;

  let pageName = appState.pageName;
  let permittedPageNames = 'default'.split(' ');
  misc.confirmItemInArray('permittedPageNames', permittedPageNames, pageName, 'ResetPassword');

  let [errorMessage, setErrorMessage] = useState('');
  let [email, setEmail] = useState('');
  let [resultMessage, setResultMessage] = useState('');




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
      let msg = `ResetPassword.setup: Error = ${err}`;
      console.log(msg);
    }
  }


  return (
    <View style={styles.panelContainer}>
    <View style={styles.panelSubContainer}>

      <View style={[styles.heading, styles.heading1]}>
        <Text style={styles.headingText}>Reset Password</Text>
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

      <Text style={styles.descriptionText}>Your email address:</Text>

      <View style={styles.wideTextInputWrapper}>
        <TextInput
          style={styles.wideTextInput}
          onChangeText={setEmail}
          value={email}
          autoCapitalize={'none'}
          autoCorrect={false}
        />
      </View>

      <View style={styles.buttonWrapper}>
        <StandardButton title="Reset password"
          onPress={ async () => {
            if (_.isEmpty(email)) {
              setErrorMessage('Please enter your email address.');
            } else {
              setErrorMessage('');
              let output = await appState.resetPassword({email});
              if (_.has(output, 'result')) {
                let result = output.result;
                if (result == 'success') {
                  setResultMessage("An email containing a password reset link has been sent to your email address. After you have followed the link and reset your password on the main website, you'll be able to log in to this app.");
                }
              }
            }
          } }
        />
      </View>

      {! _.isEmpty(resultMessage) &&
        <View style={styles.resultWrapper}>
          <Text style={styles.resultText}>
            <Text>{resultMessage}</Text>
          </Text>
        </View>
      }

      </KeyboardAwareScrollView>

    </View>
    </View>
  )

}


let styles = StyleSheet.create({
  panelContainer: {
    paddingHorizontal: scaledWidth(15),
    paddingVertical: scaledHeight(5),
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
  },
  heading1: {
    marginTop: scaledHeight(10),
    marginBottom: scaledHeight(40),
  },
  headingText: {
    fontSize: normaliseFont(20),
    fontWeight: 'bold',
  },
  basicText: {
    fontSize: normaliseFont(14),
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
    fontSize: normaliseFont(14),
    fontWeight: 'bold',
  },
  wideTextInputWrapper: {
    paddingVertical: scaledHeight(30),
    width: '80%',
    flexDirection: "row",
    justifyContent: 'space-between',
    alignItems: 'center',
    //borderWidth: 1, // testing
  },
  wideTextInput: {
    fontSize: normaliseFont(16),
    height: scaledHeight(40),
    width: scaledWidth(360),
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: scaledWidth(10),
    marginRight: scaledWidth(20),
  },
  resultWrapper: {
    marginTop: scaledHeight(20),
  },
  resultText: {
    fontSize: normaliseFont(14),
    color: 'red',
  },
});


export default ResetPassword;

// React imports
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Image, Text, TextInput, StyleSheet, View, ScrollView } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

// Other imports
import _ from 'lodash';
import Big from 'big.js';

// Internal imports
import AppStateContext from 'src/application/data';
import { mainPanelStates, colors } from 'src/constants';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import { Button, StandardButton, FixedWidthButton, ImageButton, Spinner } from 'src/components/atomic';
import misc from 'src/util/misc';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('AccountUpdate');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);

// Shortcuts
let jd = JSON.stringify;


/* Notes


*/




let AccountUpdate = () => {

  let appState = useContext(AppStateContext);
  let [renderCount, triggerRender] = useState(0);
  let firstRender = misc.useFirstRender();
  let stateChangeID = appState.stateChangeID;

  let pageName = appState.pageName;
  let permittedPageNames = 'confirm_email confirm_mobile_phone submit_extra_information'.split(' ');
  misc.confirmItemInArray('permittedPageNames', permittedPageNames, pageName, 'AccountUpdate');

  let pageTitle = misc.snakeCaseToCapitalisedWords(pageName);

  // Basic
  let [errorMessage, setErrorMessage] = useState('');
  let [uploadMessage, setUploadMessage] = useState('');
  let [emailCode, setEmailCode] = useState();
  let [disableConfirmEmailButton, setDisableConfirmEmailButton] = useState(false);


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
      let msg = `AccountUpdate.setup: Error = ${err}`;
      console.log(msg);
    }
  }


  let confirmEmail = async () => {
    /*
    - If unsuccessful, we update the error display on this particular page, rather than moving to an error page.
    */
    setDisableConfirmEmailButton(true);
    setErrorMessage();
    if (_.isEmpty(emailCode)) {
      errorMessage = 'Email code is empty.';
      setErrorMessage(errorMessage);
      setDisableConfirmEmailButton(false);
      return;
    }
    let result;
    let email = appState.userData.email;
    email = 'johnqfish@foo.com'; // dev
    let apiRoute = 'confirm_email';
    apiRoute += `/${email}/${emailCode}`;
    try {
      log(`API request: Confirm user email: emailCode = ${emailCode}.`);
      setUploadMessage('Confirming...');
      // Send the request.
      let functionName = 'confirmEmail';
      let params = {};
      result = await appState.publicMethod({httpMethod: 'PUT', functionName, apiRoute, params});
      if (appState.stateChangeIDHasChanged(stateChangeID)) return; // needed ?
    } catch(err) {
      logger.error(err);
    }
    lj({result})
    if (_.has(result, 'error')) {
      let error = result.error;
      log(`Error returned from API request ${apiRoute}: ${jd(error)}`);
      if (_.isObject(error)) {
        if (_.isEmpty(error)) {
          error = 'Received an empty error object ({}) from the server.'
        } else {
          error = jd(error);
        }
      }
      let detailName = 'emailCode';
      let selector = `ValidationError: [${detailName}]: `;
      errorMessage = error;
      if (error.startsWith(selector)) {
        errorMessage = error.replace(selector, '');
      }
      setErrorMessage(errorMessage);
    } else {
      appState.changeState('AccountUpdate', 'confirm_mobile_phone');
    }
    setUploadMessage('');
    setDisableConfirmEmailButton(false);
  }


  return (
    <View style={styles.panelContainer}>
    <View style={styles.panelSubContainer}>

      <View style={[styles.heading, styles.heading1]}>
        <Text style={styles.headingText}>{pageTitle}</Text>
      </View>

      {!! errorMessage &&
        <View style={styles.errorWrapper}>
          <Text style={styles.errorMessageText}>{errorMessage}</Text>
        </View>
      }

      <KeyboardAwareScrollView showsVerticalScrollIndicator={true} contentContainerStyle={{ flexGrow: 1 }} >

        { pageName === 'confirm_email' &&
        
          <View>

            <Text style={styles.basicText}>We have sent an email to your address.</Text>
            <Text style={styles.basicText}>{'\n'}Please enter the 4-digit code contained in this email to verify your email address.</Text>

            <View style={styles.emailCodeBox}>
              <TextInput defaultValue={''}
                style={[styles.detailValueFullWidth, styles.editableTextInput]}
                onChangeText = {value => {
                  log(`Code: ${value}`);
                  setEmailCode(value);
                }}
                autoCompleteType='off'
                autoCapitalize='none'
                keyboardType='number-pad'
                placeholder='1234'
                placeholderTextColor='grey'
              />
            </View>

            <View style={styles.confirmEmailButtonWrapper}>
              <FixedWidthButton title="Confirm email"
                onPress={ confirmEmail }
                disabled={disableConfirmEmailButton}
              />
            </View>

          </View>

        }

        <View style={styles.uploadMessage}>
          <Text style={styles.uploadMessageText}>{uploadMessage}</Text>
        </View>

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
    paddingHorizontal: scaledWidth(30),
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
  mediumText: {
    fontSize: normaliseFont(16),
  },
  bold: {
    fontWeight: 'bold',
  },
  errorWrapper: {
    //marginTop: scaledHeight(20),
    marginBottom: scaledHeight(20),
  },
  errorMessageText: {
    fontSize: normaliseFont(14),
    color: 'red',
  },
  infoSection: {
    paddingTop: scaledHeight(20),
    alignItems: 'flex-start',
  },
  infoItem: {
    marginBottom: scaledHeight(5),
  },
  detailValueFullWidth: {
    paddingLeft: scaledWidth(10),
    paddingVertical: scaledHeight(10),
    minWidth: '99%',
  },
  editableTextInput: {
    borderWidth: 1,
    borderRadius: 16,
    borderColor: colors.greyedOutIcon,
    fontSize: normaliseFont(14),
  },
  emailCodeBox: {
    marginTop: scaledHeight(30),
  },
  confirmEmailButtonWrapper: {
    marginVertical: scaledHeight(30),
  },
});


export default AccountUpdate;

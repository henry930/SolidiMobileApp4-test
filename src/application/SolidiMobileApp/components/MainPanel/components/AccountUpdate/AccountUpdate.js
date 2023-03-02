// React imports
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Linking, Image, Text, TextInput, StyleSheet, View, ScrollView } from 'react-native';
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
  let permittedPageNames = 'address extra_information'.split(' ');
  misc.confirmItemInArray('permittedPageNames', permittedPageNames, pageName, 'AccountUpdate');

  let pageTitle = misc.snakeCaseToCapitalisedWords(pageName);

  // Basic
  let [errorMessage, setErrorMessage] = useState('');
  let [uploadMessage, setUploadMessage] = useState('');

  // Input state
  let [postcode, setPostcode] = useState('');
  let [address, setAddress] = useState({
    address_1: '',
    address_2: '',
    address_3: '',
    address_4: '',
  });
  let [disableSearchPostcodeButton, setDisableSearchPostcodeButton] = useState(false);
  let [disableConfirmAddressButton, setDisableConfirmAddressButton] = useState(false);

  // foundAddress dropdown
  let [foundAddresses, setFoundAddresses] = useState([]);
  let initialFoundAddress = '[none]';
  let [foundAddress, setFoundAddress] = useState(initialFoundAddress);
  let generateFoundAddressList = () => {
    let foundAddressList2 = foundAddresses.map(x => ({label: x, value: x}) );
    return foundAddressList2;
  }
  let [foundAddressList, setFoundAddressList] = useState(generateFoundAddressList());
  let [openFoundAddress, setOpenFoundAddress] = useState(false);




  // Initial setup.
  useEffect( () => {
    setup();
  }, []); // Pass empty array so that this only runs once on mount.


  let setup = async () => {
    try {
      await appState.generalSetup();
      // When this page is loaded, we request a mobile code to be sent via text, but only the first time (not on subsequent renders).
      if (pageName === 'confirm_mobile_phone' && ! mobileCodeRequested) {
        await requestMobileCode();
      }
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
      setMobileCodeRequested(true);
      triggerRender(renderCount+1);
    } catch(err) {
      let msg = `AccountUpdate.setup: Error = ${err}`;
      console.log(msg);
    }
  }


  let searchPostcode = async () => {
    let email = appState.userData.email;
    let apiRoute = 'search_postcode';
    apiRoute += `/postcode/${postcode}`;
    try {
      log(`API request: Request new mobile code to be sent to user via text.`);
      // Send the request.
      let functionName = 'searchPostcode';
      let params = {};
      result = await appState.publicMethod({httpMethod: 'GET', functionName, apiRoute, params});
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
    } catch(err) {
      logger.error(err);
    }
    //lj({result})
    if (_.has(result, 'error')) {
      let error = result.error;
      let errorMessage = jd(error);
      log(`Error returned from API request ${apiRoute}: ${errorMessage}`);
      setErrorMessage(errorMessage);
    }
  }


  let confirmAddress = async () => {

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


      { pageName === 'address' &&
        
        <View>

          <Text style={styles.basicText}>Please confirm your address.{'\n'}</Text>

          <View>

            <View style={styles.addressLine}>
              <TextInput
                style={[styles.detailValue, styles.editableTextInput]}
                onChangeText = {value => {
                  log(`Postcode: ${value}`);
                  setPostcode(value);
                }}
                autoComplete={'off'}
                autoCompleteType='off'
                autoCapitalize={'none'}
                autoCorrect={false}
                placeholder={'Postcode'}
              />
            </View>

            <View style={styles.searchPostcodeButtonWrapper}>
              <StandardButton title="Search Postcode"
                onPress={ searchPostcode }
                disabled={disableSearchPostcodeButton}
              />
            </View>

            <View style={[
              styles.detailValueFullWidth,
              {zIndex:2},
              {paddingTop: 5, paddingBottom: 10, paddingLeft: 0}
            ]}>
              <DropDownPicker
                listMode="SCROLLVIEW"
                scrollViewProps={{nestedScrollEnabled: true}}
                placeholder={foundAddress}
                open={openFoundAddress}
                value={foundAddress}
                items={foundAddressList}
                setOpen={setOpenFoundAddress}
                setValue={setFoundAddress}
                style={[styles.detailDropdown]}
                textStyle = {styles.detailDropdownText}
                onChangeValue = { (foundAddress) => {
                  // fill out the address fields with the selected foundAddress.
                  /*
                  setAddress({
                    address_1: ,
                  })
                  */
                }}
              />
            </View>

            <View style={styles.addressLine}>
              <TextInput
                style={[styles.detailValueFullWidth, styles.editableTextInput]}
                onChangeText = {value => {
                  log(`Address line 1: ${value}`);
                  setAddress({...address, address_1: value});
                }}
                autoComplete={'off'}
                autoCompleteType='off'
                autoCapitalize={'none'}
                autoCorrect={false}
                placeholder={'Address line 1'}
              />
            </View>

            <View style={styles.addressLine}>
              <TextInput
                style={[styles.detailValueFullWidth, styles.editableTextInput]}
                onChangeText = {value => {
                  log(`Address line 2: ${value}`);
                  setAddress({...address, address_2: value});
                }}
                autoComplete={'off'}
                autoCompleteType='off'
                autoCapitalize={'none'}
                autoCorrect={false}
                placeholder={'Address line 2'}
              />
            </View>

            <View style={styles.addressLine}>
              <TextInput
                style={[styles.detailValueFullWidth, styles.editableTextInput]}
                onChangeText = {value => {
                  log(`Address line 3: ${value}`);
                  setAddress({...address, address_3: value});
                }}
                autoComplete={'off'}
                autoCompleteType='off'
                autoCapitalize={'none'}
                autoCorrect={false}
                placeholder={'Address line 3'}
              />
            </View>

            <View style={styles.addressLine}>
              <TextInput
                style={[styles.detailValueFullWidth, styles.editableTextInput]}
                onChangeText = {value => {
                  log(`Address line 4: ${value}`);
                  setAddress({...address, address_3: value});
                }}
                autoComplete={'off'}
                autoCompleteType='off'
                autoCapitalize={'none'}
                autoCorrect={false}
                placeholder={'Address line 4'}
              />
            </View>

          </View>

          <View style={styles.confirmButtonWrapper}>
            <FixedWidthButton title="Confirm address"
              onPress={ confirmAddress }
              disabled={disableConfirmAddressButton}
            />
          </View>

        </View>

      }


        <View style={styles.uploadMessage}>
          <Text style={styles.uploadMessageText}>{uploadMessage}</Text>
        </View>

        <Text style={styles.basicText}>If there is a problem, please contact the support team.</Text>

        <View style={styles.buttonWrapper}>
          <FixedWidthButton title="Contact Support"
            onPress={ () => { Linking.openURL(appState.supportURL) } }
            styles={styleContactButton}
          />
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
  detailValue: {
    paddingLeft: scaledWidth(10),
    paddingVertical: scaledHeight(10),
    width: '50%',
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
  buttonWrapper: {
    marginVertical: scaledHeight(20),
  },
  addressLine: {
    marginVertical: scaledHeight(5),
  },
  searchPostcodeButtonWrapper: {
    marginVertical: scaledHeight(10),
  },
  detailDropdown: {
    borderWidth: 1,
    maxWidth: '100%',
    height: scaledHeight(40),
  },
  detailDropdownText: {
    fontSize: normaliseFont(14),
  },
  confirmButtonWrapper: {
    marginTop: scaledHeight(10),
  },
});


let styleContactButton = StyleSheet.create({
  view: {
    width: '70%',
  },
});


export default AccountUpdate;

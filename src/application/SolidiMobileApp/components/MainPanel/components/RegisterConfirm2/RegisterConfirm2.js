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
let logger2 = logger.extend('RegisterConfirm2');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);

// Shortcuts
let jd = JSON.stringify;


/* Notes

In this Register step, we handle additional registration information after the user account has been created and the user has logged in.

*/




let RegisterConfirm2 = () => {

  let appState = useContext(AppStateContext);
  let [renderCount, triggerRender] = useState(0);
  let firstRender = misc.useFirstRender();
  let stateChangeID = appState.stateChangeID;

  let pageName = appState.pageName;
  let permittedPageNames = 'address'.split(' ');
  misc.confirmItemInArray('permittedPageNames', permittedPageNames, pageName, 'RegisterConfirm2');

  let pageTitle = misc.snakeCaseToCapitalisedWords(pageName);

  // Basic
  let [errorMessage, setErrorMessage] = useState('');

  // Input state
  let [postcode, setPostcode] = useState('');
  let [address, setAddress] = useState({
    address_1: null,
    address_2: null,
    address_3: null,
    address_4: null,
  });
  let [disableSearchPostcodeButton, setDisableSearchPostcodeButton] = useState(false);
  let [disableConfirmAddressButton, setDisableConfirmAddressButton] = useState(false);

  // foundAddress dropdown
  let initialSelectedAddress = '[no addresses listed]';
  let [selectedAddress, setSelectedAddress] = useState(initialSelectedAddress);
  let [foundAddresses, setFoundAddresses] = useState([]);
  let generateSelectAddressList = ({addresses}) => {
    let selectAddressList = addresses.map(x => (
      {
        label: x.solidiFormatShort,
        value: x.solidiFormatShort,
      }
    ));
    //lj({selectAddressList})
    return selectAddressList;
  }
  let [selectAddressList, setSelectAddressList] = useState([]);
  let [openSelectAddress, setOpenSelectAddress] = useState(false);




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
      let msg = `RegisterConfirm2.setup: Error = ${err}`;
      console.log(msg);
    }
  }


  let searchPostcode = async () => {
    setDisableSearchPostcodeButton(true);
    setErrorMessage();
    if (_.isEmpty(postcode)) {
      errorMessage = 'Postcode is empty.';
      setErrorMessage(errorMessage);
      setDisableSearchPostcodeButton(false);
      return;
    }
    let result;
    let apiRoute = 'search_postcode';
    apiRoute += `/${postcode}`;
    try {
      // Send the request.
      let functionName = 'searchPostcode';
      result = await appState.privateMethod({functionName, apiRoute});
    } catch(err) {
      logger.error(err);
    }
    //lj({result})
    if (result === 'DisplayedError') return;
    if (_.has(result, 'error')) {
      let error = result.error;
      let errorMessage = jd(error);
      log(`Error returned from API request ${apiRoute}: ${errorMessage}`);
      let detailName = 'postcode';
      let selector = `ValidationError: [${detailName}]: `;
      errorMessage = error;
      if (error.startsWith(selector)) {
        errorMessage = error.replace(selector, '');
      }
      setErrorMessage(errorMessage);
      setDisableSearchPostcodeButton(false);
      return;
    } else {
      setDisableSearchPostcodeButton(false);
    }
    // Take the results and use them to populate the dropdown.
    let addresses = result.addresses;
    if (addresses.length === 0) {
      var msg = `Sorry, we can't find any addresses for this postcode. Please enter your address manually.`;
      setErrorMessage(msg);
      return;
    }
    /* Example output:
{
  "addresses": [
    {
      "formatted_address": [
        "1830 Somwhere Rd",
        "",
        "",
        "Over, The Rainbow",
        "Cambridgeshire"
      ],
      "solidiFormat": [
        "1830 Somwhere Rd",
        "Over, The Rainbow",
        "Cambridgeshire"
      ],
      "solidiFormatShort": "1830 Somwhere Rd, Over, The Rainbow, Cambridgeshire"
    }
  ]
}
    */
    /* Notes:
    - We'll use solidiFormatShort as the ID of the address.
    - We'll use solidiFormat as the separate lines of the address that we use to fill out the addressLine Views.
    */
    setFoundAddresses(addresses);
    let addressList = generateSelectAddressList({addresses});
    //lj({addressList})
    setSelectAddressList(addressList);
    let plural = addresses.length > 1 ? 'es': '';
    var msg = `${addresses.length} address${plural} found. Click to select.`;
    setSelectedAddress(msg);
  }


  let confirmAddress = async () => {
    setDisableConfirmAddressButton(true);
    setErrorMessage();
    let result;
    let apiRoute = 'provide_address';
    let address2 = _.clone(address);
    address2.postcode = postcode;
    //lj({address2})
    try {
      let functionName = 'confirmAddress';
      let params = {address: address2};
      result = await appState.privateMethod({functionName, apiRoute, params});
    } catch(err) {
      logger.error(err);
    }
    //lj({result})
    if (result === 'DisplayedError') return;
    if (_.has(result, 'error')) {
      let error = result.error;
      let errorMessage = jd(error);
      log(`Error returned from API request ${apiRoute}: ${errorMessage}`);
      let detailName = 'address';
      let selector = `ValidationError: [${detailName}]: `;
      errorMessage = error;
      if (error.startsWith(selector)) {
        errorMessage = error.replace(selector, '');
      }
      setErrorMessage(errorMessage);
      setDisableConfirmAddressButton(false);
    } else {
      // Change state.
      await appState.moveToNextState();
    }
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
              <StandardButton title="Search postcode"
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
                placeholder={selectedAddress}
                open={openSelectAddress}
                value={selectedAddress}
                items={selectAddressList}
                setOpen={setOpenSelectAddress}
                setValue={setSelectedAddress}
                style={[styles.detailDropdown]}
                textStyle = {styles.detailDropdownText}
                onChangeValue = { (value) => {
                  log(`Selected address: ${value}`);
                  if (value === '[no addresses listed]') return;
                  if (value.includes('Click to select.')) return;
                  // User has selected an address from the list.
                  // Populate the address lines with this address.
                  //lj({foundAddresses})
                  let foundAddress = foundAddresses.find(a => {
                    return a.solidiFormatShort === value;
                  });
                  //lj({foundAddress})
                  let addressLines = foundAddress.solidiFormat;
                  //lj({addressLines})
                  setAddress({
                    address_1: _.isUndefined(addressLines[0]) ? null : addressLines[0],
                    address_2: _.isUndefined(addressLines[1]) ? null : addressLines[1],
                    address_3: _.isUndefined(addressLines[2]) ? null : addressLines[2],
                    address_4: _.isUndefined(addressLines[3]) ? null : addressLines[3],
                  })
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
                value={address.address_1}
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
                value={address.address_2}
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
                value={address.address_3}
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
                value={address.address_4}
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
    marginBottom: scaledHeight(10),
  },
});


let styleContactButton = StyleSheet.create({
  view: {
    width: '70%',
  },
});


export default RegisterConfirm2;

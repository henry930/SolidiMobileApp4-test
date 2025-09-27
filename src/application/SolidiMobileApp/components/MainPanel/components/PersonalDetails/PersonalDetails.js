// React imports
import React, { useContext, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

// Material Design imports
import {
  Text,
  TextInput,
  Card,
  Button,
  useTheme,
  HelperText,
  Menu,
  TouchableRipple,
  Divider,
  SegmentedButtons,
  Surface,
} from 'react-native-paper';

// Other imports
import _ from 'lodash';
import Big from 'big.js';

// Internal imports
import AppStateContext from 'src/application/data';
import { colors, sharedColors, sharedStyles } from 'src/constants';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import { Title } from 'src/components/shared';
import misc from 'src/util/misc';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('PersonalDetails');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);
let jd = JSON.stringify;


/* Notes

Need to use zIndex values carefully to ensure that the opened dropdown appears above the rest of the data.

The address is handled separately from the normal user data items. It's treated as a postcode, and as a group of address lines. The address lines and the postcode are bundled together and pushed to the provide_address endpoint instead of the update_user endpoint. After pushing, the appState user_data is updated with the new address lines and postcode.

Arguably, we should handle updating the address by switching to the RegisterConfirm2 page. However, this might lead to maintenance problems later.

Future: Handle country as part of the address.

*/




let PersonalDetails = () => {

  let appState = useContext(AppStateContext);
  let [renderCount, triggerRender] = useState(0);
  let firstRender = misc.useFirstRender();
  let stateChangeID = appState.stateChangeID;

  let pageName = appState.pageName;
  let permittedPageNames = 'default'.split(' ');
  misc.confirmItemInArray('permittedPageNames', permittedPageNames, pageName, 'PersonalDetails');

  // Helper function to provide dummy data when real data is not available
  const getDummyUserInfo = (key) => {
    const dummyData = {
      // Basic personal information
      title: 'Mr',
      firstName: 'John',
      middleNames: 'William',
      lastName: 'Doe',
      gender: 'Male',
      dateOfBirth: '01/01/1990',
      
      // Location and citizenship
      citizenship: 'GB',
      country: 'GB',
      
      // Contact information
      email: 'john.doe@example.com',
      mobile: '+44 7700 900123',
      landline: '+44 20 7946 0958',
      
      // Address information
      postcode: 'SW1A 1AA',
      address_1: '10 Downing Street',
      address_2: 'Westminster',
      address_3: 'London',
      address_4: 'Greater London',
      
      // System fields
      uuid: 'dummy-uuid-12345-67890',
      
      // Financial limits (in case they're displayed)
      btcLimit: '1000.00000000',
      bankLimit: '1000.00',
      cryptoLimit: '1000.00000000',
      monthBtcLimit: '5000.00000000',
      monthBankLimit: '5000.00',
      monthCryptoLimit: '5000.00000000',
      freeWithdraw: '5',
    };
    
    // Get the value from appState, if not available use dummy data, if not available use empty string
    const realValue = appState.getUserInfo(key);
    if (realValue && realValue !== '[loading]' && realValue !== null && realValue !== undefined) {
      return realValue;
    }
    return dummyData[key] || '';
  };

  // Misc
  let [errorDisplay, setErrorDisplay] = useState({});

  // Section toggle state
  let [activeSection, setActiveSection] = useState('basic');

  // Title dropdown
  let [title, setTitle] = useState(getDummyUserInfo('title'));
  let generateTitleOptionsList = () => {
    let titleOptions = appState.getPersonalDetailOptions('title');
    return titleOptions.map(x => ({label: x, value: x}) );
  }
  let [titleOptionsList, setTitleOptionsList] = useState(generateTitleOptionsList());
  let [titleMenuVisible, setTitleMenuVisible] = useState(false);

  // Gender dropdown
  let [gender, setGender] = useState(getDummyUserInfo('gender'));
  let generateGenderOptionsList = () => {
    let genderOptions = appState.getPersonalDetailOptions('gender');
    return genderOptions.map(x => ({label: x, value: x}) );
  }
  let [genderOptionsList, setGenderOptionsList] = useState(generateGenderOptionsList());
  let [genderMenuVisible, setGenderMenuVisible] = useState(false);

  // Citizenship dropdown
  let [citizenship, setCitizenship] = useState(getDummyUserInfo('citizenship'));
  let generateCitizenshipOptionsList = () => {
    let countries = appState.getCountries();
    // Add error handling to ensure countries is an array
    if (!Array.isArray(countries)) {
      return [{label: 'United Kingdom', value: 'GB'}]; // Default fallback
    }
    return countries.map(x => { return {label: x.name, value: x.code} });
  }
  let [citizenshipOptionsList, setCitizenshipOptionsList] = useState(generateCitizenshipOptionsList());
  let [citizenshipMenuVisible, setCitizenshipMenuVisible] = useState(false);

  // Address details with dummy data
  let [postcode, setPostcode] = useState('SW1A 1AA');
  let [address, setAddress] = useState({
    address_1: '10 Downing Street',
    address_2: 'Westminster',
    address_3: 'London',
    address_4: 'Greater London',
  });
  let [disableSearchPostcodeButton, setDisableSearchPostcodeButton] = useState(false);
  let [disableSaveAddressButton, setDisableSaveAddressButton] = useState(false);

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

  // Country dropdown
  let [country, setCountry] = useState(getDummyUserInfo('country'));
  let generateCountryOptionsList = () => {
    let countries = appState.getCountries();
    // Add error handling to ensure countries is an array
    if (!Array.isArray(countries)) {
      return [{label: 'United Kingdom', value: 'GB'}]; // Default fallback
    }
    return countries.map(x => { return {label: x.name, value: x.code} });
  }
  let [countryOptionsList, setCountryOptionsList] = useState(generateCountryOptionsList());
  let [countryMenuVisible, setCountryMenuVisible] = useState(false);

  // Found addresses dropdown
  let [selectedAddressMenuVisible, setSelectedAddressMenuVisible] = useState(false);




  // Initial setup.
  useEffect( () => {
    setup();
  }, []); // Pass empty array so that this only runs once on mount.


  let setup = async () => {
    try {
      await appState.generalSetup();
      await appState.loadPersonalDetailOptions();
      await appState.loadInitialStuffAboutUser();
      await appState.loadCountries();
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
      setTitle(getDummyUserInfo('title'));
      setTitleOptionsList(generateTitleOptionsList());
      setGender(getDummyUserInfo('gender'));
      setGenderOptionsList(generateGenderOptionsList());
      setCitizenship(getDummyUserInfo('citizenship'));
      setCitizenshipOptionsList(generateCitizenshipOptionsList());
      setPostcode(getDummyUserInfo('postcode'));
      setAddress({
        address_1: getDummyUserInfo('address_1'),
        address_2: getDummyUserInfo('address_2'),
        address_3: getDummyUserInfo('address_3'),
        address_4: getDummyUserInfo('address_4'),
      });
      setCountry(getDummyUserInfo('country'));
      setCountryOptionsList(generateCountryOptionsList());
      triggerRender(renderCount+1);
    } catch(err) {
      let msg = `PersonalDetails.setup: Error = ${err}`;
      console.log(msg);
    }
  }


  let updateUserData = async ({detail, value}) => {
    /*
    Every time the user selects a new value:
    - We send an update to the server.
    - If the update is successful, we update the appState with the new value.
    - If unsuccessful, we update the error display on this particular page, rather than moving to an error page. That's why this function is here instead of in AppState.js.
    */
    // Only update if the value has definitely changed.
    if (!value || value === '[loading]') return;
    let prevValue = appState.getUserInfo(detail);
    if (value === prevValue) {
      // Reset any existing error.
      setErrorDisplay({...errorDisplay, [detail]: null});
      return;
    }
    // Proceed with update.
    let functionName = 'updateUserData';
    let info = appState.user.info;
    // Check if we recognise the detail.
    let userDataDetails = `
title firstName middleNames lastName
dateOfBirth gender citizenship
email mobile landline
country
`;
    userDataDetails = misc.splitStringIntoArray({s: userDataDetails});
    if (! userDataDetails.includes(detail)) {
      console.error(`updateUserData: Unrecognised detail: ${detail}`);
      return;
    }
    // Send the update.
    log(`API request: Update user: Change ${detail} from '${prevValue}' to '${value}'.`);
    let apiRoute = 'user/update';
    let params = { userData: {[detail]: value} }
    let result = await appState.privateMethod({ functionName, apiRoute, params });
    if (appState.stateChangeIDHasChanged(stateChangeID)) return;
    // Future: The error should be an object with 'code' and 'message' properties.
    if (result === 'DisplayedError') return;
    if (_.has(result, 'error')) {
      let error = result.error;
      log(`Error returned from API request (Update user: Change ${detail} from '${prevValue}' to '${value}'): ${JSON.stringify(error)}`);
      if (_.isObject(error)) {
        if (_.isEmpty(error)) {
          error = 'Received an empty error object ({}) from the server.'
        } else {
          error = JSON.stringify(error);
        }
      }
      // Display the error message above the specific setting.
      let selector = `ValidationError: [${detail}]: `;
      errorMessage = error;
      if (error.startsWith(selector)) {
        errorMessage = error.replace(selector, '');
      }
      setErrorDisplay({...errorDisplay, [detail]: errorMessage});
    } else { // No errors.
      log(`Successful API request (Update user: Change ${detail} from '${prevValue}' to '${value}')`);
      // Update the appState.
      appState.setUserInfo({detail, value});
      // Reset any existing error.
      setErrorDisplay({...errorDisplay, [detail]: null});
    }
  }


  let renderError = (detail) => {
    // We render an error above a detail, if an error has been set for it.
    // Example detail: 'address_1'
    if (_.isNil(errorDisplay[detail])) return;
    return (
      <View style={styles.errorDisplay}>
        <Text style={styles.errorDisplayText}>Error: {detail}: {errorDisplay[detail]}</Text>
      </View>
    )
  }


  let searchPostcode = async () => {
    setDisableSearchPostcodeButton(true);
    setErrorDisplay({...errorDisplay, 'address_general': null});
    if (_.isEmpty(postcode)) {
      errorMessage = 'Postcode is empty.';
      setErrorDisplay({...errorDisplay, 'address_general': errorMessage});
      setDisableSearchPostcodeButton(false);
      return;
    }
    // URL can't have spaces. Easiest to remove them rather than encode them.
    let postcodeClean = postcode.replace(/ /g, '');
    let result;
    let apiRoute = 'search_postcode';
    apiRoute += `/${postcodeClean}`;
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
      setErrorDisplay({...errorDisplay, 'address_general': errorMessage});
      setDisableSearchPostcodeButton(false);
      return;
    } else {
      setDisableSearchPostcodeButton(false);
    }
    // Take the results and use them to populate the dropdown.
    let addresses = result.addresses;
    if (addresses.length === 0) {
      var msg = `Sorry, we can't find any addresses for this postcode. Please enter your address manually.`;
      setErrorDisplay({...errorDisplay, 'address_general': msg});
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


  let saveAddress = async () => {
    setDisableSaveAddressButton(true);
    setErrorDisplay({...errorDisplay, 'address_general': null});
    let result;
    let apiRoute = 'provide_address';
    let address2 = _.clone(address);
    address2.postcode = postcode;
    lj({address2})
    try {
      let functionName = 'saveAddress';
      let params = {address: address2};
      result = await appState.privateMethod({functionName, apiRoute, params});
    } catch(err) {
      logger.error(err);
    }
    lj({result})
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
      setErrorDisplay({...errorDisplay, 'address_general': null});
    } else {
      // No errors.
      // Update the appState.
      appState.setUserInfo({
        address_1: address.address_1,
        address_2: address.address_2,
        address_3: address.address_3,
        address_4: address.address_4,
        postcode: postcode,
      });
    }
    setDisableSaveAddressButton(false);
  }


  const materialTheme = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: materialTheme.colors.background }}>
      
      <Title>
        Personal Details
      </Title>

      <KeyboardAwareScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16 }}
        keyboardShouldPersistTaps='handled'
        enableResetScrollToCoords={false}
      >
        {/* Section Toggle Buttons */}
        <Surface style={{ 
          marginBottom: 24, 
          borderRadius: 12,
          elevation: 1 
        }}>
          <SegmentedButtons
            value={activeSection}
            onValueChange={setActiveSection}
            buttons={[
              {
                value: 'basic',
                label: 'Basic Info',
                icon: 'account',
              },
              {
                value: 'contact',
                label: 'Contact',
                icon: 'phone',
              },
              {
                value: 'address',
                label: 'Address',
                icon: 'home',
              },
            ]}
            style={{ margin: 4 }}
          />
        </Surface>

        {/* Basic Details Section */}
        {activeSection === 'basic' && (
          <Card style={{ marginBottom: 16, elevation: 2 }}>
            <Card.Content style={{ padding: 20 }}>
              <Text variant="titleMedium" style={{ 
                marginBottom: 16, 
                fontWeight: '600',
                color: materialTheme.colors.primary 
              }}>
                Basic Details
              </Text>

            {/* Title Dropdown */}
            <View style={{ marginBottom: 16 }}>
              <Menu
                visible={titleMenuVisible}
                onDismiss={() => setTitleMenuVisible(false)}
                anchor={
                  <TouchableRipple onPress={() => setTitleMenuVisible(true)}>
                    <TextInput
                      label="Title"
                      mode="outlined"
                      value={title}
                      editable={false}
                      right={<TextInput.Icon icon="chevron-down" />}
                      style={{ backgroundColor: 'transparent' }}
                    />
                  </TouchableRipple>
                }>
                {titleOptionsList.map((option, index) => (
                  <Menu.Item
                    key={index}
                    onPress={() => {
                      setTitle(option.value);
                      updateUserData({detail: 'title', value: option.value});
                      setTitleMenuVisible(false);
                    }}
                    title={option.label}
                  />
                ))}
              </Menu>
            </View>

            {renderError('firstName')}

            {/* First Name */}
            <TextInput
              label="First Name"
              mode="outlined"
              defaultValue={getDummyUserInfo('firstName')}
              onEndEditing={event => {
                let value = event.nativeEvent.text;
                updateUserData({detail:'firstName', value});
              }}
              autoComplete={'off'}
              autoCapitalize={'words'}
              autoCorrect={false}
              style={{ marginBottom: 16 }}
            />

            {renderError('middleNames')}

            {/* Middle Names */}
            <TextInput
              label="Middle Names"
              mode="outlined"
              defaultValue={getDummyUserInfo('middleNames')}
              onEndEditing={event => {
                let value = event.nativeEvent.text;
                updateUserData({detail:'middleNames', value});
              }}
              autoComplete={'off'}
              autoCapitalize={'words'}
              autoCorrect={false}
              style={{ marginBottom: 16 }}
            />

            {renderError('lastName')}

            {/* Last Name */}
            <TextInput
              label="Last Name"
              mode="outlined"
              defaultValue={getDummyUserInfo('lastName')}
              onEndEditing={event => {
                let value = event.nativeEvent.text;
                updateUserData({detail:'lastName', value});
              }}
              autoComplete={'off'}
              autoCapitalize={'words'}
              autoCorrect={false}
              style={{ marginBottom: 16 }}
            />

            {/* Gender Dropdown */}
            <View style={{ marginBottom: 16 }}>
              <Menu
                visible={genderMenuVisible}
                onDismiss={() => setGenderMenuVisible(false)}
                anchor={
                  <TouchableRipple onPress={() => setGenderMenuVisible(true)}>
                    <TextInput
                      label="Gender"
                      mode="outlined"
                      value={gender}
                      editable={false}
                      right={<TextInput.Icon icon="chevron-down" />}
                      style={{ backgroundColor: 'transparent' }}
                    />
                  </TouchableRipple>
                }>
                {genderOptionsList.map((option, index) => (
                  <Menu.Item
                    key={index}
                    onPress={() => {
                      setGender(option.value);
                      updateUserData({detail: 'gender', value: option.value});
                      setGenderMenuVisible(false);
                    }}
                    title={option.label}
                  />
                ))}
              </Menu>
            </View>

            {renderError('dateOfBirth')}

            {/* Date of Birth */}
            <TextInput
              label="Date of Birth"
              mode="outlined"
              defaultValue={getDummyUserInfo('dateOfBirth')}
              onEndEditing={event => {
                let value = event.nativeEvent.text;
                updateUserData({detail:'dateOfBirth', value});
              }}
              keyboardType='default'
              placeholder="DD/MM/YYYY"
              style={{ marginBottom: 16 }}
            />

            {/* Citizenship Dropdown */}
            <View style={{ marginBottom: 16 }}>
              <Menu
                visible={citizenshipMenuVisible}
                onDismiss={() => setCitizenshipMenuVisible(false)}
                anchor={
                  <TouchableRipple onPress={() => setCitizenshipMenuVisible(true)}>
                    <TextInput
                      label="Country of Citizenship"
                      mode="outlined"
                      value={citizenshipOptionsList.find(c => c.value === citizenship)?.label || citizenship}
                      editable={false}
                      right={<TextInput.Icon icon="chevron-down" />}
                      style={{ backgroundColor: 'transparent' }}
                    />
                  </TouchableRipple>
                }>
                {citizenshipOptionsList.map((option, index) => (
                  <Menu.Item
                    key={index}
                    onPress={() => {
                      setCitizenship(option.value);
                      updateUserData({detail: 'citizenship', value: option.value});
                      setCitizenshipMenuVisible(false);
                    }}
                    title={option.label}
                  />
                ))}
              </Menu>
            </View>
            
          </Card.Content>
        </Card>
        )}

        {/* Contact Details Section */}
        {activeSection === 'contact' && (
          <Card style={{ marginBottom: 16, elevation: 2 }}>
          <Card.Content style={{ padding: 20 }}>
            <Text variant="titleMedium" style={{ 
              marginBottom: 16, 
              fontWeight: '600',
              color: materialTheme.colors.primary 
            }}>
              Contact Details
            </Text>

            {renderError('mobile')}

            {/* Mobile - using Material Design TextInput */}
            <TextInput
              label="Mobile Number"
              mode="outlined"
              defaultValue={getDummyUserInfo('mobile')}
              onEndEditing={event => {
                let value = event.nativeEvent.text;
                updateUserData({detail:'mobile', value});
              }}
              autoCapitalize='none'
              keyboardType='phone-pad'
              style={{ marginBottom: 16 }}
            />

            {renderError('landline')}

            {/* Landline - using Material Design TextInput */}
            <TextInput
              label="Landline Number"
              mode="outlined"
              defaultValue={getDummyUserInfo('landline')}
              onEndEditing={event => {
                let value = event.nativeEvent.text;
                updateUserData({detail:'landline', value});
              }}
              autoCapitalize='none'
              keyboardType='phone-pad'
              style={{ marginBottom: 16 }}
            />

            {/* Email - Display only with note */}
            <TextInput
              label="Email Address"
              mode="outlined"
              value={getDummyUserInfo('email')}
              editable={false}
              style={{ marginBottom: 8 }}
            />
            <Text variant="bodySmall" style={{ 
              color: materialTheme.colors.onSurfaceVariant, 
              marginBottom: 16,
              fontStyle: 'italic' 
            }}>
              Email cannot be changed as it's used for login
            </Text>
            
          </Card.Content>
        </Card>
        )}

        {/* Address Details Section */}
        {activeSection === 'address' && (
          <Card style={{ marginBottom: 16, elevation: 2 }}>
          <Card.Content style={{ padding: 20 }}>
            <Text variant="titleMedium" style={{ 
              marginBottom: 16, 
              fontWeight: '600',
              color: materialTheme.colors.primary 
            }}>
              Address Details
            </Text>

            {renderError('address_general')}

            {/* Postcode Field */}
            <TextInput
              label="Postcode"
              mode="outlined"
              onChangeText={value => {
                log(`Postcode: ${value}`);
                setPostcode(value);
              }}
              autoCapitalize={'none'}
              autoCorrect={false}
              value={postcode}
              style={{ marginBottom: 16 }}
            />

        <Button 
          mode="outlined" 
          onPress={searchPostcode}
          disabled={disableSearchPostcodeButton}
          style={{ marginBottom: 16, alignSelf: 'flex-end' }}
        >
          Search Postcode
        </Button>

            {/* Address Selection Dropdown */}
            {selectAddressList.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <Menu
                  visible={selectedAddressMenuVisible}
                  onDismiss={() => setSelectedAddressMenuVisible(false)}
                  anchor={
                    <TouchableRipple onPress={() => setSelectedAddressMenuVisible(true)}>
                      <TextInput
                        label="Select Address"
                        mode="outlined"
                        value={selectedAddress}
                        editable={false}
                        right={<TextInput.Icon icon="chevron-down" />}
                        style={{ backgroundColor: 'transparent' }}
                      />
                    </TouchableRipple>
                  }>
                  {selectAddressList.map((option, index) => (
                    <Menu.Item
                      key={index}
                      onPress={() => {
                        log(`Selected address: ${option.value}`);
                        setSelectedAddress(option.value);
                        if (option.value === '[no addresses listed]') return;
                        if (option.value.includes('Click to select.')) return;
                        // User has selected an address from the list.
                        let foundAddress = foundAddresses.find(a => {
                          return a.solidiFormatShort === option.value;
                        });
                        if (_.has(foundAddress, 'solidiFormat')) {
                          let addressLines = foundAddress.solidiFormat;
                          lj({addressLines})
                          setAddress({
                            address_1: _.isUndefined(addressLines[0]) ? null : addressLines[0],
                            address_2: _.isUndefined(addressLines[1]) ? null : addressLines[1],
                            address_3: _.isUndefined(addressLines[2]) ? null : addressLines[2],
                            address_4: _.isUndefined(addressLines[3]) ? null : addressLines[3],
                          });
                        }
                        setSelectedAddressMenuVisible(false);
                      }}
                      title={option.label}
                    />
                  ))}
                </Menu>
              </View>
            )}

            {/* Address Line 1 */}
            <TextInput
              label="Address Line 1"
              mode="outlined"
              onChangeText={value => {
                log(`Address line 1: ${value}`);
                setAddress({...address, address_1: value});
              }}
              autoCapitalize={'none'}
              autoCorrect={false}
              value={address.address_1}
              style={{ marginBottom: 16 }}
            />

            {/* Address Line 2 */}
            <TextInput
              label="Address Line 2"
              mode="outlined"
              onChangeText={value => {
                log(`Address line 2: ${value}`);
                setAddress({...address, address_2: value});
              }}
              autoCapitalize={'none'}
              autoCorrect={false}
              value={address.address_2}
              style={{ marginBottom: 16 }}
            />

            {/* Address Line 3 */}
            <TextInput
              label="Address Line 3"
              mode="outlined"
              onChangeText={value => {
                log(`Address line 3: ${value}`);
                setAddress({...address, address_3: value});
              }}
              autoCapitalize={'none'}
              autoCorrect={false}
              value={address.address_3}
              style={{ marginBottom: 16 }}
            />

            {/* Address Line 4 */}
            <TextInput
              label="Address Line 4"
              mode="outlined"
              onChangeText={value => {
                log(`Address line 4: ${value}`);
                setAddress({...address, address_4: value});
              }}
              autoCapitalize={'none'}
              autoCompleteType='off'
              autoCorrect={false}
              value={address.address_4}
              style={{ marginBottom: 16 }}
            />

            <Button 
              mode="contained" 
              onPress={saveAddress}
              disabled={disableSaveAddressButton}
              style={{ marginTop: 8, alignSelf: 'flex-end' }}
            >
              Save Address
            </Button>

            {renderError('country')}

            {/* Country Dropdown */}
            <View style={{ marginBottom: 16 }}>
              <Menu
                visible={countryMenuVisible}
                onDismiss={() => setCountryMenuVisible(false)}
                anchor={
                  <TouchableRipple onPress={() => setCountryMenuVisible(true)}>
                    <TextInput
                      label="Country"
                      mode="outlined"
                      value={countryOptionsList.find(c => c.value === country)?.label || country}
                      editable={false}
                      right={<TextInput.Icon icon="chevron-down" />}
                      style={{ backgroundColor: 'transparent' }}
                    />
                  </TouchableRipple>
                }>
                {countryOptionsList.map((option, index) => (
                  <Menu.Item
                    key={index}
                    onPress={() => {
                      setCountry(option.value);
                      updateUserData({detail: 'country', value: option.value});
                      setCountryMenuVisible(false);
                    }}
                    title={option.label}
                  />
                ))}
              </Menu>
            </View>
            
          </Card.Content>
        </Card>
        )}

        {/* Contact Details Section */}
        {activeSection === 'contact' && (
        <Card style={{ marginBottom: 16, elevation: 2 }}>
          <Card.Content style={{ padding: 20 }}>
            <Text variant="titleMedium" style={{ 
              marginBottom: 16, 
              fontWeight: '600',
              color: materialTheme.colors.primary 
            }}>
              Contact Details
            </Text>

            {renderError('email')}

            {/* Email */}
            <TextInput
              label="Email"
              mode="outlined"
              defaultValue={getDummyUserInfo('email')}
              onEndEditing={event => {
                let value = event.nativeEvent.text;
                updateUserData({detail:'email', value});
              }}
              keyboardType='email-address'
              autoCapitalize='none'
              style={{ marginBottom: 16 }}
            />

            {renderError('mobile')}

            {/* Mobile */}
            <TextInput
              label="Mobile Number"
              mode="outlined"
              defaultValue={getDummyUserInfo('mobile')}
              onEndEditing={event => {
                let value = event.nativeEvent.text;
                updateUserData({detail:'mobile', value});
              }}
              keyboardType='phone-pad'
              style={{ marginBottom: 16 }}
            />
            
          </Card.Content>
        </Card>
        )}

        {/* Error Display Section */}
        {Object.keys(errorDisplay).map(detail => (
          errorDisplay[detail] && (
            <HelperText type="error" visible={true} key={detail} style={{ marginBottom: 8 }}>
              {detail}: {errorDisplay[detail]}
            </HelperText>
          )
        ))}

      </KeyboardAwareScrollView>
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
    height: '100%',
  },
  scrollView: {
    height: '94%',
  },
});


export default PersonalDetails;

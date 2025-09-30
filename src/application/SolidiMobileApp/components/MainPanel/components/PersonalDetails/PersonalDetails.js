// React imports
import React, { useContext, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Alert } from 'react-native';
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

  // Helper function to get user info from appState or return empty string
  const getUserInfo = (key) => {
    // Get the value from appState, if not available return empty string
    const realValue = appState.getUserInfo(key);
    if (realValue && realValue !== '[loading]' && realValue !== null && realValue !== undefined) {
      return realValue;
    }
    return '';
  };

  // Misc
  let [errorDisplay, setErrorDisplay] = useState({});

  // Section toggle state
  let [activeSection, setActiveSection] = useState('basic');

  // Title dropdown
  let [title, setTitle] = useState(getUserInfo('title'));
  let generateTitleOptionsList = () => {
    let titleOptions = appState.getPersonalDetailOptions('title');
    console.log(`👤 [UI] Title options loaded:`, titleOptions);
    return titleOptions.map(x => ({label: x, value: x}) );
  }
  let [titleOptionsList, setTitleOptionsList] = useState(generateTitleOptionsList());
  let [titleMenuVisible, setTitleMenuVisible] = useState(false);

  // Gender dropdown
  let [gender, setGender] = useState(getUserInfo('gender'));
  let generateGenderOptionsList = () => {
    let genderOptions = appState.getPersonalDetailOptions('gender');
    return genderOptions.map(x => ({label: x, value: x}) );
  }
  let [genderOptionsList, setGenderOptionsList] = useState(generateGenderOptionsList());
  let [genderMenuVisible, setGenderMenuVisible] = useState(false);

  // Citizenship dropdown
  let [citizenship, setCitizenship] = useState(getUserInfo('citizenship'));
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

  // Address details - start with empty values
  let [postcode, setPostcode] = useState(getUserInfo('postcode'));
  let [address, setAddress] = useState({
    address_1: getUserInfo('address_1'),
    address_2: getUserInfo('address_2'),
    address_3: getUserInfo('address_3'),
    address_4: getUserInfo('address_4'),
  });
  let [disableSearchPostcodeButton, setDisableSearchPostcodeButton] = useState(false);
  let [disableSaveAddressButton, setDisableSaveAddressButton] = useState(false);

  // Save button for personal details
  let [disableSaveButton, setDisableSaveButton] = useState(false);
  let [saveMessage, setSaveMessage] = useState('');

  // Form data state to track changes before saving
  let [formData, setFormData] = useState({
    firstName: '',
    middleNames: '',
    lastName: '',
    dateOfBirth: '',
    mobile: '',
    landline: '',
    email: ''
  });

  // Country code dropdown for phone numbers
  let [countryCode, setCountryCode] = useState('+44');
  let generateCountryCodeOptionsList = () => {
    return [
      {label: '🇬🇧 +44 (United Kingdom)', value: '+44'},
      {label: '🇺🇸 +1 (United States)', value: '+1'},
      {label: '🇨🇦 +1 (Canada)', value: '+1'},
      {label: '🇫🇷 +33 (France)', value: '+33'},
      {label: '🇩🇪 +49 (Germany)', value: '+49'},
      {label: '🇪🇸 +34 (Spain)', value: '+34'},
      {label: '🇮🇹 +39 (Italy)', value: '+39'},
      {label: '🇳🇱 +31 (Netherlands)', value: '+31'},
      {label: '🇦🇺 +61 (Australia)', value: '+61'},
      {label: '🇯🇵 +81 (Japan)', value: '+81'},
      {label: '🇰🇷 +82 (South Korea)', value: '+82'},
      {label: '🇸🇬 +65 (Singapore)', value: '+65'},
      {label: '🇭🇰 +852 (Hong Kong)', value: '+852'},
    ];
  }
  let [countryCodeOptionsList, setCountryCodeOptionsList] = useState(generateCountryCodeOptionsList());

  let showCountryCodePicker = () => {
    let buttons = countryCodeOptionsList.slice(0, 8).map(option => ({
      text: option.label,
      onPress: () => {
        setCountryCode(option.value);
      }
    }));
    buttons.push({ text: 'More...', onPress: () => showMoreCountryCodes() });
    buttons.push({ text: 'Cancel', style: 'cancel' });
    
    Alert.alert('Select Country Code', '', buttons);
  };

  let showMoreCountryCodes = () => {
    let buttons = countryCodeOptionsList.slice(8).map(option => ({
      text: option.label,
      onPress: () => {
        setCountryCode(option.value);
      }
    }));
    buttons.push({ text: 'Back', onPress: () => showCountryCodePicker() });
    buttons.push({ text: 'Cancel', style: 'cancel' });
    
    Alert.alert('Select Country Code (More)', '', buttons);
  };

  // Country picker functions - Alert-based like Register page
  let showCountryPicker = () => {
    console.log('🔍 showCountryPicker called');
    let buttons = countryOptionsList.slice(0, 8).map(option => ({
      text: option.label,
      onPress: () => {
        console.log('🔍 Country selected:', option.value);
        setCountry(option.value);
        updateUserData({detail: 'country', value: option.value});
      }
    }));
    buttons.push({ text: 'More...', onPress: () => showMoreCountries() });
    buttons.push({ text: 'Cancel', style: 'cancel' });
    
    Alert.alert('Select Country', '', buttons);
  };

  let showMoreCountries = () => {
    let buttons = countryOptionsList.slice(8).map(option => ({
      text: option.label,
      onPress: () => {
        console.log('🔍 Country selected:', option.value);
        setCountry(option.value);
        updateUserData({detail: 'country', value: option.value});
      }
    }));
    buttons.push({ text: 'Back', onPress: () => showCountryPicker() });
    buttons.push({ text: 'Cancel', style: 'cancel' });
    
    Alert.alert('Select Country (More)', '', buttons);
  };

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
  let [country, setCountry] = useState(getUserInfo('country'));
  let generateCountryOptionsList = () => {
    let countries = appState.getCountries();
    console.log(`👤 [UI] Countries loaded:`, countries);
    // Add error handling to ensure countries is an array
    if (!Array.isArray(countries)) {
      console.log(`👤 [UI] Countries not loaded yet, using fallback`);
      return [{label: 'United Kingdom', value: 'GB'}]; // Default fallback
    }
    return countries.map(x => { return {label: x.name, value: x.code} });
  }
  let [countryOptionsList, setCountryOptionsList] = useState(generateCountryOptionsList());

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
      setTitle(getUserInfo('title'));
      setTitleOptionsList(generateTitleOptionsList());
      setGender(getUserInfo('gender'));
      setGenderOptionsList(generateGenderOptionsList());
      setCitizenship(getUserInfo('citizenship'));
      setCitizenshipOptionsList(generateCitizenshipOptionsList());
      setPostcode(getUserInfo('postcode'));
      setAddress({
        address_1: getUserInfo('address_1'),
        address_2: getUserInfo('address_2'),
        address_3: getUserInfo('address_3'),
        address_4: getUserInfo('address_4'),
      });
      setCountry(getUserInfo('country'));
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

  let savePersonalDetails = async () => {
    /*
    Save all personal details at once:
    - Collect all current form values
    - Send them to the server in a single request
    - Show loading message and disable button during save
    - Show success/error feedback to user
    */
    console.log(`👤 [UI] Personal Details Save button pressed`);
    
    setDisableSaveButton(true);
    setSaveMessage('Saving personal details...');
    setErrorDisplay({}); // Clear any existing errors

    try {
      let functionName = 'savePersonalDetails';
      
      // Collect all current form data
      let personalData = {
        title: title,
        firstName: formData.firstName || getUserInfo('firstName'),
        middleNames: formData.middleNames || getUserInfo('middleNames'),
        lastName: formData.lastName || getUserInfo('lastName'), 
        gender: gender,
        dateOfBirth: formData.dateOfBirth || getUserInfo('dateOfBirth'),
        citizenship: citizenship,
        mobile: formData.mobile || getUserInfo('mobile'),
        landline: formData.landline || getUserInfo('landline'),
        email: formData.email || getUserInfo('email'),
        country: country
      };

      console.log(`👤 [UI] Personal data to save:`, personalData);
      log(`API request: Save personal details: ${jd(personalData)}`);
      
      let apiRoute = 'user/update_bulk';
      let params = { userData: personalData };
      let result = await appState.privateMethod({ functionName, apiRoute, params });
      
      console.log(`👤 [UI] Received response from Personal Details save:`, result);
      
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
      
      if (result === 'DisplayedError') return;
      
      if (_.has(result, 'error')) {
        let error = result.error;
        log(`Error returned from API request (Save personal details): ${JSON.stringify(error)}`);
        
        if (_.isObject(error)) {
          if (_.isEmpty(error)) {
            error = 'Received an empty error object ({}) from the server.';
          } else {
            error = JSON.stringify(error);
          }
        }
        
        // Check for field-specific validation errors
        let detailNames = Object.keys(personalData);
        let errorFound = false;
        
        for (let detailName of detailNames) {
          let selector = `ValidationError: [${detailName}]: `;
          if (error.startsWith(selector)) {
            let errorMessage = error.replace(selector, '');
            setErrorDisplay({...errorDisplay, [detailName]: errorMessage});
            errorFound = true;
            break;
          }
        }
        
        if (!errorFound) {
          // General error
          setErrorDisplay({...errorDisplay, 'general': error});
        }
        
        setSaveMessage('');
      } else {
        // Success - update appState with all the new values
        Object.keys(personalData).forEach(key => {
          if (personalData[key] && personalData[key] !== '[loading]') {
            appState.setUserInfo({[key]: personalData[key]});
          }
        });
        
        setSaveMessage('Personal details saved successfully!');
        setTimeout(() => setSaveMessage(''), 3000); // Clear success message after 3 seconds
      }
      
    } catch (err) {
      logger.error(err);
      setErrorDisplay({...errorDisplay, 'general': err.message});
      setSaveMessage('');
    }
    
    setDisableSaveButton(false);
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
                      value={title || "Select Title"}
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
              defaultValue={formData.firstName || getUserInfo('firstName')}
              onChangeText={(value) => {
                setFormData({...formData, firstName: value});
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
              defaultValue={formData.middleNames || getUserInfo('middleNames')}
              onChangeText={(value) => {
                setFormData({...formData, middleNames: value});
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
              defaultValue={formData.lastName || getUserInfo('lastName')}
              onChangeText={(value) => {
                setFormData({...formData, lastName: value});
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
              defaultValue={formData.dateOfBirth || getUserInfo('dateOfBirth')}
              onChangeText={(value) => {
                setFormData({...formData, dateOfBirth: value});
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

            {/* Mobile Number Field with Country Code */}
            <Text variant="bodyMedium" style={{ marginBottom: 8, color: materialTheme.colors.onSurfaceVariant }}>
              Mobile Number
            </Text>
            <View style={{ flexDirection: 'row', marginBottom: 16, gap: 8 }}>
              {/* Country Code Selector */}
              <TouchableOpacity 
                onPress={showCountryCodePicker}
                style={{ flex: 0.3 }}
              >
                <TextInput
                  mode="outlined"
                  value={countryCode}
                  editable={false}
                  style={{ textAlign: 'center' }}
                  right={<TextInput.Icon icon="chevron-down" />}
                  dense
                  pointerEvents="none"
                />
              </TouchableOpacity>
              
              {/* Phone Number Input */}
              <TextInput
                mode="outlined"
                placeholder="7834123123"
                defaultValue={formData.mobile || getUserInfo('mobile')}
                onChangeText={(value) => {
                  setFormData({...formData, mobile: value});
                }}
                keyboardType="phone-pad"
                style={{ flex: 0.7 }}
                left={<TextInput.Icon icon="phone" />}
                dense
              />
            </View>

            {renderError('landline')}

            {/* Landline - using Material Design TextInput */}
            <TextInput
              label="Landline Number"
              mode="outlined"
              defaultValue={formData.landline || getUserInfo('landline')}
              onChangeText={(value) => {
                setFormData({...formData, landline: value});
              }}
              autoCapitalize='none'
              keyboardType='phone-pad'
              style={{ marginBottom: 16 }}
            />

            {/* Email - Display only with note */}
            <TextInput
              label="Email Address"
              mode="outlined"
              value={formData.email || getUserInfo('email')}
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

            {/* Country Dropdown - Alert-based like Register page */}
            <TouchableOpacity onPress={showCountryPicker}>
              <TextInput
                label="Country"
                mode="outlined"
                value={countryOptionsList.find(c => c.value === country)?.label || country}
                editable={false}
                style={{ marginBottom: 16 }}
                left={<TextInput.Icon icon="earth" />}
                right={<TextInput.Icon icon="chevron-down" />}
                pointerEvents="none"
              />
            </TouchableOpacity>
            
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
              defaultValue={formData.email || getUserInfo('email')}
              onChangeText={(value) => {
                setFormData({...formData, email: value});
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
              defaultValue={formData.mobile || getUserInfo('mobile')}
              onChangeText={(value) => {
                setFormData({...formData, mobile: value});
              }}
              keyboardType='phone-pad'
              style={{ marginBottom: 16 }}
            />
            
          </Card.Content>
        </Card>
        )}

        {/* Save Button Section */}
        <Card style={{ marginBottom: 16, elevation: 2 }}>
          <Card.Content style={{ padding: 20 }}>
            {/* Save Message */}
            {saveMessage && (
              <Text 
                variant="bodyMedium" 
                style={{ 
                  marginBottom: 16, 
                  textAlign: 'center',
                  color: saveMessage.includes('successfully') 
                    ? materialTheme.colors.primary 
                    : materialTheme.colors.onSurface,
                  fontWeight: saveMessage.includes('successfully') ? '600' : '400'
                }}
              >
                {saveMessage}
              </Text>
            )}
            
            {/* Save Button */}
            <Button
              mode="contained"
              onPress={savePersonalDetails}
              disabled={disableSaveButton}
              loading={disableSaveButton}
              icon="content-save"
              style={{ 
                paddingVertical: 8,
                backgroundColor: materialTheme.colors.primary
              }}
              labelStyle={{ 
                fontSize: 16, 
                fontWeight: '600' 
              }}
            >
              {disableSaveButton ? 'Saving...' : 'Save Personal Details'}
            </Button>
          </Card.Content>
        </Card>

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

// React imports
import React, { useContext, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Platform, Alert } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

// Material Design imports
import {
  Card,
  Text,
  TextInput,
  Checkbox,
  Button,
  HelperText,
  useTheme,
} from 'react-native-paper';

// Other imports
import _ from 'lodash';
import Big from 'big.js';

// Internal imports
import AppStateContext from 'src/application/data';
import { colors } from 'src/constants';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import { StandardButton, FixedWidthButton, ImageButton, Spinner } from 'src/components/atomic';
import { Title } from 'src/components/shared';
import misc from 'src/util/misc';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('Register');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);

// Shortcuts
let jd = JSON.stringify;


/* Notes

Need to use zIndex values carefully to ensure that the opened dropdown appears above the rest of the data.

*/




let Register = () => {

  let appState = useContext(AppStateContext);
  let [renderCount, triggerRender] = useState(0);
  let firstRender = misc.useFirstRender();
  let stateChangeID = appState.stateChangeID;

  let pageName = appState.pageName;
  let permittedPageNames = 'default'.split(' ');
  misc.confirmItemInArray('permittedPageNames', permittedPageNames, pageName, 'Register');


  /* Notes:
  - TextInput components do not re-render if their value is changed later, so we need to declare their initial values here at the beginning.
  - We directly save the data into and load it from the AppState provider in case the user reads the Terms & Conditions page.
  */


  // We preserve user-entered data only in the case where the user has left this page in order to read the Terms & Conditions page.
  let previousState = appState.previousState;
  let registerData = appState.blankRegisterData;
  if (previousState.mainPanelState === 'ReadArticle') {
    registerData = appState.registerData;
  }
  if (appState.preserveRegistrationData) {
    // This is for use during development. Saves having to re-enter the data every time.
    registerData = appState.registerData;
  }

  // Basic
  let [userData, setUserData] = useState({
    ...registerData,
    emailPreferences: registerData.emailPreferences || {
      systemAnnouncements: true,
      newsAndFeatureUpdates: true,
      promotionsAndSpecialOffers: true,
    }
  });
  let [isLoading, setIsLoading] = useState(true);
  let [errorDisplay, setErrorDisplay] = useState({});
  let [uploadMessage, setUploadMessage] = useState('');
  let [passwordVisible, setPasswordVisible] = useState(false);
  let [disableRegisterButton, setDisableRegisterButton] = useState(false);

  // Gender dropdown
  let [gender, setGender] = useState(registerData.gender || '');
  let generateGenderOptionsList = () => {
    return ['Male', 'Female', 'Other'].map(x => ({label: x, value: x}));
  }
  let [genderOptionsList, setGenderOptionsList] = useState(generateGenderOptionsList());

  // Citizenship dropdown
  let [citizenship, setCitizenship] = useState(registerData.citizenship || '');
  let generateCitizenshipOptionsList = () => {
    return [
      {label: 'United Kingdom', value: 'GB'},
      {label: 'United States', value: 'US'},
      {label: 'Canada', value: 'CA'},
      {label: 'Australia', value: 'AU'},
      {label: 'Germany', value: 'DE'},
      {label: 'France', value: 'FR'},
      {label: 'Spain', value: 'ES'},
      {label: 'Italy', value: 'IT'},
      {label: 'Netherlands', value: 'NL'},
      {label: 'Japan', value: 'JP'},
      {label: 'South Korea', value: 'KR'},
      {label: 'Singapore', value: 'SG'},
      {label: 'Hong Kong', value: 'HK'},
      {label: 'Switzerland', value: 'CH'},
      {label: 'Austria', value: 'AT'},
      {label: 'Belgium', value: 'BE'},
      {label: 'Denmark', value: 'DK'},
      {label: 'Finland', value: 'FI'},
      {label: 'Ireland', value: 'IE'},
      {label: 'Norway', value: 'NO'},
      {label: 'Sweden', value: 'SE'},
      {label: 'Poland', value: 'PL'},
      {label: 'Portugal', value: 'PT'},
      {label: 'Czech Republic', value: 'CZ'},
      {label: 'Greece', value: 'GR'},
    ];
  }
  let [citizenshipOptionsList, setCitizenshipOptionsList] = useState(generateCitizenshipOptionsList());

  // Country code dropdown for phone numbers
  let [countryCode, setCountryCode] = useState(registerData.countryCode || '+44');
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

  // More
  let scrollRefTop = useRef();

  // Initial setup.
  useEffect( () => {
    setup();
  }, []); // Pass empty array so that this only runs once on mount.


  let setup = async () => {
    try {
      // Disabled API calls for design testing
      // await appState.generalSetup({caller: 'Register'});
      // await appState.loadPersonalDetailOptions();
      // await appState.loadCountries();
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
      setGenderOptionsList(generateGenderOptionsList());
      setCitizenshipOptionsList(generateCitizenshipOptionsList());
      setCountryCodeOptionsList(generateCountryCodeOptionsList());
      setIsLoading(false);
      //triggerRender(renderCount+1);
    } catch(err) {
      let msg = `Register.setup: Error = ${err}`;
      console.log(msg);
    }
  }

  // Simple dropdown handlers using Alert
  let showGenderPicker = () => {
    console.log('🔍 showGenderPicker called');
    let buttons = genderOptionsList.map(option => ({
      text: option.label,
      onPress: () => {
        console.log('🔍 Gender selected:', option.value);
        setGender(option.value);
        setUserData({...userData, gender: option.value});
      }
    }));
    buttons.push({ text: 'Cancel', style: 'cancel' });
    
    Alert.alert('Select Gender', '', buttons);
  };

  let showCitizenshipPicker = () => {
    console.log('🔍 showCitizenshipPicker called');
    let buttons = citizenshipOptionsList.slice(0, 8).map(option => ({ // Show first 8 options
      text: option.label,
      onPress: () => {
        console.log('🔍 Citizenship selected:', option.value);
        setCitizenship(option.value);
        setUserData({...userData, citizenship: option.value});
      }
    }));
    buttons.push({ text: 'More...', onPress: () => showMoreCitizenship() });
    buttons.push({ text: 'Cancel', style: 'cancel' });
    
    Alert.alert('Select Country', '', buttons);
  };

  let showMoreCitizenship = () => {
    let buttons = citizenshipOptionsList.slice(8).map(option => ({
      text: option.label,
      onPress: () => {
        setCitizenship(option.value);
        setUserData({...userData, citizenship: option.value});
      }
    }));
    buttons.push({ text: 'Back', onPress: () => showCitizenshipPicker() });
    buttons.push({ text: 'Cancel', style: 'cancel' });
    
    Alert.alert('Select Country (More)', '', buttons);
  };

  let showCountryCodePicker = () => {
    let buttons = countryCodeOptionsList.slice(0, 8).map(option => ({
      text: option.label,
      onPress: () => {
        setCountryCode(option.value);
        setUserData({...userData, countryCode: option.value});
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
        setUserData({...userData, countryCode: option.value});
      }
    }));
    buttons.push({ text: 'Back', onPress: () => showCountryCodePicker() });
    buttons.push({ text: 'Cancel', style: 'cancel' });
    
    Alert.alert('Select Country Code (More)', '', buttons);
  };


  let submitRegisterRequest = async () => {
    /*
    When the new user clicks "Register":
    - We send the bundle of userData to the server.
    - If the request is successful, this means that a new user account has been created. We then move through the confirmation journey (for email, mobile phone number, and address).
    - If unsuccessful, we update the error display on this particular page, rather than moving to an error page. That's why this function is here instead of in AppState.js.
    */
    setDisableRegisterButton(true);
    // Reset any existing error messages.
    setErrorDisplay({});
    let result;

    let email = userData.email;
    let apiRoute = 'register_new_user';
    apiRoute += '/' + email;
    try {
      log(`API request: Register new user: userData = ${jd(userData)}.`);
      setUploadMessage('Registering your details...');
      // Send the request.
      let functionName = 'submitRegisterRequest';
      // Restructure emailPreferences into a list for transmission.
      let userData2 = {...userData};
      userData2.emailPreferences = _.keys(_.pick(userData2.emailPreferences, _.identity));
      
      // Combine country code with mobile number for full international format
      if (userData2.mobileNumber && countryCode) {
        userData2.mobileNumber = countryCode + userData2.mobileNumber;
      }
      
      // Ensure gender and citizenship are included
      userData2.gender = gender || userData2.gender;
      userData2.citizenship = citizenship || userData2.citizenship;
      
      let params = {userData: userData2};
      
      console.log(`🎯 [UI] Registration form submitted`);
      console.log(`🎯 [UI] Registration data:`, userData2);
      
      result = await appState.publicMethod({functionName, apiRoute, params});
      
      console.log(`🎯 [UI] Registration response:`, result);
      
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
    } catch(err) {
      console.error(`❌ [UI] Registration error:`, err);
      logger.error(err);
    }
    //lj({result});
    if (result === 'DisplayedError') return;
    // Future: The error should be an object with 'code' and 'message' properties.
    if (_.has(result, 'error')) {
      let error = result.error;
      console.log(`❌ [UI] Registration API error:`, error);
      log(`Error returned from API request ${apiRoute}: ${jd(error)}`);
      if (_.isObject(error)) {
        if (_.isEmpty(error)) {
          error = 'Received an empty error object ({}) from the server.'
        } else {
          error = jd(error);
        }
      }
      let detailNameError = 'unknown';
      let errorMessage = error;
      let detailNames = `
unknown
firstName
lastName
email
password
dateOfBirth
mobileNumber
gender
citizenship
emailPreferences
      `
      detailNames = misc.splitStringIntoArray({s: detailNames});
      for (let detailName of detailNames) {
        let selector = `ValidationError: [${detailName}]: `;
        //log(error.startsWith(selector))
        if (error.startsWith(selector)) {
          detailNameError = detailName;
          errorMessage = error.replace(selector, '');
        }
      }
      
      // Show error as popup alert
      Alert.alert(
        "Registration Error",
        errorMessage,
        [{ text: "OK", style: "default" }]
      );
      
      setUploadMessage('');
      setDisableRegisterButton(false);
    } else { // No errors.
      console.log(`✅ [UI] Registration successful! Redirecting to profile page`);
      
      // Save some of the userData for use in RegisterConfirm.
      appState.registerConfirmData = {
        email: userData.email,
        password: userData.password,
      };
      // Delete the temporarily stored registerData from the appState.
      appState.registerData = appState.blankRegisterData;
      // Redirect to profile page on successful registration.
      appState.changeState('PersonalDetails');
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


  let getPasswordButtonTitle = () => {
    let title = passwordVisible ? 'Hide password' : 'Show password';
    return title;
  }




  const materialTheme = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: materialTheme.colors.background }}>
      
      <Title>
        Create Account
      </Title>

      <KeyboardAwareScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ 
          padding: 16,
          backgroundColor: materialTheme.colors.background
        }}
        keyboardShouldPersistTaps='handled'
        ref={scrollRefTop}
      >

        { isLoading && <Spinner/> }

        { ! isLoading &&
          <Card style={{ 
            marginHorizontal: 16,
            marginBottom: 24,
            elevation: 3
          }}>
            <Card.Content style={{ padding: 20 }}>
              <Text variant="titleMedium" style={{ 
                marginBottom: 20, 
                color: materialTheme.colors.primary,
                textAlign: 'center',
                fontWeight: '600'
              }}>
                📝 Create Your Account
              </Text>

              {/* Email Field */}
              <TextInput
                mode="outlined"
                label="Email Address"
                value={userData.email}
                onChangeText={(value) => setUserData({...userData, email: value})}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                style={{ marginBottom: 16 }}
                left={<TextInput.Icon icon="email" />}
              />

              {/* Password Field */}
              <TextInput
                mode="outlined"
                label="Password"
                value={userData.password}
                onChangeText={(value) => setUserData({...userData, password: value})}
                secureTextEntry={!passwordVisible}
                autoCapitalize="none"
                style={{ marginBottom: 16 }}
                left={<TextInput.Icon icon="lock" />}
                right={
                  <TextInput.Icon
                    icon={passwordVisible ? "eye-off" : "eye"}
                    onPress={() => setPasswordVisible(!passwordVisible)}
                  />
                }
              />

              {/* First Name Field */}
              <TextInput
                mode="outlined"
                label="First Name"
                value={userData.firstName}
                onChangeText={(value) => setUserData({...userData, firstName: value})}
                autoCapitalize="words"
                autoCorrect={false}
                style={{ marginBottom: 16 }}
                left={<TextInput.Icon icon="account" />}
              />

              {/* Last Name Field */}
              <TextInput
                mode="outlined"
                label="Last Name"
                value={userData.lastName}
                onChangeText={(value) => setUserData({...userData, lastName: value})}
                autoCapitalize="words"
                autoCorrect={false}
                style={{ marginBottom: 16 }}
                left={<TextInput.Icon icon="account" />}
              />

              {/* Date of Birth Field */}
              <TextInput
                mode="outlined"
                label="Date of Birth"
                placeholder="DD/MM/YYYY"
                value={userData.dateOfBirth}
                onChangeText={(value) => setUserData({...userData, dateOfBirth: value})}
                style={{ marginBottom: 16 }}
                left={<TextInput.Icon icon="calendar" />}
              />

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
                  value={userData.mobileNumber}
                  onChangeText={(value) => setUserData({...userData, mobileNumber: value})}
                  keyboardType="phone-pad"
                  style={{ flex: 0.7 }}
                  left={<TextInput.Icon icon="phone" />}
                  dense
                />
              </View>

              {/* Gender Field */}
              <TouchableOpacity onPress={showGenderPicker}>
                <TextInput
                  mode="outlined"
                  label="Gender"
                  value={userData.gender || gender}
                  editable={false}
                  style={{ marginBottom: 16 }}
                  left={<TextInput.Icon icon="human-male-female" />}
                  right={<TextInput.Icon icon="chevron-down" />}
                  pointerEvents="none"
                />
              </TouchableOpacity>

              {/* Citizenship Field */}
              <TouchableOpacity onPress={showCitizenshipPicker}>
                <TextInput
                  mode="outlined"
                  label="Country of Citizenship"
                  value={citizenshipOptionsList.find(c => c.value === citizenship)?.label || citizenship}
                  editable={false}
                  style={{ marginBottom: 16 }}
                  left={<TextInput.Icon icon="earth" />}
                  right={<TextInput.Icon icon="chevron-down" />}
                  pointerEvents="none"
                />
              </TouchableOpacity>

              {/* Email Preferences Section */}
              <Text variant="titleSmall" style={{ 
                marginBottom: 12, 
                marginTop: 8,
                color: materialTheme.colors.primary,
                fontWeight: '600'
              }}>
                Email Preferences
              </Text>

              <View style={{ marginBottom: 20 }}>
                <Checkbox.Item
                  label="System Announcements"
                  status={userData.emailPreferences?.systemAnnouncements ? 'checked' : 'unchecked'}
                  onPress={() => {
                    const newValue = !userData.emailPreferences?.systemAnnouncements;
                    setUserData({
                      ...userData, 
                      emailPreferences: {
                        ...userData.emailPreferences,
                        systemAnnouncements: newValue
                      }
                    });
                  }}
                  style={{ paddingLeft: 0 }}
                />

                <Checkbox.Item
                  label="News & Feature Updates"
                  status={userData.emailPreferences?.newsAndFeatureUpdates ? 'checked' : 'unchecked'}
                  onPress={() => {
                    const newValue = !userData.emailPreferences?.newsAndFeatureUpdates;
                    setUserData({
                      ...userData, 
                      emailPreferences: {
                        ...userData.emailPreferences,
                        newsAndFeatureUpdates: newValue
                      }
                    });
                  }}
                  style={{ paddingLeft: 0 }}
                />

                <Checkbox.Item
                  label="Promotions & Special Offers"
                  status={userData.emailPreferences?.promotionsAndSpecialOffers ? 'checked' : 'unchecked'}
                  onPress={() => {
                    const newValue = !userData.emailPreferences?.promotionsAndSpecialOffers;
                    setUserData({
                      ...userData, 
                      emailPreferences: {
                        ...userData.emailPreferences,
                        promotionsAndSpecialOffers: newValue
                      }
                    });
                  }}
                  style={{ paddingLeft: 0 }}
                />
              </View>

              {/* Terms & Conditions */}
              <Text variant="bodySmall" style={{ 
                marginBottom: 16,
                textAlign: 'center',
                color: materialTheme.colors.onSurfaceVariant,
                lineHeight: 18
              }}>
                By clicking Create Account, you agree to our{' '}
                <Text 
                  style={{ color: materialTheme.colors.primary, textDecorationLine: 'underline' }}
                  onPress={() => {
                    // Store the userData so that this page can retrieve it when we return from the ReadArticle page.
                    appState.registerData = userData;
                    appState.changeState('ReadArticle', 'terms_and_conditions');
                  }}
                >
                  Terms & Conditions
                </Text>
              </Text>

              {/* Register Button */}
              <Button
                mode="contained"
                onPress={submitRegisterRequest}
                disabled={disableRegisterButton}
                style={{ marginBottom: 16, paddingVertical: 4 }}
                labelStyle={{ fontSize: 16, fontWeight: '600' }}
                icon="account-plus"
              >
                Create Account
              </Button>

              {/* Upload Message */}
              {uploadMessage && (
                <HelperText type="info">
                  {uploadMessage}
                </HelperText>
              )}
            </Card.Content>
          </Card>
        }

        {/* Login Link */}
        <Card style={{ 
          marginHorizontal: 16,
          elevation: 2
        }}>
          <Card.Content style={{ padding: 20 }}>
            <Text variant="bodyMedium" style={{ 
              textAlign: 'center',
              color: materialTheme.colors.onSurfaceVariant,
              marginBottom: 12
            }}>
              Already have an account?
            </Text>
            <Button
              mode="outlined"
              onPress={() => appState.changeState('Login')}
              style={{ alignSelf: 'center' }}
              icon="login"
            >
              Sign In
            </Button>
          </Card.Content>
        </Card>

        <View style={{ height: 32 }} />


          <View style={styles.termsSection}>
            <Text style={styles.termsSectionText}>By clicking Register, you agree to our </Text>
            <Button title="Terms & Conditions"
              onPress={ () => {
                // Store the userData so that this page can retrieve it when we return from the ReadArticle page.
                appState.registerData = userData;
                log(`Have stored userData to appState: ${jd(userData)}`);
                appState.changeState('ReadArticle', 'terms_and_conditions');
              }}
              styles={styleTextButton}/>
          </View>

          <View style={styles.registerButtonWrapper}>
            <FixedWidthButton title="Register"
              onPress={ submitRegisterRequest }
              disabled={disableRegisterButton}
            />
            <View style={styles.uploadMessage}>
              <Text style={styles.uploadMessageText}>{uploadMessage}</Text>
            </View>
          </View>


      </KeyboardAwareScrollView>

    </View>
  );

}


let styles = StyleSheet.create({
  panelContainer: {
    paddingHorizontal: scaledWidth(0),
    paddingVertical: scaledHeight(5),
    width: '100%',
    height: '100%',
  },
  panelSubContainer: {
    paddingTop: scaledHeight(10),
    //paddingHorizontal: scaledWidth(30),
    //paddingHorizontal: scaledWidth(0),
    height: '100%',
    //borderWidth: 1, // testing
  },
  scrollView: {
    //borderWidth: 1, // testing
    height: '94%',
  },
  heading: {
    alignItems: 'center',
  },
  heading1: {
    //marginTop: scaledHeight(10),
    //marginBottom: scaledHeight(40),
    //marginBottom: scaledHeight(10),
  },
  headingText: {
    fontSize: normaliseFont(20),
    fontWeight: 'bold',
  },
  scrollDownMessage: {
    marginVertical: scaledHeight(10),
    alignItems: 'center',
  },
  scrollDownMessageText: {
    fontSize: normaliseFont(16),
    //fontWeight: 'bold',
    color: 'red',
  },
  basicText: {
    fontSize: normaliseFont(14),
  },
  bold: {
    fontWeight: 'bold',
  },
  red: {
    color: 'red',
  },
  sectionHeading: {
    marginTop: scaledHeight(20),
    marginBottom: scaledHeight(20),
  },
  sectionHeadingText: {
    fontSize: normaliseFont(16),
    fontWeight: 'bold',
    fontStyle: 'italic',
  },
  detail: {
    //borderWidth: 1, // testing
    marginBottom: scaledHeight(10),
    flexDirection: 'row',
    flexWrap: 'wrap', // Allows long detail value to move onto the next line.
    alignItems: 'center',
  },
  detailName: {
    paddingRight: scaledWidth(10),
    paddingVertical: scaledHeight(10),
    //borderWidth: 1, // testing
    minWidth: '40%', // Expands with length of detail name.
  },
  detailNameText: {
    fontSize: normaliseFont(14),
    fontWeight: 'bold',
  },
  detailValue: {
    paddingLeft: scaledWidth(10),
    paddingVertical: scaledHeight(10),
    minWidth: '59%', // slightly reduced in width so that the right-hand border is never cut off.
    //borderWidth: 1, // testing
  },
  detailValueFullWidth: {
    paddingLeft: scaledWidth(10),
    paddingVertical: scaledHeight(10),
    minWidth: '99%',
  },
  detailValueText: {
    fontSize: normaliseFont(14),
    //borderWidth: 1, // testing
  },
  editableTextInput: {
    borderWidth: 1,
    borderRadius: 16,
    borderColor: colors.greyedOutIcon,
    fontSize: normaliseFont(14),
  },
  dropdownWrapper: {

  },
  detailDropdown: {
    borderWidth: 1,
    maxWidth: '100%',
    height: scaledHeight(40),
  },
  detailDropdownText: {
    fontSize: normaliseFont(14),
  },
  horizontalRule: {
    borderWidth: 1,
    borderBottomColor: 'black',
    borderBottomWidth: 1,
    marginTop: scaledWidth(20),
    marginHorizontal: scaledWidth(20),
  },
  buttonWrapper: {
    marginTop: scaledHeight(10),
    //borderWidth: 1, // testing
  },
  alignRight: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  errorDisplay: {
    paddingHorizontal: scaledHeight(15),
    paddingVertical: scaledHeight(15),
  },
  errorDisplayText: {
    fontSize: normaliseFont(14),
    color: 'red',
  },
  termsSection: {
    // This large margin adds some space between the end of the citizenship dropdown and the Register button.
    marginTop: scaledHeight(45),
    width: '100%',
    //flexDirection: 'row',
    //justifyContent: 'flex-start',
  },
  termsSectionText: {
    fontSize: normaliseFont(14),
    marginBottom: scaledHeight(5),
  },
  registerButtonWrapper: {
    marginVertical: scaledHeight(40),
  },
  uploadMessage: {
    //borderWidth: 1, //testing
    marginTop: scaledHeight(20),
    paddingRight: scaledWidth(10),
  },
  uploadMessageText: {
    fontSize: normaliseFont(14),
    color: 'red',
  },
  checkboxWrapper: {
    //borderWidth: 1, //testing
    minWidth: '100%',
    marginBottom: scaledHeight(10),
  },
});


let styleTextButton = StyleSheet.create({
  text: {
    margin: 0,
    padding: 0,
    fontSize: normaliseFont(14),
  },
});


let styleCheckbox = StyleSheet.create({
  width: '100%',
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1,
  borderRadius: scaledWidth(10),
  paddingVertical: scaledHeight(0),
})


export default Register;

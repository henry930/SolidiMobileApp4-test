// React imports
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Text, TextInput, StyleSheet, View } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Checkbox } from 'react-native-paper';

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


  // Basic
  let defaultEmailPreferences = {
    'systemAnnouncements': true,
    'newsAndUpdates': true,
    'promotionsAndSpecialOffers': true,
  }
  let [userData, setUserData] = useState({
    emailPreferences: defaultEmailPreferences,
  });
  let [errorDisplay, setErrorDisplay] = useState({});
  let [uploadMessage, setUploadMessage] = useState('');
  let [passwordVisible, setPasswordVisible] = useState(false);
  let [disableRegisterButton, setDisableRegisterButton] = useState(false);

  // Gender dropdown
  let initialGender = '';
  let [gender, setGender] = useState(initialGender);
  let generateGenderOptionsList = () => {
    let genderOptions = appState.getPersonalDetailOptions('gender');
    return genderOptions.map(x => ({label: x, value: x}) );
  }
  let [genderOptionsList, setGenderOptionsList] = useState(generateGenderOptionsList());
  let [openGender, setOpenGender] = useState(false);

  // Citizenship dropdown
  let initialCitizenship = '';
  let [citizenship, setCitizenship] = useState(initialCitizenship);
  let generateCitizenshipOptionsList = () => {
    let countries = appState.getCountries();
    return countries.map(x => { return {label: x.name, value: x.code} });
  }
  let [citizenshipOptionsList, setCitizenshipOptionsList] = useState(generateCitizenshipOptionsList());
  let [openCitizenship, setOpenCitizenship] = useState(false);

  // Initial setup.
  useEffect( () => {
    setup();
  }, []); // Pass empty array so that this only runs once on mount.


  let setup = async () => {
    try {
      await appState.generalSetup();
      await appState.loadPersonalDetailOptions();
      await appState.loadCountries();
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
      setGenderOptionsList(generateGenderOptionsList());
      setCitizenshipOptionsList(generateCitizenshipOptionsList());
      triggerRender(renderCount+1);
    } catch(err) {
      let msg = `Register.setup: Error = ${err}`;
      console.log(msg);
    }
  }


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
    // testing:
    userData = {
      email: 'jabba@huttcorp.com@foo',
      firstName: 'Jabba the Hutt',
    };
    let email = userData.email;
    let apiRoute = 'register_new_user';
    apiRoute += '/' + email;
    try {
      log(`API request: Register new user: userData = ${jd(userData)}.`);
      setUploadMessage('Registering your details...');
      // Send the request.
      let functionName = 'submitRegisterRequest';
      let params = {userData};
      result = await appState.publicMethod({functionName, apiRoute, params});
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
    } catch(err) {
      logger.error(err);
    }
    // Future: The error should be an object with 'code' and 'message' properties.
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
      let detailNameError = 'unknown';
      let errorMessage = error;
      let detailNames = `
firstName
lastName
email
password
mobile
dateOfBirth
gender
citizenship
mobileNumber
emailPreferences
      `
      detailNames = misc.splitStringIntoArray(detailNames);
      for (let detailName of detailNames) {
        let selector = `ValidationError: [${detailName}]: `;
        //log(error.startsWith(selector))
        if (error.startsWith(selector)) {
          detailNameError = detailName;
          errorMessage = error.replace(selector, '');
        }
      }
      // If error is a string, display the error message above the specific setting.
      setErrorDisplay({...errorDisplay, [detailNameError]: errorMessage});
    } else { // No errors.
      // Save the data that we sent to the server.
      _.assign(appState, userData);
      // Move to next page.
      appState.changeStateParameters.
      appState.changeState('RegisterConfirm', 'confirm_email');
    }
    setUploadMessage('');
    setDisableRegisterButton(false);
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




  return (
    <View style={styles.panelContainer}>
    <View style={styles.panelSubContainer}>

      <View style={[styles.heading, styles.heading1]}>
        <Text style={styles.headingText}>Register</Text>
      </View>

      <View style={styles.scrollDownMessage}>
        <Text style={styles.scrollDownMessageText}>(Scroll down for Register button)</Text>
      </View>


      <KeyboardAwareScrollView style={styles.scrollView} contentContainerStyle={{ flexGrow: 1 }} >

        <View style={styles.sectionHeading}>
        </View>

        {renderError('unknown')}

        <View style={styles.registerButtonWrapper}>
          <FixedWidthButton title="Register"
            onPress={ submitRegisterRequest }
            disabled={disableRegisterButton}
          />
          <View style={styles.uploadMessage}>
            <Text style={styles.uploadMessageText}>{uploadMessage}</Text>
          </View>
        </View>


        {renderError('firstName')}

        <View style={styles.detail}>
          <View style={styles.detailName}>
            <Text style={styles.detailNameText}>{`\u2022  `}First Name</Text>
          </View>
          <View>
          <TextInput defaultValue={''}
            style={[styles.detailValue, styles.editableTextInput]}
            onEndEditing = {event => {
              let value = event.nativeEvent.text;
              log(`First Name set to: ${value}`);
              setUserData({...userData, firstName: value});
            }}
            autoComplete={'off'}
            autoCompleteType='off'
            autoCapitalize={'words'}
            autoCorrect={false}
            placeholder='First Name...'
            placeholderTextColor='grey'
          />
          </View>
        </View>

        {renderError('lastName')}

        <View style={styles.detail}>
          <View style={styles.detailName}>
            <Text style={styles.detailNameText}>{`\u2022  `}Last Name</Text>
          </View>
          <View>
          <TextInput defaultValue={''}
            style={[styles.detailValue, styles.editableTextInput]}
            onEndEditing = {event => {
              let value = event.nativeEvent.text;
              log(`Last Name set to: ${value}`);
              setUserData({...userData, lastName: value});
            }}
            autoComplete={'off'}
            autoCompleteType='off'
            autoCapitalize={'words'}
            autoCorrect={false}
            placeholder='Last Name...'
            placeholderTextColor='grey'
          />
          </View>
        </View>

        {renderError('email')}

        <View style={styles.detail}>
          <View style={styles.detailName}>
            <Text style={styles.detailNameText}>{`\u2022  `}Email</Text>
          </View>
          <View>
          <TextInput defaultValue={''}
            style={[styles.detailValueFullWidth, styles.editableTextInput]}
            onEndEditing = {event => {
              let value = event.nativeEvent.text;
              log(`Email set to: ${value}`);
              setUserData({...userData, email: value});
            }}
            autoComplete={'off'}
            autoCompleteType='off'
            autoCapitalize={'words'}
            autoCorrect={false}
            placeholder='Email address'
            placeholderTextColor='grey'
          />
          </View>
        </View>

        {renderError('password')}

        <View style={styles.detail}>
          <View style={styles.detailName}>
            <Text style={styles.detailNameText}>{`\u2022  `}Password</Text>
          </View>
          <View style={styles.detailValue}>
            <Button title={getPasswordButtonTitle()}
              onPress={ () => { setPasswordVisible(! passwordVisible) } }
              styles={styleTextButton}
            />
          </View>
          <View>
            <TextInput defaultValue={''}
              style={[styles.detailValueFullWidth, styles.editableTextInput]}
              onEndEditing = {event => {
                let value = event.nativeEvent.text;
                log(`Mobile set to: ${value}`);
                setUserData({...userData, mobile: value});
              }}
              autoComplete={'off'}
              autoCompleteType='off'
              autoCapitalize='none'
              autoCorrect={false}
              placeholder='Password'
              placeholderTextColor='grey'
              secureTextEntry={! passwordVisible}
            />
          </View>
        </View>

        {renderError('mobile')}

        <View style={styles.detail}>
          <View style={styles.detailName}>
            <Text style={styles.detailNameText}>{`\u2022  `}Mobile</Text>
          </View>
          <View>
            <TextInput defaultValue={''}
              style={[styles.detailValueFullWidth, styles.editableTextInput]}
              onEndEditing = {event => {
                let value = event.nativeEvent.text;
                log(`Mobile set to: ${value}`);
                setUserData({...userData, mobile: value});
              }}
              autoCompleteType='off'
              autoCapitalize='none'
              keyboardType='numbers-and-punctuation' // May have plus sign and hyphen in it, not just digits.
              placeholder='Mobile phone number'
              placeholderTextColor='grey'
            />
          </View>
        </View>

        {renderError('dateOfBirth')}

        <View style={styles.detail}>
          <View style={styles.detailName}>
            <Text style={styles.detailNameText}>{`\u2022  `}Date of Birth</Text>
          </View>
          <View>
            <TextInput defaultValue={''}
              style={[styles.detailValue, styles.editableTextInput]}
              onEndEditing = {event => {
                let value = event.nativeEvent.text;
                log(`dateOfBirth set to: ${value}`);
                setUserData({...userData, dateOfBirth: value});
              }}
              autoCompleteType='off'
              keyboardType='numbers-and-punctuation'
              placeholder='DD/MM/YYYY'
              placeholderTextColor='grey'
            />
          </View>
        </View>

        <View style={[styles.detail, {zIndex:1}]}>
          <View style={styles.detailName}>
            <Text style={styles.detailNameText}>{`\u2022  `}Gender</Text>
          </View>
          <View style={[styles.detailValue, {paddingVertical:0, paddingLeft: 0}]}>
            <DropDownPicker
              listMode="SCROLLVIEW"
              scrollViewProps={{nestedScrollEnabled: true}}
              placeholder='Select gender'
              placeholderStyle={{color: 'grey'}}
              open={openGender}
              value={gender}
              items={genderOptionsList}
              setOpen={setOpenGender}
              setValue={setGender}
              style={[styles.detailDropdown]}
              textStyle = {styles.detailDropdownText}
              onChangeValue = { (gender) => {
                log(`Gender set to: ${gender}`);
                setUserData({...userData, gender});
              }}
            />
          </View>
        </View>

        <View style={[styles.detail, {zIndex:1}]}>
          <View style={styles.detailName}>
            <Text style={styles.detailNameText}>{`\u2022  `}Country of Citizenship</Text>
          </View>
          <View style={[styles.detailValueFullWidth, {paddingVertical:0, paddingLeft: 0}]}>
            <DropDownPicker
              listMode="SCROLLVIEW"
              scrollViewProps={{nestedScrollEnabled: true}}
              placeholder='Select country'
              placeholderStyle={{color: 'grey'}}
              open={openCitizenship}
              value={citizenship}
              items={citizenshipOptionsList}
              setOpen={setOpenCitizenship}
              setValue={setCitizenship}
              style={[styles.detailDropdown]}
              textStyle = {styles.detailDropdownText}
              onChangeValue = { (citizenship) => {
                setUserData({...userData, citizenship});
              }}
              searchable = {true}
              maxHeight={scaledHeight(300)}
            />
          </View>
        </View>

        {renderError('emailPreferences')}

        <View style={styles.detail}>
          <View style={styles.detailName}>
            <Text style={styles.detailNameText}>{`\u2022  `}Email Preferences</Text>
          </View>
          <View>
            <Checkbox.Item label="System Announcements"
              status={userData.emailPreferences.systemAnnouncements? "checked" : "unchecked"}
              style={styleCheckbox}
              onPress={() => {
                let currentValue = userData.emailPreferences.systemAnnouncements;
                let newValue = ! currentValue;
                log(`Changing userData.emailPreferences.systemAnnouncements from ${currentValue} to ${newValue}`);
                setUserData({...userData, emailPreferences: {...userData.emailPreferences, systemAnnouncements: newValue}});
              }}
              //position={'leading'}
            />
            <Checkbox.Item label="News & Updates"
              status={userData.emailPreferences.newsAndUpdates? "checked" : "unchecked"}
              style={styleCheckbox}
              onPress={() => {
                let currentValue = userData.emailPreferences.newsAndUpdates;
                let newValue = ! currentValue;
                log(`Changing userData.emailPreferences.newsAndUpdates from ${currentValue} to ${newValue}`);
                setUserData({...userData, emailPreferences: {...userData.emailPreferences, newsAndUpdates: newValue}});
              }}
            />
            <Checkbox.Item label="Promotions & Special Offers"
              status={userData.emailPreferences.promotionsAndSpecialOffers? "checked" : "unchecked"}
              style={styleCheckbox}
              onPress={() => {
                let currentValue = userData.emailPreferences.promotionsAndSpecialOffers;
                let newValue = ! currentValue;
                log(`Changing userData.emailPreferences.promotionsAndSpecialOffers from ${currentValue} to ${newValue}`);
                setUserData({...userData, emailPreferences: {...userData.emailPreferences, promotionsAndSpecialOffers: newValue}});
              }}
            />
          </View>
        </View>

        <View style={styles.termsSection}>
          <Text style={styles.termsSectionText}>By clicking Register, you agree to our </Text>
          <Button title="Terms & Conditions"
            onPress={ () => appState.changeState('ReadArticle', 'terms_and_conditions') }
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
    marginTop: scaledHeight(25),
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
  //borderWidth: 1, //testing
  justifyContent: 'center',
})


export default Register;

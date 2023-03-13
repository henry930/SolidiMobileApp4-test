// React imports
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Text, TextInput, ScrollView, StyleSheet, View } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
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
let logger2 = logger.extend('PersonalDetails');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);


/* Notes

Need to use zIndex values carefully to ensure that the opened dropdown appears above the rest of the data.

*/




let PersonalDetails = () => {

  let appState = useContext(AppStateContext);
  let [renderCount, triggerRender] = useState(0);
  let firstRender = misc.useFirstRender();
  let stateChangeID = appState.stateChangeID;

  let pageName = appState.pageName;
  let permittedPageNames = 'default'.split(' ');
  misc.confirmItemInArray('permittedPageNames', permittedPageNames, pageName, 'PersonalDetails');


  // Misc
  let [errorDisplay, setErrorDisplay] = useState({});


  // Title dropdown
  let initialTitle = appState.getUserInfo('title');
  let [title, setTitle] = useState(initialTitle);
  let generateTitleOptionsList = () => {
    let titleOptions = appState.getPersonalDetailOptions('title');
    return titleOptions.map(x => ({label: x, value: x}) );
  }
  let [titleOptionsList, setTitleOptionsList] = useState(generateTitleOptionsList());
  let [openTitle, setOpenTitle] = useState(false);


  // Gender dropdown
  let initialGender = appState.getUserInfo('gender');
  let [gender, setGender] = useState(initialGender);
  let generateGenderOptionsList = () => {
    let genderOptions = appState.getPersonalDetailOptions('gender');
    return genderOptions.map(x => ({label: x, value: x}) );
  }
  let [genderOptionsList, setGenderOptionsList] = useState(generateGenderOptionsList());
  let [openGender, setOpenGender] = useState(false);

  // Citizenship dropdown
  let initialCitizenship = appState.getUserInfo('citizenship');
  let [citizenship, setCitizenship] = useState(initialCitizenship);
  let generateCitizenshipOptionsList = () => {
    let countries = appState.getCountries();
    return countries.map(x => { return {label: x.name, value: x.code} });
  }
  let [citizenshipOptionsList, setCitizenshipOptionsList] = useState(generateCitizenshipOptionsList());
  let [openCitizenship, setOpenCitizenship] = useState(false);

  // Country dropdown
  let initialCountry = appState.getUserInfo('country');
  let [country, setCountry] = useState(initialCountry);
  let generateCountryOptionsList = () => {
    let countries = appState.getCountries();
    return countries.map(x => { return {label: x.name, value: x.code} });
  }
  let [countryOptionsList, setCountryOptionsList] = useState(generateCountryOptionsList());
  let [openCountry, setOpenCountry] = useState(false);




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
      setTitle(appState.getUserInfo('title'));
      setTitleOptionsList(generateTitleOptionsList());
      setGender(appState.getUserInfo('gender'));
      setGenderOptionsList(generateGenderOptionsList());
      setCitizenship(appState.getUserInfo('citizenship'));
      setCitizenshipOptionsList(generateCitizenshipOptionsList());
      setCountry(appState.getUserInfo('country'));
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
    if (value == '[loading]') return;
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
email mobile
address_1 address_2 address_3 address_4 postcode country
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
      // If error is a string, display the error message above the specific setting.
      setErrorDisplay({...errorDisplay, [detail]: error});
    } else { // No errors.
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


  return (
    <View style={styles.panelContainer}>
    <View style={styles.panelSubContainer}>

      <View style={[styles.heading, styles.heading1]}>
        <Text style={styles.headingText}>Personal Details</Text>
      </View>

      <KeyboardAwareScrollView style={styles.scrollView} contentContainerStyle={{ flexGrow: 1 }} >

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionHeadingText}>Basic Details</Text>
        </View>

        <View style={[styles.detail, {zIndex:2}]}>
          <View style={styles.detailName}>
            <Text style={styles.detailNameText}>{`\u2022  `}Title</Text>
          </View>
          <View style={[styles.detailValue, {paddingVertical:0, paddingLeft: 0}]}>
            <DropDownPicker
              listMode="SCROLLVIEW"
              scrollViewProps={{nestedScrollEnabled: true}}
              placeholder={title}
              open={openTitle}
              value={title}
              items={titleOptionsList}
              setOpen={setOpenTitle}
              setValue={setTitle}
              style={[styles.detailDropdown]}
              textStyle = {styles.detailDropdownText}
              onChangeValue = { (title) => {
                updateUserData({detail: 'title', value: title});
              }}
            />
          </View>
        </View>

        {renderError('firstName')}

        <View style={styles.detail}>
          <View style={styles.detailName}>
            <Text style={styles.detailNameText}>{`\u2022  `}First Name</Text>
          </View>
          <View>
          <TextInput defaultValue={appState.getUserInfo('firstName')}
            style={[styles.detailValue, styles.editableTextInput]}
            onEndEditing = {event => {
              let value = event.nativeEvent.text;
              updateUserData({detail:'firstName', value});
            }}
            autoComplete={'off'}
            autoCompleteType='off'
            autoCapitalize={'words'}
            autoCorrect={false}
          />
          </View>
        </View>

        {renderError('middleNames')}

        <View style={styles.detail}>
          <View style={styles.detailName}>
            <Text style={styles.detailNameText}>{`\u2022  `}Middle Names</Text>
          </View>
          <View>
          <TextInput defaultValue={appState.getUserInfo('middleNames')}
            style={[styles.detailValue, styles.editableTextInput]}
            onEndEditing = {event => {
              let value = event.nativeEvent.text;
              updateUserData({detail:'middleNames', value});
            }}
            autoComplete={'off'}
            autoCompleteType='off'
            autoCapitalize={'words'}
            autoCorrect={false}
          />
          </View>
        </View>

        {renderError('lastName')}

        <View style={styles.detail}>
          <View style={styles.detailName}>
            <Text style={styles.detailNameText}>{`\u2022  `}Last Name</Text>
          </View>
          <View>
          <TextInput defaultValue={appState.getUserInfo('lastName')}
            style={[styles.detailValue, styles.editableTextInput]}
            onEndEditing = {event => {
              let value = event.nativeEvent.text;
              updateUserData({detail:'lastName', value});
            }}
            autoComplete={'off'}
            autoCompleteType='off'
            autoCapitalize={'words'}
            autoCorrect={false}
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
              placeholder={gender}
              open={openGender}
              value={gender}
              items={genderOptionsList}
              setOpen={setOpenGender}
              setValue={setGender}
              style={[styles.detailDropdown]}
              textStyle = {styles.detailDropdownText}
              onChangeValue = { (gender) => {
                updateUserData({detail: 'gender', value: gender});
              }}
            />
          </View>
        </View>

        {renderError('dateOfBirth')}

        <View style={styles.detail}>
          <View style={styles.detailName}>
            <Text style={styles.detailNameText}>{`\u2022  `}Date of Birth</Text>
          </View>
          <View>
            <TextInput defaultValue={appState.getUserInfo('dateOfBirth')}
              style={[styles.detailValue, styles.editableTextInput]}
              onEndEditing = {event => {
                let value = event.nativeEvent.text;
                updateUserData({detail:'dateOfBirth', value});
              }}
              autoCompleteType='off'
              keyboardType='numbers-and-punctuation'
            />
          </View>
        </View>

        <View style={[styles.detail, {zIndex:1}]}>
          <View style={styles.detailName}>
            <Text style={styles.detailNameText}>{`\u2022  `}Country of Citizenship</Text>
          </View>
          <View style={[styles.detailValue, {paddingVertical:0, paddingLeft: 0}]}>
            <DropDownPicker
              listMode="SCROLLVIEW"
              scrollViewProps={{nestedScrollEnabled: true}}
              placeholder={citizenship}
              open={openCitizenship}
              value={citizenship}
              items={citizenshipOptionsList}
              setOpen={setOpenCitizenship}
              setValue={setCitizenship}
              style={[styles.detailDropdown]}
              textStyle = {styles.detailDropdownText}
              onChangeValue = { (citizenship) => {
                updateUserData({detail: 'citizenship', value: citizenship});
              }}
              searchable = {true}
              maxHeight={scaledHeight(300)}
            />
          </View>
        </View>



        <View style={styles.horizontalRule} />



        <View style={styles.sectionHeading}>
          <Text style={styles.sectionHeadingText}>Contact Details</Text>
        </View>

        {/* Don't allow the email address to be changed easily, because it's how we get in touch with the user, and also the ID with which the user logs in. */}

        <View style={styles.detail}>
          <View style={styles.detailName}>
            <Text style={styles.detailNameText}>{`\u2022  `}Email</Text>
          </View>
          <View style={styles.detailValue}>
            <Text style={styles.detailValueText}>{appState.getUserInfo('email')}</Text>
          </View>
        </View>

        {renderError('mobile')}

        <View style={styles.detail}>
          <View style={styles.detailName}>
            <Text style={styles.detailNameText}>{`\u2022  `}Mobile</Text>
          </View>
          <View>
            <TextInput defaultValue={appState.getUserInfo('mobile')}
              style={[styles.detailValue, styles.editableTextInput]}
              onEndEditing = {event => {
                let value = event.nativeEvent.text;
                updateUserData({detail:'mobile', value});
              }}
              autoCompleteType='off'
              autoCapitalize='none'
              keyboardType='numbers-and-punctuation' // May have plus sign and hyphen in it, not just digits.
            />
          </View>
        </View>



        <View style={styles.horizontalRule} />



        <View style={styles.sectionHeading}>
          <Text style={styles.sectionHeadingText}>Address Details</Text>
        </View>

        {renderError('address_1')}

        <View style={styles.detail}>
          <View style={styles.detailName}>
            <Text style={styles.detailNameText}>{`\u2022  `}Address</Text>
          </View>
          <View>
            <TextInput defaultValue={appState.getUserInfo('address_1')}
              style={[styles.detailValue, styles.editableTextInput]}
              onEndEditing = {event => {
                let value = event.nativeEvent.text;
                updateUserData({detail:'address_1', value});
              }}
              autoComplete={'off'}
              autoCompleteType='off'
              autoCapitalize={'none'}
              autoCorrect={false}
            />
          </View>
        </View>

        {renderError('address_2')}

        <View style={styles.detail}>
          <View style={styles.detailName}>
            <Text style={styles.detailNameText}></Text>
          </View>
          <View>
          <TextInput defaultValue={appState.getUserInfo('address_2')}
              style={[styles.detailValue, styles.editableTextInput]}
              onEndEditing = {event => {
                let value = event.nativeEvent.text;
                updateUserData({detail:'address_2', value});
              }}
              autoComplete={'off'}
              autoCompleteType='off'
              autoCapitalize={'none'}
              autoCorrect={false}
            />
          </View>
        </View>

        {renderError('address_3')}

        <View style={styles.detail}>
          <View style={styles.detailName}>
            <Text style={styles.detailNameText}></Text>
          </View>
          <View>
          <TextInput defaultValue={appState.getUserInfo('address_3')}
              style={[styles.detailValue, styles.editableTextInput]}
              onEndEditing = {event => {
                let value = event.nativeEvent.text;
                updateUserData({detail:'address_3', value});
              }}
              autoComplete={'off'}
              autoCompleteType='off'
              autoCapitalize={'none'}
              autoCorrect={false}
            />
          </View>
        </View>

        {renderError('address_4')}

        <View style={styles.detail}>
          <View style={styles.detailName}>
            <Text style={styles.detailNameText}></Text>
          </View>
          <View>
          <TextInput defaultValue={appState.getUserInfo('address_4')}
              style={[styles.detailValue, styles.editableTextInput]}
              onEndEditing = {event => {
                let value = event.nativeEvent.text;
                updateUserData({detail:'address_4', value});
              }}
              autoComplete={'off'}
              autoCompleteType='off'
              autoCapitalize={'none'}
              autoCorrect={false}
            />
          </View>
        </View>

        {renderError('postcode')}

        <View style={styles.detail}>
          <View style={styles.detailName}>
            <Text style={styles.detailNameText}>{`\u2022  `}Postcode</Text>
          </View>
          <View>
          <TextInput defaultValue={appState.getUserInfo('postcode')}
              style={[styles.detailValue, styles.editableTextInput]}
              onEndEditing = {event => {
                let value = event.nativeEvent.text;
                updateUserData({detail:'postcode', value});
              }}
              autoComplete={'off'}
              autoCompleteType='off'
              autoCapitalize={'none'}
              autoCorrect={false}
            />
          </View>
        </View>

        <View style={[styles.detail, {zIndex:1}]}>
          <View style={styles.detailName}>
            <Text style={styles.detailNameText}>{`\u2022  `}Country</Text>
          </View>
          <View style={[styles.detailValue, {paddingVertical:0, paddingLeft: 0}]}>
            <DropDownPicker
              listMode="SCROLLVIEW"
              scrollViewProps={{nestedScrollEnabled: true}}
              placeholder={country}
              open={openCountry}
              value={country}
              items={countryOptionsList}
              setOpen={setOpenCountry}
              setValue={setCountry}
              style={[styles.detailDropdown]}
              textStyle = {styles.detailDropdownText}
              onChangeValue = { (country) => {
                updateUserData({detail: 'country', value: country});
              }}
              searchable = {true}
              maxHeight={scaledHeight(300)}
            />
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
    //borderWidth: 1, // testing
  },
  panelSubContainer: {
    paddingTop: scaledHeight(10),
    //paddingHorizontal: scaledWidth(30),
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
    paddingRight: scaledWidth(40),
    marginVertical: scaledHeight(10),
    width: '100%',
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
  }
});


export default PersonalDetails;

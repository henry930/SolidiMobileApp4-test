// React imports
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Text, TextInput, ScrollView, StyleSheet, View } from 'react-native';

// Other imports
import DropDownPicker from 'react-native-dropdown-picker';
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

  // This call will return empty default values if the data has not yet been loaded.
  let details1 = appState.getUserInfo();
  let [details, setDetails] = useState(details1);

  let [errorDisplay, setErrorDisplay] = useState({});


  // Tmp
  let initialTitle = 'Mr'; // this should be loaded from the user info.
  // Title dropdown
  let [title, setTitle] = useState(initialTitle);
  let titleOptions = 'Mr Mrs Ms'.split(' ');
  let titleOptionsList = titleOptions.map(x => ({label: x, value: x}) );
  let [openTitle, setOpenTitle] = useState(false);
  useEffect( () => { if (! firstRender)
    updateUserData({detail: 'title', value: title});
  }, [title]);

  // Tmp
  let initialGender = 'Male'; // this should be loaded from the user info.
  // Gender dropdown
  let [gender, setGender] = useState(initialGender);
  let genderOptions = 'Male Female'.split(' ');
  let genderOptionsList = genderOptions.map(x => ({label: x, value: x}) );
  let [openGender, setOpenGender] = useState(false);
  useEffect( () => { if (! firstRender)
    updateUserData({detail: 'gender', value: gender});
  }, [gender]);

    // Country dropdown (for address)
    let [country, setCountry] = useState('United Kingdom');
    let [openCountry, setOpenCountry] = useState(false);
    useEffect( () => { if (! firstRender)
      updateUserData({detail: 'country', value: country});
    }, [country]);
    let generateCountryOptionsList = () => {
      let countries = appState.getCountries();
      let result = countries.map(x => { return {label: x.name, value: x.code} });
      return result;
    }


  // Initial setup.
  useEffect( () => {
    setup();
  }, []); // Pass empty array so that this only runs once on mount.


  let setup = async () => {
    try {
      await loadUserData();
      await appState.loadCountries();
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
      triggerRender(renderCount+1);
    } catch(err) {
      let msg = `PersonalDetails.setup: Error = ${err}`;
      console.log(msg);
    }
  }


  let loadUserData = async () => {
    // Display the value we have in storage first.
    let details1 = appState.getUserInfo();
    setDetails(details1);
    // Load the user info from the server.
    await appState.loadInitialStuffAboutUser();
    if (appState.stateChangeIDHasChanged(stateChangeID)) return;
    // Display the new value, if it's different.
    let details2 = appState.getUserInfo();
    if (details1 !== details2) {
      setDetails(details2);
    }
  }


  let updateUserData = async ({detail, value}) => {
    // Note: The local state (the value that is displayed in the GUI) has already been updated via the user's selection of the new value.
    // We send an update to the server every time the user finishes choosing / updating a value.
    // The API route will differ depending on which detail we are updating.
    // Select the right one based on the detail.
    functionName = 'updateUserData';
    let info = appState.user.info;
    let userDataDetails = `
title firstname lastname
date_of_birth gender citizenship
email mobile
address_1 address_2 address_3 address_4 postcode country
`;
    userDataDetails = misc.splitStringIntoArray(userDataDetails);
    let userDataCategory;
    let apiRoute;
    let prevValue;
    if (userDataDetails.includes(detail)) {
      userDataCategory = 'user';
      apiRoute = 'user/update';
      prevValue = info.user[detail];
    } else {
      console.error(`updateUserData: Unrecognised detail: ${detail}`);
      return;
    }
    // Todo: Only run the update if we have a previous value and the value has definitely changed.
    log(`API request: Update ${userDataCategory}: Change ${detail} from '${prevValue}' to '${value}'.`);
    let params = { [userDataCategory]: {[detail]: value} }
    let result = await appState.privateMethod({ functionName, apiRoute, params });
    if (appState.stateChangeIDHasChanged(stateChangeID)) return;
    // Future: The error should be an object with 'code' and 'message' properties.
    if (_.has(result, 'error')) {
      let error = result.error;
      log(`Error returned from API request (Update ${userDataCategory}: Change ${detail} from '${prevValue}' to '${value}'): ${JSON.stringify(error)}`);
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
      // Use the specific detail to select the sub-object that we need to update.
      if (userDataDetails.includes(detail)) {
        info.user[detail] = value;
      }
      // Reset any existing error.
      setErrorDisplay({...errorDisplay, [detail]: null});
    }
  }


  let renderError = (detailName) => {
    // We render an error above a detail, if an error has been set for it.
    // Example detailName: 'address_1'
    if (_.isNil(errorDisplay[detailName])) return;
    return (
      <View style={styles.errorDisplay}>
        <Text style={styles.errorDisplayText}>Error: {detailName}: {errorDisplay[detailName]}</Text>
      </View>
    )
  }


  return (
    <View style={styles.panelContainer}>
    <View style={styles.panelSubContainer}>

      <View style={[styles.heading, styles.heading1]}>
        <Text style={styles.headingText}>Personal Details</Text>
      </View>

      <ScrollView style={styles.scrollView}>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionHeadingText}>Basic Details</Text>
        </View>

        <View style={[styles.detail, {zIndex:1}]}>
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
            />
          </View>
        </View>

        <View style={styles.detail}>
          <View style={styles.detailName}>
            <Text style={styles.detailNameText}>{`\u2022  `}First Name</Text>
          </View>
          <View style={[styles.detailValue]}>
            <Text style={styles.detailValueText}>{details.user.firstname}</Text>
          </View>
        </View>

        <View style={styles.detail}>
          <View style={styles.detailName}>
            <Text style={styles.detailNameText}>{`\u2022  `}Last Name</Text>
          </View>
          <View style={styles.detailValue}>
            <Text style={styles.detailValueText}>{details.user.lastname}</Text>
          </View>
        </View>

        {renderError('date_of_birth')}

        <View style={styles.detail}>
          <View style={styles.detailName}>
            <Text style={styles.detailNameText}>{`\u2022  `}Date of Birth</Text>
          </View>
          <View>
            <TextInput defaultValue={details.user.date_of_birth}
              style={[styles.detailValue, styles.editableTextInput]}
              onEndEditing = {event => {
                let value = event.nativeEvent.text;
                updateUserData({detail:'date_of_birth', value});
              }}
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
            />
          </View>
        </View>

        <View style={[styles.detail, {borderWidth:1}]}>
          <View style={styles.detailName}>
            <Text style={styles.detailNameText}>  Country of Citizenship</Text>
          </View>
          <View style={[styles.detailValue, {paddingLeft:0}]}>
            {/*<Text style={styles.detailValueText}>{details.user.citizenship}</Text>*/}
            <Text style={styles.detailValueText}>  United Kingdom</Text>
          </View>
        </View>



        <View style={styles.horizontalRule} />



        <View style={styles.sectionHeading}>
          <Text style={styles.sectionHeadingText}>Contact Details</Text>
        </View>

        {renderError('email')}

        <View style={styles.detail}>
          <View style={styles.detailName}>
            <Text style={styles.detailNameText}>Email</Text>
          </View>
          <View style={styles.detailValue}>
            <Text style={styles.detailValueText}>{details.user.email}</Text>
          </View>
        </View>

        {renderError('mobile')}

        <View style={styles.detail}>
          <View style={styles.detailName}>
            <Text style={styles.detailNameText}>Mobile</Text>
          </View>
          <View style={styles.detailValue}>
            <Text style={styles.detailValueText}>{details.user.mobile}</Text>
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
            <TextInput defaultValue={details.user.address_1}
              style={[styles.detailValue, styles.editableTextInput]}
              onEndEditing = {event => {
                let value = event.nativeEvent.text;
                updateUserData({detail:'address_1', value});
              }}
            />
          </View>
        </View>

        {renderError('address_2')}

        <View style={styles.detail}>
          <View style={styles.detailName}>
            <Text style={styles.detailNameText}></Text>
          </View>
          <View>
          <TextInput defaultValue={details.user.address_2}
              style={[styles.detailValue, styles.editableTextInput]}
              onEndEditing = {event => {
                let value = event.nativeEvent.text;
                updateUserData({detail:'address_2', value});
              }}
            />
          </View>
        </View>

        {renderError('address_3')}

        <View style={styles.detail}>
          <View style={styles.detailName}>
            <Text style={styles.detailNameText}></Text>
          </View>
          <View>
          <TextInput defaultValue={details.user.address_3}
              style={[styles.detailValue, styles.editableTextInput]}
              onEndEditing = {event => {
                let value = event.nativeEvent.text;
                updateUserData({detail:'address_3', value});
              }}
            />
          </View>
        </View>

        {renderError('address_4')}

        <View style={styles.detail}>
          <View style={styles.detailName}>
            <Text style={styles.detailNameText}></Text>
          </View>
          <View>
          <TextInput defaultValue={details.user.address_4}
              style={[styles.detailValue, styles.editableTextInput]}
              onEndEditing = {event => {
                let value = event.nativeEvent.text;
                updateUserData({detail:'address_4', value});
              }}
            />
          </View>
        </View>

        {renderError('postcode')}

        <View style={styles.detail}>
          <View style={styles.detailName}>
            <Text style={styles.detailNameText}>Postcode</Text>
          </View>
          <View>
          <TextInput defaultValue={details.user.postcode}
              style={[styles.detailValue, styles.editableTextInput]}
              onEndEditing = {event => {
                let value = event.nativeEvent.text;
                updateUserData({detail:'postcode', value});
              }}
            />
          </View>
        </View>

        {renderError('country')}

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
              items={ generateCountryOptionsList() }
              //items={genderOptionsList}
              setOpen={setOpenCountry}
              setValue={setCountry}
              style={[styles.detailDropdown]}
              textStyle = {styles.detailDropdownText}
            />
          </View>
        </View>


      </ScrollView>

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
    //paddingTop: scaledHeight(10),
    //paddingHorizontal: scaledWidth(30),
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
    marginTop: scaledHeight(10),
  },
  headingText: {
    fontSize: normaliseFont(20),
    fontWeight: 'bold',
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
    minWidth: '35%', // Expands with length of detail name.
  },
  detailNameText: {
    fontSize: normaliseFont(16),
    fontWeight: 'bold',
  },
  detailValue: {
    paddingLeft: scaledWidth(10),
    paddingVertical: scaledHeight(10),
    minWidth: '65%',
    //borderWidth: 1, // testing
  },
  detailValueText: {
    fontSize: normaliseFont(16),
    //borderWidth: 1, // testing
  },
  editableTextInput: {
    borderWidth: 1,
    borderRadius: 16,
    borderColor: colors.greyedOutIcon,
    fontSize: normaliseFont(16),
  },
  dropdownWrapper: {

  },
  detailDropdown: {
    borderWidth: 1,
    maxWidth: '100%',
    height: scaledHeight(40),
  },
  detailDropdownText: {
    fontSize: normaliseFont(16),
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
    fontSize: normaliseFont(16),
    color: 'red',
  }
});


export default PersonalDetails;

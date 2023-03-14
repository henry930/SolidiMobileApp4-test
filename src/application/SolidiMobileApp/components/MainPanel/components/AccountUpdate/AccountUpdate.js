// React imports
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Linking, Image, Text, TextInput, StyleSheet, View, ScrollView } from 'react-native';
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
let logger2 = logger.extend('AccountUpdate');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);

// Shortcuts
let jd = JSON.stringify;


/* Notes

We check to see if we need the user to supply extra information.

*/




let AccountUpdate = () => {

  let appState = useContext(AppStateContext);
  let [renderCount, triggerRender] = useState(0);
  let firstRender = misc.useFirstRender();
  let stateChangeID = appState.stateChangeID;

  let pageName = appState.pageName;
  let permittedPageNames = 'default'.split(' ');
  misc.confirmItemInArray('permittedPageNames', permittedPageNames, pageName, 'AccountUpdate');

  // Basic
  let pageTitle = 'Account Update';
  let [errorMessage, setErrorMessage] = useState('');
  let [isLoading, setIsLoading] = useState(true);

  // Input state
  let [remaining, setRemaining] = useState('');
  let [category, setCategory] = useState('');
  let [multipleChoice, setMultipleChoice] = useState(false);
  let [description, setDescription] = useState('');
  let [prompt, setPrompt] = useState('');
  let [options, setOptions] = useState([]);
  let [choices, setChoices] = useState({});
  let [disableConfirmButton, setDisableConfirmButton] = useState(false);




  // Initial setup.
  useEffect( () => {
    setup();
  }, []); // Pass empty array so that this only runs once on mount.


  let setup = async () => {
    try {
      await appState.generalSetup();
      await checkIfExtraInformationRequiredAndLoadIt();
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
      setIsLoading(false);
      triggerRender(renderCount+1);
    } catch(err) {
      let msg = `AccountUpdate.setup: Error = ${err}`;
      console.log(msg);
    }
  }


  let generateRemainingUpdatesText = ({n}) => {
    if (n === 0) return '';
    let plural = (n) === 1 ? '': 's';
    let text = `\n(${n} update${plural} remaining)`;
    return text;
  }


  let checkIfExtraInformationRequiredAndLoadIt = async () => {
    let apiRoute = 'user/extra_information/check';
    let result;
    try {
      let functionName = 'checkIfExtraInformationRequiredAndLoadIt';
      result = await appState.privateMethod({functionName, apiRoute});
    } catch(err) {
      logger.error(err);
    }
    //lj({result})
    if (result === 'DisplayedError') return;
    let n = result.length;
    if (n === 0) {
      let msg = `No extra information required.`;
      log(msg);
      return appState.moveToNextState();
    } else {
      let item = result[0]; // We display one item at a time, with its available options.
      setRemaining(generateRemainingUpdatesText({n}));
      setMultipleChoice(item.multiple_choice);
      setCategory(item.category);
      setDescription(item.description);
      setPrompt(item.prompt);
      setOptions(item.options);
      let newChoices = {};
      item.options.forEach( (x) => { newChoices[x.option_name] = false } );
      setChoices(newChoices);
    }
  }


  let confirmOption = async () => {
    setDisableConfirmButton(true);
    setErrorMessage('');
    let apiRoute = `user/extra_information/submit`;
    let choices2 = {
      category,
      option_names: _.keys(choices).filter(k => choices[k] === true)
    }
    let params = {choices: [choices2]};
    let result;
    try {
      let functionName = 'confirmOption';
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
      let detailName = 'extra_information';
      let selector = `ValidationError: [${detailName}]: `;
      errorMessage = error;
      if (error.startsWith(selector)) {
        errorMessage = error.replace(selector, '');
      }
      setErrorMessage(errorMessage);
      setDisableConfirmButton(false);
    } else {
      // Keep reloading the page until we have no more updates to make.
      setDisableConfirmButton(false);
      setup();
    }
  }


  let generateOptionsCheckboxList = () => {
    return (
      <View style={styles.OptionsWrapper}>
        {
          options.map( (option, i) => {
            //lj({option})
            let optionText = option.description;
            let optionValue = choices[option.option_name];
            let optionID = `option_${i}`;
            return (
              <View key={optionID} style={styles.optionWrapper}>
                <Checkbox.Item
                  label={optionText}
                  status={optionValue ? 'checked' : 'unchecked'}
                  style={styleCheckbox}
                  onPress={ () => {
                    let option_name = option.option_name;
                    let newValue = ! choices[option_name];
                    var msg = `option '${option_name}' set to ${newValue}`;
                    log(msg);
                    if (multipleChoice === false) {
                      setChoices({[option_name]: newValue});
                    } else {
                      setChoices({...choices, [option_name]: newValue});
                    }
                  }}
                />
              </View>
            )
          })
        }
      </View>
    );

  }


  return (
    <View style={styles.panelContainer}>
    <View style={styles.panelSubContainer}>

      <View style={[styles.heading, styles.heading1]}>
        <Text style={styles.headingText}>{pageTitle}</Text>
        <Text style={styles.mediumText}>{remaining}</Text>
      </View>

      {!! errorMessage &&
        <View style={styles.errorWrapper}>
          <Text style={styles.errorMessageText}>{errorMessage}</Text>
        </View>
      }


      <KeyboardAwareScrollView showsVerticalScrollIndicator={true} contentContainerStyle={{ flexGrow: 1, margin: 20 }} >

        { isLoading &&
          <Spinner/>
        }

        { ! isLoading &&

          <>

          <View>

            <Text style={[styles.mediumText, styles.bold]}>{description}{'\n'}</Text>

            <Text style={styles.basicText}>{prompt}{'\n'}</Text>

            {generateOptionsCheckboxList()}

            <View style={styles.confirmButtonWrapper}>
              <FixedWidthButton title="Confirm"
                onPress={ confirmOption }
                disabled={disableConfirmButton}
              />
            </View>

          </View>

          <Text style={styles.basicText}>If there is a problem, please contact the support team.</Text>

          <View style={styles.buttonWrapper}>
            <FixedWidthButton title="Contact Support"
              onPress={ () => { Linking.openURL(appState.supportURL) } }
              styles={styleContactButton}
            />
          </View>

          </>

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
    //borderWidth: 1, // testing
  },
  panelSubContainer: {
    paddingTop: scaledHeight(10),
    paddingHorizontal: scaledWidth(10),
    height: '100%',
    //borderWidth: 1, // testing
  },
  heading: {
    alignItems: 'center',
  },
  heading1: {
    marginTop: scaledHeight(10),
    marginBottom: scaledHeight(10),
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
  buttonWrapper: {
    marginVertical: scaledHeight(20),
  },
  OptionsWrapper: {
    //borderWidth: 1, //testing
  },
  optionWrapper: {
    marginBottom: scaledHeight(10),
  },
  confirmButtonWrapper: {
    marginTop: scaledHeight(10),
    marginBottom: scaledHeight(30),
  },
});


let styleCheckbox = StyleSheet.create({
  //width: '100%',
  //alignItems: 'center',
  borderWidth: 1, //testing
  borderRadius: scaledWidth(10),
  paddingVertical: scaledHeight(0),
  //justifyContent: 'center',
})


let styleContactButton = StyleSheet.create({
  view: {
    width: '70%',
  },
});


export default AccountUpdate;

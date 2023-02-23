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
import { Button, StandardButton, FixedWidthButton,  ImageButton, Spinner } from 'src/components/atomic';
import misc from 'src/util/misc';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('CloseSolidiAccount');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);


/* Notes


*/




let CloseSolidiAccount = () => {

  let appState = useContext(AppStateContext);
  let [renderCount, triggerRender] = useState(0);
  let firstRender = misc.useFirstRender();
  let stateChangeID = appState.stateChangeID;

  let pageName = appState.pageName;
  let permittedPageNames = 'default'.split(' ');
  misc.confirmItemInArray('permittedPageNames', permittedPageNames, pageName, 'CloseSolidiAccount');

  // More state
  let [errorMessage, setErrorMessage] = useState('');


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
      let msg = `CloseSolidiAccount.setup: Error = ${err}`;
      console.log(msg);
    }
  }
  let supportURL = "https://www.solidi.co/contactus";
  let blogURL = "https://blog.solidi.co/2021/02/20/closing-your-account/";

  return (
    <View style={styles.panelContainer}>
    <View style={styles.panelSubContainer}>

      <View style={[styles.heading, styles.heading1]}>
        <Text style={styles.headingText}>Delete Solidi Account</Text>
      </View>

      {!! errorMessage &&
        <View style={styles.errorWrapper}>
          <Text style={styles.errorMessageText}>{errorMessage}</Text>
        </View>
      }

      <KeyboardAwareScrollView showsVerticalScrollIndicator={true} contentContainerStyle={{ flexGrow: 1 }} >

      <View style={styles.question}>
      <Text style={[styles.basicText, styles.bold]}>We're sorry you wish to delete your account. If there is a problem, please contact the support team.</Text>
      <Text style={[styles.basicText, styles.bold]}></Text>
     <View style={styles.buttonWrapper}>
        <FixedWidthButton title="Contact Support"
          onPress={ () => { Linking.openURL(supportURL) } }
          styles={styleNormalButton}
        />
      </View>
      <Text style={[styles.basicText, styles.bold]}></Text>
      <Text style={[styles.basicText, styles.bold]}>Please note:</Text>
      <Text style={[styles.basicText, styles.bold]}>{'  \u2022' + " "}We cannot restore deleted accounts.</Text>
      <Text style={[styles.basicText, styles.bold]}>{'  \u2022' + " "}You cannot create a new account for 30 days.</Text>
      <Text style={[styles.basicText, styles.bold]}>{'  \u2022' + " "}Regulations may prevent us deleting your data.</Text>
      <Text style={[styles.basicText, styles.bold]}></Text>
      <Text style={[styles.basicText, styles.bold]}>To find out more about account deletion, please read our blog post - </Text>
      <Text style={[styles.basicText, styles.bold]}></Text>
     <View style={styles.buttonWrapper}>
        <FixedWidthButton title="Read the blog post"
          onPress={ () => { Linking.openURL(blogURL) } }
          styles={styleNormalButton}
        />
      </View>
      <Text style={[styles.basicText, styles.bold]}></Text>
      <Text style={[styles.basicText, styles.bold]}>If you still wish to delete your account, please click on the button below.</Text>
      <Text style={[styles.basicText, styles.bold]}></Text>
      
      </View>


      <View style={styles.buttonWrapper}>
        <FixedWidthButton title='Delete my Solidi account'
          onPress={ () => { appState.closeSolidiAccount() } }
          styles={styleCloseAccountButton}
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
    textAlign: 'center',

  },
  panelSubContainer: {
    paddingTop: scaledHeight(10),
    //paddingHorizontal: scaledWidth(30),
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
  question: {
    marginBottom: scaledHeight(40),
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
  buttonWrapper: {
    width: '100%',
    alignItems: 'center',
   },
  
  });


let styleNormalButton = StyleSheet.create({
  view: {
    width: '70%',

  },
});

let styleCloseAccountButton = StyleSheet.create({
  view: {
    backgroundColor: 'red',
    width: '70%',

  },
});


export default CloseSolidiAccount;

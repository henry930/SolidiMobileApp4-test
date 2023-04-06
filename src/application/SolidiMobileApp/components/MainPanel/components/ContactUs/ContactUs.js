// React imports
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Linking, Text, StyleSheet, View, ScrollView } from 'react-native';

// Other imports
import _ from 'lodash';
import Big from 'big.js';

// Internal imports
import AppStateContext from 'src/application/data';
import { colors } from 'src/constants';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import { Button, StandardButton, ImageButton, Spinner } from 'src/components/atomic';
import misc from 'src/util/misc';


/* Notes


*/




let ContactUs = () => {

  let appState = useContext(AppStateContext);
  let stateChangeID = appState.stateChangeID;

  let pageName = appState.pageName;
  let permittedPageNames = 'default'.split(' ');
  misc.confirmItemInArray('permittedPageNames', permittedPageNames, pageName, 'ContactUs');

  let domain = appState.domain;
  let {appTier, appVersion, appBuildNumber} = appState;
  if (appTier !== 'prod') appVersion += `-${appTier}`;
  let contactURL = 'https://solidi.co/contactus';


  // Initial setup.
  useEffect( () => {
    setup();
  }, []); // Pass empty array so that this only runs once on mount.


  let setup = async () => {
    try {
      await appState.generalSetup();
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
    } catch(err) {
      let msg = `ContactUs.setup: Error = ${err}`;
      console.log(msg);
    }
  }


  return (
    <View style={styles.panelContainer}>
    <View style={styles.panelSubContainer}>

      <View style={[styles.heading, styles.heading1]}>
        <Text style={styles.headingText}>Contact Us</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={{ flexGrow: 1 }} >

      <Text style={[styles.basicText, styles.bold]}>Please tap the button below to visit the Contact Us page on our website.</Text>

      <View style={styles.buttonSection}>
        <StandardButton title="Contact Us"
          onPress={ () => { Linking.openURL(contactURL) } }
          styles={styleLinkButton}
        />
      </View>

      <Text style={[styles.basicText, styles.bold]}>
      If you would like to contact us via another device, here are the details:{'\n'}{'\n'}
      {`\u2022  `}Website: {domain}{'\n'}
      {`\u2022  `}Contact Us: {contactURL}{'\n'}
      {`\u2022  `}App Version: {appVersion}{'\n'}
      {`\u2022  `}App Build Number: {appBuildNumber}
      </Text>

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
    marginBottom: scaledHeight(100),
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
  buttonSection: {
    marginVertical: scaledHeight(80),
  }
});


let styleLinkButton = StyleSheet.create({
  text: {
    margin: 0,
    padding: 0,
  },
});


export default ContactUs;

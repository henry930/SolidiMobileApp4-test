// React imports
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Text, StyleSheet, View, ScrollView } from 'react-native';

// Other imports
import _ from 'lodash';
import Big from 'big.js';

// Internal imports
import AppStateContext from 'src/application/data';
import { colors } from 'src/constants';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import { Button, StandardButton, FixedWidthButton, ImageButton, Spinner } from 'src/components/atomic';

import misc from 'src/util/misc';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('AccountRestricted');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);


/* Notes


*/




let AccountRestricted = () => {

  let appState = useContext(AppStateContext);
  let [renderCount, triggerRender] = useState(0);
  let firstRender = misc.useFirstRender();
  let stateChangeID = appState.stateChangeID;
  let [isLoading, setIsLoading] = useState(true);

  let pageName = appState.pageName;
  let permittedPageNames = 'default buy sell'.split(' ');
  misc.confirmItemInArray('permittedPageNames', permittedPageNames, pageName, 'AccountRestricted');
  if (pageName == 'default') pageName = 'buy';
  //pageName = 'sell'; //testing

  // Initial setup.
  useEffect( () => {
    setup();
  }, []); // Pass empty array so that this only runs once on mount.


  let setup = async () => {
    try {
      await appState.generalSetup();
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
      setIsLoading(false);
      triggerRender(renderCount+1);
    } catch(err) {
      let msg = `AccountRestricted.setup: Error = ${err}`;
      console.log(msg);
    }
  }

  return (
    <View style={styles.panelContainer}>
    <View style={styles.panelSubContainer}>

      <View style={[styles.heading, styles.heading1]}>
        <Text style={styles.headingText}>Account Restricted</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={{ flexGrow: 1 }} >

      <View style={styles.infoSection}>

        <View style={styles.infoItem}>
          <Text style={[styles.basicText, styles.bold]}>{'\n'} {`\u2022  `}We've detected some unusual activity on your account.</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={[styles.basicText, styles.importantText]}>{'\n'} {`\u2022  `}For your security we're placed a temporary restriction on your account.</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={[styles.basicText, styles.bold]}>{'\n'} {`\u2022  `}The support team have been notified and should contact you shorty with details on how to remove the restrictions on your account. Please check your email for any messages.</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={[styles.basicText, styles.bold]}>{'\n'} {`\u2022  `}You can contact the team directly:</Text>
        </View>

      </View>

        <View style={styles.buttonWrapper}>
          <FixedWidthButton styles={styleButton} title='Contact Support'
            onPress={ () => { appState.changeState('ContactUs'); } }
          />
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
  bold: {
    fontWeight: 'bold',
  },
  infoSection: {
    //borderWidth: 1, //testing
    //paddingTop: scaledHeight(10),
    alignItems: 'flex-start',
  },
  infoItem: {
    marginBottom: scaledHeight(5),
  },
  importantText: {
    fontWeight: 'bold',
    color: 'red',
  },
  buttonWrapper: {
    marginTop: scaledHeight(20),
  },
});

let styleButton = StyleSheet.create({
  view: {
    width: '70%',
  },
});

export default AccountRestricted;

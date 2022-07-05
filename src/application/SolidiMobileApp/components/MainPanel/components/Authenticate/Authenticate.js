// React imports
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Text, StyleSheet, View, ScrollView } from 'react-native';

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
let logger2 = logger.extend('Authenticate');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);


/* Notes

Future: "Log in with wallet" may become an option.
- Also: "Log in with facebook / google / linkedin" etc.

*/




let Authenticate = () => {

  let appState = useContext(AppStateContext);
  let [renderCount, triggerRender] = useState(0);
  let firstRender = misc.useFirstRender();
  let stateChangeID = appState.stateChangeID;

  let pageName = appState.pageName;
  let permittedPageNames = 'default'.split(' ');
  misc.confirmItemInArray('permittedPageNames', permittedPageNames, pageName, 'Authenticate');


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
      let msg = `Authenticate.setup: Error = ${err}`;
      console.log(msg);
    }
  }


  return (
    <View style={styles.panelContainer}>
    <View style={styles.panelSubContainer}>

      <View style={[styles.heading, styles.heading1]}>
        <Text style={styles.headingText}>Authenticate</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={{ flexGrow: 1 }} >

      { appState.panels.buy.activeOrder &&

        <View style={styles.infoSection}>
          <View style={styles.infoItem}>
            <Text style={styles.bold}>Your order has been saved.{'\n'}</Text>
          </View>
        </View>
      }

      <View style={styles.infoSection}>
        <View style={styles.infoItem}>
          <Text style={styles.bold}>To continue, please log in or register.</Text>
        </View>
      </View>

      <View style={styles.buttonsWrapper}>

        <StandardButton title="Log in"
          onPress={ () => { appState.changeState('Login') } }
        />

        <StandardButton title="Register"
          onPress={ () => { appState.changeState('Register') } }
          styles={styleRegisterButton}
        />

      </View>

      <Button title="Any problems? Contact us."
        onPress={ () => { appState.changeState('ContactUs') } }
      />

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
  bold: {
    fontWeight: 'bold',
  },
  infoSection: {
    //paddingTop: scaledHeight(20),
    alignItems: 'flex-start',
  },
  infoItem: {
    marginBottom: scaledHeight(5),
  },
  buttonsWrapper: {
    marginTop: scaledHeight(60),
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: scaledHeight(80),
  },
});


let styleRegisterButton = StyleSheet.create({
  view: {
    backgroundColor: 'purple',
  },
});


export default Authenticate;

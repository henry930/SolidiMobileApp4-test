// React imports
import React, { useContext, useEffect, useState } from 'react';
import { Text, StyleSheet, View } from 'react-native';

// Other imports
import _ from 'lodash';
import Big from 'big.js';

// Internal imports
import AppStateContext from 'src/application/data';
import { assetsInfo, mainPanelStates, colors } from 'src/constants';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import { Button, StandardButton, ImageButton, Spinner } from 'src/components/atomic';
import misc from 'src/util/misc';


/* Notes


*/




let BlankExampleComponent = () => {

  let appState = useContext(AppStateContext);
  let [isLoading, setIsLoading] = useState(true);
  let stateChangeID = appState.stateChangeID;

  let pageName = appState.pageName;
  let permittedPageNames = 'default'.split(' ');
  misc.confirmItemInArray('permittedPageNames', permittedPageNames, pageName, 'BlankExampleComponent');


  // Initial setup.
  useEffect( () => {
    setup();
  }, []); // Pass empty array so that we only run once on mount.


  let setup = async () => {
    // Avoid "Incorrect nonce" errors by doing the API calls sequentially.
    // await loadUserData();
    // await loadBalanceData();
    setIsLoading(false);
  }


  return (
    <View style={styles.panelContainer}>
    <View style={styles.panelSubContainer}>

      <View style={[styles.heading, styles.heading1]}>
        <Text style={styles.headingText}>BlankExampleComponent</Text>
      </View>

      <Text style={styles.bold}>{'\n'} {`\u2022  `} [some text]</Text>

      <View style={styles.infoSection}>

        <View style={styles.infoItem}>
          <Text style={styles.bold}>{`\u2022  `} [some details]</Text>
        </View>

      </View>

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
  infoSection: {
    paddingTop: scaledHeight(20),
    alignItems: 'flex-start',
  },
  infoItem: {
    marginBottom: scaledHeight(5),
  },
});


export default BlankExampleComponent;

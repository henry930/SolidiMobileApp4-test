// React imports
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Text, StyleSheet, View } from 'react-native';

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
let logger2 = logger.extend('BankAccounts');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);


/* Notes


*/




let BankAccounts = () => {

  let appState = useContext(AppStateContext);
  let [renderCount, triggerRender] = useState(0);
  let firstRender = misc.useFirstRender();
  let stateChangeID = appState.stateChangeID;
  let [isLoading, setIsLoading] = useState(true);

  let pageName = appState.pageName;
  let permittedPageNames = 'default'.split(' ');
  misc.confirmItemInArray('permittedPageNames', permittedPageNames, pageName, 'BankAccounts');


  let accountAsset = 'GBP';
  let account1 = appState.getDefaultAccountForAsset(accountAsset);


  // Initial setup.
  useEffect( () => {
    setup();
  }, []); // Pass empty array so that this only runs once on mount.


  let setup = async () => {
    await appState.loadUserInfo();
    if (appState.stateChangeIDHasChanged(stateChangeID)) return;
    setIsLoading(false);
    triggerRender(renderCount+1);
  }


  return (
    <View style={styles.panelContainer}>
    <View style={styles.panelSubContainer}>

      <View style={[styles.heading, styles.heading1]}>
        <Text style={styles.headingText}>Bank Account</Text>
      </View>

      { isLoading && <Spinner/> }

      { ! isLoading &&

        <View style={styles.bankAccount}>
          <Text style={styles.bankAccountText}>Bank Account: {'\n'}</Text>
          <Text style={styles.bankAccountText}>{`\u2022  `} {account1.accountName}</Text>
          <Text style={styles.bankAccountText}>{`\u2022  `} Sort Code: {account1.sortCode}</Text>
          <Text style={styles.bankAccountText}>{`\u2022  `} Account Number: {account1.accountNumber}</Text>
          <Text style={styles.bankAccountText}>{`\u2022  `} Currency: {appState.getAssetInfo(accountAsset).displayString}</Text>
        </View>

      }

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
  bankAccount: {
    marginTop: scaledHeight(60),
    padding: scaledWidth(20),
    paddingTop: scaledWidth(15),
    borderWidth: 1,
  },
  bankAccountText: {
    marginTop: scaledHeight(5),
    fontWeight: 'bold',
    fontSize: normaliseFont(16),
  },
});


export default BankAccounts;

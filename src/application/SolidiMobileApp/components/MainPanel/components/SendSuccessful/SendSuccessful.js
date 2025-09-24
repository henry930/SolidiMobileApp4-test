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
import { Button, StandardButton, ImageButton, Spinner } from 'src/components/atomic';
import misc from 'src/util/misc';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('SendSuccessful');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);


/* Notes


*/




let SendSuccessful = () => {

  let appState = useContext(AppStateContext);
  let [renderCount, triggerRender] = useState(0);
  let firstRender = misc.useFirstRender();
  let stateChangeID = appState.stateChangeID;

  let pageName = appState.pageName;
  let permittedPageNames = 'default'.split(' ');
  misc.confirmItemInArray('permittedPageNames', permittedPageNames, pageName, 'SendSuccessful');

  // Testing
  if (appState.appTier == 'dev' && appState.panels.send.volume == null) {
    // Create an order.
    _.assign(appState.panels.send, {volume: '10.00', asset: 'GBP', priority: 'low', addressProperties: {accountName: 'Marge Fish', sortCode: '12-12-33', accountNumber: '11231123'}});
    appState.panels.buy.activeOrder = true;
  }

  // Load transfer details.
  ({asset, volume, addressProperties, priority} = appState.panels.send);




  // Initial setup.
  useEffect( () => {
    setup();
  }, []); // Pass empty array so that this only runs once on mount.


  let setup = async () => {
    try {
      await appState.generalSetup();
      await appState.loadBalances();
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
      triggerRender(renderCount+1);
    } catch(err) {
      let msg = `Send.setup: Error = ${err}`;
      console.log(msg);
    }
  }


  let getBalanceString = () => {
    let b = appState.getBalance(asset);
    let result = b;
    if (misc.isNumericString(b)) result += ' ' + asset;
    return result;
  }


  return (
    <View style={styles.panelContainer}>
    <View style={styles.panelSubContainer}>

      <View style={[styles.heading, styles.heading1]}>
        <Text style={styles.headingText}>Send successful!</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={{ flexGrow: 1 }} >

      <View style={[styles.infoSection, styles.infoSection1]}>

        <View style={styles.infoItem}>
          <Text style={[styles.basicText, styles.bold]}>{`\u2022  `} Your transfer of {volume} {appState.getAssetInfo(asset).displayString} has been processed.</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={[styles.basicText, styles.bold]}>{`\u2022  `} Your new balance is: {getBalanceString()}</Text>
        </View>

      </View>

      <View style={styles.horizontalRule}/>

      <View style={styles.transferDetailsSection}>

      <View style={[styles.heading, styles.heading2]}>
        <Text style={styles.headingText}>Destination details</Text>
      </View>

        {_.has(addressProperties, 'address') &&
          /* The address is quite long, so put its heading on the previous line. */
          <View style={[styles.transferDetailsLine, {justifyContent:'flex-start'}]}>
            <Text style={styles.basicText}>Address:</Text>
          </View>
        }
        {_.has(addressProperties, 'address') &&
          <View style={[styles.transferDetailsLine, {justifyContent:'flex-end'}]}>
            <Text style={[styles.basicText, styles.bold]}>{addressProperties.address}</Text>
          </View>
        }

        {_.has(addressProperties, 'accountName') &&
          <View style={styles.transferDetailsLine}>
            <Text style={styles.basicText}>Account Name:</Text>
            <Text style={[styles.basicText, styles.bold]}>{addressProperties.accountName}</Text>
          </View>
        }

        {_.has(addressProperties, 'sortCode') &&
          <View style={styles.transferDetailsLine}>
            <Text style={styles.basicText}>Sort Code:</Text>
            <Text style={[styles.basicText, styles.bold]}>{addressProperties.sortCode}</Text>
          </View>
        }

        {_.has(addressProperties, 'accountNumber') &&
          <View style={styles.transferDetailsLine}>
            <Text style={styles.basicText}>Account Number:</Text>
            <Text style={[styles.basicText, styles.bold]}>{addressProperties.accountNumber}</Text>
          </View>
        }

        {_.has(addressProperties, 'destinationTag') &&
          <View style={styles.transferDetailsLine}>
            <Text style={styles.basicText}>Destination Tag:</Text>
            <Text style={[styles.basicText, styles.bold]}>{addressProperties.destinationTag}</Text>
          </View>
        }

        {_.has(addressProperties, 'BIC') &&
          <View style={styles.transferDetailsLine}>
            <Text style={styles.basicText}>BIC:</Text>
            <Text style={[styles.basicText, styles.bold]}>{addressProperties.BIC}</Text>
          </View>
        }

        {_.has(addressProperties, 'IBAN') &&
          /* The IBAN is quite long, so put its heading on the previous line. */
          <View style={[styles.transferDetailsLine, {justifyContent:'flex-start'}]}>
            <Text style={styles.basicText}>IBAN:</Text>
          </View>
        }
        {_.has(addressProperties, 'IBAN') &&
          <View style={[styles.transferDetailsLine, {justifyContent:'flex-end'}]}>
            <Text style={[styles.basicText, styles.bold]}>{addressProperties.IBAN}</Text>
          </View>
        }

      </View>

      <View style={styles.horizontalRule}/>

      <View style={styles.button}>
        <StandardButton title="Send another asset" onPress={ () => appState.changeState('Send') } />
      </View>

      <View style={styles.button2}>
        <StandardButton title="Trade assets" onPress={ () => appState.changeState('Trade') } />
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
  },
  heading2: {
    marginVertical: scaledHeight(20),
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
  infoSection1: {
    marginBottom: scaledHeight(20),
  },
  infoSection: {
    paddingTop: scaledHeight(20),
    alignItems: 'flex-start',
  },
  infoItem: {
    marginBottom: scaledHeight(5),
  },
  horizontalRule: {
    borderBottomColor: 'black',
    borderBottomWidth: 1,
    marginHorizontal: scaledWidth(30),
  },
  transferDetailsSection: {
    marginBottom: scaledHeight(20),
  },
  transferDetailsLine: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    marginTop: scaledHeight(20),
  },
  button2: {
    marginTop: scaledHeight(20),
  },
});


export default SendSuccessful;

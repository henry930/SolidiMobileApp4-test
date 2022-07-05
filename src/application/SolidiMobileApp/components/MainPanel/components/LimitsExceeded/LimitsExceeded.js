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
let logger2 = logger.extend('LimitsExceeded');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);


/* Notes


*/




let LimitsExceeded = () => {

  let appState = useContext(AppStateContext);
  let [renderCount, triggerRender] = useState(0);
  let firstRender = misc.useFirstRender();
  let stateChangeID = appState.stateChangeID;
  let [isLoading, setIsLoading] = useState(true);

  let pageName = appState.pageName;
  let permittedPageNames = 'default buy sell'.split(' ');
  misc.confirmItemInArray('permittedPageNames', permittedPageNames, pageName, 'LimitsExceeded');
  if (pageName == 'default') pageName = 'buy';
  //pageName = 'sell'; //testing

  // Testing
  if (appState.appTier == 'dev' && pageName == 'buy' && appState.panels.buy.volumeQA == '0') {
    log("TESTING - Buy");
    // Create an order.
    _.assign(appState.panels.buy, {
      volumeQA: '10.00', assetQA: 'GBP', volumeBA: '0.00062890', assetBA: 'BTC',
      output: { asset: 'GBP', periodDays: 1, result: 'EXCEEDS_LIMITS', volumeLimit: '30.00',volumeRemaining: '0.00'},
    });
    appState.panels.buy.activeOrder = true;
  }
  if (appState.appTier == 'dev' && pageName == 'sell' && appState.panels.sell.volumeQA == '0') {
    log("TESTING - Sell");
    // Create an order.
    _.assign(appState.panels.sell, {
      volumeQA: '10.00', assetQA: 'GBP', volumeBA: '0.00062890', assetBA: 'BTC',
      output: { asset: 'GBP', periodDays: 1, result: 'EXCEEDS_LIMITS', volumeLimit: '30.00',volumeRemaining: '0.00'},
    });
    appState.panels.sell.activeOrder = true;
  }

  // Load order details.
  let side = pageName;
  ({volumeQA, volumeBA, assetQA, assetBA, output: orderOutput} = appState.panels[side]);


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
      let msg = `LimitsExceeded.setup: Error = ${err}`;
      console.log(msg);
    }
  }


  let generateOrderDescription = () => {
    let s = 'Your order: ';
    if (isLoading) return s;
    let assetBAString = appState.getAssetInfo(assetBA).displayString;
    let assetQAString = appState.getAssetInfo(assetQA).displayString;
    s += `${misc.capitalise(side)} ${volumeBA} ${assetBAString} for ${volumeQA} ${assetQAString}`;
    return s;
  }


  let generateLimitDescription = () => {
    let volumeLimit = orderOutput.volumeLimit;
    let volumeRemaining = orderOutput.volumeRemaining;
    let s = `Your 30-day transfer limit is ${volumeLimit} ${assetQA}.`;
    s += ` Your remaining amount is ${volumeRemaining} ${assetQA}.`;
    if (isLoading) return s;
    let quoteDP = appState.getAssetInfo(assetQA).decimalPlaces;
    let refreshAmount = Big(volumeLimit).div('30').toFixed(quoteDP);
    s += ` Every day, the amount you can spend increases by ${refreshAmount} ${assetQA} (1/30 of your transfer limit).`;
    return s;
  }


  let increaseLimits = () => {
    // In future, we'll query the API to find the user's current status, and choose between different pathways. For now, just upload ID documents.
    appState.changeState('IdentityVerification');
  }


  return (
    <View style={styles.panelContainer}>
    <View style={styles.panelSubContainer}>

      <View style={[styles.heading, styles.heading1]}>
        <Text style={styles.headingText}>Limits Exceeded</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={{ flexGrow: 1 }} >

      <View style={styles.infoSection}>

        <View style={styles.infoItem}>
          <Text style={styles.importantText}>{'\n'} {`\u2022  `} Unfortunately, your order has exceeded your transfer limits.</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.bold}>{`\u2022  `} {generateOrderDescription()}</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.bold}>{`\u2022  `} {generateLimitDescription()}</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.bold}>{`\u2022  `} Option 1: You can wait for your transfer limit to refresh.</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.bold}>{`\u2022  `} Option 2: You can increase your limits by clicking the button below.</Text>
        </View>

      </View>

      <View style={styles.buttonWrapper}>
        <StandardButton title="Increase your limits" onPress={ increaseLimits } />
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


export default LimitsExceeded;

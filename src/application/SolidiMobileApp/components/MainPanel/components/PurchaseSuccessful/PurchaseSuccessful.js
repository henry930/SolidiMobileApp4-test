// React imports
import React, { useContext, useEffect, useState } from 'react';
import { Linking, Text, StyleSheet, View, ScrollView } from 'react-native';

// Other imports
import _ from 'lodash';
import Big from 'big.js';

// Internal imports
import AppStateContext from 'src/application/data';
import { colors } from 'src/constants';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import { Button, StandardButton, ImageButton } from 'src/components/atomic';
import misc from 'src/util/misc';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('PurchaseSuccessful');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);




let PurchaseSuccessful = () => {

  let appState = useContext(AppStateContext);
  let [renderCount, triggerRender] = useState(0);
  let stateChangeID = appState.stateChangeID;
  let [isLoading, setIsLoading] = useState(true);

  // State
  let [order, setOrder] = useState({});

  // Testing
  if (appState.appTier == 'dev' && appState.panels.buy.volumeQA == '0') {
    log("TESTING");
    // Note: Need to adjust the orderID value to be the orderID of an actual order in the database.
    appState.changeStateParameters.orderID = 7179;
  }

  let trustpilotURL = 'https://www.trustpilot.com/evaluate/solidi.co?stars=5';




  // Initial setup.
  useEffect( () => {
    setup();
  }, []); // Pass empty array so that we only run once on mount.


  let setup = async () => {
    try {
      await appState.generalSetup();
      await appState.loadOrders();
      let orderID = appState.changeStateParameters.orderID;
      log(`Stored orderID: ${orderID}`);
      let order = appState.getOrder({orderID});
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
      setOrder(order);
      setIsLoading(false);
      triggerRender(renderCount+1);
    } catch(err) {
      let msg = `PurchaseSuccessful.setup: Error = ${err}`;
      console.log(msg);
    }
  }


  let getTotalQAStr = () => {
    /* We get the volumeQA value.
    - Within Solidi, the fees are subtracted from this value, but this doesn't change the "total amount paid" from the user's point of view here.
    */
    let s = '';
    let requiredKeys = 'market baseVolume quoteVolume'.split(' ');
    if (requiredKeys.every(k => k in order)) {
      let [assetBA, assetQA] = order.market.split('/');
      let assetInfo = appState.getAssetInfo(assetQA);
      let volumeQA = order.quoteVolume;
      s += appState.getFullDecimalValue({asset: assetQA, value: volumeQA, functionName: 'getTotalQAStr'});
      s += ' ' + assetInfo.displayString;
    } else {
      s = '[loading]';
    }
    return s;
  }


  let getVolumeBAStr = () => {
    let s = '';
    let requiredKeys = 'market baseVolume quoteVolume'.split(' ');
    if (requiredKeys.every(k => k in order)) {
      let [assetBA, assetQA] = order.market.split('/');
      let assetInfo = appState.getAssetInfo(assetBA);
      let volumeBA = order.baseVolume;
      s += appState.getFullDecimalValue({asset: assetBA, value: volumeBA, functionName: 'getTotalBAStr'});
      s += ' ' + assetInfo.displayString;
    } else {
      s = '[loading]';
    }
    return s;
  }


  let viewAssets = () => {
    let pageName = appState.getAssetInfo(assetBA).type; // 'crypto' or 'fiat'.
    appState.changeState('Assets', pageName);
  }


  let buyAgain = () => {
    appState.changeState('Trade');
  }


  return (
    <View style={styles.panelContainer}>
    <View style={styles.panelSubContainer}>

      <View style={[styles.heading, styles.heading1]}>
        <Text style={styles.headingText}>Purchase successful!</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={{ flexGrow: 1 }} >

      <View style={styles.infoSection}>

        <View style={styles.infoItem}>
          <Text style={[styles.basicText, styles.bold]}>{`\u2022  `} Your payment of {getTotalQAStr()} has been processed.</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={[styles.basicText, styles.bold]}>{`\u2022  `} Your Solidi account has been credited with {getVolumeBAStr()}.</Text>
        </View>

      </View>

      <View style={styles.button}>
        <StandardButton title="View your assets" onPress={ viewAssets } />
      </View>

      <View style={styles.button2}>
        <StandardButton title="Buy another asset" onPress={ buyAgain } />
      </View>

      <View style={[styles.heading, styles.heading2]}>
        <Text style={styles.headingText}>Please review us on Trustpilot!</Text>
      </View>

      <View style={styles.infoSection2}>

        <View style={styles.infoItem}>
          <Text style={[styles.basicText, styles.bold]}>Every review helps build trust with our new customers. Tap the Trustpilot logo below to review us. Thanks!</Text>
        </View>

      </View>

      <View style={styles.buttonWrapper}>
        <ImageButton imageName='trustpilot'
          styles={styleTrustpilotButton}
          onPress={ () => { Linking.openURL(trustpilotURL) } }
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
  },
  heading2: {
    marginTop: scaledHeight(40),
  },
  headingText: {
    fontSize: normaliseFont(20),
    fontWeight: 'bold',
  },
  infoSection: {
    paddingVertical: scaledHeight(20),
    alignItems: 'flex-start',
  },
  infoSection2: {
    paddingTop: scaledHeight(10),
    alignItems: 'flex-start',
  },
  infoItem: {
    marginBottom: scaledHeight(5),
  },
  basicText: {
    fontSize: normaliseFont(14),
  },
  bold: {
    fontWeight: 'bold',
  },
  button: {

  },
  button2: {
    marginTop: scaledHeight(20),
  },
  buttonWrapper: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
});


let styleTrustpilotButton = StyleSheet.create({
  image: {
    width: '100%',
  },
  view: {
    width: scaledWidth(300),
    height: scaledHeight(120),
  },
});


export default PurchaseSuccessful;

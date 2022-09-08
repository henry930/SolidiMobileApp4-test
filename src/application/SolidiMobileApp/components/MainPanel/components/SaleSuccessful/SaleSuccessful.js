// React imports
import React, { useContext, useEffect, useState } from 'react';
import { Linking, Text, StyleSheet, View, ScrollView } from 'react-native';

// Other imports
import _ from 'lodash';
import Big from 'big.js';

// Internal imports
import AppStateContext from 'src/application/data';
import { mainPanelStates, colors } from 'src/constants';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import { Button, StandardButton, ImageButton } from 'src/components/atomic';
import misc from 'src/util/misc';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('SaleSuccessful');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);




let SaleSuccessful = () => {

  let appState = useContext(AppStateContext);
  let [renderCount, triggerRender] = useState(0);
  let stateChangeID = appState.stateChangeID;
  let [isLoading, setIsLoading] = useState(true);

  let pageName = appState.pageName;
  if (pageName == 'default') pageName = 'balance';
  let permittedPageNames = 'solidi balance'.split(' ');
  misc.confirmItemInArray('permittedPageNames', permittedPageNames, pageName, 'SaleSuccessful');

  // State
  let [order, setOrder] = useState({});

  // Testing (for if we load this page directly).
  if (appState.appTier == 'dev' && appState.panels.sell.volumeQA == '0') {
    appState.panels.sell.orderID = 7177; // Need to adjust this to be the orderID of an actual order in the database.
    appState.changeStateParameters.orderID = appState.panels.sell.orderID;
  }

  let trustpilotURL = 'https://www.trustpilot.com/evaluate/solidi.co?stars=5';




  // Initial setup.
  useEffect( () => {
    setup();
  }, []); // Pass empty array so that this only runs once on mount.


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
      let msg = `SaleSuccessful.setup: Error = ${err}`;
      console.log(msg);
    }
  }


  let getTotalQAStr = () => {
    /* We get the volumeQA value.
    - Future: Confirm whether or not the fee value has been subtracted within the API from this value.
    -- If so, the order info needs to change to include the fee value and the totalQA value, and we need to return the totalQA value from this function.
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


  let sellAgain = () => {
    appState.changeState('Sell');
  }


  let buyAgain = () => {
    appState.changeState('Buy');
  }


  return (
    <View style={styles.panelContainer}>
    <View style={styles.panelSubContainer}>

      <View style={[styles.heading, styles.heading1]}>
        <Text style={styles.headingText}>Sale successful!</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={{ flexGrow: 1 }} >

      <View style={styles.infoSection}>

        <View style={styles.infoItem}>
          <Text style={[styles.basicText, styles.bold]}>{`\u2022  `} Your sale of {getVolumeBAStr()} has been processed.</Text>
        </View>

        { (pageName == 'balance') &&

          <View style={styles.infoItem}>
            <Text style={[styles.basicText, styles.bold]}>{`\u2022  `} Your Solidi account has been credited with {getTotalQAStr()}.</Text>
          </View>

        }

        { (pageName == 'solidi') &&

          <View style={styles.infoItem}>
            <Text style={[styles.basicText, styles.bold]}>{`\u2022  `} Your payment of {getTotalQAStr()} should arrive within 8 hours.</Text>
          </View>

        }

      </View>

      <View style={styles.button}>
        <StandardButton title="View your assets" onPress={ viewAssets } />
      </View>

      <View style={styles.button2}>
        <StandardButton title="Sell another asset" onPress={ sellAgain } />
      </View>

      <View style={styles.button3}>
        <StandardButton title="Buy an asset" onPress={ buyAgain } />
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
  basicText: {
    fontSize: normaliseFont(14),
  },
  bold: {
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
  button: {

  },
  button2: {
    marginTop: scaledHeight(20),
  },
  button3: {
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


export default SaleSuccessful;

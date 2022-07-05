// React imports
import React, { useContext, useEffect, useState } from 'react';
import { Text, StyleSheet, View, ScrollView } from 'react-native';

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
let logger2 = logger.extend('InsufficientBalance');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);




let InsufficientBalance = () => {

  let appState = useContext(AppStateContext);

  /* We can arrive at this component due to:
  - trying to submit an buy order and pay with our balance, and we don't have enough.
  - trying to submit a sell order for an amount that we don't have.
  - trying to make a withdrawal that is too large.
  */
  let pageName = appState.pageName;
  //if (pageName == 'default') pageName = 'buy'; // For testing.
  let permittedPageNames = 'buy sell withdraw'.split(' ');
  misc.confirmItemInArray('permittedPageNames', permittedPageNames, pageName, 'InsufficientBalance');

  // Testing
  if (appState.appTier == 'dev' && appState.panels.buy.volumeQA == '0') {
    _.assign(appState.panels.buy, {volumeQA: '100', assetQA: 'GBP', volumeBA: '0.05', assetBA: 'BTC', feeQA: '0.50', totalQA: '100.50'});
    _.assign(appState.panels.sell, {volumeQA: '100', assetQA: 'GBP', volumeBA: '0.05', assetBA: 'BTC', feeQA: '0.50', totalQA: '99.50'});
    _.assign(appState.apiData, {
      balance: {
        BTC: "0.00000000",
        GBP: "8900.00000000",
      },
    });
  }

  // Load order details.
  let volumeQA, volumeBA, assetQA, assetBA, feeQA, totalQA;
  if (pageName == 'buy') {
    ({volumeQA, volumeBA, assetQA, assetBA, feeQA, totalQA} = appState.panels.buy);
  } else if (pageName == 'sell') {
    ({volumeQA, volumeBA, assetQA, assetBA, feeQA, totalQA} = appState.panels.sell);
  }

  // We assume that prior to loading this component, (i.e. during previous pageloads), we have retrieved the balances from the API. So, here we can just load them directly.
  let balanceBA = appState.getBalance(assetBA);
  let balanceQA = appState.getBalance(assetQA);
  let baseDP = appState.getAssetInfo(assetBA).decimalPlaces;
  let quoteDP = appState.getAssetInfo(assetQA).decimalPlaces;
  let balanceString, volumeString, diffString;
  if (pageName == 'buy') {
    balanceString = Big(balanceQA).toFixed(quoteDP) + ' ' + assetQA;
    volumeString = Big(totalQA).toFixed(quoteDP) + ' ' + assetQA;
    diffString = Big(totalQA).minus(Big(balanceQA)).toFixed(quoteDP) + ' ' + assetQA;
  } else if (pageName == 'sell') {
    balanceString = Big(balanceBA).toFixed(baseDP) + ' ' + assetBA;
    volumeString = Big(volumeBA).toFixed(baseDP) + ' ' + assetBA;
    diffString = Big(volumeBA).minus(Big(balanceBA)).toFixed(baseDP) + ' ' + assetBA;
  }




  // Initial setup.
  useEffect( () => {
    setup();
  }, []); // Pass empty array so that this only runs once on mount.


  let setup = async () => {
    try {
      await appState.generalSetup();
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
    } catch(err) {
      let msg = `InsufficientBalance.setup: Error = ${err}`;
      console.log(msg);
    }
  }


  let payDirectly = () => {
    appState.changeState('ChooseHowToPay', 'solidi');
  }

  let makeDeposit = () => {
    let asset;
    if (pageName == 'buy') asset = assetQA;
    if (pageName == 'sell') asset = assetBA;
    //appState.changeState('Receive', asset); // Future
    appState.changeState('Receive');
  }

  let getOrderDetails = () => {
    let details = '';
    let displayStringBA = appState.getAssetInfo(assetBA).displayString;
    let displayStringQA = appState.getAssetInfo(assetQA).displayString;
    if (pageName == 'buy') {
      details += `Buy ${volumeBA} ${displayStringBA} for ${totalQA} ${displayStringQA}.`;
    } else if (pageName == 'sell') {
      details += `Sell ${volumeBA} ${displayStringBA} to get ${totalQA} ${displayStringQA}.`;
    }
    return details;
  }

  let sellBalanceBA = () => {
    // Go back to the sell page.
    appState.changeState('Sell', 'loadExistingOrder');
  }

  return (
    <View style={styles.panelContainer}>
    <View style={styles.panelSubContainer}>

      <View style={[styles.heading, styles.heading1]}>
        <Text style={styles.headingText}>Insufficient balance</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={{ flexGrow: 1 }} >

      <Text>Order details: {getOrderDetails()}</Text>

      <View style={styles.infoSection}>

        <View style={styles.infoItem}>
          <Text style={styles.bold}>{`\u2022  `} Your Solidi balance: {balanceString}</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.bold}>{`\u2022  `} The required amount: {volumeString}</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.bold}>{`\u2022  `} The missing amount: {diffString}</Text>
        </View>

      </View>

      <View style={styles.infoSection}>
        <View style={styles.infoItem}>
          <Text>Sorry!</Text>
        </View>
      </View>

      {(pageName == 'buy') &&

        <View style={styles.optionList}>

          <View style={styles.infoSection}>

            <View style={styles.infoItem}>
              <Text style={styles.bold}>Option 1:</Text>
              <Text>{'\n'}Go back and pay for the order using your online banking.</Text>
            </View>

            <View style={styles.button}>
              <StandardButton title="Go back" onPress={ payDirectly } />
            </View>

          </View>

          <View style={styles.infoSection}>

            <View style={styles.infoItem}>
              <Text style={styles.bold}>Option 2:</Text>
              <Text>{'\n'}Increase your {assetQA} balance by making a deposit.</Text>
            </View>

            <View style={styles.button}>
              <StandardButton title="Make a deposit" onPress={ makeDeposit } />
            </View>

          </View>

        </View>

      }

      {pageName == 'sell' &&

        <View style={styles.optionList}>

          <View style={styles.infoSection}>

            <View style={styles.infoItem}>
              <Text style={styles.bold}>Option 1:</Text>
              <Text>{'\n'}Go back and change the amount you wish to sell.</Text>
            </View>

            <View style={styles.button}>
              <StandardButton title="Go back" onPress={ sellBalanceBA } />
            </View>

          </View>

          <View style={styles.infoSection}>

            <View style={styles.infoItem}>
              <Text style={styles.bold}>Option 2:</Text>
              <Text>{'\n'}Increase your {assetBA} balance by making a deposit.</Text>
            </View>

            <View style={styles.button}>
              <StandardButton title="Make a deposit" onPress={ makeDeposit } />
            </View>

          </View>

        </View>

      }

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
    marginBottom: scaledHeight(20),
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
  button: {
    marginTop: scaledHeight(10),
  },
});


export default InsufficientBalance;

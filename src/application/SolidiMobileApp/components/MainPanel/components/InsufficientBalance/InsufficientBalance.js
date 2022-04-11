// React imports
import React, { useContext, useEffect, useState } from 'react';
import { Text, StyleSheet, View } from 'react-native';

// Other imports
import _ from 'lodash';
import Big from 'big.js';

// Internal imports
import AppStateContext from 'src/application/data';
import { mainPanelStates, colors } from 'src/constants';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import { Button, StandardButton, ImageButton } from 'src/components/atomic';
import misc from 'src/util/misc';




let InsufficientBalance = () => {

  let appState = useContext(AppStateContext);

  /* We can arrive at this component due to:
  - trying to submit an buy order and pay with our balance, and we don't have enough.
  - trying to submit a sell order for an amount that we don't have.
  - trying to make a withdrawal that is too large.
  */
  let pageName = appState.pageName;
  let permittedPageNames = 'buy sell withdraw'.split(' ');
  misc.confirmItemInArray('permittedPageNames', permittedPageNames, pageName, 'InsufficientBalance');

  // Testing:
  _.assign(appState.panels.buy, {volumeQA: '100', assetQA: 'GBP', volumeBA: '0.05', assetBA: 'BTC'});
  _.assign(appState.panels.sell, {volumeQA: '100', assetQA: 'GBP', volumeBA: '0.05', assetBA: 'BTC'});
  _.assign(appState.apiData, {
    balance: {
      BTC: "0.00000000",
      GBP: "8900.00000000",
    },
  });

  // Load order details.
  let volumeQA, volumeBA, assetQA, assetBA;
  if (pageName == 'buy') {
    ({volumeQA, volumeBA, assetQA, assetBA} = appState.panels.buy);
  } else if (pageName == 'sell') {
    ({volumeQA, volumeBA, assetQA, assetBA} = appState.panels.sell);
  }

  // We assume that prior to loading this component, (i.e. during previous pageloads), we have retrieved the balances from the API. So, here we can just load them directly.
  let balanceBA = appState.getBalance(assetBA);
  let balanceQA = appState.getBalance(assetQA);
  let dpBA = appState.getAssetInfo(assetBA).decimalPlaces;
  let dpQA = appState.getAssetInfo(assetQA).decimalPlaces;
  let balanceString, volumeString, diffString;
  if (pageName == 'buy') {
    balanceString = Big(balanceQA).toFixed(dpQA);
    volumeString = Big(volumeQA).toFixed(dpQA);
    diffString = Big(volumeQA).minus(Big(balanceQA)).toFixed(dpQA);
  } else if (pageName == 'sell') {
    balanceString = Big(balanceBA).toFixed(dpBA);
    volumeString = Big(volumeBA).toFixed(dpBA);
    diffString = Big(volumeBA).minus(Big(balanceBA)).toFixed(dpBA);
  }

  let payDirectly = () => {
    appState.changeState('ChooseHowToPay', 'direct_payment');
  }

  let makeDeposit = () => {
    let asset;
    if (pageName == 'buy') asset = appState.getAssetInfo(assetQA).displaySymbol;
    if (pageName == 'sell') asset = appState.getAssetInfo(assetBA).displaySymbol;
    //appState.changeState('Receive', asset); // Future
    appState.changeState('Receive');
  }

  let getOrderDetails = () => {
    let details = '';
    let displayStringBA = appState.getAssetInfo(assetBA).displayString;
    let displayStringQA = appState.getAssetInfo(assetQA).displayString;
    if (pageName == 'buy') {
      details += `Buy ${volumeBA} ${displayStringBA} for ${volumeQA} ${displayStringQA}.`;
    } else if (pageName == 'sell') {
      details += `Sell ${volumeBA} ${displayStringBA} to get ${volumeQA} ${displayStringQA}.`;
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

      <Text>Order details: {getOrderDetails()}</Text>

      <View style={styles.infoSection}>

        <View style={styles.infoItem}>
          <Text style={styles.bold}>{`\u2022  `} Your Solidi balance: {balanceString} {assetQA}</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.bold}>{`\u2022  `} The required amount: {volumeString} {assetQA}</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.bold}>{`\u2022  `} The missing amount: {diffString} {assetQA}</Text>
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
              <Text>{'\n'}Increase your {appState.getAssetInfo(assetQA).displaySymbol} balance by making a deposit.</Text>
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

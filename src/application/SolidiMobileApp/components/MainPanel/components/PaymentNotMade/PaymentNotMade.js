// React imports
import React, { useContext, useEffect, useState } from 'react';
import { Text, StyleSheet, View, ScrollView } from 'react-native';

// Other imports
import _ from 'lodash';

// Internal imports
import AppStateContext from 'src/application/data';
import { mainPanelStates, colors } from 'src/constants';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import { Button, StandardButton, ImageButton } from 'src/components/atomic';
import misc from 'src/util/misc';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('PaymentNotMade');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);


/* Notes

- We use this component to also display "paymentNotReceived", if the user clicks "I have paid", but 2 hours pass without us receiving the payment.

- On the server, every so often, unpaid (but filled) orders will be cancelled.

*/




let PaymentNotMade = () => {

  let appState = useContext(AppStateContext);
  let stateChangeID = appState.stateChangeID;

  let pageName = appState.pageName;
  let permittedPageNames = 'default paymentNotReceived'.split(' ');
  misc.confirmItemInArray('permittedPageNames', permittedPageNames, pageName, 'PaymentNotMade');

  // Change some values, depending on the pageName.
  let headingText = 'Payment not made';
  let timePeriod = '30 minutes';
  if (pageName == 'paymentNotReceived') {
    headingText = 'Payment not received';
    timePeriod = '2 hours';
  }

  // Testing (for if we load this page directly).
  if (appState.appTier == 'dev' && appState.panels.buy.volumeQA == '0') {
    // Create an order.
    _.assign(appState.panels.buy, {volumeQA: '10.00', assetQA: 'GBP', volumeBA: '0.00036922', assetBA: 'BTC', feeQA: '0.50', totalQA: '10.50'});
    appState.panels.buy.activeOrder = true;
    appState.panels.buy.orderID = 7200;
  }

  // Load order details.
  ({volumeQA, volumeBA, assetQA, assetBA, feeQA, totalQA} = appState.panels.buy);


  // Initial setup.
  useEffect( () => {
    setup();
  }, []); // Pass empty array so that this only runs once on mount.


  let setup = async () => {
    try {
      await appState.generalSetup();
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
    } catch(err) {
      let msg = `PaymentNotMade.setup: ${err}`;
      console.log(msg);
    }
  }

  let viewAssets = () => {
    let pageName = appState.getAssetInfo(assetQA).type; // 'crypto' or 'fiat'.
    appState.changeState('Assets', pageName);
  }

  let buyAgain = () => {
    appState.changeState('Buy');
  }


  return (
    <View style={styles.panelContainer}>
    <View style={styles.panelSubContainer}>

      <View style={[styles.heading, styles.heading1]}>
        <Text style={styles.headingText}>{headingText}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={{ flexGrow: 1 }} >

      <View style={styles.infoSection}>

        <View style={styles.infoItem}>
          <Text style={[styles.basicText, styles.bold]}>{`\u2022  `} {timePeriod} have passed.</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={[styles.basicText, styles.bold]}>{`\u2022  `} Your order has been cancelled.</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={[styles.basicText, styles.bold]}>{`\u2022  `} Order details: Buy {volumeBA} {appState.getAssetInfo(assetBA).displayString} for {totalQA} {appState.getAssetInfo(assetQA).displayString}.</Text>
        </View>

      </View>

      <View style={styles.infoSection}>

      <View style={styles.infoItem}>
          <Text style={styles.basicText}>Please note:</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.basicText}>{`\u2022  `} If you made a payment, but used an incorrect reference or sent a different amount or waited too long to make it, the payment will be processed as a normal deposit.</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.basicText}>{`\u2022  `} The funds will be added to your {appState.getAssetInfo(assetQA).displayString} account.</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.basicText}>{`\u2022  `} In this case, you can now make a purchase of {appState.getAssetInfo(assetBA).displayString} directly, using the funds in your account.</Text>
        </View>

      </View>

      <View style={styles.button}>
        <StandardButton title="Go back to Buy" onPress={ buyAgain } />
      </View>

      <View style={styles.button}>
        <StandardButton title="View assets" onPress={ viewAssets } />
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
  headingText: {
    fontSize: normaliseFont(20),
    fontWeight: 'bold',
  },
  infoSection: {
    paddingTop: scaledHeight(20),
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
    marginTop: scaledHeight(20),
  },
});


export default PaymentNotMade;

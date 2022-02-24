// React imports
import React, { useContext, useEffect, useState } from 'react';
import { Text, StyleSheet, View } from 'react-native';

// Other imports
import _ from 'lodash';

// Internal imports
import AppStateContext from 'src/application/data';
import { assetsInfo, mainPanelStates, colors } from 'src/constants';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import { Button, StandardButton, ImageButton } from 'src/components/atomic';
import misc from 'src/util/misc';




let PaymentNotMade = () => {

  let appState = useContext(AppStateContext);

  // Load order details.
  ({volumeQA, volumeBA, assetQA, assetBA} = appState.panels.buy);

  let cancelOrder = () => {
    log("Todo: cancel order");
    // Todo: API call to cancel the order (and the related settlements, trades, and txns).
  }

  // Cancel the order.
  cancelOrder();

  let viewAssets = () => {
    let pageName = assetsInfo[assetQA].type; // 'crypto' or 'fiat'.
    appState.changeState('Assets', pageName);
  }

  let buyAgain = () => {
    appState.changeState('Buy');
  }

  return (
    <View style={styles.panelContainer}>
    <View style={styles.panelSubContainer}>

      <View style={[styles.heading, styles.heading1]}>
        <Text style={styles.headingText}>Payment not sent</Text>
      </View>

      <View style={styles.infoSection}>

        <View style={styles.infoItem}>
          <Text style={styles.bold}>{`\u2022  `} 30 minutes have passed.</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.bold}>{`\u2022  `} Your order has been cancelled.</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.bold}>{`\u2022  `} Order details: {volumeBA} {assetsInfo[assetBA].displayString} for {volumeQA} {assetsInfo[assetQA].displayString}.</Text>
        </View>

      </View>

      <View style={styles.textItem}>
        <Text>Please note: If you made a payment, but used an incorrect reference or sent a different amount, the payment will be processed as a normal deposit. The funds will be added to your {assetsInfo[assetQA].displayString} account. In this case, you can now make a purchase of {assetsInfo[assetBA].displayString} directly, using the funds in your account.</Text>
      </View>

      <View style={styles.button}>
        <StandardButton title="View assets" onPress={ viewAssets } />
      </View>

      <View style={styles.button}>
        <StandardButton title="Buy again" onPress={ buyAgain } />
      </View>

    </View>
    </View>
  )

}


let styles = StyleSheet.create({
  panelContainer: {
    paddingHorizontal: scaledWidth(15),
    paddingVertical: scaledHeight(5),
    borderLeftWidth: 1,
    borderRightWidth: 1,
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
  infoSection: {
    paddingTop: scaledHeight(20),
    alignItems: 'flex-start',
  },
  infoItem: {
    marginBottom: scaledHeight(5),
  },
  bold: {
    fontWeight: 'bold',
  },
  textItem: {
    marginTop: scaledHeight(20),
    marginBottom: scaledHeight(20),
  },
  button: {
    marginVertical: scaledHeight(10),
  },
});


export default PaymentNotMade;

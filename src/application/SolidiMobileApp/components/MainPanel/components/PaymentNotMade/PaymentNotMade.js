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

/* Notes
- We use this component to also display "paymentNotReceived", if the user clicks "I have paid", but 2 hours pass without us receiving the payment.
*/




let PaymentNotMade = () => {

  let appState = useContext(AppStateContext);

  let pageName = appState.pageName;
  let permittedPageNames = 'default paymentNotReceived'.split(' ');
  misc.confirmItemInArray('permittedPageNames', permittedPageNames, pageName, 'PaymentNotMade');

  // Change some values, depending on the pageName.
  let headingText = 'Payment not made';
  let timePeriod = '30 minutes'
  if (pageName == 'paymentNotReceived') {
    headingText = 'Payment not received';
    timePeriod = '2 hours'
  }

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
        <Text style={styles.headingText}>{headingText}</Text>
      </View>

      <View style={styles.infoSection}>

        <View style={styles.infoItem}>
          <Text style={styles.bold}>{`\u2022  `} {timePeriod} have passed.</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.bold}>{`\u2022  `} Your order has been cancelled.</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.bold}>{`\u2022  `} Order details: Buy {volumeBA} {assetsInfo[assetBA].displayString} for {volumeQA} {assetsInfo[assetQA].displayString}.</Text>
        </View>

      </View>

      <View style={styles.infoSection}>

      <View style={styles.infoItem}>
          <Text>Please note:</Text>
        </View>

        <View style={styles.infoItem}>
          <Text>{`\u2022  `} If you made a payment, but used an incorrect reference or sent a different amount or waited too long to make it, the payment will be processed as a normal deposit.</Text>
        </View>

        <View style={styles.infoItem}>
          <Text>{`\u2022  `} The funds will be added to your {assetsInfo[assetQA].displayString} account.</Text>
        </View>

        <View style={styles.infoItem}>
          <Text>{`\u2022  `} In this case, you can now make a purchase of {assetsInfo[assetBA].displayString} directly, using the funds in your account.</Text>
        </View>

      </View>

      <View style={styles.button}>
        <StandardButton title="Go back to Buy" onPress={ buyAgain } />
      </View>

      <View style={styles.button}>
        <StandardButton title="View assets" onPress={ viewAssets } />
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
  button: {
    marginTop: scaledHeight(20),
  },
});


export default PaymentNotMade;

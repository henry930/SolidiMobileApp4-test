// React imports
import React, { useContext, useEffect, useState } from 'react';
import { Linking, Text, StyleSheet, View } from 'react-native';

// Other imports
import _ from 'lodash';

// Internal imports
import AppStateContext from 'src/application/data';
import { assetsInfo, mainPanelStates, colors } from 'src/constants';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import { Button, StandardButton, ImageButton } from 'src/components/atomic';
import misc from 'src/util/misc';


/* Notes
- We also use this component to display "paymentNotReceived", if the user clicks "I have paid", but 2 hours pass without us receiving the payment.
*/




let PurchaseSuccessful = () => {

  let appState = useContext(AppStateContext);
  let stateChangeID = appState.stateChangeID;

  // Load order details.
  ({volumeQA, volumeBA, assetQA, assetBA} = appState.panels.buy);

  let [balanceBA, setBalanceBA] = useState('');

  let trustpilotURL = 'https://www.trustpilot.com/evaluate/solidi.co?stars=5';


  // Initial setup.
  useEffect( () => {
    setup();
  }, []); // Pass empty array so that we only run once on mount.


  let setup = async () => {
    await loadBalance();
  }


  let viewAssets = () => {
    let pageName = assetsInfo[assetBA].type; // 'crypto' or 'fiat'.
    appState.changeState('Assets', pageName);
  }

  let buyAgain = () => {
    appState.changeState('Buy');
  }

  let loadBalance = async () => {
    await appState.loadBalances();
    if (appState.stateChangeIDHasChanged(stateChangeID)) return;
    let result = appState.getBalance(assetQA);
    result = '0.05000000' // Testing
    setBalanceBA(result);
  };

  return (
    <View style={styles.panelContainer}>
    <View style={styles.panelSubContainer}>

      <View style={[styles.heading, styles.heading1]}>
        <Text style={styles.headingText}>Purchase successful!</Text>
      </View>

      <View style={styles.infoSection}>

        <View style={styles.infoItem}>
          <Text style={styles.bold}>{`\u2022  `} Your payment of {volumeQA} {assetsInfo[assetQA].displayString} has been processed.</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.bold}>{`\u2022  `} Your Solidi account has been credited with {volumeBA} {assetsInfo[assetBA].displayString}.</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.bold}>{`\u2022  `} Your new {assetsInfo[assetBA].displaySymbol} balance is: { (balanceBA > 0) ? balanceBA : ''}</Text>
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
          <Text style={styles.bold}>Every review helps build trust with our new customers. Tap the Trustpilot logo below to review us. Thanks!</Text>
        </View>

      </View>

      <View style={styles.buttonWrapper}>
        <ImageButton imageName='trustpilot'
          styles={styleTrustpilotButton}
          onPress={ () => { Linking.openURL(trustpilotURL) } }
        />
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

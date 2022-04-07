// React imports
import React, { useContext, useEffect, useState } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { RadioButton } from 'react-native-paper';

// Other imports
import _ from 'lodash';
import Big from 'big.js';

// Internal imports
import { mainPanelStates, colors } from 'src/constants';
import AppStateContext from 'src/application/data';
import { Button, StandardButton } from 'src/components/atomic';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import misc from 'src/util/misc';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('ChooseHowToPay');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);


/* Notes

The primary payment choice is "pay with external account" vs "pay with existing balance". This component handles that choice.

https://callstack.github.io/react-native-paper/radio-button-item.html

*/




let ChooseHowToPay = () => {

  let appState = useContext(AppStateContext);
  let stateChangeID = appState.stateChangeID;

  let pageName = appState.pageName;
  let permittedPageNames = 'default direct_payment balance'.split(' ');
  misc.confirmItemInArray('permittedPageNames', permittedPageNames, pageName, 'ChooseHowToPay');
  if (pageName == 'default') pageName = 'direct_payment';


  /* At this point, the user is already authenticated, or has just returned from the auth sequence.
  - We send the BUY order to the server.
  - It's an escrow order - we escrow the baseAsset and wait for the payment to arrive.
  - No need to await the result.
  */
  appState.sendBuyOrder();


  let [renderCount, triggerRender] = useState(0);
  let [paymentChoice, setPaymentChoice] = useState(pageName);
  let [disablePayWithBalanceButton, setDisablePayWithBalanceButton] = useState(false);
  let [stylePayWithBalanceButton, setStylePayWithBalanceButton] = useState(stylePWBButton);
  let [stylePayWithBalanceButtonText, setStylePayWithBalanceButtonText] = useState(stylePWBButtonText);
  let [colorPWBButton, setColorPWBButton] = useState(colors.standardButtonText);

  // Testing:
  _.assign(appState.panels.buy, {volumeQA: '100', assetQA: 'GBP', volumeBA: '0.05', assetBA: 'BTC'});

  // Load order details.
  ({volumeQA, volumeBA, assetQA, assetBA} = appState.panels.buy);


  // Initial setup.
  useEffect( () => {
    setup();
  }, []); // Pass empty array to only run once on mount.


  let setup = async () => {
    await appState.loadAssetsInfo();
    await appState.loadBalances();
    if (appState.stateChangeIDHasChanged(stateChangeID)) return;
    await checkBalance();
    triggerRender(renderCount+1);
  }


  let balanceQA = () => { return appState.getBalance(assetQA) };

  let zeroVolumeQA = () => { return '0.' + '0'.repeat(appState.getAssetInfo(assetQA).decimalPlaces) }


  // Disable the "Pay with balance" button if the balance is too small.
  let checkBalance = async () => {
    let balanceQA = appState.getBalance(assetQA);
    if(Big(volumeQA).gt(Big(balanceQA))) {
      setDisablePayWithBalanceButton(true);
      setStylePayWithBalanceButton(stylePWBButtonDisabled);
      setStylePayWithBalanceButtonText(stylePWBButtonTextDisabled);
      // Future: setColorPWBButton() to a different color ?
    } else { // enforce reset in case user goes back and changes the volumeQA.
      setDisablePayWithBalanceButton(false);
      setStylePayWithBalanceButton(stylePWBButton);
      setStylePayWithBalanceButtonText(stylePWBButtonText);
      //setColorPWBButton(colors.standardButtonText);
    }
  }

  let readPaymentConditions = async () => {
    appState.changeState('ReadArticle', 'payment_conditions');
  }

  let confirmPaymentChoice = async () => {
    if (paymentChoice === 'direct_payment') {
      // Pay directly from external fiat account.
      // Future: People may pay directly with crypto, not just fiat.
      appState.changeState('MakePayment');
    } else {
      // Pay with balance.
      payWithBalance();
    }
  }

  let payWithBalance = async () => {
    // We disable the "Pay with balance" button if the balance isn't large enough, but we still double-check the balance value here.
    // We reload the balances just in case they have changed in the meantime.
    await appState.loadBalances();
    if (appState.stateChangeIDHasChanged(stateChangeID)) return;
    let balanceQA = appState.getBalance(assetQA);
    let dp = appState.getAssetInfo(assetQA).decimalPlaces;
    if (Big(balanceQA).lt(Big(volumeQA))) {
      let diffString = Big(volumeQA).minus(Big(balanceQA)).toFixed(dp);
      let balanceString = Big(balanceQA).toFixed(dp);
      let volumeString = Big(volumeQA).toFixed(dp);
      let msg = `User wants to pay with balance, but: ${assetQA} balance = ${balanceString} and specified volume is ${volumeString}. Difference = ${diffString} ${assetQA}.`;
      log(msg);
      // Next step
      appState.changeState('InsufficientBalance', 'buy');
    } else {
      // Todo: Call to the server and instruct it to pay for the order with the user's balance.
      // [API call goes here]
      // Todo: Call to the server to confirm the successful completion of the order.
      // [API call goes here]
      appState.changeState('PurchaseSuccessful');
    }
  }


  return (

    <View style={styles.panelContainer}>

      <View style={[styles.heading, styles.heading1]}>
        <Text style={styles.headingText}>Choose how you want to pay</Text>
      </View>

      <View style={styles.selectPaymentMethodSection}>

        <RadioButton.Group onValueChange={x => setPaymentChoice(x)} value={paymentChoice}>

          <RadioButton.Item label="Pay directly to Solidi" value="direct_payment"
            color={colors.standardButtonText}
            style={styles.button} labelStyle={styles.buttonLabel} />

          <View style={styles.buttonDetail}>
            <Text style={styles.bold}>{`\u2022  `} Fast & Easy - No fee!</Text>
            <Text style={styles.bold}>{`\u2022  `} Usually processed in under a minute</Text>
          </View>

          <RadioButton.Item label="Pay with balance" value="balance"
            disabled={disablePayWithBalanceButton}
            color={colorPWBButton}
            style={stylePayWithBalanceButton} labelStyle={styles.buttonLabel} />

          <View style={styles.buttonDetail}>
            <Text style={stylePayWithBalanceButtonText}>{`\u2022  `} Pay from your Solidi balance - No fee!</Text>
            <Text style={stylePayWithBalanceButtonText}>{`\u2022  `} Processed instantly</Text>
            <Text style={styles.bold}>{`\u2022  `} Your balance: {balanceQA()} {(balanceQA() != '[loading]') && assetQA}</Text>
            {disablePayWithBalanceButton &&
              <Text style={styles.balanceLowText}>{`\u2022  `} (Balance is too low for this option)</Text>
            }
          </View>

        </RadioButton.Group>

      </View>

      <View style={styles.conditionsButtonWrapper}>
        <Button title="Our payment conditions" onPress={ readPaymentConditions }
          styles={styleConditionButton}/>
      </View>

      <View style={styles.horizontalRule}/>

      <View style={[styles.heading, styles.heading2]}>
        <Text style={styles.headingText}>Your order</Text>
      </View>

      <View style={styles.orderDetailsSection}>

        <View style={styles.orderDetailsLine}>
          <Text style={styles.bold}>You buy</Text>
          <Text style={styles.bold}>{volumeBA} {appState.getAssetInfo(assetBA).displaySymbol}</Text>
        </View>

        <View style={styles.orderDetailsLine}>
          <Text style={styles.bold}>You spend</Text>
          <Text style={styles.bold}>{volumeQA} {appState.getAssetInfo(assetQA).displaySymbol}</Text>
        </View>

        <View style={styles.orderDetailsLine}>
          <Text style={styles.bold}>Fee</Text>
          <Text style={styles.bold}>{zeroVolumeQA()} {appState.getAssetInfo(assetQA).displaySymbol}</Text>
        </View>

        <View style={styles.orderDetailsLine}>
          <Text style={styles.bold}>Total</Text>
          <Text style={styles.bold}>{volumeQA} {appState.getAssetInfo(assetQA).displaySymbol}</Text>
        </View>

      </View>

      <View style={styles.horizontalRule}/>

      <View style={styles.confirmButtonWrapper}>
        <StandardButton title="Confirm & Pay" onPress={ confirmPaymentChoice } />
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
  selectPaymentMethodSection: {
    paddingTop: scaledHeight(20),
    paddingHorizontal: scaledWidth(30),
  },
  heading: {
    alignItems: 'center',
  },
  heading1: {
    marginTop: scaledHeight(10),
  },
  heading2: {
    marginTop: scaledHeight(20),
  },
  headingText: {
    fontSize: normaliseFont(20),
    fontWeight: 'bold',
  },
  button: {
    borderWidth: 1,
    borderRadius: 18,
    backgroundColor: colors.standardButton,
  },
  buttonLabel: {
    fontWeight: 'bold',
    color: colors.standardButtonText,
  },
  buttonDetail: {
    marginVertical: scaledHeight(10),
    marginLeft: scaledWidth(15),
  },
  conditionsButtonWrapper: {
    marginBottom: scaledHeight(10),
  },
  horizontalRule: {
    borderBottomColor: 'black',
    borderBottomWidth: 1,
    marginHorizontal: scaledWidth(30),
  },
  orderDetailsSection: {
    marginVertical: scaledHeight(20),
    paddingHorizontal: scaledWidth(30),
  },
  orderDetailsLine: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bold: {
    fontWeight: 'bold',
  },
  confirmButtonWrapper: {
    marginTop: scaledHeight(20),
    paddingHorizontal: scaledWidth(30),
  },
  balanceLowText: {
    fontWeight: 'bold',
    color: 'red',
  },
});


let stylePWBButton = StyleSheet.create({
  borderWidth: 1,
  borderRadius: 18,
  backgroundColor: colors.standardButton,
});

let stylePWBButtonDisabled = StyleSheet.create({
  borderWidth: 1,
  borderRadius: 18,
  backgroundColor: colors.greyedOutIcon,
});


let stylePWBButtonText = StyleSheet.create({
  fontWeight: 'bold',
});

let stylePWBButtonTextDisabled = StyleSheet.create({
  fontWeight: 'bold',
  color: colors.greyedOutIcon,
});


let styleConditionButton = StyleSheet.create({
  view: {

  },
});


export default ChooseHowToPay;

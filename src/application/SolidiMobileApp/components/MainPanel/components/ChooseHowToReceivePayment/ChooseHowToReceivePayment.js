// React imports
import React, { useContext, useEffect, useState } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { RadioButton } from 'react-native-paper';

// Other imports
import _ from 'lodash';
import Big from 'big.js';

// Internal imports
import AppStateContext from 'src/application/data';
import { assetsInfo, mainPanelStates, colors } from 'src/constants';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import { Button, StandardButton, ImageButton } from 'src/components/atomic';
import misc from 'src/util/misc';


/* Notes

The primary receive-payment choice is "pay to my balance" vs "pay to my external account". This component handles that choice.

After a sale, the resulting quoteAsset volume is added to the user's balance automatically.
So if the user has selected "pay to my balance", we only need to send the sell order to the API.

When the user selects "pay to my external account", we need to also send a withdrawal request.

// Future: People may want to be paid in EUR, not just GBP.

*/



let ChooseHowToReceivePayment = () => {

  let appState = useContext(AppStateContext);
  let stateChangeID = appState.stateChangeID;

  let pageName = appState.pageName;
  let permittedPageNames = 'direct_payment balance'.split(' ');
  misc.confirmItemInArray('permittedPageNames', permittedPageNames, pageName, 'ChooseHowToReceivePayment');

  let [paymentChoice, setPaymentChoice] = useState(pageName);
  let [balanceQA, setBalanceQA] = useState('');
  let [orderSubmitted, setOrderSubmitted] = useState(false);

  // Load user's external GBP account.
  let externalAccount = appState.user.info.defaultAccount.GBP;

   // Load order details.
  ({volumeQA, volumeBA, assetQA, assetBA} = appState.panels.sell);

  let zeroVolumeQA = '0.' + '0'.repeat(assetsInfo[assetQA].decimalPlaces);


  // Initial setup.
  useEffect( () => {
    loadBalanceData();
  }, []); // Pass empty array to only run once on mount.


  let loadBalanceData = async () => {
    // Display the value we have in storage first.
    let balance1 = appState.getBalance(assetQA);
    setBalanceQA(balance1);
    // Load the balance from the server.
    await appState.loadBalances();
    if (appState.stateChangeIDHasChanged(stateChangeID)) return;
    // Display the new value, if it's different.
    let balance2 = appState.getBalance(assetQA);
    if (balance1 !== balance2) {
      setBalanceQA(balance2);
    }
  }

  let readPaymentConditions = async () => {
    appState.changeState('ReadArticle', 'payment_conditions');
  }

  let confirmReceivePaymentChoice = async () => {
    if (paymentChoice === 'direct_payment') {
      // Make a direct payment to the customer's primary external fiat account.
      // Future: People may be paid directly with crypto, not just fiat.
      await receivePayment();
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
      //appState.changeState('SaleComplete');
    } else {
      // Pay with balance.
      await receivePaymentToBalance();
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
      //appState.changeState('SaleComplete');
    }
  }

  let receivePayment = async () => {
    // We send the stored sell order.
    setOrderSubmitted(true);
    let result = await appState.sendSellOrder();
    if (result.error) {
      // Future: Depending on the error, choose a next state.
    }
    // Note: Do not exit here if stateChangeID has changed.
    let orderID = appState.panels.sell.orderID;
    let orderStatus = await waitForOrderToComplete({orderID});
    if (orderStatus == 'timeout') {
      // Future: If the order doesn't complete, change to an error page.
    }
    // Now that order has completed, make a withdrawal (with no fee) to the user's primary external account.
    await appState.withdrawToPrimaryExternalAccount({volumeQA});
    // Change to next state. Check if state has already changed.
    if (appState.stateChangeIDHasChanged(stateChangeID)) return;
    appState.changeState('SaleSuccessful', 'direct_payment');
  }

  let waitForOrderToComplete = async ({orderID}) => {
    // Periodically check if order has completed.
    // Increase the period over time.
    let intervalSeconds = 1; // Run this function locally every intervalSeconds.
    let periodSeconds = 2; // Increment this period in order to gradually slow down the rate at which the API is called.
    let count = 0;
    let timerID, resolve, reject; // Initialise pieces.
    let checkFunction = () => {
      count += 1;
      if (count % periodSeconds == 0) {
        let orderStatus = appState.getOrderStatus({orderID: appState.panels.buy.orderID});
        if (orderStatus == 'settled') {
          resolve(orderStatus);
        }
      }
      if (count == 10) periodSeconds = 3;
      if (count == 20) periodSeconds = 5;
      if (count == 30) {
        clearInterval(timerID);
        resolve('timeout');
      }
    }
    // Set up a promise that finishes when the order completes.
    return await new Promise((resolve2, reject2) => {
      resolve = resolve2;
      reject = reject2;
      timerID = setInterval(checkFunction, intervalSeconds * 1000);
    });
  }

  let receivePaymentToBalance = async () => {
    setOrderSubmitted(true);
    // We send the stored sell order.
    await appState.sendSellOrder();
    // Change to next state. Check if state has already changed.
    if (appState.stateChangeIDHasChanged(stateChangeID)) return;
    appState.changeState('SaleSuccessful', 'balance');
  }


  return (
    <View style={styles.panelContainer}>
    <View style={styles.panelSubContainer}>

      <View style={[styles.heading, styles.heading1]}>
        <Text style={styles.headingText}>Choose how to be paid</Text>
      </View>

      <View style={styles.selectPaymentMethodSection}>

        <RadioButton.Group onValueChange={x => setPaymentChoice(x)} value={paymentChoice}>

        <RadioButton.Item label="Paid directly from Solidi" value="direct_payment"
          color={colors.standardButtonText}
          style={styles.button} labelStyle={styles.buttonLabel} />

        <View style={styles.buttonDetail}>
          <Text style={styles.bold}>{`\u2022  `} Get paid in 8 hours - No fee!</Text>
          <Text style={styles.bold}>{`\u2022  `} Paying to {externalAccount.accountName}</Text>
          <Text style={styles.bold}>{`\u2022  `} Sort Code - {externalAccount.sortCode}</Text>
          <Text style={styles.bold}>{`\u2022  `} Account Number - {externalAccount.accountNumber}</Text>
        </View>

        <RadioButton.Item label="Paid to balance" value="balance"
          color={colors.standardButtonText}
          style={styles.button} labelStyle={styles.buttonLabel} />

        <View style={styles.buttonDetail}>
          <Text style={styles.bold}>{`\u2022  `} Paid to your Solidi balance - No fee!</Text>
          <Text style={styles.bold}>{`\u2022  `} Processed instantly</Text>
          <Text style={styles.bold}>{`\u2022  `} Your balance: {balanceQA} {(balanceQA != '[loading]') && assetQA}</Text>
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
          <Text style={styles.bold}>You sell</Text>
          <Text style={styles.bold}>{volumeBA} {assetsInfo[assetBA].displaySymbol}</Text>
        </View>

        <View style={styles.orderDetailsLine}>
          <Text style={styles.bold}>You get</Text>
          <Text style={styles.bold}>{volumeQA} {assetsInfo[assetQA].displaySymbol}</Text>
        </View>

        <View style={styles.orderDetailsLine}>
          <Text style={styles.bold}>Fee</Text>
          <Text style={styles.bold}>{zeroVolumeQA} {assetsInfo[assetQA].displaySymbol}</Text>
        </View>

        <View style={styles.orderDetailsLine}>
          <Text style={styles.bold}>Total</Text>
          <Text style={styles.bold}>{volumeQA} {assetsInfo[assetQA].displaySymbol}</Text>
        </View>

      </View>

      <View style={styles.horizontalRule}/>

      <View style={styles.confirmButtonWrapper}>
        <StandardButton title="Confirm & Sell" onPress={ confirmReceivePaymentChoice } />
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
    //paddingTop: scaledHeight(10),
    paddingHorizontal: scaledWidth(30),
  },
  selectPaymentMethodSection: {
    paddingTop: scaledHeight(20),
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
  bold: {
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
  confirmButtonWrapper: {
    marginTop: scaledHeight(20),
    paddingHorizontal: scaledWidth(30),
  },
});


let styleConditionButton = StyleSheet.create({
  view: {

  },
});


export default ChooseHowToReceivePayment;

// React imports
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Text, ScrollView, StyleSheet, View } from 'react-native';
import { RadioButton } from 'react-native-paper';

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
let logger2 = logger.extend('ChooseHowToReceivePayment');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);


/* Notes

After a sale, the resulting quoteAsset volume is added to the user's balance automatically.
So if the user has selected "pay to my balance", we only need to send the sell order to the API.

When the user selects "pay to my external account", we need to also send a withdrawal request.

Future: People may want to be paid in EUR, not just GBP.

Future: People may want to be paid directly with crypto, not just fiat.

*/



let ChooseHowToReceivePayment = () => {

  let appState = useContext(AppStateContext);
  let [renderCount, triggerRender] = useState(0);
  let stateChangeID = appState.stateChangeID;

  let pageName = appState.pageName;
  let permittedPageNames = 'default direct_payment balance'.split(' ');
  misc.confirmItemInArray('permittedPageNames', permittedPageNames, pageName, 'ChooseHowToReceivePayment');
  if (pageName == 'default') pageName = 'balance';

  // State
  let [paymentChoice, setPaymentChoice] = useState(pageName);
  let [orderSubmitted, setOrderSubmitted] = useState(false);

  // Confirm Button state
  let [disableConfirmButton, setDisableConfirmButton] = useState(false);

  // Load user's external GBP account.
  let externalAccount = appState.getDefaultAccountForAsset('GBP');
  let accountName = (! _.has(externalAccount, 'accountName')) ? '[loading]' : externalAccount.accountName;
  let sortCode = (! _.has(externalAccount, 'sortCode')) ? '[loading]' : externalAccount.sortCode;
  let accountNumber = (! _.has(externalAccount, 'accountNumber')) ? '[loading]' : externalAccount.accountNumber;

  // Misc
  let refScrollView = useRef();
  let [sendOrderMessage, setSendOrderMessage] = useState('');
  let [priceChangeMessage, setPriceChangeMessage] = useState('');

  // Testing
  if (appState.panels.sell.volumeQA == '0') {
    log("TESTING")
    // Create an order.
    _.assign(appState.panels.sell, {volumeQA: '10.00', assetQA: 'GBP', volumeBA: '0.00036922', assetBA: 'BTC'});
    appState.panels.sell.activeOrder = true;
  }

   // Load order details.
  ({volumeQA, volumeBA, assetQA, assetBA} = appState.panels.sell);


  // Initial setup.
  useEffect( () => {
    setup();
  }, []); // Pass empty array to only run once on mount.


  let setup = async () => {
    try {
      await appState.generalSetup();
      await appState.loadBalances();
      await appState.loadFees();
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
      triggerRender(renderCount+1);
    } catch(err) {
      let msg = `ChooseHowToReceivePayment.setup: Error = ${err}`;
      console.log(msg);
    }
  }


  let calculateFeeQA = () => {
    let fee = appState.getFee({feeType: 'withdraw', asset: 'GBP', priority: 'low'});
    fee = '0.5'; // testing
    if (! misc.isNumericString(fee)) return '[loading]';
    let dp = appState.getAssetInfo(assetQA).decimalPlaces;
    let newFeeQA = 'error';
    if (paymentChoice == 'direct_payment') {
      newFeeQA = Big(fee).toFixed(dp);
    } else {
      // We currently don't charge a fee if the user pays with balance.
      newFeeQA = Big(0).toFixed(dp);
    }
    log(`newFeeQA: ${newFeeQA}`);
    return newFeeQA;
  }


  let calculateTotalQA = () => {
    let feeQA = calculateFeeQA();
    if (! misc.isNumericString(feeQA)) return '[loading]';
    let dp = appState.getAssetInfo(assetQA).decimalPlaces;
    let newTotalQA = 'error';
    if (paymentChoice == 'direct_payment') {
      newTotalQA = Big(volumeQA).minus(Big(feeQA)).toFixed(dp);
    } else {
      // If user chooses "pay with balance", reset total to be the entire volumeQA.
      newTotalQA = volumeQA;
    }
    log(`newTotalQA: ${newTotalQA}`);
    return newTotalQA;
  }


  let readPaymentConditions = async () => {
    appState.changeState('ReadArticle', 'payment_conditions');
  }


  let confirmReceivePaymentChoice = async () => {
    // Future: If there's no active SELL order, display an error message.
    // - (The user can arrive to this page without an active order by pressing the Back button.)
    log('confirmReceivePaymentChoice button clicked.');
    setDisableConfirmButton(true);
    setSendOrderMessage('Sending order...');
    refScrollView.current.scrollToEnd();
    // Save the fee and total in the appState.
    let feeQA = calculateFeeQA();
    let totalQA = calculateTotalQA();
    _.assign(appState.panels.sell, {feeQA, totalQA});
    // Choose the receive-payment function.
    // Note: These functions are currently identical, but may diverge in future. Keep them separate.
    if (paymentChoice === 'direct_payment') {
      // Choice: Make a direct payment to the customer's primary external fiat account.
      // Note: In this case, the server will perform a withdrawal automatically after filling the order.
      await receivePayment();
    } else {
      // Choice: Pay with balance.
      await receivePaymentToBalance();
    }
  }


  let receivePayment = async () => {
    // We send the stored sell order.
    let output = await appState.sendSellOrder({paymentMethod: 'solidi'});
    if (appState.stateChangeIDHasChanged(stateChangeID, 'ChooseHowToReceivePayment')) return;
    if (_.has(output, 'result')) {
      let result = output.result;
      if (result == 'NO_ACTIVE_ORDER') {
        setSendOrderMessage('No active order.');
      } else if (result == 'PRICE_CHANGE') {
        await handlePriceChange(output);
      } else {
        appState.changeState('SaleSuccessful', paymentChoice);
      }
    }
  }


  let receivePaymentToBalance = async () => {
    // We send the stored sell order.
    let output = await appState.sendSellOrder({paymentMethod: 'balance'});
    if (appState.stateChangeIDHasChanged(stateChangeID, 'ChooseHowToReceivePayment')) return;
    if (_.has(output, 'result')) {
      let result = output.result;
      if (result == 'NO_ACTIVE_ORDER') {
        setSendOrderMessage('No active order.');
      } else if (result == 'PRICE_CHANGE') {
        await handlePriceChange(output);
      } else {
        appState.changeState('SaleSuccessful', paymentChoice);
      }
    }
  }


  let handlePriceChange = async (output) => {
    /* If the price has changed, we'll:
    - Update the stored order values and re-render.
    - Tell the user what's happened and ask them if they'd like to go ahead.
    - Note: We keep baseAssetVolume constant (i.e. the amount the user is selling), so we update quoteAssetVolume.
    */
    let newVolumeQA = output.quoteAssetVolume;
    let priceDown = Big(volumeQA).gt(Big(newVolumeQA));
    let dpQA = appState.getAssetInfo(assetQA).decimalPlaces;
    let priceDiff = Big(volumeQA).minus(Big(newVolumeQA)).toFixed(dpQA);
    newVolumeQA = Big(newVolumeQA).toFixed(dpQA);
    log(`price change: volumeQA = ${volumeQA}, newVolumeQA = ${newVolumeQA}, priceDiff = ${priceDiff}`);
    // Rewrite the order and save it.
    appState.panels.sell.volumeQA = newVolumeQA;
    volumeQA = appState.panels.sell.volumeQA;
    appState.panels.sell.activeOrder = true;
    // Note: No need to re-check balances, because the amount that the user is selling has not changed.
    setDisableConfirmButton(false);
    setSendOrderMessage('');
    let priceUp = ! priceDown;
    let suffix = priceUp ? ' in your favour!' : '.';
    let msg = `The market price has shifted${suffix} Your order has been updated. Please check the details and click "Confirm & Pay" again to proceed.`;
    setPriceChangeMessage(msg);
    refScrollView.current.scrollToEnd();
    triggerRender(renderCount+1);
  }


  let getBalanceString = () => {
    let b = appState.getBalance(assetQA);
    let result = b;
    if (misc.isNumericString(b)) result += ' ' + assetQA;
    return result;
  }


  return (
    <View style={styles.panelContainer}>

      <View style={[styles.heading, styles.heading1]}>
        <Text style={styles.headingText}>Choose how to be paid</Text>
      </View>

      <View style={styles.scrollDownMessage}>
        <Text style={styles.scrollDownMessageText}>(Scroll down to Confirm & Sell)</Text>
      </View>

      <View style={[styles.horizontalRule, styles.horizontalRule1]}/>

      <ScrollView ref={refScrollView} showsVerticalScrollIndicator={true}>

        <View style={styles.selectPaymentMethodSection}>

          <RadioButton.Group onValueChange={x => setPaymentChoice(x)} value={paymentChoice}>

          <RadioButton.Item label="Paid directly from Solidi" value="direct_payment"
            color={colors.standardButtonText}
            style={styles.button} labelStyle={styles.buttonLabel} />

          <View style={styles.buttonDetail}>
            <Text style={styles.bold}>{`\u2022  `} Get paid in 8 hours</Text>
            <Text style={styles.bold}>{`\u2022  `} Paying to: {accountName}</Text>
            <Text style={styles.bold}>{`\u2022  `} Sort Code: {sortCode}</Text>
            <Text style={styles.bold}>{`\u2022  `} Account Number: {accountNumber}</Text>
          </View>

          <RadioButton.Item label="Paid to balance" value="balance"
            color={colors.standardButtonText}
            style={styles.button} labelStyle={styles.buttonLabel} />

          <View style={styles.buttonDetail}>
            <Text style={styles.bold}>{`\u2022  `} Paid to your Solidi balance - No fee!</Text>
            <Text style={styles.bold}>{`\u2022  `} Processed instantly</Text>
            <Text style={styles.bold}>{`\u2022  `} Your balance: {getBalanceString()}</Text>
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
            <Text style={[styles.monospaceText, styles.bold]}>{volumeBA} {assetBA}</Text>
          </View>

          <View style={styles.orderDetailsLine}>
            <Text style={styles.bold}>You get</Text>
            <Text style={[styles.monospaceText, styles.bold]}>{appState.getFullDecimalValue({asset: assetQA, value: volumeQA, functionName: 'ChooseHowToReceivePayment'})} {assetQA}</Text>
          </View>

          <View style={styles.orderDetailsLine}>
            <Text style={styles.bold}>Fee</Text>
            <Text style={[styles.monospaceText, styles.bold]}>{calculateFeeQA()} {assetQA}</Text>
          </View>

          <View style={styles.orderDetailsLine}>
            <Text style={styles.bold}>Total</Text>
            <Text style={[styles.monospaceText, styles.bold]}>{calculateTotalQA()} {assetQA}</Text>
          </View>

        </View>

        <View style={styles.horizontalRule}/>

        <View style={styles.priceChangeMessage}>
          <Text style={styles.priceChangeMessageText}>{priceChangeMessage}</Text>
        </View>

        <View style={styles.confirmButtonWrapper}>
          <StandardButton title="Confirm & Sell"
            onPress={ confirmReceivePaymentChoice }
            disabled={disableConfirmButton}
          />
          <View style={styles.sendOrderMessage}>
            <Text style={styles.sendOrderMessageText}>{sendOrderMessage}</Text>
          </View>
        </View>

      </ScrollView>

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
  scrollDownMessage: {
    marginVertical: scaledHeight(10),
    alignItems: 'center',
  },
  scrollDownMessageText: {
    fontSize: normaliseFont(16),
    //fontWeight: 'bold',
    color: 'red',
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
  horizontalRule1: {
    marginBottom: scaledHeight(10),
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
    //borderWidth: 1, //testing
    marginTop: scaledHeight(20),
    marginBottom: scaledHeight(100),
    paddingHorizontal: scaledWidth(30),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monospaceText: {
    // For Android, a second solution may be needed.
    fontVariant: ['tabular-nums'],
  },
  priceChangeMessage: {
    //borderWidth: 1, //testing
    marginTop: scaledHeight(20),
  },
  priceChangeMessageText: {
    fontSize: normaliseFont(16),
    fontWeight: 'bold',
    color: 'red',
  },
  sendOrderMessage: {
    //borderWidth: 1, //testing
  },
  sendOrderMessageText: {
    color: 'red',
  },
});


let styleConditionButton = StyleSheet.create({
  view: {

  },
});


export default ChooseHowToReceivePayment;

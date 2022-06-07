// React imports
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Text, ScrollView, StyleSheet, View } from 'react-native';
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

Future: People may pay directly with crypto, not just fiat.

https://callstack.github.io/react-native-paper/radio-button-item.html

*/




let ChooseHowToPay = () => {

  let appState = useContext(AppStateContext);
  let stateChangeID = appState.stateChangeID;
  let [renderCount, triggerRender] = useState(0);

  let pageName = appState.pageName;
  let permittedPageNames = 'default direct_payment balance'.split(' ');
  misc.confirmItemInArray('permittedPageNames', permittedPageNames, pageName, 'ChooseHowToPay');
  if (pageName == 'default') pageName = 'direct_payment';

  // State
  let [paymentChoice, setPaymentChoice] = useState(pageName);
  let [fees, setFees] = useState({});

  // Confirm Button state
  let [disableConfirmButton, setDisableConfirmButton] = useState(true);

  // Misc
  let refScrollView = useRef();
  let [priceChangeMessage, setPriceChangeMessage] = useState('');
  let [errorMessage, setErrorMessage] = useState('');
  let [sendOrderMessage, setSendOrderMessage] = useState('');

  // Testing
  if (appState.panels.buy.volumeQA == '0') {
    // Create an order.
    _.assign(appState.panels.buy, {volumeQA: '10.00', assetQA: 'GBP', volumeBA: '0.00036922', assetBA: 'BTC'});
    appState.panels.buy.activeOrder = true;
  }

  // Load order details.
  ({volumeQA, volumeBA, assetQA, assetBA} = appState.panels.buy);


  // Initial setup.
  useEffect( () => {
    setup();
  }, []); // Pass empty array to only run once on mount.


  let setup = async () => {
    try {
      setErrorMessage('Loading...');
      await appState.generalSetup();
      await appState.loadBalances();
      setFees(await fetchFeesForEachPaymentChoice());
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
      setErrorMessage('');
      setDisableConfirmButton(false);
      triggerRender(renderCount+1);
    } catch(err) {
      let msg = `ChooseHowToPay.setup: Error = ${err}`;
      console.log(msg);
    }
  }


  let getBalanceDescriptionLine = () => {
    let balanceQA = appState.getBalance(assetQA);
    let result = 'Your balance: ' + balanceQA;
    if (balanceQA != '[loading]') {
      result += ' ' + assetQA;
    }
    return (
      <Text style={styles.bold}>{`\u2022  `} {result}</Text>
    )
  }


  let fetchFeesForEachPaymentChoice = async () => {
    // Fees may differ depending on the volume and on the user (e.g. whether the user has crossed a fee inflection point).
    // We therefore request the price and fee for each payment choice from the API, using the specific baseAssetVolume.
    let market = assetBA + '/' + assetQA;
    let side = 'BUY';
    let baseOrQuoteAsset = 'base';
    let params = {market, side, baseAssetVolume: volumeBA, baseOrQuoteAsset};
    let output = await appState.fetchPricesForASpecificVolume(params);
    //lj(output);
    if (_.has(output, 'error')) {
      logger.error(output.error);
      return;
    }
    /* Example output:
    [
      {"baseAssetVolume":"0.00036922","baseOrQuoteAsset":"base","feeVolume":"0.00","market":"BTC/GBP","paymentMethod":"solidi","quoteAssetVolume":"9.06","side":"BUY"},
      {"baseAssetVolume":"0.00036922","baseOrQuoteAsset":"base","feeVolume":"0.00","market":"BTC/GBP","paymentMethod":"balance","quoteAssetVolume":"9.06","side":"BUY"}
    ]
    */
    // Now: Produce an object that maps paymentMethods to feeVolumes.
    let result = _.reduce(output, (obj, x) => {
      obj[x.paymentMethod] = x.feeVolume;
      return obj;
    }, {});
    // Rename 'solidi' key to 'direct_payment'.
    result['direct_payment'] = result['solidi'];
    delete result['solidi'];
    // tmp
    result['direct_payment'] = '0.55'
    return result;
  }


  let calculateFeeQA = () => {
    if (_.isEmpty(fees)) return '';
    let feeVolume = fees[paymentChoice];
    feeVolume = appState.getFullDecimalValue({asset: assetQA, value: feeVolume, functionName: 'ChooseHowToPay'});
    return feeVolume;
  }


  let calculateTotalQA = () => {
    let volumeQA2 = appState.getFullDecimalValue({asset: assetQA, value: volumeQA, functionName: 'ChooseHowToPay'});
    let feeVolume = calculateFeeQA();
    if (_.isEmpty(feeVolume)) return '';
    let quoteDP = appState.getAssetInfo(assetQA).decimalPlaces;
    let total = Big(volumeQA2).plus(Big(feeVolume)).toFixed(quoteDP);
    return total;
  }


  let balanceTooSmall = () => {
    let balanceQA = appState.getBalance(assetQA);
    if (! misc.isNumericString(balanceQA)) return;
    let total = calculateTotalQA();
    if (! misc.isNumericString(total)) return;
    if(Big(total).gt(Big(balanceQA))) {
      //log(`Order total (${total} ${assetQA}) is greater than the balance (${balanceQA} ${assetQA}).`);
      return true;
    }
  }


  let readPaymentConditions = async () => {
    appState.changeState('ReadArticle', 'payment_conditions');
  }


  let confirmPaymentChoice = async () => {
    /*
    - If there's no active BUY order, display an error message.
    - (The user can arrive at this page without an active order by pressing the Back button.)
    */
    log('confirmPaymentChoice button clicked.');
    setDisableConfirmButton(true);
    setSendOrderMessage('Sending order...');
    refScrollView.current.scrollToEnd();
    // Save the fee and total in the appState.
    let feeQA = calculateFeeQA();
    let totalQA = calculateTotalQA();
    _.assign(appState.panels.buy, {feeQA, totalQA});
    // Select the correct payment function.
    if (paymentChoice === 'direct_payment') {
      // Choice: Pay directly from external fiat account.
      await payDirectly();
    } else {
      // Choice: Pay with balance.
      await payWithBalance();
    }
  }


  let payDirectly = async () => {
    let output = await appState.sendBuyOrder({paymentMethod: 'solidi'});
    if (appState.stateChangeIDHasChanged(stateChangeID)) return;
    if (_.has(output, 'error')) {
      setErrorMessage(misc.itemToString(output.error));
    } else if (_.has(output, 'result')) {
      let result = output.result;
      if (result == 'NO_ACTIVE_ORDER') {
        setSendOrderMessage('No active order.');
      } else if (result == 'PRICE_CHANGE') {
        await handlePriceChange(output);
      } else {
        appState.changeState('MakePayment');
      }
    }
  }


  let payWithBalance = async () => {
    // We already disabled the "Pay with balance" button earlier if the balance wasn't large enough, but we still double-check the balance value here.
    // We reload the balances just in case they have changed in the meantime.
    await appState.loadBalances();
    if (appState.stateChangeIDHasChanged(stateChangeID)) return;
    let balanceQA = appState.getBalance(assetQA);
    let quoteDP = appState.getAssetInfo(assetQA).decimalPlaces;
    if (Big(balanceQA).lt(Big(volumeQA))) {
      let diffString = Big(volumeQA).minus(Big(balanceQA)).toFixed(quoteDP);
      let balanceString = Big(balanceQA).toFixed(quoteDP);
      let volumeString = Big(volumeQA).toFixed(quoteDP);
      let msg = `User wants to pay with balance, but: ${assetQA} balance = ${balanceString} and specified volume is ${volumeString}. Difference = ${diffString} ${assetQA}.`;
      log(msg);
      // Next step
      appState.changeState('InsufficientBalance', 'buy');
      return;
    }
    // Call to the server and instruct it to pay for the order with the user's balance.
    let output = await appState.sendBuyOrder({paymentMethod: 'balance'});
    if (appState.stateChangeIDHasChanged(stateChangeID)) return;
    if (_.has(output, 'error')) {
      setErrorMessage(misc.itemToString(output.error));
    } else if (_.has(output, 'result')) {
      let result = output.result;
      if (result == 'NO_ACTIVE_ORDER') {
        setSendOrderMessage('No active order.');
      } else if (result == 'PRICE_CHANGE') {
        await handlePriceChange(output);
      } else {
        appState.changeState('PurchaseSuccessful');
      }
    }
  }


  let handlePriceChange = async (output) => {
    /* If the price has changed, we'll:
    - Update the stored order values and re-render.
    - Tell the user what's happened and ask them if they'd like to go ahead.
    - Note: We keep baseAssetVolume constant (i.e. the amount the user is buying), so we update quoteAssetVolume.
    - Future: Keep quoteAssetVolume constant, and recalculate baseAssetVolume ?
    */
    let newVolumeQA = output.quoteAssetVolume;
    let priceDown = Big(volumeQA).gt(Big(newVolumeQA));
    let dpQA = appState.getAssetInfo(assetQA).decimalPlaces;
    let priceDiff = Big(volumeQA).minus(Big(newVolumeQA)).toFixed(dpQA);
    log(`price change: volumeQA = ${volumeQA}, newVolumeQA = ${newVolumeQA}, priceDiff = ${priceDiff}`);
    // Rewrite the order and save it.
    appState.panels.buy.volumeQA = newVolumeQA;
    volumeQA = appState.panels.buy.volumeQA;
    appState.panels.buy.activeOrder = true;
    setDisableConfirmButton(false);
    setSendOrderMessage('');
    let suffix = priceDown ? ' in your favour!' : '.';
    let msg = `The market price has shifted${suffix} Your order has been updated. Please check the details and click "Confirm & Pay" again to proceed.`;
    setPriceChangeMessage(msg);
    refScrollView.current.scrollToEnd();
    triggerRender(renderCount+1);
  }


  return (

    <View style={styles.panelContainer}>

      <View style={[styles.heading, styles.heading1]}>
        <Text style={styles.headingText}>Choose how you want to pay</Text>
      </View>

      <View style={styles.scrollDownMessage}>
        <Text style={styles.scrollDownMessageText}>(Scroll down to Confirm & Pay)</Text>
      </View>

      <View style={[styles.horizontalRule, styles.horizontalRule1]}/>

      <ScrollView ref={refScrollView} showsVerticalScrollIndicator={true}>

        <View style={styles.selectPaymentMethodSection}>

          <RadioButton.Group onValueChange={x => setPaymentChoice(x)} value={paymentChoice}>

            <RadioButton.Item label="Pay directly to Solidi" value="direct_payment"
              color={colors.standardButtonText}
              style={styles.button}
              labelStyle={styles.buttonLabel}
            />

            <View style={styles.buttonDetail}>
              <Text style={styles.bold}>{`\u2022  `} Fast & Easy - No fee!</Text>
              <Text style={styles.bold}>{`\u2022  `} Usually processed in under a minute</Text>
            </View>

            <RadioButton.Item label="Pay with balance" value="balance"
              color={colors.standardButtonText}
              disabled={balanceTooSmall()}
              style={balanceTooSmall() ? styleBalanceButtonDisabled : styleBalanceButton}
              labelStyle={styles.buttonLabel}
            />

            <View style={styles.buttonDetail}>
              <Text style={balanceTooSmall() ? styleBalanceButtonAdditionalTextDisabled : styleBalanceButtonAdditionalText}>{`\u2022  `} Pay from your Solidi balance - No fee!</Text>
              <Text style={balanceTooSmall() ? styleBalanceButtonAdditionalTextDisabled : styleBalanceButtonAdditionalText}>{`\u2022  `} Processed instantly</Text>
              {getBalanceDescriptionLine()}
              {balanceTooSmall() &&
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
            <Text style={[styles.monospaceText, styles.bold]}>{volumeBA} {assetBA}</Text>
          </View>

          <View style={styles.orderDetailsLine}>
            <Text style={styles.bold}>You spend</Text>
            <Text style={[styles.monospaceText, styles.bold]}>{appState.getFullDecimalValue({asset: assetQA, value: volumeQA, functionName: 'ChooseHowToPay'})} {assetQA}</Text>
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

        <View style={styles.errorMessage}>
          <Text style={styles.errorMessageText}>{errorMessage}</Text>
        </View>

        <View style={styles.confirmButtonWrapper}>
          <StandardButton title={"Confirm & Pay"}
            onPress={ confirmPaymentChoice }
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
    //borderWidth: 1, //testing
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
    //borderWidth: 1, //testing
    marginTop: scaledHeight(20),
    marginBottom: scaledHeight(100),
    paddingHorizontal: scaledWidth(30),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLowText: {
    fontWeight: 'bold',
    color: 'red',
  },
  monospaceText: {
    // For Android, a second solution may be needed.
    fontVariant: ['tabular-nums'],
  },
  priceChangeMessage: {
    //borderWidth: 1, //testing
    marginTop: scaledHeight(20),
    paddingHorizontal: scaledWidth(30),
  },
  priceChangeMessageText: {
    fontSize: normaliseFont(16),
    fontWeight: 'bold',
    color: 'red',
  },
  errorMessage: {
    //borderWidth: 1, //testing
    marginTop: scaledHeight(20),
    paddingHorizontal: scaledWidth(30),
  },
  errorMessageText: {
    color: 'red',
  },
  sendOrderMessage: {
    //borderWidth: 1, //testing
  },
  sendOrderMessageText: {
    color: 'red',
  },
});


let styleBalanceButton = StyleSheet.create({
  borderWidth: 1,
  borderRadius: 18,
  backgroundColor: colors.standardButton,
});

let styleBalanceButtonDisabled = StyleSheet.create({
  borderWidth: 1,
  borderRadius: 18,
  backgroundColor: colors.greyedOutIcon,
});


let styleBalanceButtonAdditionalText = StyleSheet.create({
  fontWeight: 'bold',
});

let styleBalanceButtonAdditionalTextDisabled = StyleSheet.create({
  fontWeight: 'bold',
  color: colors.greyedOutIcon,
});


let styleConditionButton = StyleSheet.create({
  view: {

  },
});


export default ChooseHowToPay;

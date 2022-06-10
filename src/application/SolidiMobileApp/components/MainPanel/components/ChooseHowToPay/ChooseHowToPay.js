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
  let firstRender = misc.useFirstRender();
  let stateChangeID = appState.stateChangeID;
  let [renderCount, triggerRender] = useState(0);

  let pageName = appState.pageName;
  let permittedPageNames = 'default solidi balance'.split(' ');
  misc.confirmItemInArray('permittedPageNames', permittedPageNames, pageName, 'ChooseHowToPay');
  if (pageName == 'default') pageName = 'solidi';
  //pageName = 'balance'; //testing

  // State
  let [isLoading, setIsLoading] = useState(true);
  let [paymentChoice, setPaymentChoice] = useState(pageName);
  let [paymentChoiceDetails, setPaymentChoiceDetails] = useState({});
  // - volumeBA may differ depending on the payment choice.
  // -- If it changes, we should re-render.
  let [selectedVolumeBA, setSelectedVolumeBA] = useState('');

  // Confirm Button state
  let [disableConfirmButton, setDisableConfirmButton] = useState(true);

  // Misc
  let refScrollView = useRef();
  let [priceChangeMessage, setPriceChangeMessage] = useState('');
  let [errorMessage, setErrorMessage] = useState('');
  let [sendOrderMessage, setSendOrderMessage] = useState('');

  // Testing
  if (appState.panels.buy.volumeQA == '0') {
    log("TESTING");
    // Create an order.
    _.assign(appState.panels.buy, {volumeQA: '10.00', assetQA: 'GBP', volumeBA: '0.00036922', assetBA: 'BTC'});
    appState.panels.buy.activeOrder = true;
  }

  // Load order details.
  // - Note: We ignore the volumeBA chosen earlier by the fetchBestPrice function, and select only from the volumeBA values returned by the fetchPrices function.
  ({volumeQA, volumeBA, assetQA, assetBA} = appState.panels.buy);


  // Initial setup.
  useEffect( () => {
    setup();
  }, []); // Pass empty array to only run once on mount.


  let setup = async () => {
    try {
      await appState.generalSetup();
      await appState.loadBalances();
      let details = await fetchPaymentChoiceDetails();
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
      setPaymentChoiceDetails(details);
      if (_.has(paymentChoiceDetails, paymentChoice)) {
        let newVolumeBA = paymentChoiceDetails[paymentChoice].baseAssetVolume;
        setSelectedVolumeBA(newVolumeBA);
      }
      setErrorMessage('');
      setDisableConfirmButton(false);
      setIsLoading(false);
      triggerRender(renderCount+1);
    } catch(err) {
      let msg = `ChooseHowToPay.setup: Error = ${err}`;
      console.log(msg);
    }
  }


  // When paymentChoice is changed, set selectedVolumeBA to the corresponding value.
  useEffect(() => {
    if (! firstRender) {
      if (! _.has(paymentChoiceDetails, paymentChoice)) return;
      let newVolumeBA = paymentChoiceDetails[paymentChoice].baseAssetVolume;
      setSelectedVolumeBA(newVolumeBA);
    }
  }, [paymentChoice]);


  let fetchPaymentChoiceDetails = async () => {
    // Fees may differ depending on the volume and on the user (e.g. whether the user has crossed a fee inflection point).
    // We therefore request the details for each payment choice from the API, using the specific quoteAssetVolume.
    let market = assetBA + '/' + assetQA;
    let side = 'BUY';
    let baseOrQuoteAsset = 'quote';
    let params = {market, side, baseOrQuoteAsset, quoteAssetVolume: volumeQA};
    let output = await appState.fetchPricesForASpecificVolume(params);
    //lj(output);
    if (_.has(output, 'error')) {
      logger.error(output.error);
      return;
    }
    /* Example output:
    {
      "balance":{"baseAssetVolume":"0.00040586","baseOrQuoteAsset":"quote","feeVolume":"0.00","market":"BTC/GBP","paymentMethod":"balance","quoteAssetVolume":"10.00","side":"BUY"},
      "solidi":{"baseAssetVolume":"0.00040586","baseOrQuoteAsset":"quote","feeVolume":"0.00","market":"BTC/GBP","paymentMethod":"solidi","quoteAssetVolume":"10.00","side":"BUY"}
    }
    */
   paymentChoiceDetails = output;
   // Testing
   testTweaks = false;
   if (testTweaks) {
     paymentChoiceDetails['solidi'].feeVolume = '0.32';
     paymentChoiceDetails['solidi'].baseAssetVolume = '0.00039000';
   }
   lj({paymentChoiceDetails});
   return paymentChoiceDetails;
  }


  let calculateFeeQA = () => {
    if (_.isEmpty(paymentChoiceDetails)) return '';
    if (! _.has(paymentChoiceDetails, paymentChoice)) return '';
    let feeVolume = paymentChoiceDetails[paymentChoice]['feeVolume'];
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
    let totalQA = calculateTotalQA();
    if (! misc.isNumericString(totalQA)) return;
    if(Big(totalQA).gt(Big(balanceQA))) {
      //log(`Order total (${totalQA} ${assetQA}) is greater than the balance (${balanceQA} ${assetQA}).`);
      return true;
    }
  }


  let readPaymentConditions = async () => {
    appState.changeState('ReadArticle', 'payment_conditions');
  }


  let confirmPaymentChoice = async () => {
    /*
    - Future: If there's no active BUY order, display an error message.
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
    // Save the selectedVolumeBA (selected via paymentChoice from paymentChoiceDetails) in the appState.
    appState.panels.buy.volumeBA = selectedVolumeBA;
    volumeBA = selectedVolumeBA;
    // Create the order object.
    let buyOrder = {volumeQA, volumeBA, assetQA, assetBA, paymentMethod: paymentChoice};
    // Select the correct payment function.
    if (paymentChoice === 'solidi') {
      // Choice: Pay directly from external fiat account.
      await payDirectly(buyOrder);
    } else {
      // Choice: Pay with balance.
      await payWithBalance(buyOrder);
    }
  }


  let payDirectly = async (buyOrder) => {
    let output = await appState.sendBuyOrder(buyOrder);
    if (appState.stateChangeIDHasChanged(stateChangeID)) return;
    lj(output);
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


  let payWithBalance = async (buyOrder) => {
    // We already disabled the "Pay with balance" button earlier if the balance wasn't large enough, but we still double-check the balance value here.
    // We reload the balances just in case they have changed in the meantime.
    await appState.loadBalances();
    if (appState.stateChangeIDHasChanged(stateChangeID)) return;
    let balanceQA = appState.getBalance(assetQA);
    let quoteDP = appState.getAssetInfo(assetQA).decimalPlaces;
    let totalQA = calculateTotalQA();
    if (Big(balanceQA).lt(Big(totalQA))) {
      let diffString = Big(totalQA).minus(Big(balanceQA)).toFixed(quoteDP);
      let balanceString = Big(balanceQA).toFixed(quoteDP);
      let totalVolumeString = Big(totalQA).toFixed(quoteDP);
      let msg = `User wants to pay with balance, but: ${assetQA} balance = ${balanceString} and specified volume is ${totalVolumeString}. Difference = ${diffString} ${assetQA}.`;
      log(msg);
      // Next step
      appState.changeState('InsufficientBalance', 'buy');
      return;
    }
    // Call to the server and instruct it to pay for the order with the user's balance.
    let output = await appState.sendBuyOrder(buyOrder);
    if (appState.stateChangeIDHasChanged(stateChangeID)) return;
    lj(output);
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


  let handlePriceChange = async (priceChange) => {
    /* If the price has changed, we'll:
    - Update the stored order values and re-render.
    - Tell the user what's happened and ask them if they'd like to go ahead.
    - We don't want to change the amount the user is spending (because that's what they expect to spend), so we update baseAssetVolume.
    */
    /* Example output: (where the quoteAssetVolume we sent in was "10.00")
      {
        "baseAssetVolume": "0.00036922",
        "market": "BTC/GBP",
        "quoteAssetVolume": "11.00",
        "result": "PRICE_CHANGE"
      }
    */
    let newVolumeQA = priceChange.quoteAssetVolume;
    // We re-query the API using the original quoteAssetVolume.
    let details = await fetchPaymentChoiceDetails();
    if (appState.stateChangeIDHasChanged(stateChangeID)) return;
    // Future: Check for errors here.
    setPaymentChoiceDetails(details);
    let newVolumeBA = paymentChoiceDetails[paymentChoice].baseAssetVolume;
    setSelectedVolumeBA(newVolumeBA);
    // priceDown = Did the required quoteAssetVolume go down ?
    let priceDown = Big(newVolumeQA).lt(Big(volumeQA));
    let baseDP = appState.getAssetInfo(assetBA).decimalPlaces;
    let priceDiff = Big(newVolumeQA).minus(Big(volumeQA)).toFixed(baseDP);
    log(`price change: volumeQA = ${volumeQA}, newVolumeQA = ${newVolumeQA}, priceDiff = ${priceDiff}`);
    // Save the new order details.
    appState.panels.buy.volumeBA = newVolumeBA;
    appState.panels.buy.activeOrder = true;
    volumeBA = newVolumeBA;
    setDisableConfirmButton(false);
    setSendOrderMessage('');
    let suffix = priceDown ? ' in your favour!' : '.';
    let msg = `The market price has shifted${suffix} Your order has been updated. Please check the details and click "Confirm & Pay" again to proceed.`;
    setPriceChangeMessage(msg);
    refScrollView.current.scrollToEnd();
    triggerRender(renderCount+1);
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

        { isLoading &&
          <View style={styles.loadingMessage}>
            <Text style={styles.loadingMessageText}>Loading...</Text>
          </View>
        }

        <View style={styles.selectPaymentMethodSection}>

          <RadioButton.Group onValueChange={x => setPaymentChoice(x)} value={paymentChoice}>

            <RadioButton.Item label="Pay directly to Solidi" value="solidi"
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
            <Text style={[styles.monospaceText, styles.bold]}>{selectedVolumeBA} {assetBA}</Text>
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
  loadingMessage: {
    //borderWidth: 1, //testing
    marginTop: scaledHeight(20),
    paddingHorizontal: scaledWidth(30),
  },
  loadingMessageText: {
    color: 'red',
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

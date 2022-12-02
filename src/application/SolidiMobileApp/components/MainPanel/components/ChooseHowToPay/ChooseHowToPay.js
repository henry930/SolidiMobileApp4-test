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
  let permittedPageNames = 'default solidi balance openbank'.split(' ');
  misc.confirmItemInArray('permittedPageNames', permittedPageNames, pageName, 'ChooseHowToPay');
  if (pageName == 'default') pageName = 'solidi';
  //pageName = 'openbank'; //testing

  // State
  let [isLoading, setIsLoading] = useState(true);
  let [paymentChoice, setPaymentChoice] = useState(pageName);
  let [paymentChoiceDetails, setPaymentChoiceDetails] = useState({});

  // Confirm Button state
  let [disableConfirmButton, setDisableConfirmButton] = useState(true);

  // Misc
  let refScrollView = useRef();
  let [priceChangeMessage, setPriceChangeMessage] = useState('');
  let [errorMessage, setErrorMessage] = useState('');
  let [sendOrderMessage, setSendOrderMessage] = useState('');

  // Testing
  if (appState.appTier == 'dev' && appState.panels.buy.volumeQA == '0') {
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
      setSendOrderMessage('Loading...');
      await appState.generalSetup();
      await appState.loadBalances();
      let details = await fetchPaymentChoiceDetails();
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
      setSendOrderMessage('');
      setPaymentChoiceDetails(details);
      setErrorMessage('');
      setDisableConfirmButton(false);
      setIsLoading(false);
      triggerRender(renderCount+1);
    } catch(err) {
      let msg = `ChooseHowToPay.setup: Error = ${err}`;
      console.log(msg);
    }
  }


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
    /*
    Example output:
    {
      "balance":{"baseAssetVolume":"0.00040586","baseOrQuoteAsset":"quote","feeVolume":"0.00","market":"BTC/GBP","paymentMethod":"balance","quoteAssetVolume":"10.00","side":"BUY"},
      "openbank":{"baseAssetVolume":"0.00056688","baseOrQuoteAsset":"quote","feeVolume":"0.00","market":"BTC/GBP","paymentMethod":"openbank","quoteAssetVolume":"10.00","side":"BUY"},
      "solidi":{"baseAssetVolume":"0.00040586","baseOrQuoteAsset":"quote","feeVolume":"0.00","market":"BTC/GBP","paymentMethod":"solidi","quoteAssetVolume":"10.00","side":"BUY"}
    }
    If the OpenBanking method were disabled, we would receive:
    "openbank":{"error":"Payment Method Disabled"},
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


  let calculateVolumeBA = () => {
    if (_.isEmpty(paymentChoiceDetails)) return '';
    if (! _.has(paymentChoiceDetails, paymentChoice)) return '';
    let baseAssetVolume = paymentChoiceDetails[paymentChoice]['baseAssetVolume'];
    baseAssetVolume = appState.getFullDecimalValue({asset: assetBA, value: baseAssetVolume, functionName: 'ChooseHowToPay'});
    log(`Payment method = ${paymentChoice}: baseAssetVolume = ${baseAssetVolume} ${assetBA}`);
    return baseAssetVolume;
  }


  let calculateVolumeQA = () => {
    let quoteAssetVolume = appState.getFullDecimalValue({asset: assetQA, value: volumeQA, functionName: 'ChooseHowToPay'});
    return quoteAssetVolume;
  }


  let calculateFeeQA = () => {
    if (_.isEmpty(paymentChoiceDetails)) return '';
    if (! _.has(paymentChoiceDetails, paymentChoice)) return '';
    let feeVolume = paymentChoiceDetails[paymentChoice]['feeVolume'];
    feeVolume = appState.getFullDecimalValue({asset: assetQA, value: feeVolume, functionName: 'ChooseHowToPay'});
    //log(`Payment method = ${paymentChoice}: Fee = ${feeVolume} ${assetQA}`);
    return feeVolume;
  }


  let calculateTotalQA = (params) => {
    let feeVolume;
    if (! _.isNil(params)) {
      ({feeVolume} = params);
    }
    if (_.isNil(feeVolume)) feeVolume = calculateFeeQA();
    if (_.isEmpty(feeVolume)) return ''; // We can't know the total without the fee.
    let volumeQA2 = appState.getFullDecimalValue({asset: assetQA, value: volumeQA, functionName: 'ChooseHowToPay'});
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


  let paymentOptionDisabled = (option) => {
    if (! _.has(paymentChoiceDetails, option)) {
      return false;
    }
    let optionDetails = paymentChoiceDetails[option];
    if (_.has(optionDetails, 'error')) return true;
    return false;
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
    // Get volumeBA.
    volumeBA = calculateVolumeBA();
    // Save volumeBA in the appState.
    appState.panels.buy.volumeBA = volumeBA;
    // Create the order object.
    let buyOrder = {volumeQA, volumeBA, assetQA, assetBA, paymentMethod: paymentChoice};
    // Select the correct payment function.
    if (paymentChoice === 'solidi' || paymentChoice === 'openbank') {
      // Choice: Pay directly by bank transfer.
      // Choice: Pay directly using mobile banking app.
      // We create a new variable to hold the paymentChoice value, just in case the user is able to click another paymentChoice button before we move to a new page.
      await payDirectly({buyOrder, selectedPaymentChoice: paymentChoice});
    } else {
      // Choice: Pay with balance.
      await payWithBalance(buyOrder);
    }
  }


  let payDirectly = async ({buyOrder, selectedPaymentChoice}) => {
    let output = await appState.sendBuyOrder(buyOrder);
    if (appState.stateChangeIDHasChanged(stateChangeID)) return;
    lj(output);
    appState.panels.buy.output = output;
    if (_.has(output, 'error')) {
      setErrorMessage(misc.itemToString(output.error));
      /* Future: If output is this:
      {"error":"ValidationError: Unfortunately, 0.00010146 BTC is too small an amount for us to process. Please choose a larger amount."}
      then after 3 seconds, redirect to the buy page.
      Need to provide an error code with the output.
      */
    } else if (_.has(output, 'result')) {
      let result = output.result;
      if (result == 'NO_ACTIVE_ORDER') {
        setSendOrderMessage('No active order.');
      } else if (result == 'PRICE_CHANGE') {
        await handlePriceChange(output);
      } else if (result == 'EXCEEDS_LIMITS') {
        appState.panels.buy.output = output;
        appState.changeState('LimitsExceeded', 'buy');
      } else { // 'FILLED'
        // Retrieve feeVolume from order result, calculate totalVolume, and store the results in the app memory.
        let feeVolume = output.fees;
        let totalVolumeQA = calculateTotalQA({feeVolume});
        //lj({feeVolume, totalVolumeQA})
        appState.panels.buy.feeQA = feeVolume;
        appState.panels.buy.totalQA = totalVolumeQA;
        if (selectedPaymentChoice === 'solidi') {
          appState.changeState('MakePayment');
        } else {
          // selectedPaymentChoice === 'openbank'
          appState.changeStateParameters.settlementID = appState.panels.buy.settlementID;
          appState.changeState('MakePaymentOpenBanking');
        }
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
    appState.panels.buy.output = output;
    if (_.has(output, 'error')) {
      setErrorMessage(misc.itemToString(output.error));
    } else if (_.has(output, 'result')) {
      let result = output.result;
      if (result == 'NO_ACTIVE_ORDER') {
        setSendOrderMessage('No active order.');
      } else if (result == 'PRICE_CHANGE') {
        await handlePriceChange(output);
      } else if (result == 'FILLED') {
        // Retrieve feeVolume from order result, calculate totalVolume, and store the results in the app memory.
        let feeVolume = output.fees;
        let totalVolumeQA = calculateTotalQA({feeVolume});
        //lj({feeVolume, totalVolumeQA});
        appState.panels.buy.feeQA = feeVolume;
        appState.panels.buy.totalQA = totalVolumeQA;
        appState.changeStateParameters.orderID = appState.panels.buy.orderID;
        appState.changeState('PurchaseSuccessful');
      } else if (result == 'EXCEEDS_LIMITS') {
        appState.changeState('LimitsExceeded', 'buy');
      } else {
        setErrorMessage(misc.itemToString(output));
        setSendOrderMessage('');
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
    // priceDown = Did the required quoteAssetVolume go down ?
    let priceDown = Big(newVolumeQA).lt(Big(volumeQA));
    let baseDP = appState.getAssetInfo(assetBA).decimalPlaces;
    let priceDiff = Big(newVolumeQA).minus(Big(volumeQA)).toFixed(baseDP);
    log(`price change: volumeQA = ${volumeQA}, newVolumeQA = ${newVolumeQA}, priceDiff = ${priceDiff}`);
    // Save the new order details.
    volumeBA = calculateVolumeBA();
    appState.panels.buy.volumeBA = volumeBA;
    appState.panels.buy.activeOrder = true;
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
      <Text style={[styles.basicText, styles.bold]}>{`\u2022  `} {result}</Text>
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

      <ScrollView ref={refScrollView} showsVerticalScrollIndicator={true} contentContainerStyle={{ flexGrow: 1 }} >

        <View style={styles.selectPaymentMethodSection}>

          <RadioButton.Group onValueChange={x => {
            log(`paymentChoice selected: ${x}`);
            setPaymentChoice(x);
          }} value={paymentChoice}>

            <RadioButton.Item label="Bank transfer" value="solidi"
              color={colors.standardButtonText}
              style={styles.button}
              labelStyle={styles.buttonLabel}
            />

            <View style={styles.buttonDetail}>
              <Text style={[styles.basicText, styles.bold]}>{`\u2022  `} Fast & Easy - No fee!</Text>
              <Text style={[styles.basicText, styles.bold]}>{`\u2022  `} Usually processed in under a minute</Text>
            </View>

            <RadioButton.Item label="Mobile bank app" value="openbank"
              color={colors.standardButtonText}
              disabled={paymentOptionDisabled('openbank')}
              style={paymentOptionDisabled('openbank') ? stylePaymentOptionButtonDisabled : stylePaymentOptionButton}
              labelStyle={styles.buttonLabel}
            />

            <View style={styles.buttonDetail}>
              <Text style={[styles.basicText, paymentOptionDisabled('openbank') ? stylePaymentOptionButtonAdditionalTextDisabled : stylePaymentOptionButtonAdditionalText]}>{`\u2022  `} Authorise the payment via your mobile banking app - No fee!</Text>
              <Text style={[styles.basicText, paymentOptionDisabled('openbank') ? stylePaymentOptionButtonAdditionalTextDisabled : stylePaymentOptionButtonAdditionalText]}>{`\u2022  `} Usually processed in seconds</Text>
              {paymentOptionDisabled('openbank') &&
                <Text style={styles.paymentOptionDisabledText}>{`\u2022  `} This payment option is inactive</Text>
              }
            </View>

            <RadioButton.Item label="Solidi balance" value="balance"
              color={colors.standardButtonText}
              disabled={balanceTooSmall()}
              style={balanceTooSmall() ? stylePaymentOptionButtonDisabled : stylePaymentOptionButton}
              labelStyle={styles.buttonLabel}
            />

            <View style={styles.buttonDetail}>
              <Text style={[styles.basicText, balanceTooSmall() ? stylePaymentOptionButtonAdditionalTextDisabled : stylePaymentOptionButtonAdditionalText]}>{`\u2022  `} Pay from your Solidi balance - No fee!</Text>
              <Text style={[styles.basicText, balanceTooSmall() ? stylePaymentOptionButtonAdditionalTextDisabled : stylePaymentOptionButtonAdditionalText]}>{`\u2022  `} Processed instantly</Text>
              {getBalanceDescriptionLine()}
              {balanceTooSmall() &&
                <Text style={styles.paymentOptionDisabledText}>{`\u2022  `} Balance is too low for this option</Text>
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
            <Text style={[styles.basicText, styles.bold]}>You buy</Text>
            <Text style={[styles.monospaceText, styles.bold]}>{calculateVolumeBA()} {assetBA}</Text>
          </View>

          <View style={styles.orderDetailsLine}>
            <Text style={[styles.basicText, styles.bold]}>You spend</Text>
            <Text style={[styles.monospaceText, styles.bold]}>{calculateVolumeQA()} {assetQA}</Text>
          </View>

          <View style={styles.orderDetailsLine}>
            <Text style={[styles.basicText, styles.bold]}>Fee</Text>
            <Text style={[styles.monospaceText, styles.bold]}>{calculateFeeQA()} {assetQA}</Text>
          </View>

          <View style={styles.orderDetailsLine}>
            <Text style={[styles.basicText, styles.bold]}>Total</Text>
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
    borderRadius: scaledWidth(18),
    backgroundColor: colors.standardButton,
  },
  buttonLabel: {
    fontSize: normaliseFont(16),
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
  basicText: {
    fontSize: normaliseFont(14),
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
  paymentOptionDisabledText: {
    fontSize: normaliseFont(14),
    fontWeight: 'bold',
    color: 'red',
  },
  monospaceText: {
    fontSize: normaliseFont(14),
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
    fontSize: normaliseFont(14),
    color: 'red',
  },
  sendOrderMessage: {
    //borderWidth: 1, //testing
  },
  sendOrderMessageText: {
    fontSize: normaliseFont(14),
    color: 'red',
  },
});


let stylePaymentOptionButton = StyleSheet.create({
  borderWidth: 1,
  borderRadius: scaledWidth(18),
  backgroundColor: colors.standardButton,
});

let stylePaymentOptionButtonDisabled = StyleSheet.create({
  borderWidth: 1,
  borderRadius: scaledWidth(18),
  backgroundColor: colors.greyedOutIcon,
});


let stylePaymentOptionButtonAdditionalText = StyleSheet.create({
  fontWeight: 'bold',
});

let stylePaymentOptionButtonAdditionalTextDisabled = StyleSheet.create({
  fontWeight: 'bold',
  color: colors.greyedOutIcon,
});


let styleConditionButton = StyleSheet.create({
  view: {

  },
});


export default ChooseHowToPay;

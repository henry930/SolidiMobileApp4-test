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
  let firstRender = misc.useFirstRender();
  let stateChangeID = appState.stateChangeID;
  let [renderCount, triggerRender] = useState(0);

  let pageName = appState.pageName;
  let permittedPageNames = 'default solidi balance'.split(' ');
  misc.confirmItemInArray('permittedPageNames', permittedPageNames, pageName, 'ChooseHowToReceivePayment');
  if (pageName == 'default') pageName = 'balance';
  //pageName = 'solidi'; //testing

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
  if (appState.appTier == 'dev' && appState.panels.sell.volumeQA == '0') {
    log("TESTING");
    // Create an order.
    _.assign(appState.panels.sell, {volumeQA: '10.00', assetQA: 'GBP', volumeBA: '0.00040251', assetBA: 'BTC'});
    appState.panels.sell.activeOrder = true;
  }

   // Load order details.
   // - Note: We ignore the volumeBA chosen earlier by the fetchBestPrice function, and select only from the volumeBA values returned by the fetchPrices function.
  ({volumeQA, volumeBA, assetQA, assetBA} = appState.panels.sell);


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
      setErrorMessage('');
      setDisableConfirmButton(false);
      setIsLoading(false);
      triggerRender(renderCount+1);
    } catch(err) {
      let msg = `ChooseHowToReceivePayment.setup: Error = ${err}`;
      console.log(msg);
    }
  }


  let getBankAccount = () => {
    return appState.getDefaultAccountForAsset('GBP');
  }


  let bankAccountDetailsAreEmpty = () => {
    // Load user's external GBP account.
    let account = appState.getDefaultAccountForAsset('GBP');
    //lj(account);
    let keys = 'accountName sortCode accountNumber'.split(' ');
    if (keys.every(k => _.has(account, k))) {
      if (
        ! _.isEmpty(account.accountName) &&
        ! _.isEmpty(account.sortCode) &&
        ! _.isEmpty(account.accountNumber)
      ) {
        return false;
      }
    }
    return true;
  }


  let fetchPaymentChoiceDetails = async () => {
    // Fees may differ depending on the volume and on the user (e.g. whether the user has crossed a fee inflection point).
    // We therefore request the details for each payment choice from the API, using the specific quoteAssetVolume.
    let market = assetBA + '/' + assetQA;
    let side = 'SELL';
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
      "balance":{"baseAssetVolume":"0.00042782","baseOrQuoteAsset":"quote","feeVolume":"0.00","market":"BTC/GBP","paymentMethod":"balance","quoteAssetVolume":"10.00","side":"SELL"},
      "solidi":{"baseAssetVolume":"0.00042782","baseOrQuoteAsset":"quote","feeVolume":"0.00","market":"BTC/GBP","paymentMethod":"solidi","quoteAssetVolume":"10.00","side":"SELL"}
    }
    */
    paymentChoiceDetails = output;
    // Testing
    testTweaks = false;
    if (testTweaks) {
      paymentChoiceDetails['solidi'].feeVolume = '0.51';
      paymentChoiceDetails['solidi'].baseAssetVolume = '0.00043000';
    lj({paymentChoiceDetails});
    }
    return paymentChoiceDetails;
  }


  let calculateVolumeBA = () => {
    if (_.isEmpty(paymentChoiceDetails)) return '';
    if (! _.has(paymentChoiceDetails, paymentChoice)) return '';
    let baseAssetVolume = paymentChoiceDetails[paymentChoice]['baseAssetVolume'];
    baseAssetVolume = appState.getFullDecimalValue({asset: assetBA, value: baseAssetVolume, functionName: 'ChooseHowToPay'});
    //log(`Payment method = ${paymentChoice}: baseAssetVolume = ${baseAssetVolume} ${assetBA}`);
    return baseAssetVolume;
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
    // Importantly, note that we _subtract_ the fee from the volumeQA.
    // - Unlike the Buy process, here we charge the fee after the sell order has completed, and we take it from the result that leaves the trade engine.
    // - In the Buy process, we charge the fee before filling the order, and we add it to the amount that goes into the trade engine.
    let feeVolume;
    if (! _.isNil(params)) {
      ({feeVolume} = params);
    }
    if (_.isNil(feeVolume)) feeVolume = calculateFeeQA();
    if (_.isEmpty(feeVolume)) return ''; // We can't know the total without the fee.
    let volumeQA2 = appState.getFullDecimalValue({asset: assetQA, value: volumeQA, functionName: 'ChooseHowToPay'});
    let quoteDP = appState.getAssetInfo(assetQA).decimalPlaces;
    let total = Big(volumeQA2).minus(Big(feeVolume)).toFixed(quoteDP);
    return total;
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
    // Get volumeBA.
    volumeBA = calculateVolumeBA();
    // Save volumeBA in the appState.
    appState.panels.sell.volumeBA = volumeBA;
    // Create the order object.
    let sellOrder = {volumeQA, volumeBA, assetQA, assetBA, paymentMethod: paymentChoice};
    // Choose the receive-payment function.
    // Note: These functions are currently identical, but may diverge in future. Keep them separate.
    if (paymentChoice === 'solidi') {
      // Choice: Make a direct payment to the customer's primary external fiat account.
      // Note: In this case, the server will perform a withdrawal automatically after filling the order.
      // We check if the user has supplied a default account at which they can receive a payment.
      // If they haven't, stash the current state, and redirect them.
      // Note: We're only handling GBP at the moment.
      if (bankAccountDetailsAreEmpty()) {
        let msg = `No default account found for ${assetQA}. Redirecting so that user can input account details.`;
        log(msg);
        appState.stashState({mainPanelState: appState.mainPanelState, pageName: paymentChoice});
        return appState.changeState('BankAccounts');
      } else {
        await receivePayment(sellOrder);
      }
    } else {
      // Choice: Pay with balance.
      await receivePaymentToBalance(sellOrder);
    }
  }


  let receivePayment = async (sellOrder) => {
    // We send the stored sell order.
    let output = await appState.sendSellOrder(sellOrder);
    if (appState.stateChangeIDHasChanged(stateChangeID, 'ChooseHowToReceivePayment')) return;
    lj(output);
    appState.panels.sell.output = output;
    if (_.has(output, 'error')) {
      setErrorMessage(misc.itemToString(output.error));
    } else if (_.has(output, 'result')) {
      let result = output.result;
      if (result == 'NO_ACTIVE_ORDER') {
        setSendOrderMessage('No active order.');
      } else if (result == 'PRICE_CHANGE') {
        await handlePriceChange(output);
      } else if (result == 'EXCEEDS_LIMITS') {
        appState.changeState('LimitsExceeded', 'sell');
      } else { // 'FILLED'
        // Retrieve feeVolume from order result, calculate totalVolume, and store the results in the app memory.
        let feeVolume = output.fees;
        let totalVolumeQA = calculateTotalQA({feeVolume});
        lj({feeVolume, totalVolumeQA})
        appState.panels.sell.feeQA = feeVolume;
        appState.panels.sell.totalQA = totalVolumeQA;
        appState.changeState('SaleSuccessful', paymentChoice);
      }
    }
  }


  let receivePaymentToBalance = async (sellOrder) => {
    // We send the stored sell order.
    let output = await appState.sendSellOrder(sellOrder);
    if (appState.stateChangeIDHasChanged(stateChangeID, 'ChooseHowToReceivePayment')) return;
    lj(output);
    appState.panels.sell.output = output;
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
        lj({feeVolume, totalVolumeQA})
        appState.panels.sell.feeQA = feeVolume;
        appState.panels.sell.totalQA = totalVolumeQA;
        appState.changeState('SaleSuccessful', paymentChoice);
      } else if (result == 'EXCEEDS_LIMITS') {
        appState.changeState('LimitsExceeded', 'sell');
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
    - We don't want to change the amount the user is selling for (because that's what they expect to receive), so we update baseAssetVolume.
    */
    /* Example output:
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
    // priceDown = Did the quoteAssetVolume (that the user would receive) go down ?
    let priceDown = Big(newVolumeQA).lt(Big(volumeQA));
    let baseDP = appState.getAssetInfo(assetBA).decimalPlaces;
    let priceDiff = Big(newVolumeQA).minus(Big(volumeQA)).toFixed(baseDP);
    log(`price change: volumeQA = ${volumeQA}, newVolumeQA = ${newVolumeQA}, priceDiff = ${priceDiff}`);
    // Save the new order details.
    volumeBA = calculateVolumeBA();
    appState.panels.sell.volumeBA = volumeBA;
    appState.panels.sell.activeOrder = true;
    setDisableConfirmButton(false);
    setSendOrderMessage('');
    let priceUp = ! priceDown;
    let suffix = priceUp ? ' in your favour!' : '.';
    let msg = `The market price has shifted${suffix} Your order has been updated. Please check the details and click "Confirm & Pay" again to proceed.`;
    setPriceChangeMessage(msg);
    refScrollView.current.scrollToEnd();
    triggerRender(renderCount+1);
  }


  let getBalanceDescription = () => {
    let balanceQA = appState.getBalance(assetQA);
    let result = 'Your balance: ' + balanceQA;
    if (balanceQA != '[loading]') {
      result += ' ' + assetQA;
    }
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

      <ScrollView ref={refScrollView} showsVerticalScrollIndicator={true} contentContainerStyle={{ flexGrow: 1 }} >

        { isLoading &&
          <View style={styles.loadingMessage}>
            <Text style={styles.loadingMessageText}>Loading...</Text>
          </View>
        }

        <View style={styles.selectPaymentMethodSection}>

          <RadioButton.Group onValueChange={x => {
            log(`paymentChoice selected: ${x}`);
            setPaymentChoice(x);
          }} value={paymentChoice}>

          <RadioButton.Item label="Paid directly from Solidi" value="solidi"
            color={colors.standardButtonText}
            style={styles.button}
            labelStyle={styles.buttonLabel}
          />

          <View style={styles.buttonDetail}>
            <Text style={styles.bold}>{`\u2022  `} Paid to your bank account in 8 hours</Text>
            { ! bankAccountDetailsAreEmpty() &&
              <View>
              <Text style={styles.bold}>{`\u2022  `} Paying to: {getBankAccount().accountName}</Text>
              <Text style={styles.bold}>{`\u2022  `} Sort Code: {getBankAccount().sortCode}</Text>
              <Text style={styles.bold}>{`\u2022  `} Account Number: {getBankAccount().accountNumber}</Text>
              </View>
            }
          </View>

          <View style={styles.spacer}/>

          <RadioButton.Item label="Paid to balance" value="balance"
            color={colors.standardButtonText}
            style={styles.button}
            labelStyle={styles.buttonLabel}
          />

          <View style={styles.buttonDetail}>
            <Text style={styles.bold}>{`\u2022  `} Paid to your Solidi balance - No fee!</Text>
            <Text style={styles.bold}>{`\u2022  `} Processed instantly</Text>
            <Text style={styles.bold}>{`\u2022  `} {getBalanceDescription()}</Text>
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
            <Text style={[styles.monospaceText, styles.bold]}>{calculateVolumeBA()} {assetBA}</Text>
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

        <View style={styles.errorMessage}>
          <Text style={styles.errorMessageText}>{errorMessage}</Text>
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
  spacer: {
    marginBottom: scaledHeight(10),
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
  },
  priceChangeMessageText: {
    fontSize: normaliseFont(16),
    fontWeight: 'bold',
    color: 'red',
  },
  errorMessage: {
    //borderWidth: 1, //testing
    marginTop: scaledHeight(20),
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


let styleConditionButton = StyleSheet.create({
  view: {

  },
});


export default ChooseHowToReceivePayment;

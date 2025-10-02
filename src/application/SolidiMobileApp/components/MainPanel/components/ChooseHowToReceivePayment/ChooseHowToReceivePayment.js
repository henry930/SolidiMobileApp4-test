// React imports
import React, { useContext, useEffect, useRef, useState } from 'react';
import { ScrollView, View, StyleSheet, TouchableOpacity } from 'react-native';
import { 
  RadioButton, 
  Card, 
  Text, 
  Button, 
  Surface, 
  ActivityIndicator,
  Chip,
  Icon,
  Divider
} from 'react-native-paper';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Icon2 from 'react-native-vector-icons/MaterialCommunityIcons';

// Other imports
import _ from 'lodash';
import Big from 'big.js';

// Internal imports
import AppStateContext from 'src/application/data';
import { colors } from 'src/constants';
import { StandardButton } from 'src/components/atomic';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
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
    // We want to keep the quoteAssetVolume (chosen on the Sell page) constant if possible, because the user expects to receive a certain volume in the quoteAsset.
    let market = assetBA + '/' + assetQA;
    let side = 'SELL';
    let baseOrQuoteAsset = 'quote';
    let params = {market, side, baseOrQuoteAsset, quoteAssetVolume: calculateVolumeQA()};
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
    // Save results.
    paymentChoiceDetails = output;
    /*
    - Problem: The baseAssetVolume might be greater than the baseAsset balance, which is the maximum volume that we can sell.
    - In this case, we need to recalculate with the balance volume.
    */
    paymentChoiceDetails.sellingEntireBaseAssetBalance = false;
    let output2;
    let balanceBA = appState.getBalance(assetBA);
    let balanceExceeded = false;
    if (Big(output.balance.baseAssetVolume).gt(Big(balanceBA))) {
      balanceExceeded = true;
      log(`For paymentChoice='balance', required baseAssetVolume = ${output.balance.baseAssetVolume}, which is greater than the available balance: ${balanceBA} ${assetBA}`);
    }
    if (Big(output.solidi.baseAssetVolume).gt(Big(balanceBA))) {
      balanceExceeded = true;
      log(`For paymentChoice='solidi', required baseAssetVolume = ${output.solidi.baseAssetVolume}, which is greater than the available balance: ${balanceBA} ${assetBA}`);
    }
    if (balanceExceeded) {
      log(`paymentChoiceDetails: Fetch price in quoteAssetVolume for selling the available balance.`);
      let params2 = {market, side, baseOrQuoteAsset: 'base', baseAssetVolume: balanceBA};
      output2 = await appState.fetchPricesForASpecificVolume(params2);
      lj({output2});
      if (_.has(output2, 'error')) {
        logger.error(output2.error);
        return;
      }
      // Save results.
      paymentChoiceDetails = output2;
      paymentChoiceDetails.sellingEntireBaseAssetBalance = true;
    }
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


  let calculateVolumeQA = () => {
    // In the event that we're selling the entire balance, we can't use the quoteAssetVolume value that was originally chosen on the Sell page.
    // Also, the final volumeQA may differ depending on the payment choice.
    //lj({paymentChoiceDetails})
    //lj({paymentChoice})
    if (
      _.has(paymentChoiceDetails, 'sellingEntireBaseAssetBalance') &&
      paymentChoiceDetails.sellingEntireBaseAssetBalance === true &&
      _.has(paymentChoiceDetails, paymentChoice) &&
      _.has(paymentChoiceDetails[paymentChoice], 'quoteAssetVolume')
    ) {
      return paymentChoiceDetails[paymentChoice].quoteAssetVolume;
    }
    // By default, return the original volume.
    return volumeQA;
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
    let volumeQA2 = appState.getFullDecimalValue({asset: assetQA, value: calculateVolumeQA(), functionName: 'ChooseHowToPay'});
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
    let sellOrder = {volumeQA: calculateVolumeQA(), volumeBA, assetQA, assetBA, paymentMethod: paymentChoice};
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
      } else if (result == 'WITHDRAW_DISABLED') {
        appState.panels.sell.output = output;
        appState.changeState('AccountRestricted', 'sell');
      } else { // 'FILLED'
        // Retrieve feeVolume from order result, calculate totalVolume, and store the results in the app memory.
        let feeVolume = output.fees;
        let totalVolumeQA = calculateTotalQA({feeVolume});
        lj({feeVolume, totalVolumeQA});
        appState.panels.sell.feeQA = feeVolume;
        appState.panels.sell.totalQA = totalVolumeQA;
        appState.changeStateParameters.orderID = appState.panels.sell.orderID;
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
        lj({feeVolume, totalVolumeQA});
        appState.panels.sell.feeQA = feeVolume;
        appState.panels.sell.totalQA = totalVolumeQA;
        appState.changeStateParameters.orderID = appState.panels.sell.orderID;
        appState.changeState('SaleSuccessful', paymentChoice);
      } else if (result == 'EXCEEDS_LIMITS') {
        appState.changeState('LimitsExceeded', 'sell');
      } else if (result == 'WITHDRAW_DISABLED') {
        appState.panels.sell.output = output;
        appState.changeState('AccountRestricted', 'sell');
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
    // Future: Check in 'details' for errors.
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
    <View style={modernStyles.panelContainer}>
      <Surface style={modernStyles.headerSurface} elevation={2}>
        <Text style={modernStyles.headerTitle}>Choose how to be paid</Text>
        <Text style={modernStyles.headerSubtitle}>Select your preferred payment method for receiving funds</Text>
      </Surface>

      <KeyboardAwareScrollView 
        style={modernStyles.scrollView}
        contentContainerStyle={modernStyles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        
        {/* Order Summary Card - Moved to top */}
        <Card style={modernStyles.orderSummaryCard}>
          <Card.Content style={modernStyles.cardContent}>
            <View style={modernStyles.cardHeader}>
              <Icon2 name="receipt" size={24} color="#007AFF" />
              <Text style={modernStyles.cardTitle}>Order Summary</Text>
            </View>
            
            <View style={modernStyles.orderDetails}>
              <View style={modernStyles.orderRow}>
                <Text style={modernStyles.orderLabel}>You're selling</Text>
                <Text style={modernStyles.orderValue}>{calculateVolumeBA()} {assetBA}</Text>
              </View>
              
              <View style={modernStyles.orderRow}>
                <Text style={modernStyles.orderLabel}>You'll receive</Text>
                <Text style={modernStyles.orderValue}>
                  {appState.getFullDecimalValue({asset: assetQA, value: calculateVolumeQA(), functionName: 'ChooseHowToReceivePayment'})} {assetQA}
                </Text>
              </View>
              
              <View style={modernStyles.orderRow}>
                <Text style={modernStyles.orderLabel}>Processing fee</Text>
                <Text style={modernStyles.orderValue}>{calculateFeeQA()} {assetQA}</Text>
              </View>
              
              <Divider style={{ marginVertical: 12 }} />
              
              <View style={[modernStyles.orderRow, modernStyles.totalRow]}>
                <Text style={modernStyles.totalLabel}>Total amount</Text>
                <Text style={modernStyles.totalValue}>{calculateTotalQA()} {assetQA}</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Payment Methods */}
        <Card style={modernStyles.paymentMethodsCard}>
          <Card.Content style={modernStyles.cardContent}>
            <View style={modernStyles.cardHeader}>
              <Icon2 name="bank-transfer" size={24} color="#007AFF" />
              <Text style={modernStyles.cardTitle}>How would you like to be paid?</Text>
            </View>

            {/* Payment Method Selection */}
            <View style={modernStyles.paymentMethodsContainer}>
              
              {/* Bank Transfer Payment Option */}
              <TouchableOpacity 
                onPress={() => {
                  log(`paymentChoice selected: solidi`);
                  setPaymentChoice('solidi');
                }}
                activeOpacity={0.7}
                style={[
                  modernStyles.paymentMethodCard,
                  paymentChoice === 'solidi' && modernStyles.selectedCard
                ]}
              >
                <Card style={[
                  modernStyles.card,
                  paymentChoice === 'solidi' && modernStyles.cardSelected
                ]}>
                  <Card.Content style={modernStyles.cardContent}>
                    <View style={modernStyles.paymentMethodHeader}>
                      <View style={modernStyles.paymentMethodTitleContainer}>
                        <Icon2 name="bank-transfer" size={24} color="#007AFF" />
                        <Text style={modernStyles.paymentMethodTitle}>Bank Transfer</Text>
                        <View style={modernStyles.feeBadge}>
                          <Text style={modernStyles.feeBadgeText}>NO FEE</Text>
                        </View>
                      </View>
                      <RadioButton 
                        value="solidi"
                        status={paymentChoice === 'solidi' ? 'checked' : 'unchecked'}
                        color="#007AFF"
                      />
                    </View>
                    <View style={modernStyles.paymentMethodDetails}>
                      <View style={modernStyles.featureRow}>
                        <Icon2 name="clock-fast" size={16} color="#4CAF50" />
                        <Text style={modernStyles.featureText}>Paid to your bank account in 8 hours</Text>
                      </View>
                      { ! bankAccountDetailsAreEmpty() && (
                        <>
                          <View style={modernStyles.featureRow}>
                            <Icon2 name="bank" size={16} color="#4CAF50" />
                            <Text style={modernStyles.featureText}>Paying to: {getBankAccount().accountName}</Text>
                          </View>
                          <View style={modernStyles.featureRow}>
                            <Icon2 name="credit-card-outline" size={16} color="#4CAF50" />
                            <Text style={modernStyles.featureText}>Sort Code: {getBankAccount().sortCode}</Text>
                          </View>
                          <View style={modernStyles.featureRow}>
                            <Icon2 name="pound" size={16} color="#4CAF50" />
                            <Text style={modernStyles.featureText}>Account: {getBankAccount().accountNumber}</Text>
                          </View>
                        </>
                      )}
                    </View>
                  </Card.Content>
                </Card>
              </TouchableOpacity>

              {/* Balance Payment Option */}
              <TouchableOpacity 
                onPress={() => {
                  log(`paymentChoice selected: balance`);
                  setPaymentChoice('balance');
                }}
                activeOpacity={0.7}
                style={[
                  modernStyles.paymentMethodCard,
                  paymentChoice === 'balance' && modernStyles.selectedCard
                ]}
              >
                <Card style={[
                  modernStyles.card,
                  paymentChoice === 'balance' && modernStyles.cardSelected
                ]}>
                  <Card.Content style={modernStyles.cardContent}>
                    <View style={modernStyles.paymentMethodHeader}>
                      <View style={modernStyles.paymentMethodTitleContainer}>
                        <Icon2 name="wallet" size={24} color="#4CAF50" />
                        <Text style={modernStyles.paymentMethodTitle}>Solidi Balance</Text>
                        <View style={modernStyles.popularBadge}>
                          <Text style={modernStyles.popularBadgeText}>INSTANT</Text>
                        </View>
                      </View>
                      <RadioButton 
                        value="balance"
                        status={paymentChoice === 'balance' ? 'checked' : 'unchecked'}
                        color="#007AFF"
                      />
                    </View>
                    <View style={modernStyles.paymentMethodDetails}>
                      <View style={modernStyles.featureRow}>
                        <Icon2 name="flash" size={16} color="#4CAF50" />
                        <Text style={modernStyles.featureText}>Paid to your Solidi balance - No fee!</Text>
                      </View>
                      <View style={modernStyles.featureRow}>
                        <Icon2 name="check-circle" size={16} color="#4CAF50" />
                        <Text style={modernStyles.featureText}>Processed instantly</Text>
                      </View>
                      <View style={modernStyles.featureRow}>
                        <Icon2 name="information" size={16} color="#666" />
                        <Text style={modernStyles.featureText}>{getBalanceDescription()}</Text>
                      </View>
                    </View>
                  </Card.Content>
                </Card>
              </TouchableOpacity>

            </View>
          </Card.Content>
        </Card>

        {/* Payment Conditions Button */}
        <View style={modernStyles.conditionsContainer}>
          <Button 
            mode="text" 
            onPress={readPaymentConditions}
            icon="file-document-outline"
            textColor="#007AFF"
            style={modernStyles.conditionsButton}
          >
            Our payment conditions
          </Button>
        </View>

        {/* Messages */}
        {priceChangeMessage ? (
          <Card style={modernStyles.messageCard}>
            <Card.Content style={modernStyles.messageContent}>
              <Icon2 name="alert-circle" size={20} color="#FF9800" />
              <Text style={modernStyles.priceChangeText}>{priceChangeMessage}</Text>
            </Card.Content>
          </Card>
        ) : null}

        {errorMessage ? (
          <Card style={modernStyles.errorCard}>
            <Card.Content style={modernStyles.messageContent}>
              <Icon2 name="alert-circle-outline" size={20} color="#F44336" />
              <Text style={modernStyles.errorText}>{errorMessage}</Text>
            </Card.Content>
          </Card>
        ) : null}

        {/* Confirm Button */}
        <View style={modernStyles.confirmButtonContainer}>
          <Button
            mode="contained"
            onPress={confirmReceivePaymentChoice}
            disabled={disableConfirmButton}
            style={[
              modernStyles.confirmButton,
              disableConfirmButton && modernStyles.disabledButton
            ]}
            contentStyle={modernStyles.confirmButtonContent}
            labelStyle={modernStyles.confirmButtonText}
            icon="check-circle"
          >
            Confirm & Sell
          </Button>
          
          {sendOrderMessage ? (
            <Text style={modernStyles.sendOrderText}>{sendOrderMessage}</Text>
          ) : null}
        </View>

      </KeyboardAwareScrollView>
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
  basicText: {
    fontSize: normaliseFont(14),
  },
  bold: {
    fontWeight: 'bold',
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

// Modern styles matching ChooseHowToPay
let modernStyles = StyleSheet.create({
  panelContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerSurface: {
    backgroundColor: 'white',
    paddingHorizontal: scaledWidth(20),
    paddingVertical: scaledHeight(20),
    marginBottom: scaledHeight(10),
  },
  headerTitle: {
    fontSize: normaliseFont(24),
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: scaledHeight(5),
  },
  headerSubtitle: {
    fontSize: normaliseFont(16),
    color: '#666',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scaledWidth(20),
    paddingBottom: scaledHeight(40),
  },
  
  // Order Summary Card (at top)
  orderSummaryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginTop: scaledHeight(10),
    marginBottom: scaledHeight(15),
  },
  
  // Payment Methods Card
  paymentMethodsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: scaledHeight(15),
  },
  
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scaledHeight(20),
  },
  cardTitle: {
    fontSize: normaliseFont(18),
    fontWeight: 'bold',
    color: '#333',
    marginLeft: scaledWidth(10),
  },
  
  // Order Summary Details (matching ChooseHowToPay)
  orderDetails: {
    marginTop: scaledHeight(10),
  },
  
  paymentMethodsContainer: {
    marginTop: scaledHeight(10),
  },
  paymentMethodCard: {
    marginBottom: scaledHeight(15),
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardSelected: {
    borderColor: '#007AFF',
    borderWidth: 2,
    elevation: 4,
    shadowOpacity: 0.15,
  },
  selectedCard: {
    transform: [{ scale: 1.02 }],
  },
  cardContent: {
    padding: scaledWidth(20),
  },
  paymentMethodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scaledHeight(15),
  },
  paymentMethodTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentMethodTitle: {
    fontSize: normaliseFont(18),
    fontWeight: 'bold',
    color: '#333',
    marginLeft: scaledWidth(10),
    flex: 1,
  },
  feeBadge: {
    backgroundColor: '#E8F5E8',
    borderRadius: 12,
    paddingHorizontal: scaledWidth(8),
    paddingVertical: scaledHeight(4),
  },
  feeBadgeText: {
    fontSize: normaliseFont(12),
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  popularBadge: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    paddingHorizontal: scaledWidth(8),
    paddingVertical: scaledHeight(4),
  },
  popularBadgeText: {
    fontSize: normaliseFont(12),
    fontWeight: 'bold',
    color: '#2196F3',
  },
  paymentMethodDetails: {
    marginTop: scaledHeight(10),
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scaledHeight(8),
  },
  featureText: {
    fontSize: normaliseFont(14),
    color: '#555',
    marginLeft: scaledWidth(8),
    flex: 1,
  },
  conditionsContainer: {
    alignItems: 'center',
    marginVertical: scaledHeight(20),
  },
  conditionsButton: {
    borderColor: '#007AFF',
  },
  divider: {
    backgroundColor: '#E0E0E0',
    height: 1,
    marginVertical: scaledHeight(20),
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: scaledHeight(20),
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scaledHeight(20),
  },
  summaryTitle: {
    fontSize: normaliseFont(18),
    fontWeight: 'bold',
    color: '#333',
    marginLeft: scaledWidth(10),
  },
  orderDetailsContainer: {
    marginTop: scaledHeight(10),
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: scaledHeight(8),
  },
  orderLabel: {
    fontSize: normaliseFont(16),
    color: '#666',
  },
  orderValue: {
    fontSize: normaliseFont(16),
    fontWeight: '600',
    color: '#333',
    fontVariant: ['tabular-nums'],
  },
  orderDivider: {
    backgroundColor: '#E0E0E0',
    height: 1,
    marginVertical: scaledHeight(10),
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: scaledHeight(15),
    marginTop: scaledHeight(10),
  },
  totalLabel: {
    fontSize: normaliseFont(18),
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: normaliseFont(18),
    fontWeight: 'bold',
    color: '#007AFF',
    fontVariant: ['tabular-nums'],
  },
  messageCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    marginBottom: scaledHeight(15),
  },
  errorCard: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    marginBottom: scaledHeight(15),
  },
  messageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scaledWidth(15),
  },
  priceChangeText: {
    fontSize: normaliseFont(14),
    color: '#FF9800',
    marginLeft: scaledWidth(10),
    flex: 1,
  },
  errorText: {
    fontSize: normaliseFont(14),
    color: '#F44336',
    marginLeft: scaledWidth(10),
    flex: 1,
  },
  confirmButtonContainer: {
    marginTop: scaledHeight(20),
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
    borderRadius: 25,
    paddingVertical: scaledHeight(5),
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    width: '100%',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  confirmButtonContent: {
    paddingVertical: scaledHeight(12),
  },
  confirmButtonText: {
    fontSize: normaliseFont(18),
    fontWeight: 'bold',
    color: 'white',
  },
  sendOrderText: {
    fontSize: normaliseFont(14),
    color: '#F44336',
    marginTop: scaledHeight(10),
    textAlign: 'center',
  },
});


let styleConditionButton = StyleSheet.create({
  view: {

  },
});


export default ChooseHowToReceivePayment;

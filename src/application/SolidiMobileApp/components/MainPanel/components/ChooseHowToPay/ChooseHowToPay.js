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
import { sharedStyles as styles, layoutStyles as layout, textStyles as text, cardStyles as cards, buttonStyles as buttons, formStyles as forms } from 'src/styles';

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
  let permittedPageNames = 'default solidi balance openbank buy'.split(' ');
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
  // -- Update: In the unusual case where all the payment methods are disabled (this occurs if somehow the user has not undergone any ID verification), we use the volumeBA value from here.
  ({volumeQA, volumeBA, assetQA, assetBA} = appState.panels.buy);


  // Initial setup.
  useEffect( () => {
    setup();
  }, []); // Pass empty array to only run once on mount.

  // Re-trigger render when payment choice changes to update totals
  useEffect(() => {
    if (!_.isEmpty(paymentChoiceDetails)) {
      triggerRender(renderCount + 1);
    }
  }, [paymentChoice, paymentChoiceDetails]);


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
      deb(msg);
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
    if (! _.has(paymentChoiceDetails[paymentChoice], 'baseAssetVolume')) return volumeBA;
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
    // If we don't have payment choice details yet, return a default fee
    if (_.isEmpty(paymentChoiceDetails)) {
      return '0.00';
    }
    
    if (! _.has(paymentChoiceDetails, paymentChoice)) {
      return '0.00';
    }
    
    let feeVolume = paymentChoiceDetails[paymentChoice]['feeVolume'];
    feeVolume = appState.getFullDecimalValue({asset: assetQA, value: feeVolume, functionName: 'ChooseHowToPay'});
    return feeVolume;
  }


  let calculateTotalQA = () => {
    let fee = calculateFeeQA();
    
    // Handle empty fee gracefully
    if (!fee || fee === '') {
      fee = '0.00';
    }
    
    // Use the volumeQA variable that's already available from appState.panels.buy
    let volumeQA_value = appState.getFullDecimalValue({asset: assetQA, value: volumeQA, functionName: 'ChooseHowToPay'});
    let total = new Big(volumeQA_value).plus(new Big(fee)).toFixed(2);
    
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


  let paymentOptionDisabled = (methodKey) => {
    // If still loading, disable all options
    if (isLoading) {
      return true;
    }
    
    // If no payment choice details available, disable
    if (_.isEmpty(paymentChoiceDetails)) {
      return true;
    }
    
    // If this specific method isn't available, disable
    if (!_.has(paymentChoiceDetails, methodKey)) {
      return false; // Keep the original "hacky" behavior for now
    }
    
    // Skip error checking to allow selection even with insufficient currency
    // (Removed the error check that was preventing selection)
    
    if (methodKey === 'balance' && balanceTooSmall()) {
      return true;
    }
    
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
    console.log('🔄 CONSOLE: ===== SEND BUY ORDER API CALL (ChooseHowToPay.js) =====');
    console.log('📤 CONSOLE: About to call appState.sendBuyOrder...');
    console.log('📤 CONSOLE: buyOrder:', buyOrder);
    console.log('📤 CONSOLE: selectedPaymentChoice:', selectedPaymentChoice);
    let output = await appState.sendBuyOrder(buyOrder);
    console.log('📨 CONSOLE: ===== SEND BUY ORDER API RESPONSE (ChooseHowToPay.js) =====');
    console.log('📨 CONSOLE: Raw sendBuyOrder response:', output);
    console.log('📨 CONSOLE: Response type:', typeof output);
    console.log('📨 CONSOLE: Response JSON:', JSON.stringify(output, null, 2));
    console.log('📨 CONSOLE: ===== END SEND BUY ORDER API RESPONSE (ChooseHowToPay.js) =====');
    
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
      } else if (result == 'WITHDRAW_DISABLED') {
        appState.panels.buy.output = output;
        appState.changeState('AccountRestricted', 'buy');
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
      } else if (result == 'WITHDRAW_DISABLED') {
        appState.panels.buy.output = output;
        appState.changeState('AccountRestricted', 'buy');
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
    return result;
  }


  return (
    <View style={[layout.flex1, { backgroundColor: '#f5f5f5' }]}>
      <KeyboardAwareScrollView 
        ref={refScrollView} 
        style={layout.flex1}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Order Summary Card */}
        <Card style={modernStyles.orderSummaryCard}>
          <Card.Content style={modernStyles.cardContent}>
            <View style={modernStyles.cardHeader}>
              <Icon2 name="receipt" size={24} color="#007AFF" />
              <Text style={modernStyles.cardTitle}>Order Summary</Text>
            </View>
            
            <View style={modernStyles.orderDetails}>
              <View style={modernStyles.orderRow}>
                <Text style={modernStyles.orderLabel}>You're buying</Text>
                <Text style={modernStyles.orderValue}>{calculateVolumeBA()} {assetBA}</Text>
              </View>
              
              <View style={modernStyles.orderRow}>
                <Text style={modernStyles.orderLabel}>You'll spend</Text>
                <Text style={modernStyles.orderValue}>{calculateVolumeQA()} {assetQA}</Text>
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
              
              {/* Debug info */}
              <View style={{ marginTop: 8, opacity: 0.7 }}>
                <Text style={{ fontSize: 10, color: '#666' }}>
                  Payment Method: {paymentChoice} | Render: {renderCount}
                </Text>
                <Text style={{ fontSize: 10, color: '#666' }}>
                  Fee: {calculateFeeQA()} | Total: {calculateTotalQA()}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Order Validity Warning */}
        <Card style={[modernStyles.messageCard, modernStyles.warningCard]}>
          <Card.Content>
            <View style={modernStyles.messageContent}>
              <Icon2 name="clock-alert" size={24} color="#FF9800" />
              <View style={modernStyles.warningTextContainer}>
                <Text style={modernStyles.warningText}>
                  This order is only valid within 30 minutes.
                </Text>
                <Text style={modernStyles.warningSubtext}>
                  The price will change every 5 minutes.
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Terms and Conditions */}
        <View style={modernStyles.termsSection}>
          <TouchableOpacity 
            onPress={readPaymentConditions}
            style={modernStyles.termsButton}
          >
            <Icon2 name="file-document-outline" size={20} color="#007AFF" />
            <Text style={modernStyles.termsText}>View payment conditions</Text>
            <Icon2 name="chevron-right" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {/* Error and Status Messages */}
        {priceChangeMessage ? (
          <Card style={[modernStyles.messageCard, modernStyles.warningCard]}>
            <Card.Content>
              <View style={modernStyles.messageContent}>
                <Icon2 name="alert-circle" size={24} color="#FF9800" />
                <Text style={modernStyles.warningText}>{priceChangeMessage}</Text>
              </View>
            </Card.Content>
          </Card>
        ) : null}

        {errorMessage ? (
          <Card style={[modernStyles.messageCard, modernStyles.errorCard]}>
            <Card.Content>
              <View style={modernStyles.messageContent}>
                <Icon2 name="alert-circle" size={24} color="#F44336" />
                <Text style={modernStyles.errorText}>{errorMessage}</Text>
              </View>
            </Card.Content>
          </Card>
        ) : null}

        {/* Confirm Button */}
        <View style={modernStyles.buttonContainer}>
          <Button
            mode="contained"
            onPress={confirmPaymentChoice}
            disabled={disableConfirmButton}
            loading={disableConfirmButton && sendOrderMessage}
            style={[
              modernStyles.confirmButton,
              disableConfirmButton && modernStyles.confirmButtonDisabled
            ]}
            contentStyle={modernStyles.confirmButtonContent}
            labelStyle={modernStyles.confirmButtonText}
            icon="check-circle"
          >
            {sendOrderMessage || "Confirm & Pay"}
          </Button>
          
          {sendOrderMessage && !errorMessage ? (
            <View style={modernStyles.loadingContainer}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={modernStyles.loadingText}>{sendOrderMessage}</Text>
            </View>
          ) : null}
        </View>

      </KeyboardAwareScrollView>
    </View>
  )

}

// Modern Styles
const modernStyles = StyleSheet.create({
  header: {
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  headerProgress: {
    alignItems: 'center',
  },
  progressText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  
  // Enhanced Payment Method Cards
  paymentMethodCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    elevation: 2,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedPaymentCard: {
    borderColor: '#007AFF',
    borderWidth: 2,
    elevation: 4,
    backgroundColor: '#f8fbff',
  },
  disabledPaymentCard: {
    opacity: 0.6,
    backgroundColor: '#f5f5f5',
  },
  paymentCardContent: {
    padding: 16,
  },
  paymentMethodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentMethodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  feeBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  feeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  paymentMethodDetails: {
    marginTop: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  featureText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  disabledFeatureText: {
    fontSize: 14,
    color: '#F44336',
    marginLeft: 8,
    flex: 1,
    fontStyle: 'italic',
  },
  
  // Order Summary Card
  orderSummaryCard: {
    margin: 16,
    borderRadius: 12,
    elevation: 3,
  },
  cardContent: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 12,
  },
  orderDetails: {
    
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  orderLabel: {
    fontSize: 16,
    color: '#666',
  },
  orderValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalRow: {
    paddingVertical: 12,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },

  // Payment Methods Card
  paymentMethodsCard: {
    margin: 16,
    marginTop: 8,
    borderRadius: 12,
    elevation: 3,
  },
  
  // Simple working payment options
  simplePaymentOption: {
    borderRadius: 12,
    marginVertical: 4,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  paymentOptionLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  paymentDescriptionContainer: {
    paddingLeft: 56, // Align with RadioButton text
    paddingRight: 16,
    paddingBottom: 12,
    marginTop: -8,
  },
  paymentDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  disabledText: {
    fontSize: 12,
    color: '#F44336',
    fontStyle: 'italic',
    marginTop: 4,
  },

  // Terms Section
  termsSection: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  termsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8fbff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e3f2fd',
  },
  termsText: {
    flex: 1,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
    marginLeft: 12,
  },

  // Message Cards
  messageCard: {
    margin: 16,
    marginVertical: 8,
    borderRadius: 12,
  },
  warningCard: {
    backgroundColor: '#fff3e0',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  errorCard: {
    backgroundColor: '#ffebee',
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  messageContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  warningText: {
    fontSize: 14,
    color: '#E65100',
    fontWeight: '600',
  },
  warningSubtext: {
    fontSize: 12,
    color: '#F57F17',
    marginTop: 2,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#C62828',
    marginLeft: 12,
  },

  // Button Container
  buttonContainer: {
    margin: 16,
    marginTop: 8,
  },
  confirmButton: {
    borderRadius: 16,
    elevation: 3,
  },
  confirmButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  confirmButtonContent: {
    paddingVertical: 12,
  },
  confirmButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
});

// Legacy styles (keeping for potential compatibility)
let stylePaymentOptionButton = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: scaledWidth(18),
    backgroundColor: colors.standardButton,
  }
});

let stylePaymentOptionButtonDisabled = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: scaledWidth(18),
    backgroundColor: colors.greyedOutIcon,
  }
});

let stylePaymentOptionButtonAdditionalText = StyleSheet.create({
  text: {
    fontWeight: 'bold',
  }
});

let stylePaymentOptionButtonAdditionalTextDisabled = StyleSheet.create({
  text: {
    fontWeight: 'bold',
    color: colors.greyedOutIcon,
  }
});

let styleConditionButton = StyleSheet.create({
  view: {

  },
});


export default ChooseHowToPay;

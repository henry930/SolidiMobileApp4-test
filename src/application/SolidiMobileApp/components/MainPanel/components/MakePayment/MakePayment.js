// React imports
import React, { useContext, useEffect, useState } from 'react';
import { Text, StyleSheet, View, ScrollView } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import * as Progress from 'react-native-progress';

// Other imports
import _ from 'lodash';
import Big from 'big.js';

// Internal imports
import AppStateContext from 'src/application/data';
import { colors } from 'src/constants';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import { Button, StandardButton, ImageButton } from 'src/components/atomic';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('MakePayment');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);




let MakePayment = () => {

  let appState = useContext(AppStateContext);
  let stateChangeID = appState.stateChangeID;

  let [paymentConfirmed, setPaymentConfirmed] = useState(false);

  // Testing
  if (appState.appTier == 'dev' && appState.panels.buy.volumeQA == '0') {
    // Create an order.
    _.assign(appState.panels.buy, {volumeQA: '10.00', assetQA: 'GBP', volumeBA: '0.00036922', assetBA: 'BTC'});
    appState.panels.buy.activeOrder = true;
    appState.panels.buy.orderID = 7200;
  }

  // Load order details.
  ({volumeQA, volumeBA, assetQA, assetBA, feeQA, totalQA} = appState.panels.buy);

  // Load deposit account details.
  let detailsGBP = appState.user.info.depositDetails.GBP;
  let solidiAccountName = detailsGBP.accountName;
  let solidiSortCode = detailsGBP.sortCode;
  let solidiAccountNumber = detailsGBP.accountNumber;
  let paymentReference = detailsGBP.reference;

  // Initial setup.
  useEffect( () => {
    setup();
  }, []); // Pass empty array to only run once on mount.


  let setup = async () => {
    try {
      await appState.generalSetup();
      //await appState.loadInitialStuffAboutUser(); // direct testing
      checkDepositDetails(); // Comment this out when directly testing this page.
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
    } catch(err) {
      let msg = `MakePayment.setup: Error = ${err}`;
      console.log(msg);
    }
  }


  let checkDepositDetails = () => {
    // If deposit details are incomplete, something has gone wrong on the server.
    // i.e. The server has not been able to generate or to send a set of unique GBP deposit details for this user.
    let depositDetailsProblem = _.isEmpty(solidiAccountName) && _.isEmpty(solidiSortCode)
      && _.isEmpty(solidiAccountNumber) && _.isEmpty(paymentReference);
    if (depositDetailsProblem) {
      let errorMsg = `

Incomplete deposit details for ${appState.getAssetInfo('GBP').displayString}

- solidiAccountName: ${solidiAccountName}
- solidiSortCode: ${solidiSortCode}
- solidiAccountNumber: ${solidiAccountNumber}
- paymentReference: ${paymentReference}

`;
      appState.switchToErrorState({message:errorMsg});
    }
  }


  // Set up progress bar.
  let timeElapsedSeconds = 0;
  let maxTimeAllowedSeconds = 30 * 60; // 30 minutes.
  //maxTimeAllowedSeconds = 2 * 60; //testing
  let [timeElapsedMarker, setTimeElapsedMarker] = useState(0.0); // between 0 and 1.
  let intervalSeconds = 3;
  let incrementTimeElapsed = async () => {
    // Note: This function is a closure. It's holding the old values of several variables that (outside this function) get reset when the component is re-rendered.
    if (appState.stateChangeIDHasChanged(stateChangeID, 'MakePayment')) {
      clearInterval(appState.panels.makePayment.timerID);
      return;
    }
    timeElapsedSeconds += intervalSeconds;
    let newMarkerValue = timeElapsedSeconds / parseFloat(maxTimeAllowedSeconds);
    setTimeElapsedMarker(newMarkerValue);
    if (timeElapsedSeconds > maxTimeAllowedSeconds) {
      // Stop the timer.
      clearInterval(appState.panels.makePayment.timerID);
      // Call the server to find out if the user made the payment but did not click "I have paid" button.
      // If the payment has arrived, the order will have settled on the server.
      let orderStatus = await appState.fetchOrderStatus({orderID: appState.panels.buy.orderID});
      //log({orderStatus});
      // Change to next state.
      if (orderStatus.toUpperCase() == 'SETTLED') {
        appState.changeStateParameters.orderID = appState.panels.buy.orderID;
        appState.changeState('PurchaseSuccessful');
      } else {
        appState.changeState('PaymentNotMade');
      }
    }
  }
  // Set the timer on load.
  if (
    ! paymentConfirmed &&
    _.isNil(appState.panels.makePayment.timerID)
  ) {
    let timerID = setInterval(incrementTimeElapsed, intervalSeconds * 1000);
    appState.panels.makePayment.timerID = timerID;
  }
  // Update the display whenever timeElapsedMarker is reset.
  useEffect(() => {}, [timeElapsedMarker]);


  let copyToClipboard = async (x) => {
    Clipboard.setString(x);
    let testing = false;
    if (testing) {
      let text = await Clipboard.getString();
      log(`Copy text to clipboard: ${text}`);
    }
  }


  let confirmPayment = async () => {
    log("confirmPayment button has been clicked.");
    // Tell the server that the user has clicked "I have paid".
    // - The relevant settlement's status needs to be updated to "S" (for "Sent").
    await appState.confirmPaymentOfBuyOrder({orderID: appState.panels.buy.orderID});
    // Continue to next stage.
    setPaymentConfirmed(true);
    clearInterval(appState.panels.makePayment.timerID);
    appState.changeState('WaitingForPayment');
  }


  return (
    <View style={styles.panelContainer}>
    <View style={styles.panelSubContainer}>

      <View style={[styles.heading, styles.heading1]}>
        <Text style={styles.headingText}>Pay by bank transfer</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={{ flexGrow: 1 }} >

      <View style={styles.instructionsSection}>
        <View style={styles.instructionItem}>
          <Text style={[styles.basicText, styles.bold]}>{`\u2022  `} You are buying {volumeBA} {appState.getAssetInfo(assetBA).displayString} for {appState.getFullDecimalValue({asset: assetQA, value: totalQA, functionName: 'MakePayment'})} {appState.getAssetInfo(assetQA).displayString}.</Text>
        </View>
        <View style={styles.instructionItem}>
          <Text style={[styles.basicText, styles.bold]}>{`\u2022  `} Send payment now using your online or telephone banking.</Text>
        </View>
        <View style={styles.instructionItem}>
          <Text style={[styles.basicText, styles.bold]}>{`\u2022  `} You have 30 minutes to send the payment.</Text>
          </View>
        <View style={styles.timerProgressBar}>
          <Progress.Bar progress={timeElapsedMarker} height={scaledHeight(8)} width={scaledWidth(200)} />
        </View>
        <View style={styles.importantInfoBox}>
          <Text style={styles.importantInfoBoxText}>You must include this unique reference:</Text>
          <Text style={styles.importantInfoBoxText}>{paymentReference}</Text>
        </View>
      </View>

      <View style={[styles.heading, styles.heading2]}>
        <Text style={styles.headingText}>Payment details</Text>
      </View>

      <View style={styles.paymentDetailsSection}>

        <View style={styles.paymentDetailsLine}>
          <Text style={styles.paymentDetailText}>Amount</Text>
          <View style={styles.paymentDetailValue}>
            <Text style={styles.paymentDetailText}>{appState.getFullDecimalValue({asset: assetQA, value: totalQA, functionName: 'MakePayment'})} {assetQA}</Text>
            <ImageButton imageName='clone' imageType='icon'
              styles={styleCopyButton}
              onPress={ () => { copyToClipboard(totalQA) } }
            />
          </View>
        </View>

        <View style={styles.paymentDetailsLine}>
          <Text style={styles.paymentDetailText}>Sort Code</Text>
          <View style={styles.paymentDetailValue}>
            <Text style={styles.paymentDetailText}>{solidiSortCode}</Text>
            <ImageButton imageName='clone' imageType='icon'
              styles={styleCopyButton}
              onPress={ () => { copyToClipboard(solidiSortCode) } }
            />
          </View>
        </View>

        <View style={styles.paymentDetailsLine}>
          <Text style={styles.paymentDetailText}>Account Number</Text>
          <View style={styles.paymentDetailValue}>
            <Text style={styles.paymentDetailText}>{solidiAccountNumber}</Text>
            <ImageButton imageName='clone' imageType='icon'
              styles={styleCopyButton}
              onPress={ () => { copyToClipboard(solidiAccountNumber) } }
            />
          </View>
        </View>

        <View style={styles.paymentDetailsLine}>
          <Text style={styles.paymentDetailText}>Account Name</Text>
          <View style={styles.paymentDetailValue}>
            <Text style={styles.paymentDetailText}>{solidiAccountName}</Text>
            <ImageButton imageName='clone' imageType='icon'
              styles={styleCopyButton}
              onPress={ () => { copyToClipboard(solidiAccountName) } }
            />
          </View>
        </View>
        <View style={styles.paymentDetailsLine}>
          <Text style={styles.paymentDetailText}>Reference</Text>
          <View style={styles.paymentDetailValue}>
            <Text style={styles.paymentDetailText}>{paymentReference}</Text>
            <ImageButton imageName='clone' imageType='icon'
              styles={styleCopyButton}
              onPress={ () => { copyToClipboard(paymentReference) } }
            />
          </View>
        </View>

      </View>

      <View style={styles.paymentButtonSection}>
        <View>
          <Text style={[styles.basicText, styles.bold]}>Once you have made the payment, click the button below.</Text>
        </View>
        <View style={styles.confirmPaymentButton}>
          <StandardButton title="I have paid" onPress={ confirmPayment } />
        </View>
      </View>

      </ScrollView>

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
    height: '100%',
    //borderWidth: 1, // testing
  },
  instructionsSection: {
    //paddingTop: scaledHeight(20),
    alignItems: 'flex-start',
  },
  instructionItem: {
    marginBottom: scaledHeight(5),
  },
  timerProgressBar: {
    marginTop: scaledHeight(5),
    marginBottom: scaledHeight(10),
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  heading: {
    alignItems: 'center',
  },
  heading1: {
    marginTop: scaledHeight(10),
    marginBottom: scaledHeight(10),
  },
  heading2: {
    marginTop: scaledHeight(20),
  },
  headingText: {
    fontSize: normaliseFont(20),
    fontWeight: 'bold',
  },
  basicText: {
    fontSize: normaliseFont(14),
  },
  bold: {
    fontWeight: 'bold',
  },
  importantInfoBox: {
    borderRadius: 8,
    paddingHorizontal: scaledWidth(10),
    paddingVertical: scaledHeight(10),
    fontWeight: 'bold',
    backgroundColor: colors.lightgrey,
  },
  importantInfoBoxText: {
    fontSize: normaliseFont(14),
    fontWeight: 'bold',
  },
  paymentDetailsSection: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingTop: scaledHeight(5),
    marginTop: scaledHeight(10),
  },
  paymentDetailsLine: {
    marginBottom: scaledHeight(5),
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  paymentDetailValue: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    height: scaledHeight(25),
    width: scaledWidth(120),
    marginRight: scaledWidth(5),
  },
  paymentDetailText: {
    fontWeight: 'bold',
    fontSize: normaliseFont(16),
  },
  paymentButtonSection: {
    paddingTop: scaledHeight(20),
  },
  confirmPaymentButton: {
    paddingTop: scaledHeight(20),
    flexDirection: 'row',
    justifyContent: 'center',
  },
});


let styleCopyButton = StyleSheet.create({
  image: {
    iconSize: scaledWidth(14),
    iconColor: colors.greyedOutIcon,
  },
  view: {
    marginLeft: scaledWidth(10),
    //borderWidth: 1,
  }
});


export default MakePayment;

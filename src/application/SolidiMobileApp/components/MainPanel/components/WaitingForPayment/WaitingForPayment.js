// React imports
import React, { useContext, useEffect, useState } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import * as Progress from 'react-native-progress';

// Other imports
import _ from 'lodash';

// Internal imports
import AppStateContext from 'src/application/data';
import { assetsInfo, mainPanelStates, colors } from 'src/constants';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';




let WaitingForPayment = () => {

  let appState = useContext(AppStateContext);

  // Testing:
  appState.onStartDevTesting();

  // Testing:
  _.assign(appState.buyPanel, {volumeQA: '100', assetQA: 'GBPX', volumeBA: '0.05', assetBA: 'BTC'});

  ({volumeQA, volumeBA, assetQA, assetBA} = appState.buyPanel);

  // Testing:
  let paymentReference = 'SPARKLE';
  let solidiSortCode = '04-05-11';
  let solidiAccountNumber = '00012484';
  let solidiAccountName = 'Solidi';

  /* Notes:
  - Check for "payment received" status on the server every 2 seconds, 5 times. (10 seconds cumulative total time.)
  - Then check every 5 seconds, 10 times. (1 minute total time.)
  - Then every 30 seconds, 18 times. (10 minutes total time.)
  - Then every 1 minute, 110 times. (2 hours total time.)
  */
  let timeElapsedSeconds = 0;
  let maxTimeAllowedSeconds = 120 * 60; // 120 minutes = 2 hours.
  let [storedTimerID, setStoredTimerID] = useState('');
  let [timeElapsedMarker, setTimeElapsedMarker] = useState(0.0); // between 0 and 1.
  let [timeRemainingString, setTimeRemainingString] = useState('2 hours 00 minutes');
  let count = 0;
  let intervalSeconds = 2;
  function incrementTimeElapsed () {
    // Note: This function is a closure. It's holding the old values of several variables that (outside this function) get reset when the component is re-rendered.
    count += 1;
    timeElapsedSeconds += intervalSeconds;
    //log(`count: ${count}, intervalSeconds: ${intervalSeconds}, timeElapsedSeconds: ${timeElapsedSeconds}.`)
    // Calculate progress bar value.
    let newMarkerValue = timeElapsedSeconds / parseFloat(maxTimeAllowedSeconds);
    setTimeElapsedMarker(newMarkerValue);
    // Calculate time remaining string.
    let timeRemainingSeconds = maxTimeAllowedSeconds - timeElapsedSeconds;
    let s = new Date(timeRemainingSeconds * 1000).toISOString().substring(11, 16);
    // Example s value: '01:59'
    let [h, m] = s.split(':');
    if (h == '01') h = '1';
    let hplural = Number(h) > 1 ? 's' : '';
    let s2 = `${h} hour${hplural} ${m} minutes`;
    setTimeRemainingString(s2);
    // Manage timer interval.
    let intervalSecondsOriginal = intervalSeconds;
    if (intervalSeconds == 2 && count >= 5) {
      count = 0;
      intervalSeconds = 5;
    }
    if (intervalSeconds == 5 && count >= 10) {
      count = 0;
      intervalSeconds = 30;
    }
    if (intervalSeconds == 30 && count >= 18) {
      count = 0;
      intervalSeconds = 60;
    }
    if (intervalSecondsOriginal != intervalSeconds) {
      // Clear current timer and create a new one.
      let msg = `Clear current timer (interval = ${intervalSecondsOriginal} seconds) and create a new one (interval = ${intervalSeconds} seconds).`;
      log(msg);
      clearInterval(appState.panels.waitingForPayment.timerID);
      let timerID = setInterval(incrementTimeElapsed, intervalSeconds * 1000);
      appState.panels.waitingForPayment.timerID = timerID;
    }
    if (timeElapsedSeconds >= maxTimeAllowedSeconds) {
      // Future: Move to "Payment not received" page.
    }
    // Future: Call the server to check if the payment has been received.

    // confirmPaymentReceived();
  }
  // Set the initial timer on startup.
  if (_.isNil(appState.panels.waitingForPayment.timerID)) {
    let timerID = setInterval(incrementTimeElapsed, intervalSeconds * 1000);
    appState.panels.waitingForPayment.timerID = timerID;
  }
  // Re-render this component when the progress bar value changes.
  useEffect(() => {}, [timeElapsedMarker]);

  let confirmPaymentReceived = async () => {
    appState.changeState('PaymentReceived');
  }


  return (
    <View style={styles.panelContainer}>
    <View style={styles.panelSubContainer}>

      <View style={[styles.heading, styles.heading1]}>
        <Text style={styles.headingText}>Waiting for your payment</Text>
      </View>

      <View style={styles.textItem}>
        <Text style={styles.bold}>Thank you for sending your payment.</Text>
      </View>

      <View style={styles.paymentDetailsSection}>

        <View style={styles.paymentDetailsLine}>
          <Text style={styles.paymentDetailText}>Amount</Text>
          <Text style={styles.paymentDetailText}>{volumeQA} {assetsInfo[assetQA].displaySymbol}</Text>
        </View>

        <View style={styles.paymentDetailsLine}>
          <Text style={styles.paymentDetailText}>Sort Code</Text>
          <Text style={styles.paymentDetailText}>{solidiSortCode}</Text>
        </View>

        <View style={styles.paymentDetailsLine}>
          <Text style={styles.paymentDetailText}>Account Number</Text>
          <Text style={styles.paymentDetailText}>{solidiAccountNumber}</Text>
        </View>

        <View style={styles.paymentDetailsLine}>
          <Text style={styles.paymentDetailText}>Account Name</Text>
          <Text style={styles.paymentDetailText}>{solidiAccountName}</Text>
        </View>

        <View style={styles.paymentDetailsLine}>
          <Text style={styles.paymentDetailText}>Reference</Text>
          <Text style={styles.paymentDetailText}>{paymentReference}</Text>
        </View>

      </View>

      <View style={styles.textItem}>
        <Text style={styles.bold}>We are now checking for this payment. Please be patient.</Text>
      </View>

      <View style={styles.timerProgressBar}>
        <Progress.Bar progress={timeElapsedMarker} height={scaledHeight(8)} width={scaledWidth(200)} />
      </View>

      <View style={styles.textItem}>
        <Text style={styles.bold}>Time Remaining: {timeRemainingString}</Text>
      </View>

      <View>
        <Text>{`\u2022  `} The UK Faster Payments System can sometimes take up to 2 hours to complete a payment.</Text>
        <Text>{`\u2022  `} If your payment has not been registered after 2 hours, please contact us.</Text>
      </View>

    </View>
    </View>

    );

}

let styles = StyleSheet.create({
  panelContainer: {
    paddingHorizontal: scaledWidth(15),
    paddingVertical: scaledHeight(5),
    borderLeftWidth: 1,
    borderRightWidth: 1,
    width: '100%',
    height: '100%',
  },
  panelSubContainer: {
    paddingTop: scaledHeight(10),
    paddingHorizontal: scaledWidth(30),
  },
  heading: {
    alignItems: 'center',
  },
  heading1: {
    marginTop: scaledHeight(10),
  },
  headingText: {
    fontSize: normaliseFont(20),
    fontWeight: 'bold',
  },
  bold: {
    fontWeight: 'bold',
  },
  textItem: {
    marginTop: scaledHeight(25),
    marginBottom: scaledHeight(25),
    alignItems: 'center',
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
  paymentDetailText: {
    fontWeight: 'bold',
    fontSize: normaliseFont(16),
  },
  timerProgressBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
});


export default WaitingForPayment;

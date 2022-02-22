// React imports
import React, { useContext, useEffect, useState } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import * as Progress from 'react-native-progress';

// Other imports
import _ from 'lodash';

// Internal imports
import AppStateContext from 'src/application/data';
import { assetsInfo, mainPanelStates, colors } from 'src/constants';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import { Button, StandardButton, ImageButton } from 'src/components/atomic';




let MakePayment = () => {

  let appState = useContext(AppStateContext);

  // Testing:
  _.assign(appState.buyPanel, {volumeQA: '100', assetQA: 'GBPX', volumeBA: '0.05', assetBA: 'BTC'});

  ({volumeQA, volumeBA, assetQA, assetBA} = appState.buyPanel);

  let paymentReference = 'SPARKLE';
  let solidiSortCode = '04-05-11';
  let solidiAccountNumber = '00012484';
  let solidiAccountName = 'Solidi';

  let timeElapsedSeconds = 0;
  let maxTimeAllowedSeconds = 30 * 60; // 30 minutes.
  let [timeElapsedMarker, setTimeElapsedMarker] = useState(0.0); // between 0 and 1.
  let [intervalTimerCreated, setIntervalTimerCreated] = useState(false);
  let intervalSeconds = 3;
  function incrementTimeElapsed () {
    timeElapsedSeconds += intervalSeconds;
    let newMarkerValue = timeElapsedSeconds / parseFloat(maxTimeAllowedSeconds)
    log('===')
    log({timeElapsedSeconds})
    log({newMarkerValue})
    setTimeElapsedMarker(newMarkerValue);
    if (newMarkerValue > maxTimeAllowedSeconds) {
      // Stop the timer.
      // clearInterval(timerID);
      // Change to "PaymentNotReceived" state.
      // appState.changeState('PaymentNotReceived');
    }
  }
  if (! intervalTimerCreated) {
    var timerID = setInterval(incrementTimeElapsed, intervalSeconds * 1000);
    setIntervalTimerCreated(true);
  }
  useEffect(() => {}, [timeElapsedMarker]);

  let copyToClipboard = async (x) => {
    Clipboard.setString(x);
    /* For testing */
    /*
    let text = await Clipboard.getString();
    log({text})
    */
  }

  let confirmPayment = async () => {
    appState.changeState('WaitingForPayment');
  }

  return (
    <View style={styles.panelContainer}>
    <View style={styles.panelSubContainer}>

      {/*
      <View style={[styles.heading, styles.heading1]}>
        <Text style={styles.headingText}>Make payment</Text>
      </View>
      */}

      <View style={styles.instructionsSection}>
        <View style={styles.instructionItem}>
          <Text style={styles.bold}>{`\u2022  `} You are buying {volumeBA} {assetsInfo[assetBA].displayString} for {volumeQA} {assetsInfo[assetQA].displayString}.</Text>
        </View>
        <View style={styles.instructionItem}>
          <Text style={styles.bold}>{`\u2022  `} Send payment now using your online or telephone banking.</Text>
        </View>
        <View style={styles.instructionItem}>
          <Text style={styles.bold}>{`\u2022  `} You have 30 minutes to send the payment.</Text>
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
            <Text style={styles.paymentDetailText}>{volumeQA} {assetsInfo[assetQA].displaySymbol}</Text>
            <ImageButton imageName='clone' imageType='icon'
              styles={styleCopyButton}
              onPress={ () => { copyToClipboard(volumeQA) } }
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
          <Text style={styles.bold}>Once you have made the payment, click the button below.</Text>
        </View>
        <View style={styles.confirmPaymentButton}>
          <StandardButton title="I have paid" onPress={ confirmPayment } />
        </View>
      </View>

    </View>
    </View>

  )

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
  instructionsSection: {
    //paddingTop: scaledHeight(20),
    alignItems: 'flex-start',
  },
  instructionItem: {
    marginBottom: scaledHeight(5),
  },
  timerProgressBar: {
    marginTop: scaledHeight(15),
    marginBottom: scaledHeight(20),
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
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
  importantInfoBox: {
    borderRadius: 8,
    paddingHorizontal: scaledWidth(10),
    paddingVertical: scaledHeight(10),
    fontWeight: 'bold',
    backgroundColor: colors.lightgrey,
  },
  importantInfoBoxText: {
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


const styleCopyButton = StyleSheet.create({
  image: {
    iconSize: 16,
    iconColor: colors.greyedOutIcon,
  },
  view: {
    marginLeft: scaledWidth(10),
    //borderWidth: 1,
  }
});


export default MakePayment;

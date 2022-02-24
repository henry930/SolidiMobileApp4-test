// React imports
import React, { useContext, useEffect, useState } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { RadioButton } from 'react-native-paper';

// Other imports
import _ from 'lodash';

// Internal imports
import { assetsInfo, mainPanelStates, colors } from 'src/constants';
import AppStateContext from 'src/application/data';
import { Button, StandardButton } from 'src/components/atomic';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';


/* Notes

The primary payment choice is "pay with external account" vs "pay with existing balance". This component handles that choice.

https://callstack.github.io/react-native-paper/radio-button-item.html

*/


let Payment = () => {

  let appState = useContext(AppStateContext);

  // Testing:
  _.assign(appState.panels.buy, {volumeQA: '100', assetQA: 'GBPX', volumeBA: '0.05', assetBA: 'BTC'});

  const [paymentChoice, setPaymentChoice] = React.useState('direct_payment');

  // Load order details.
  ({volumeQA, volumeBA, assetQA, assetBA} = appState.panels.buy);

  let zeroVolumeQA = '0.' + '0'.repeat(assetsInfo[assetQA].decimalPlaces);

  let readPaymentConditions = async () => {
    // Future: Load conditions article.
  }

  let confirmPaymentChoice = async () => {
    if (paymentChoice === 'direct_payment') {
        appState.changeState('MakePayment');
    } else {
      // Pay with balance.

    }
  }

  return (

    <View style={styles.panelContainer}>

      <View style={[styles.heading, styles.heading1]}>
        <Text style={styles.headingText}>Choose how you want to pay</Text>
      </View>

      <View style={styles.selectPaymentMethodSection}>

        <RadioButton.Group onValueChange={x => setPaymentChoice(x)} value={paymentChoice}>

          <RadioButton.Item label="Pay directly to Solidi" value="direct_payment"
            color={colors.standardButtonText}
            style={styles.button} labelStyle={styles.buttonLabel} />

          <View style={styles.buttonDetail}>
            <Text style={styles.bold}>{`\u2022  `} Fast & Easy - No fee!</Text>
            <Text style={styles.bold}>{`\u2022  `} Usually processed in under a minute</Text>
          </View>

          <RadioButton.Item label="Pay with balance" value="balance"
            color={colors.standardButtonText}
            style={styles.button} labelStyle={styles.buttonLabel} />

          <View style={styles.buttonDetail}>
            <Text style={styles.bold}>{`\u2022  `} Pay from your Solidi balance - No fee!</Text>
            <Text style={styles.bold}>{`\u2022  `} Processed instantly</Text>
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
          <Text style={styles.bold}>{volumeBA} {assetsInfo[assetBA].displaySymbol}</Text>
        </View>

        <View style={styles.orderDetailsLine}>
          <Text style={styles.bold}>You spend</Text>
          <Text style={styles.bold}>{volumeQA} {assetsInfo[assetQA].displaySymbol}</Text>
        </View>

        <View style={styles.orderDetailsLine}>
          <Text style={styles.bold}>Fee</Text>
          <Text style={styles.bold}>{zeroVolumeQA} {assetsInfo[assetQA].displaySymbol}</Text>
        </View>

        <View style={styles.orderDetailsLine}>
          <Text style={styles.bold}>Total</Text>
          <Text style={styles.bold}>{volumeQA} {assetsInfo[assetQA].displaySymbol}</Text>
        </View>

      </View>

      <View style={styles.horizontalRule}/>

      <View style={styles.confirmButtonWrapper}>
        <StandardButton title="Confirm & Pay" onPress={ confirmPaymentChoice } />
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
  horizontalRule: {
    borderBottomColor: 'black',
    borderBottomWidth: 1,
    marginHorizontal: scaledWidth(30),
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
  bold: {
    fontWeight: 'bold',
  },
  conditionsButtonWrapper: {
    marginBottom: scaledHeight(10),
  },
  confirmButtonWrapper: {
    marginTop: scaledHeight(20),
    paddingHorizontal: scaledWidth(30),
  },

});


let styleConditionButton = StyleSheet.create({
  view: {

  },
});


export default Payment;

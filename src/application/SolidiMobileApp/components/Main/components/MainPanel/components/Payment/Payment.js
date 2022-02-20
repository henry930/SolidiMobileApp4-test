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

https://callstack.github.io/react-native-paper/radio-button-item.html

*/


let Payment = () => {

  let appState = useContext(AppStateContext);

  // Testing:
  _.assign(appState.buyPanel, {volumeQA: '100', assetQA: 'GBPX', volumeBA: '0.05', assetBA: 'BTC'});

  const [paymentChoice, setPaymentChoice] = React.useState('direct_payment');

  ({volumeQA, volumeBA, assetQA, assetBA} = appState.buyPanel);

  let zeroVolumeQA = '0.' + '0'.repeat(assetsInfo[assetQA].decimalPlaces);

  let horizontalRule = () => {
    return (
      <View
        style={{
          borderBottomColor: 'black',
          borderBottomWidth: 1,
          marginHorizontal: scaledWidth(30),
        }}
      />
    )
  }

  let confirmPayment = async () => {

  }

  let readPaymentConditions = async () => {

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

      {horizontalRule()}

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

      {horizontalRule()}

      <View style={styles.confirmButtonWrapper}>
        <StandardButton title="Confirm & Pay" onPress={ confirmPayment } />
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
  selectPaymentMethodSection: {
    paddingTop: scaledWidth(20),
    paddingHorizontal: scaledWidth(30),
  },
  heading: {
    alignItems: 'center',
  },
  heading1: {
    marginTop: scaledHeight(20),
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
  orderDetailsSection: {
    marginVertical: scaledHeight(20),
    paddingHorizontal: scaledWidth(30),
  },
  orderDetailsLine: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between'
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

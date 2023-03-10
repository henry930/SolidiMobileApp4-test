// React imports
import React, { useContext, useEffect, useState } from 'react';
import { Text, ScrollView, StyleSheet, View } from 'react-native';


// Internal imports
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import AppStateContext from 'src/application/data';
import { Button, StandardButton } from 'src/components/atomic';




let PaymentConditions = () => {

  let appState = useContext(AppStateContext);

  let readTermsAndConditions = async () => {
    appState.changeState('ReadArticle', 'terms_and_conditions');
  }

  return (
    <View style={[styles.expandToParent]}>
      <Text style={[styles.basicText, styles.bold]}>{`\u2022  `} You are using your REAL name.</Text>
      <Text style={[styles.basicText, styles.bold]}>{`\u2022  `} You are paying from/to your own bank account.</Text>
      <Text style={[styles.basicText, styles.bold]}>{`\u2022  `} You are 18 or over.</Text>
      <Text style={[styles.basicText, styles.bold]}>{`\u2022  `} You have only one Solidi account.</Text>
      <View style={styles.buttonSection}>
        <Text style={[styles.basicText, styles.bold]}>{`\u2022  `} You agree to our </Text>
        <Button title="Terms & Conditions" onPress={ readTermsAndConditions }
          styles={styleConditionButton}/>
        <Text style={[styles.basicText, styles.bold]}>.</Text>
      </View>
      <Text style={[styles.basicText, styles.bold, styles.disclaimerText]}>CryptoAssets are highly risky investments. Cryptoassets are not subject to protection under the Financial Services Compensation Scheme or within scope of the Financial Ombudsman Service.  Solidi Ltd is registered with the UK Financial Conduct Authority under the Money Laundering, Terrorist Financing and Transfer of Funds Regulations 2017 as a cryptoasset business</Text>
    </View>
  )

}


let styles = StyleSheet.create({
  basicText: {
    fontSize: normaliseFont(14),
  },
  bold: {
    fontWeight: 'bold',
  },
  buttonSection: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  disclaimerText: {
      fontWeight: 'normal',
      fontSize: normaliseFont(12),
      position: 'absolute',
      bottom: 10,
  },
  expandToParent: {
    height: '100%',
    width: '100%',
  },
});


let styleConditionButton = StyleSheet.create({
  text: {
    margin: 0,
    padding: 0,
    fontSize: normaliseFont(14),
  },
});


export default PaymentConditions;

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
    <View>
      <Text style={styles.bold}>{`\u2022  `} You are using your REAL name.</Text>
      <Text style={styles.bold}>{`\u2022  `} You are paying from/to your own bank account.</Text>
      <Text style={styles.bold}>{`\u2022  `} You are 18 or over.</Text>
      <Text style={styles.bold}>{`\u2022  `} You have only one Solidi account.</Text>
      <View style={styles.buttonSection}>
        <Text style={styles.bold}>{`\u2022  `} You agree to our </Text>
        <Button title="Terms & Conditions" onPress={ readTermsAndConditions }
          styles={styleConditionButton}/>
        <Text style={styles.bold}>.</Text>
      </View>
    </View>
  )

}


let styles = StyleSheet.create({
  bold: {
    fontWeight: 'bold',
  },
  buttonSection: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
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

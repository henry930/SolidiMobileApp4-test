// React imports
import React, { useContext, useEffect, useState } from 'react';
import { Text, StyleSheet, View, ScrollView } from 'react-native';

// Other imports
import _ from 'lodash';
import Big from 'big.js';

// Internal imports
import AppStateContext from 'src/application/data';
import { mainPanelStates, colors } from 'src/constants';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import { Button, StandardButton, ImageButton } from 'src/components/atomic';
import misc from 'src/util/misc';
import { PaymentConditions, TermsAndConditions } from 'src/articles';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('ReadArticle');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);




let ReadArticle = () => {

  let appState = useContext(AppStateContext);

  let pageName = appState.pageName;
  let permittedPageNames = 'payment_conditions terms_and_conditions'.split(' ');
  misc.confirmItemInArray('permittedPageNames', permittedPageNames, pageName, 'ReadArticle');

  let headingText = pageName.split('_').map(misc.capitalise).reduce((a,b) => a + ' ' + b);

  let longArticles = 'terms_and_conditions'.split(' ');

  // These are articles that contain conditions that we invite the user to accept.
  let acceptArticles = 'payment_conditions terms_and_conditions'.split(' ');

  let acceptButtonSection = () => {
    return (
      <View style={styles.acceptButtonWrapper}>
        <StandardButton title="Accept & Continue" onPress={ appState.decrementStateHistory }
    styles={styleAcceptButton}/>
      </View>
    )
  }

  return (
    <View style={styles.panelContainer}>
    <View style={styles.panelSubContainer}>

      <View style={[styles.heading, styles.heading1]}>
        <Text style={styles.headingText}>{headingText}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={true} style={styles.mainScrollView}>

      {/* Future: For long articles, add a scrollToEnd button at the top.
      { longArticles.includes(pageName) && scrollToEndButton() }
      Note: Tried but couldn't get this to work easily.
      */}

      { pageName == 'payment_conditions' && <PaymentConditions/> }

      { pageName == 'terms_and_conditions' && <TermsAndConditions/> }

      </ScrollView>

      { acceptArticles.includes(pageName) && acceptButtonSection() }

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
    //paddingTop: scaledHeight(10),
    //paddingHorizontal: scaledWidth(30),
    //borderWidth: 1, // testing
  },
  heading: {
    alignItems: 'center',
  },
  heading1: {
    marginTop: scaledHeight(10),
    marginBottom: scaledHeight(20),
  },
  headingText: {
    fontSize: normaliseFont(20),
    fontWeight: 'bold',
  },
  mainScrollView: {
    height: '80%',
    //borderWidth: 1, // testing
  },
  bold: {
    fontWeight: 'bold',
  },
  acceptButtonWrapper: {
    marginTop: scaledHeight(10),
    flexDirection: 'row',
    justifyContent: 'center',
  },
});


let styleAcceptButton = StyleSheet.create({
  text: {
    //margin: 0,
    //padding: 0,
    //fontSize: normaliseFont(14),
  },
});


export default ReadArticle;

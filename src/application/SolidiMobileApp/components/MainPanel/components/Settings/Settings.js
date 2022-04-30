// React imports
import React, { useContext, useEffect, useState } from 'react';
import { Text, ScrollView, StyleSheet, View } from 'react-native';

// Other imports
import _ from 'lodash';
import Big from 'big.js';

// Internal imports
import AppStateContext from 'src/application/data';
import { mainPanelStates, colors } from 'src/constants';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import { Button, StandardButton, ImageButton } from 'src/components/atomic';
import misc from 'src/util/misc';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('Settings');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);




let Settings = () => {

  let appState = useContext(AppStateContext);

  let d = appState.user.info.user; // 'd' == 'data'

  return (
    <View style={styles.panelContainer}>
    <View style={styles.panelSubContainer}>

      <View style={[styles.heading, styles.heading1]}>
        <Text style={styles.headingText}>Settings</Text>
      </View>

      <View style={styles.buttonWrapper}>
        <StandardButton title='Lock App' onPress={ () => { appState.lockApp(); } } />
      </View>

      <View style={styles.buttonWrapper}>
        <StandardButton title='Personal Details'
          onPress={ () => { appState.changeState('PersonalDetails'); } }
        />
      </View>

      <View style={styles.buttonWrapper}>
        <StandardButton title='Bank Account'
          onPress={ () => { appState.changeState('BankAccounts'); } }
        />
      </View>

      <View style={styles.buttonWrapper}>
        <StandardButton title='Security'
          onPress={ () => { appState.changeState('Security'); } }
        />
      </View>

      <View style={styles.buttonWrapper}>
        <StandardButton title='Contact Us'
          onPress={ () => { appState.changeState('ContactUs'); } }
        />
      </View>

      <View style={styles.buttonWrapper}>
        <StandardButton title='Log Out'
          onPress={ () => {
            appState.logout();
            appState.changeState('Buy');
          } }
        />
      </View>

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
  },
  heading: {
    alignItems: 'center',
  },
  heading1: {
    marginTop: scaledHeight(10),
    marginBottom: scaledHeight(30),
  },
  headingText: {
    fontSize: normaliseFont(20),
    fontWeight: 'bold',
  },
  bold: {
    fontWeight: 'bold',
  },
  buttonWrapper: {
    paddingRight: scaledWidth(40),
    marginVertical: scaledHeight(10),
    width: '100%',
  },
  alignRight: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});


export default Settings;

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

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('RequestTimeout');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);




let RequestTimeout = () => {

  let appState = useContext(AppStateContext);
  let stateChangeID = appState.stateChangeID;

  // Set up timer.
  let timeToWaitSeconds = 60;
  let intervalSeconds = 1;
  let timeElapsedSeconds = 0;
  let [remainingTimeSeconds, setRemainingTimeSeconds] = useState(timeToWaitSeconds);
  function incrementTimeElapsed () {
    timeElapsedSeconds += intervalSeconds;
    setRemainingTimeSeconds(timeToWaitSeconds - timeElapsedSeconds);
    if (timeElapsedSeconds > timeToWaitSeconds) {
      // Stop the timer.
      clearInterval(appState.panels.requestTimeout.timerID);
      // Change to next state.
      tryAgain();
    }
  }
  // Set the timer on load.
  if (_.isNil(appState.panels.requestTimeout.timerID)) {
    let timerID = setInterval(incrementTimeElapsed, intervalSeconds * 1000);
    appState.panels.requestTimeout.timerID = timerID;
  }
  // Update the display whenever remainingTimeSeconds is reset.
  useEffect(() => {}, [remainingTimeSeconds]);

  let tryAgain = () => {
    appState.loadStashedState();
  }




  // Initial setup.
  useEffect( () => {
    setup();
  }, []); // Pass empty array so that this only runs once on mount.


  let setup = async () => {
    try {
      await appState.generalSetup();
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
    } catch(err) {
      let msg = `RequestTimeout.setup: Error = ${err}`;
      console.log(msg);
    }
  }


  return (
    <View style={styles.panelContainer}>
    <View style={styles.panelSubContainer}>

      <View style={[styles.heading, styles.heading1]}>
        <Text style={styles.headingText}>Request timed out</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={{ flexGrow: 1 }} >

      <View style={styles.spacer1}></View>

      <View style={styles.infoSection}>
        <View style={styles.infoItem}>
          <Text style={styles.basicText}>Sorry! The server didn't respond in time. We weren't able to load the {appState.stashedState.mainPanelState} page.</Text>
        </View>
      </View>

      <View style={styles.infoSection}>
        <View style={styles.infoItem}>
          <Text style={styles.basicText}>We'll try loading it again in {remainingTimeSeconds} seconds.</Text>
        </View>
      </View>

      <View style={styles.infoSection}>
        <View style={styles.infoItem}>
          <Button title='Click here to reload manually.' styles={styleClickHereButton} onPress={ tryAgain } />
        </View>
      </View>

      <View style={styles.infoSection}>
          <Text style={styles.basicText}>If you've tried to reload several times, and it still hasn't worked, then please:{'\n'}</Text>
          <Button title="Contact Us"
            onPress={ () => { appState.changeState('ContactUs') } }
            styles={styleContactUsButton}
          />
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
  spacer1: {
    marginBottom: scaledHeight(20),
  },
  basicText: {
    fontSize: normaliseFont(14),
  },
  bold: {
    fontWeight: 'bold',
  },
  infoSection: {
    paddingTop: scaledHeight(20),
    alignItems: 'flex-start',
  },
  infoItem: {
    marginBottom: scaledHeight(5),
  },
  wrapItems: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});


let styleClickHereButton = StyleSheet.create({
  text: {
    //borderWidth: 1,
    margin: 0,
    paddingHorizontal: 0,
  },
  view: {
    //borderWidth: 1,
  },
});


let styleContactUsButton = StyleSheet.create({
  text: {
    margin: 0,
    padding: 0,
  },
});


export default RequestTimeout;

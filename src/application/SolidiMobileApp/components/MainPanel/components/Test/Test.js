// React imports
import React, { useContext, useEffect, useState } from 'react';
import { Image, Text, StyleSheet, View, ScrollView } from 'react-native';

// Internal imports
import AppStateContext from 'src/application/data';
import { mainPanelStates, colors } from 'src/constants';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import { Button, StandardButton, ImageButton } from 'src/components/atomic';
import ImageLookup from 'src/images';
import misc from 'src/util/misc';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('Test');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);




let Test = () => {

  let appState = useContext(AppStateContext);
  let stateChangeID = appState.stateChangeID;
  let [renderCount, triggerRender] = useState(0);


  useEffect(() => {
    setup();
  }, []);


  let setup = async () => {
    try {
      await appState.generalSetup();
      let output = await appState.fetchBestPriceForASpecificVolume({
        market: 'BTC/GBP',
        side: 'SELL',
        baseAssetVolume: '1',
        baseOrQuoteAsset: 'base',
      });
      lj({output})
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
      triggerRender(renderCount+1);
    } catch(err) {
      let msg = `Test.setup: Error = ${err}`;
      console.log(msg);
    }
  }


  return (
    <View style={styles.panelContainer}>

      <View style={[styles.heading, styles.heading1]}>
        <Text style={styles.headingText}>BlankExampleComponent2</Text>
      </View>

      <Image source={appState.getAssetIcon('EUR')} style={{
          width: scaledWidth(27),
          height: scaledHeight(27),
          resizeMode: misc.getFlatListIconResizeMode(),
          borderWidth: 1,
        }}/>

      <Text style={styles.basicText}>Status: </Text>
      <StandardButton title='Log out' style={styleButton}
        onPress={ async () => { await appState.logout(); } }
      />
      <StandardButton title='Change PIN' style={styleButton}
        onPress={ () => { appState.choosePIN(); } }
      />

    </View>
  )

}


let styles = StyleSheet.create({
  panelContainer: {
    paddingTop: scaledHeight(80),
    paddingHorizontal: scaledWidth(15),
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
});


let styleButton = StyleSheet.create({
  marginTop: 10,
});


export default Test;

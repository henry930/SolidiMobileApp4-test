// React imports
import React, { useContext, useEffect } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { StandardButton } from 'src/components/atomic';

// Internal imports
import AppStateContext from 'src/application/data';
import { mainPanelStates } from 'src/constants';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';


let Test = () => {

  let appState = useContext(AppStateContext);

  appState.loadPIN();

  let switchPanel = async () => {
    setTimeout( () => {
      appState.setMainPanelState({mainPanelState: mainPanelStates.HISTORY});
    }, 500);
  }

  useEffect(() => {
    switchPanel();
  }, []);

  return (
    <View style={styles.panelContainer}>
      <Text>Status: </Text>
      <StandardButton title='Log out' style={styleButton}
        onPress={ () => { appState.logOut(); } }
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
    borderLeftWidth: 1,
    borderRightWidth: 1,
    width: '100%',
    height: '100%',
  },
});


let styleButton = StyleSheet.create({
  marginTop: 10,
});


export default Test;

// React imports
import React, { useContext } from 'react';
import { StyleSheet, Text, View } from 'react-native';

// Internal imports
import { AppStateContext } from 'src/application/data';
import { colors, mainPanelStates } from 'src/constants';
import { Button, ImageButton } from 'src/components/atomic';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';




const Header = (props) => {

  let {style: styleArg} = props;

  let appState = useContext(AppStateContext);

  let pinMode = appState.mainPanelState === 'PIN';

  // Prepare back button.
  // It will set mainPanelState to the previous state in the history,
  // and remove the current state from the history.
  let backButton = (
    <ImageButton imageName='chevron-left' imageType='icon'
      styles={styleBackButton}
      onPress={ () => { appState.decrementStateHistory() } }
    />
  )
  let blankBackButton = <></>;

  // Check whether to include back button.
  let includeBackButton = false;
  if (appState.stateHistoryList.length > 1) {
    if (! pinMode) {
      includeBackButton = true;
    }
  }

  // Check whether to include notification button.
  let includeNotificationButton = ! pinMode;


  let isSettingsButtonSelected = 'Settings' === appState.mainPanelState;
  let _styleSettingsButton = isSettingsButtonSelected ? styleSettingsButtonSelected : styleSettingsButton;


  let changeState = (mainPanelState) => {
    if (pinMode) return; // In pinMode, disable Header buttons.
    appState.changeState(mainPanelState);
  }


  return (
    <View style={[styleArg, styles.header]}>
      <View style={styles.buttonWrapper}>
        {includeBackButton ? backButton : blankBackButton}
      </View>
      <View style={styles.buttonWrapper}>
        <ImageButton imageName='solidi'
          styles={styleLogoButton}
          onPress={ () => { changeState('Test') } }
        />
      </View>
      <View style={styles.buttonWrapper}>
        {/*
        Future: Build notification section.
        { includeNotificationButton && <Button title='Alerts' styles={styleNotificationButton}
          onPress={ () => { changeState('notifications) } }
        /> }
        */}
      </View>
      <View style={styles.buttonWrapper}>
        <ImageButton imageName='user' imageType='icon'
          styles={_styleSettingsButton}
          onPress={ () => { changeState('Settings') } }
        />
      </View>
    </View>
  );
};


const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: 'center',
  },
  buttonWrapper: {
    width: '25%',
  },
});


const styleBackButton = StyleSheet.create({
  image: {
    iconSize: 22,
    iconColor: colors.greyedOutIcon,
  },
  text: {
    fontWeight: 'bold',
    fontSize: normaliseFont(18),
  }
});


const styleLogoButton = StyleSheet.create({
  image: {
    width: '60%',
  },
});


styleSettingsButton = StyleSheet.create({
  image: {
    iconColor: colors.greyedOutIcon,
  },
});


styleSettingsButtonSelected = StyleSheet.create({
  image: {
    iconColor: colors.selectedIcon,
  },
});


const styleNotificationButton = StyleSheet.create({
  text: {
    fontSize: normaliseFont(18),
  }
})


export default Header;
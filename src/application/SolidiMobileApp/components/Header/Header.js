// React imports
import React, { useContext } from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

// Internal imports
import { AppStateContext } from 'src/application/data';
import { colors, mainPanelStates } from 'src/constants';
import { Button, ImageButton } from 'src/components/atomic';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';


const Header = (props) => {

  let {style: styleArg} = props;

  let appState = useContext(AppStateContext);

  let showLogoOnly = appState.mainPanelState === mainPanelStates.PIN;

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
    if (! showLogoOnly) {
      includeBackButton = true;
    }
  }

  // Check whether to include notification and menu buttons.
  let includeNotificationButton = ! showLogoOnly;
  let includeMenuButton = includeNotificationButton;


  let isSettingsButtonSelected = 'Settings' === appState.mainPanelState;
  let _styleSettingsButton = isSettingsButtonSelected ? styleSettingsButtonSelected : styleSettingsButton;


  return (
    <View style={[styleArg, styles.header]}>
      <View style={styles.buttonWrapper}>
        {includeBackButton ? backButton : blankBackButton}
      </View>
      <View style={styles.buttonWrapper}>
        <ImageButton imageName='solidi'
          styles={styleLogoButton}
          onPress={ () => { appState.changeState('test') } }
        />
      </View>
      <View style={styles.buttonWrapper}>
        {/*
        Future: Build notification section.
        { includeNotificationButton && <Button title='Alerts' styles={styleHeaderButton}
          onPress={ () => { appState.changeState('notifications) } }
        /> }
        */}
      </View>
      <View style={styles.buttonWrapper}>
        <ImageButton imageName='bars' imageType='icon'
          styles={_styleSettingsButton}
          onPress={ () => { appState.changeState('settings') } }
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
})


const styleBackButton = StyleSheet.create({
  image: {
    iconSize: 22,
    iconColor: colors.greyedOutIcon,
  },
  text: {
    fontWeight: 'bold',
    fontSize: normaliseFont(18),
  }
})


const styleLogoButton = StyleSheet.create({
  image: {
    width: '60%',
  },
})


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


const styleHeaderButton = StyleSheet.create({
  text: {
    fontSize: normaliseFont(18),
  }
})


export default Header;
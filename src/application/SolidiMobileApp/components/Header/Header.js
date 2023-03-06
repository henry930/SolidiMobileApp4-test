// React imports
import React, { useContext } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

// Internal imports
import { AppStateContext } from 'src/application/data';
import { colors, mainPanelStates } from 'src/constants';
import { Button, ImageButton } from 'src/components/atomic';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import ImageLookup from 'src/images';




let Header = (props) => {

  let {style: styleArg} = props;

  let appState = useContext(AppStateContext);

  let logoImageName = 'solidi_logo_landscape_black_1924x493';

  let statesWhereBackButtonIsHidden = [
    'PIN',
    'RegisterConfirm',
    'RegisterConfirm2',
    'AccountUpdate',
  ]
  let hideBackButton = statesWhereBackButtonIsHidden.includes(appState.mainPanelState);

  let pinMode = appState.mainPanelState === 'PIN';

  let statesWhereSettingsButtonIsHidden = [
    'RegisterConfirm',
    'RegisterConfirm2',
    'AccountUpdate',
  ]
  let hideSettingsButton = statesWhereSettingsButtonIsHidden.includes(appState.mainPanelState);

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
    if (! hideBackButton) {
      includeBackButton = true;
    }
  }

  // Check whether to include notification button. (this is not currently used).
  let includeNotificationButton = ! hideBackButton;


  let isSettingsButtonSelected = 'Settings' === appState.mainPanelState;
  let _styleSettingsButton = isSettingsButtonSelected ? styleSettingsButtonSelected : styleSettingsButton;


  // If we're connected to the test server (with no cryptocurrency), then display this fact visibly in a way that is easily seen on every page.
  // In prod, don't show a title.
  // In dev, don't show any difference from prod.
  let titleSettingsButton = appState.appTier == 'stag' ? 'Test' : '';


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
        <Image source={ImageLookup[logoImageName]} style={styles.logo} />
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
        {! hideSettingsButton &&
          <ImageButton imageName='user' imageType='icon'
            styles={_styleSettingsButton}
            onPress={ () => { changeState('Settings') } }
            title={titleSettingsButton}
          />
        }
      </View>
    </View>
  );
};


let styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: 'center',
    width: '100%',
  },
  logo: {
    flex: 1,
    width: '100%',
    height: null,
    resizeMode: 'contain',
    //borderWidth: 1, //testing
  },
  buttonWrapper: {
    width: '25%',
    //alignItems: 'center', // Don't do this - for some reason it causes the clickable area around the back and settings buttons to collapse down to a small width around the icon.
    //borderWidth: 1, //testing
  },
});


let styleBackButton = StyleSheet.create({
  image: {
    iconSize: scaledWidth(27),
    iconColor: colors.greyedOutIcon,
  },
  text: {
    fontWeight: 'bold',
    fontSize: normaliseFont(18),
  },
  view: {
    //borderWidth: 1, //testing
  }
});


styleSettingsButton = StyleSheet.create({
  image: {
    iconSize: scaledWidth(27),
    iconColor: colors.greyedOutIcon,
  },
  view: {
    //borderWidth: 1, //testing
  },
  text: {
    fontWeight: 'bold',
    color: 'black',
  }
});


styleSettingsButtonSelected = StyleSheet.create({
  image: {
    iconSize: scaledWidth(27),
    iconColor: colors.selectedIcon,
  },
  view: {
    height: '100%',
    width: '100%',
    //borderWidth: 1, //testing
  },
  text: {
    fontWeight: 'bold',
    //color: 'black',
  }
});


export default Header;
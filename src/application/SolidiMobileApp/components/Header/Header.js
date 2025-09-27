// React imports
import React, { useContext } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

// Internal imports
import { AppStateContext } from 'src/application/data';
import { colors } from 'src/constants';
import { Button, ImageButton } from 'src/components/atomic';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import ImageLookup from 'src/images';
import { sharedStyles as styles, layoutStyles as layout, buttonStyles as buttons, textStyles as text } from 'src/styles';




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
    <View style={[styleArg, headerStyles.container]}>
      {/* Risk Warning Banner */}
      <View style={headerStyles.riskBanner}>
        <Text style={headerStyles.riskBannerText}>
          ⚠️ Don't invest unless you're prepared to lose all the money you invest. This is a high-risk investment and you should not expect to be protected if something goes wrong. Take 2 mins to learn more.
        </Text>
      </View>
      
      {/* Main Header */}
      <View style={headerStyles.header}>
        <View style={headerStyles.sideButtonWrapper}>
          {includeBackButton ? backButton : blankBackButton}
        </View>
        <View style={headerStyles.logoWrapper}>
          <Image source={ImageLookup[logoImageName]} style={headerStyles.logo} />
        </View>
        <View style={headerStyles.sideButtonWrapper}>
          {! hideSettingsButton &&
            <ImageButton imageName='user' imageType='icon'
              styles={_styleSettingsButton}
              onPress={ () => { 
                // Check if user is authenticated to decide navigation
                if (appState.user.isAuthenticated) {
                  changeState('Settings'); // Go to profile/settings page
                } else {
                  changeState('Login'); // Go to login page
                }
              }}
            />
          }
        </View>
      </View>
    </View>
  );
};


const headerStyles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: 'white',
    paddingBottom: scaledHeight(5)
  },
  riskBanner: {
    width: '100%',
    paddingHorizontal: scaledWidth(15),
    paddingVertical: scaledHeight(8),
    backgroundColor: colors.warning
  },
  riskBannerText: {
    textAlign: 'center',
    color: 'white',
    fontSize: normaliseFont(11),
    fontWeight: '600',
    lineHeight: normaliseFont(15)
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    height: scaledHeight(50),
    paddingVertical: scaledHeight(5),
    backgroundColor: 'white'
  },
  logoWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  logo: {
    width: scaledWidth(120),
    height: scaledHeight(30),
    resizeMode: 'contain'
  },
  sideButtonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: scaledWidth(60)
  }
});


const styleBackButton = {
  image: {
    iconSize: scaledWidth(27),
    iconColor: colors.greyedOutIcon,
  },
  text: [
    text.bold,
    { fontSize: normaliseFont(18) }
  ],
  view: {}
};

const styleSettingsButton = {
  image: {
    iconSize: scaledWidth(27),
    iconColor: colors.greyedOutIcon,
  },
  view: {},
  text: [
    text.bold,
    { color: 'black' }
  ]
};

const styleSettingsButtonSelected = {
  image: {
    iconSize: scaledWidth(27),
    iconColor: colors.selectedIcon,
  },
  view: [
    layout.fullSize
  ],
  text: [
    text.bold
  ]
};


export default Header;
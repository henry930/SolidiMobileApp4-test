// React imports
import React, { useContext } from 'react';
import { Image, StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Internal imports
import { AppStateContext } from 'src/application/data';
import { colors } from 'src/constants';
import { Button, ImageButton } from 'src/components/atomic';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import ImageLookup from 'src/images';
import { sharedStyles as styles, layoutStyles as layout, buttonStyles as buttons, textStyles as text } from 'src/styles';
import NotificationBellIcon from 'src/components/NotificationInbox/NotificationBellIcon';



let Header = (props) => {

  let { style: styleArg } = props;
  const insets = useSafeAreaInsets();

  let appState = useContext(AppStateContext);

  let logoImageName = 'solidi_logo_landscape_black_1924x493';

  let statesWhereBackButtonIsHidden = [
    'Trade',
    'PIN',
    'RegisterConfirm',
    'RegisterConfirm2',
  ]
  let hideBackButton = statesWhereBackButtonIsHidden.includes(appState.mainPanelState);

  let pinMode = appState.mainPanelState === 'PIN';

  let statesWhereSettingsButtonIsHidden = [
    'RegisterConfirm',
    'RegisterConfirm2',
    'Login',
    'PINLogin'
  ]
  let hideSettingsButton = statesWhereSettingsButtonIsHidden.includes(appState.mainPanelState);

  // Prepare back button.
  // It will set mainPanelState to the previous state in the history,
  // and remove the current state from the history.
  let backButton = (
    <ImageButton imageName='chevron-left' imageType='icon'
      styles={styleBackButton}
      onPress={() => { appState.decrementStateHistory() }}
    />
  )
  let blankBackButton = <></>;

  // Check whether to include back button.
  let includeBackButton = false;
  if (appState.stateHistoryList.length > 1) {
    if (!hideBackButton) {
      includeBackButton = true;
    }
  }

  // Check whether to include notification button.
  // Show notification bell if back button is NOT shown, or if we want it always accessible
  // For now, let's show it when back button is hidden (root screens) or alongside it if space permits
  // User requested "left top corner".
  let notificationButton = (
    <View style={{ marginLeft: includeBackButton ? 8 : 0 }}>
      <NotificationBellIcon />
    </View>
  );


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
      <TouchableOpacity
        style={headerStyles.riskBanner}
        onPress={() => changeState('RiskSummary')}
        activeOpacity={0.8}
      >
        <Text style={headerStyles.riskBannerText}>
          Don't invest unless you're prepared to lose all the money you invest. This is a high-risk investment and you should not expect to be protected if something goes wrong. Take 2 mins to{' '}
          <Text style={headerStyles.learnMoreText}>learn more</Text>.
        </Text>
      </TouchableOpacity>

      {/* Main Header */}
      <View style={headerStyles.header}>
        <View style={[headerStyles.sideButtonWrapper, { flexDirection: 'row', justifyContent: 'flex-start', paddingLeft: 10 }]}>
          {/* Always show notification bell unless in strict modes like PIN */}
          {!pinMode && notificationButton}
        </View>
        <TouchableOpacity
          style={headerStyles.logoWrapper}
          onPress={() => changeState('Home')}
          activeOpacity={0.8}
        >
          <Image source={ImageLookup[logoImageName]} style={headerStyles.logo} />
        </TouchableOpacity>
        <View style={headerStyles.sideButtonWrapper}>
          {!hideSettingsButton &&
            <ImageButton imageName='user' imageType='icon'
              styles={_styleSettingsButton}
              testID="header-settings-button"
              onPress={() => {
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
    paddingBottom: scaledHeight(10)
  },
  riskBanner: {
    width: '100%',
    paddingHorizontal: scaledWidth(15),
    paddingVertical: scaledHeight(4),
    backgroundColor: colors.warning
  },
  riskBannerText: {
    textAlign: 'center',
    color: 'white',
    fontSize: normaliseFont(10),
    fontWeight: '600',
    lineHeight: normaliseFont(14)
  },
  learnMoreText: {
    textAlign: 'center',
    color: 'white',
    fontSize: normaliseFont(10),
    fontWeight: '700',
    textDecorationLine: 'underline',
    lineHeight: normaliseFont(14)
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
  text: StyleSheet.flatten([
    text.bold,
    { fontSize: normaliseFont(18) }
  ]),
  view: {}
};

const styleSettingsButton = {
  image: {
    iconSize: scaledWidth(27),
    iconColor: colors.greyedOutIcon,
  },
  view: {},
  text: StyleSheet.flatten([
    text.bold,
    { color: 'black' }
  ])
};

const styleSettingsButtonSelected = {
  image: {
    iconSize: scaledWidth(27),
    iconColor: colors.selectedIcon,
  },
  view: StyleSheet.flatten([
    layout.fullSize
  ]),
  text: StyleSheet.flatten([
    text.bold
  ])
};


export default Header;
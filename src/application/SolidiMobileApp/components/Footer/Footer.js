// React imports
import React, { useContext } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  Platform,
} from 'react-native';
//import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Other imports
import _ from 'lodash';

// Internal imports
import { AppStateContext } from 'src/application/data';
import { colors, footerButtonList, footerIcons } from 'src/constants';
import { Button, ImageButton } from 'src/components/atomic';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';




let Footer = (props) => {
  let { style: styleArg } = props;

  let appState = useContext(AppStateContext);
  //const insets = useSafeAreaInsets();

  let statesWhereFooterIsHidden = [
    'PIN',
    'Register',
    'RegisterConfirm',
    'RegisterConfirm2',
    'RegistrationCompletion',
    'EmailVerification',
    'PhoneVerification'
  ]
  let hideFooter = statesWhereFooterIsHidden.includes(appState.mainPanelState);

  // Check whether to hide the footer completely.
  if (hideFooter) {
    return (
      <View style={styleEmptyFooter}></View>
    );
  }

  // Create footer buttons using map instead of FlatList for better control

  return (
    //    <View style={[styleArg, styles.footer, { paddingBottom: Math.max(insets.bottom, scaledHeight(8)) }]}>
    <View style={[styleArg, styles.footer]}>
      {footerButtonList.map((item, index) => {
        let buttonName = item;
        let imageName = footerIcons[buttonName];
        let isSelected = buttonName === appState.mainPanelState;
        let buttonStyle = isSelected ? stylePanelButtonSelected : stylePanelButton;

        return (
          <View style={styles.buttonWrapper} key={buttonName}>
            <ImageButton
              imageName={imageName}
              imageType='icon'
              styles={buttonStyle}
              onPress={() => { appState.changeState(buttonName) }}
              title={buttonName}
              testID={`footer-btn-${buttonName}`}
            />
          </View>
        );
      })}
    </View>
  );

};


let styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingTop: Platform.OS === 'ios' ? scaledHeight(8) : scaledHeight(15),
    paddingBottom: scaledHeight(8),
    paddingHorizontal: scaledWidth(10),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    height: scaledHeight(70), // Fixed height
  },
  buttonWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: scaledHeight(4),
    marginHorizontal: scaledWidth(2),
  },
  unavailableRightButton: {
    height: '100%',
    backgroundColor: colors.unavailableButton,
  },
})

let styleEmptyFooter = StyleSheet.create({
  //borderWidth: 1, // testing
  //backgroundColor: 'red', // testing
});

let styleLeftButton = StyleSheet.create({
  image: {
    iconSize: scaledWidth(27),
    iconColor: colors.greyedOutIcon,
  },
  text: {
    fontSize: normaliseFont(22),
    fontWeight: 'bold',
  },
  view: {
    height: '100%',
  },
});

let styleRightButton = StyleSheet.create({
  image: {
    iconSize: scaledWidth(27),
    iconColor: colors.greyedOutIcon,
  },
  text: {
    fontSize: normaliseFont(22),
    fontWeight: 'bold',
  },
  view: {
    height: '100%',
  },
});

let stylePanelButton = StyleSheet.create({
  image: {
    iconSize: scaledWidth(24),
    iconColor: colors.greyedOutIcon,
  },
  text: {
    fontSize: normaliseFont(12),
    color: colors.greyedOutIcon,
  },
  view: {
    height: '100%',
  },
});

let stylePanelButtonSelected = StyleSheet.create({
  image: {
    iconSize: scaledWidth(24),
    iconColor: colors.selectedIcon,
  },
  text: {
    fontSize: normaliseFont(12),
    color: colors.selectedIcon,
    fontWeight: 'bold',
  },
  view: {
    height: '100%',
  },
});


export default Footer;
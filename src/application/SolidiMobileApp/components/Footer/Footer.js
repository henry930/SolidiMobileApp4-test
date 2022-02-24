// React imports
import React, { useContext } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';

// Other imports
import _ from 'lodash';

// Internal imports
import { AppStateContext } from 'src/application/data';
import { colors, mainPanelStates, footerButtonList, footerIcons } from 'src/constants';
import { Button, ImageButton } from 'src/components/atomic';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';


const Footer = (props) => {

  let {style: styleArg} = props;

  let appState = useContext(AppStateContext);

  let hideFooter = appState.mainPanelState === 'PIN';

  let footerIndex = AppStateContext._currentValue.footerIndex;
  let footerEndIndex = footerIndex + appState.numberOfFooterButtonsToDisplay - 1;
  let newFooterIndexLeft = footerIndex - appState.numberOfFooterButtonsToDisplay;
  let newFooterIndexRight = footerEndIndex + 1;

  let maxID = footerButtonList.length - 1;

  // Select 4 buttons.
  let selectedButtons = footerButtonList.slice(footerIndex, footerEndIndex + 1);

  // Check whether to add left and right buttons.
  includeLeftButton = (footerIndex > 0) ? true : false;
  includeRightButton = (footerEndIndex < maxID) ? true : false;

  let leftButton = (
    <View style={styles.leftButtonWrapper}>
      <ImageButton imageName='chevron-left' imageType='icon'
        styles={styleLeftButton}
        onPress={ () => { appState.setFooterIndex(newFooterIndexLeft) } }
      />
    </View>
  )
  let blankLeftButton = <View style={styles.leftButtonWrapper}>
    <View style={styles.unavailableLeftButton} />
  </View>

  let rightButton = (
    <View style={styles.rightButtonWrapper}>
      <ImageButton imageName='chevron-right' imageType='icon'
        styles={styleRightButton}
        onPress={ () => { appState.setFooterIndex(newFooterIndexRight) } }
      />
    </View>
  )
  let blankRightButton = <View style={styles.rightButtonWrapper}>
    <View style={styles.unavailableRightButton}></View>
  </View>

  // testing:
  //includeLeftButton = true;
  //includeRightButton = true;

  let renderPanelButton = ({ item }) => {
    let mainPanelState = item;
    let isSelected = mainPanelState === appState.mainPanelState;
    let _style = isSelected ? stylePanelButtonSelected : stylePanelButton;
    let imageName = 'question-circle';
    if (_.keys(footerIcons).includes(mainPanelState)) {
      imageName = footerIcons[mainPanelState];
    }
    return (
      <View style={styles.buttonWrapper}>
        <ImageButton imageName={imageName} imageType='icon'
          title={mainPanelState} styles={_style}
          onPress={ () => { appState.changeState(mainPanelState) } }
        />
      </View>
    );
  }

  // Check whether to hide the footer completely.
  if (hideFooter) {
    return (
      <View style={[styleArg, styleEmptyFooter]}></View>
    );
  }

  return (
    <View style={[styleArg, styles.footer]}>
      {includeLeftButton ? leftButton : blankLeftButton}
      <FlatList
        style={styles.footerButtonList}
        data={selectedButtons}
        renderItem={renderPanelButton}
        keyExtractor={(item, index) => index}
        numColumns={4}
        scrollEnabled='false'
        contentContainerStyle={{flexGrow: 1, justifyContent: 'center'}}
      >
      </FlatList>
      {includeRightButton ? rightButton : blankRightButton}
    </View>
  );

};


let styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    justifyContent : 'space-between',
    alignItems: 'center',
  },
  leftButtonWrapper: {
    width: '15%',
  },
  unavailableLeftButton: {
    height: '100%',
    backgroundColor: colors.unavailableButton,
  },
  footerButtonList: {
    width: '70%',
    alignContent: 'center',
  },
  buttonWrapper: {
    width: '33.33%',
  },
  rightButtonWrapper: {
    width: '15%',
  },
  unavailableRightButton: {
    height: '100%',
    backgroundColor: colors.unavailableButton,
  },
})

let styleEmptyFooter = StyleSheet.create({

});

let styleLeftButton = StyleSheet.create({
  image: {
    iconSize: 22,
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
    iconSize: 22,
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
    iconColor: colors.greyedOutIcon,
  },
  text: {
    fontSize: normaliseFont(16),
    color: colors.greyedOutIcon,
  },
  view: {
    height: '100%',
  },
});

let stylePanelButtonSelected = StyleSheet.create({
  image: {
    iconColor: colors.selectedIcon,
  },
  text: {
    fontSize: normaliseFont(16),
    color: colors.selectedIcon,
    fontWeight: 'bold',
  },
  view: {
    height: '100%',
  },
});


export default Footer;
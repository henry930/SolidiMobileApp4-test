// React imports
import React, { useContext } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';

// Internal imports
import { AppStateContext } from 'src/application/data';
import { colours, mainPanelStates, footerButtonList } from 'src/constants';
import { Button, ImageButton } from 'src/components/atomic';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';


const Footer = (props) => {

  let {style: styleArg} = props;

  let appState = useContext(AppStateContext);

  let hideFooter = appState.mainPanelState === mainPanelStates.PIN;

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
      <ImageButton imageName='angle-left' imageType='icon'
        styles={stylesLeftButton}
        onPress={ () => { appState.setFooterIndex(newFooterIndexLeft) } }
      />
    </View>
  )
  let blankLeftButton = <View style={styles.leftButtonWrapper}>
    <View style={styles.unavailableLeftButton} />
  </View>

  let rightButton = (
    <View style={styles.rightButtonWrapper}>
      <ImageButton imageName='angle-right' imageType='icon'
        styles={stylesRightButton}
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
    let isSelected = item === appState.mainPanelState;
    let _style = isSelected ? stylesPanelButtonSelected : stylesPanelButton;
    return (
      <AppStateContext.Consumer>
      {(context) =>
        <View style={styles.buttonWrapper}>
          <Button title={item} styles={_style}
            onPress={ () => { context.setMainPanelState({mainPanelState: item}) } }
          />
        </View>
      }
      </AppStateContext.Consumer>
    );
  }

  // Check whether to hide the footer completely.
  if (hideFooter) {
    return (
      <View></View>
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


const styles = StyleSheet.create({
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
    backgroundColor: colours.unavailableButton,
    borderWidth: 1,
    borderRightWidth: 0,
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
    backgroundColor: colours.unavailableButton,
    borderWidth: 1,
  },
})

const stylesLeftButton = StyleSheet.create({
  text: {
    fontSize: normaliseFont(22),
    fontWeight: 'bold',
  },
  view: {
    height: '100%',
    backgroundColor: colours.footerSideButton,
    borderWidth: 1,
    borderRightWidth: 0,
  }
})

const stylesRightButton = StyleSheet.create({
  text: {
    fontSize: normaliseFont(22),
    fontWeight: 'bold',
  },
  view: {
    height: '100%',
    backgroundColor: colours.footerSideButton,
    borderWidth: 1,
  }
})

const stylesPanelButton = StyleSheet.create({
  text: {
    fontSize: normaliseFont(18),
  },
  view: {
    height: '100%',
    backgroundColor: colours.footerPanelButton,
    borderWidth: 1,
    borderRightWidth: 0,
  }
})

const stylesPanelButtonSelected = StyleSheet.create({
  text: {
    fontSize: normaliseFont(18),
    color: 'black',
    fontWeight: 'bold',
  },
  view: {
    height: '100%',
    backgroundColor: 'lightgrey',
    borderWidth: 1,
    borderRightWidth: 0,
  }
})


export default Footer;
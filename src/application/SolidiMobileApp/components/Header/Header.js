// React imports
import React, { useContext } from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

// Internal imports
import { AppStateContext } from 'src/application/data';
import { mainPanelStates } from 'src/constants';
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
    <ImageButton imageName='angle-left' imageType='icon'
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


  return (
    <AppStateContext.Consumer>
      {(context) =>
        <View style={[styleArg, styles.header]}>
          <View style={styles.buttonWrapper}>
            {includeBackButton ? backButton : blankBackButton}
          </View>
          <View style={styles.buttonWrapper}>
            <ImageButton imageName='solidi'
              styles={styleLogoButton}
              onPress={ () => { context.setMainPanelState({mainPanelState:mainPanelStates.TEST}) } }
            />
          </View>
          <View style={styles.buttonWrapper}>
            {/*
            Future: Build notification section.
            { includeNotificationButton && <Button title='Alerts' styles={styleHeaderButton}
              onPress={ () => { context.setMainPanelState({mainPanelState:mainPanelStates.NOTIFICATIONS}) } }
            /> }
            */}
          </View>
          <View style={styles.buttonWrapper}>
            <ImageButton imageName='bars' imageType='icon'
              styles={styleMenuButton}
              onPress={ () => { context.setMainPanelState({mainPanelState:mainPanelStates.SETTINGS}) } }
            />
          </View>
        </View>
      }
    </AppStateContext.Consumer>
  );
};


const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: 'center',
    borderWidth: 1,
  },
  buttonWrapper: {
    width: '25%',
  },
})


const styleBackButton = StyleSheet.create({
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


styleMenuButton = StyleSheet.create({
  view: {},
});


const styleHeaderButton = StyleSheet.create({
  text: {
    fontSize: normaliseFont(18),
  }
})


export default Header;
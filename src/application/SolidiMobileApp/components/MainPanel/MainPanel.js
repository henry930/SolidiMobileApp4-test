// React imports
import React, {useContext} from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

// Other imports
import _ from 'lodash';

// Internal imports
import AppStateContext from 'src/application/data';
import { colors, mainPanelStates } from 'src/constants';
import misc from 'src/util/misc';
import * as allPanels from './components/index';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('AccountUpdate');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);

// Shortcuts
let jd = JSON.stringify;




let MainPanel = (props) => {


  let {style: styleArg} = props;

  let appState = useContext(AppStateContext);


  let selectPanelComponent = () => {

    let {mainPanelState, pageName} = appState;

    // appState.changeState also checks for an unrecognised panel, but we check here too, just in case. Other functions besides changeState can be used to change the panel.
    if (! mainPanelStates.includes(mainPanelState)) {
      return <Text>Error in MainPanel.js: mainPanelState '{}' not found in src/constants/mainPanelStates.js. </Text>
    }

    // Check that there is a component file with the specified name.
    let componentNames = _.keys(allPanels);
    if(! componentNames.includes(mainPanelState)) {
      return <Text>Error in MainPanel.js: No component file found in MainPanel/components with the same name as mainPanelState '{mainPanelState}'.</Text>
    }

    // Special cases
    if (mainPanelState === 'PIN') {
      if (pageName == 'default') {
        if (! appState.user.pin) {
          return <Login />
        }
      }
      return <PIN />
    }

    /*
    - appState.mainPanelState is a text string - we use it as a key to get the component from allPanels.
    - Use the mainPanelState to select a component from allPanels.
    - Create the React element from the component and return it.
    */
    let selectedComponent = allPanels[appState.mainPanelState];
    return React.createElement(selectedComponent);
  }


  return (
      <View style={[styleArg, styles.mainPanel]}>
        {selectPanelComponent()}
      </View>
    );

};


let styles = StyleSheet.create({
  mainPanel: {
    alignItems: 'center',
    backgroundColor: colors.mainPanelBackground,
  },
});


export default MainPanel;

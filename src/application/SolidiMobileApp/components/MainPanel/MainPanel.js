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
import { sharedStyles as styles, layoutStyles as layout } from 'src/styles';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('AccountUpdate');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);

// Shortcuts
let jd = JSON.stringify;




let MainPanel = (props) => {

  // HUGE DEBUG MESSAGE TO VERIFY LOADING
  console.log('🚀🚀🚀 MAINPANEL IS DEFINITELY LOADING!!! 🚀🚀🚀');

  let {style: styleArg} = props;

  let appState = useContext(AppStateContext);

  console.log('🎯 [MainPanel] AppState loaded:', {
    mainPanelState: appState?.mainPanelState,
    pageName: appState?.pageName,
    initialMainPanelState: appState?.initialMainPanelState
  });


  let selectPanelComponent = () => {

    let {mainPanelState, pageName} = appState;

    // Debug logging for MainPanel state changes
    console.log('🎯 [MainPanel] selectPanelComponent called');
    console.log('🎯 [MainPanel] mainPanelState:', mainPanelState);
    console.log('🎯 [MainPanel] pageName:', pageName);
    
    // Special debug for AccountUpdate
    if (mainPanelState === 'AccountUpdate') {
      console.log('🔥 [MainPanel] AccountUpdate state detected! Should load AccountUpdate component');
    }

    // appState.changeState also checks for an unrecognised panel, but we check here too, just in case. Other functions besides changeState can be used to change the panel.
    if (! mainPanelStates.includes(mainPanelState)) {
      return <Text>Error in MainPanel.js: mainPanelState '{}' not found in src/constants/mainPanelStates.js. </Text>
    }

    // Check that there is a component file with the specified name.
    let componentNames = _.keys(allPanels);
    console.log('🎯 [MainPanel] Available component names:', componentNames.slice(0, 10), '... (showing first 10)');
    
    if(! componentNames.includes(mainPanelState)) {
      console.log('❌ [MainPanel] Component not found for state:', mainPanelState);
      return <Text>Error in MainPanel.js: No component file found in MainPanel/components with the same name as mainPanelState '{mainPanelState}'.</Text>
    }
    
    console.log('✅ [MainPanel] Component found for state:', mainPanelState);

    // Special cases
    if (mainPanelState === 'PIN') {
      if (pageName == 'default') {
        if (! appState.user.pin) {
          let selectedComponent = allPanels['Login'];
          return React.createElement(selectedComponent);
        }
      }
      let selectedComponent = allPanels['PIN'];
      return React.createElement(selectedComponent);
    }

    /*
    - appState.mainPanelState is a text string - we use it as a key to get the component from allPanels.
    - Use the mainPanelState to select a component from allPanels.
    - Create the React element from the component and return it.
    */
    let selectedComponent = allPanels[appState.mainPanelState];
    console.log('🎯 [MainPanel] Selected component for', appState.mainPanelState, ':', !!selectedComponent);
    
    if (appState.mainPanelState === 'AccountUpdate') {
      console.log('🔥🔥🔥 [MainPanel] Creating AccountUpdate component! 🔥🔥🔥');
      console.log('🎯 [MainPanel] Component details:', {
        exists: !!selectedComponent,
        name: selectedComponent?.name || 'unknown',
        type: typeof selectedComponent
      });
    }
    
    return React.createElement(selectedComponent);
  }


  return (
      <View style={[styleArg, layout.flex1, { backgroundColor: colors.mainPanelBackground }]}>
        {selectPanelComponent()}
      </View>
    );

};


export default MainPanel;


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
import { mainPanelStates } from 'src/constants';
import { Test, Buy, Sell, Send, Receive, Assets, History,
  Notifications, Settings, Login, PIN, Payment } from './components';
import AppStateContext from 'src/application/data';




const MainPanel = () => {

  let appState = useContext(AppStateContext);

  let selectPanel = () => {
    if (appState.mainPanelState === mainPanelStates.TEST) {
      return <Test />
    } else if (appState.mainPanelState === mainPanelStates.BUY) {
      return <Buy />
    } else if (appState.mainPanelState === mainPanelStates.SELL) {
      return <Sell />
    } else if (appState.mainPanelState === mainPanelStates.SEND) {
      return <Send />
    } else if (appState.mainPanelState === mainPanelStates.RECEIVE) {
      return <Receive />
    } else if (appState.mainPanelState === mainPanelStates.ASSETS) {
      return <Assets />
    } else if (appState.mainPanelState === mainPanelStates.HISTORY) {
      return <History />
    } else if (appState.mainPanelState === mainPanelStates.NOTIFICATIONS) {
      return <Notifications />
    } else if (appState.mainPanelState === mainPanelStates.SETTINGS) {
      return <Settings />
    } else if (appState.mainPanelState === mainPanelStates.LOGIN) {
      return <Login />
    } else if (appState.mainPanelState === mainPanelStates.PIN) {
      if (appState.pageName == 'default') {
        if (! appState.user.pin) {
          return <Login />
        }
      }
      return <PIN />
    } else if (appState.mainPanelState === mainPanelStates.PAYMENT) {
      return <Payment />
    } else {
      return <Text>Error: Unknown mainPanelState: {appState.mainPanelState}</Text>
    }
  }

  return (
      selectPanel()
    );

};


export default MainPanel;

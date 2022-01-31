
import React, {useContext} from 'react';
import PropTypes from 'prop-types';

import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { mainPanelStates } from 'src/constants';
import { Test, Buy, Sell, Send, Receive, Assets, History,
  Notifications, Settings, Login, PIN } from './components';
import AppStateContext from 'src/application/data';


const MainPanel = () => {

  let selectPanel = (context) => {
    if (context.mainPanelState === mainPanelStates.TEST) {
      return <Test />
    } else if (context.mainPanelState === mainPanelStates.BUY) {
      return <Buy />
    } else if (context.mainPanelState === mainPanelStates.SELL) {
      return <Sell />
    } else if (context.mainPanelState === mainPanelStates.SEND) {
      return <Send />
    } else if (context.mainPanelState === mainPanelStates.RECEIVE) {
      return <Receive />
    } else if (context.mainPanelState === mainPanelStates.ASSETS) {
      return <Assets />
    } else if (context.mainPanelState === mainPanelStates.HISTORY) {
      return <History />
    } else if (context.mainPanelState === mainPanelStates.NOTIFICATIONS) {
      return <Notifications />
    } else if (context.mainPanelState === mainPanelStates.SETTINGS) {
      return <Settings />
    } else if (context.mainPanelState === mainPanelStates.LOGIN) {
      return <Login />
    } else if (context.mainPanelState === mainPanelStates.PIN) {
      return <PIN />
    } else {
      return <Text>Error: Unknown mainPanelState: {context.mainPanelState}</Text>
    }
  }

  return (
    <AppStateContext.Consumer>
      {(context) => selectPanel(context) }
    </AppStateContext.Consumer>
  );

};


export default MainPanel;

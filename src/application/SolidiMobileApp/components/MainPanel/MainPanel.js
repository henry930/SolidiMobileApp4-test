
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
import { colors, mainPanelStates } from 'src/constants';
import { Test, Buy, Sell, Send, Receive, Assets, History,
  Notifications, Settings, Login, PIN, ChooseHowToPay,
  MakePayment, WaitingForPayment, BlankExampleComponent,
  PaymentNotMade, PurchaseSuccessful, InsufficientBalance,
  ReadArticle, ChooseHowToReceivePayment, RequestTimeout,
  SaleSuccessful, PersonalDetails, ContactUs, BankAccounts } from './components';
import AppStateContext from 'src/application/data';




const MainPanel = (props) => {

  let {style:styleArg} = props;

  let appState = useContext(AppStateContext);

  let selectPanelComponent = () => {
    if (appState.mainPanelState === 'Test') {
      return <Test />
    } else if (appState.mainPanelState === 'Buy') {
      return <Buy />
    } else if (appState.mainPanelState === 'Sell') {
      return <Sell />
    } else if (appState.mainPanelState === 'Send') {
      return <Send />
    } else if (appState.mainPanelState === 'Receive') {
      return <Receive />
    } else if (appState.mainPanelState === 'Assets') {
      return <Assets />
    } else if (appState.mainPanelState === 'History') {
      return <History />
    } else if (appState.mainPanelState === 'Notifications') {
      return <Notifications />
    } else if (appState.mainPanelState === 'Settings') {
      return <Settings />
    } else if (appState.mainPanelState === 'Login') {
      return <Login />
    } else if (appState.mainPanelState === 'PIN') {
      if (appState.pageName == 'default') {
        if (! appState.user.pin) {
          return <Login />
        }
      }
      return <PIN />
    } else if (appState.mainPanelState === 'ChooseHowToPay') {
      return <ChooseHowToPay />
    } else if (appState.mainPanelState === 'MakePayment') {
      return <MakePayment />
    } else if (appState.mainPanelState === 'WaitingForPayment') {
      return <WaitingForPayment />
    } else if (appState.mainPanelState === 'BlankExampleComponent') {
      return <BlankExampleComponent />
    } else if (appState.mainPanelState === 'PaymentNotMade') {
      return <PaymentNotMade />
    } else if (appState.mainPanelState === 'PurchaseSuccessful') {
      return <PurchaseSuccessful />
    } else if (appState.mainPanelState === 'InsufficientBalance') {
      return <InsufficientBalance />
    } else if (appState.mainPanelState === 'ReadArticle') {
      return <ReadArticle />
    } else if (appState.mainPanelState === 'ChooseHowToReceivePayment') {
      return <ChooseHowToReceivePayment />
    } else if (appState.mainPanelState === 'RequestTimeout') {
      return <RequestTimeout />
    } else if (appState.mainPanelState === 'SaleSuccessful') {
      return <SaleSuccessful />
    } else if (appState.mainPanelState === 'PersonalDetails') {
      return <PersonalDetails />
    } else if (appState.mainPanelState === 'ContactUs') {
      return <ContactUs />
    } else if (appState.mainPanelState === 'BankAccounts') {
      return <BankAccounts />
    } else {
      return <Text>Error in MainPanel.js: Unknown mainPanelState: {appState.mainPanelState}</Text>
    }
  }

  return (
      <View style={[styleArg, styles.mainPanel]}>
        {selectPanelComponent()}
      </View>
    );

};


const styles = StyleSheet.create({
  mainPanel: {
    alignItems: 'center',
    backgroundColor: colors.mainPanelBackground,
  },
});


export default MainPanel;

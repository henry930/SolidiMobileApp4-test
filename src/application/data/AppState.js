// Goal: Store the current state of the app in a Context.
/* 
- The MainPanel state
- The history stack of previous MainPanel states
*/

/* Note:
- We use the appName as the "username" (i.e. key) for storing the PIN in the keychain.
- We use the domain (e.g. "solidi.co") for storing the email & password in the keychain.
*/

// React imports
import React, { Component, useContext } from 'react';
import * as Keychain from 'react-native-keychain';
import {deleteUserPinCode} from '@haskkor/react-native-pincode'

// Other imports
import _ from 'lodash';

// Internal imports
import { mainPanelStates, footerButtonList } from 'src/constants';
import SolidiRestAPIClientLibrary from 'src/api/SolidiRestAPIClientLibrary';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';

// Misc
let lj = (x) => console.log(JSON.stringify(x));

// Dev
let tier = 'dev';


let AppStateContext = React.createContext();


class AppStateProvider extends Component {

  constructor(props) {
    super(props);

    // Can set this initial state for testing.
    this.initialMainPanelState = mainPanelStates.ASSETS;
    this.initialPageName = 'default';

    // Misc
    this.numberOfFooterButtonsToDisplay = 3;
    this.standardPaddingTop = scaledHeight(80);
    this.standardPaddingHorizontal = scaledWidth(15);
    this.nonHistoryPanels = [mainPanelStates.PIN];
    this.appName = 'SolidiMobileApp';

    // Function for changing the mainPanelState.
    this.setMainPanelState = (newState, stashed=false) => {
      log(`Set state to: ${JSON.stringify(newState)}`);
      let {mainPanelState, pageName} = newState;
      if (_.isNil(mainPanelState)) {
        let errMsg = "Unknown mainPanelState: " + mainPanelState;
        log(errMsg);
        throw Error(errMsg);
      }
      if (_.isNil(pageName)) pageName = 'default';
      newState = {mainPanelState, pageName};
      /*
      If this is a new state, add an entry to the state history,
      unless it's a state we don't care about: e.g. PIN.
      A state history entry consists of:
      - mainPanelState
      - pageName
      */
      let stateHistoryList = this.state.stateHistoryList;
      let storeHistoryState = (! stashed && ! this.nonHistoryPanels.includes(mainPanelState))
      if (storeHistoryState) {
        let currentState = stateHistoryList[stateHistoryList.length - 1];
        if (JSON.stringify(newState) === JSON.stringify(currentState)) {
          // We don't want to store the same state twice, so do nothing.
        } else {
          log("Store new state history entry: " + JSON.stringify(newState));
          stateHistoryList = stateHistoryList.concat(newState);
          this.setState({stateHistoryList});
        }
      }
      // Check if we need to authenticate prior to moving to this new state.
      let makeFinalSwitch = true;
      if (! this.state.user.isAuthenticated) {
        if (this.state.authRequired.includes(mainPanelState)) {
          makeFinalSwitch = false;
          // Stash the new state for later retrieval.
          this.state.stashState(newState);
          this.state.authenticateUser();
        }
      }
      // Finally, change to new state.
      if (makeFinalSwitch) {
        this.setState({mainPanelState, pageName});
      }
    }

    this.stashState = (stateX) => {
      let msg = `Stashing state: ${JSON.stringify(stateX)}`
      log(msg);
      this.state.stashedState = stateX;
    }

    this.loadStashedState = () => {
      let msg = `Loading stashed state: ${JSON.stringify(this.state.stashedState)}`;
      log(msg);
      this.state.setMainPanelState(this.state.stashedState, stashed=true);
    }

    this.decrementStateHistory = () => {
      let stateHistoryList = this.state.stateHistoryList;
      let prevState = stateHistoryList[stateHistoryList.length - 2];
      let {mainPanelState, pageName} = prevState;
      if (stateHistoryList.length > 1) {
        stateHistoryList.pop();
        this.setState({stateHistoryList});
      }
      // If this state appears in the footerButtonList, set the footerIndex appropriately.
      // Note: This sets the index of the first button to be displayed in the footer. The highlighting of the selected button occurs separately.
      if (footerButtonList.includes(mainPanelState)) {
        lj({prevState});
        let index = footerButtonList.indexOf(mainPanelState);
        let steps = Math.floor(index / this.numberOfFooterButtonsToDisplay);
        let newFooterIndex = steps * this.numberOfFooterButtonsToDisplay;
        log(JSON.stringify({newFooterIndex}))
        this.setFooterIndex(newFooterIndex);
      }
      // Check if we need to authenticate prior to moving to this previous state.
      let makeFinalSwitch = true;
      if (! this.state.user.isAuthenticated) {
        if (this.state.authRequired.includes(mainPanelState)) {
          makeFinalSwitch = false;
          // Stash the previous state for later retrieval.
          this.state.stashState(prevState);
          this.state.authenticateUser();
        }
      }
      // Finally, change to previous state.
      if (makeFinalSwitch) {
        this.setState({mainPanelState, pageName});
      }
    }

    this.setFooterIndex = (newIndex) => {
      let minIndex = 0;
      let maxIndex = footerButtonList.length - 1;
      if (newIndex < minIndex) newIndex = minIndex;
      if (newIndex > maxIndex) newIndex = maxIndex;
      if (newIndex !== this.state.footerIndex) {
        this.setState({footerIndex: newIndex});
      }
    }

    this.setHistoryOrders = (newOrders) => {
      log(`setHistoryOrders`);
      let history = {...this.state.history, orders: newOrders};
      this.setState({history});
    }

    this.setHistoryTransactions = (newTransactions) => {
      log(`setHistoryTransactions`);
      let history = {...this.state.history, transactions: newTransactions};
      this.setState({history});
    }

    this.setAPIData = ({key, data}) => {
      let msg = `setAPIData: set state.apiData.${key} to hold: ${JSON.stringify(data, null, 2)}`;
      log('setAPIData: ' + key)
      let apiData = {...this.state.apiData}
      apiData[key] = data;
      this.setState({apiData});
    }

    this.authenticateUser = () => {
      if (! this.state.user.pin) {
        this.state.setMainPanelState({mainPanelState: mainPanelStates.LOGIN});
      } else {
        this.state.setMainPanelState({mainPanelState: mainPanelStates.PIN});
      }
    }

    this.choosePIN = () => {
      // Delete the PIN in memory.
      this.state.user.pin = '';
      /*
      - Delete the PIN stored in the keychain.
      - Note: This is done using a promise, so there will be a slight delay.
      - However, the time taken to go through the choose PIN screens is much greater.
      */
      deleteUserPinCode(this.state.appName);
      log('PIN deleted.')
      // If user hasn't logged in, they need to do so first.
      if (! this.state.user.isAuthenticated) {
        // We send them to the login page, which will ask them to choose a PIN afterwards.
        this.state.setMainPanelState({mainPanelState: mainPanelStates.LOGIN});
        return;
      }
      this.state.setMainPanelState({mainPanelState: mainPanelStates.PIN, pageName: 'choose'});
    }

    this.loadPIN = () => {
      /*
      - We load the PIN from the keychain if it exists.
      - This uses a promise - there will be a slight delay while the data is retrieved.
      - However: The user would have to be very fast indeed to click Buy on the initial BUY page before this completes.
      */
      Keychain.getInternetCredentials(this.state.appName).then((credentials) => {
        // Example result:
        // {"password": "1111", "server": "SolidiMobileApp", "storage": "keychain", "username": "SolidiMobileApp"}
        if (credentials) {
          let pin = credentials.password;
          this.state.user.pin = pin;
          log(`PIN loaded: ${pin}`);
        }
      });
    }

    // This must be declared towards the end of the constructor.
    this.state = {
      numberOfFooterButtonsToDisplay: this.numberOfFooterButtonsToDisplay,
      mainPanelState: this.initialMainPanelState,
      pageName: this.initialPageName,
      setMainPanelState: this.setMainPanelState,
      stashedState: {},
      stateHistoryList: [],
      stashState: this.stashState,
      loadStashedState: this.loadStashedState,
      decrementStateHistory: this.decrementStateHistory,
      footerIndex: 0,
      setFooterIndex: this.setFooterIndex,
      authenticateUser: this.authenticateUser,
      choosePIN: this.choosePIN,
      loadPIN: this.loadPIN,
      history: {
        orders: [],
        transactions: [],
      },
      setHistoryOrders: this.setHistoryOrders,
      setHistoryTransactions: this.setHistoryTransactions,
      setAPIData: this.setAPIData,
      apiData: {},
      domain: 'solidi.co',
      userAgent: "Solidi Mobile App 3",
      user: {
        isAuthenticated: false,
        email: '',
        password: '',
        userInfo: {},
        pin: '',
      },
      authRequired: [
        mainPanelStates.HISTORY,
      ],
      apiClient: null,
      appName: this.appName,
      buyPanel: {
        volumeQA: 0,
        symbolQA: '',
        volumeBA: 0,
        symbolBA: '',
      }
    }

    // Save the initial state to the state history.
    if (! this.nonHistoryPanels.includes(this.initialMainPanelState)) {
      this.state.stateHistoryList = [{
        mainPanelState: this.initialMainPanelState,
        pageName: this.initialPageName,
      }];
    }

    // Tweak app state for dev work.
    if (tier === 'dev') {
      this.state.domain = 't3.solidi.co';
    }

    // Create a non-authenticated API client that can call public methods.
    this.state.apiClient = new SolidiRestAPIClientLibrary({
      userAgent: this.state.userAgent, apiKey:'', apiSecret:'',
      domain: this.state.domain,
    });

    // Tweak app state for dev work.
    if (tier === 'dev') {
      // Use test values for accessing a dev API.
      let apiKey = 'WmgwEP7RqaF9morLAiDauluX146BdUO9g5GVUNMkXsukQW5qeIBI35F5';
      let apiSecret = 'aMGnGuxXzdSu0EOY6jiWgonu7Ycb4SgeFWClq9i0nbuoPjnWDFST4gnbfAmjtDx8zau0kN0HYv5OOtKs8DldTJp9';
      let email = 'mr@pig.com';
      let password = 'mrfishsayshelloN6';
      _.assign(this.state.apiClient, {apiKey, apiSecret});
      this.state.user.isAuthenticated = true;
      _.assign(this.state.user, {email, password});
    }

  }

  render() {
    return (
      <AppStateContext.Provider value={this.state}>
        {this.props.children}
      </AppStateContext.Provider>
    );
  }

}

export { AppStateContext, AppStateProvider };

export default AppStateContext;

// Goal: Store the current state of the app in a Context.
/* 
- The MainPanel state
- The history stack of previous MainPanel states
*/

// React imports
import React, { Component, useContext } from 'react';
import { Dimensions } from 'react-native';

// Other imports
import _ from 'lodash';

// Internal imports
import { mainPanelStates, footerButtonList } from 'src/constants';
import SolidiRestAPIClientLibrary from 'src/api/SolidiRestAPIClientLibrary';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';

// Misc
let lj = (x) => console.log(JSON.stringify(x));

// Dev:
/*
import access from 'src/access';
let {domain, userAgent, apiKey, apiSecret} = access;
let apiClient = new SolidiRestAPIClientLibrary({userAgent, apiKey, apiSecret, domain});
*/

// Dev
let tier = 'dev';


let AppStateContext = React.createContext();


class AppStateProvider extends Component {

  constructor(props) {
    super(props);

    // Can set this initial state for testing.
    this.initialMainPanelState = mainPanelStates.PIN;
    this.initialPageName = 'default';

    // Misc
    this.numberOfFooterButtonsToDisplay = 3;
    this.standardPaddingTop = scaledHeight(80);
    this.standardPaddingHorizontal = scaledWidth(15);

    this.setMainPanelState = (newState) => {
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
      If this is a new state, add an entry to the state history.
      A state history entry consists of:
      - mainPanelState
      - pageName
      */
      let stateHistoryList = this.state.stateHistoryList;
      let currentState = stateHistoryList[stateHistoryList.length - 1];
      if (JSON.stringify(newState) === JSON.stringify(currentState)) {
        // We don't want to store the same state twice, so do nothing.
      } else {
        log("Store new state history entry: " + JSON.stringify(newState));
        stateHistoryList = stateHistoryList.concat(newState);
        this.setState({stateHistoryList});
      }
      this.setState({mainPanelState, pageName});
    }

    this.decrementStateHistory = () => {
      let stateHistoryList = this.state.stateHistoryList;
      let prevState = stateHistoryList[stateHistoryList.length - 2];
      let {mainPanelState, pageName} = prevState;
      this.setState({mainPanelState, pageName});
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

    // This must be declared at the end of the constructor.
    this.state = {
      numberOfFooterButtonsToDisplay: this.numberOfFooterButtonsToDisplay,
      mainPanelState: this.initialMainPanelState,
      pageName: this.initialPageName,
      setMainPanelState: this.setMainPanelState,
      stashedState: {},
      stateHistoryList: [{
        mainPanelState: this.initialMainPanelState,
        pageName: this.initialPageName,
      }],
      decrementStateHistory: this.decrementStateHistory,
      footerIndex: 0,
      setFooterIndex: this.setFooterIndex,
      history: {
        orders: [],
        transactions: [],
      },
      setHistoryOrders: this.setHistoryOrders,
      setHistoryTransactions: this.setHistoryTransactions,
      domain: 'solidi.co',
      userAgent: "Solidi Mobile App 3",
      user: {
        isAuthenticated: false,
        email: '',
        password: '',
        userInfo: {},
        pin: '', // Future: Check in phone's keychain / keystore.
      },
      apiClient: null,
    }

    if (tier === 'dev') {
      this.state.domain = 't3.solidi.co';
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

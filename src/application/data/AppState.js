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
import misc from 'src/util/misc';

// Misc
let jd = JSON.stringify;
let lj = (x) => console.log(jd(x));

// Dev
let tier = 'dev';


let AppStateContext = React.createContext();


class AppStateProvider extends Component {

  constructor(props) {
    super(props);

    // Can set this initial state for testing.
    this.initialMainPanelState = 'Sell';
    this.initialPageName = 'default';

    // Misc
    this.numberOfFooterButtonsToDisplay = 3;
    this.standardPaddingTop = scaledHeight(80);
    this.standardPaddingHorizontal = scaledWidth(15);
    this.nonHistoryPanels = ['PIN'];
    this.appName = 'SolidiMobileApp';

    // Shortcut function for changing the mainPanelState.
    this.changeState = (stateName, pageName) => {
      if (! mainPanelStates.includes(stateName)) {
        throw Error(`Unrecognised stateName: ${stateName}`);
      }
      this.state.setMainPanelState({mainPanelState: stateName, pageName});
    }

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
      this.cancelTimers();
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
      if (stateHistoryList.length == 1) {
        // No previous state.
        return;
      }
      this.cancelTimers();
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

    this.setAPIData = ({key, data}) => {
      let msg = `setAPIData: set state.apiData.${key} to hold: ${JSON.stringify(data, null, 2)}`;
      log('setAPIData: ' + key)
      let apiData = {...this.state.apiData}
      apiData[key] = data;
      this.setState({apiData});
    }

    this.authenticateUser = () => {
      if (! this.state.user.pin) {
        this.state.setMainPanelState({mainPanelState: 'Login'});
      } else {
        this.state.setMainPanelState({mainPanelState: 'PIN'});
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
        this.state.setMainPanelState({mainPanelState: 'Login'});
        return;
      }
      this.state.setMainPanelState({mainPanelState: 'PIN', pageName: 'choose'});
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

    this.startLockAppTimer = async () => {
      let waitTimeMinutes = 120; // Future: Set to 30 mins.
      let waitTimeSeconds = waitTimeMinutes * 60;
      let lockApp = () => {
        let msg = `lockAppTimer (${waitTimeMinutes} minutes) has finished.`;
        log(msg);
        // Stash the current state.
        let currentState = {mainPanelState: this.state.mainPanelState, pageName: this.state.pageName};
        this.state.stashState(currentState);
        this.state.authenticateUser();
      }
      setTimeout(lockApp, waitTimeSeconds * 1000);
    }

    this.cancelTimers = () => {
      /* Cancel any existing timers. */
      if (this.state.panels.buy.timerID) {
        clearInterval(this.state.panels.buy.timerID);
        this.state.panels.buy.timerID = null;
        log(`Cleared interval: buy`);
      }
      if (this.state.panels.sell.timerID) {
        clearInterval(this.state.panels.buy.timerID);
        this.state.panels.sell.timerID = null;
        log(`Cleared interval: sell`);
      }
      if (this.state.panels.makePayment.timerID) {
        clearInterval(this.state.panels.makePayment.timerID);
        this.state.panels.makePayment.timerID = null;
        log(`Cleared interval: makePayment`);
      }
      if (this.state.panels.waitingForPayment.timerID) {
        clearInterval(this.state.panels.waitingForPayment.timerID);
        this.state.panels.waitingForPayment.timerID = null;
        log(`Cleared interval: waitingForPayment`);
      }
    }

    // This is called immediately after a successful Login or PIN entry.
    this.loadUserInfo = async () => {
      // User info
      let data = await this.state.apiClient.privateMethod({httpMethod: 'POST', apiMethod: 'user'});
      let keyNames = `address_1, address_2, address_3, address_4,
bank_limit, btc_limit, country, crypto_limit, email, firstname, freewithdraw,
landline, lastname, mobile, mon_bank_limit, mon_btc_limit, mon_crypto_limit,
postcode, uuid, year_bank_limit, year_btc_limit, year_crypto_limit,
`.replace(/\n/g, ' ').replace(/,/g, '').split(' ').filter(x => x);
      misc.confirmExactKeys('data', data, keyNames, 'loadUserInfo');
      this.state.user.info.user = data;
      // User's GBP deposit details.
      let data2 = await this.state.apiClient.privateMethod({httpMethod: 'POST', apiMethod: 'depositdetails/GBP'});
      // Example result:
      // {"data2": {"accountname": "Solidi", "accountno": "00001036", "reference": "SHMPQKC", "result": "success", "sortcode": "040476"}}
      let keyNames2 = `accountname, accountno, reference, result, sortcode`.replace(/,/g, '').split(' ').filter(x => x);
      if (data2.result != 'success') {
        // Future: User needs to verify some information first: address, identity.
      }
      misc.confirmExactKeys('data2', data2, keyNames2, 'loadUserInfo');
      this.state.user.info.depositDetails.GBP = {
        accountName: data2.accountname,
        accountNumber: data2.accountno,
        sortCode: data2.sortcode,
        reference: data2.reference,
      }
      this.state.userInfoLoaded = true;
      this.loadBalances();
      log("User info loaded from server.");
    }

    this.loadMarkets = async () => {
      let data = await this.state.apiClient.publicMethod({
        httpMethod: 'GET',
        apiMethod: 'market',
        params: {},
      });
      // Tmp: For development:
      // Sample markets.
      data = [
        'BTC/GBPX',
        'ETH/GBPX',
        'BTC/EURX',
        'ETH/EURX',
      ]
      // End tmp
      // Remove off-exchange 'X' from ticker symbols.
      data = data.map(market => {
        let [baseAsset, quoteAsset] = market.split('/');
        if (quoteAsset == 'GBPX') quoteAsset = 'GBP';
        if (quoteAsset == 'EURX') quoteAsset = 'EUR';
        let market2 = baseAsset + '/' + quoteAsset;
        return market2;
      });
      // If the data differs from existing data, save it. (This will cause a component reload.)
      let msg = "Markets loaded from server.";
      if (jd(data) === jd(this.state.apiData.market)) {
        log(msg + " No change.");
      } else {
        log(msg + " New data saved to appState. " + jd(data));
        this.state.apiData.market = data;
      }
      return data;
    }

    this.getMarkets = () => {
      let defaultList = ['BTC/GBP'];
      let markets = this.state.apiData.market;
      if (_.isEmpty(markets)) return defaultList;
      return markets;
    }

    this.getBaseAssets = () => {
      let markets = this.getMarkets();
      let baseAssets = markets.map(x => x.split('/')[0]);
      return _.uniq(baseAssets);
    }

    this.getQuoteAssets = () => {
      let markets = this.getMarkets();
      let quoteAssets = markets.map(x => x.split('/')[1]);
      return _.uniq(quoteAssets);
    }

    this.loadBalances = async () => {
      let data = await this.state.apiClient.privateMethod({
        httpMethod: 'POST',
        apiMethod: 'balance',
        params: {},
      });
      let msg = "User balances loaded from server.";
      if (jd(data) === jd(this.state.apiData.balance)) {
        log(msg + " No change.");
      } else {
        log(msg + " New data saved to appState.");
        this.state.apiData.balance = data;
      }
      return data;
    }

    this.getBalance = (asset) => {
      // Get the balance held in the appState.
      // Note: Currently, no ETH balance appearing in the data. Why not ?
      if (_.isUndefined(this.state.apiData.balance[asset])) return '[loading]';
      return this.state.apiData.balance[asset].balance;
    }

    this.loadPrices = async () => {
      let data = await this.state.apiClient.publicMethod({
        httpMethod: 'GET',
        apiMethod: 'ticker',
        params: {},
      });
      // Tmp: For development:
      // Sample prices.
      data = {
        'BTC/GBPX': '2000.00',
        'ETH/GBPX': '100.00',
        'BTC/EURX': '3000.00',
        'ETH/EURX': '150.00',
      }
      // End tmp
      // Remove off-exchange 'X' from ticker symbols.
      data = _.mapKeys(data, (value, key) => {
        let [baseAsset, quoteAsset] = key.split('/');
        if (quoteAsset == 'GBPX') quoteAsset = 'GBP';
        if (quoteAsset == 'EURX') quoteAsset = 'EUR';
        let key2 = baseAsset + '/' + quoteAsset;
        return key2;
      });
      let msg = "Prices loaded from server.";
      if (jd(data) === jd(this.state.apiData.ticker)) {
        log(msg + " No change.");
      } else {
        log(msg + " New data saved to appState. " + jd(data));
        this.state.apiData.ticker = data;
      }
      return data;
    }

    this.getPrice = (fxmarket) => {
      // Get the price held in the appState.
      if (_.isUndefined(this.state.apiData.ticker[fxmarket])) return '0';
      return this.state.apiData.ticker[fxmarket];
    }

    this.getOrderStatus = async ({orderID}) => {
      let data = await this.state.apiClient.privateMethod({
        httpMethod: 'POST',
        apiMethod: 'order_status/' + orderID,
        params: {},
      });
      // Todo: Look at data, and return 'live' or 'filled'.
      let orderStatus = 'live'; //tmp
      let knownStatuses = 'live settled'.split(' ');
      misc.confirmItemInArray('knownStatuses', knownStatuses, orderStatus, 'getOrderStatus');
      return orderStatus;
    }

    // The actual state object of the app.
    // This must be declared towards the end of the constructor.
    this.state = {
      numberOfFooterButtonsToDisplay: this.numberOfFooterButtonsToDisplay,
      mainPanelState: this.initialMainPanelState,
      pageName: this.initialPageName,
      changeState: this.changeState,
      setMainPanelState: this.setMainPanelState,
      stashedState: {},
      stateHistoryList: [],
      stashState: this.stashState,
      loadStashedState: this.loadStashedState,
      decrementStateHistory: this.decrementStateHistory,
      footerIndex: 0,
      setFooterIndex: this.setFooterIndex,
      setAPIData: this.setAPIData,
      authenticateUser: this.authenticateUser,
      choosePIN: this.choosePIN,
      loadPIN: this.loadPIN,
      startLockAppTimer: this.startLockAppTimer,
      cancelTimers: this.cancelTimers,
      loadUserInfo: this.loadUserInfo,
      userInfoLoaded: false,
      loadMarkets: this.loadMarkets,
      getMarkets: this.getMarkets,
      getBaseAssets: this.getBaseAssets,
      getQuoteAssets: this.getQuoteAssets,
      loadBalances: this.loadBalances,
      getBalance: this.getBalance,
      loadPrices: this.loadPrices,
      getPrice: this.getPrice,
      getOrderStatus: this.getOrderStatus,
      apiData: {
        market: {},
        ticker: {},
        balance: {},
      },
      domain: 'solidi.co',
      userAgent: "Solidi Mobile App 3",
      user: {
        isAuthenticated: false,
        email: '',
        password: '',
        info: {
          user: {},
          depositDetails: {
            GBP: {
              accountName: null,
              accountNumber: null,
              sortCode: null,
              reference: null,
            }
          },
        },
        pin: '',
      },
      authRequired: [
        'History',
      ],
      apiClient: null,
      appName: this.appName,
      panels: {
        buy: {
          timerID: null,
          orderID: null,
          volumeQA: 0,
          symbolQA: '',
          volumeBA: 0,
          symbolBA: '',
        },
        sell: {
          timerID: null,
          orderID: null,
          volumeQA: 0,
          symbolQA: '',
          volumeBA: 0,
          symbolBA: '',
        },
        makePayment: {
          timerID: null,
        },
        waitingForPayment: {
          timerID: null,
        },
      },
    }

    // Save the initial state to the state history.
    if (! this.nonHistoryPanels.includes(this.initialMainPanelState)) {
      this.state.stateHistoryList = [{
        mainPanelState: this.initialMainPanelState,
        pageName: this.initialPageName,
      }];
    }

    // === Call initial setup functions.

    // Load the PIN.
    this.loadPIN();

    // Start the lock-app timer.
    this.startLockAppTimer();

    // Tweak app state for dev work.
    if (tier === 'dev') {
      this.state.domain = 't3.solidi.co';
    }

    // Create a non-authenticated API client that can call public methods.
    this.state.apiClient = new SolidiRestAPIClientLibrary({
      userAgent: this.state.userAgent, apiKey:'', apiSecret:'',
      domain: this.state.domain,
    });

    // Call public methods that provide useful data.
    this.state.loadMarkets();
    this.state.loadPrices();

    // === End setup

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

      // Method for loading data at the start of whatever component we're working on currently. Note: This is async, and can't be used during component creation.
      this.state.onStartDevTesting = () => {
        if (! this.state.userInfoLoaded) {
          this.loadUserInfo();
        }
      }

      _.assign(this.state.panels.buy, {volumeQA: '100', assetQA: 'GBP', volumeBA: '0.05', assetBA: 'BTC'});

      _.assign(this.state.user.info.depositDetails.GBP, {
        accountName: 'Solidi',
        accountNumber: '00012484',
        sortCode: '040511',
        reference: 'SHMPQKC',
      });

      _.assign(this.state.user.info.user, {"address_1": "foo", "address_2": "foo2", "address_3": null, "address_4": null, "bank_limit": "0.00", "btc_limit": "12.50000000", "country": null, "crypto_limit": "20.00", "email": "mr@pig.com", "firstname": "Mr", "freewithdraw": 0, "landline": null, "lastname": "Pig", "mobile": null, "mon_bank_limit": "0", "mon_btc_limit": "12.5", "mon_crypto_limit": "20", "postcode": "Casdij", "uuid": "ecb7e23a-a4ff-4c18-80d5-924fec8ee7d9", "year_bank_limit": "0", "year_btc_limit": "200", "year_crypto_limit": "200"});

      this.state.user.pin = '1112';

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

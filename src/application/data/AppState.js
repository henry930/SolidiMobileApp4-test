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
import Big from 'big.js';

// Internal imports
import { assetsInfo, mainPanelStates, footerButtonList } from 'src/constants';
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
      this.abortAllRequests();
      /*
      If this is a new state, add an entry to the state history,
      unless it's a state we don't care about: e.g. PIN.
      A state history entry consists of:
      - mainPanelState
      - pageName
      Don't store a reloaded stashed state in the history list.
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
        this.state.stateChangeID += 1;
        log(`New stateChangeID: ${this.state.stateChangeID}`);
        this.setState({mainPanelState, pageName});
      }
    }

    this.stateChangeIDHasChanged = (stateChangeID) => {
      let stateChangeID2 = this.state.stateChangeID;
      if (stateChangeID !== stateChangeID2) {
        log(`stateChangeID is no longer ${stateChangeID}. It is now ${stateChangeID2}.`);
        return true;
      }
      return false;
    }

    this.stashCurrentState = () => {
      this.state.stashState({
        mainPanelState: this.state.mainPanelState,
        pageName: this.state.pageName,
      });
    }

    this.stashState = (stateX) => {
      // A state consists of a mainPanelState and a pageName.
      let expected = 'mainPanelState pageName'.split(' ');
      misc.confirmExactKeys('stateX', stateX, expected, 'stashState');
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

    this.createAbortController = () => {
      // Prepare for cancelling requests if the user changes screen.
      let controller = new AbortController();
      // Get a random integer from 0 to 999999.
      do { var controllerID = Math.floor(Math.random() * 10**6);
      } while (_.keys(this.state.abortControllers).includes(controllerID));
      this.state.abortControllers[controllerID] = controller;
      return controller;
    }

    this.abortAllRequests = () => {
      let controllers = this.state.abortControllers;
      //log({controllers})
      // Remove aborted controllers.
      let activeControllers = _.entries(controllers).filter(([key, value]) => value !== 'aborted');
      controllers = _.fromPairs(activeControllers);
      // Abort any active controllers.
      for (let [controllerID, controller] of _.entries(controllers)) {
        if (controller !== 'aborted') controller.abort();
        controllers[controllerID] = 'aborted';
        log(`Aborted controller ${controllerID}`)
      }
      // Future problem: If the user switches back and forth between screens fast enough, it's perhaps possible that the reassignment here of the altered controllers object to the appState will not include some new requests.
      this.state.abortControllers = controllers;
    }

    this.publicMethod = async (args) => {
      let {functionName, httpMethod, apiRoute, params, keyNames} = args;
      if (_.isNil(functionName)) functionName = '[Unspecified function]';
      if (_.isNil(httpMethod)) httpMethod = 'POST';
      if (_.isNil(apiRoute)) throw new Error('apiRoute required');
      if (_.isNil(params)) params = {};
      if (_.isNil(keyNames)) keyNames = [];
      let abortController = this.state.createAbortController();
      let data = await this.state.apiClient.publicMethod({httpMethod, apiRoute, params, abortController});
      if (_.has(data, 'error')) {
        if (data.error == 'timeout') {
          // Future: If we already have a stashed state, this could cause a problem.
          this.state.stashCurrentState();
          this.changeState('RequestTimeout');
        }
        let error = data.error;
        if (error == 'cannot_parse_data') {
          // Future:
          //this.state.stashCurrentState();
          //this.changeState('DataProblem');
        } else if (error == 'Insufficient currency') {
          // Todo: Fix 'ticker' function on backend.
          //pass
        } else if (error == 'aborted') {
          //pass
        } else {
          // Todo: For any other errors, switch to an error description page.
          let msg = `Error in ${functionName}.publicMethod (apiRoute=${apiRoute}):`;
          msg += misc.jd(error);
          console.error(msg);
        }
        return;
      }
      try {
        if (keyNames.length > 0) {
          misc.confirmExactKeys('data', data, keyNames, functionName);
        }
      } catch(err) {
        let msg = `Error in ${functionName}.publicMethod (apiRoute=${apiRoute}):`;
        msg += misc.jd(err);
        console.error(msg);
        // Todo: switch to an error description page.
      }
      return data;
    }

    this.privateMethod = async (args) => {
      let {functionName, httpMethod, apiRoute, params, keyNames} = args;
      if (_.isNil(functionName)) functionName = '[Unspecified function]';
      if (_.isNil(httpMethod)) httpMethod = 'POST';
      if (_.isNil(apiRoute)) throw new Error('apiRoute required');
      if (_.isNil(params)) params = {};
      if (_.isNil(keyNames)) keyNames = [];
      let abortController = this.state.createAbortController();
      let data = await this.state.apiClient.privateMethod({httpMethod, apiRoute, params, abortController});
      if (_.has(data, 'error')) {
        let error = data.error;
        if (error == 'timeout') {
          // Future: If we already have a stashed state, this could cause a problem.
          this.state.stashCurrentState();
          this.changeState('RequestTimeout');
        } else if (error == 'aborted') {
          //pass
        } else {
          // Todo: For any other errors, switch to an error description page.
          let msg = `Error in ${functionName}.privateMethod (apiRoute=${apiRoute}, params=${misc.jd(params)}):`;
          msg += misc.jd(error);
          console.error(msg);
        }
        return;
      }
      try {
        if (keyNames.length > 0) {
          misc.confirmExactKeys('data', data, keyNames, functionName);
        }
      } catch(err) {
        let msg = `Error in ${functionName}.privateMethod (apiRoute=${apiRoute}):`;
        msg += misc.jd(err);
        console.error(msg);
        // Todo: switch to an error description page.
      }
      return data;
    }

    // Useful during development.
    this.setAPIData = ({key, data}) => {
      let msg = `setAPIData: set state.apiData.${key} to hold: ${JSON.stringify(data, null, 2)}`;
      log(msg);
      //log('setAPIData: ' + key);
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

    this.lockApp = () => {
      this.state.stashCurrentState();
      this.state.authenticateUser();
    }

    this.resetLockAppTimer = async () => {
      let currentTimerID = this.state.lockAppTimerID;
      // If there's an active timer, stop it.
      if (! _.isNil(currentTimerID)) {
        clearTimeout(currentTimerID);
      }
      let waitTimeMinutes = 1; // Future: Set to 30 mins.
      let waitTimeSeconds = waitTimeMinutes * 60;
      let callLockApp = () => {
        if (this.state.mainPanelState !== 'PIN') {
          let msg = `lockAppTimer (${waitTimeMinutes} minutes) has finished.`;
          log(msg);
          this.state.lockApp();
        }
      }
      // Start new timer.
      let timerID = setTimeout(callLockApp, waitTimeSeconds * 1000);
      this.state.lockAppTimerID = timerID;
    }

    this.cancelTimers = () => {
      // Reset the "lockApp" timer.
      this.state.resetLockAppTimer();
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
      if (this.state.panels.requestTimeout.timerID) {
        clearInterval(this.state.panels.requestTimeout.timerID);
        this.state.panels.requestTimeout.timerID = null;
        log(`Cleared interval: requestTimeout`);
      }
    }

    this.switchToErrorState = ({error}) => {
      /* Future:
      - An error code.
      - Send an error report to an API route.
      */
      this.state.error.message = error;
      this.state.stashCurrentState();
      this.state.changeState('Error'); // Todo
    }

    // This is called immediately after a successful Login or PIN entry.
    this.loadUserInfo = async () => {
      await this.loadUser();
      await this.loadDepositDetails();
      await this.loadDefaultAccounts();
      await this.loadBalances();
    }

    this.loadUser = async () => {
      let keyNames = `address_1, address_2, address_3, address_4,
bank_limit, btc_limit, country, crypto_limit, email, firstname, freewithdraw,
landline, lastname, mobile, mon_bank_limit, mon_btc_limit, mon_crypto_limit,
postcode, uuid, year_bank_limit, year_btc_limit, year_crypto_limit,
`;
      keyNames = misc.splitStringIntoArray(keyNames);
      let data = await this.state.privateMethod({
        functionName: 'loadUser',
        apiRoute: 'user',
        keyNames,
      });
      // If the data differs from existing data, save it.
      let msg = "User info (basic) loaded from server.";
      if (jd(data) === jd(this.state.user.info.user)) {
        log(msg + " No change.");
      } else {
        log(msg + " New data saved to appState. " + jd(data));
        this.state.user.info.user = data;
      }
    }

    this.loadDepositDetails = async () => {
      let keyNames = `accountname, accountno, reference, result, sortcode`;
      keyNames = misc.splitStringIntoArray(keyNames);
      let data = await this.state.privateMethod({
        functionName: 'loadDepositDetails',
        apiRoute: 'deposit_details/GBP',
        keyNames,
      });
      // Example result:
      // {"data": {"accountname": "Solidi", "accountno": "00001036", "reference": "SHMPQKC", "result": "success", "sortcode": "040476"}}
      if (! _.has(data, 'result')) {
        console.error(data);
        return;
      }
      if (data.result != 'success') {
        // Future: User needs to verify some information first: address, identity.
      }
      let detailsGBP = {
        accountName: data.accountname,
        sortCode: data.sortcode,
        accountNumber: data.accountno,
        reference: data.reference,
      }
      // If the data differs from existing data, save it.
      msg = "User info (deposit details GBP) loaded from server.";
      if (jd(detailsGBP) === jd(this.state.user.info.depositDetails.GBP)) {
        log(msg + " No change.");
      } else {
        log(msg + " New data saved to appState. " + jd(detailsGBP));
        this.state.user.info.depositDetails.GBP = detailsGBP;
      }
    }

    this.loadDefaultAccounts = async () => {
      let data = await this.state.privateMethod({apiRoute: 'default_account/GBP'});
      // Data is a list of accounts. Each account is a JSON-encoded string containing these three keys:
      // accname, sortcode, accno.
      let keyNames = `accname, sortcode, accno`;
      keyNames = misc.splitStringIntoArray(keyNames);
      let defaultAccounts = [];
      for (let account of data) {
        account = JSON.parse(account);
        try {
          misc.confirmExactKeys('account', account, keyNames, 'loadDefaultAccounts');
        } catch(err) {
          console.error(err);
          // Todo: Switch to Error page.
        }
        let account2 = {
          accountName: account.accname,
          sortCode: account.sortcode,
          accountNumber: account.accno,
        }
        defaultAccounts.push(account2);
      }
      // Tmp: Testing:
      defaultAccounts = [{
        accountName: 'Mr John Fish, Esq',
        sortCode: '12-12-13',
        accountNumber: '123090342',
      }]
      // Future: Elsewhere, don't let the user get through onboarding without providing a default account.
      if (defaultAccounts.length == 0) {
        let msg = `At least one default GBP account is required.`;
        throw new Error(msg);
      }
      // We'll just use the first default account for now.
      let defaultAccount = defaultAccounts[0];
      // If the data differs from existing data, save it.
      msg = "User info (default account GBP) loaded from server.";
      if (jd(defaultAccount) === jd(this.state.user.info.defaultAccount.GBP)) {
        log(msg + " No change.");
      } else {
        log(msg + " New data saved to appState. " + jd(defaultAccount));
        this.state.user.info.defaultAccount.GBP = defaultAccount;
      }
    }

    this.getUserInfo = () => {
      let details = this.state.user.info;
      if (! _.isEmpty(details.user)) {
        return details;
      }
      // Otherwise, return specified empty slots that match the expected / required tree structure.
      // Update: Perhaps this isn't necessary.
      details = {
        user: {
          firstname: '',
          lastname: '',
        }
      }
      return details;
    }

    this.loadAssetInfo = async () => {
      let data = await this.state.publicMethod({
        httpMethod: 'GET',
        apiRoute: 'asset_info',
        params: {},
      });
      // Tmp: For development:
      _.assign(data, {
        'ETH': {
          name: 'Ethereum',
          type: 'crypto',
          decimalPlaces: 8,
          displaySymbol: 'ETH',
          displayString: 'ETH (Ethereum)',
        },
        'EUR': {
          name: 'Euro',
          type: 'fiat',
          decimalPlaces: 2,
          displaySymbol: 'EUR',
          displayString: 'EUR (Euro)',
        },
      });
      // If the data differs from existing data, save it.
      let msg = "Asset info loaded from server.";
      if (jd(data) === jd(this.state.apiData.asset_info)) {
        log(msg + " No change.");
      } else {
        log(msg + " New data saved to appState. " + jd(data));
        this.state.apiData.asset_info = data;
      }
      return data;
    }

    this.getAssetInfo = (asset) => {
      // Hardcode some standard assets so that we always have something to display.
      let hardcodedAssets = {
        'BTC': {
          name: 'Bitcoin',
          type: 'crypto',
          decimalPlaces: 8,
          displaySymbol: 'BTC',
          displayString: 'BTC (Bitcoin)',
        },
        'GBP': {
          name: 'British Pound',
          type: 'fiat',
          decimalPlaces: 2,
          displaySymbol: 'GBP',
          displayString: 'GBP (British Pound)',
        },
      }
      let blankAsset = {
        name: '[loading]',
        type: '[loading]',
        decimalPlaces: 8,
        displaySymbol: '[loading]',
        displayString: '[loading]',
      }
      let dataUnavailable = _.isNil(this.state.apiData.asset_info) ||
        (_.isNil(this.state.apiData.asset_info[asset]));
      if (dataUnavailable) {
        if (_.keys(hardcodedAssets).includes(asset)) return hardcodedAssets[asset];
        return blankAsset;
      }
      return this.state.apiData.asset_info[asset];
    }

    this.loadMarkets = async () => {
      let data = await this.state.publicMethod({
        httpMethod: 'GET',
        apiRoute: 'market',
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
      data = data.map(market => misc.getStandardMarket(market));
      // If the data differs from existing data, save it.
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

    this.loadCountries = async () => {
      let data = await this.state.publicMethod({
        httpMethod: 'GET',
        apiRoute: 'country',
        params: {},
      });
      // If the data differs from existing data, save it.
      let msg = "Country data loaded from server.";
      if (jd(data) === jd(this.state.apiData.country)) {
        log(msg + " No change.");
      } else {
        log(msg + " New data saved to appState. ");
        this.state.apiData.country = data;
      }
      return data;
    }

    this.getCountries = () => {
      let defaultList = [{code: 'GB', name: 'United Kingdom'}];
      let countries = this.state.apiData.country;
      if (_.isEmpty(countries)) return defaultList;
      return countries;
    }

    this.loadBalances = async () => {
      let data = await this.state.privateMethod({apiRoute: 'balance'});
      data = _.mapKeys(data, (value, key) => misc.getStandardAsset(key));
      data = _.mapValues(data, (value, key) => value.balance);
      let msg = "User balances loaded from server.";
      if (jd(data) === jd(this.state.apiData.balance)) {
        log(msg + " No change.");
      } else {
        log(msg + " New data saved to appState.");
        //this.state.setAPIData({key:'balance', data});
        this.state.apiData.balance = data;
      }
      return data;
    }

    this.getBalance = (asset) => {
      // Get the balance held in the appState.
      // Note: Currently, no ETH balance appearing in the data. Why not ?
      if (_.isUndefined(this.state.apiData.balance)) return '[loading]';
      if (_.isUndefined(this.state.apiData.balance[asset])) return '[loading]';
      let balance = this.state.apiData.balance[asset];
      let dp = assetsInfo[asset].decimalPlaces;
      let balanceString = Big(balance).toFixed(dp);
      return balanceString;
    }

    this.loadPrices = async () => {
      let data = await this.state.publicMethod({
        httpMethod: 'GET',
        apiRoute: 'ticker',
        params: {},
      });
      /* Example errors
      {"error":"Insufficient currency"}
      */
      // Tmp: For development:
      // Sample prices.
      data = {
        'BTC/GBPX': '2000.00',
        'ETH/GBPX': '100.00',
        'BTC/EURX': '3000.00',
        'ETH/EURX': '150.00',
      }
      // End tmp
      data = _.mapKeys(data, (value, key) => misc.getStandardMarket(key));
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
      let data = await this.state.privateMethod({
        httpMethod: 'POST',
        apiRoute: 'order_status/' + orderID,
        params: {},
      });
      // Todo: Look at data, and return 'live' or 'filled'.
      // Alternatively: call 'order/' + orderid, and check "settlement_status" value.
      let orderStatus = 'live'; //tmp
      let knownStatuses = 'live settled'.split(' ');
      misc.confirmItemInArray('knownStatuses', knownStatuses, orderStatus, 'getOrderStatus');
      return orderStatus;
    }

    this.sendBuyOrder = async () => {
      ({volumeQA, volumeBA, assetQA, assetBA} = this.state.panels.buy);
      let market = assetBA + '/' + assetQA;
      log(`Send order to server: BUY ${volumeBA} ${market} @ MARKET ${volumeQA}`);
      market = misc.getSolidiServerMarket(market);
      let data = await this.state.privateMethod({
        httpMethod: 'POST',
        apiRoute: 'buy',
        params: {
          fxmarket: market,
          amount: volumeBA,
          price: volumeQA,
        },
      });
      /*
      Example data:
      {"id":11,"datetime":1643047261277,"type":0,"price":"100","amount":"0.05"}
      Example error response:
      */
      // Store the orderID. Later, we'll use it to check the order's status.
      log(`OrderID: ${data.id}`);
      this.state.panels.buy.orderID = data.id;
      return data;
    }

    this.sendSellOrder = async () => {
      ({volumeQA, volumeBA, assetQA, assetBA} = this.state.panels.sell);
      let market = assetBA + '/' + assetQA;
      log(`Send order to server: SELL ${volumeBA} ${market} @ MARKET ${volumeQA}`);
      market = misc.getSolidiServerMarket(market);
      let data = await this.state.privateMethod({
        httpMethod: 'POST',
        apiRoute: 'sell',
        params: {
          fxmarket: market,
          amount: volumeBA,
          price: volumeQA,
        },
      });
      /*
      Example error response:
      {"error": "Insufficient Funds"}
      */
      // Store the orderID. Later, we'll use it to check the order's status.
      log(`OrderID: ${data.id}`);
      this.state.panels.sell.orderID = data.id;
      return data;
    }

    this.loadFees = async () => {
      // For now, we only load withdrawal fees.
      let data = await this.state.privateMethod({apiRoute:'fee'});
      /* Example error:
      {"error": "Incorrect nonce"}
      */
      /* Example data:
      [{"name":"BTC","free_fee":"0.00000000"},{"name":"GBP","free_fee":"0.50000000"}]
      */
      // Data also contains 'GBPX', which we ignore.
      // Restructure data.
      let newFees = {};
      for (let x of data) {
        newFees[x.name] = x.free_fee;
      }
      let msg = "Withdrawal fee data loaded from server.";
      if (jd(newFees) === jd(this.state.fees.withdraw)) {
        log(msg + " No change.");
      } else {
        log(msg + " New data saved to appState.");
        this.state.fees.withdraw = newFees;
      }
      return newFees;
    }

    this.getFee = ({feeType, asset}) => {
      // Get a fee held in the appState.
      // feeType = deposit, withdraw.
      if (! 'deposit withdraw'.split(' ').includes(feeType))
        throw new Error(`Unrecognised feeType: ${feeType}`);
      if (_.isNil(this.state.fees[feeType][asset])) return '[loading]';
      let fee = this.state.fees[feeType][asset];
      let dp = assetsInfo[asset].decimalPlaces;
      let feeString = Big(fee).toFixed(dp);
      return feeString;
    }

    this.sendWithdraw = async ({asset, volume, addressInfo}) => {
      log(`Send withdraw to server: withdraw ${volume} ${asset} to ${addressInfo}`);
      let data = await this.state.privateMethod({
        httpMethod: 'POST',
        apiRoute: `withdraw/${asset}`,
        params: {
          volume,
          addressInfo,
          priority: 'FREE',
        },
      });
      /* Example data:
      {"id": 9094}
      */
      // Todo: Store list of withdraw IDs. View them later, and see whether they have completed.
    }

    // The actual state object of the app.
    // This must be declared towards the end of the constructor.
    this.state = {
      numberOfFooterButtonsToDisplay: this.numberOfFooterButtonsToDisplay,
      mainPanelState: this.initialMainPanelState,
      pageName: this.initialPageName,
      changeState: this.changeState,
      setMainPanelState: this.setMainPanelState,
      stateChangeIDHasChanged: this.stateChangeIDHasChanged,
      stashedState: {},
      stateHistoryList: [],
      stashCurrentState: this.stashCurrentState,
      stashState: this.stashState,
      loadStashedState: this.loadStashedState,
      decrementStateHistory: this.decrementStateHistory,
      footerIndex: 0,
      setFooterIndex: this.setFooterIndex,
      createAbortController: this.createAbortController,
      abortAllRequests: this.abortAllRequests,
      publicMethod: this.publicMethod,
      privateMethod: this.privateMethod,
      setAPIData: this.setAPIData,
      authenticateUser: this.authenticateUser,
      choosePIN: this.choosePIN,
      loadPIN: this.loadPIN,
      lockApp: this.lockApp,
      resetLockAppTimer: this.resetLockAppTimer,
      cancelTimers: this.cancelTimers,
      switchToErrorState: this.switchToErrorState,
      loadUserInfo: this.loadUserInfo,
      getUserInfo: this.getUserInfo,
      loadUser: this.loadUser,
      loadDepositDetails: this.loadDepositDetails,
      loadDefaultAccounts: this.loadDefaultAccounts,
      loadAssetInfo: this.loadAssetInfo,
      getAssetInfo: this.getAssetInfo,
      loadMarkets: this.loadMarkets,
      getMarkets: this.getMarkets,
      loadCountries: this.loadCountries,
      getCountries: this.getCountries,
      getBaseAssets: this.getBaseAssets,
      getQuoteAssets: this.getQuoteAssets,
      loadBalances: this.loadBalances,
      getBalance: this.getBalance,
      loadPrices: this.loadPrices,
      getPrice: this.getPrice,
      getOrderStatus: this.getOrderStatus,
      sendBuyOrder: this.sendBuyOrder,
      sendSellOrder: this.sendSellOrder,
      loadFees: this.loadFees,
      getFee: this.getFee,
      sendWithdraw: this.sendWithdraw,
      stateChangeID: 0,
      abortControllers: {},
      // In apiData, we store unmodified data retrieved from the API.
      // Each sub-object corresponds to a different API route, and should have the same name as that route.
      apiData: {
        market: {},
        ticker: {},
        balance: {},
      },
      domain: 'solidi.co',
      userAgent: "Solidi Mobile App 4",
      user: {
        isAuthenticated: false,
        email: '',
        password: '',
        info: {
          // In info, we store a lot of user-specific data retrieved from the API.
          // It is often restructured into a new form, but remains partitioned by API route.
          user: {},
          depositDetails: {
            GBP: {
              accountName: null,
              sortCode: null,
              accountNumber: null,
              reference: null,
            },
          },
          defaultAccount: {
            GBP: {
              accountName: null,
              sortCode: null,
              accountNumber: null,
            },
          },
        },
        pin: '',
      },
      authRequired: [
        'History',
      ],
      apiClient: null,
      appName: this.appName,
      lockAppTimerID: null,
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
          feeQA: 0,
          totalQA: 0,
        },
        makePayment: {
          timerID: null,
        },
        waitingForPayment: {
          timerID: null,
        },
        requestTimeout: {
          timerID: null,
        },
      },
      fees: {
        deposit: {
          GBP: 0,
        },
        withdraw: {
          GBP: 0,
        },
      },
      error: {
        code: 0,
        message: '',
      }
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
    this.resetLockAppTimer();

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
    let setup = async () => {
      await this.state.loadMarkets();
      await this.state.loadPrices();
    }
    //setup();

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
        this.loadUserInfo();
      }

      _.assign(this.state.panels.buy, {volumeQA: '100', assetQA: 'GBP', volumeBA: '0.05', assetBA: 'BTC'});

      _.assign(this.state.panels.sell, {volumeQA: '100', assetQA: 'GBP', volumeBA: '0.05', assetBA: 'BTC'});

      _.assign(this.state.user.info.depositDetails.GBP, {
        accountName: 'Solidi',
        accountNumber: '00012484',
        sortCode: '040511',
        reference: 'SHMPQKC',
      });

      _.assign(this.state.user.info.user, {"address_1": "foo", "address_2": "foo2", "address_3": null, "address_4": null, "bank_limit": "0.00", "btc_limit": "12.50000000", "country": null, "crypto_limit": "20.00", "email": "mr@pig.com", "firstname": "Mr", "freewithdraw": 0, "landline": null, "lastname": "Pig", "mobile": null, "mon_bank_limit": "0", "mon_btc_limit": "12.5", "mon_crypto_limit": "20", "postcode": "Casdij", "uuid": "ecb7e23a-a4ff-4c18-80d5-924fec8ee7d9", "year_bank_limit": "0", "year_btc_limit": "200", "year_crypto_limit": "200"});

      this.state.user.pin = '1112';

      this.state.user.info.defaultAccount.GBP = {
        accountName: 'Mr John Fish, Esq',
        sortCode: '12-12-13',
        accountNumber: '123090342',
      }

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

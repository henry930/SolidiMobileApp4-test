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
import { mainPanelStates, footerButtonList } from 'src/constants';
import SolidiRestAPIClientLibrary from 'src/api/SolidiRestAPIClientLibrary';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import misc from 'src/util/misc';
import appTier from 'src/constants/appTier';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('AppState');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);

// Shortcuts
let jd = JSON.stringify;

// Settings
let appDomain = 'solidi.co';



let AppStateContext = React.createContext();


class AppStateProvider extends Component {

  constructor(props) {
    super(props);

    // Can set this initial state for testing.
    this.initialMainPanelState = 'Buy';
    this.initialPageName = 'default';

    // Misc
    this.numberOfFooterButtonsToDisplay = 3;
    this.standardPaddingTop = scaledHeight(80);
    this.standardPaddingHorizontal = scaledWidth(15);
    this.nonHistoryPanels = ['PIN'];
    this.appName = 'SolidiMobileApp';
    this.apiVersion = '1';
    this.appTier = appTier;

    // Shortcut function for changing the mainPanelState.
    this.changeState = (stateName, pageName) => {
      if (! mainPanelStates.includes(stateName)) {
        throw Error(`Unrecognised stateName: ${JSON.stringify(stateName)}`);
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
      // If there's no stashed state, don't do anything.
      if (_.isEmpty(this.state.stashedState)) return;
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
        log(`Aborted controller ${controllerID}`);
      }
      // Future problem: If the user switches back and forth between screens fast enough, it's perhaps possible that the reassignment here of the altered controllers object to the appState will not include some new requests.
      this.state.abortControllers = controllers;
    }

    // Note: publicMethod and privateMethod have to be kept in sync.
    // Future: Perhaps they could be refactored into a single function with two wrapper functions.

    this.publicMethod = async (args) => {
      let {functionName, httpMethod, apiRoute, params, keyNames} = args;
      if (_.isNil(functionName)) functionName = '[Unspecified function]';
      if (_.isNil(httpMethod)) httpMethod = 'POST';
      if (_.isNil(apiRoute)) throw new Error('apiRoute required');
      if (_.isNil(params)) params = {};
      if (_.isNil(keyNames)) keyNames = [];
      if (this.state.mainPanelState === 'RequestFailed') return;
      let abortController = this.state.createAbortController();
      let data = await this.state.apiClient.publicMethod({httpMethod, apiRoute, params, abortController});
      // Tmp: Ticker isn't currently working.
      if (apiRoute == 'ticker') delete data.error;
      // Examine errors.
      if (_.has(data, 'error')) {
        let error = data.error;
        if (error == 'cannot_parse_data') {
          this.state.switchToErrorState({message:JSON.stringify(data)});
          return 'DisplayedError';
        } else if (error == 'timeout') {
          // Future: If we already have a stashed state, this could cause a problem.
          this.state.stashCurrentState();
          this.changeState('RequestTimeout');
          return 'DisplayedError';
        } else if (error == 'aborted') {
          //pass
        } else if (error == 'request_failed') {
          if (this.state.mainPanelState !== 'RequestFailed') {
            this.state.stashCurrentState();
            this.changeState('RequestFailed');
            return 'DisplayedError';
          }
          // We only arrive at this point if we've had a "request_failed" error from a second request. No point doing anything extra about it.
        } else if (_.isString(error) && error.startsWith('ValidationError:')) {
          // This is a user-input validation error.
          // The page that sent the request should display it to the user.
          return data;
        } else {
          // For any other errors, switch to an error description page.
          let msg = `Error in ${functionName}.publicMethod (apiRoute=${apiRoute}, params=${misc.jd(params)}):`;
          if (! _.isString(error)) error = JSON.stringify(error);
          msg += ' ' + String(error);
          this.state.switchToErrorState({message:msg});
          return 'DisplayedError';
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
        this.state.switchToErrorState({message:msg});
        return 'DisplayedError';
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
      if (this.state.mainPanelState === 'RequestFailed') return;
      let abortController = this.state.createAbortController();
      let data = await this.state.apiClient.privateMethod({httpMethod, apiRoute, params, abortController});
      if (_.has(data, 'error')) {
        let error = data.error;
        if (error == 'cannot_parse_data') {
          this.state.switchToErrorState({message:JSON.stringify(data)});
          return 'DisplayedError';
        } else if (error == 'timeout') {
          // Future: If we already have a stashed state, this could cause a problem.
          this.state.stashCurrentState();
          this.changeState('RequestTimeout');
          return 'DisplayedError';
        } else if (error == 'aborted') {
          //pass
        } else if (error == 'request_failed') {
          if (this.state.mainPanelState !== 'RequestFailed') {
            this.state.stashCurrentState();
            this.changeState('RequestFailed');
            return 'DisplayedError';
          }
          // We only arrive at this point if we've had a "request_failed" error from a second request. No point doing anything extra about it.
        } else if (_.isString(error) && error.startsWith('ValidationError:')) {
          // This is a user-input validation error.
          // The page that sent the request should display it to the user.
          return data;
        } else if (error == 'Could not retrieve deposit details') {
          // This is an internal error.
          // Display it on the original page.
          return data;
        } else {
          // For any other errors, switch to an error description page.
          let msg = `Error in ${functionName}.privateMethod (apiRoute=${apiRoute}, params=${misc.jd(params)}):`;
          if (! _.isString(error)) error = JSON.stringify(error);
          msg += ' ' + String(error);
          this.state.switchToErrorState({message:msg});
          return 'DisplayedError';
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
        this.state.switchToErrorState({message:msg});
        return 'DisplayedError';
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
      // If email (and password) aren't present, go to Login.
      // Note: The PIN is kept in storage even if the user logs out.
      if (! this.state.user.email) return this.state.changeState('Login');
      // Otherwise, if we have a PIN, go to PIN entry.
      if (this.state.user.pin) return this.state.changeState('PIN');
      // Otherwise, go to Login.
      return this.state.changeState('Login');
    }

    this.deletePIN = async (deleteFromKeychain=false) => {
      // Delete the PIN in memory.
      this.state.user.pin = '';
      let msg = 'PIN deleted from app memory.';
      if (deleteFromKeychain) {
        await deleteUserPinCode(this.state.appName);
        msg += ' PIN also deleted from Keychain storage.';
      }
      log(msg);
    }

    this.choosePIN = async () => {
      // Deleting the PIN happens first, because it will affect the flow in subsequent pages.
      await this.state.deletePIN(deleteFromKeychain=true);
      // If the app is locked, and the user has chosen to reset the PIN, then we need to log them out.
      // This ensures that they have to log in before they can choose a new PIN.
      if (this.state.appLocked) {
        await this.state.logout();
      }
      // If user hasn't logged in, they need to do so first.
      if (! this.state.user.isAuthenticated) {
        // We send them to the login page, which will ask them to choose a PIN afterwards.
        return this.state.setMainPanelState({mainPanelState: 'Login'});
      }
      // If the app was not locked, and we are logged in, go directly to the choosePIN page.
      this.state.setMainPanelState({mainPanelState: 'PIN', pageName: 'choose'});
    }

    this.loadPIN = async () => {
      /*
      - We load the PIN from the keychain if it exists.
      - This uses a promise - there will be a slight delay while the data is retrieved.
      - However: The user would have to be very fast indeed to click Buy on the initial BUY page before this completes.
      */
      let credentials = await Keychain.getInternetCredentials(this.state.appName);
      // Example result:
      // {"password": "1111", "server": "SolidiMobileApp", "storage": "keychain", "username": "SolidiMobileApp"}
      if (credentials) {
        let pin = credentials.password;
        this.state.user.pin = pin;
        log(`PIN loaded: ${pin}`);
      } else {
        log(`No PIN found in Keychain.`);
      }
    }

    this.logout = async () => {
      // Delete user's email and password from memory and from keychain.
      this.state.user.email = '';
      this.state.user.password = '';
      await Keychain.resetInternetCredentials(this.state.domain);
      // Set user to 'not authenticated'.
      this.state.user.isAuthenticated = false;
    }

    this.lockApp = () => {
      this.state.appLocked = true;
      this.state.stashCurrentState();
      this.state.authenticateUser();
    }

    this.resetLockAppTimer = async () => {
      let currentTimerID = this.state.lockAppTimerID;
      // If there's an active timer, stop it.
      if (! _.isNil(currentTimerID)) {
        clearTimeout(currentTimerID);
      }
      let waitTimeMinutes = 120; // Future: Set to 30 mins.
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

    this.switchToErrorState = ({message}) => {
      /* Future:
      - An error code.
      - Send an error report to an API route.
      */
      log(`switchToErrorState: ${message}`);
      this.state.error.message = message;
      this.state.stashCurrentState();
      this.state.changeState('Error');
    }




    /* Public API methods */




    this.checkForNewAPIVersion = async () => {
      let data = await this.state.publicMethod({
        apiRoute: 'api_latest_version',
        httpMethod: 'GET',
      });
      if (data == 'DisplayedError') return;
      // if (! .has(data, 'api_latest_version')) this.state.changeState('Error');
      let newAPIVersion = data.api_latest_version === this.state.apiVersion;
      return newAPIVersion;
    }

    this.loadAssetsInfo = async () => {
      let data = await this.state.publicMethod({
        httpMethod: 'GET',
        apiRoute: 'asset_info',
        params: {},
      });
      if (data == 'DisplayedError') return;
      // Tmp: For development:
      _.assign(data, {
        'ETH': {
          name: 'Ethereum',
          type: 'crypto',
          decimalPlaces: 8,
          displaySymbol: 'ETH',
          displayString: 'ETH (Ethereum)',
          addressProperties: 'address'.split(' '),
        },
        'EUR': {
          name: 'Euro',
          type: 'fiat',
          decimalPlaces: 2,
          displaySymbol: 'EUR',
          displayString: 'EUR (Euro)',
          addressProperties: 'accountName BIC IBAN'.split(' '),
        },
        'XRP': {
          name: 'Ripple',
          type: 'crypto',
          decimalPlaces: 6,
          displaySymbol: 'XRP',
          displayString: 'XRP (Ripple)',
          addressProperties: 'address destinationTag'.split(' '),
        },
      });
      // If the data differs from existing data, save it.
      let msg = "Asset info loaded from server.";
      if (jd(data) === jd(this.state.apiData.asset_info)) {
        log(msg + " No change.");
      } else {
        msg += " New data saved to appState."
        //msg += ' ' + jd(data));
        log(msg);
        this.state.apiData.asset_info = data;
      }
      return data;
    }

    this.getAssetInfo = (asset) => {
      if (_.isEmpty(asset)) { console.error('Asset required'); return; }
      // Hardcode some standard assets so that we always have something to display.
      let hardcodedAssets = {
        'BTC': {
          name: 'Bitcoin',
          type: 'crypto',
          decimalPlaces: 8,
          displaySymbol: 'BTC',
          displayString: 'BTC (Bitcoin)',
          addressProperties: [],
        },
        'GBP': {
          name: 'British Pound',
          type: 'fiat',
          decimalPlaces: 2,
          displaySymbol: 'GBP',
          displayString: 'GBP (British Pound)',
          addressProperties: [],
        },
      }
      let blankAsset = {
        name: '[loading]',
        type: '[loading]',
        decimalPlaces: 2,
        displaySymbol: '[loading]',
        displayString: '[loading]',
        addressProperties: [],
      }
      let dataUnavailable = _.isNil(this.state.apiData.asset_info) ||
        (_.isNil(this.state.apiData.asset_info[asset]));
      if (dataUnavailable) {
        if (_.keys(hardcodedAssets).includes(asset)) return hardcodedAssets[asset];
        return blankAsset;
      }
      return this.state.apiData.asset_info[asset];
    }

    this.getAssetsInfo = () => {
      return this.state.apiData.asset_info;
    }

    this.getAssets = () => {
      return _.keys(this.state.apiData.asset_info).sort();
    }

    this.loadMarkets = async () => {
      let data = await this.state.publicMethod({
        httpMethod: 'GET',
        apiRoute: 'market',
        params: {},
      });
      if (data == 'DisplayedError') return;
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
      // Note: This defaultList also produces the default base and quote assets in various pages.
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
      if (data == 'DisplayedError') return;
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

    this.loadPrices = async () => {
      let data = await this.state.publicMethod({
        httpMethod: 'GET',
        apiRoute: 'ticker',
        params: {},
      });
      if (data == 'DisplayedError') return;
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
      // End Tmp
      data = _.mapKeys(data, (value, key) => misc.getStandardMarket(key));
      let msg = "Prices loaded from server.";
      this.state.priceLoadCount += 1;
      // Tmp 2: To mock price changes, decrement the price by a bit more on each load.
      let tmp2 = true;
      if (tmp2) {
        for (let market of this.state.getMarkets()) {
          if (market == 'BTC/GBP') continue;
          let [assetBA, assetQA] = market.split('/');
          let dp = this.state.getAssetInfo(assetQA).decimalPlaces;
          let price = data[market];
          let x = Big('1.01').mul(Big(this.state.priceLoadCount));
          let price2 = (Big(price).minus(x)).toFixed(dp);
          data[market] = price2;
        }
      }
      // End Tmp 2
      if (jd(data) === jd(this.state.apiData.ticker)) {
        log(msg + " No change.");
      } else {
        log(msg + " New data saved to appState. " + jd(data));
        // Save old data for price change checking. Use new data if old data is empty.
        this.state.prevAPIData.ticker = this.state.apiData.ticker;
        if (_.isEmpty(this.state.apiData.ticker)) {
          this.state.prevAPIData.ticker = data;
        }
        // Save new data.
        this.state.apiData.ticker = data;
      }
      return data;
    }

    this.getPrices = () => {
      return this.state.apiData.ticker;
    }

    this.getPrice = (market) => {
      // Get the price held in the appState.
      if (_.isUndefined(this.state.apiData.ticker[market])) return '0';
      return this.state.apiData.ticker[market];
    }

    this.getPrevPrice = (market) => {
      // Get the previous price held in the appState.
      if (_.isUndefined(this.state.prevAPIData.ticker[market])) return '0';
      return this.state.prevAPIData.ticker[market];
    }

    this.setPrice = ({market, price}) => {
      // Useful during development.
      this.state.apiData.ticker[market] = price;
    }

    this.setPrevPrice = ({market, price}) => {
      // Useful during development.
      this.state.prevAPIData.ticker[market] = price;
    }

    this.getZeroValue = (asset) => {
      // Get a zero value with the right number of decimal places for the asset.
      let dp = this.state.getAssetInfo(asset).decimalPlaces;
      let value = Big(0).toFixed(dp);
      return value;
    }

    this.getFullDecimalValue = ({asset, value, functionName}) => {
      // Add zeros to the value to get the full number of decimal places for the asset.
      if (_.isNil(functionName)) functionName = '[Unspecified location]';
      if (! misc.isNumericString(value)) {
        log(`${functionName}.getFullDecimalValue: value '${value}' is not a numeric string.`);
        return '[loading]';
      }
      let dp = this.state.getAssetInfo(asset).decimalPlaces;
      let value2 = Big(value).toFixed(dp);
      return value2;
    }




    /* END Public API methods */




    /* Private API methods */




    // This is called immediately after a successful Login or PIN entry.
    this.loadUserInfo = async () => {
      await this.loadUser();
      await this.loadAssetsInfo();
      await this.loadDepositDetailsForAsset('GBP');
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
      if (data == 'DisplayedError') return;
      // If the data differs from existing data, save it.
      let msg = "User info (basic) loaded from server.";
      if (jd(data) === jd(this.state.user.info.user)) {
        log(msg + " No change.");
      } else {
        log(msg + " New data saved to appState. " + jd(data));
        this.state.user.info.user = data;
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

    this.loadDepositDetailsForAsset = async (asset) => {
      // These are the internal Solidi addresses / accounts that we provide for each user.
      let funcName = 'loadDepositDetailsForAsset';
      if (_.isEmpty(asset)) { console.error(`${funcName}: Asset required`); return; }
      let assets = this.state.getAssets();
      if (! assets.includes(asset)) { console.log(`${funcName}: ERROR: Unrecognised asset: ${asset}`); return; }
      let data = await this.state.privateMethod({
        functionName: 'loadDepositDetailsForAsset',
        apiRoute: `deposit_details/${asset}`,
      });
      if (data == 'DisplayedError') return;
      // Example result for GBP:
      /*
      {
        "result": "success",
        "sortCode": "040476",
        "accountNumber": "00001036",
        "accountName": "Solidi",
        "reference": "SHMPQKC"
      }
      */
     delete data.result;
     let details = data;
      // If the data differs from existing data, save it.
      msg = `User info (deposit details ${asset}) loaded from server.`;
      if (jd(details) === jd(this.state.user.info.depositDetails[asset])) {
        log(msg + " No change.");
      } else {
        log(msg + " New data saved to appState. " + jd(details));
        this.state.user.info.depositDetails[asset] = details;
      }
    }

    this.getDepositDetailsForAsset = (asset) => {
      let funcName = 'getDepositDetailsForAsset';
      if (_.isEmpty(asset)) { console.error(`${funcName}: Asset required`); return; }
      let assets = this.state.getAssets();
      if (! assets.includes(asset)) { return '[loading]'; }
      if (_.isUndefined(this.state.user.info.depositDetails)) return '[loading]';
      if (_.isUndefined(this.state.user.info.depositDetails[asset])) return '[loading]';
      let addressProperties = this.state.user.info.depositDetails[asset];
      return addressProperties;
    }

    this.loadDefaultAccounts = async () => {
      // These are default accounts for withdrawals. They should be external addresses /accounts held by the user.
      let data = await this.state.privateMethod({apiRoute: 'default_account/GBP'});
      if (data == 'DisplayedError') return;
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
      if (jd(defaultAccount) === jd(this.state.user.info.defaultAccounts.GBP)) {
        log(msg + " No change.");
      } else {
        log(msg + " New data saved to appState. " + jd(defaultAccount));
        this.state.user.info.defaultAccounts.GBP = defaultAccount;
      }
    }

    this.loadBalances = async () => {
      let data = await this.state.privateMethod({apiRoute: 'balance'});
      if (data == 'DisplayedError') return;
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
      let dp = this.state.getAssetInfo(asset).decimalPlaces;
      let balanceString = Big(balance).toFixed(dp);
      return balanceString;
    }

    this.getOrderStatus = async ({orderID}) => {
      let data = await this.state.privateMethod({
        httpMethod: 'POST',
        apiRoute: 'order_status/' + orderID,
        params: {},
      });
      if (data == 'DisplayedError') return;
      // Todo: Look at data, and return 'live' or 'filled'.
      // Alternatively: call 'order/' + orderid, and check "settlement_status" value.
      let orderStatus = 'live'; //tmp
      let knownStatuses = 'live settled'.split(' ');
      misc.confirmItemInArray('knownStatuses', knownStatuses, orderStatus, 'getOrderStatus');
      return orderStatus;
    }

    this.sendBuyOrder = async () => {
      if (! this.state.panels.buy.activeOrder) {
        log('No active BUY order. Leaving sendBuyOrder.');
        return;
      }
      // Ensure that this order only gets processed once.
      this.state.panels.buy.activeOrder = false;
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
      if (data == 'DisplayedError') return;
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
      if (data == 'DisplayedError') return;
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
      if (data == 'DisplayedError') return;
      /* Example data:
      [
        {
          "asset": "BTC",
          "withdraw": {
            "low_fee": "0.00000000",
            "medium_fee": "0.00030000",
            "high_fee": "0.00050000"
          }
        },
        {
          "asset": "GBP",
          "withdraw": {
            "low_fee": "0.50000000",
            "medium_fee": "0.50000000",
            "high_fee": "0.50000000"
          }
        },
      ]
      */
      // Data also contains 'GBPX', which we ignore.
      // Restructure data.
      let withdrawFees = {};
      for (let x of data) {
        withdrawFees[x.asset] = {
          low: x.withdraw.low_fee,
          medium: x.withdraw.medium_fee,
          high: x.withdraw.high_fee,
        }
      }
      let msg = "Withdrawal fee data loaded from server.";
      if (jd(withdrawFees) === jd(this.state.fees.withdraw)) {
        log(msg + " No change.");
      } else {
        log(msg + " New data saved to appState.");
        this.state.fees.withdraw = withdrawFees;
      }
      return withdrawFees;
    }

    this.getFee = ({feeType, asset, priority}) => {
      // Get a fee held in the appState.
      // feeType options: deposit, withdraw.
      // priority options: low, medium, high.
      if (! 'deposit withdraw'.split(' ').includes(feeType)) {
        console.error(`Unrecognised feeType: ${feeType}`);
      }
      if (! 'low medium high'.split(' ').includes(priority)) {
        console.error(`Unrecognised priority: ${priority}`);
      }
      if (_.isNil(this.state.fees[feeType][asset])) {
        log(`No fee found for fees.${feeType}.${asset}.`);
        return '[loading]';
      }
      if (_.isNil(this.state.fees[feeType][asset][priority])) {
        return '[loading]';
      }
      let fee = this.state.fees[feeType][asset][priority];
      let dp = this.state.getAssetInfo(asset).decimalPlaces;
      let feeString = Big(fee).toFixed(dp);
      return feeString;
    }

    this.sendWithdraw = async ({asset, volume, addressInfo, priority, functionName}) => {
      log(`Send withdraw to server: withdraw ${volume} ${asset} to ${JSON.stringify(addressInfo)}`);
      let data = await this.state.privateMethod({
        httpMethod: 'POST',
        apiRoute: `withdraw/${asset}`,
        params: {
          volume,
          addressInfo,
          priority,
        },
        functionName,
      });
      /* Example data:
        {"id": 9094}
      */
      /* Example error:
      {
        "error": "ValidationError: Amount (0.00000000) is zero."
      }
      */
      return data;
    }




    /* END Private API methods */




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
      deletePIN: this.deletePIN,
      choosePIN: this.choosePIN,
      loadPIN: this.loadPIN,
      logout: this.logout,
      lockApp: this.lockApp,
      resetLockAppTimer: this.resetLockAppTimer,
      cancelTimers: this.cancelTimers,
      switchToErrorState: this.switchToErrorState,
      /* Public API methods */
      checkForNewAPIVersion: this.checkForNewAPIVersion,
      loadAssetsInfo: this.loadAssetsInfo,
      getAssetInfo: this.getAssetInfo,
      getAssetsInfo: this.getAssetsInfo,
      getAssets: this.getAssets,
      loadMarkets: this.loadMarkets,
      getMarkets: this.getMarkets,
      loadCountries: this.loadCountries,
      getCountries: this.getCountries,
      getBaseAssets: this.getBaseAssets,
      getQuoteAssets: this.getQuoteAssets,
      loadPrices: this.loadPrices,
      getPrices: this.getPrices,
      getPrice: this.getPrice,
      getPrevPrice: this.getPrevPrice,
      setPrice: this.setPrice,
      setPrevPrice: this.setPrevPrice,
      getZeroValue: this.getZeroValue,
      getFullDecimalValue: this.getFullDecimalValue,
      /* END Public API methods */
      /* Private API methods */
      loadUserInfo: this.loadUserInfo,
      loadUser: this.loadUser,
      getUserInfo: this.getUserInfo,
      loadDepositDetailsForAsset: this.loadDepositDetailsForAsset,
      getDepositDetailsForAsset: this.getDepositDetailsForAsset,
      loadDefaultAccounts: this.loadDefaultAccounts,
      loadBalances: this.loadBalances,
      getBalance: this.getBalance,
      getOrderStatus: this.getOrderStatus,
      sendBuyOrder: this.sendBuyOrder,
      sendSellOrder: this.sendSellOrder,
      loadFees: this.loadFees,
      getFee: this.getFee,
      sendWithdraw: this.sendWithdraw,
      /* END Private API methods */
      stateChangeID: 0,
      abortControllers: {},
      appLocked: false,
      // In apiData, we store unmodified data retrieved from the API.
      // Each sub-object corresponds to a different API route, and should have the same name as that route.
      apiData: {
        market: {},
        ticker: {},
        balance: {},
      },
      prevAPIData: {
        ticker: {},
      },
      priceLoadCount: 0,
      domain: appDomain,
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
          defaultAccounts: {
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
        'ChooseHowToPay',
        'History',
      ],
      apiClient: null,
      appName: this.appName,
      lockAppTimerID: null,
      panels: {
        buy: {
          activeOrder: false,
          orderID: null,
          volumeQA: 0,
          symbolQA: '',
          volumeBA: 0,
          symbolBA: '',
        },
        sell: {
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
        send: {
          asset: null,
          volume: null,
          addressProperties: null,
          priority: null,
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
    if (appTier === 'dev') {
      this.state.domain = 't3.solidi.co';
    }

    // Create a non-authenticated API client that can call public methods.
    this.state.apiClient = new SolidiRestAPIClientLibrary({
      userAgent: this.state.userAgent, apiKey:'', apiSecret:'',
      domain: this.state.domain,
    });

    // Call public methods that provide useful data.
    let setup = async () => {
      await this.state.loadAssetsInfo();
      await this.state.loadMarkets();
      await this.state.loadPrices();
    }
    //setup();

    // === End setup

    // Tweak app state for dev work.
    if (appTier === 'dev') {

      this.state.domain = 't3.solidi.co';

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

      _.assign(this.state.panels.sell, {volumeQA: '100', assetQA: 'GBP', volumeBA: '0.05', assetBA: 'BTC', totalQA: '100'});

      _.assign(this.state.user.info.depositDetails.GBP, {
        accountName: 'Solidi',
        accountNumber: '00012484',
        sortCode: '040511',
        reference: 'SHMPQKC',
      });

      _.assign(this.state.user.info.user, {"address_1": "foo", "address_2": "foo2", "address_3": null, "address_4": null, "bank_limit": "0.00", "btc_limit": "12.50000000", "country": null, "crypto_limit": "20.00", "email": "mr@pig.com", "firstname": "Mr", "freewithdraw": 0, "landline": null, "lastname": "Pig", "mobile": null, "mon_bank_limit": "0", "mon_btc_limit": "12.5", "mon_crypto_limit": "20", "postcode": "Casdij", "uuid": "ecb7e23a-a4ff-4c18-80d5-924fec8ee7d9", "year_bank_limit": "0", "year_btc_limit": "200", "year_crypto_limit": "200"});

      this.state.user.pin = '1112';

      this.state.user.info.defaultAccounts.GBP = {
        accountName: 'Mr John Fish, Esq',
        sortCode: '12-12-13',
        accountNumber: '123090342',
      }

      _.assign(this.state.panels.send, {
        asset: 'GBP',
        volume: '7001.23',
        addressProperties: {
          address: '1BwmSDfQQDnkC4DkovjjtUCbaz9ijBYGcY',
          accountName: 'William Brown',
          sortCode: '12-34-56',
          accountNumber: '123456123',
          destinationTag: '52',
          BIC: 'INGDESMM',
          IBAN: 'ES91 2100 0418 4502 0005 1332',
        },
        priority: 'low',
      });

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

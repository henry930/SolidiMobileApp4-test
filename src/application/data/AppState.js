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
import appTier from 'src/application/appTier';
import ImageLookup from 'src/images';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('AppState');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);

// Shortcuts
let jd = JSON.stringify;

// Settings
let initialMainPanelState = 'Buy';
let initialPageName = 'default';
let domains = {
  dev: 't3.solidi.co',
  stag: 't10.solidi.co',
  prod: 'solidi.co',
}
if (! _.has(domains, appTier)) throw new Error(`Unrecognised app tier: ${appTier}`);
let domain = domains[appTier];
log(`domain: ${domain}`);
let appName = 'SolidiMobileApp';
let appAPIVersion = '1';
let autoLoginOnDevAndStag = false;
let autoLoginCredentials = {
  email: 'johnqfish@foo.com',
  password: 'bigFish6',
}

// Load access information for dev tier.
let basicAuthTiers = 'dev stag'.split(' ');
let devBasicAuth = (basicAuthTiers.includes(appTier)) ? require('src/access/values/devBasicAuth').default : require('src/access/empty/devBasicAuth').default;

// Keychain storage keys.
// - We use multiple aspects of the app in the key so that there's no risk of a test version of the app interacting with the storage of the production version.
let loginCredentialsStorageKey = `LOGIN_${appTier}_${appName}_${domain}`;
let pinStorageKey = `PIN_${appTier}_${appName}_${domain}`;




let AppStateContext = React.createContext();




class AppStateProvider extends Component {


  constructor(props) {
    super(props);


    // Can set this initial state for testing.
    this.initialMainPanelState = initialMainPanelState;
    this.initialPageName = initialPageName;

    // Misc
    this.numberOfFooterButtonsToDisplay = 3;
    //this.standardPaddingTop = scaledHeight(80); // future ?
    //this.standardPaddingHorizontal = scaledWidth(15); // future ?

    // nonHistoryPanels are not stored in the stateHistoryList.
    // Pressing the Back button will not lead to them.
    this.nonHistoryPanels = `
Authenticate Login PIN
`.replace(/\n/g, ' ').trim().replace(/ {2,}/g, ' ').split(' ');


    // Shortcut function for changing the mainPanelState.
    this.changeState = (stateName, pageName) => {
      if (! mainPanelStates.includes(stateName)) {
        throw Error(`Unrecognised stateName: ${JSON.stringify(stateName)}`);
      }
      this.state.setMainPanelState({mainPanelState: stateName, pageName});
    }


    // Function for changing the mainPanelState.
    this.setMainPanelState = (newState, stashed=false) => {
      let msg = `Set state to: ${JSON.stringify(newState)}.`;
      let logEntireStateHistory = false;
      if (logEntireStateHistory) {
        msg += '\nState history (most recent at the top):';
        let n = this.state.stateHistoryList.length;
        for (let i=n-1; i>=0; i--) {
          let entry = this.state.stateHistoryList[i];
          msg += `\n- ${jd(entry)}`;
        }
        log(msg);
      }
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
      let stateHistoryList = this.state.stateHistoryList;
      /* Check the current state.
      - If the current state has just ended a user journey, we want to erase the state history, and start over.
      */
      let currentState = stateHistoryList[stateHistoryList.length - 1];
      let endJourneyList = `
PurchaseSuccessful PaymentNotMade SaleSuccessful SendSuccessful
`.replace(/\n/g, ' ').trim().replace(/ {2,}/g, ' ').split(' ');
      if (! _.isEmpty(currentState)) {
        // currentState can be empty if we're testing and start on the Login page, which is not saved into the stateHistoryList.
        if (endJourneyList.includes(currentState.mainPanelState)) {
          this.resetStateHistory();
        }
      }
      stateHistoryList = this.state.stateHistoryList; // Reload variable.
      /*
      If this is a new state, add an entry to the state history,
      unless it's a state we don't care about: e.g. PIN.
      A state history entry consists of:
      - mainPanelState
      - pageName
      Don't store a reloaded stashed state in the history list.
      */
      let storeHistoryState = (! stashed && ! this.nonHistoryPanels.includes(mainPanelState));
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
          return this.state.authenticateUser();
        }
      }
      // Finally, change to new state.
      if (makeFinalSwitch) {
        let stateChangeID = this.state.stateChangeID + 1;
        log(`New stateChangeID: ${stateChangeID} (mainPanelState = ${mainPanelState})`);
        this.setState({mainPanelState, pageName, stateChangeID});
      }
    }


    this.stateChangeIDHasChanged = (stateChangeID, mainPanelState) => {
      let stateChangeID2 = this.state.stateChangeID;
      let location = mainPanelState ? mainPanelState + ': ' : '';
      if (stateChangeID !== stateChangeID2) {
        log(`${location}stateChangeID is no longer ${stateChangeID}. It is now ${stateChangeID2}.`);
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
      let msg = `Stashing state: ${JSON.stringify(stateX)}`;
      log(msg);
      this.state.stashedState = stateX;
    }


    this.loadStashedState = () => {
      // If there's no stashed state, don't do anything.
      if (_.isEmpty(this.state.stashedState)) return;
      let msg = `Loading stashed state: ${JSON.stringify(this.state.stashedState)}`;
      log(msg);
      let stashed = true;
      this.state.setMainPanelState(this.state.stashedState, stashed);
    }


    this.resetStateHistory = () => {
      this.state.stateHistoryList = [];
      if (! this.nonHistoryPanels.includes(this.initialMainPanelState)) {
        this.state.stateHistoryList = [{
          mainPanelState: this.initialMainPanelState,
          pageName: this.initialPageName,
        }];
      }
      let msg = `Reset state history to: ${jd(this.state.stateHistoryList)}`;
      log(msg);
    }


    this.decrementStateHistory = () => {
      let stateHistoryList = this.state.stateHistoryList;
      if (stateHistoryList.length == 1) {
        // No previous state.
        return;
      }
      this.cancelTimers();
      this.abortAllRequests();
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
        let stateChangeID = this.state.stateChangeID + 1;
        log(`New stateChangeID: ${stateChangeID} (mainPanelState = ${mainPanelState})`);
        this.setState({mainPanelState, pageName, stateChangeID});
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


    this.generalSetup = async () => {
      // Create public API client.
      if (! this.state.apiClient) {
        let {userAgent, domain} = this.state;
        this.state.apiClient = new SolidiRestAPIClientLibrary({userAgent, apiKey:'', apiSecret:'', domain});
      }
      // Load public info that rarely changes.
      if (! this.state.apiVersionLoaded) {
        await this.state.loadLatestAPIVersion();
        this.state.apiVersionLoaded = true;
      }
      if (! this.state.assetsInfoLoaded) {
        await this.state.loadAssetsInfo();
        this.state.assetsInfoLoaded = true;
      }
      if (! this.state.marketsLoaded) {
        await this.state.loadMarkets();
        this.state.marketsLoaded = true;
      }
      if (! this.state.assetIconsLoaded) {
        await this.state.loadAssetIcons();
        this.state.assetIconsLoaded = true;
      }
      // Login to a specific user if we're developing.
      if (basicAuthTiers.includes(this.state.appTier) && autoLoginOnDevAndStag) {
        await this.state.login({
          email: autoLoginCredentials['email'],
          password: autoLoginCredentials['password']
        });
      }
    }


    this.login = async ({email, password}) => {
      if (this.state.user.isAuthenticated) return;
      // Create public API client.
      let {userAgent, domain} = this.state;
      let apiClient = new SolidiRestAPIClientLibrary({userAgent, apiKey:'', apiSecret:'', domain});
      // Use the email and password to load the API Key and Secret from the server.
      let apiRoute = 'login_mobile' + `/${email}`;
      let params = {password};
      let abortController = this.state.createAbortController();
      let data = await apiClient.publicMethod({httpMethod: 'POST', apiRoute, params, abortController});
      let keyNames = 'apiKey, apiSecret'.split(', ');
      // Future: if error is "cannot_parse_data", return a different error.
      if (! misc.hasExactKeys('data', data, keyNames, 'submitLoginRequest')) {
        throw Error('Invalid username or password.');
      }
      let {apiKey, apiSecret} = data;
      // Store these access values in the global state.
      _.assign(apiClient, {apiKey, apiSecret});
      this.state.apiClient = apiClient;
      this.state.user.isAuthenticated = true;
      _.assign(this.state.user, {email, password});
      // Store the email and password in the secure keychain storage.
      await Keychain.setInternetCredentials(this.state.loginCredentialsStorageKey, email, password);
      let msg = `loginCredentials (email=${email}, password=${password}) stored in keychain with key = '${this.state.loginCredentialsStorageKey}')`;
      log(msg);
      // Load user stuff.
      await this.state.loadInitialStuffAboutUser();
    }


    this.createAbortController = (params) => {
      // Prepare for cancelling requests if the user changes screen.
      // Note: Some API requests should not be aborted if we change screen, so we have an optional noAbort parameter.
      if (_.isNil(params)) params = {};
      let {tag, noAbort} = params;
      let controller = new AbortController();
      controller.tag = tag;
      if (noAbort) return controller;
      // Get a random integer from 0 to 999999.
      do { var controllerID = Math.floor(Math.random() * 10**6);
      } while (_.keys(this.state.abortControllers).includes(controllerID));
      this.state.abortControllers[controllerID] = controller;
      return controller;
    }


    this.abortAllRequests = (params) => {
      if (_.isNil(params)) params = {};
      let {tag} = params;
      // If tag is supplied, only abort requests with this tag value.
      let controllers = this.state.abortControllers;
      //log({controllers})
      // Remove any previously aborted controllers.
      let activeControllers = _.entries(controllers).filter(([key, value]) => value !== 'aborted');
      controllers = _.fromPairs(activeControllers);
      // Abort any active controllers.
      for (let [controllerID, controller] of _.entries(controllers)) {
        if (controller !== 'aborted') {
          if (tag && controller.tag !== tag) continue;
          controller.abort();
        }
        controllers[controllerID] = 'aborted';
        log(`Aborted controller ${controllerID}`);
      }
      // Future problem: If the user switches back and forth between screens fast enough, it's perhaps possible that the reassignment here of the altered controllers object to the appState will not include some new requests.
      this.state.abortControllers = controllers;
    }


    // Note: publicMethod and privateMethod have to be kept in sync.
    // Future: Perhaps they could be refactored into a single function with two wrapper functions.

    this.publicMethod = async (args) => {
      let {functionName, httpMethod, apiRoute, params, keyNames, noAbort} = args;
      if (_.isNil(functionName)) functionName = '[Unspecified function]';
      if (_.isNil(httpMethod)) httpMethod = 'POST';
      if (_.isNil(apiRoute)) throw new Error('apiRoute required');
      if (_.isNil(params)) params = {};
      if (_.isNil(keyNames)) keyNames = [];
      if (_.isNil(noAbort)) noAbort = false;
      if (this.state.mainPanelState === 'RequestFailed') return;
      let tag = apiRoute.split('/')[0];
      let abortController = this.state.createAbortController({tag, noAbort});
      let data = await this.state.apiClient.publicMethod({httpMethod, apiRoute, params, abortController});
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
          let msg = `Error in ${functionName}: publicMethod (apiRoute=${apiRoute}, params=${misc.jd(params)}):`;
          if (! _.isString(error)) error = JSON.stringify(error);
          msg += "\nError = " + String(error);
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
        msg += ' ' + String(err);
        this.state.switchToErrorState({message:msg});
        return 'DisplayedError';
      }
      return data;
    }


    this.privateMethod = async (args) => {
      let {functionName, httpMethod, apiRoute, params, keyNames, noAbort} = args;
      if (_.isNil(functionName)) functionName = '[Unspecified function]';
      if (_.isNil(httpMethod)) httpMethod = 'POST';
      if (_.isNil(apiRoute)) throw new Error('apiRoute required');
      if (_.isNil(params)) params = {};
      if (_.isNil(keyNames)) keyNames = [];
      if (_.isNil(noAbort)) noAbort = false;
      if (this.state.mainPanelState === 'RequestFailed') return;
      let tag = apiRoute.split('/')[0];
      let abortController = this.state.createAbortController({tag, noAbort});
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
          let paramsStr = misc.jd(params);
          let paramsStr2 = paramsStr.length > 400 ? paramsStr : paramsStr.substring(1, 400) + ' ... ';
          let msg = `Error in ${functionName}.privateMethod (apiRoute=${apiRoute}, params=${paramsStr2}):`;
          if (! _.isString(error)) error = JSON.stringify(error);
          msg += ' Error = ' + String(error);
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
        msg += ' ' + String(err);
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
      // If login credentials (email and password) aren't stored in the Keychain, go to Authenticate (where the user can choose between Register and Login).
      if (! this.state.user.loginCredentialsFound) {
        if (! this.state.user.isAuthenticated) {
          return this.state.changeState('Authenticate');
        }
      }
      // If login credentials aren't present in memory, go to Login.
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
      - This is async - there will be a slight delay while the data is retrieved.
      -- However: The user would have to be very fast indeed to click Buy on the initial BUY page before this completes.
      */
      let credentials = await Keychain.getInternetCredentials(this.state.pinStorageKey);
      // Example result:
      // {"password": "1111", "server": "SolidiMobileApp", "storage": "keychain", "username": "SolidiMobileApp"}
      if (! credentials) {
        log(`No PIN found in Keychain.`);
      } else {
        let pin = credentials.password;
        this.state.user.pin = pin;
        log(`PIN loaded from Keychain: ${pin}`);
      }
    }


    this.checkForLoginCredentials = async () => {
      /*
      - We check if login credentials (email and password) are stored in the keychain.
      - We don't actually load them into the app's memory here. (We do that only once the user has entered the correct PIN value.)
      - This is async - there will be a slight delay while the data is retrieved.
      -- However: The user would have to be very fast indeed to click a button on the initial BUY page to change to a different state before this completes.
      */
      let credentials = await Keychain.getInternetCredentials(this.state.loginCredentialsStorageKey);
      // Example result:
      // {"password": "mrfishsayshelloN6", "server": "t3.solidi.co", "storage": "keychain", "username": "johnqfish@foo.com"}
      if (credentials) {
        if (_.has(credentials, 'username') && _.has(credentials, 'password')) {
          log(`Stored login credentials found in Keychain (but not loaded into memory).`);
          this.state.user.loginCredentialsFound = true;
          return;
        }
      }
      log(`No login credentials found in Keychain.`);
    }


    this.logout = async () => {
      // Note: We don't ever delete the PIN from app memory or from the keychain.
      // Delete user's email and password from memory and from keychain.
      this.state.user.email = '';
      this.state.user.password = '';
      await Keychain.resetInternetCredentials(this.state.loginCredentialsStorageKey);
      // Set user to 'not authenticated'.
      this.state.user.isAuthenticated = false;
      this.state.user.loginCredentialsFound = false;
      // Re-initialise the state history.
      this.state.resetStateHistory();
    }


    this.lockApp = () => {
      this.state.appLocked = true;
      this.cancelTimers();
      this.abortAllRequests();
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
        let timerID = this.state.panels.makePayment.timerID;
        clearInterval(timerID);
        this.state.panels.makePayment.timerID = null;
        log(`Cleared interval: makePayment (timerID=${timerID})`);
      }
      if (this.state.panels.waitingForPayment.timerID) {
        let timerID = this.state.panels.waitingForPayment.timerID;
        clearInterval(timerID);
        this.state.panels.waitingForPayment.timerID = null;
        log(`Cleared interval: waitingForPayment (timerID=${timerID})`);
      }
      if (this.state.panels.requestTimeout.timerID) {
        let timerID = this.state.panels.requestTimeout.timerID;
        clearInterval(timerID);
        this.state.panels.requestTimeout.timerID = null;
        log(`Cleared interval: requestTimeout (timerID=${timerID})`);
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
      this.cancelTimers();
      this.abortAllRequests();
      this.state.changeState('Error');
    }




    /* Public API methods */




    this.loadLatestAPIVersion = async () => {
      let data = await this.state.publicMethod({
        functionName: 'loadAPIVersion',
        apiRoute: 'api_latest_version',
        httpMethod: 'GET',
      });
      if (data == 'DisplayedError') return;
      // if (! .has(data, 'api_latest_version')) this.state.changeState('Error');
      let api_latest_version = data.api_latest_version;
      this.state.apiData.api_latest_version = api_latest_version;
      log(`Latest API version: ${api_latest_version}`);
    }


    this.checkLatestAPIVersion = () => {
      let appAPIVersion = this.state.appAPIVersion;
      let api_latest_version = this.state.apiData.api_latest_version;
      let check = api_latest_version !== appAPIVersion;
      let msg = `apiVersion in app: ${appAPIVersion}. Latest apiVersion from API data: ${api_latest_version}.`;
      //log(msg);
      return check;
    }


    this.loadAssetsInfo = async () => {
      let data = await this.state.publicMethod({
        httpMethod: 'GET',
        apiRoute: 'asset_info',
        params: {},
      });
      //log(data);
      /* Example output:
{
  "BTC": {
    "addressProperties": [
      "address"
    ],
    "confirmationsRequired": 3,
    "decimalPlaces": 8,
    "depositEnabled": 1,
    "displayString": "BTC (Bitcoin)",
    "displaySymbol": "BTC",
    "name": "Bitcoin",
    "type": "crypto",
    "withdrawEnabled": 1
  },
  "ETH": {
    "addressProperties": [
      "address"
    ],
    "confirmationsRequired": 30,
    "decimalPlaces": 18,
    "depositEnabled": 1,
    "displayString": "ETH (Ethereum)",
    "displaySymbol": "ETH",
    "name": "Ethereum",
    "type": "crypto",
    "withdrawEnabled": 1
  },
  "GBP": {
    "addressProperties": [
      "accountName",
      "sortCode",
      "accountNumber"
    ],
    "confirmationsRequired": 1,
    "decimalPlaces": 2,
    "depositEnabled": 1,
    "displayString": "GBP (UK Pound)",
    "displaySymbol": "GBP",
    "name": "UK Pound",
    "type": "fiat",
    "withdrawEnabled": 1
  },
  "LINK": {
    "addressProperties": [],
    "confirmationsRequired": 30,
    "decimalPlaces": 8,
    "depositEnabled": 0,
    "displayString": "LINK (Chainlink)",
    "displaySymbol": "LINK",
    "name": "Chainlink",
    "type": "crypto",
    "withdrawEnabled": 1
  },
  "LTC": {
    "addressProperties": [
      "address"
    ],
    "confirmationsRequired": 12,
    "decimalPlaces": 8,
    "depositEnabled": 1,
    "displayString": "LTC (Litecoin)",
    "displaySymbol": "LTC",
    "name": "Litecoin",
    "type": "crypto",
    "withdrawEnabled": 1
  },
  "XRP": {
    "addressProperties": [
      "address",
      "destinationTag"
    ],
    "confirmationsRequired": 1,
    "decimalPlaces": 6,
    "depositEnabled": 1,
    "displayString": "XRP (Ripple)",
    "displaySymbol": "XRP",
    "name": "Ripple",
    "type": "crypto",
    "withdrawEnabled": 1
  }
}
      */
      if (data == 'DisplayedError') return;
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
      if (_.isNil(asset)) { console.error('Asset required'); return; }
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
          name: 'UK Pound',
          type: 'fiat',
          decimalPlaces: 2,
          displaySymbol: 'GBP',
          displayString: 'GBP (UK Pound)',
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


    this.getAssets = (params) => {
      let depositEnabled, withdrawEnabled;
      if (params) {
        ({depositEnabled, withdrawEnabled} = params);
      }
      let assets = _.keys(this.state.apiData.asset_info).sort();
      if (depositEnabled) {
        assets = assets.filter( (x) => { return this.state.getAssetInfo(x).depositEnabled == 1 });
      }
      if (withdrawEnabled) {
        assets = assets.filter( (x) => { return this.state.getAssetInfo(x).withdrawEnabled == 1 });
      }
      return assets;
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
      let tmpData = false;
      if (tmpData) {
        data = [
          'BTC/GBP',
          'ETH/GBP',
          'BTC/EUR',
          'ETH/EUR',
        ]
      }
      // End tmp
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


    this.loadTicker = async () => {
      let data = await this.state.publicMethod({
        httpMethod: 'GET',
        apiRoute: 'ticker',
        params: {},
      });
      if (data == 'DisplayedError') return;
      /* Example data:
      {"BTC/GBP":{"price":"31712.51"},"ETH/GBP":{"price":"2324.00"},"LTC/GBP":{"price":"85.42"},"XRP/GBP":{"error":"Empty orderbook","price":null}}
      */
      /* Example error:
      {"error":"Insufficient currency"}
      */
      // Tmp: For development:
      // Sample prices.
      let tmp1 = false;
      if (tmp1) {
        data = {
          'BTC/GBP': {price: '2000.00'},
          'ETH/GBP': {price: '100.00'},
          'BTC/EUR': {price: '3000.00'},
          'ETH/EUR': {price: '150.00'},
        }
      }
      // End Tmp
      // Tmp 2: To mock price changes, decrement the price by a bit more on each load.
      let tmp2 = false;
      if (tmp2) {
        for (let market of this.state.getMarkets()) {
          if (market == 'BTC/GBP') continue;
          let [assetBA, assetQA] = market.split('/');
          let dp = this.state.getAssetInfo(assetQA).decimalPlaces;
          let price = data[market].price;
          let x = Big('1.01').mul(Big(this.state.priceLoadCount));
          let price2 = (Big(price).minus(x)).toFixed(dp);
          data[market] = price2;
        }
      }
      // End Tmp 2
      let msg = "Prices loaded from server.";
      this.state.priceLoadCount += 1;
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


    this.getTicker = () => {
      return this.state.apiData.ticker;
    }


    this.getTickerForMarket = (market) => {
      // Get the ticker price held in the appState.
      if (_.isUndefined(this.state.apiData.ticker[market])) return null;
      if (_.isUndefined(this.state.apiData.ticker[market].price)) return null;
      let price = this.state.apiData.ticker[market].price;
      return {price};
    }


    this.getPreviousTickerForMarket = (market) => {
      // Get the previous ticker price held in the appState.
      if (_.isUndefined(this.state.prevAPIData.ticker[market])) return null;
      if (_.isUndefined(this.state.prevAPIData.ticker[market].price)) return null;
      return this.state.prevAPIData.ticker[market].price;
    }


    this.setPrice = ({market, price}) => {
      // Useful during development.
      this.state.apiData.ticker[market].price = price;
    }


    this.setPrevPrice = ({market, price}) => {
      // Useful during development.
      this.state.prevAPIData.ticker[market].price = price;
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
        if (value != '[loading]') {
          //deb(`${functionName}.getFullDecimalValue: value '${value}' is not a numeric string.`);
        }
        return '';
      }
      let dp = this.state.getAssetInfo(asset).decimalPlaces;
      let value2 = Big(value).toFixed(dp);
      return value2;
    }




    /* END Public API methods */




    /* Private API methods */




    // At the top here, we store a few methods that provide public information that can cause political problems (e.g. over which options are / are not supported), so we keep them private (so that they're not publically enumerable).

    this.loadPersonalDetailOptions = async () => {
      let data = await this.state.privateMethod({
        functionName: 'loadPersonalDetailOptions',
        apiRoute: 'personal_detail_option',
      });
      if (data == 'DisplayedError') return;
      // If the data differs from existing data, save it.
      let msg = "Personal detail options loaded from server.";
      if (jd(data) === jd(this.state.apiData.personal_detail_option )) {
        log(msg + " No change.");
      } else {
        log(msg + " New data saved to appState. " + jd(data));
        this.state.apiData.personal_detail_option = data;
      }
    }


    this.getPersonalDetailOptions = (detailName) => {
      // Should contain a list of options for each detailName. (e.g. "title").
      let result = this.state.apiData.personal_detail_option;
      if (! _.has(result, detailName)) return ['[loading]'];
      return result[detailName];
    }


    this.loadAssetIcons = async () => {
      let data = await this.state.publicMethod({
        functionName: 'loadAssetIcons',
        apiRoute: 'asset_icon',
        httpMethod: 'GET',
      });
      if (data == 'DisplayedError') return;
      // The data is in base64. It turns out that an <Image/> can accept a base64 source, so need to convert it back to a bitmap.
      let loadedAssetIcons = _.keys(data);
      // If the data differs from existing data, save it.
      let msg = `Asset icons loaded from server: ${loadedAssetIcons.join(', ')}.`;
      if (jd(data) === jd(this.state.apiData.asset_icon )) {
        log(msg + " No change.");
      } else {
        log(msg + " New data saved to appState.");
        this.state.apiData.asset_icon = data;
      }
    }


    this.getAssetIcon = (asset) => {
      // This supplies a value that goes into the 'source' attribute of an <Image/> component.
      let assetIcon = null; // default - produces an blank space where the icon would normally be.
      let storedIcons = _.keys(ImageLookup);
      let loadedIcons = _.keys(this.state.apiData.asset_icon);
      if (storedIcons.includes(asset)) {
        assetIcon = ImageLookup[asset];
      } else if (loadedIcons.includes(asset)) {
        assetIcon = this.state.apiData.asset_icon[asset];
        let base64Icon = 'data:image/png;base64,' + assetIcon;
        return {uri: base64Icon};
      }
      return assetIcon;
    }




    // BEGIN actual private methods (as opposed to hidden public methods).


    // This is called immediately after a successful Login or PIN entry.
    this.loadInitialStuffAboutUser = async () => {
      await this.loadAssetsInfo(); // needed for loading deposit details & default account.
      await this.loadUserInfo();
      await this.loadDepositDetailsForAsset('GBP');
      await this.loadDefaultAccountForAsset('GBP');
    }


    this.loadUserInfo = async () => {
      /* Expected fields: (may change in future)
      uuid email firstname lastname gender dob btc_limit bank_limit crypto_limit freewithdraw address_1 address_2 address_3 address_4 postcode country citizenship mon_btc_limit mon_bank_limit mon_crypto_limit year_btc_limit year_bank_limit year_crypto_limit title mobile landline
      */
      let data = await this.state.privateMethod({
        functionName: 'loadUserInfo',
        apiRoute: 'user',
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


    this.getUserInfo = (detail) => {
      let details = this.state.user.info.user;
      if (! _.has(details, detail)) {
        return '[loading]';
      }
      return details[detail];
    }


    this.setUserInfo = ({detail, value}) => {
      this.state.user.info.user[detail] = value;
    }


    this.loadDepositDetailsForAsset = async (asset) => {
      // These are the internal Solidi addresses / accounts that we provide for each user.
      let funcName = 'loadDepositDetailsForAsset';
      if (_.isNil(asset)) { console.error(`${funcName}: Asset required`); return; }
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
        "sortCode": "040476",
        "accountNumber": "00001036",
        "accountName": "Solidi",
        "reference": "SHMPQKC"
      }
      */
     let details = data;
      // If the data differs from existing data, save it.
      let msg = `Deposit details for asset=${asset} loaded from server.`;
      if (jd(details) === jd(this.state.user.info.depositDetails[asset])) {
        log(msg + " No change.");
      } else {
        log(msg + " New data saved to appState. " + jd(details));
        this.state.user.info.depositDetails[asset] = details;
      }
    }


    this.getDepositDetailsForAsset = (asset) => {
      let funcName = 'getDepositDetailsForAsset';
      if (_.isNil(asset)) { console.error(`${funcName}: Asset required`); return; }
      let assets = this.state.getAssets();
      if (! assets.includes(asset)) { return '[loading]'; }
      if (_.isUndefined(this.state.user.info.depositDetails)) return '[loading]';
      if (_.isUndefined(this.state.user.info.depositDetails[asset])) return '[loading]';
      let addressProperties = this.state.user.info.depositDetails[asset];
      return addressProperties;
    }


    this.loadDefaultAccountForAsset = async (asset) => {
      // These are default accounts for withdrawals. They should be external addresses / accounts held by the user.
      // We use these when the user sells an asset - they may choose to receive the payment into this account.
      let funcName = 'loadDefaultAccountForAsset';
      if (_.isNil(asset)) { console.error(`${funcName}: Asset required`); return; }
      let assets = this.state.getAssets();
      if (! assets.includes(asset)) { console.log(`${funcName}: ERROR: Unrecognised asset: ${asset}`); return; }
      let data = await this.state.privateMethod({
        functionName: 'loadDefaultAccountForAsset',
        apiRoute: `default_account/${asset}`,
      });
      if (data == 'DisplayedError') return;
      // Example result for GBP:
      /*
      {"accountName":"Mr John Q Fish, Esq","sortCode":"83-44-05","accountNumber":"55566677"}
      */
      // If the data differs from existing data, save it.
      let account = data;
      let msg = `Default account for asset=${asset} loaded from server.`;
      if (jd(account) === jd(this.state.user.info.defaultAccount[asset])) {
        log(msg + " No change.");
      } else {
        log(msg + " New data saved to appState. " + jd(account));
        this.state.user.info.defaultAccount[asset] = account;
      }
    }


    this.getDefaultAccountForAsset = (asset) => {
      let funcName = 'getDefaultAccountForAsset';
      if (_.isNil(asset)) { console.error(`${funcName}: Asset required`); return; }
      let assets = this.state.getAssets();
      if (! assets.includes(asset)) { return '[loading]'; }
      if (_.isUndefined(this.state.user.info.defaultAccount)) return '[loading]';
      if (_.isUndefined(this.state.user.info.defaultAccount[asset])) return '[loading]';
      let account = this.state.user.info.defaultAccount[asset];
      return account;
    }


    this.updateDefaultAccountForAsset = async (asset, params) => {
      let funcName = 'updateDefaultAccountForAsset';
      if (_.isNil(asset)) { console.error(`${funcName}: Asset required`); return; }
      let assets = this.state.getAssets();
      if (! assets.includes(asset)) { console.log(`${funcName}: ERROR: Unrecognised asset: ${asset}`); return; }
      let data = await this.state.privateMethod({
        apiRoute: `default_account/${asset}/update`,
        params,
        functionName: funcName,
      });
      if (data == 'DisplayedError') return;
      if (data.result == 'success') {
        let msg = `Updated ${asset} default account with parameters = ${params}`;
        log(msg);
        // Save data in local storage.
        this.state.user.info.defaultAccount[asset] = params;
      }
      if (_.has(data, 'error')) {
        let msg = `Error returned from API request: ${JSON.stringify(data.error)}`;
        logger.error(msg);
      }
      return data;
    }


    this.loadBalances = async () => {
      let data = await this.state.privateMethod({apiRoute: 'balance'});
      if (data == 'DisplayedError') return;
      let msg = "User balances loaded from server.";
      if (jd(data) === jd(this.state.apiData.balance)) {
        log(msg + " No change.");
      } else {
        log(msg + " New data saved to appState." + " " + jd(data));
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


    this.fetchPricesForASpecificVolume = async (params) => {
      /* Notes:
      - This function is complicated to use.
      - The prices may differ depending on the payment method.
      - A "price" is actually the volume of the asset on the other side of the transaction.
      - Scenarios:
      1) Available prices (in quoteAsset) for a specific volume of baseAsset that you want to buy.
      2) Available prices (in quoteAsset) for a specific volume of baseAsset that you want to sell.
      3) Available prices (in baseAsset) for a specific volume of quoteAsset for which you will sell baseAsset.
      4) Available prices (in baseAsset) for a specific volume of quoteAsset with which you will buy baseAsset.
      - Price values do not include fees. Fee values are included separately.
      */
      let funcName = 'fetchPricesForASpecificVolume'
      let {market, side, baseOrQuoteAsset, baseAssetVolume, quoteAssetVolume} = params;
      if (_.isNil(market)) { console.error(`${funcName}: market required`); return; }
      if (_.isNil(side)) { console.error(`${funcName}: side required`); return; }
      if (_.isNil(baseOrQuoteAsset)) { console.error(`${funcName}: baseOrQuoteAsset required`); return; }
      if (_.isNil(baseAssetVolume) && _.isNil(quoteAssetVolume)) {
        console.error(`${funcName}: One of [baseAssetVolume, quoteAssetVolume] is required`);
        return;
      }
      let data = await this.state.privateMethod({
        apiRoute: 'volume_price/' + market,
        params,
        functionName: funcName,
      });
      lj({params});
      if (data == 'DisplayedError') return 'DisplayedError';
      /* Example output:
[
  {
    "baseAssetVolume": "1.00000000",
    "feeVolume": "0.00",
    "market": "BTC/GBP",
    "paymentMethod": "solidi",
    "quoteAssetVolume": "24614.32"
  },
  {
    "baseAssetVolume": "1.00000000",
    "feeVolume": "0.00",
    "market": "BTC/GBP",
    "paymentMethod": "balance",
    "quoteAssetVolume": "24614.32"
  }
]
      */
     return data;
    }


    this.fetchBestPriceForASpecificVolume = async (params) => {
      let funcName = 'fetchBestPriceForASpecificVolume';
      let {market, side, baseOrQuoteAsset, baseAssetVolume, quoteAssetVolume} = params;
      if (_.isNil(market)) { console.error(`${funcName}: market required`); return; }
      if (_.isNil(side)) { console.error(`${funcName}: side required`); return; }
      if (_.isNil(baseOrQuoteAsset)) { console.error(`${funcName}: baseOrQuoteAsset required`); return; }
      if (baseOrQuoteAsset == 'base') {
        if (_.isNil(baseAssetVolume)) { console.error(`${funcName}: baseAssetVolume required`); return; }
      } else {
        if (_.isNil(quoteAssetVolume)) { console.error(`${funcName}: quoteAssetVolume required`); return; }
      }
      // The Buy page is accessible immediately without the user having logged in.
      // With a non-authenticated user, we call the public GET endpoint.
      let data;
      if (! this.state.user.isAuthenticated && this.state.mainPanelState == 'Buy') {
        let assetVolume = (baseOrQuoteAsset == 'base') ? baseAssetVolume : quoteAssetVolume;
        let argString = '/' + side + '/' + baseOrQuoteAsset + '/' + assetVolume;
        data = await this.state.publicMethod({
          httpMethod: 'GET',
          apiRoute: 'best_volume_price/' + market + argString,
          functionName: funcName,
        });
      } else {
        data = await this.state.privateMethod({
          apiRoute: 'best_volume_price/' + market,
          params,
          functionName: funcName,
        });
      }
      //lj(params);
      if (data == 'DisplayedError') return 'DisplayedError';
      /* Example output:
      {"price":"24528.64"} (For side='BUY', baseAssetVolume: '1', baseOrQuoteAsset: 'base')
      {"price":"24506.44"} (For side='SELL', baseAssetVolume: '1', baseOrQuoteAsset: 'base')
      */
      return data;
    }


    this.fetchOrderStatus = async ({orderID}) => {
      // "fetch" means "load from API & get value".
      let data = await this.state.privateMethod({
        httpMethod: 'POST',
        apiRoute: 'order_status/' + orderID,
        params: {},
        functionName: 'fetchOrderStatus',
      });
      if (data == 'DisplayedError') return;
      //log(data);
      /* Example result:
{
  "id": 7198,
  "status": "FILLED"
}
      */
      // Possible status values: FILLED, SETTLED, CANCELLED
      let orderStatus = data.status;
      let knownStatuses = 'FILLED, SETTLED, CANCELLED'.split(', ');
      if (! misc.itemInArray('knownStatuses', knownStatuses, orderStatus, 'fetchOrderStatus')) {
        // Future: go to error page?
      }
      return orderStatus;
    }


    this.sendBuyOrder = async (buyOrder) => {
      if (! this.state.panels.buy.activeOrder) {
        //log('No active BUY order. Leaving sendBuyOrder.');
        return {result: 'NO_ACTIVE_ORDER'};
      }
      // Ensure that this order only gets processed once.
      this.state.panels.buy.activeOrder = false;
      // Unpack and save the order.
      let {volumeQA, volumeBA, assetQA, assetBA, paymentMethod} = buyOrder;
      _.assign(this.state.panels.buy, {volumeQA, assetQA, volumeBA, assetBA});
      let market = assetBA + '/' + assetQA;
      let orderType = 'IMMEDIATE_OR_CANCEL';
      let msg = `Send order to server: [${market}] BUY ${volumeBA} ${assetBA} for ${volumeQA} ${assetQA} - ${orderType}`;
      log(msg);
      let data = await this.state.privateMethod({
        httpMethod: 'POST',
        apiRoute: 'buy',
        params: {
          market,
          baseAssetVolume: volumeBA,
          quoteAssetVolume: volumeQA,
          orderType,
          paymentMethod,
        },
        functionName: 'sendBuyOrder',
      });
      if (data == 'DisplayedError') return;
      //log(data)
      /*
      Example result:
{
  "baseAssetVolume": "0.00037974",
  "fees": "0.00",
  "market": "BTC/GBP",
  "orderID": 7189,
  "quoteAssetVolume": "10.00000000",
  "result": "FILLED",
  "settlements": [
    {
      "settlementID": 15,
      "settlementReference": "CJDUQ6M",
      "status": "N"
    }
  ]
}

      Example result if the price has changed:
{
  "baseAssetVolume": "0.00036922",
  "market": "BTC/GBP",
  "quoteAssetVolume": "11.00",
  "result": "PRICE_CHANGE"
}

      Example result if the order has exceeded the user's volume limits:
{
  "asset": "GBP",
  "periodDays": 1,
  "result": "EXCEEDS_LIMITS",
  "volumeLimit": "30.00",
  "volumeRemaining": "0.00"
}

      Example result if the address check failed during registration:
{
  "result": "error",
  "details": "ID required",
  "tradeids": []
}

      */
      // Store the orderID.
      if (data.orderID) {
        log(`BUY orderID: ${data.orderID}`);
        this.state.panels.buy.orderID = data.orderID;
      }
      // Currently, in several different pages, we assume that the fee returned by the API during the buy process was the fee that was actually applied when the order went through the trade engine.
      // Future: Get fees from data, calculate total, store fees & total in panels.buy.
      return data;
    }


    this.confirmPaymentOfBuyOrder = async (params) => {
      let {orderID} = params;
      let data = await this.state.privateMethod({apiRoute: `order/${orderID}/user_has_paid`});
      /* Example response:
{"result":"success"}
      */
    }


    this.sendSellOrder = async (sellOrder) => {
      if (! this.state.panels.sell.activeOrder) {
        log('No active SELL order. Leaving sendSellOrder.');
        return {result: 'NO_ACTIVE_ORDER'};
      }
      // Ensure that this order only gets processed once.
      this.state.panels.sell.activeOrder = false;
      // Unpack and save the order.
      let {volumeQA, volumeBA, assetQA, assetBA, paymentMethod} = sellOrder;
      _.assign(this.state.panels.sell, {volumeQA, assetQA, volumeBA, assetBA});
      let market = assetBA + '/' + assetQA;
      let orderType = 'IMMEDIATE_OR_CANCEL';
      let msg = `Send order to server: [${market}] SELL ${volumeBA} ${assetBA} for ${volumeQA} ${assetQA} - ${orderType}`;
      log(msg);
      let data = await this.state.privateMethod({
        httpMethod: 'POST',
        apiRoute: 'sell',
        params: {
          market,
          baseAssetVolume: volumeBA,
          quoteAssetVolume: volumeQA,
          orderType,
          paymentMethod,
        },
        functionName: 'sendSellOrder',
      });
      if (data == 'DisplayedError') return;
      //log(data)
      /*
      Example result:
{
  "baseAssetVolume": "0.00059570",
  "fees": "0.00",
  "market": "BTC/GBP",
  "orderID": 7151,
  "quoteAssetVolume": "10.00000000",
  "result": "FILLED",
  "settlements": [
    {
      "settlementID": 8232,
      "settlementReference": "CD2C2HF",
      "status": "R"
    }
  ]
}
      */
      // Store the orderID.
      if (data.orderID) {
        log(`OrderID: ${data.orderID}`);
        this.state.panels.sell.orderID = data.id;
      }
      return data;
    }


    this.loadFees = async () => {
      // For now, we only load withdrawal fees.
      let data = await this.state.privateMethod({apiRoute:'fee'});
      if (data == 'DisplayedError') return;
      /* Example data:
      {
        "GBP": {
          "withdraw": {
            "highFee": "0.50000000",
            "lowFee": "0.50000000",
            "mediumFee": "0.50000000"
          }
        }
      }
      */
      // Data also contains 'GBPX', which we ignore.
      // Restructure data.
      let withdrawFees = {};
      for (let [asset, fees] of _.entries(data)) {
        withdrawFees[asset] = {
          low: fees.withdraw.lowFee,
          medium: fees.withdraw.mediumFee,
          high: fees.withdraw.highFee,
        }
      }
      let msg = "Withdrawal fee data loaded from server.";
      if (jd(withdrawFees) === jd(this.state.fees.withdraw)) {
        log(msg + " No change.");
      } else {
        msg += " New data saved to appState.";
        //msg += " " + jd(withdrawFees);
        log(msg);
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


    this.loadOrders = async () => {
      let data = await this.state.privateMethod({apiRoute: 'order'});
      if (data == 'DisplayedError') return;
      /* Example data:
      [
        {"age":"5172699","baseVolume":"0.05000000","date":"14 Feb 2022","id":31,"market":"BTC/GBPX","quoteVolume":"100.00000000","settlement1Id":null,"settlement1Status":null,"settlement2Id":null,"settlement2Status":null,"side":"Buy","status":"LIVE","time":"17:34:42","type":"Limit"}
      ]
      */
      let msg = "Orders loaded from server.";
      if (jd(data) === jd(this.state.apiData.order)) {
        log(msg + " No change.");
      } else {
        log(msg + " New data saved to appState.");
        this.state.apiData.order = data;
      }
      return data;
    }


    this.getOrders = () => {
      return this.state.apiData.order;
    }


    this.loadTransactions = async () => {
      let data = await this.state.privateMethod({apiRoute: 'transaction'});
      if (data == 'DisplayedError') return;
      /* Example data:
      [
        {"baseAsset":"BTC","baseAssetVolume":"0.01000000","code":"PI","date":"23 Jan 2014","description":"Transfer In","fee":"0.00000000","feeAsset":"","id":1,"market":1,"quoteAsset":"","quoteAssetVolume":"0.00000000","reference":"07098f0b37472517eae73edd6ab41d14d8463a5fce9a081a3a364d1cccc9ec43","status":"A","time":"18:12"}
      ]
      */
      let msg = "Transactions loaded from server.";
      if (jd(data) === jd(this.state.apiData.transaction)) {
        log(msg + " No change.");
      } else {
        log(msg + " New data saved to appState.");
        this.state.apiData.transaction = data;
      }
      return data;
    }


    this.getTransactions = () => {
      return this.state.apiData.transaction;
    }


    this.fetchIdentityVerificationDetails = async () => {
      // "fetch" means "load from API & get value".
      let data = await this.state.privateMethod({
        httpMethod: 'POST',
        apiRoute: 'identity_verification_details',
        params: {},
        functionName: 'fetchIdentityVerificationDetails',
      });
      if (data == 'DisplayedError') return;
      //log(data);
      /* Example result:
{
  "addressDocument": null,
  "addressDocumentType": null,
  "identityDocument": null,
  "identityDocumentType": null
}
      */
      // Possible status values:
      //let userStatus = data.status;

      /*
      let knownStatuses = 'FILLED, SETTLED, CANCELLED'.split(', ');
      if (! misc.itemInArray('knownStatuses', knownStatuses, orderStatus, 'fetchOrderStatus')) {
        // Future: go to error page?
      }
      */
      return data;
    }


    this.uploadDocument = async (params) => {
      let {documentType, documentCategory, fileData, fileExtension} = params;
      let noAbort = true;
      let data = await this.state.privateMethod({
        apiRoute: `private_upload/document/${documentType}`,
        params: {
          documentCategory,
          fileData,
          fileExtension,
        },
        functionName: 'uploadDocument',
        noAbort,
      });
      lj(data);
      /* Example response:
{"result":"success"}
      */
      return data;
    }


    this.resetPassword = async (params) => {
      let {email} = params;
      let noAbort = true;
      let data = await this.state.publicMethod({
        httpMethod: 'GET',
        apiRoute: `password_reset/${email}`,
        functionName: 'resetPassword',
        noAbort,
      });
      //lj(data);
      /* Example response:
{"result":"success"}
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
      resetStateHistory: this.resetStateHistory,
      decrementStateHistory: this.decrementStateHistory,
      footerIndex: 0,
      setFooterIndex: this.setFooterIndex,
      generalSetup: this.generalSetup,
      login: this.login,
      createAbortController: this.createAbortController,
      abortAllRequests: this.abortAllRequests,
      publicMethod: this.publicMethod,
      privateMethod: this.privateMethod,
      setAPIData: this.setAPIData,
      authenticateUser: this.authenticateUser,
      deletePIN: this.deletePIN,
      choosePIN: this.choosePIN,
      loadPIN: this.loadPIN,
      checkForLoginCredentials: this.checkForLoginCredentials,
      logout: this.logout,
      lockApp: this.lockApp,
      resetLockAppTimer: this.resetLockAppTimer,
      cancelTimers: this.cancelTimers,
      switchToErrorState: this.switchToErrorState,
      /* Public API methods */
      loadLatestAPIVersion: this.loadLatestAPIVersion,
      checkLatestAPIVersion: this.checkLatestAPIVersion,
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
      loadTicker: this.loadTicker,
      getTicker: this.getTicker,
      getTickerForMarket: this.getTickerForMarket,
      getPreviousTickerForMarket: this.getPreviousTickerForMarket,
      setPrice: this.setPrice,
      setPrevPrice: this.setPrevPrice,
      getZeroValue: this.getZeroValue,
      getFullDecimalValue: this.getFullDecimalValue,
      /* END Public API methods */
      /* Private API methods */
      loadPersonalDetailOptions: this.loadPersonalDetailOptions,
      getPersonalDetailOptions: this.getPersonalDetailOptions,
      loadAssetIcons: this.loadAssetIcons,
      getAssetIcon: this.getAssetIcon,
      loadInitialStuffAboutUser: this.loadInitialStuffAboutUser,
      loadUserInfo: this.loadUserInfo,
      getUserInfo: this.getUserInfo,
      setUserInfo: this.setUserInfo,
      loadDepositDetailsForAsset: this.loadDepositDetailsForAsset,
      getDepositDetailsForAsset: this.getDepositDetailsForAsset,
      loadDefaultAccountForAsset: this.loadDefaultAccountForAsset,
      getDefaultAccountForAsset: this.getDefaultAccountForAsset,
      updateDefaultAccountForAsset: this.updateDefaultAccountForAsset,
      loadBalances: this.loadBalances,
      getBalance: this.getBalance,
      fetchPricesForASpecificVolume: this.fetchPricesForASpecificVolume,
      fetchBestPriceForASpecificVolume: this.fetchBestPriceForASpecificVolume,
      fetchOrderStatus: this.fetchOrderStatus,
      sendBuyOrder: this.sendBuyOrder,
      confirmPaymentOfBuyOrder: this.confirmPaymentOfBuyOrder,
      sendSellOrder: this.sendSellOrder,
      loadFees: this.loadFees,
      getFee: this.getFee,
      sendWithdraw: this.sendWithdraw,
      loadOrders: this.loadOrders,
      getOrders: this.getOrders,
      loadTransactions: this.loadTransactions,
      getTransactions: this.getTransactions,
      fetchIdentityVerificationDetails: this.fetchIdentityVerificationDetails,
      uploadDocument: this.uploadDocument,
      resetPassword: this.resetPassword,
      /* END Private API methods */
      stateChangeID: 0,
      abortControllers: {},
      appLocked: false,
      // In apiData, we store unmodified data retrieved from the API.
      // Each sub-object corresponds to a different API route, and should have the same name as that route.
      // Note: Need to be careful about which are arrays and which are objects with keyed values.
      apiData: {
        api_latest_version: null,
        asset_icon: {},
        balance: {},
        country: [],
        market: [],
        order: [],
        personal_detail_option: {},
        ticker: {},
        transaction: [],
      },
      prevAPIData: {
        ticker: {},
      },
      priceLoadCount: 0,
      domain,
      appName,
      appTier,
      appAPIVersion,
      basicAuthTiers,
      devBasicAuth,
      loginCredentialsStorageKey,
      pinStorageKey,
      userAgent: "Solidi Mobile App 4",
      apiVersionLoaded: false,
      assetsInfoLoaded: false,
      marketsLoaded: false,
      assetsIconsLoaded: false,
      user: {
        isAuthenticated: false,
        email: '',
        password: '',
        pin: '',
        loginCredentialsFound: false,
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
      },
      authRequired: [
        'Assets',
        'BankAccounts',
        'ChooseHowToPay',
        'ChooseHowToReceivePayment',
        'History',
        'InsufficientBalance',
        'MakePayment',
        'PaymentNotMade',
        'PersonalDetails',
        'PurchaseSuccessful',
        'Receive',
        'SaleSuccessful',
        'Security',
        'Sell',
        'Send',
        'SendSuccessful',
        'Settings',
        'WaitingForPayment',
      ],
      apiClient: null,
      lockAppTimerID: null,
      panels: {
        buy: {
          activeOrder: false,
          orderID: null,
          volumeQA: '0',
          symbolQA: '',
          volumeBA: '0',
          symbolBA: '',
          feeQA: '',
          totalQA: '0',
          output: null,
        },
        sell: {
          activeOrder: false,
          orderID: null,
          volumeQA: '0',
          symbolQA: '',
          volumeBA: '0',
          symbolBA: '',
          feeQA: '0',
          totalQA: '0',
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
        identityVerification: {
          photo1: null,
          photo2: null,
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

    // Call initial setup functions.

    // Initialise the state history.
    this.resetStateHistory();

    // Load data from keychain.
    this.loadPIN();
    this.checkForLoginCredentials();

    // Start the lock-app timer.
    this.resetLockAppTimer();


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

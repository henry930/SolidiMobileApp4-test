// Goal: Store the current state of the app in a Context.


/*
- The MainPanel state
- The history stack of previous MainPanel states
*/
//var pkg = require('../../../package.json');
import { version, buildNumber } from "../../../package.json"
let appVersion = version;
let appBuildNumber = buildNumber;

import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Header, MainPanel, Footer } from 'src/application/SolidiMobileApp/components';
import { Maintenance } from 'src/application/SolidiMobileApp/components/MainPanel/components';
import { UpdateApp } from 'src/application/SolidiMobileApp/components/MainPanel/components';

// React imports
import React, { Component, useContext } from 'react';
import { Platform, BackHandler } from 'react-native';
import SafeBackHandler from 'src/util/SafeBackHandler';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import * as Keychain from 'react-native-keychain'; // Temporarily disabled to prevent NativeEventEmitter crashes

// Mock Keychain to prevent crashes while maintaining app functionality
const Keychain = {
  getInternetCredentials: async (key) => {
    console.log(`[MockKeychain] getInternetCredentials called for key: ${key}`);
    try {
      const stored = await AsyncStorage.getItem(`keychain_${key}`);
      if (stored) {
        const { username, password } = JSON.parse(stored);
        console.log(`[MockKeychain] Found stored credentials for key: ${key}`);
        return { username, password };
      }
    } catch (error) {
      console.log(`[MockKeychain] Error retrieving credentials:`, error);
    }
    return { username: false, password: false };
  },
  setInternetCredentials: async (key, username, password) => {
    console.log(`[MockKeychain] setInternetCredentials called for key: ${key}`);
    try {
      await AsyncStorage.setItem(`keychain_${key}`, JSON.stringify({ username, password }));
      console.log(`[MockKeychain] Successfully stored credentials for key: ${key}`);
    } catch (error) {
      console.log(`[MockKeychain] Error storing credentials:`, error);
    }
    return Promise.resolve();
  },
  resetInternetCredentials: async (key) => {
    console.log(`[MockKeychain] resetInternetCredentials called for key: ${key}`);
    try {
      await AsyncStorage.removeItem(`keychain_${key}`);
      console.log(`[MockKeychain] Successfully removed credentials for key: ${key}`);
    } catch (error) {
      console.log(`[MockKeychain] Error removing credentials:`, error);
    }
    return Promise.resolve();
  }
};

// Mock deleteUserPinCode function to prevent crashes
const deleteUserPinCode = async (appName) => {
  console.log(`[MockPinCode] deleteUserPinCode called for app: ${appName}`);
  return Promise.resolve();
};
// import {deleteUserPinCode} from '@haskkor/react-native-pincode'; // Temporarily disabled to prevent NativeEventEmitter crashes
import { getIpAddressesForHostname } from 'react-native-dns-lookup';

// Other imports
import _ from 'lodash';
import Big from 'big.js';
import semver from 'semver';

// Internal imports
import { mainPanelStates, footerButtonList, colors } from 'src/constants';
import SolidiRestAPIClientLibrary from 'src/api/SolidiRestAPIClientLibrary';
import CoinGeckoAPI from 'src/api/CoinGeckoAPI';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import misc from 'src/util/misc';
import ImageLookup from 'src/images';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('AppState');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);

// ===== BASIC CONSOLE TEST =====
console.log('🎯 APPSTATE.JS LOADED - CONSOLE LOGGING IS WORKING! 🎯');
// ===== BASIC CONSOLE TEST END =====

// ===== GLOBAL ERROR HANDLERS FOR TESTFLIGHT DEBUGGING =====
let crashLogs = [];
let emergencyMode = false;

// Store reference to original console.error before we override it
const originalConsoleError = console.error;

// Store crash logs locally
const storeCrashLog = (error, context) => {
  const crashLog = {
    timestamp: new Date().toISOString(),
    error: error.message || String(error),
    stack: error.stack || 'No stack trace',
    context: context || 'Unknown',
    platform: Platform.OS,
    appVersion: '1.2.0',
    buildNumber: '33'
  };
  
  crashLogs.push(crashLog);
  // Use original console.error to prevent infinite loop
  originalConsoleError(`🚨 [CRASH LOG ${crashLogs.length}] ${context}:`, error);
  originalConsoleError(`🚨 [CRASH LOG ${crashLogs.length}] Stack:`, error.stack);
  
  // Try to send to server immediately
  sendCrashLogToServer(crashLog);
  
  // Store in AsyncStorage for later retrieval
  try {
    AsyncStorage.setItem('app_crash_logs', JSON.stringify(crashLogs));
  } catch (storageError) {
    originalConsoleError('❌ Failed to store crash log:', storageError);
  }
};

// Send crash log to server
const sendCrashLogToServer = async (crashLog) => {
  try {
    await fetch('https://t2.solidi.co/api2/v1/crash_report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(crashLog),
      timeout: 5000
    });
    console.log('✅ [CRASH REPORT] Sent to server successfully');
  } catch (error) {
    console.error('❌ [CRASH REPORT] Failed to send to server:', error);
  }
};

// Global error handler for JavaScript errors
const globalErrorHandler = (error, isFatal) => {
  console.error('🚨 [GLOBAL ERROR]', error);
  console.error('🚨 [GLOBAL ERROR] Fatal:', isFatal);
  
  storeCrashLog(error, 'Global JavaScript Error');
  
  if (isFatal) {
    console.error('🚨 [FATAL ERROR] App will attempt emergency recovery');
    emergencyMode = true;
  }
};

// Global promise rejection handler
const globalRejectionHandler = (event) => {
  console.error('🚨 [UNHANDLED PROMISE REJECTION]', event.reason);
  storeCrashLog(
    new Error(`Unhandled Promise Rejection: ${event.reason}`), 
    'Unhandled Promise Rejection'
  );
};

// Set up global error handlers
if (typeof ErrorUtils !== 'undefined') {
  ErrorUtils.setGlobalHandler(globalErrorHandler);
  console.log('✅ [SETUP] Global error handler installed');
}

if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('unhandledrejection', globalRejectionHandler);
  console.log('✅ [SETUP] Promise rejection handler installed');
}

// React Native specific error handling
if (typeof global !== 'undefined') {
  console.error = (...args) => {
    // Call original console.error
    originalConsoleError.apply(console, args);
    
    // Store as crash log if it looks like an error - but EXCLUDE our own crash logs to prevent infinite loop
    if (args[0] && 
        (args[0].includes('Error:') || args[0].includes('TypeError:') || args[0].includes('ReferenceError:')) &&
        !args[0].includes('🚨 [CRASH LOG') &&
        !args[0].includes('CRASH LOG')) {
      storeCrashLog(new Error(args.join(' ')), 'Console Error');
    }
  };
  console.log('✅ [SETUP] Console error interceptor installed');
}

console.log('🛡️ [SETUP] All global error handlers installed - TestFlight debugging ready!');

// ===== END GLOBAL ERROR HANDLERS =====

// Shortcuts
let jd = JSON.stringify;

// Settings: Critical (check before making a new release)
let autoLoginOnDevAndStag = false; // Only used during development (i.e. on 'dev' tier) to automatically login using a dev user.
let autoLoginWithStoredCredentials = true; // Enable auto-login for persistent authentication
let preserveRegistrationData = false; // Only used during development (i.e. on 'dev' tier) to preserve registration data after a successful registration.
// - This is useful for testing the registration process, as it allows you to re-register without having to re-enter all the registration data.
let developmentModeBypass = false; // Skip network calls and use sample data when server is unreachable
let bypassAuthentication = false; // Enable proper authentication flow for persistent login
import appTier from 'src/application/appTier'; // dev / stag / prod.

// States that are always accessible without authentication
const publicAccessStates = ['Register', 'RegistrationCompletion', 'Login', 'Explore', 'EmailVerification', 'PhoneVerification', 'AccountReview'];

// Settings: Initial page
// Dynamic initial state based on authentication - will be determined at runtime

// Default state (will be updated dynamically)
let initialMainPanelState = 'RegistrationCompletion'; // Direct access to RegistrationCompletion for testing finprom-categorisation
//let initialMainPanelState = 'AccountReview'; // Direct access to AccountReview for testing finprom-categorisation
//let initialMainPanelState = 'Login'; // Default fallback
//let initialMainPanelState = 'Trade'; // Show trade page first
//let initialMainPanelState = 'Assets'; // Show assets page first  
//let initialMainPanelState = 'Questionnaire'; // Direct access to Questionnaire for testing finprom-categorisation
//let initialMainPanelState = 'Explore'; // Show main app content (authentication handled by SecureApp wrapper)
//let initialMainPanelState = 'PersonalDetails'; // Default authenticated state
let initialPageName = 'default';
//initialPageName = 'balance'; // Dev work

// Settings: Various
let appName = 'SolidiMobileApp';
if (appTier == 'stag') appName = 'SolidiMobileAppTest'; // necessary ?
let storedAPIVersion = '1.0.2';

// OFFLINE MODE - Set to true to disable all API calls for layout testing
let OFFLINE_MODE = false;

let domains = {
  dev: 't2.solidi.co',
  stag: 't10.solidi.co',
  prod: 'www.solidi.co',
}
if (! _.has(domains, appTier)) throw new Error(`Unrecognised app tier: ${appTier}`);
let domain = domains[appTier];
log(`${appTier} domain: ${domain}`);
let autoLoginCredentials = {
  email: 'johnqfish@foo.com',
  password: 'bigFish6',
}

// Keychain storage keys.
// - We use multiple aspects of the app in the key so that there's no risk of a test version of the app interacting with the storage of the production version.
let apiCredentialsStorageKey = `API_${appTier}_${appName}_${domain}`;
let pinStorageKey = `PIN_${appTier}_${appName}_${domain}`;
log(`- Keychain: apiCredentialsStorageKey = ${apiCredentialsStorageKey}`);
log(`- Keychain: pinStorageKey = ${pinStorageKey}`);

const graph_periods = ['2H','8H','1D','1W','1M','6M','1Y'];

// Sample data for development mode
const sampleData = {
  appVersion: {
    version: "1.2.0",
    minimumVersionRequired: {
      ios: { version: "1.0.0" },
      android: { version: "1.0.0" }
    }
  },
  apiVersion: {
    api_latest_version: "1.0.2"
  },
  assets: [
    {
      "key": "BTC", "name": "Bitcoin", "decimal_places": 8, "group": "crypto", 
      "icon_url": "https://static.solidi.co/crypto_icons/BTC.png",
      "price_usd": "45250.50", "change_24h": "+2.35%", "is_active": true
    },
    {
      "key": "ETH", "name": "Ethereum", "decimal_places": 18, "group": "crypto",
      "icon_url": "https://static.solidi.co/crypto_icons/ETH.png", 
      "price_usd": "2850.75", "change_24h": "-1.20%", "is_active": true
    },
    {
      "key": "LTC", "name": "Litecoin", "decimal_places": 8, "group": "crypto",
      "icon_url": "https://static.solidi.co/crypto_icons/LTC.png", 
      "price_usd": "85.42", "change_24h": "+1.80%", "is_active": true
    },
    {
      "key": "XRP", "name": "Ripple", "decimal_places": 6, "group": "crypto",
      "icon_url": "https://static.solidi.co/crypto_icons/XRP.png", 
      "price_usd": "0.52", "change_24h": "-0.95%", "is_active": true
    },
    {
      "key": "GBP", "name": "British Pound", "decimal_places": 2, "group": "fiat",
      "icon_url": "https://static.solidi.co/fiat_icons/GBP.png",
      "price_usd": "1.25", "change_24h": "+0.05%", "is_active": true
    },
    {
      "key": "EUR", "name": "Euro", "decimal_places": 2, "group": "fiat",
      "icon_url": "https://static.solidi.co/fiat_icons/EUR.png",
      "price_usd": "1.08", "change_24h": "-0.15%", "is_active": true
    }
  ],
  markets: [
    {
      "asset1": "BTC", "asset2": "GBP", "price": "36200.40", 
      "change_24h": "+2.30%", "volume_24h": "1250000", "is_active": true
    },
    {
      "asset1": "ETH", "asset2": "GBP", "price": "2280.60",
      "change_24h": "-1.25%", "volume_24h": "850000", "is_active": true
    },
    {
      "asset1": "LTC", "asset2": "GBP", "price": "68.35",
      "change_24h": "+1.80%", "volume_24h": "420000", "is_active": true
    },
    {
      "asset1": "XRP", "asset2": "GBP", "price": "0.42",
      "change_24h": "-0.95%", "volume_24h": "650000", "is_active": true
    },
    {
      "asset1": "BTC", "asset2": "EUR", "price": "41850.25",
      "change_24h": "+2.20%", "volume_24h": "980000", "is_active": true
    }
  ],
  terms: "Sample Terms and Conditions for Development Mode\n\nThis is placeholder legal text for development purposes only.",
  priceHistory: {
    "BTC": [44800, 45100, 44950, 45250, 45300, 45150, 45250],
    "ETH": [2890, 2875, 2840, 2850, 2860, 2845, 2850]
  }
};

let AppStateContext = React.createContext();




class AppStateProvider extends Component {


  constructor(props) {
    super(props);

    // ===== TESTFLIGHT CRASH PROTECTION SYSTEM =====
    // Detect TestFlight build and enable safety measures
    const IS_TESTFLIGHT = !__DEV__ && Platform.OS === 'ios';
    const IS_PRODUCTION = !__DEV__;
    
    console.log('🚀 [STARTUP] AppState constructor starting...');
    console.log('🔍 [ENV] Environment detection:', {
      isDev: __DEV__,
      isTestFlight: IS_TESTFLIGHT,
      isProduction: IS_PRODUCTION,
      platform: Platform.OS
    });

    // Emergency fallback state to prevent complete crashes
    this.emergencyState = {
      mainPanelState: 'Login',
      error: { message: '' },
      user: { 
        isAuthenticated: false,
        info: { 
          user: null, 
          user_status: null, 
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
          }
        },
        apiCredentialsFound: false
      },
      apiClient: null,
      domain: domain || 't2.solidi.co',
      appVersion: appVersion || '1.2.0',
      appTier: appTier || 'dev'
    };

    try {
      // Apply TestFlight safety measures
      if (IS_TESTFLIGHT) {
        console.log('🧪 [TESTFLIGHT] Production TestFlight mode detected - applying safety measures');
        // Override potentially problematic settings for TestFlight
        global.OFFLINE_MODE = true; // Start in offline mode
        global.developmentModeBypass = true;
        global.autoLoginOnDevAndStag = false;
        global.autoLoginWithStoredCredentials = false; // Disable auto-login
        console.log('🧪 [TESTFLIGHT] Safety overrides applied');
      }

      // ===== LOCAL CRASH LOG STORAGE SYSTEM =====
      // Initialize local storage for crash logs
      this.initializeLocalStorage();

      // Test critical early operations that commonly fail in TestFlight
      this.testCriticalOperations();

      // Initialize constructor normally
      this.initializeConstructor();

      console.log('✅ [STARTUP] AppState constructor completed successfully');

    } catch (error) {
      console.error('🚨 [STARTUP CRASH] Constructor failed:', error);
      console.error('🚨 [STARTUP CRASH] Error stack:', error.stack);
      
      // Send crash report to remote logging
      this.reportConstructorCrash(error);
      
      // Set emergency state to prevent app termination
      this.state = this.emergencyState;
      this.state.error = { 
        message: `App startup failed: ${error.message}. Running in emergency mode.` 
      };
      
      console.log('🆘 [EMERGENCY] Emergency state activated to prevent crash');
      return; // Exit constructor early with emergency state
    }
  }

  // Test critical operations that commonly fail in TestFlight
  testCriticalOperations = () => {
    console.log('🔧 [STARTUP] Testing critical operations...');
    
    // Test platform detection
    const platformInfo = {
      OS: Platform.OS,
      Version: Platform.Version
    };
    console.log('📱 [STARTUP] Platform info:', platformInfo);

    // Test basic configuration
    const config = {
      domain: domain || 'unknown',
      appTier: appTier || 'unknown', 
      appVersion: appVersion || 'unknown',
      appName: appName || 'unknown'
    };
    console.log('🔧 [STARTUP] App configuration:', config);

    // Validate critical configuration
    if (!domain || !appTier || !appVersion) {
      throw new Error(`Missing critical configuration: domain=${domain}, appTier=${appTier}, appVersion=${appVersion}`);
    }

    console.log('✅ [STARTUP] Critical operations test passed');
  }

  // Remote crash reporting for TestFlight builds
  reportConstructorCrash = async (error) => {
    try {
      const crashReport = {
        error: error.message,
        stack: error.stack,
        context: 'AppState constructor',
        appVersion: appVersion || 'unknown',
        appTier: appTier || 'unknown',
        platform: Platform.OS,
        timestamp: new Date().toISOString(),
        buildType: __DEV__ ? 'development' : 'production'
      };

      console.log('📤 [CRASH REPORT] Sending crash report:', crashReport);

      // Try to send to your logging endpoint
      await fetch('https://t2.solidi.co/api2/v1/crash_report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(crashReport),
        timeout: 5000
      });

      console.log('✅ [CRASH REPORT] Successfully sent crash report');
    } catch (reportError) {
      console.error('❌ [CRASH REPORT] Failed to send crash report:', reportError);
    }
  }

  // Test keychain access - common source of TestFlight crashes
  testKeychainAccess = () => {
    try {
      console.log('🔐 [KEYCHAIN] Testing keychain access...');
      
      // Log the storage keys that will be used
      console.log('🔐 [KEYCHAIN] Storage keys:', {
        api: apiCredentialsStorageKey,
        pin: pinStorageKey
      });

      // Note: We can't do async operations in constructor, so we'll set up
      // a flag to test keychain access later in componentDidMount
      this.keychainTestPending = true;
      
      console.log('✅ [KEYCHAIN] Keychain access test setup completed');
    } catch (error) {
      console.error('🔐 [KEYCHAIN ERROR] Keychain test setup failed:', error);
      throw new Error(`Keychain test setup failed: ${error.message}`);
    }
  }

  // Initialize local storage for crash logs
  initializeLocalStorage = async () => {
    try {
      console.log('💾 [LOCAL STORAGE] Initializing crash log storage...');
      
      // Load existing crash logs
      const existingLogs = await AsyncStorage.getItem('app_crash_logs');
      if (existingLogs) {
        const logs = JSON.parse(existingLogs);
        console.log(`💾 [LOCAL STORAGE] Found ${logs.length} existing crash logs`);
        
        // If there are crash logs from previous sessions, send them
        if (logs.length > 0) {
          console.log('📤 [LOCAL STORAGE] Sending previous crash logs to server...');
          this.sendStoredCrashLogs(logs);
        }
      }
      
      // Initialize debugging info storage
      await this.storeDebugInfo('App initialized', {
        timestamp: new Date().toISOString(),
        platform: Platform.OS,
        appVersion: '1.2.0',
        buildNumber: '33'
      });
      
      console.log('✅ [LOCAL STORAGE] Crash log storage initialized');
      
    } catch (error) {
      console.error('❌ [LOCAL STORAGE] Failed to initialize storage:', error);
    }
  }

  // Store debug information locally
  storeDebugInfo = async (event, data) => {
    try {
      const debugEntry = {
        timestamp: new Date().toISOString(),
        event,
        data,
        platform: Platform.OS
      };
      
      const existingDebugLogs = await AsyncStorage.getItem('debug_info_logs') || '[]';
      const debugLogs = JSON.parse(existingDebugLogs);
      debugLogs.push(debugEntry);
      
      // Keep only last 50 debug entries
      if (debugLogs.length > 50) {
        debugLogs.shift();
      }
      
      await AsyncStorage.setItem('debug_info_logs', JSON.stringify(debugLogs));
      console.log(`💾 [DEBUG INFO] Stored: ${event}`);
      
    } catch (error) {
      console.error('❌ [DEBUG INFO] Failed to store debug info:', error);
    }
  }

  // Send stored crash logs to server
  sendStoredCrashLogs = async (logs) => {
    try {
      await fetch('https://t2.solidi.co/api2/v1/stored_crash_logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logs,
          retrievedAt: new Date().toISOString(),
          platform: Platform.OS
        }),
        timeout: 10000
      });
      
      console.log('✅ [LOCAL STORAGE] Stored crash logs sent successfully');
      
      // Clear stored logs after successful send
      await AsyncStorage.removeItem('app_crash_logs');
      
    } catch (error) {
      console.error('❌ [LOCAL STORAGE] Failed to send stored crash logs:', error);
    }
  }

  // Save last visited page for Face ID redirect
  saveLastVisitedPage = async (mainPanelState, pageName = 'default') => {
    try {
      console.log('💾 [LAST PAGE] Saving last visited page:', { mainPanelState, pageName });
      
      // Don't save login/registration pages as "last visited"
      const excludedStates = ['Login', 'Registration', 'RegistrationCompletion', 'PINCreation', 'PINLogin'];
      if (excludedStates.includes(mainPanelState)) {
        console.log('💾 [LAST PAGE] Skipping excluded state:', mainPanelState);
        return;
      }

      const lastPageData = {
        mainPanelState,
        pageName,
        timestamp: Date.now()
      };
      
      await AsyncStorage.setItem('last_visited_page', JSON.stringify(lastPageData));
      console.log('✅ [LAST PAGE] Last visited page saved successfully');
      
    } catch (error) {
      console.error('❌ [LAST PAGE] Failed to save last visited page:', error);
    }
  }

  // Retrieve last visited page for Face ID redirect
  getLastVisitedPage = async () => {
    try {
      console.log('📖 [LAST PAGE] Retrieving last visited page...');
      
      const stored = await AsyncStorage.getItem('last_visited_page');
      if (!stored) {
        console.log('📖 [LAST PAGE] No last visited page found, using default');
        return { mainPanelState: 'Home', pageName: 'default' }; // Default to Home page
      }

      const lastPageData = JSON.parse(stored);
      console.log('📖 [LAST PAGE] Retrieved last visited page:', lastPageData);
      
      // Check if the stored page is not too old (7 days)
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - lastPageData.timestamp > sevenDays) {
        console.log('📖 [LAST PAGE] Stored page is too old, using default');
        await AsyncStorage.removeItem('last_visited_page');
        return { mainPanelState: 'Home', pageName: 'default' };
      }

      return {
        mainPanelState: lastPageData.mainPanelState,
        pageName: lastPageData.pageName
      };
      
    } catch (error) {
      console.error('❌ [LAST PAGE] Failed to retrieve last visited page:', error);
      return { mainPanelState: 'Home', pageName: 'default' };
    }
  }

  // Clear last visited page (used during logout)
  clearLastVisitedPage = async () => {
    try {
      console.log('🗑️ [LAST PAGE] Clearing last visited page...');
      await AsyncStorage.removeItem('last_visited_page');
      console.log('✅ [LAST PAGE] Last visited page cleared successfully');
    } catch (error) {
      console.error('❌ [LAST PAGE] Failed to clear last visited page:', error);
    }
  }

  // Initialize constructor with the original code
  initializeConstructor = () => {
    console.log('🔄 [STARTUP] Initializing constructor normally...');

    try {
      // Step 1: Basic setup
      console.log('🔄 [STARTUP] Step 1: Basic setup...');
      this.initializeBasicProperties();
      
      // Step 2: State management functions
      console.log('🔄 [STARTUP] Step 2: State management functions...');
      this.initializeStateFunctions();
      
      // Step 3: API and authentication functions
      console.log('🔄 [STARTUP] Step 3: API and authentication functions...');
      this.initializeAPIFunctions();
      
      // Step 4: State object creation
      console.log('🔄 [STARTUP] Step 4: Creating state object...');
      this.initializeStateObject();
      
      // Step 5: Mobile-specific initialization
      console.log('🔄 [STARTUP] Step 5: Mobile-specific initialization...');
      this.initializeMobileFeatures();
      
      console.log('✅ [STARTUP] All initialization steps completed successfully');
      
    } catch (error) {
      console.error('🚨 [STARTUP] Initialization step failed:', error);
      throw error; // Re-throw to be caught by main constructor try-catch
    }
  }

  // Step 1: Initialize basic properties
  initializeBasicProperties = () => {
    // Test keychain access early - common TestFlight failure point
    this.testKeychainAccess();

    // Set initial state to our configured state for testing
    this.initialMainPanelState = initialMainPanelState; // Use our testing configuration
    console.log('🎯 [AppState] Initial main panel state set to:', this.initialMainPanelState);
    
    this.initialPageName = initialPageName;

    // Misc
    this.numberOfFooterButtonsToDisplay = 3;
    //this.standardPaddingTop = scaledHeight(80); // future ?
    //this.standardPaddingHorizontal = scaledWidth(15); // future ?

    // nonHistoryPanels are not stored in the stateHistoryList.
    // Pressing the Back button will not lead to them.
    // Future: Instead of doing this, better to later remove them from the stateHistoryList after reaching an endpoint ? In some circumstances (e.g. errors) it's better to be able to move backwards.
    this.nonHistoryPanels = `
Authenticate Login PIN
`;
    this.nonHistoryPanels = misc.splitStringIntoArray({s: this.nonHistoryPanels});
  }

  // Step 2: Initialize state management functions
  initializeStateFunctions = () => {


    // Shortcut function for changing the mainPanelState.
    this.changeState = (stateName, pageName) => {
      let fName = 'changeState';
      console.log('🚀 [AppState] changeState called with:', stateName, pageName);
      
      // We check for this error in setMainPanelState as well, but it's useful to have it occur here as well, for debugging purposes.
      if (! mainPanelStates.includes(stateName)) {
        var msg = `${fName}: Unrecognised stateName: ${JSON.stringify(stateName)}`
        console.log('❌ [AppState] Unrecognised stateName:', stateName);
        throw Error(msg);
      }
      
      if (stateName === 'AccountUpdate') {
        console.log('🔥🔥🔥 [AppState] About to change to AccountUpdate state! 🔥🔥🔥');
        console.log('🎯 [AppState] Navigation triggered to AccountUpdate');
        console.log('🎯 [AppState] pageName:', pageName);
      }
      
      this.state.setMainPanelState({mainPanelState: stateName, pageName});
      console.log('✅ [AppState] State change completed to:', stateName);
      
      if (stateName === 'AccountUpdate') {
        console.log('🔥🔥🔥 [AppState] AccountUpdate state change COMPLETED! 🔥🔥🔥');
      }
    }


    this.logEntireStateHistory = () => {
      let msg = 'State history (most recent at the top):';
      let n = this.state.stateHistoryList.length;
      for (let i=n-1; i>=0; i--) {
        let entry = this.state.stateHistoryList[i];
        msg += `\n- ${jd(entry)}`;
      }
      log(msg);
    }


    // Function for changing the mainPanelState.
    this.setMainPanelState = (newState, stashed=false) => {
      let fName = 'setMainPanelState';
      let {mainPanelState: currentMainPanelState, pageName: currentPageName} = this.state;
      let currentState = {mainPanelState: currentMainPanelState, pageName: currentPageName};
      var msg = `${fName}: Current state = ${jd(currentState)}. Attempting to set state to: ${jd(newState)}.`;
      log(msg);
      //this.state.logEntireStateHistory();
      let {mainPanelState, pageName} = newState;
      if (_.isNil(mainPanelState) || ! mainPanelStates.includes(mainPanelState)) {
        var msg = `${fName}: Unknown mainPanelState: ${mainPanelState}`;
        log(msg);
        throw Error(msg);
      }
      if (_.isNil(pageName)) pageName = 'default';
      newState = {mainPanelState, pageName};
      this.cancelTimers();
      this.abortAllRequests();
      let stateHistoryList = this.state.stateHistoryList;
      /* Check the latest stored state.
      - If the latest stored state has just ended a user journey, we want to reset the state history.
      - Important: Don't add a nonHistoryPanel to the endJourneyList.
      */
      let latestStoredState = stateHistoryList[stateHistoryList.length - 1];
      var msg = `${fName}: Latest stored state: ${jd(latestStoredState)}}`;
      log(msg);
      let endJourneyList = `
PurchaseSuccessful PaymentNotMade SaleSuccessful SendSuccessful
RegisterConfirm2 AccountUpdate
`;
      endJourneyList = misc.splitStringIntoArray({s: endJourneyList});
      var msg = `${fName}: endJourneyList: ${jd(endJourneyList)} - Includes current state ? ${endJourneyList.includes(latestStoredState?.mainPanelState)}}`;
      //log(msg);
      if (! _.isEmpty(latestStoredState)) {
        // latestStoredState can be empty if we're testing and start on the Login page, which is not saved into the stateHistoryList.
        if (endJourneyList.includes(latestStoredState.mainPanelState)) {
          var msg = `${fName}: Arrived at end of a user journey: ${latestStoredState.mainPanelState}. Resetting state history.`;
          log(msg);
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
        let latestStoredState = stateHistoryList[stateHistoryList.length - 1];
        if (jd(newState) === jd(latestStoredState)) {
          // We don't want to store the same state twice, so do nothing.
        } else {
          var msg = `${fName}: Store new state history entry: ${jd(newState)}`;
          log(msg);
          stateHistoryList = stateHistoryList.concat(newState);
          this.setState({stateHistoryList});
        }
      }
      // Check if we need to authenticate prior to moving to this new state.
      let makeFinalSwitch = true;
      // Allow public access states (Register, Login, Explore) to be accessible without authentication
      const isPublicAccessState = publicAccessStates.includes(mainPanelState);
      console.log(`🔍 AUTH CHECK: mainPanelState=${mainPanelState}, isPublicAccessState=${isPublicAccessState}, isAuthenticated=${this.state.user.isAuthenticated}, bypassAuthentication=${bypassAuthentication}`);
      
      if (! this.state.user.isAuthenticated && !bypassAuthentication && !isPublicAccessState) {
        console.log(`🔒 AUTH: Blocking access to ${mainPanelState} - requires authentication`);
        if (this.state.authRequired.includes(mainPanelState)) {
          makeFinalSwitch = false;
          // Stash the new state for later retrieval.
          this.state.stashState(newState);
          return this.state.authenticateUser();
        }
      } else {
        console.log(`✅ AUTH: Allowing access to ${mainPanelState} - public access or authenticated`);
      }
      // Finally, change to new state.
      // Note: We store the currentState in the previousState variable, so that we can use it if necessary when we arrive at the destination state.
      if (makeFinalSwitch) {
        // Global user validation check - run on every page change (except public pages and specific exclusions)
        const excludedPages = [
          'Login', 
          'Register', 
          'RegisterConfirm',
          'RegisterConfirm2',
          'PIN', 
          'AccountUpdate',
          'Settings',
          'ForgotPassword',
          'ResetPassword',
          'VerificationCode',
          'CodeVerification'
        ];
        
        // ===== TWO-LEVEL GLOBAL VALIDATION SYSTEM =====
        // LEVEL 1: Credentials Check - No credentials → Login page
        // LEVEL 2: User Status Check - Has credentials but needs forms → AccountReview modal
        console.log('🔍 Running two-level global validation for state:', mainPanelState);
        console.log('🔍 Validation context:', {
          isAuthenticated: this.state.user.isAuthenticated,
          isPublicAccessState: isPublicAccessState,
          isExcludedPage: excludedPages.includes(mainPanelState),
          mainPanelState: mainPanelState
        });
        
        // LEVEL 1: Credentials/Authentication Check
        if (!isPublicAccessState && !excludedPages.includes(mainPanelState)) {
          if (!this.state.user.isAuthenticated) {
            console.log('❌ Level 1 Failed: No credentials/not authenticated - redirecting to Login');
            this.setMainPanelState({mainPanelState: 'Login', pageName: 'default'});
            return;
          }
          
          // Additional check for API credentials
          if (!this.state.user.apiCredentialsFound) {
            console.log('❌ Level 1 Failed: No API credentials found - redirecting to Login');
            this.setMainPanelState({mainPanelState: 'Login', pageName: 'default'});
            return;
          }
          
          // LEVEL 2: User Status Check (only if authenticated and has credentials)
          console.log('✅ Level 1 Passed: User is authenticated with credentials - checking user status...');
          
          this.checkUserStatusRedirect().then(redirectTarget => {
            if (redirectTarget && redirectTarget !== mainPanelState) {
              console.log('❌ Level 2 Failed: User needs form completion');
              console.log('🔀 Redirecting from', mainPanelState, 'to', redirectTarget);
              // Redirect to the appropriate page (AccountReview modal)
              this.setMainPanelState({mainPanelState: redirectTarget, pageName: 'default'});
              return;
            } else {
              console.log('✅ Level 2 Passed: User status is valid, proceeding to', mainPanelState);
            }
          }).catch(error => {
            console.error('❌ Error in Level 2 user status validation:', error);
            // Continue with normal flow if validation fails
            console.log('⚠️ Continuing normal flow due to validation error');
          });
        } else {
          console.log('ℹ️ Validation skipped for', mainPanelState, '(public access or excluded page)');
        }

        let stateChangeID = this.state.stateChangeID + 1;
        var msg = `${fName}: New stateChangeID: ${stateChangeID} (mainPanelState = ${mainPanelState})`;
        log(msg);
        this.setState({previousState: currentState, mainPanelState, pageName, stateChangeID});
        
        // Save last visited page for Face ID redirect (async, don't block UI)
        this.saveLastVisitedPage(mainPanelState, pageName).catch(error => {
          console.error('Failed to save last visited page:', error);
        });
      }
    }


    this.stateChangeIDHasChanged = (stateChangeID, mainPanelState) => {
      let stateChangeID2 = this.state.stateChangeID;
      let location = mainPanelState ? mainPanelState + ': ' : '';
      if (stateChangeID !== stateChangeID2) {
        var msg = `${location}stateChangeID is no longer ${stateChangeID}. It is now ${stateChangeID2}.`;
        log(msg);
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
      // Don't stash the RequestTimeout page. Instead, it should continually reload the existing stashed state.
      if (stateX.mainPanelState == 'RequestTimeout') return;
      var msg = `Stashing state: ${jd(stateX)}`;
      log(msg);
      this.state.stashedState = stateX;
    }


    this.loadStashedState = () => {
      // If there's no stashed state, don't do anything.
      if (_.isEmpty(this.state.stashedState)) return;
      let msg = `Loading stashed state: ${jd(this.state.stashedState)}`;
      log(msg);
      let stashed = true;
      this.state.setMainPanelState(this.state.stashedState, stashed);
    }


    this.deleteStashedState = () => {
      this.state.stashedState = {};
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
      // Technically, this function should only affect the history, but we use it as a shorthand for wiping the state's memory of previous states.
      this.state.deleteStashedState();
      this.state.previousState = {mainPanelState: null, pageName: null};
    }


    this.decrementStateHistory = () => {
      // Apart from setMainPanelState(), this is the only other basic function that changes the mainPanelState.
      let fName = 'decrementStateHistory';
      deb(`${fName}: Start`);
      let {mainPanelState: currentMainPanelState, pageName: currentPageName} = this.state;
      let currentState = {mainPanelState: currentMainPanelState, pageName: currentPageName};
      deb(``);
      let stateHistoryList = this.state.stateHistoryList;
      if (stateHistoryList.length == 1) {
        // No previous state. Only the current state is in the history list.
        return;
      }
      this.cancelTimers();
      this.abortAllRequests();
      let previousStoredState = stateHistoryList[stateHistoryList.length - 2];
      let {mainPanelState, pageName} = previousStoredState;
      if (stateHistoryList.length > 1) {
        stateHistoryList.pop();
        this.setState({stateHistoryList});
      }
      // If this state appears in the footerButtonList, set the footerIndex appropriately.
      // Note: This sets the index of the first button to be displayed in the footer. The highlighting of the selected button occurs separately.
      if (footerButtonList.includes(mainPanelState)) {
        //lj({previousStoredState});
        let index = footerButtonList.indexOf(mainPanelState);
        let steps = Math.floor(index / this.numberOfFooterButtonsToDisplay);
        let newFooterIndex = steps * this.numberOfFooterButtonsToDisplay;
        lj({newFooterIndex});
        this.setFooterIndex(newFooterIndex);
      }
      // Check if we need to authenticate prior to moving to this previous state.
      let makeFinalSwitch = true;
      // Allow public access states (Register, Login, Explore) to be accessible without authentication
      const isPublicAccessState = publicAccessStates.includes(mainPanelState);
      
      if (! this.state.user.isAuthenticated && !bypassAuthentication && !isPublicAccessState) {
        if (this.state.authRequired.includes(mainPanelState)) {
          makeFinalSwitch = false;
          // Stash the previous state for later retrieval.
          this.state.stashState(previousStoredState);
          this.state.authenticateUser();
        }
      }
      // Finally, change to previous state.
      // Note: We store the currentState in the previousState variable, so that we can use it if necessary when we arrive at the destination state.
      if (makeFinalSwitch) {
        let stateChangeID = this.state.stateChangeID + 1;
        var msg = `${fName}: currentState = ${jd(currentState)}. New stateChangeID: ${stateChangeID}. previousStoredState = ${jd(previousStoredState)}`
        log(msg);
        this.setState({previousState: currentState, mainPanelState, pageName, stateChangeID});
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


    this.moveToNextState = async () => {
      /* Sometimes, there are lots of conditions (ideally stored within the AppStateContext) that we look at in order to choose the next state to move to.
      - It is not always a simple linear journey over several states. There can be multiple branches and/or loops.
      */
      let fName = 'moveToNextState';
      try {
        log(`${fName}: Start`);
        let appState = this.state;
        let {mainPanelState, pageName} = appState;
        // Current state is always stored, even if it's not saved in the stateHistoryList.
        let currentState = {mainPanelState, pageName};
        let stateHistoryList = appState.stateHistoryList;
        let currentSavedState = stateHistoryList[stateHistoryList.length - 1];
        var msg = `${fName}: Current state: ${jd(currentState)} (current saved state: ${jd(currentSavedState)})`;
        log(msg);
        let nextStateName;
        let nextPageName = 'default';

        /*
        - Some data needs to be loaded from the server.
        -- Future: Maybe speed up by only doing this when necessary for specific current states.
        */
        try {
          var extraInfoRequired = await appState.checkIfExtraInformationRequired();
        } catch(err) {
          logger.error(err);
          
          // Check if this is an authentication-related error
          if (err.message && (err.message.includes('401') || err.message.includes('403') || 
              err.message.includes('unauthorized') || err.message.includes('invalid'))) {
            logger.error('Authentication error during initialization, forcing logout');
            // Clear authentication and go to login instead of error state
            appState.user.isAuthenticated = false;
            appState.user.apiCredentialsFound = false;
            return appState.changeState('Login');
          } else {
            // For non-auth errors, provide option to recover
            logger.error('Non-authentication error during initialization');
            return appState.switchToErrorState({message: `${String(err)} (Tap to retry login)`});
          }
        }

        // If the state has changed since we loaded data from the server, we exit so that we don't set any new state (which would probably cause an error).
        let stateChangeID = appState.stateChangeID;
        if (appState.stateChangeIDHasChanged(stateChangeID)) return;

        let pinValue = appTier === 'dev' ? appState.user.pin : '[deleted]';
        var msg = `${fName}: Conditions:
=====
extraInfoRequired = ${extraInfoRequired}
appState.panels.buy.activeOrder = ${appState.panels.buy.activeOrder}
appState.user.pin = ${pinValue}
_.isEmpty(appState.stashedState) = ${_.isEmpty(appState.stashedState)}
=====
`;
        log(msg);

        // Decision tree
        if (mainPanelState === 'Login') {
          if (! appState.user.pin) {
            nextStateName = 'PIN';
            nextPageName = 'choose';
          } else if (extraInfoRequired) {
            nextStateName = 'Trade'; // Redirect to index page instead of AccountUpdate
          } else if (appState.panels.buy.activeOrder) {
            nextStateName = 'ChooseHowToPay';
          } else if (! _.isEmpty(appState.stashedState)) {
            return appState.loadStashedState();
          } else {
            nextStateName = 'Trade';
          }
        }

        if (mainPanelState === 'PIN') {
          if (extraInfoRequired) {
            nextStateName = 'Trade'; // Redirect to index page instead of AccountUpdate
          } else if (appState.panels.buy.activeOrder) {
            nextStateName = 'ChooseHowToPay';
          } else if (! _.isEmpty(appState.stashedState)) {
            return appState.loadStashedState();
          } else {
            nextStateName = 'Trade';
          }
        }

        if (mainPanelState === 'RegisterConfirm2') {
          if (extraInfoRequired) {
            nextStateName = 'Trade'; // Redirect to index page instead of AccountUpdate
          } else {
            nextStateName = 'Trade';
          }
        }

        if (mainPanelState === 'AccountUpdate') {
          if (appState.panels.buy.activeOrder) {
            nextStateName = 'ChooseHowToPay';
          } else if (! _.isEmpty(appState.stashedState)) {
            return appState.loadStashedState();
          } else {
            nextStateName = 'Trade';
          }
        }

        if (! nextStateName) {
          var msg = `${fName}: No next state found. Current state: ${jd(currentState)} (current saved state: ${jd(currentSavedState)})`;
          appState.switchToErrorState({message: msg});
        }

        let nextState = {mainPanelState: nextStateName, pageName: nextPageName};
        var msg = `${fName}: nextState = ${jd(nextState)}`;
        log(msg);

        // Change to next state.
        appState.setMainPanelState(nextState);

      } catch(err) {
        var msg = `${fName}: ${String(err)}`;
        logger.error(msg);
        //appState.switchToErrorState({message: msg});
      }
    }
  }

  // Step 3: Initialize API and authentication functions
  initializeAPIFunctions = () => {

    this.generalSetup = async (optionalParams) => {
      // 2023-03-16: We now check for "upgrade required" here.
      // Note: This method needs to be called in every page, so that the Android back button always works.
      // (Obviously the back button handler could be called separately, but that's less convenient overall.)
      let {caller} = { ...optionalParams };
      let fName = `generalSetup`;
      let msg = `${fName}: Start`;
      if (caller) msg += ` (called from ${caller})`;
      log(msg);
      this.state.logEntireStateHistory();
      // Create a new event listener for the Android Back Button (mobile only).
      if (Platform.OS !== 'web') {
        try {
          // Use SafeBackHandler to prevent NativeEventEmitter crashes
          this.state.androidBackButtonHandler = SafeBackHandler.addEventListener("hardwareBackPress", this.state.androidBackButtonAction);
          console.log('✅ AppState: SafeBackHandler successfully initialized');
        } catch (error) {
          console.error('🚨 AppState: SafeBackHandler initialization failed:', error.message);
          this.state.androidBackButtonHandler = null;
        }
      } else {
        console.log('🌐 AppState: Skipping BackHandler setup on web platform');
        this.state.androidBackButtonHandler = null;
      }
      // Create public API client.
      console.log('🔍 APPSTATE: Checking API client creation...');
      console.log('🔍 APPSTATE: this.state.apiClient exists:', !!this.state.apiClient);
      console.log('🔍 APPSTATE: this.state.apiClient type:', typeof this.state.apiClient);
      if (this.state.apiClient) {
        console.log('🔍 APPSTATE: API client keys:', Object.keys(this.state.apiClient));
        console.log('🔍 APPSTATE: API client domain:', this.state.apiClient.domain);
        console.log('🔍 APPSTATE: API client apiKey:', this.state.apiClient.apiKey);
        console.log('🔍 APPSTATE: API client apiSecret:', this.state.apiClient.apiSecret);
      }
      
      if (! this.state.apiClient) {
        let {userAgent, domain} = this.state;
        
        // ===== SIMPLIFIED APPSTATE API CLIENT CREATION =====
        console.log('🔥 APPSTATE: CREATING SOLIDI API CLIENT');
        console.log(`🌐 Domain: ${domain}`);
        // ===== SIMPLIFIED APPSTATE API CLIENT CREATION END =====
        
        const newApiClient = new SolidiRestAPIClientLibrary({
          userAgent, 
          apiKey:'', 
          apiSecret:'', 
          domain,
          appStateRef: { current: this }
        });
        
        // Update state properly to trigger React re-renders
        this.setState({ apiClient: newApiClient });
        
        // Ensure the apiClient is immediately available in this.state
        this.state.apiClient = newApiClient;
        
        console.log('✅ API CLIENT CREATED SUCCESSFULLY AND STATE UPDATED!');
      } else {
        console.log('⚠️ APPSTATE: API client already exists, skipping creation');
      }
      // Create CoinGecko API client for live crypto data
      if (! this.state.coinGeckoAPI) {
        this.state.coinGeckoAPI = new CoinGeckoAPI();
      }
      // OFFLINE MODE - Skip all network checks
      if (OFFLINE_MODE) {
        log(`[OFFLINE MODE] Skipping all network setup checks`);
        this.state.apiVersionLoaded = true;
        return;
      }
      
      // We check for "upgrade required" on every screen load.
      try {
        await this.state.checkIfAppUpdateRequired();
      } catch (error) {
        if (developmentModeBypass) {
          log(`checkIfAppUpdateRequired failed, continuing with development mode: ${error.message}`);
        } else {
          throw error;
        }
      }
      
      // Load public info that rarely changes.
      if (! this.state.apiVersionLoaded) {
        try {
          await this.state.loadLatestAPIVersion();
          this.state.apiVersionLoaded = true;
        } catch (error) {
          if (developmentModeBypass) {
            log(`loadLatestAPIVersion failed, continuing with development mode: ${error.message}`);
            this.state.apiVersionLoaded = true;
          } else {
            throw error;
          }
        }
      }
      
      // Arguably we should double-check the API version here and not continue if it doesn't match.
      //let UpdateRequired = this.state.checkLatestAPIVersion();
      //lj({UpdateRequired});
      
      try {
        await this.state.loadTerms();
      } catch (error) {
        if (developmentModeBypass) {
          log(`loadTerms failed, continuing with development mode: ${error.message}`);
        } else {
          throw error;
        }
      }
      
      if (! this.state.assetsInfoLoaded) {
        try {
          await this.state.loadAssetsInfo();
          this.state.assetsInfoLoaded = true;
        } catch (error) {
          if (developmentModeBypass) {
            log(`loadAssetsInfo failed, continuing with development mode: ${error.message}`);
            this.state.assetsInfoLoaded = true;
          } else {
            throw error;
          }
        }
      }
      
      if (! this.state.marketsLoaded) {
        try {
          await this.state.loadMarkets();
          this.state.marketsLoaded = true;
        } catch (error) {
          if (developmentModeBypass) {
            log(`loadMarkets failed, continuing with development mode: ${error.message}`);
            this.state.marketsLoaded = true;
          } else {
            throw error;
          }
        }
      }
      
      if (! this.state.assetsIconsLoaded) {
        try {
          await this.state.loadAssetsIcons();
          this.state.assetsIconsLoaded = true;
        } catch (error) {
          if (developmentModeBypass) {
            log(`loadAssetsIcons failed, continuing with development mode: ${error.message}`);
            this.state.assetsIconsLoaded = true;
          } else {
            throw error;
          }
        }
      }
      if (! this.state.ipAddressLoaded) {
        try {
          let ipAddresses = await getIpAddressesForHostname(this.state.domain);
          let ipAddress = ipAddresses[0];
          log(`Domain IP address: ${ipAddress}`);
          this.state.ipAddressLoaded = true;
        } catch(err) {
          logger.error(err);
          logger.error(`Unable to load IP address for hostname=${this.state.domain}, probably because of a poor or non-existent internet connection.`);
        }
      }
      // Login to a specific user if we're developing.
      if ('dev stag'.split(' ').includes(appTier) && autoLoginOnDevAndStag) {
        await this.state.login({
          email: autoLoginCredentials['email'],
          password: autoLoginCredentials['password']
        });
      }
      
      // Auto-login with stored credentials for all environments (if available)
      if (!this.state.user.isAuthenticated && autoLoginWithStoredCredentials) {
        try {
          console.log('🔐 APPSTATE: Attempting auto-login with stored credentials...');
          
          // Ensure we check for credentials first if not already done
          if (!this.state.user.apiCredentialsFound) {
            await this.state.checkForAPICredentials();
          }
          
          let autoLoginResult = await this.state.autoLoginWithStoredCredentials();
          if (autoLoginResult === true) {
            console.log('✅ APPSTATE: Auto-login successful!');
          } else {
            console.log('ℹ️ APPSTATE: No stored credentials found for auto-login');
          }
        } catch (error) {
          console.log('⚠️ APPSTATE: Auto-login failed:', error.message);
          
          // If auto-login fails, clear potentially problematic credentials
          // and ensure we don't get stuck in error state
          try {
            if (error.message.includes('401') || error.message.includes('invalid') || error.message.includes('expired')) {
              console.log('🔐 APPSTATE: Clearing invalid credentials from auto-login failure');
              await Keychain.resetInternetCredentials(this.state.apiCredentialsStorageKey);
              this.state.user.apiCredentialsFound = false;
            }
          } catch (clearError) {
            console.log('⚠️ APPSTATE: Could not clear credentials:', clearError.message);
          }
          
          // Don't throw error or trigger error state - just continue to login screen
          console.log('🔐 APPSTATE: Continuing to login screen after auto-login failure');
        }
      } else if (!autoLoginWithStoredCredentials) {
        console.log('🔐 APPSTATE: Auto-login disabled for development - staying on initial page');
      }
    }


    this.login = async ({email, password, tfa = ''}) => {
      if (this.state.user.isAuthenticated) return;
      
      // OFFLINE MODE - Skip API and directly login with mock credentials
      if (OFFLINE_MODE) {
        log(`[OFFLINE MODE] Mock login for email: ${email}`);
        let mockApiKey = "mock_api_key_for_testing_layouts_only";
        let mockApiSecret = "mock_api_secret_for_testing_layouts_only";
        _.assign(this.state.user, {email, password});
        await this.state.loginWithAPIKeyAndSecret({apiKey: mockApiKey, apiSecret: mockApiSecret});
        return "SUCCESS";
      }
      
      // Create public API client.
      let {userAgent, domain} = this.state;
      
      // ===== SIMPLIFIED LOGIN API CLIENT CREATION =====
      console.log(' LOGIN: CREATING API CLIENT FOR LOGIN');
      console.log(`📧 Email: ${email}`);
      console.log(`🌐 Domain: ${domain}`);
      // ===== SIMPLIFIED LOGIN API CLIENT CREATION END =====
      
      let apiClient = new SolidiRestAPIClientLibrary({
        userAgent, 
        apiKey:'', 
        apiSecret:'', 
        domain,
        appStateRef: { current: this }
      });
      this.state.apiClient = apiClient;
      
      console.log('✅ LOGIN API CLIENT CREATED SUCCESSFULLY!');
      // Use the email and password to load the API Key and Secret from the server.
      let apiRoute = 'login_mobile' + `/${email}`;
      let optionalParams = {
        origin: {
          clientType: 'mobile',
          os: Platform.OS,
          appVersion,
          appBuildNumber,
          appTier,
        }
      };
      let params = {password, tfa, optionalParams};
      let abortController = this.state.createAbortController();
      let data = await apiClient.publicMethod({httpMethod: 'POST', apiRoute, params, abortController});
      
      // ===== LOGIN RESPONSE LOGGING =====
      console.log('🚀 LOGIN API RESPONSE:');
      console.log('📧 Email:', email);
      console.log('🔍 Response data:', JSON.stringify(data, null, 2));
      if (data.apiKey) {
        console.log('🔑 API Key received:', data.apiKey);
        console.log('🔐 API Secret received:', data.apiSecret ? '[REDACTED]' : 'NOT_PROVIDED');
      }
      log('LOGIN: Full API response received', data);
      // ===== LOGIN RESPONSE LOGGING END =====
      
      // Issue: We may get a security block here, e.g.
      // {"error":{"code":400,"message":"Error in login","details":{"tfa_required":true}}}
      if (data.error) {
        console.log('❌ LOGIN ERROR:', data.error);
        log('LOGIN: Error in response', data.error);
        if (data.error.code == 400 && data.error.details) {
          if (data.error.details.tfa_required) {
            console.log('🔒 TFA Required for login');
            return "TFA_REQUIRED";
          }
        }
      }
      let keyNames = 'apiKey, apiSecret'.split(', ');
      // Future: if error is "cannot_parse_data", return a different error.
      if (! misc.hasExactKeys('data', data, keyNames, 'submitLoginRequest')) {
        console.log('❌ LOGIN VALIDATION FAILED: Missing required keys', keyNames);
        log('LOGIN: Validation failed - missing keys', { expected: keyNames, received: Object.keys(data) });
        throw Error('Invalid username or password.');
      }
      let {apiKey, apiSecret} = data;
      console.log('✅ LOGIN SUCCESS: API credentials extracted successfully');
      _.assign(this.state.user, {email, password});
      await this.state.loginWithAPIKeyAndSecret({apiKey, apiSecret});
      return "SUCCESS";
    }

    this.register = async (registerData) => {
      const fName = 'register';
      
      console.log(`${fName}: Starting registration for email: ${registerData.email}`);
      
      // Validate input data first
      const validationErrors = this.validateRegistrationData(registerData);
      if (validationErrors && Object.keys(validationErrors).length > 0) {
        console.log(`${fName}: Validation errors:`, validationErrors);
        return { result: "VALIDATION_ERROR", details: validationErrors };
      }
      
      console.log(`${fName}: Validation passed`);
      
      // OFFLINE MODE - Skip API and return mock success
      if (OFFLINE_MODE) {
        console.log(`${fName}: [OFFLINE MODE] Mock registration for email: ${registerData.email}`);
        return { 
          result: "SUCCESS", 
          message: "Registration successful (offline mode)",
          data: { userId: 'mock_user_123', email: registerData.email }
        };
      }
      
      // Create public API client for registration
      let {userAgent, domain} = this.state;
      
      console.log(`${fName}: Creating API client for registration`);
      console.log(`📧 Email: ${registerData.email}`);
      console.log(`🌐 Domain: ${domain}`);
      
      let apiClient = new SolidiRestAPIClientLibrary({
        userAgent, 
        apiKey:'',     // Empty for public registration
        apiSecret:'',  // Empty for public registration
        domain,
        appStateRef: { current: this }
      });
      
      // Prepare API route and parameters
      let apiRoute = 'register_new_user' + `/${registerData.email}`;
      let optionalParams = {
        origin: {
          clientType: 'mobile',
          os: Platform.OS,
          appVersion,
          appBuildNumber,
          appTier,
          timestamp: Date.now()
        }
      };
      
      // Convert emailPreferences to array format
      let emailPreferences = [];
      if (registerData.emailPreferences) {
        Object.keys(registerData.emailPreferences).forEach(key => {
          if (registerData.emailPreferences[key]) {
            emailPreferences.push(key);
          }
        });
      }
      
      // Only include fields expected by the registration API
      let params = {
        userData: {
          email: registerData.email,
          firstName: registerData.firstName,
          lastName: registerData.lastName,
          dateOfBirth: registerData.dateOfBirth,
          gender: registerData.gender,
          citizenship: registerData.citizenship,
          password: registerData.password,
          mobileNumber: registerData.mobileNumber,
          emailPreferences
        },
        optionalParams
      };
      
      try {
        console.log(`${fName}: Making API call to ${apiRoute}`);
        let abortController = this.state.createAbortController();
        let data = await apiClient.publicMethod({
          httpMethod: 'POST',
          apiRoute,
          params,
          abortController
        });
        
        console.log(`${fName}: API response received:`, data);
        
        if (data.error) {
          console.log(`${fName}: Registration failed with error:`, data.error);
          return { 
            result: "ERROR", 
            error: data.error,
            message: data.error.message || "Registration failed"
          };
        }
        
        console.log(`${fName}: Registration successful!`);
        return { 
          result: "SUCCESS", 
          message: "Registration successful. Please check your email.",
          data: data
        };
        
      } catch (error) {
        console.error(`${fName}: Registration error:`, error);
        return { 
          result: "ERROR", 
          error: error,
          message: error.message || "Registration failed"
        };
      }
    }

    this.validateRegistrationData = (data) => {
      const errors = {};
      
      // Email validation
      if (!data.email || !/\S+@\S+\.\S+/.test(data.email)) {
        errors.email = 'Valid email is required';
      }
      
      // Password validation
      if (!data.password || data.password.length < 8) {
        errors.password = 'Password must be at least 8 characters';
      }
      
      // Name validation
      if (!data.firstName || data.firstName.trim().length < 2) {
        errors.firstName = 'First name must be at least 2 characters';
      }
      
      if (!data.lastName || data.lastName.trim().length < 2) {
        errors.lastName = 'Last name must be at least 2 characters';
      }
      
      // Mobile number validation
      if (!data.mobileNumber || data.mobileNumber.length < 8) {
        errors.mobileNumber = 'Valid mobile number is required';
      }
      
      // Date of birth validation (DD/MM/YYYY format)
      if (!data.dateOfBirth || !/^\d{2}\/\d{2}\/\d{4}$/.test(data.dateOfBirth)) {
        errors.dateOfBirth = 'Date of birth must be in DD/MM/YYYY format';
      }
      
      // Gender validation
      if (!data.gender || !['Male', 'Female', 'Other'].includes(data.gender)) {
        errors.gender = 'Valid gender selection is required';
      }
      
      // Citizenship validation (2-letter country code)
      if (!data.citizenship || data.citizenship.length !== 2) {
        errors.citizenship = 'Valid country selection is required';
      }
      
      return Object.keys(errors).length > 0 ? errors : null;
    }


    this.loginWithAPIKeyAndSecret = async ({apiKey, apiSecret}) => {
      // This isn't really a "log in" function, it's more of a data-storage-and-gathering function.
      // Nonetheless, it installs the particular user's data at the "base" of the application data storage.
      // If we've arrived at this function, we've authenticated elsewhere.
      
      // ===== USER AUTHENTICATION LOGGING =====
      console.log('🔐 SETTING UP AUTHENTICATED USER:');
      console.log('🆔 API Key:', apiKey);
      console.log('🔑 API Secret:', apiSecret ? `${apiSecret.substring(0, 12)}...` : 'NOT_PROVIDED');
      console.log('👤 Current user state before auth:', JSON.stringify(this.state.user, null, 2));
      log('AUTHENTICATION: Starting loginWithAPIKeyAndSecret', { 
        apiKey, 
        apiSecretLength: apiSecret ? apiSecret.length : 0,
        currentUserState: this.state.user 
      });
      // ===== USER AUTHENTICATION LOGGING END =====
      
      this.state.user.isAuthenticated = true;
      apiClient = this.state.apiClient;
      // Store the API Key and Secret in the apiClient.
      _.assign(apiClient, {apiKey, apiSecret});
      // Store the API Key and Secret in the secure keychain storage.
      await Keychain.setInternetCredentials(this.state.apiCredentialsStorageKey, apiKey, apiSecret);
      let msg = `apiCredentials stored in keychain with key = '${this.state.apiCredentialsStorageKey}')`;
      log(msg);
      // Save the fact that the API Key and Secret have been stored.
      this.state.user.apiCredentialsFound = true;
      let msg2 = `Set this.state.user.apiCredentialsFound = true`;
      log(msg2);
      log(`apiKey: ${apiKey}`);
      if (appTier === 'dev') {
        log(`apiSecret: ${apiSecret}`);
      }
      
      // ===== POST-AUTHENTICATION USER OBJECT LOGGING =====
      console.log('✅ USER AUTHENTICATED SUCCESSFULLY:');
      console.log('👤 Updated user state:', JSON.stringify(this.state.user, null, 2));
      console.log('🔧 API Client updated with credentials');
      console.log('💾 Credentials stored in keychain');
      log('AUTHENTICATION: User object updated', {
        userState: this.state.user,
        apiCredentialsStored: true,
        storageKey: this.state.apiCredentialsStorageKey
      });
      // ===== POST-AUTHENTICATION USER OBJECT LOGGING END =====
      
      // Load user stuff.
      if (OFFLINE_MODE) {
        log(`[OFFLINE MODE] Skipping loadInitialStuffAboutUser`);
        console.log('🔄 [OFFLINE MODE] Skipping loadInitialStuffAboutUser');
      } else {
        console.log('🔄 Loading initial user data...');
        await this.state.loadInitialStuffAboutUser();
        console.log('✅ Initial user data loaded');
        log('AUTHENTICATION: Initial user data loaded');
        
        // ===== FINAL USER STATE LOGGING AFTER COMPLETE LOGIN =====
        console.log('🎉 ===== LOGIN COMPLETE - FINAL USER STATE =====');
        console.log('🔐 Authentication Status:', this.state.user.isAuthenticated);
        console.log('🔑 API Credentials Found:', this.state.user.apiCredentialsFound);
        console.log('👤 User Info Available:', !!this.state.user.info.user);
        console.log('📊 User Status Available:', !!this.state.user.info.user_status);
        if (this.state.user.info.user) {
          console.log('📧 Logged in as:', this.state.user.info.user.email);
          console.log('👨‍💼 User Name:', `${this.state.user.info.user.firstName || ''} ${this.state.user.info.user.lastName || ''}`.trim());
          console.log('🆔 User UUID:', this.state.user.info.user.uuid);
        }
        console.log('🔍 COMPLETE FINAL USER STATE:');
        console.log(JSON.stringify({
          isAuthenticated: this.state.user.isAuthenticated,
          apiCredentialsFound: this.state.user.apiCredentialsFound,
          email: this.state.user.email,
          userInfo: this.state.user.info.user,
          userStatus: this.state.user.info.user_status
        }, null, 2));
        console.log('🎉 ===== END LOGIN COMPLETE LOGGING =====');
        // ===== FINAL USER STATE LOGGING AFTER COMPLETE LOGIN END =====
        
        // ===== POST-LOGIN NAVIGATION LOGIC =====
        console.log('🔍 ===== CHECKING POST-LOGIN NAVIGATION REQUIREMENTS =====');
        await this.checkPostLoginNavigation();
        console.log('🔍 ===== END POST-LOGIN NAVIGATION CHECK =====');
      }
      return "SUCCESS";
    }

    // Auto-login function - loads stored credentials and logs in automatically (for persistent login)
    this.autoLoginWithStoredCredentials = async () => {
      try {
        log("🔑 autoLoginWithStoredCredentials: Attempting auto-login with stored credentials");
        
        // Skip if already authenticated
        if (this.state.user.isAuthenticated) {
          log("🔑 autoLoginWithStoredCredentials: User already authenticated, skipping");
          return true;
        }
        
        // Check if credentials exist in keychain
        let credentials = await Keychain.getInternetCredentials(this.state.apiCredentialsStorageKey);
        
        if (credentials && credentials.username && credentials.password) {
          let apiKey = credentials.username;
          let apiSecret = credentials.password;
          
          // Validate credentials format (basic check)
          if (!apiKey || !apiSecret || apiKey.length < 10 || apiSecret.length < 10) {
            log("🔑 autoLoginWithStoredCredentials: Invalid credential format, clearing stored credentials");
            await Keychain.resetInternetCredentials(this.state.apiCredentialsStorageKey);
            this.state.user.apiCredentialsFound = false;
            return false;
          }
          
          log("🔑 autoLoginWithStoredCredentials: Found stored credentials, attempting login");
          log(`🔑 autoLoginWithStoredCredentials: API Key: ${apiKey}`);
          if (appTier === 'dev') {
            log(`🔑 autoLoginWithStoredCredentials: API Secret: ${apiSecret.substring(0, 20)}...`);
          }
          
          // Login with the stored credentials
          await this.loginWithAPIKeyAndSecret({apiKey, apiSecret});
          
          // Verify login succeeded
          if (this.state.user.isAuthenticated) {
            log("🔑 autoLoginWithStoredCredentials: Auto-login successful!");
            return true;
          } else {
            log("🔑 autoLoginWithStoredCredentials: Login failed despite no errors");
            return false;
          }
          
        } else {
          log("🔑 autoLoginWithStoredCredentials: No stored credentials found");
          this.state.user.apiCredentialsFound = false;
          return false;
        }
      } catch (error) {
        log(`🔑 autoLoginWithStoredCredentials: Error during auto-login: ${error.message}`);
        console.error('🔑 Auto-login error:', error);
        
        // If credentials are invalid/expired, clear them
        if (error.message.includes('invalid') || error.message.includes('expired') || error.message.includes('401')) {
          log("🔑 autoLoginWithStoredCredentials: Credentials appear invalid, clearing them");
          try {
            await Keychain.resetInternetCredentials(this.state.apiCredentialsStorageKey);
            this.state.user.apiCredentialsFound = false;
          } catch (clearError) {
            log(`🔑 autoLoginWithStoredCredentials: Error clearing invalid credentials: ${clearError.message}`);
          }
        }
        
        return false;
      }
    }


    this.loginAsDifferentUser = async ({userID}) => {
      // Note: The PIN is local to the phone, so your own PIN will stay the same.
      // - You can't change the other user's PIN.
      if (! this.getUserStatus('supportLevel2') === true) {
        // Don't throw a visible error.
        return;
      }
      if (userID === '') return;
      if (! misc.isNumericString(userID)) return;
      userID = Number(userID);
      if (userID < 0) return;
      log(`loginAsDifferentUser: Attempting to log in as userID = ${userID}.`);
      // Step 1: Save credentials of current user.
      log(`loginAsDifferentUser: Step 1: Save credentials of current user.`);
      let {apiKey, apiSecret} = this.state.apiClient;
      log(`apiKey: ${apiKey}`);
      log(`apiSecret: ${apiSecret}`);
      _.assign(this.state.originalUser, {apiKey, apiSecret});
      // Step 2: Request credentials of new user.
      log(`loginAsDifferentUser: Step 2: Request credentials of new user.`);
      let data = await this.state.privateMethod({
        functionName: 'loginAsDifferentUser',
        apiRoute: `credentials/${userID}`,
      });
      if (data == 'DisplayedError') return;
      //lj({data});
      // Sample data:
      // "data":{"active":1,"apiKey":"Jh7L3AAcKwiqNdXGJ64kM6OIUcpQ9UEssowapmWCEhvCXCQmN6XuZAqH","apiSecret":"PXPUdrmU3XKnxZCDMuluYOXwcUSNoZpIxbQGayorbWEgOjhMF3Cgm3H0sjGsd081PLvssLKTBFhVuDM9wnxNNdpc","name":"default"}
      ({apiKey, apiSecret} = data);
      //lj({apiKey, apiSecret})
      log(`loginAsDifferentUser: Step 3: Use new user's credentials to log in as that user.`);
      await this.state.loginWithAPIKeyAndSecret({apiKey, apiSecret});
      if (this.state.stateChangeIDHasChanged(this.state.stateChangeID)) return;
      // We go to the user's history, instead of the Buy page, so that it's less likely that we accidentally create an order while using their account.
      this.state.changeState('History');
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

    // Mock API response generator for offline mode
    this.getMockResponse = (apiRoute, params) => {
      // Simulate API delay
      return new Promise((resolve) => {
        setTimeout(() => {
          switch (apiRoute) {
            case 'hello':
              resolve("Solidi 1.0.2 [OFFLINE MODE]");
              break;
            case apiRoute.includes('login_mobile') ? apiRoute : '':
              resolve({
                apiKey: "mock_api_key_for_testing_layouts_only",
                apiSecret: "mock_api_secret_for_testing_layouts_only"
              });
              break;
            case 'user':
              resolve({
                email: "test@example.com",
                firstName: "Test",
                lastName: "User",
                status: "active"
              });
              break;
            case 'version':
              resolve({
                version: "1.0.2",
                updateRequired: false
              });
              break;
            case 'terms':
              resolve({
                terms: "Mock terms and conditions for offline testing",
                version: "1.0"
              });
              break;
            case 'portfolio':
            case 'transactions':
            case 'history':
              resolve({
                data: [],
                message: "No data in offline mode"
              });
              break;
            default:
              log(`[OFFLINE MODE] Unknown API route: ${apiRoute}, returning empty success`);
              resolve({
                success: true,
                message: "Mock response for offline testing"
              });
          }
        }, 100); // Small delay to simulate network
      });
    };

    this.publicMethod = async (args) => {
      let fName = 'publicMethod';
      let {functionName, httpMethod, apiRoute, params, keyNames, noAbort} = args;
      if (_.isNil(functionName)) functionName = '[Unspecified function]';
      if (_.isNil(httpMethod)) httpMethod = 'POST';
      if (_.isNil(apiRoute)) throw new Error('apiRoute required');
      if (_.isNil(params)) params = {};
      if (_.isNil(keyNames)) keyNames = [];
      if (_.isNil(noAbort)) noAbort = false;
      if (this.state.mainPanelState === 'RequestFailed') return;
      
      // OFFLINE MODE - Return mock data for layout testing
      if (OFFLINE_MODE) {
        log(`[OFFLINE MODE] Mocking API call: ${apiRoute}`);
        return this.getMockResponse(apiRoute, params);
      }
      
      // Log API request details
      console.log(`🌐 [PUBLIC API REQUEST] ${httpMethod} ${apiRoute}`);
      console.log(`📤 [PUBLIC API REQUEST PARAMS]`, params);
      console.log(`🔧 [PUBLIC API FUNCTION]`, functionName);
      
      // Safety check for apiClient
      if (!this.state.apiClient) {
        console.error(`❌ [PUBLIC API] apiClient is null for ${apiRoute} - attempting to create one`);
        await this.generalSetup();
        if (!this.state.apiClient) {
          throw new Error(`API client not available for ${apiRoute}`);
        }
      }
      
      let tag = apiRoute.split('/')[0];
      let abortController = this.state.createAbortController({tag, noAbort});
      let data = await this.state.apiClient.publicMethod({httpMethod, apiRoute, params, abortController});
      
      // Log API response details
      console.log(`📥 [PUBLIC API RESPONSE] ${httpMethod} ${apiRoute}`);
      console.log(`📊 [PUBLIC API RESPONSE DATA]`, data);
      // Examine errors.
      //data = {'error': 503}; // dev
      if (_.has(data, 'error')) {
        let error = data.error;
        
        // NEW LOGIC: If top-level error is null, treat as success (skip all error processing)
        if (error === null) {
          console.log(`✅ [PUBLIC API] Top-level error is null - treating as success for ${apiRoute}`);
          // Skip all error processing and continue with normal flow
        } else if (error == 'cannot_parse_data') {
          // Return the raw data instead of switching to error state
          console.log(`⚠️ [PUBLIC API] Cannot parse data for ${apiRoute}:`, jd(data));
          return data;
        } else if (error == 'timeout') {
          // Future: If we already have a stashed state, this could cause a problem.
          this.state.stashCurrentState();
          this.state.changeState('RequestTimeout');
          return 'DisplayedError';
        } else if (error == 'aborted') {
          // Future: Return "Aborted" and make sure that every post-request code section checks for this and reacts appropriately.
          //pass
        } else if (error == 'request_failed') {
          if (this.state.mainPanelState !== 'RequestFailed') {
            this.state.stashCurrentState();
            this.state.changeState('RequestFailed');
            return 'DisplayedError';
          }
          // We only arrive at this point if we've had a "request_failed" error from a second request. No point doing anything extra about it.
        } else if (_.isString(error) && error.startsWith('ValidationError:')) {
          // This is a user-input validation error.
          // The page that sent the request should display it to the user.
          return data;
        } else if (error == 503) {
          this.state.setMaintenanceMode(true);
          // We change state in order to stop any ongoing operations.
          this.state.changeState('Maintenance');
          return 'DisplayedError'; // Indicate we have handled the 503 return code.
        } else {
          // Return the raw data instead of switching to error state
          // Let the calling function handle the error appropriately
          console.log(`⚠️ [PUBLIC API] API error for ${apiRoute}:`, error);
          console.log(`⚠️ [PUBLIC API] Full response data:`, data);
          return data;
        }
        
        // Only return here if error is not null (meaning it's an actual error)
        if (error !== null) {
          return;
        }
      }
      try {
        if (keyNames.length > 0) {
          misc.confirmExactKeys('data', data, keyNames, functionName);
        }
      } catch(err) {
        // Log the validation error but return the data instead of switching to error state
        console.log(`⚠️ [PUBLIC API] Key validation error for ${apiRoute}:`, String(err));
        console.log(`⚠️ [PUBLIC API] Expected keys:`, keyNames);
        console.log(`⚠️ [PUBLIC API] Actual data:`, data);
        // Return the data so calling function can handle it appropriately
        return data;
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
      
      // OFFLINE MODE - Return mock data for layout testing
      if (OFFLINE_MODE) {
        log(`[OFFLINE MODE] Mocking private API call: ${apiRoute}`);
        return this.getMockResponse(apiRoute, params);
      }
      
      // Log API request details
      console.log(`🚀 [API REQUEST] ${httpMethod} ${apiRoute}`);
      console.log(`📤 [API REQUEST PARAMS]`, params);
      console.log(`� [REQUEST JSON]`, JSON.stringify({
        method: httpMethod,
        route: apiRoute,
        params: {
          ...params,
          fileData: params.fileData ? `[Base64 Data: ${params.fileData.length} chars]` : params.fileData
        },
        functionName
      }, null, 2));
      console.log(`�🔧 [API FUNCTION]`, functionName);
      
      // Safety check for apiClient
      if (!this.state.apiClient) {
        console.error(`❌ [PRIVATE API] apiClient is null for ${apiRoute} - attempting to create one`);
        await this.generalSetup();
        if (!this.state.apiClient) {
          throw new Error(`API client not available for ${apiRoute}`);
        }
      }
      
      let tag = apiRoute.split('/')[0];
      let abortController = this.state.createAbortController({tag, noAbort});
      let data = await this.state.apiClient.privateMethod({httpMethod, apiRoute, params, abortController});
      
      // Log API response details
      console.log(`📥 [API RESPONSE] ${httpMethod} ${apiRoute}`);
      console.log(`📊 [API RESPONSE DATA]`, data);
      console.log(`📄 [RESPONSE JSON]`, JSON.stringify(data, null, 2));
      if (_.has(data, 'error')) {
        let error = data.error;
        
        // NEW LOGIC: If top-level error is null, treat as success (skip all error processing)
        if (error === null) {
          console.log(`✅ [PRIVATE API] Top-level error is null - treating as success for ${apiRoute}`);
          // Skip all error processing and continue with normal flow
        } else if (error == 'cannot_parse_data') {
          // Return the raw data instead of switching to error state
          console.log(`⚠️ [PRIVATE API] Cannot parse data for ${apiRoute}:`, jd(data));
          return data;
        } else if (error == 'timeout') {
          // Future: If we already have a stashed state, this could cause a problem.
          this.state.stashCurrentState();
          this.state.changeState('RequestTimeout');
          return 'DisplayedError';
        } else if (error == 'aborted') {
          // Future: Return "Aborted" and make sure that every post-request code section checks for this and reacts appropriately.
          //pass
        } else if (error == 'request_failed') {
          if (this.state.mainPanelState !== 'RequestFailed') {
            this.state.stashCurrentState();
            this.state.changeState('RequestFailed');
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
        } else if (error == 503) {
          this.state.setMaintenanceMode(true);
          // We change state in order to stop any ongoing operations.
          this.state.changeState('Maintenance');
          return 'DisplayedError'; // Indicate we have handled the 503 return code.
        } else {
          // Return the raw data instead of switching to error state
          // Let the calling function handle the error appropriately
          console.log(`⚠️ [PRIVATE API] API error for ${apiRoute}:`, error);
          console.log(`⚠️ [PRIVATE API] Full response data:`, data);
          return data;
        }
        
        // Only return here if error is not null (meaning it's an actual error)
        if (error !== null) {
          return;
        }
      }
      try {
        if (keyNames.length > 0) {
          misc.confirmExactKeys('data', data, keyNames, functionName);
        }
      } catch(err) {
        // Log the validation error but return the data instead of switching to error state
        console.log(`⚠️ [PRIVATE API] Key validation error for ${apiRoute}:`, String(err));
        console.log(`⚠️ [PRIVATE API] Expected keys:`, keyNames);
        console.log(`⚠️ [PRIVATE API] Actual data:`, data);
        // Return the data so calling function can handle it appropriately
        return data;
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


    this.authenticateUser = async () => {
      // If API credentials (API Key and Secret) aren't stored in the Keychain, go to Authenticate (where the user can choose between Register and Login).
      let msg = "authenticateUser";
      msg += `\n- this.state.user.apiCredentialsFound = ${this.state.user.apiCredentialsFound}`;
      msg += `\n- this.state.user.isAuthenticated = ${this.state.user.isAuthenticated}`;
      msg += `\n- this.state.user.email = ${this.state.user.email}`;
      msg += `\n- this.state.user.pin = ${this.state.user.pin}`;
      if (appTier !== 'prod') {
        log(msg);
      }

      // 🔑 AUTO-LOGIN: Try to auto-login with stored credentials for all environments
      if (autoLoginWithStoredCredentials && !this.state.user.isAuthenticated) {
        log("🔑 Attempting auto-login with stored credentials");
        try {
          let autoLoginSuccess = await this.autoLoginWithStoredCredentials();
          if (autoLoginSuccess) {
            log("🔑 Auto-login successful! User is now authenticated");
            // If auto-login succeeded and user is authenticated, skip further authentication flows
            if (this.state.user.isAuthenticated) {
              log("🔑 Auto-login complete, redirecting to default state");
              return this.state.changeState(initialMainPanelState);
            }
          } else {
            log("🔑 Auto-login failed, continuing with normal flow");
          }
        } catch (error) {
          log(`🔑 Auto-login error: ${error.message}`);
        }
      }

      // For public access states, skip credential checks
      const currentState = this.state.mainPanelState;
      const isCurrentStatePublic = publicAccessStates.includes(currentState);
      
      if (! this.state.user.apiCredentialsFound && !bypassAuthentication && !isCurrentStatePublic) {
        if (! this.state.user.isAuthenticated) {
          log("authenticateUser (1) -> Authenticate");
          return this.state.changeState('Authenticate');
        }
      }
      // If the Keychain contains both the PIN and the API credentials, go to PIN entry.
      // After the user enters the PIN, the app will load the API credentials automatically.
      // Note: The PIN is kept in storage even if the user logs out.
      // Note 2: A logOut action will delete the API credentials, so in this case a new logIn action will be required, in which the user enters their username and password.
      if (this.state.user.apiCredentialsFound && this.state.user.pin) {
        log("authenticateUser (2) -> PIN");
        return this.state.changeState('PIN');
      }
      // Otherwise, go to Login.
      log("authenticateUser (3) -> Login");
      return this.state.changeState('Login');
    }


    // 🔐 COMPREHENSIVE AUTHENTICATION GUARD
    // Handles credential validation, expiration, and automatic redirect to login
    this.validateAuthentication = async (context = 'general') => {
      try {
        log(`🔐 validateAuthentication called from: ${context}`);
        
        // Check if user is currently authenticated
        if (!this.state.user.isAuthenticated) {
          log('🔐 User not authenticated, redirecting to login');
          return this.forceRedirectToLogin('User not authenticated');
        }

        // Check if API credentials are still valid
        if (!this.state.user.apiCredentialsFound) {
          log('🔐 API credentials not found, redirecting to login');
          return this.forceRedirectToLogin('API credentials not found');
        }

        // Skip API validation for periodic checks to avoid unnecessary logouts
        // Only validate when there's a specific need (like after failed API calls)
        if (context !== 'periodic-check' && this.state.apiClient) {
          try {
            log('🔐 Testing API credentials with validation call');
            let testResult = await this.state.apiClient.validateCredentials();
            if (!testResult || testResult.error) {
              log('🔐 API credentials validation failed, redirecting to login');
              return this.forceRedirectToLogin('API credentials invalid or expired');
            }
          } catch (apiError) {
            log(`🔐 API validation error: ${apiError.message}`);
            // Check for authentication-related errors
            if (apiError.status === 401 || apiError.status === 403 || 
                apiError.message.includes('unauthorized') || 
                apiError.message.includes('forbidden') ||
                apiError.message.includes('token') ||
                apiError.message.includes('credential')) {
              return this.forceRedirectToLogin(`Authentication error: ${apiError.message}`);
            }
            // For other errors, don't redirect but log the issue
            log(`🔐 Non-auth API error, continuing: ${apiError.message}`);
          }
        }

        log('🔐 Authentication validation successful');
        return true;
      } catch (error) {
        log(`🔐 Authentication validation error: ${error.message}`);
        return this.forceRedirectToLogin(`Validation error: ${error.message}`);
      }
    }


    // 🔐 FORCE REDIRECT TO LOGIN
    // Clears authentication state and redirects to login with proper cleanup
    this.forceRedirectToLogin = async (reason = 'Authentication required') => {
      try {
        log(`🔐 Forcing redirect to login: ${reason}`);
        
        // Clear authentication state
        this.setState({
          user: {
            ...this.state.user,
            isAuthenticated: false,
            apiCredentialsFound: false,
            apiKey: null,
            apiSecret: null,
            email: null,
          }
        });

        // Clear API client
        if (this.state.apiClient) {
          this.state.apiClient = null;
        }

        // Stash current state for post-login redirect
        this.stashCurrentState();

        // Show authentication failure message if in development
        if (appTier !== 'prod') {
          console.warn(`🔐 AUTHENTICATION FAILURE: ${reason}`);
        }

        // Redirect to login
        return this.state.changeState('Login');
      } catch (error) {
        log(`🔐 Error in forceRedirectToLogin: ${error.message}`);
        // Fallback to basic login redirect
        return this.state.changeState('Login');
      }
    }


    // 🔐 API ERROR HANDLER
    // Monitors API responses for authentication errors and redirects accordingly
    this.handleAPIError = async (error, context = 'API call') => {
      try {
        log(`🔐 handleAPIError called from: ${context}, error: ${error.message}`);
        
        // Check for authentication-related status codes
        const authErrorCodes = [401, 403];
        const authErrorMessages = ['unauthorized', 'forbidden', 'invalid token', 'expired', 'credential', 'authentication'];
        
        const isAuthError = authErrorCodes.includes(error.status) ||
                           authErrorMessages.some(msg => error.message.toLowerCase().includes(msg));
        
        if (isAuthError) {
          log(`🔐 Detected authentication error in API response: ${error.message}`);
          return this.forceRedirectToLogin(`API authentication error: ${error.message}`);
        }
        
        // For non-auth errors, just log and return the error
        log(`🔐 Non-authentication API error: ${error.message}`);
        return error;
      } catch (handlerError) {
        log(`🔐 Error in handleAPIError: ${handlerError.message}`);
        return error; // Return original error if handler fails
      }
    }


    // 🔐 START AUTHENTICATION MONITORING
    // Periodically checks authentication status and validates credentials
    this.startAuthenticationMonitoring = () => {
      log('🔐 Starting authentication monitoring');
      
      // Clear any existing timer
      if (this.authCheckTimer) {
        clearInterval(this.authCheckTimer);
      }
      
      // Set up periodic authentication check (every 10 minutes, less aggressive)
      this.authCheckTimer = setInterval(async () => {
        try {
          // Only check basic authentication state, not API validity
          if (this.state.user.isAuthenticated && this.state.user.apiCredentialsFound) {
            log('🔐 Performing lightweight periodic authentication check');
            
            // Just verify the basic auth state is consistent
            // Don't make API calls that could trigger false positives
            if (!this.state.apiClient || !this.state.apiClient.apiKey) {
              log('🔐 Periodic check: API client missing, attempting to restore from keychain');
              // Try to restore from stored credentials instead of logging out
              if (this.state.user.apiCredentialsFound) {
                try {
                  await this.autoLoginWithStoredCredentials();
                } catch (restoreError) {
                  log('🔐 Failed to restore credentials during periodic check');
                }
              }
            } else {
              log('🔐 Periodic check: Authentication state appears healthy');
            }
          }
        } catch (error) {
          log(`🔐 Error during periodic authentication check: ${error.message}`);
          // Don't logout on periodic check errors - too disruptive
        }
      }, 10 * 60 * 1000); // Check every 10 minutes (less frequent)
      
      // Also check on app focus/resume events
      if (Platform.OS !== 'web') {
        import('react-native').then(({ AppState }) => {
          this.appStateSubscription = AppState.addEventListener('change', async (nextAppState) => {
            if (nextAppState === 'active' && this.state.user.isAuthenticated) {
              log('🔐 App became active, checking authentication');
              try {
                await this.validateAuthentication('app-resume');
              } catch (error) {
                log(`🔐 Error checking auth on app resume: ${error.message}`);
              }
            }
          });
        });
      }
    }


    // 🔐 STOP AUTHENTICATION MONITORING
    // Cleans up authentication monitoring timers and listeners
    this.stopAuthenticationMonitoring = () => {
      log('🔐 Stopping authentication monitoring');
      
      if (this.authCheckTimer) {
        clearInterval(this.authCheckTimer);
        this.authCheckTimer = null;
      }
      
      if (this.appStateSubscription) {
        this.appStateSubscription.remove();
        this.appStateSubscription = null;
      }
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
      log("Start: choosePIN");
      // Deleting the PIN happens first, because it will affect the flow in subsequent pages.
      await this.state.deletePIN(deleteFromKeychain=true);
      // If the app is locked, and the user has chosen to reset the PIN, then we need to log them out.
      // This ensures that they have to log in before they can choose a new PIN.
      if (this.state.appLocked) {
        await this.state.logout();
      }
      // If user hasn't logged in, they need to do so first.
      if (! this.state.user.isAuthenticated && !bypassAuthentication) {
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


    this.checkForAPICredentials = async () => {
      /*
      - We check if API credentials (API Key and Secret) are stored in the keychain.
      - We don't actually load them into the app's memory here. (We do that only once the user has entered the correct PIN value.)
      - This is async - there will be a slight delay while the data is retrieved.
      -- However: The user would have to be very fast indeed to click a button on the initial BUY page to change to a different state before this completes.
      */
      let credentials = await Keychain.getInternetCredentials(this.state.apiCredentialsStorageKey);
      //log({credentials});
      /* Example result:
      - Note: The username is the API Key and the password is the API Secret.
{
  "credentials": {
    "username": "9goCIpzzw1V8WIOU1dAmVMyb7thF05NUAoZ0QmXcnRy7KLrltcgKMad5",
    "password": "6wiWs6DW0zOsJI3oThk1N5ASMoIwNrqJONDxTAh4Z0Tjr2KArqhAgoOEGRTikYwYkItUPjuvzPlM2bANbckzcPTB",
    "storage": "keychain",
    "server": "API_dev_SolidiMobileApp_t3.solidi.co"
  }
}
      */
      if (credentials) {
        if (_.has(credentials, 'username') && _.has(credentials, 'password')) {
          log(`Stored API credentials (API Key and Secret) found in Keychain (but not loaded into memory).`);
          this.state.user.apiCredentialsFound = true;
          return;
        }
      }
      log(`No API credentials found in Keychain.`);
    }


    this.logout = async (clearStoredCredentials = false) => {
      log(`Start: logout (clearStoredCredentials: ${clearStoredCredentials})`);
      // Note: We don't ever delete the PIN from app memory or from the keychain.
      // Delete user's email and password from memory.
      this.state.user.email = '';
      this.state.user.password = '';
      // Delete user's API Key and Secret from memory only (preserve in keychain for persistent login)
      this.state.apiClient.apiKey = '';
      this.state.apiClient.apiSecret = '';
      
      // Only clear stored credentials if explicitly requested (complete logout)
      if (clearStoredCredentials) {
        log("🔑 Clearing stored credentials for complete logout");
        await Keychain.resetInternetCredentials(this.state.apiCredentialsStorageKey);
        this.state.user.apiCredentialsFound = false;
      } else {
        log("🔑 Preserving stored credentials for persistent login");
        // Keep apiCredentialsFound = true so auto-login can work on next app start
      }
      
      // Set user to 'not authenticated'.
      this.state.user.isAuthenticated = false;
      // Reset AccountReview dismissal flag on logout
      this.state.user.accountReviewDismissed = false;
      
      // Clear user data to prevent cached data from triggering alerts after logout
      console.log('🗑️ Clearing user data on logout to prevent cached status alerts');
      this.state.user.info = {
        user: {},
        user_status: {}
      };
      
      // Clear last visited page (only for complete logout)
      if (clearStoredCredentials) {
        console.log('🗑️ Clearing last visited page for complete logout');
        await this.clearLastVisitedPage();
      }
      
      // Reset the state history and wipe any stashed state.
      this.state.resetStateHistory();
      log("Logout complete.");
      /*
      - Check to see if an original user's credentials are stored.
      - This means that we have logged in as a different user, and are now logging out.
      - We should return to being logged in as the original user.
      */
      let originalUser = this.state.originalUser;
      if (! _.isNil(originalUser.apiKey) && ! _.isNil(originalUser.apiSecret)) {
        if (_.has(originalUser, 'apiKey')) {
          let {apiKey, apiSecret} = originalUser;
          log(`loginAsDifferentUser: Step 4: Load original user's credentials and log in.`);
          log(`loginAsDifferentUser: Step 4: Credentials: ${jd(originalUser)}`);
          this.state.originalUser = {
            apiKey: null,
            apiSecret: null,
          }
          await this.state.loginWithAPIKeyAndSecret({apiKey, apiSecret});
          this.state.changeState('Settings');
          return;
        }
      }
      // Note: The user's data is still actually stored on the phone, when they've logged out. Future: Delete some of it when they log out ? E.g. the user status info.
      // Change to appropriate state after logout
      if (clearStoredCredentials) {
        // Complete logout - go to login page
        this.changeState('Login');
      } else {
        // Regular logout - go to trade page (user can re-authenticate easily)
        this.changeState('Trade');
      }
    }

    // Complete logout - clears all stored credentials and forces re-login
    this.signOutCompletely = async () => {
      log("🔓 Complete sign out - clearing all stored credentials");
      await this.logout(true); // Pass true to clear stored credentials
    }


    this.lockApp = () => {
      log("Start: lockApp");
      this.state.appLocked = true;
      // Note: cancelTimers calls resetLockAppTimer.
      this.cancelTimers();
      this.abortAllRequests();
      this.state.stashCurrentState();
      this.state.authenticateUser();
    }


    this.resetLockAppTimer = async () => {
      log(`Begin: resetLockAppTimer()`);
      let currentTimerID = this.state.lockAppTimerID;
      //log(`- currentTimerID = ${currentTimerID}`);
      // If there's an active timer, stop it.
      if (! _.isNil(currentTimerID)) {
        clearTimeout(currentTimerID);
      }
      let waitTimeMinutes = 30;
      let waitTimeSeconds = waitTimeMinutes * 60;
      let lockAppTimer = () => {
        log(`Begin: lockAppTimer() - (${waitTimeMinutes} minutes)`);
        let msg = `lockAppTimer has finished.`;
        // Don't lock app if user has logged out already.
        if (this.state.user.isAuthenticated === false) {
          log(`${msg} The app is in a logged-out state. Resetting timer and exiting here.`);
          this.state.resetLockAppTimer();
          return;
        }
        // Don't lock app if we're currently on the PIN page.
        if (this.state.mainPanelState === 'PIN') {
          log(`${msg} The app is already on the PIN page. Resetting timer and exiting here.`);
          this.state.resetLockAppTimer();
          return;
        }
        // Lock the app.
        log(`${msg} Conditions met for locking the app. Calling lockApp().`);
        this.state.lockApp();
      }
      // Start new timer.
      let timerID = setTimeout(lockAppTimer, waitTimeSeconds * 1000);
      this.state.lockAppTimerID = timerID;
      //log(`- newTimerID = ${timerID}`);
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
      let {mainPanelState, pageName} = this.state;
      this.state.previousState = {mainPanelState, pageName};
      this.cancelTimers();
      this.abortAllRequests();
      this.state.changeState('Error');
    }

    // 🔧 ERROR STATE RECOVERY
    // Allow users to escape from error state back to login
    this.recoverFromErrorState = async () => {
      try {
        log('🔧 Recovering from error state');
        
        // Clear error state
        this.state.error.message = '';
        
        // Clear authentication state to ensure clean login
        this.setState({
          user: {
            ...this.state.user,
            isAuthenticated: false,
            apiCredentialsFound: false,
            apiKey: null,
            apiSecret: null,
            email: null,
          }
        });

        // Clear API client
        this.state.apiClient = null;
        
        // Clear any stored credentials that might be causing issues
        try {
          await Keychain.resetInternetCredentials(this.state.apiCredentialsStorageKey);
          log('🔧 Cleared potentially problematic stored credentials');
        } catch (keychainError) {
          log(`🔧 Could not clear keychain: ${keychainError.message}`);
        }
        
        // Cancel any ongoing timers
        this.cancelTimers();
        
        // Go to login state
        this.state.changeState('Login');
        log('🔧 Successfully recovered from error state');
        
        return true;
      } catch (error) {
        log(`🔧 Error during recovery: ${error.message}`);
        // If recovery fails, at least try to get to login
        this.state.changeState('Login');
        return false;
      }
    }




    /* Non API network methods */


    this.loadTerms = async() => {
      let terms = "";
      if (developmentModeBypass) {
        log(`loadTerms: Using sample data (development mode bypass enabled)`);
        terms = sampleData.terms;
      } else {
        let {domain} = this.state;
        let url = "https://"+domain+"/legal/terms.txt";
        log(`Loading terms from ${url}`);
        try {
          const response = await fetch(url);
          //lj(response);
          if (response.ok) {
            terms = await response.text();
          }
        } catch (error) {
          log(`Failed to load terms, using sample data: ${error.message}`);
          terms = sampleData.terms;
        }
      }
      this.state.apiData.terms['general'] = terms;
    }




    /* Public API methods */


    this.setMaintenanceMode = (inMaintenanceMode) => {
      log(`Setting maintenance mode to ${inMaintenanceMode}`);
      this.setState({maintenanceMode: inMaintenanceMode});
    }

    this.checkMaintenanceMode = async (callback=null) => {
      // Check if we can connect to Solidi.
      let data = await this.state.publicMethod({
        functionName: 'loadAPIVersion',
        apiRoute: 'api_latest_version',
        httpMethod: 'GET',
      });
      if (data.error==503) {
        if(!this.state.maintenanceMode) {
            this.state.setMaintenanceMode(true);
        }
      } else {
        this.state.setMaintenanceMode(false);
      }
      if(callback) {
        callback(this.state.maintenanceMode);
      }
      return this.state.maintenanceMode;
    }


    this.checkIfAppUpdateRequired = async () => {
      let fName = 'checkIfAppUpdateRequired';
      
      // Use sample data in development mode to bypass network issues
      let data;
      if (developmentModeBypass) {
        log(`${fName}: Using sample data (development mode bypass enabled)`);
        data = sampleData.appVersion;
      } else {
        data = await this.state.publicMethod({
          functionName: fName,
          apiRoute: 'app_latest_version',
          httpMethod: 'GET',
        });
        if (data == 'DisplayedError') return;
      }
      
      let expectedKeys = 'version minimumVersionRequired'.split(' ');
      let foundKeys = _.keys(data);
      if (! _.isEqual(_.intersection(expectedKeys, foundKeys), expectedKeys)) {
        if (developmentModeBypass) {
          log(`${fName}: Using fallback sample data due to missing keys`);
          data = sampleData.appVersion;
        } else {
          var msg = `${fName}: Missing expected key(s) in response data from API endpoint '/app_latest_version'. Expected: ${jd(expectedKeys)}; Found: ${jd(foundKeys)}`;
          return this.state.switchToErrorState({message: msg});
        }
      }
      let latestAppVersion = data.version;
      var msg = `Internal app version: ${appVersion} (build number ${appBuildNumber}). Latest app version specified on Solidi API (${appTier}): ${latestAppVersion}`;
      deb(msg);
      let os = Platform.OS;
      let minimumVersionRequiredIos = data.minimumVersionRequired.ios.version;
      let minimumVersionRequiredAndroid = data.minimumVersionRequired.android.version;
      var msg = `Minimum version required for iOS: ${minimumVersionRequiredIos}. Minimum version required for Android: ${minimumVersionRequiredAndroid}.`;
      deb(msg);
      let minimumVersionRequired = 'Error';
      if (os == 'ios') {
        minimumVersionRequired = minimumVersionRequiredIos;
      } else if (os == 'android') {
        minimumVersionRequired = minimumVersionRequiredAndroid;
      }
      var msg = `Platform OS: ${os}. Minimum version required = ${minimumVersionRequired}.`;
      deb(msg);
      let updateRequired = semver.gt(minimumVersionRequired, appVersion);
      //updateRequired = true; // dev
      log(`Update required: ${updateRequired}`);
      if (updateRequired) {
        this.setState({appUpdateRequired: true});
        this.state.changeState('UpdateApp');
      }
    }


    this.loadLatestAPIVersion = async () => {
      let data;
      if (developmentModeBypass) {
        log(`loadAPIVersion: Using sample data (development mode bypass enabled)`);
        data = sampleData.apiVersion;
      } else {
        data = await this.state.publicMethod({
          functionName: 'loadAPIVersion',
          apiRoute: 'api_latest_version',
          httpMethod: 'GET',
        });
        if (data == 'DisplayedError') return;
      }
      
      let api_latest_version = _.has(data, 'api_latest_version') ? data.api_latest_version : null;
      this.state.apiData.api_latest_version = api_latest_version;
      log(`Latest API version: ${api_latest_version}`);
    }


    this.checkLatestAPIVersion = () => {
      let storedAPIVersion = this.state.storedAPIVersion;
      let latestAPIVersion = this.state.apiData.api_latest_version;
      if (! misc.isNumericString(latestAPIVersion)) return false;
      let check = latestAPIVersion !== storedAPIVersion;
      if (check) {
        this.setState({appUpdateRequired: true});
      }
      let msg = `apiVersion in app: ${storedAPIVersion}. Latest apiVersion from API data: ${latestAPIVersion}. Update required = ${check}`;
      log(msg);
      return check;
    }


    this.loadAssetsInfo = async () => {
      let data;
      if (developmentModeBypass) {
        log(`loadAssetsInfo: Using sample data (development mode bypass enabled)`);
        // Convert sample assets array to object format expected by the app
        data = {};
        sampleData.assets.forEach(asset => {
          data[asset.key] = {
            name: asset.name,
            type: asset.group,
            decimalPlaces: asset.decimal_places,
            displaySymbol: asset.key,
            displayString: `${asset.key} (${asset.name})`,
            addressProperties: asset.key === 'BTC' ? ['address'] : asset.key === 'ETH' ? ['address'] : ['accountName', 'sortCode', 'accountNumber'],
            depositEnabled: 1,
            withdrawEnabled: 1,
            confirmationsRequired: asset.key === 'BTC' ? 3 : asset.key === 'ETH' ? 30 : 1
          };
        });
      } else {
        data = await this.state.publicMethod({
          httpMethod: 'GET',
          apiRoute: 'asset_info',
          params: {},
        });
      }
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
      // For now, we're going to treat ETH as if it only has 8 decimal places, instead of 18.
      if (_.has(data, 'ETH')) {
        data.ETH.decimalPlaces = 8;
      }
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
      let data;
      if (developmentModeBypass) {
        log(`loadMarkets: Using sample data (development mode bypass enabled)`);
        data = sampleData.markets.map(market => `${market.asset1}/${market.asset2}`);
      } else {
        data = await this.state.publicMethod({
          httpMethod: 'GET',
          apiRoute: 'market',
          params: {},
        });
        if (data == 'DisplayedError') return;
      }
      
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

      // Intialise the historic prices
      for(var idx in data) {
        this.state.apiData.historic_prices[data[idx]] = {};
        for(var idx2 in graph_periods) {
          this.state.apiData.historic_prices[data[idx]][graph_periods[idx2]] = [0];
        }
      }

      this.state.apiData.historic_prices['current'] = this.state.apiData.historic_prices["BTC/GBP"]["1D"];
      await this.loadHistoricPrices({market:"BTC/GBP",period:"1D"});
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
      // Only include quote assets that appear in the asset info list.
      let assetsInfo = this.getAssetsInfo();
      baseAssets = baseAssets.filter(x => _.has(assetsInfo, x));
      return _.uniq(baseAssets);
    }


    this.getQuoteAssets = () => {
      let markets = this.getMarkets();
      let quoteAssets = markets.map(x => x.split('/')[1]);
      // Only include quote assets that appear in the asset info list.
      let assetsInfo = this.getAssetsInfo();
      quoteAssets = quoteAssets.filter(x => _.has(assetsInfo, x));
      return _.uniq(quoteAssets);
    }


    this.loadPersonalDetailOptions = async () => {
      let data = await this.state.publicMethod({
        functionName: 'loadPersonalDetailOptions',
        httpMethod: 'GET',
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

    // Load live crypto prices from CoinGecko API
    this.loadCoinGeckoPrices = async () => {
      try {
        log('Loading live prices from CoinGecko...');
        const coinGeckoData = await this.state.coinGeckoAPI.getSolidiAssetPrices();
        
        if (coinGeckoData) {
          // Merge CoinGecko data with existing ticker data
          const existingTicker = this.state.apiData.ticker || {};
          const mergedData = { ...existingTicker };
          
          // Add CoinGecko prices with additional metadata
          Object.keys(coinGeckoData).forEach(market => {
            mergedData[market] = {
              ...mergedData[market],
              price: coinGeckoData[market].price,
              change_24h: coinGeckoData[market].change_24h,
              last_updated: coinGeckoData[market].last_updated,
              source: 'coingecko'
            };
          });
          
          // Update ticker data
          this.state.prevAPIData.ticker = this.state.apiData.ticker;
          this.state.apiData.ticker = mergedData;
          
          log(`CoinGecko prices loaded for ${Object.keys(coinGeckoData).length} markets`);
          return mergedData;
        } else {
          log('No CoinGecko data received, using existing ticker data');
          return this.state.apiData.ticker;
        }
      } catch (error) {
        log(`Error loading CoinGecko prices: ${error.message}`);
        return this.state.apiData.ticker;
      }
    }

    // Enhanced ticker loading with CoinGecko fallback
    this.loadTickerWithCoinGecko = async () => {
      try {
        // Try Solidi API first
        const solidiData = await this.loadTicker();
        
        // If Solidi API fails or returns limited data, supplement with CoinGecko
        if (!solidiData || Object.keys(solidiData).length < 2) {
          log('Solidi ticker data limited, supplementing with CoinGecko...');
          return await this.loadCoinGeckoPrices();
        }
        
        // If Solidi API works, optionally still get CoinGecko for additional data
        if (developmentModeBypass) {
          const coinGeckoData = await this.state.coinGeckoAPI.getSolidiAssetPrices();
          if (coinGeckoData) {
            // Add 24h change data from CoinGecko to Solidi prices
            Object.keys(coinGeckoData).forEach(market => {
              if (solidiData[market]) {
                solidiData[market].change_24h = coinGeckoData[market].change_24h;
                solidiData[market].coingecko_price = coinGeckoData[market].price;
              }
            });
          }
        }
        
        return solidiData;
      } catch (error) {
        log(`Error in loadTickerWithCoinGecko: ${error.message}`);
        // Fallback to CoinGecko only
        return await this.loadCoinGeckoPrices();
      }
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

    this.loadHistoricPrices = async({market, period}) => {
      //this.state.loadingPrices = true;
      this.setState({loadingPrices: true});
      let {domain} = this.state;
      let remotemarket = market.replace("/","-");
      let url = "https://"+domain+"/"+remotemarket+"-"+period+".csv";
      log(`Loading prices from ${market} ${url}`);
      const response = await fetch(url);
      let prices = "";
      if(response.ok) {
        prices = await response.text();
      }
      pricesX = prices.split("\n");
      if(pricesX.length> 2) {
        let floatPrices = [];
        for(var idx in pricesX) {
          if(pricesX[idx]!="") {
            floatPrices.push(parseFloat(pricesX[idx]));
          }
        }
        log("Saving "+market+" "+period);
        this.setHistoricPrices({market, period, prices:floatPrices});
        this.setState({graphPrices: floatPrices});
      } else {
        log(`Waring - got less than 2 prices for ${market} (${period})`);
      }
      this.setState({loadingPrices: false});
    }

    this.setHistoricPrices = ({market, period, prices}) => {
      let historic_prices = this.state.apiData.historic_prices;
      try {
        if(historic_prices[market]==undefined || historic_prices[market][period]==undefined) {
          historic_prices[market][period] = [1];
        } else {
          historic_prices[market][period] = prices;
        }
        historic_prices['current'] = historic_prices[market][period];
        this.setState({historic_prices});
      } catch (e) {
        logger.error(e.stack);
      }
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
      if (_.isNil(asset) || asset === '') {
        if (value != '[loading]') {
          deb(`${functionName}.getFullDecimalValue: asset '${asset}' is null or undefined or empty.`);
        }
        return '';
      }
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


    this.loadAssetsIcons = async () => {
      let data;
      if (developmentModeBypass) {
        log(`loadAssetsIcons: Using local icons (development mode bypass enabled)`);
        // Use local image files instead of base64 from server
        data = {};
        sampleData.assets.forEach(asset => {
          data[asset.key] = null; // Will fallback to local images in components
        });
      } else {
        data = await this.state.publicMethod({
          functionName: 'loadAssetsIcons',
          apiRoute: 'asset_icon',
          httpMethod: 'GET',
        });
        if (data == 'DisplayedError') return;
      }
      
      // The data is in base64. It turns out that an <Image/> can accept a base64 source, so need to convert it back to a bitmap.
      let loadedAssetsIcons = _.keys(data);
      // If the data differs from existing data, save it.
      let msg = `Asset icons loaded: ${loadedAssetsIcons.join(', ')}.`;
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
      // Future: If the security check results are negative, stop.
      await this.loadSecurityChecks();
      if (! this.state.assetsInfoLoaded) {
        // This is needed for loading the deposit details & the default account.
        await this.state.loadAssetsInfo();
        this.state.assetsInfoLoaded = true;
      }
      // The following information can be changed by the user while the app is in use, so we reload it every time this function is called.
      await this.loadUserInfo();
      await this.loadUserStatus();
      await this.loadPersonalDetailOptions(); // Load dropdown options for Personal Details page
      await this.loadDepositDetailsForAsset('GBP');
      await this.loadDefaultAccountForAsset('GBP');
    }

    // LEVEL 2 VALIDATION: Check user status and return redirect target 
    this.checkUserStatusRedirect = async () => {
      try {
        console.log('🔍 [LEVEL 2] Checking user status for form completion requirements...');
        
        // ===== AUTHENTICATION CHECKS FIRST =====
        // 1. Check if user is properly authenticated and logged in
        if (!this.state.user.isAuthenticated) {
          console.log('🔒 [LEVEL 2] User not authenticated - redirecting to Login');
          return 'Login';
        }
        
        if (!this.state.user.apiCredentialsFound) {
          console.log('🔒 [LEVEL 2] No API credentials found - redirecting to Login');
          return 'Login';
        }
        
        // 2. Check for credential expiry (if applicable)
        // Add any credential expiry logic here if needed
        
        console.log('✅ [LEVEL 2] Authentication valid - checking user status...');
        
        // Check if user has dismissed AccountReview modal
        if (this.state.user.accountReviewDismissed) {
          console.log('🚫 [LEVEL 2] User has dismissed AccountReview modal - skip redirect');
          return null;
        }
        
        const user = this.state.user?.info?.user;
        
        // Only proceed if we have actual user data from the server
        if (!user || !user.email) {
          console.log('📭 [LEVEL 2] User data not loaded yet - skipping user status check');
          return null;
        }
        
        const userCat = user?.cat;
        const userAppropriate = user?.appropriate;
        
        console.log('👤 User status check:', {
          userAvailable: !!user,
          email: user?.email,
          cat: userCat,
          appropriate: userAppropriate,
          accountReviewDismissed: this.state.user.accountReviewDismissed
        });

        // ===== CATEGORIZATION STATUS CHECKING =====
        
        // 3. Check if user has 'cat' value and 'appropriate' status
        // Use RegistrationCompletion to show timeline and handle form progression
        if (userCat === null || userCat === undefined) {
          console.log('📋 [LEVEL 2] User cat is null - requires categorisation, redirecting to RegistrationCompletion');
          return 'RegistrationCompletion';
        }

        // 4. If cat is not null, check appropriate status
        if (userAppropriate === 'TBD') {
          console.log('📋 [LEVEL 2] User appropriate is TBD - requires suitability form, redirecting to RegistrationCompletion');
          return 'RegistrationCompletion';
        }
        
        if (userAppropriate === 'FAILED1') {
          console.log('📋 [LEVEL 2] User appropriate is FAILED1 - requires suitability2 form, redirecting to RegistrationCompletion');
          return 'RegistrationCompletion';
        }
        
        if (userAppropriate === 'FAILED2') {
          console.log('⚠️ [LEVEL 2] User appropriate is FAILED2 - checking coolEnd time');
          
          // Check coolEnd time for 24-hour wait
          const coolEnd = user?.coolend;
          console.log('User coolEnd:', coolEnd);
          
          if (coolEnd) {
            const coolEndTime = new Date(coolEnd);
            const currentTime = new Date();
            console.log('CoolEnd time:', coolEndTime.toISOString());
            console.log('Current time:', currentTime.toISOString());
            
            if (currentTime < coolEndTime) {
              const waitTimeMs = coolEndTime.getTime() - currentTime.getTime();
              const waitHours = Math.ceil(waitTimeMs / (1000 * 60 * 60));
              console.log(`⏰ Still in cooling period. Wait ${waitHours} more hours`);
              
              // Show popup and force logout
              Alert.alert(
                '24 Hour Wait Required',
                `You need to wait until ${coolEndTime.toLocaleString()} before you can take the test again. (${waitHours} hours remaining)`,
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      console.log('🚪 User confirmed popup - forcing logout');
                      this.logout();
                    }
                  }
                ],
                { cancelable: false }
              );
              return 'Login'; // Will be handled by logout
            } else {
              console.log('✅ [LEVEL 2] Cooling period has ended - proceeding to RegistrationCompletion');
              return 'RegistrationCompletion';
            }
          } else {
            console.log('⚠️ [LEVEL 2] No coolEnd time found - proceeding to RegistrationCompletion');
            return 'RegistrationCompletion';
          }
        }
        
        if (userAppropriate === 'PASS' || userAppropriate === 'PASSED') {
          console.log('🎉 [LEVEL 2] User appropriate is PASS - registration complete!');
          return null; // No redirect needed, user can proceed normally
        }

        // If we reach here, it's an unexpected state
        console.log('⚠️ [LEVEL 2] Unexpected user state - cat:', userCat, 'appropriate:', userAppropriate);
        
        // Default to no redirect for unexpected states to avoid infinite loops
        return null;

      } catch (error) {
        console.error('❌ Error in checkUserStatusRedirect:', error);
        console.error('❌ Stack trace:', error.stack);
        // Return null to avoid infinite redirect loops
        return null;
      }
    };

    // Helper function to determine if user should use RegistrationCompletion flow
    this.shouldUseRegistrationCompletion = async () => {
      try {
        console.log('🔍 Checking if user should use RegistrationCompletion flow...');
        
        // Check if this is a new registration that needs to complete verification steps
        const isNewRegistration = this.state.registrationSuccess || 
                                 this.state.registrationEmail ||
                                 !this.state.user.emailVerified ||
                                 !this.state.user.phoneVerified;
        
        if (isNewRegistration) {
          console.log('📝 New registration detected - use RegistrationCompletion');
          return true;
        }
        
        // For existing users, check if they need extra_information step
        // by checking if extra_information/check has options loaded
        try {
          const extraInfoData = await this.state.privateMethod({
            functionName: 'checkExtraInformation',
            apiRoute: 'user/extra_information/check',
            params: {}
          });
          
          console.log('📊 Extra information check result:', extraInfoData);
          
          // If extra_information/check has no options loaded -> step 4 (direct AccountReview)
          // If extra_information/check has options -> step 3 (RegistrationCompletion)
          if (!extraInfoData || !Array.isArray(extraInfoData) || extraInfoData.length === 0) {
            console.log('📋 No extra information options - direct to step 4 (AccountReview)');
            return false; // Direct AccountReview
          } else {
            console.log('📋 Extra information options found - step 3 (RegistrationCompletion)');
            return true; // RegistrationCompletion flow
          }
          
        } catch (error) {
          console.log('⚠️ Error checking extra information:', error.message);
          // Default to RegistrationCompletion for safety
          return true;
        }
        
      } catch (error) {
        console.error('❌ Error in shouldUseRegistrationCompletion:', error);
        // Default to RegistrationCompletion for safety
        return true;
      }
    };

    // Mark AccountReview modal as dismissed to prevent repeated popups
    this.dismissAccountReview = () => {
      console.log('🚫 Marking AccountReview as dismissed');
      this.changeState({
        user: {
          ...this.state.user,
          accountReviewDismissed: true
        }
      });
    }

    // Check post-login navigation requirements based on user data
    this.checkPostLoginNavigation = async () => {
      try {
        console.log('🔍 Checking post-login navigation requirements...');
        
        // Use the shared user status check logic
        const redirectTarget = await this.checkUserStatusRedirect();
        
        if (redirectTarget) {
          console.log('✅ Post-login navigation needed - redirecting to:', redirectTarget);
          this.changeState(redirectTarget);
        } else {
          console.log('ℹ️ No special post-login navigation required - user can proceed normally');
        }

      } catch (error) {
        console.error('❌ Error in checkPostLoginNavigation:', error);
        console.error('❌ Stack trace:', error.stack);
        // Continue normal flow if there's an error
        console.log('⚠️ Error occurred, continuing normal flow');
      }
    }

    this.loadUserInfo = async () => {
      /* Sample output:
      {"error":null,"data":{"address_1":"1830 Somwhere Rd","address_2":"Over, The Rainbow","address_3":"Cambridgeshire","address_4":null,"bankLimit":"30.00","btcLimit":"30.00000000","citizenship":"GB","country":"GB","cryptoLimit":"30.00","dateOfBirth":"04/04/1990","email":"johnqfish@foo.com","firstName":"John ...
 LOG  5:54:17 PM |  AppState  | INFO : User info (basic) loaded from server. New data saved to appState. {"address_1":"1830 Somwhere Rd","address_2":"Over, The Rainbow","address_3":"Cambridgeshire","address_4":null,"bankLimit":"30.00","btcLimit":"30.00000000","citizenship":"GB","country":"GB","cryptoLimit":"30.00","dateOfBirth":"04/04/1990","email":"johnqfish@foo.com","firstName":"John","freeWithdraw":0,"gender":"Male","landline":null,"lastName":"Fish","middleNames":"Q","mobile":null,"monthBankLimit":"30.00","monthBtcLimit":"30.00000000","monthCryptoLimit":"30.00000000","postcode":"ZZ11BB","title":null,"uuid":"72ca4f54-3447-4345-848d-1765d825f28d","yearBankLimit":"200.00","yearBtcLimit":"200.00000000","yearCryptoLimit":"200.00000000"}

      field names:
      uuid email firstname lastname gender dob btc_limit bank_limit crypto_limit freewithdraw address_1 address_2 address_3 address_4 postcode country citizenship mon_btc_limit mon_bank_limit mon_crypto_limit year_btc_limit year_bank_limit year_crypto_limit title mobile landline
      */
      let data = await this.state.privateMethod({
        functionName: 'loadUserInfo',
        apiRoute: 'user',
      });
      if (data == 'DisplayedError') return false;
      // If the data differs from existing data, save it.
      let msg = "User info (basic) loaded from server.";
      if (jd(data) === jd(this.state.user.info.user)) {
        log(msg + " No change.");
      } else {
        log(msg + " New data saved to appState. " + jd(data));
        this.state.user.info.user = data;
      }
      
      // ===== DETAILED USER OBJECT LOGGING =====
      console.log('👤 ===== COMPLETE USER OBJECT AFTER LOGIN =====');
      console.log('🆔 User UUID:', data.uuid || 'NOT_PROVIDED');
      console.log('📧 Email:', data.email || 'NOT_PROVIDED');
      console.log('👨‍💼 Full Name:', `${data.firstName || ''} ${data.middleNames || ''} ${data.lastName || ''}`.trim() || 'NOT_PROVIDED');
      console.log('🎂 Date of Birth:', data.dateOfBirth || 'NOT_PROVIDED');
      console.log('⚧ Gender:', data.gender || 'NOT_PROVIDED');
      console.log('🌍 Citizenship:', data.citizenship || 'NOT_PROVIDED');
      console.log('🏠 Address:', `${data.address_1 || ''}, ${data.address_2 || ''}, ${data.address_3 || ''}, ${data.postcode || ''}`.replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '') || 'NOT_PROVIDED');
      console.log('📱 Mobile:', data.mobile || 'NOT_PROVIDED');
      console.log('📞 Landline:', data.landline || 'NOT_PROVIDED');
      console.log('💰 Bank Limit:', data.bankLimit || 'NOT_PROVIDED');
      console.log('₿ BTC Limit:', data.btcLimit || 'NOT_PROVIDED');
      console.log('🔐 Crypto Limit:', data.cryptoLimit || 'NOT_PROVIDED');
      console.log('🎁 Free Withdraw:', data.freeWithdraw || 'NOT_PROVIDED');
      console.log('📊 Monthly Bank Limit:', data.monthBankLimit || 'NOT_PROVIDED');
      console.log('📊 Monthly BTC Limit:', data.monthBtcLimit || 'NOT_PROVIDED');
      console.log('📊 Monthly Crypto Limit:', data.monthCryptoLimit || 'NOT_PROVIDED');
      console.log('📈 Yearly Bank Limit:', data.yearBankLimit || 'NOT_PROVIDED');
      console.log('📈 Yearly BTC Limit:', data.yearBtcLimit || 'NOT_PROVIDED');
      console.log('📈 Yearly Crypto Limit:', data.yearCryptoLimit || 'NOT_PROVIDED');
      console.log('🔍 COMPLETE USER DATA JSON:');
      console.log(JSON.stringify(data, null, 2));
      console.log('👤 ===== END USER OBJECT LOGGING =====');
      // ===== DETAILED USER OBJECT LOGGING END =====
      
      return true;
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


    this.loadUserStatus = async () => {
      /* Sample output:
      {"active":true,"addressConfirmed":true,"addressVerificationRequested":false,"addressVerificationSent":false,"bankAccountConfirmed":false,"cryptoWithdrawDisabled":false,"deactivated":false,"feature1":false,"feature2":false,"feature3":false,"feature4":false,"identityChecked":true,"new":false,"newBank":false,"phoneConfirmed":false,"seller":false,"sellerAutomated":false,"sellerManual":false,"superuser":false,"supportLevel1":false,"supportLevel2":false,"withdrawDisabled":false}
      */
      let data = await this.state.privateMethod({
        functionName: 'loadUserStatus',
        apiRoute: 'user_status',
      });
      if (data == 'DisplayedError') return false;
      // If the data differs from existing data, save it.
      let msg = "User status data loaded from server.";
      if (jd(data) === jd(this.state.user.info.user_status)) {
        log(msg + " No change.");
      } else {
        log(msg + " New data saved to appState. " + jd(data));
        this.state.user.info.user_status = data;
      }
      return true;
    }


    this.getUserStatus = (detail) => {
      let details = this.state.user.info.user_status;
      if (! _.has(details, detail)) {
        return '[loading]';
      }
      return details[detail];
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
      /*
      - Example result for GBP:
      {
        "sortCode": "040476",
        "accountNumber": "00001036",
        "accountName": "Solidi",
        "reference": "SHMPQKC"
      }

      - Example error result:
      {"error":"Could not retrieve deposit details"}
      */
      // If an error occurs, we don't raise it here. There are many currencies. At any given time, a coin subsystem may be down, and the server won't be able to return deposit details for it. This shouldn't cause the app to completely halt. Handle the lack of deposit details on the relevant page.
     let details = data;
      
      // Initialize depositDetails if it doesn't exist
      if (!this.state.user.info.depositDetails) {
        this.state.user.info.depositDetails = {};
      }
      
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
      console.log(`🏦 [BANK ACCOUNT LOAD] Loading account for asset: ${asset}`);
      
      if (_.isNil(asset)) { console.error(`${funcName}: Asset required`); return; }
      let assets = this.state.getAssets();
      if (! assets.includes(asset)) { console.log(`${funcName}: ERROR: Unrecognised asset: ${asset}`); return; }
      let data = await this.state.privateMethod({
        functionName: 'loadDefaultAccountForAsset',
        apiRoute: `default_account/${asset}`,
      });
      if (data == 'DisplayedError') return;
      
      console.log(`🏦 [BANK ACCOUNT LOAD] Received data:`, data);
      
      // Example result for GBP:
      /*
      {"accountName":"Mr John Q Fish, Esq","sortCode":"83-44-05","accountNumber":"55566677"}
      */
      // If the data differs from existing data, save it.
      let account = data;
      let msg = `Default account for asset=${asset} loaded from server.`;
      
      // Initialize defaultAccount if it doesn't exist
      if (_.isUndefined(this.state.user.info.defaultAccount)) {
        this.state.user.info.defaultAccount = {};
      }
      
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
      console.log(`🏦 [BANK ACCOUNT UPDATE] Starting update for asset: ${asset}`);
      console.log(`🏦 [BANK ACCOUNT PARAMS]`, params);
      
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
        let msg = `Updated ${asset} default account with parameters = ${JSON.stringify(params)}`;
        console.log(`✅ [BANK ACCOUNT SUCCESS] ${msg}`);
        log(msg);
        // Save data in local storage.
        // Initialize defaultAccount if it doesn't exist
        if (_.isUndefined(this.state.user.info.defaultAccount)) {
          this.state.user.info.defaultAccount = {};
        }
        this.state.user.info.defaultAccount[asset] = params;
      }
      if (_.has(data, 'error')) {
        let msg = `Error returned from API request: ${JSON.stringify(data.error)}`;
        console.error(`❌ [BANK ACCOUNT ERROR] ${msg}`);
        logger.error(msg);
      }
      console.log(`🏦 [BANK ACCOUNT UPDATE] Complete. Final result:`, data);
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
      
      // Enhanced logging for buy order comparison
      console.log('\n' + '🟢'.repeat(60));
      console.log('🚨 BUY ORDER DEBUG - ENHANCED LOGGING 🚨');
      console.log(`📊 Buy Order Parameters:`);
      console.log(`   market: ${market}`);
      console.log(`   baseAssetVolume: ${volumeBA}`);
      console.log(`   quoteAssetVolume: ${volumeQA}`);
      console.log(`   orderType: ${orderType}`);
      console.log(`   paymentMethod: ${paymentMethod}`);
      console.log(`🔍 Original buyOrder object:`, buyOrder);
      console.log('🟢'.repeat(60));
      
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
      
      // Enhanced response logging
      console.log('\n' + '🌟'.repeat(60));
      console.log('🚨 BUY ORDER RESPONSE - ENHANCED LOGGING 🚨');
      console.log(`📥 Response data:`, data);
      console.log('🌟'.repeat(60));
      
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
  "details": "ID_REQUIRED",
  "tradeids": []
}

      */
      // Store the orderID.
      if (data.orderID) {
        log(`sendBuyOrder orderID: ${data.orderID}`);
        this.state.panels.buy.orderID = data.orderID;
      }
      // Store the settlementID.
      if (data.settlements) {
        // Hacky: Choose the first settlement.
        // Future: Under what conditions would there be two settlements ?
        // - And, if we're making a payment via openbanking, which one do we use to retrieve an openbanking payment URL ?
        let settlement = data.settlements[0];
        settlementID = settlement.settlementID;
        this.state.panels.buy.settlementID = settlementID;
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
      
      // Enhanced logging for sell order debugging
      console.log('\n' + '🔴'.repeat(60));
      console.log('🚨 SELL ORDER DEBUG - ENHANCED LOGGING 🚨');
      console.log(`📊 Sell Order Parameters:`);
      console.log(`   market: ${market}`);
      console.log(`   baseAssetVolume: ${volumeBA}`);
      console.log(`   quoteAssetVolume: ${volumeQA}`);
      console.log(`   orderType: ${orderType}`);
      console.log(`   paymentMethod: ${paymentMethod}`);
      console.log(`🔍 Original sellOrder object:`, sellOrder);
      console.log('🔴'.repeat(60));
      
      // Try the new format first (same as buy orders)
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
      
      // Enhanced response logging
      console.log('\n' + '📡'.repeat(60));
      console.log('🚨 SELL ORDER RESPONSE (NEW FORMAT) - ENHANCED LOGGING 🚨');
      console.log(`📥 Response data:`, data);
      console.log('📡'.repeat(60));
      
      // If the new format fails, try the old format that was shown in API testing
      if (data && data.error && data.error.includes('Could not execute SELL order')) {
        console.log('\n' + '🔄'.repeat(60));
        console.log('🚨 TRYING OLD FORMAT PARAMETERS FOR SELL ORDER 🚨');
        
        // Calculate price from volumes (price = quoteAssetVolume / baseAssetVolume)
        let price = (parseFloat(volumeQA) / parseFloat(volumeBA)).toString();
        let currency_pair = `${assetBA.toLowerCase()}_${assetQA.toLowerCase()}`;
        
        console.log(`📊 Old Format Parameters:`);
        console.log(`   amount: ${volumeBA}`);
        console.log(`   price: ${price}`);
        console.log(`   currency_pair: ${currency_pair}`);
        console.log('🔄'.repeat(60));
        
        data = await this.state.privateMethod({
          httpMethod: 'POST',
          apiRoute: 'sell',
          params: {
            amount: volumeBA,
            price: price,
            currency_pair: currency_pair,
          },
          functionName: 'sendSellOrder_oldFormat',
        });
        
        console.log('\n' + '⚡'.repeat(60));
        console.log('🚨 SELL ORDER RESPONSE (OLD FORMAT) - ENHANCED LOGGING 🚨');
        console.log(`📥 Response data:`, data);
        console.log('⚡'.repeat(60));
      }
      
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
        log(`sendSellOrder OrderID: ${data.orderID}`);
        this.state.panels.sell.orderID = data.orderID;
      }
      return data;
    }


    this.loadFees = async () => {
      // For now, we only load withdrawal fees.
      // Fee API requires authentication, so use privateMethod
      console.log('🔄 loadFees: Starting fee loading...');
      console.log('🔍 loadFees: Calling privateMethod with apiRoute: fee');
      
      let response = await this.state.privateMethod({apiRoute:'fee'});
      console.log('📨 loadFees: Raw response:', response);
      
      if (response == 'DisplayedError') {
        console.log('❌ loadFees: Got DisplayedError from privateMethod');
        return;
      }
      
      if (!response) {
        console.log('❌ loadFees: No response from privateMethod');
        return;
      }
      
      // Extract data from API response structure
      // The response IS the data directly from privateMethod
      let data = response;
      console.log('📊 loadFees: Using response as data:', data);
      
      if (!data) {
        console.error('loadFees: No data found in API response:', response);
        return;
      } 
      
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
        log(`Processing asset ${asset}:`, fees);
        if (fees && fees.withdraw) {
          let lowFee = fees.withdraw.lowFee;
          let mediumFee = fees.withdraw.mediumFee;
          let highFee = fees.withdraw.highFee;
          
          log(`${asset} raw fees - low: ${lowFee}, medium: ${mediumFee}, high: ${highFee}`);
          
          // Only include fees that are positive numbers
          let assetFees = {};
          if (parseFloat(lowFee) > 0) assetFees.low = lowFee;
          if (parseFloat(mediumFee) > 0) assetFees.medium = mediumFee;
          if (parseFloat(highFee) > 0) assetFees.high = highFee;
          
          log(`${asset} processed fees:`, assetFees);
          
          // Only add asset if it has at least one valid fee
          if (Object.keys(assetFees).length > 0) {
            withdrawFees[asset] = assetFees;
          }
        }
      }
      let msg = "Withdrawal fee data loaded from server.";
      
      log("🔍 COMPARISON DEBUG:");
      log("withdrawFees:", withdrawFees);
      log("this.state.fees.withdraw:", this.state.fees.withdraw);
      log("jd(withdrawFees):", jd(withdrawFees));
      log("jd(this.state.fees.withdraw):", jd(this.state.fees.withdraw));
      log("Are they equal?", jd(withdrawFees) === jd(this.state.fees.withdraw));
      
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
      if (priority == 'none') return 'loading';
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


    this.sendWithdraw = async ({asset, volume, address, priority, functionName}) => {
      log(`🔄 sendWithdraw: Starting withdrawal - ${volume} ${asset} to ${address} with priority ${priority}`);
      console.log(`🔄 CONSOLE: sendWithdraw starting - ${volume} ${asset} to ${address} with priority ${priority}`);
      
      try {
        // Prepare parameters according to API documentation
        const params = {
          volume: volume,
          address: address,
          priority: priority
        };

        // Asset-specific parameter handling for GBP
        if (asset === 'GBP') {
          // For GBP withdrawals, use account_id instead of address
          params.account_id = address;
          delete params.address;
          delete params.priority; // GBP doesn't use priority
        }
        
        log('🔍 sendWithdraw: Calling privateMethod with params:', {
          httpMethod: 'POST',
          apiRoute: `withdraw/${asset}`,
          params: params,
          functionName
        });
        console.log('🔍 CONSOLE: About to call privateMethod for withdraw API');
        console.log('🌐 CONSOLE: ===== API ENDPOINT DEBUG =====');
        console.log('🌐 CONSOLE: API Method: POST');
        console.log('🌐 CONSOLE: API Endpoint: withdraw/' + asset);
        console.log('🌐 CONSOLE: Full API URL: https://t2.solidi.co/api2/v1/withdraw/' + asset);
        console.log('📋 CONSOLE: Final API parameters:', JSON.stringify(params, null, 2));
        console.log('🔧 CONSOLE: Asset type:', asset);
        console.log('🔧 CONSOLE: Volume:', volume);
        console.log('🔧 CONSOLE: Address:', address);
        console.log('🔧 CONSOLE: Priority:', priority);
        console.log('🔧 CONSOLE: Function name:', functionName);
        console.log('🌐 CONSOLE: ===== END API ENDPOINT DEBUG =====');
        
        let data = await this.state.privateMethod({
          httpMethod: 'POST',
          apiRoute: `withdraw/${asset}`,
          params: params,
          functionName,
        });
        
        log('📨 sendWithdraw: Raw response from privateMethod:', data);
        console.log('📨 CONSOLE: ===== API WITHDRAW RESPONSE DEBUG =====');
        console.log('📨 CONSOLE: Raw response from privateMethod:', data);
        console.log('📨 CONSOLE: Response type:', typeof data);
        console.log('📨 CONSOLE: Response JSON:', JSON.stringify(data, null, 2));
        console.log('📊 CONSOLE: Response keys:', data ? Object.keys(data) : 'null/undefined');
        if (data && typeof data === 'object') {
          console.log('🔍 CONSOLE: Response properties:');
          console.log('🔍 CONSOLE: - Has error:', 'error' in data, '| Value:', data.error);
          console.log('🔍 CONSOLE: - Has id:', 'id' in data, '| Value:', data.id);
          console.log('🔍 CONSOLE: - Has data:', 'data' in data, '| Value:', data.data);
          console.log('🔍 CONSOLE: - Has success:', 'success' in data, '| Value:', data.success);
          console.log('🔍 CONSOLE: - Has message:', 'message' in data, '| Value:', data.message);
        }
        console.log('📨 CONSOLE: ===== END API RESPONSE DEBUG =====');
        log('📊 sendWithdraw: Response type:', typeof data);
        log('📊 sendWithdraw: Response stringified:', JSON.stringify(data, null, 2));
        
        // COMPREHENSIVE HANDLING FOR WITHDRAW API SUCCESS MESSAGES
        // The withdraw API can return success messages in various formats
        if (data && typeof data === 'object') {
          
          // 1. Check for success messages in the "error" field (common withdraw API behavior)
          if (data.error && typeof data.error === 'string') {
            let errorMessage = data.error.toLowerCase();
            
            // Comprehensive success message detection
            let isSuccessMessage = errorMessage.includes('successfully') || 
                                 errorMessage.includes('queued') ||
                                 errorMessage.includes('withdrawal') ||
                                 errorMessage.includes('processed') ||
                                 errorMessage.includes('submitted') ||
                                 errorMessage.includes('completed') ||
                                 errorMessage.includes('confirmed') ||
                                 errorMessage.includes('sent') ||
                                 (errorMessage.includes('request') && errorMessage.includes('accepted'));
            
            if (isSuccessMessage) {
              console.log('✅ sendWithdraw: Detected success message in error field:', data.error);
              log('✅ sendWithdraw: Converting success message to proper success format:', data.error);
              // Convert to a proper success response format
              return {
                success: true,
                message: data.error,
                id: data.id, // Include ID if present
                originalResponse: data
              };
            }
          }
          
          // 2. Check for responses with ID and no error (classic success format)
          if (data.id && !data.error) {
            console.log('✅ sendWithdraw: Classic success response with ID:', data.id);
            log('✅ sendWithdraw: Classic success response with ID:', data.id);
            // This is already a valid success format, but ensure consistency
            return {
              success: true,
              message: `Withdrawal successful! Transaction ID: ${data.id}`,
              id: data.id,
              originalResponse: data
            };
          }
          
          // 3. Check for explicit success field
          if (data.success === true) {
            console.log('✅ sendWithdraw: Explicit success response');
            log('✅ sendWithdraw: Explicit success response');
            return data; // Already in correct format
          }
        }
        
        /* Example successful response:
          {"id": 9094}
        */
        /* Example error response:
        {
          "error": "ValidationError: Amount (0.00000000) is zero."
        }
        */
        return data;
      } catch (error) {
        log('❌ sendWithdraw: Exception during API call:', error);
        console.log('❌ CONSOLE: ===== API ERROR DEBUG =====');
        console.log('❌ CONSOLE: Exception in sendWithdraw:', error);
        console.log('❌ CONSOLE: Error type:', typeof error);
        console.log('❌ CONSOLE: Error name:', error.name);
        console.log('❌ CONSOLE: Error message:', error.message);
        if (error.response) {
          console.log('❌ CONSOLE: Error response:', error.response);
          console.log('❌ CONSOLE: Error response data:', error.response.data);
          console.log('❌ CONSOLE: Error response status:', error.response.status);
        }
        if (error.request) {
          console.log('❌ CONSOLE: Error request:', error.request);
        }
        console.log('❌ CONSOLE: Error stack:', error.stack);
        console.log('❌ CONSOLE: ===== END API ERROR DEBUG =====');
        log('❌ sendWithdraw: Error message:', error.message);
        console.log('❌ CONSOLE: Error message:', error.message);
        log('❌ sendWithdraw: Error stack:', error.stack);
        log('❌ sendWithdraw: Error name:', error.name);
        throw error;
      }
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
        msg += " New data saved to appState.";
        //msg += '\n' + jd(data);
        log(msg);
        this.state.apiData.order = data;
      }
      return data;
    }


    this.getOrders = () => {
      return this.state.apiData.order;
    }


    this.getOrder = ({orderID}) => {
      // Future: Might need to make this faster by writing loadOrder/${orderID} which loads a specific order, and then getting its output here.
      // Example Buy IOC order:
      // {"age":"75122","baseVolume":"0.00057120","date":"28 Aug 2022","id":7179,"market":"BTC/GBP","quoteVolume":"10.00000000","settlement1Id":8289,"settlement1Status":"R","settlement2Id":8290,"settlement2Status":"R","side":"Buy","status":"SETTLED","time":"13:43:23","type":"IOC"}
      // Example Sell IOC Order:
      // {"age":"86820","baseVolume":"0.00060457","date":"28 Aug 2022","id":7177,"market":"BTC/GBP","quoteVolume":"10.00000000","settlement1Id":8285,"settlement1Status":"N","settlement2Id":8286,"settlement2Status":"R","side":"Sell","status":"SETTLED","time":"11:57:26","type":"IOC"}
      let orders = this.getOrders();
      orders = orders.filter((o) => o.id == orderID);
      if (orders.length == 0) return {};
      order = orders[0];
      return order;
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


    this.loadAddressBook = async (asset) => {
      let fName = 'loadAddressBook';
      console.log(`📍 ${fName}: Starting for asset:`, asset);
      
      try {
        // Validate asset parameter
        if (!asset || typeof asset !== 'string') {
          console.log(`❌ ${fName}: Invalid asset parameter:`, asset);
          return [];
        }
        
        console.log(`🌐 ${fName}: Loading fresh data from API for ${asset}`);
        
        // Call API with proper error handling and timeout
        let data = await this.state.apiClient.privateMethod({
          httpMethod: 'POST',
          apiRoute: `addressBook/${asset.toUpperCase()}`,
          params: {},
          abortController: this.createAbortController({tag: `addressBook-${asset}`})
        });
        
        console.log(`� ${fName}: Raw API response:`, data);
        
        // Handle API response
        if (data === 'DisplayedError') {
          console.log(`❌ ${fName}: API returned DisplayedError`);
          return [];
        }
        
        if (!data) {
          console.log(`⚠️ ${fName}: API returned no data`);
          return [];
        }
        
        // Process successful response
        let addressList = [];
        if (Array.isArray(data)) {
          addressList = data;
        } else if (data.data && Array.isArray(data.data)) {
          addressList = data.data;
        } else if (data.addresses && Array.isArray(data.addresses)) {
          addressList = data.addresses;
        } else {
          console.log(`⚠️ ${fName}: Unexpected response format:`, data);
          addressList = [];
        }
        
        
        console.log(`✅ ${fName}: Successfully loaded ${addressList.length} addresses for ${asset}`);
        return addressList;
        
      } catch (error) {
        console.log(`❌ ${fName}: Exception caught:`, error);
        console.log(`❌ ${fName}: Error message:`, error.message);
        
        return [];
      }
    }


    this.getAddressBook = (asset) => {
      // Get cached address book for an asset
      console.log('📍 getAddressBook: Called for asset:', asset);
      
      if (!asset || typeof asset !== 'string') {
        return [];
      }
      
      const cacheKey = `addressBook_${asset.toUpperCase()}`;
      const cacheData = this.state.apiData[cacheKey];
      
      if (cacheData && cacheData.data) {
        console.log(`✅ getAddressBook: Found cached data for ${asset} (${cacheData.data.length} addresses)`);
        return cacheData.data;
      }
      
      console.log(`⚠️ getAddressBook: No cached data for ${asset}`);
      return [];
    }


    this.getCachedAddressBookAssets = () => {
      // Get list of assets that have cached address book data
      console.log('📍 getCachedAddressBookAssets: Called');
      
      const assets = [];
      Object.keys(this.state.apiData).forEach(key => {
        if (key.startsWith('addressBook_') && this.state.apiData[key].data) {
          const asset = key.replace('addressBook_', '');
          assets.push(asset);
        }
      });
      
      console.log(`✅ getCachedAddressBookAssets: Found cached data for assets:`, assets);
      return assets;
    }


    this.clearAddressBookCache = (asset = null) => {
      // Clear address book cache for specific asset or all assets
      console.log('📍 clearAddressBookCache: Called for asset:', asset);
      
      if (asset) {
        const cacheKey = `addressBook_${asset.toUpperCase()}`;
        delete this.state.apiData[cacheKey];
        console.log(`✅ clearAddressBookCache: Cleared cache for ${asset}`);
      } else {
        // Clear all address book caches
        Object.keys(this.state.apiData).forEach(key => {
          if (key.startsWith('addressBook_')) {
            delete this.state.apiData[key];
          }
        });
        console.log(`✅ clearAddressBookCache: Cleared all address book caches`);
      }
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
      console.log('🎯 [UPLOAD DOCUMENT] Function called with params:', params);
      
      let {documentType, documentCategory, fileData, fileExtension} = params;
      console.log('🎯 [UPLOAD DOCUMENT] Extracted params:', {documentType, documentCategory, fileDataLength: fileData ? fileData.length : 'null', fileExtension});
      
      let noAbort = true;
      let apiRoute = `private_upload/document/${documentType}`;
      // let apiRoute = `private_upload/document/appropriateness`;
      console.log('🎯 [UPLOAD DOCUMENT] API route:', apiRoute);
      
      try {
        console.log('🎯 [UPLOAD DOCUMENT] About to call privateMethod...');
        let data = await this.state.privateMethod({
          apiRoute,
          params: {
            documentCategory,
            fileData,
            fileExtension,
          },
          functionName: 'uploadDocument',
          noAbort,
        });
        
        console.log('🎯 [UPLOAD DOCUMENT] API call completed. Response data:', data);
        console.log('📄 [RESPONSE JSON]', JSON.stringify(data, null, 2));
        lj(data);
        
        /* Example response:
  {"result":"success"}
        */
        return data;
      } catch (error) {
        console.error('🎯 [UPLOAD DOCUMENT] API call failed with error:', error);
        console.error('🎯 [UPLOAD DOCUMENT] Error stack:', error.stack);
        throw error;
      }
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


    this.getOpenBankingPaymentStatusFromSettlement = async (params) => {
      let {settlementID} = params;
      let url = `settlement/${settlementID}/open_banking_payment_status`;
      let data = await this.state.privateMethod({
        httpMethod: 'POST',
        apiRoute: url,
        params: {},
        functionName: 'getOpenBankingPaymentStatusFromSettlement',
      });
      if (data == 'DisplayedError') return;
      /*
      Possible status values for a Tink payment:
      - NOTFOUND
      - CANCELLED
      - SENT
      - SETTLED
      - UNKNOWN
      */
     return data;
    }


    this.getOpenBankingPaymentURLFromSettlement = async (params) => {
      let {settlementID} = params;
      let url = `settlement/${settlementID}/open_banking_payment_url`;
      let data = await this.state.privateMethod({
        httpMethod: 'POST',
        apiRoute: url,
        params: {},
        functionName: 'getOpenBankingPaymentURLFromSettlement',
      });
      if (data == 'DisplayedError') return;
      /* Example Tink link for a payment to Solidi:
      https://link.tink.com/1.0/pay/direct?client_id=c831beab1dcb48e3a44f769dfd402939&redirect_uri=https://t3.solidi.co/tinkhook&market=GB&locale=en_GB&payment_request_id=adf5cd304d9011ed9d58a70f033bb3df
      */
      return data;
    }


    this.closeSolidiAccount = async () => {
      let data = await this.state.privateMethod({
        httpMethod: 'POST',
        apiRoute: 'request_account_deletion',
        params: {},
        functionName: 'closeSolidiAccount',
      });
      if (data == 'DisplayedError') return;
      lj({data})
      /* Example response:

      */
      await this.state.logout();
    }


    this.checkIfExtraInformationRequired = async () => {
      let data = await this.state.privateMethod({
        httpMethod: 'POST',
        apiRoute: 'user/extra_information/check',
        params: {},
        functionName: 'checkIfExtraInformationRequired',
      });
      if (data == 'DisplayedError') return;
      //lj({data})
      /* Example response:

      */
      let n = data.length;
      if (n === 0) {
        return false;
      }
      return true;
    }


    this.loadSecurityChecks = async () => {
      let data = await this.state.privateMethod({
        httpMethod: 'POST',
        apiRoute: 'security_check',
        params: {},
        functionName: 'loadSecurityChecks',
      });
      if (data == 'DisplayedError') return;
      //lj({data})
      /* Example response:
"data": {
  "pepResult": false
}
      */
     return data;
    }




    /* END Private API methods */




    /* More functions */




    this.androidBackButtonAction = () => {
      log(`Android Back Button pressed.`);
      // If there is at least one state in the state history, move back one state.
      if (this.state.stateHistoryList.length > 1) {
        this.state.decrementStateHistory();
        return true;
      } else {
        // Exit the app (mobile only).
        if (Platform.OS !== 'web') {
          SafeBackHandler.exitApp();
        } else {
          console.log('🌐 AppState: BackHandler.exitApp not available on web, ignoring');
        }
        return false;
      }
    }




    /* End more functions */
  }

  // Step 4: Initialize state object
  initializeStateObject = () => {




    // The actual state object of the app.
    // This must be declared towards the end of the constructor.
    this.state = {
      // START Developer mode settings
      preserveRegistrationData: preserveRegistrationData,
      // END Developer mode settings
      numberOfFooterButtonsToDisplay: this.numberOfFooterButtonsToDisplay,
      mainPanelState: this.initialMainPanelState,
      pageName: this.initialPageName,
      changeState: this.changeState,
      logEntireStateHistory: this.logEntireStateHistory,
      setMainPanelState: this.setMainPanelState,
      stateChangeIDHasChanged: this.stateChangeIDHasChanged,
      stashedState: {},
      stateHistoryList: [],
      previousState: {mainPanelState: null, pageName: null},
      stashCurrentState: this.stashCurrentState,
      stashState: this.stashState,
      loadStashedState: this.loadStashedState,
      deleteStashedState: this.deleteStashedState,
      resetStateHistory: this.resetStateHistory,
      decrementStateHistory: this.decrementStateHistory,
      footerIndex: 0,
      setFooterIndex: this.setFooterIndex,
      loadingPrices: true, // Enable loading for all platforms
      graphPrices: [],
      maintenanceMode: false,
      setMaintenanceMode: this.setMaintenanceMode,
      checkMaintenanceMode: this.checkMaintenanceMode,
      moveToNextState: this.moveToNextState,
      generalSetup: this.generalSetup,
      login: this.login,
      loginWithAPIKeyAndSecret: this.loginWithAPIKeyAndSecret,
      autoLoginWithStoredCredentials: this.autoLoginWithStoredCredentials,
      loginAsDifferentUser: this.loginAsDifferentUser,
      createAbortController: this.createAbortController,
      abortAllRequests: this.abortAllRequests,
      publicMethod: this.publicMethod,
      privateMethod: this.privateMethod,
      setAPIData: this.setAPIData,
      authenticateUser: this.authenticateUser,
      deletePIN: this.deletePIN,
      choosePIN: this.choosePIN,
      loadPIN: this.loadPIN,
      checkForAPICredentials: this.checkForAPICredentials,
      dismissAccountReview: this.dismissAccountReview,
      logout: this.logout,
      signOutCompletely: this.signOutCompletely,
      lockApp: this.lockApp,
      resetLockAppTimer: this.resetLockAppTimer,
      cancelTimers: this.cancelTimers,
      switchToErrorState: this.switchToErrorState,
      recoverFromErrorState: this.recoverFromErrorState,
      /* Misc network methods */
      loadTerms: this.loadTerms,
      /* Public API methods */
      checkIfAppUpdateRequired: this.checkIfAppUpdateRequired,
      loadLatestAPIVersion: this.loadLatestAPIVersion,
      checkLatestAPIVersion: this.checkLatestAPIVersion,
      loadAssetsInfo: this.loadAssetsInfo,
      getAssetInfo: this.getAssetInfo,
      getAssetsInfo: this.getAssetsInfo,
      getAssets: this.getAssets,
      loadMarkets: this.loadMarkets,
      getMarkets: this.getMarkets,
      loadPersonalDetailOptions: this.loadPersonalDetailOptions,
      getPersonalDetailOptions: this.getPersonalDetailOptions,
      loadCountries: this.loadCountries,
      getCountries: this.getCountries,
      getBaseAssets: this.getBaseAssets,
      getQuoteAssets: this.getQuoteAssets,
      loadTicker: this.loadTicker,
      loadCoinGeckoPrices: this.loadCoinGeckoPrices,
      loadTickerWithCoinGecko: this.loadTickerWithCoinGecko,
      getTicker: this.getTicker,
      getTickerForMarket: this.getTickerForMarket,
      getPreviousTickerForMarket: this.getPreviousTickerForMarket,
      loadHistoricPrices: this.loadHistoricPrices,
      setHistoricPrices: this.setHistoricPrices,
      setPrice: this.setPrice,
      setPrevPrice: this.setPrevPrice,
      getZeroValue: this.getZeroValue,
      getFullDecimalValue: this.getFullDecimalValue,
      /* END Public API methods */
      /* Private API methods */
      loadAssetsIcons: this.loadAssetsIcons,
      getAssetIcon: this.getAssetIcon,
      loadInitialStuffAboutUser: this.loadInitialStuffAboutUser,
      loadUserInfo: this.loadUserInfo,
      getUserInfo: this.getUserInfo,
      setUserInfo: this.setUserInfo,
      loadUserStatus: this.loadUserStatus,
      getUserStatus: this.getUserStatus,
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
      getOrder: this.getOrder,
      loadTransactions: this.loadTransactions,
      getTransactions: this.getTransactions,
      loadAddressBook: this.loadAddressBook,
      getAddressBook: this.getAddressBook,
      getCachedAddressBookAssets: this.getCachedAddressBookAssets,
      clearAddressBookCache: this.clearAddressBookCache,
      fetchIdentityVerificationDetails: this.fetchIdentityVerificationDetails,
      uploadDocument: this.uploadDocument,
      saveLastVisitedPage: this.saveLastVisitedPage,
      getLastVisitedPage: this.getLastVisitedPage,
      clearLastVisitedPage: this.clearLastVisitedPage,
      resetPassword: this.resetPassword,
      getOpenBankingPaymentStatusFromSettlement: this.getOpenBankingPaymentStatusFromSettlement,
      getOpenBankingPaymentURLFromSettlement: this.getOpenBankingPaymentURLFromSettlement,
      closeSolidiAccount: this.closeSolidiAccount,
      checkIfExtraInformationRequired: this.checkIfExtraInformationRequired,
      loadSecurityChecks: this.loadSecurityChecks,
      /* END Private API methods */
      /* More functions */
      androidBackButtonAction: this.androidBackButtonAction,
      androidBackButtonHandler: null,
      /* End more functions */
      stateChangeID: 0,
      abortControllers: {},
      appLocked: false,
      // In apiData, we store unmodified data retrieved from the API.
      // Each sub-object corresponds to a different API route, and should have the same name as that route.
      // Note: Need to be careful about which are arrays and which are objects with keyed values.
      apiData: {
        api_latest_version: null,
        terms: {},
        asset_icon: {},
        balance: {},
        country: [],
        market: [],
        order: [],
        personal_detail_option: {},
        ticker: {},
        transaction: [],
        historic_prices: {"BTC/GBPX":{"1D":[1,20]}},
        address_book: {}, // Cache for address book data by asset
      },
      prevAPIData: {
        ticker: {},
      },
      priceLoadCount: 0,
      domain,
      appName,
      appVersion,
      appBuildNumber,
      appTier,
      storedAPIVersion,
      appUpdateRequired: false,
      apiCredentialsStorageKey,
      pinStorageKey,
      userAgent: "Solidi Mobile App 4",
      apiVersionLoaded: false,
      assetsInfoLoaded: false,
      marketsLoaded: false,
      assetsIconsLoaded: false,
      ipAddressLoaded: false,
      changeStateParameters: {
        orderID: null,
        settlementID: null,
      },
      // registerData is used during Register journey.
      blankRegisterData: {
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        mobileNumber: '',
        dateOfBirth: '',
        gender: '',
        citizenship: '',
        emailPreferences: {
          systemAnnouncements: true,
          newsAndFeatureUpdates: true,
          promotionsAndSpecialOffers: true,
        },
      },
      registerData: null,
      
      // Clean user data model - no dummy data
      blankUserData: {
        // Basic personal information
        title: '',
        firstName: '',
        middleNames: '',
        lastName: '',
        gender: '',
        dateOfBirth: '',
        
        // Location and citizenship
        citizenship: '',
        country: '',
        
        // Contact information
        email: '',
        mobile: '',
        landline: '',
        
        // Address information
        postcode: '',
        address_1: '',
        address_2: '',
        address_3: '',
        address_4: '',
        
        // Email preferences
        emailPreferences: {
          systemAnnouncements: false,
          newsAndFeatureUpdates: false,
          promotionsAndSpecialOffers: false,
        },
      },
      
      blankRegisterConfirmData: {
        email: '',
        password: '',
      },
      registerConfirmData: null,
      user: {
        isAuthenticated: false,
        email: '',
        password: '',
        pin: '',
        apiCredentialsFound: false,
        accountReviewDismissed: false,
        info: {
          // In info, we store a lot of user-specific data retrieved from the API.
          // It is often restructured into a new form, but remains partitioned by API route.
          user: {},
          user_status: {},
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
      originalUser: {
        apiKey: null,
        apiSecret: null,
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
        'Wallet',
        'SolidiAccount',
        'AccountUpdate',
      ],
      apiClient: null,
      lockAppTimerID: null,
      panels: {
        buy: {
          activeOrder: false,
          orderID: null,
          settlementID: null,
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
        makePaymentOpenBanking: {
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
      },
      supportURL: "https://www.solidi.co/contactus",
    }

    // Perform initial setup.

    this.state.registerData = this.state.blankRegisterData;
    this.state.registerConfirmData = this.state.blankRegisterConfirmData;

    // Bind functions to state for React Context access
    this.state.register = this.register.bind(this);
    this.state.validateRegistrationData = this.validateRegistrationData.bind(this);

    // Initialise the state history.
    this.resetStateHistory();
  }

  // Step 5: Initialize mobile-specific features
  initializeMobileFeatures = () => {
    // Load data from keychain (mobile only).
    if (Platform.OS !== 'web') {
      this.loadPIN();
      this.checkForAPICredentials();
      
      // Start the lock-app timer (mobile only).
      this.resetLockAppTimer();
      
      // 🔐 Start authentication monitoring
      this.startAuthenticationMonitoring();
    } else {
      console.log('🌐 AppState: Skipping mobile-only initialization on web platform');
      // For web, set default states without keychain operations
      this.state.user.pin = '';
      this.state.user.apiCredentialsFound = false;
      
      // 🔐 Start authentication monitoring for web too
      this.startAuthenticationMonitoring();
    }



  }

  // 🔐 CLEANUP ON COMPONENT UNMOUNT
  componentWillUnmount() {
    log('🔐 AppState component unmounting, cleaning up authentication monitoring');
    this.stopAuthenticationMonitoring();
    
    console.log('✅ [STARTUP] Constructor initialization completed successfully');
  } // End of initializeConstructor method

  // Test keychain access after component mounts
  componentDidMount() {
    console.log('🔄 [MOUNT] ComponentDidMount called');
    
    // Handle async credential checking and navigation
    this.handleInitialNavigation();
    
    if (this.keychainTestPending) {
      this.performKeychainTest();
    }
  }

  // Determine initial navigation state based on user credentials
  determineInitialState = async () => {
    try {
      console.log('🔍 [AppState] Determining initial navigation state...');
      
      // Check if we have valid API credentials stored
      const hasAPICredentials = this.state.user.apiCredentialsFound;
      const isAuthenticated = this.state.user.isAuthenticated;
      
      console.log('🔐 [AppState] Authentication state:', {
        hasAPICredentials,
        isAuthenticated,
        userEmail: this.state.user.email
      });
      
      if (hasAPICredentials && isAuthenticated) {
        // User has valid stored credentials and is authenticated → redirect to Trade page
        console.log('✅ [AppState] Valid credentials found and authenticated → Redirecting to Trade');
        return 'Trade';
      } else if (hasAPICredentials && !isAuthenticated) {
        // User has credentials but needs to authenticate → redirect to PIN entry
        console.log('🔑 [AppState] Credentials found but not authenticated → Redirecting to PIN');
        return 'PIN';
      } else {
        // No valid credentials → redirect to Login page
        console.log('❌ [AppState] No valid credentials → Redirecting to Login');
        return 'Login';
      }
    } catch (error) {
      console.log('⚠️ [AppState] Error determining initial state:', error.message);
      // Fallback to Login for safety
      return 'Login';
    }
  };

  // Handle initial navigation based on credentials
  handleInitialNavigation = async () => {
    try {
      console.log('🔍 [NAVIGATION] Determining initial navigation state...');
      
      const initialState = await this.determineInitialState();
      console.log('🎯 [NAVIGATION] Determined initial state:', initialState);
      
      // Only redirect if different from current state and not default Login
      if (initialState !== this.state.mainPanelState) {
        console.log('🔄 [NAVIGATION] Redirecting to:', initialState);
        this.setMainPanelState({
          mainPanelState: initialState,
          pageName: 'default'
        });
      }
      
    } catch (error) {
      console.log('⚠️ [NAVIGATION] Error determining initial navigation:', error.message);
      // Stay on current state (Login by default)
    }
  };

  // Perform actual keychain test (async operations allowed here)
  performKeychainTest = async () => {
    try {
      console.log('🔐 [KEYCHAIN TEST] Starting keychain access test...');
      
      // Test keychain read operation
      const testKey = 'testflight_debug_key';
      const readResult = await Keychain.getInternetCredentials(testKey);
      console.log('🔐 [KEYCHAIN TEST] Read test result:', readResult);
      
      // Test keychain write operation
      await Keychain.setInternetCredentials(testKey, 'test_user', 'test_pass');
      console.log('🔐 [KEYCHAIN TEST] Write test: SUCCESS');
      
      // Test keychain read after write
      const readAfterWrite = await Keychain.getInternetCredentials(testKey);
      console.log('🔐 [KEYCHAIN TEST] Read after write:', readAfterWrite);
      
      // Clean up test
      await Keychain.resetInternetCredentials(testKey);
      console.log('🔐 [KEYCHAIN TEST] Cleanup completed');
      
      console.log('✅ [KEYCHAIN TEST] All keychain operations successful!');
      
    } catch (error) {
      console.error('🔐 [KEYCHAIN TEST ERROR] Keychain test failed:', error);
      console.error('🔐 [KEYCHAIN TEST ERROR] Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      
      // This might be the root cause of TestFlight crashes
      this.reportConstructorCrash(new Error(`Keychain test failed: ${error.message}`));
    }
  }

  render() {
    // ===== EMERGENCY MODE RENDERING =====
    // If in emergency mode, render minimal safe UI
    if (this.state && this.state.error && this.state.error.message && this.state.error.message.includes('startup failed')) {
      console.log('🆘 [EMERGENCY RENDER] Rendering in emergency mode');
      return (
        <AppStateContext.Provider value={this.emergencyState || this.state}>
          <SafeAreaView style={styles.emergencyContainer}>
            <View style={styles.emergencyContent}>
              <Text style={styles.emergencyTitle}>⚠️ App Startup Error</Text>
              <Text style={styles.emergencyMessage}>
                {this.state.error.message}
              </Text>
              <Text style={styles.emergencyInfo}>
                The app is running in emergency mode. 
                Error details have been sent for analysis.
              </Text>
              <TouchableOpacity 
                style={styles.emergencyButton}
                onPress={() => {
                  console.log('🔄 [EMERGENCY] User requested restart');
                  this.setState({ error: { message: '' } });
                }}
              >
                <Text style={styles.emergencyButtonText}>🔄 Try Again</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </AppStateContext.Provider>
      );
    }

    // Normal rendering
    return (
      <AppStateContext.Provider value={this.state}>

      <SafeAreaView style={styles.container}>
        {!this.state.maintenanceMode && !this.state.appUpdateRequired ?  <Header style={styles.header} />   : null }
        {!this.state.maintenanceMode && !this.state.appUpdateRequired ?  <MainPanel style={styles.mainPanel} /> : null }
        {!this.state.maintenanceMode && !this.state.appUpdateRequired ?  <Footer style={styles.footer} /> : null }

        { this.state.maintenanceMode                                 ? <Maintenance /> : null }
        { this.state.appUpdateRequired                               ? <UpdateApp /> : null }

      </SafeAreaView>

      </AppStateContext.Provider>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.defaultBackground,
  },
  header: {
    // Let header size itself naturally
  },
  mainPanel: {
    flex: 1, // Take up remaining space
  },
  footer: {
    // Minimal padding for very thin footer
    paddingTop: 0,
    paddingBottom: 0,
    height: scaledHeight(62), // Fixed height to prevent expansion
  },
  // Emergency mode styles
  emergencyContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  emergencyContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emergencyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 20,
    textAlign: 'center',
  },
  emergencyMessage: {
    fontSize: 16,
    color: '#495057',
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  emergencyInfo: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 30,
    textAlign: 'center',
  },
  emergencyButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  emergencyButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
})


export { AppStateContext, AppStateProvider };


export default AppStateContext;

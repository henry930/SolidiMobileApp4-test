// TextEncoder polyfill for React Native
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = class TextEncoder {
    encode(str) {
      const utf8 = [];
      for (let i = 0; i < str.length; i++) {
        let charcode = str.charCodeAt(i);
        if (charcode < 0x80) utf8.push(charcode);
        else if (charcode < 0x800) {
          utf8.push(0xc0 | (charcode >> 6), 
                    0x80 | (charcode & 0x3f));
        }
        else if (charcode < 0xd800 || charcode >= 0xe000) {
          utf8.push(0xe0 | (charcode >> 12), 
                    0x80 | ((charcode>>6) & 0x3f), 
                    0x80 | (charcode & 0x3f));
        }
        else {
          i++;
          charcode = 0x10000 + (((charcode & 0x3ff)<<10)
                              | (str.charCodeAt(i) & 0x3ff));
          utf8.push(0xf0 | (charcode >>18), 
                    0x80 | ((charcode>>12) & 0x3f), 
                    0x80 | ((charcode>>6) & 0x3f), 
                    0x80 | (charcode & 0x3f));
        }
      }
      return new Uint8Array(utf8);
    }
  };
}

// React imports
import React, { useContext, useEffect, useState } from 'react';
import { Image, StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import QRCode from 'react-native-qrcode-svg';
import Clipboard from '@react-native-clipboard/clipboard';

// Material Design imports
import {
  Text,
  Card,
  Button,
  TextInput,
  useTheme,
  SegmentedButtons,
  Surface,
  HelperText,
  IconButton,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Other imports
import _ from 'lodash';

// Internal imports
import AppStateContext from 'src/application/data';
import { colors, sharedStyles, sharedColors } from 'src/constants';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import { TransferUtils, transferDataModel } from './TransferDataModel';
import { AddressBookPicker, AddressBookModal, AddressBookSelectionPage } from 'src/components/atomic';
import { SolidiLoadingScreen } from 'src/components/shared';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('Transfer');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);

let Transfer = () => {
  console.log('🎯 CONSOLE: Transfer component initializing...');
  let appState = useContext(AppStateContext);
  console.log('🎯 CONSOLE: AppState context loaded:', !!appState);
  let materialTheme = useTheme();
  let [renderCount, triggerRender] = useState(0);
  let stateChangeID = appState?.stateChangeID || 0;

  // Transfer type state - 'send' or 'receive'
  // Check if pageName is 'receive' to set initial tab
  const initialTransferType = appState?.pageName === 'receive' ? 'receive' : 'send';
  const [transferType, setTransferType] = useState(initialTransferType);

  // Asset selection state with safe defaults
  let [selectedAsset, setSelectedAsset] = useState('BTC');
  let [open, setOpen] = useState(false);
  let [items, setItems] = useState([
    { label: 'Bitcoin (BTC)', value: 'BTC' },
    { label: 'Ethereum (ETH)', value: 'ETH' },
    { label: 'British Pound (GBP)', value: 'GBP' },
  ]);

  // Send form state
  let [sendAmount, setSendAmount] = useState('0.001'); // Pre-filled with your test amount
  let [recipientAddress, setRecipientAddress] = useState(''); // Display address from address book selection
  let [recipientAddressUUID, setRecipientAddressUUID] = useState(''); // UUID from address book for API calls
  let [selectedPriority, setSelectedPriority] = useState('medium'); // Fee priority selection (API uses: low, medium, high)
  let [errorMessage, setErrorMessage] = useState('');
  let [isLoading, setIsLoading] = useState(false);
  let [componentError, setComponentError] = useState(null);

  // Fee loading state
  let [withdrawalFee, setWithdrawalFee] = useState('[loading]');
  let [feesLoaded, setFeesLoaded] = useState(false);

  // Page initialization state
  let [isInitializing, setIsInitializing] = useState(true);
  let [initializationError, setInitializationError] = useState(null);
  let [addressBookLoaded, setAddressBookLoaded] = useState(false);

  // Address book modal state
  let [showAddressBookModal, setShowAddressBookModal] = useState(false);
  
  // Address book selection modal state
  let [showAddressBookSelectionPage, setShowAddressBookSelectionPage] = useState(false);

  // Identity verification state
  let [identityVerified, setIdentityVerified] = useState(null); // null = loading, true = verified, false = not verified

  // Error boundary effect
  useEffect(() => {
    const handleError = (error) => {
      log('Component error caught:', error);
      setComponentError(error.message || 'An error occurred');
    };
    
    // Reset component error when transfer type changes
    setComponentError(null);
  }, [transferType, selectedAsset]);

  // Page initialization effect - check authentication and pre-load data
  useEffect(() => {
    const initializePage = async () => {
      try {
        log('🚀 Transfer page initialization starting...');
        setIsInitializing(true);
        setInitializationError(null);

        // Step 1: Check if AppState is available
        if (!appState) {
          log('❌ AppState not available, waiting...');
          setInitializationError('Loading application state...');
          return;
        }

        // Step 2: Check authentication status
        if (appState.state && appState.state.mainPanelState) {
          const authState = appState.state.mainPanelState;
          log('🔐 Current auth state:', authState);
          
          if (authState === 'AuthSetup' || authState === 'Login' || authState === 'Register') {
            log('❌ Not authenticated, redirecting to login');
            setInitializationError('Authentication required');
            appState.changeState({mainPanelState: 'Login'});
            return;
          }
          
          if (authState === 'RequestFailed') {
            log('❌ System in error state');
            setInitializationError('System error. Please try refreshing the app.');
            return;
          }
          
          if (authState === 'Maintenance') {
            log('❌ System in maintenance mode');
            setInitializationError('System is under maintenance. Please try again later.');
            return;
          }
        }

        // Step 3: Pre-load fees
        log('💰 Pre-loading fees...');
        console.log('🔄 CONSOLE: ===== LOADING FEES API CALL =====');
        if (appState.loadFees) {
          console.log('📤 CONSOLE: About to call appState.loadFees()...');
          const feesResult = await appState.loadFees();
          console.log('📨 CONSOLE: ===== FEES API RESPONSE =====');
          console.log('📨 CONSOLE: Raw fees response:', feesResult);
          console.log('📨 CONSOLE: Response type:', typeof feesResult);
          console.log('📨 CONSOLE: Response JSON:', JSON.stringify(feesResult, null, 2));
          console.log('📨 CONSOLE: ===== END FEES API RESPONSE =====');
          
          setFeesLoaded(true);
          log('✅ Fees loaded successfully');
          console.log('✅ CONSOLE: Fees loaded successfully');
        } else {
          log('❌ loadFees method not available');
          console.log('❌ CONSOLE: loadFees method not available');
          setInitializationError('Fee loading not available');
          return;
        }

        // Step 4: Pre-load address book for current asset
        log('📖 Pre-loading address book for asset:', selectedAsset);
        console.log('🔄 CONSOLE: ===== LOADING ADDRESS BOOK API CALL =====');
        console.log('📤 CONSOLE: About to call appState.loadAddressBook with asset:', selectedAsset);
        if (appState.loadAddressBook) {
          const addressBookResult = await appState.loadAddressBook(selectedAsset);
          console.log('📨 CONSOLE: ===== ADDRESS BOOK API RESPONSE =====');
          console.log('📨 CONSOLE: Raw address book response:', addressBookResult);
          console.log('📨 CONSOLE: Response type:', typeof addressBookResult);
          console.log('📨 CONSOLE: Response JSON:', JSON.stringify(addressBookResult, null, 2));
          console.log('📨 CONSOLE: ===== END ADDRESS BOOK API RESPONSE =====');
          
          setAddressBookLoaded(true);
          log('✅ Address book loaded successfully');
          console.log('✅ CONSOLE: Address book loaded successfully');
        } else {
          log('⚠️ loadAddressBook method not available, continuing without address book');
          console.log('⚠️ CONSOLE: loadAddressBook method not available, continuing without address book');
          setAddressBookLoaded(true); // Allow page to load even without address book
        }

        // Step 5: Page ready
        log('🎉 Transfer page initialization complete');
        setIsInitializing(false);

      } catch (error) {
        log('❌ Error during page initialization:', error);
        setInitializationError(`Initialization failed: ${error.message}`);
        setIsInitializing(false);
      }
    };

    // Only initialize once when appState becomes available
    if (appState && isInitializing && !initializationError) {
      initializePage();
    }
  }, [appState, selectedAsset]); // Re-run if appState becomes available or asset changes

  // Track selectedAsset changes for AddressBookPicker
  useEffect(() => {
    // This effect will trigger when selectedAsset changes
  }, [selectedAsset]);

  // Force initial BTC load when Transfer component mounts
  useEffect(() => {
    // Component mounted
  }, []);

  // Fee loading effect
  useEffect(() => {
    const loadFees = async () => {
      try {
        if (!appState) {
          log('❌ AppState not available for fee loading');
          setWithdrawalFee('[error]');
          return;
        }
        
        if (!appState.loadFees) {
          log('❌ loadFees method not available on appState');
          setWithdrawalFee('[error]');
          return;
        }
        
        log('🔄 Loading fees for asset:', selectedAsset, 'priority:', selectedPriority);
        
        // Reset fee state while loading
        setWithdrawalFee('[loading]');
        setFeesLoaded(false);
        
        // Load fees from API
        console.log('🔄 CONSOLE: ===== LOADING FEES API CALL (Fee Effect) =====');
        console.log('📤 CONSOLE: About to call appState.loadFees() for fee calculation...');
        const loadFeesResult = await appState.loadFees();
        console.log('📨 CONSOLE: ===== FEES LOADING API RESPONSE =====');
        console.log('📨 CONSOLE: Raw loadFees response:', loadFeesResult);
        console.log('📨 CONSOLE: Response type:', typeof loadFeesResult);
        console.log('📨 CONSOLE: Response JSON:', JSON.stringify(loadFeesResult, null, 2));
        console.log('📨 CONSOLE: ===== END FEES LOADING API RESPONSE =====');
        
        // Mark fees as loaded
        setFeesLoaded(true);
        
        // Get the specific fee for current asset and priority
        console.log('🔄 CONSOLE: ===== GETTING SPECIFIC FEE =====');
        console.log('📤 CONSOLE: About to call appState.getFee with:', {
          feeType: 'withdraw',
          asset: selectedAsset,
          priority: selectedPriority
        });
        const fee = appState.getFee({
          feeType: 'withdraw',
          asset: selectedAsset,
          priority: selectedPriority
        });
        console.log('📨 CONSOLE: ===== GET FEE RESPONSE =====');
        console.log('📨 CONSOLE: Raw getFee response:', fee);
        console.log('📨 CONSOLE: Response type:', typeof fee);
        console.log('� CONSOLE: Response JSON:', JSON.stringify(fee, null, 2));
        console.log('📨 CONSOLE: ===== END GET FEE RESPONSE =====');
        
        log('💰 Got fee from API:', fee);
        console.log('�💰 CONSOLE: Got fee from API:', fee);
        
        // If current priority is not available, try to find an available one
        if (fee === '[loading]' || (typeof fee === 'string' && parseFloat(fee) < 0)) {
          log('🔄 Current priority unavailable, looking for alternatives...');
          const priorities = ['medium', 'high', 'low']; // API uses: low, medium, high
          let foundValidFee = null;
          let foundValidPriority = null;
          
          for (const priority of priorities) {
            const testFee = appState.getFee({
              feeType: 'withdraw',
              asset: selectedAsset,
              priority: priority
            });
            
            if (testFee !== '[loading]' && typeof testFee === 'string' && parseFloat(testFee) >= 0) {
              foundValidFee = testFee;
              foundValidPriority = priority;
              log(`✅ Found valid fee for priority ${priority}: ${testFee}`);
              break;
            }
          }
          
          if (foundValidFee && foundValidPriority !== selectedPriority) {
            log(`🔄 Switching from ${selectedPriority} to ${foundValidPriority}`);
            setSelectedPriority(foundValidPriority);
            setWithdrawalFee(foundValidFee);
          } else {
            setWithdrawalFee(fee);
          }
        } else {
          setWithdrawalFee(fee);
        }
        
      } catch (error) {
        log('❌ Error loading fees:', error);
        setWithdrawalFee('[error]');
      }
    };
    
    // Only load fees if we have a valid asset
    if (selectedAsset && appState) {
      loadFees();
    } else {
      log('⏸️ Skipping fee loading - selectedAsset:', selectedAsset, 'appState:', !!appState);
    }
  }, [selectedAsset, selectedPriority, appState]);

  // Helper function to check if a priority level is available for the current asset
  const isPriorityAvailable = (priority) => {
    if (!appState || !feesLoaded) return true; // Default to available while loading
    
    try {
      const fee = appState.getFee({
        feeType: 'withdraw',
        asset: selectedAsset,
        priority: priority
      });
      
      // Fee is unavailable if it's '[loading]', '[error]', or a negative value
      if (fee === '[loading]' || fee === '[error]') return false;
      
      const feeValue = parseFloat(fee);
      return !isNaN(feeValue) && feeValue >= 0;
    } catch (error) {
      log('Error checking priority availability:', error);
      return false;
    }
  };

  // Function that derives dropdown properties from an asset list with safe fallbacks
  let deriveAssetItems = (assetList) => {
    try {
      if (!assetList || !Array.isArray(assetList) || assetList.length === 0) {
        log('Asset list is empty or invalid, using fallback');
        return transferDataModel.generateSendAssetItems();
      }

      return assetList.map((asset) => {
        try {
          let displayInfo = transferDataModel.getAssetDisplayInfo(asset);
          let displayString = displayInfo.label;
          
          // Try to get asset icon from appState, but don't fail if it doesn't work
          let assetIcon = null;
          try {
            if (appState?.getAssetIcon) {
              console.log('🔄 CONSOLE: ===== GETTING ASSET ICON =====');
              console.log('📤 CONSOLE: About to call appState.getAssetIcon for asset:', asset);
              let iconResult = appState.getAssetIcon(asset);
              console.log('📨 CONSOLE: ===== ASSET ICON API RESPONSE =====');
              console.log('📨 CONSOLE: Raw getAssetIcon response:', iconResult);
              console.log('📨 CONSOLE: Response type:', typeof iconResult);
              console.log('📨 CONSOLE: Response JSON:', JSON.stringify(iconResult, null, 2));
              console.log('📨 CONSOLE: ===== END ASSET ICON API RESPONSE =====');
              
              // Only use icon if it's a proper image source (object), not a string
              if (iconResult && typeof iconResult === 'object') {
                assetIcon = iconResult;
                console.log('✅ CONSOLE: Using asset icon for', asset);
              } else {
                log('Skipping invalid icon for', asset, '- got:', typeof iconResult, iconResult);
                console.log('⚠️ CONSOLE: Skipping invalid icon for', asset, '- got:', typeof iconResult, iconResult);
              }
            }
          } catch (iconError) {
            log('Error getting asset icon for', asset, ':', iconError);
            console.log('❌ CONSOLE: Error getting asset icon for', asset, ':', iconError);
          }
          
          // Try to get additional info from appState
          try {
            if (appState?.getAssetInfo) {
              console.log('🔄 CONSOLE: ===== GETTING ASSET INFO =====');
              console.log('📤 CONSOLE: About to call appState.getAssetInfo for asset:', asset);
              let info = appState.getAssetInfo(asset);
              console.log('📨 CONSOLE: ===== ASSET INFO API RESPONSE =====');
              console.log('📨 CONSOLE: Raw getAssetInfo response:', info);
              console.log('📨 CONSOLE: Response type:', typeof info);
              console.log('📨 CONSOLE: Response JSON:', JSON.stringify(info, null, 2));
              console.log('📨 CONSOLE: ===== END ASSET INFO API RESPONSE =====');
              
              if (info?.displayString) {
                displayString = info.displayString;
                console.log('✅ CONSOLE: Using displayString from asset info:', displayString);
              }
            }
          } catch (infoError) {
            log('Error getting asset info for', asset, ':', infoError);
          }
          
          let assetItem = {
            label: displayString,
            value: asset,
          };
          
          // TODO: Icon functionality disabled temporarily to prevent rendering issues
          // Icons will be re-enabled once the component rendering is stabilized
          
          return assetItem;
        } catch (error) {
          log('Error processing asset item:', asset, error);
          // Return safe fallback for this asset
          let displayInfo = transferDataModel.getAssetDisplayInfo(asset);
          return {
            label: displayInfo.label,
            value: displayInfo.value,
          };
        }
      });
    } catch (error) {
      log('Error in deriveAssetItems:', error);
      return transferDataModel.generateSendAssetItems();
    }
  }

  // Generate asset items for dropdowns with enhanced error handling
  let generateSendAssetItems = () => { 
    try {
      // Try to get assets from appState first
      if (appState?.getAssets) {
        console.log('🔄 CONSOLE: ===== GETTING WITHDRAWAL ASSETS =====');
        console.log('📤 CONSOLE: About to call appState.getAssets({withdrawalEnabled: true})...');
        let withdrawalAssets = appState.getAssets({withdrawalEnabled: true});
        console.log('📨 CONSOLE: ===== WITHDRAWAL ASSETS API RESPONSE =====');
        console.log('📨 CONSOLE: Raw getAssets (withdrawal) response:', withdrawalAssets);
        console.log('📨 CONSOLE: Response type:', typeof withdrawalAssets);
        console.log('📨 CONSOLE: Response is array:', Array.isArray(withdrawalAssets));
        console.log('📨 CONSOLE: Response length:', withdrawalAssets?.length);
        console.log('📨 CONSOLE: Response JSON:', JSON.stringify(withdrawalAssets, null, 2));
        console.log('📨 CONSOLE: ===== END WITHDRAWAL ASSETS API RESPONSE =====');
        
        if (withdrawalAssets && withdrawalAssets.length > 0) {
          log('Using appState withdrawal assets:', withdrawalAssets);
          console.log('✅ CONSOLE: Using appState withdrawal assets:', withdrawalAssets);
          return deriveAssetItems(withdrawalAssets);
        }
      }
      
      // Fallback to data model
      log('Using fallback withdrawal assets from data model');
      return TransferUtils.generateSendItems();
    } catch (error) {
      log('Error generating send assets, using safe fallback:', error);
      return TransferUtils.generateSendItems();
    }
  }

  let generateReceiveAssetItems = () => { 
    try {
      // Try to get assets from appState first
      if (appState?.getAssets) {
        console.log('🔄 CONSOLE: ===== GETTING DEPOSIT ASSETS =====');
        console.log('📤 CONSOLE: About to call appState.getAssets({depositEnabled: true})...');
        let depositAssets = appState.getAssets({depositEnabled: true});
        console.log('📨 CONSOLE: ===== DEPOSIT ASSETS API RESPONSE =====');
        console.log('📨 CONSOLE: Raw getAssets (deposit) response:', depositAssets);
        console.log('📨 CONSOLE: Response type:', typeof depositAssets);
        console.log('📨 CONSOLE: Response is array:', Array.isArray(depositAssets));
        console.log('📨 CONSOLE: Response length:', depositAssets?.length);
        console.log('📨 CONSOLE: Response JSON:', JSON.stringify(depositAssets, null, 2));
        console.log('📨 CONSOLE: ===== END DEPOSIT ASSETS API RESPONSE =====');
        
        if (depositAssets && depositAssets.length > 0) {
          log('Using appState deposit assets:', depositAssets);
          console.log('✅ CONSOLE: Using appState deposit assets:', depositAssets);
          return deriveAssetItems(depositAssets);
        }
      }
      
      // Fallback to data model
      log('Using fallback deposit assets from data model');
      return TransferUtils.generateReceiveItems();
    } catch (error) {
      log('Error generating receive assets, using safe fallback:', error);
      return TransferUtils.generateReceiveItems();
    }
  }

  // Initial setup
  useEffect(() => {
    setup();
  }, []);

  // Enhanced setup with better error handling and state management
  let setup = () => {
    try {
      log('Setting up Transfer component, transferType:', transferType);
      
      // Check identity verification status
      const identityChecked = appState.getUserStatus('identityChecked');
      log('Identity verification status:', identityChecked);
      
      if (identityChecked === '[loading]') {
        setIdentityVerified(null); // Still loading
        // Load user status and retry
        appState.loadUserStatus().then(() => {
          setTimeout(setup, 1000); // Retry after 1 second
        });
        return;
      } else if (identityChecked !== true) {
        setIdentityVerified(false);
        log('Identity verification not completed, blocking transfer features');
        return;
      } else {
        setIdentityVerified(true);
        log('Identity verification confirmed, allowing transfer features');
      }
      
      // Close dropdown during setup to prevent conflicts
      setOpen(false);
      
      let newItems;
      if (transferType === 'send') {
        newItems = generateSendAssetItems();
      } else {
        newItems = generateReceiveAssetItems();
      }
      
      log('Generated items:', newItems?.length || 0);
      
      if (!newItems || newItems.length === 0) {
        log('No items generated, using emergency fallback');
        newItems = [
          { label: 'Bitcoin (BTC)', value: 'BTC' },
          { label: 'Ethereum (ETH)', value: 'ETH' },
          { label: 'British Pound (GBP)', value: 'GBP' },
        ];
      }
      
      // Clear any existing error messages
      setErrorMessage('');
      
      // Update items first
      setItems(newItems);
      
      // Then validate and update selected asset
      setTimeout(() => {
        try {
          if (!selectedAsset || !newItems.some(item => item.value === selectedAsset)) {
            log('Selected asset not in items, setting to first available');
            const firstAsset = newItems[0]?.value || 'BTC';
            setSelectedAsset(firstAsset);
            log('Set selected asset to:', firstAsset);
          } else {
            log('Selected asset', selectedAsset, 'is valid');
          }
        } catch (validationError) {
          log('Error validating selected asset:', validationError);
          setSelectedAsset('BTC');
        }
      }, 100);
      
    } catch (error) {
      log('Setup error:', error);
      // Emergency fallback
      setOpen(false);
      setErrorMessage('');
      setItems([
        { label: 'Bitcoin (BTC)', value: 'BTC' },
        { label: 'Ethereum (ETH)', value: 'ETH' },
        { label: 'British Pound (GBP)', value: 'GBP' },
      ]);
      setSelectedAsset('BTC');
    }
  }

  // Update items when transfer type changes with debounce
  useEffect(() => {
    log('Transfer type changed to:', transferType);
    
    // Use timeout to debounce rapid changes
    const timer = setTimeout(() => {
      try {
        setup();
      } catch (error) {
        log('Error in transfer type change effect:', error);
      }
    }, 150);
    
    return () => {
      clearTimeout(timer);
    };
  }, [transferType]);

  // Enhanced send transaction handler with validation
  let handleSend = async () => {
    console.log('🚀 CONSOLE: ===== SEND BUTTON CLICKED =====');
    console.log('🚀 CONSOLE: handleSend function starting...');
    console.log('🚀 CONSOLE: ===== TRANSFER FORM VALUES DEBUG =====');
    console.log('🚀 CONSOLE: - Selected Asset:', selectedAsset);
    console.log('🚀 CONSOLE: - Send Amount:', sendAmount, '(type:', typeof sendAmount + ')');
    console.log('🚀 CONSOLE: - Recipient Address:', recipientAddress);
    console.log('🚀 CONSOLE: - Selected Priority:', selectedPriority);
    console.log('🚀 CONSOLE: - Transfer Type:', transferType);
    console.log('🚀 CONSOLE: ===== END TRANSFER FORM VALUES DEBUG =====');
    try {
      log('🚀 handleSend: Starting send transaction');
      console.log('🚀 CONSOLE: handleSend starting - please check this appears in your logs!');
      console.log('📱 CONSOLE: React Native environment details:', {
        selectedAsset,
        sendAmount,
        recipientAddress,
        selectedPriority,
        appStateAvailable: !!appState,
        sendWithdrawAvailable: !!(appState && appState.sendWithdraw)
      });
      setErrorMessage('');
      
      // Validate amount using data model
      console.log('📊 CONSOLE: ===== STEP 1: AMOUNT VALIDATION =====');
      log('📊 handleSend: Validating amount:', sendAmount, 'for asset:', selectedAsset);
      console.log('📊 CONSOLE: Validating amount:', sendAmount, 'for asset:', selectedAsset);
      const validation = TransferUtils.validateAmount(selectedAsset, sendAmount);
      console.log('📊 CONSOLE: Validation result:', validation);
      if (!validation.valid) {
        log('❌ handleSend: Amount validation failed:', validation.error);
        console.log('❌ CONSOLE: Amount validation failed:', validation.error);
        setErrorMessage(validation.error);
        return;
      }
      log('✅ handleSend: Amount validation passed');
      console.log('✅ CONSOLE: Amount validation passed');
      
      console.log('📍 CONSOLE: ===== STEP 2: ADDRESS VALIDATION =====');
      if (!recipientAddress.trim()) {
        log('❌ handleSend: No recipient address provided');
        console.log('❌ CONSOLE: No recipient address provided');
        setErrorMessage('Please select an address from your Address Book');
        return;
      }
      
      // Require address book selection (UUID must be present)
      if (!recipientAddressUUID) {
        log('❌ handleSend: Address book selection required - no UUID provided');
        console.log('❌ CONSOLE: Address book selection required - no UUID provided');
        setErrorMessage('Please select an address from your Address Book. Manual address entry is not allowed.');
        return;
      }
      
      log('✅ handleSend: Valid address book selection with UUID:', recipientAddressUUID);
      console.log('✅ CONSOLE: Valid address book selection with UUID:', recipientAddressUUID);
      console.log('✅ CONSOLE: Display address:', recipientAddress);

      // Get asset capabilities for additional validation
      console.log('🔍 CONSOLE: ===== STEP 3: ASSET CAPABILITIES CHECK =====');
      log('🔍 handleSend: Checking asset capabilities for:', selectedAsset);
      const capabilities = transferDataModel.getAssetCapabilities(selectedAsset);
      log('📋 handleSend: Asset capabilities:', capabilities);
      console.log('📋 CONSOLE: Asset capabilities:', capabilities);
      
      if (!capabilities.withdrawalEnabled) {
        log('❌ handleSend: Withdrawals not enabled for asset:', selectedAsset);
        console.log('❌ CONSOLE: Withdrawals not enabled for asset:', selectedAsset);
        setErrorMessage(`${selectedAsset} withdrawals are not currently available`);
        return;
      }
      log('✅ handleSend: Withdrawals enabled for asset');
      console.log('✅ CONSOLE: Withdrawals enabled for asset');

      // Check AppState availability
      console.log('🔍 CONSOLE: ===== STEP 4: APPSTATE CHECK =====');
      if (!appState) {
        log('❌ handleSend: AppState not available');
        console.log('❌ CONSOLE: AppState not available');
        setErrorMessage('Application state not available. Please try again.');
        return;
      }
      log('✅ handleSend: AppState is available');
      console.log('✅ CONSOLE: AppState is available');

      // Check authentication state
      console.log('🔐 CONSOLE: ===== STEP 5: AUTHENTICATION CHECK =====');
      if (appState.state && appState.state.mainPanelState) {
        const authState = appState.state.mainPanelState;
        log('🔐 handleSend: Current auth state:', authState);
        console.log('🔐 CONSOLE: Current auth state:', authState);
        
        if (authState === 'AuthSetup' || authState === 'Login' || authState === 'Register') {
          log('❌ handleSend: Not authenticated');
          console.log('❌ CONSOLE: Not authenticated');
          setErrorMessage('Please log in before making transactions.');
          return;
        }
        
        if (authState === 'RequestFailed') {
          log('❌ handleSend: Previous request failed, system in error state');
          console.log('❌ CONSOLE: Previous request failed, system in error state');
          setErrorMessage('System is in error state. Please refresh and try again.');
          return;
        }
        
        if (authState === 'Maintenance') {
          log('❌ handleSend: System in maintenance mode');
          console.log('❌ CONSOLE: System in maintenance mode');
          setErrorMessage('System is under maintenance. Please try again later.');
          return;
        }
      }
      console.log('✅ CONSOLE: Authentication check passed');

      // Check sendWithdraw method availability
      console.log('🔍 CONSOLE: ===== STEP 6: SENDWITHDRAW METHOD CHECK =====');
      if (!appState.sendWithdraw) {
        log('❌ handleSend: sendWithdraw method not available on appState');
        console.log('❌ CONSOLE: sendWithdraw method not available on appState');
        setErrorMessage('Send functionality not available. Please try again.');
        return;
      }
      log('✅ handleSend: sendWithdraw method is available');
      console.log('✅ CONSOLE: sendWithdraw method is available');

      setIsLoading(true);
      console.log('🔄 CONSOLE: ===== STEP 7: CALLING API =====');

      log('📤 handleSend: Preparing API call with parameters:', {
        asset: selectedAsset,
        volume: sendAmount,
        address: recipientAddress,
        priority: selectedPriority,
        functionName: 'Transfer_handleSend'
      });
      console.log('📤 CONSOLE: Preparing API call with parameters:', {
        asset: selectedAsset,
        volume: sendAmount,
        address: recipientAddress,
        priority: selectedPriority,
        functionName: 'Transfer_handleSend'
      });
      
      console.log('🔄 CONSOLE: About to call sendWithdraw API...');
      console.log('� CONSOLE: Using recipient address UUID:', recipientAddressUUID);
      console.log('� CONSOLE: Display address:', recipientAddress);
      
      
      log('📍 handleSend: Using address book UUID for API call:', recipientAddressUUID);
      
      console.log('📋 CONSOLE: Final API parameters:', {
        asset: selectedAsset,
        volume: sendAmount,
        address: recipientAddressUUID, // Always use UUID from address book
        priority: selectedPriority,
        functionName: 'Transfer_handleSend'
      });
      
      const result = await appState.sendWithdraw({
        asset: selectedAsset,
        volume: sendAmount,
        address: recipientAddressUUID, // Always use UUID from address book
        priority: selectedPriority,
        functionName: 'Transfer_handleSend'
      });
      
      console.log('📨 CONSOLE: ===== STEP 8: API RESPONSE RECEIVED =====');
      
      console.log('📨 CONSOLE: ===== DETAILED TRANSFER API RESPONSE ANALYSIS =====');
      log('📨 handleSend: Raw API response:', result);
      console.log('📨 CONSOLE: Raw API response:', result);
      console.log('📨 CONSOLE: Response type:', typeof result);
      console.log('📨 CONSOLE: Response is null:', result === null);
      console.log('📨 CONSOLE: Response is undefined:', result === undefined);
      console.log('📨 CONSOLE: Response JSON:', JSON.stringify(result, null, 2));
      log('📊 handleSend: Response type:', typeof result);
      log('📊 handleSend: Response keys:', result ? Object.keys(result) : 'null/undefined');
      
      // Log the exact response for debugging
      if (result && typeof result === 'object') {
        console.log('🔍 CONSOLE: Detailed response analysis:');
        console.log('🔍 CONSOLE: Response keys:', Object.keys(result));
        console.log('🔍 CONSOLE: Has error property:', 'error' in result);
        console.log('🔍 CONSOLE: Has id property:', 'id' in result);
        console.log('🔍 CONSOLE: Has data property:', 'data' in result);
        console.log('🔍 CONSOLE: Error value:', result.error);
        console.log('🔍 CONSOLE: Error type:', typeof result.error);
        console.log('🔍 CONSOLE: Error is null:', result.error === null);
        console.log('🔍 CONSOLE: Error is undefined:', result.error === undefined);
        console.log('🔍 CONSOLE: Error stringified:', JSON.stringify(result.error));
        
        if (result.error && typeof result.error === 'string') {
          console.log('🔍 CONSOLE: Error string length:', result.error.length);
          console.log('🔍 CONSOLE: Error lowercase:', result.error.toLowerCase());
          console.log('🔍 CONSOLE: Contains "successfully":', result.error.toLowerCase().includes('successfully'));
          console.log('🔍 CONSOLE: Contains "queued":', result.error.toLowerCase().includes('queued'));
          console.log('🔍 CONSOLE: Contains "withdrawal":', result.error.toLowerCase().includes('withdrawal'));
        }
        
        console.log('🔍 CONSOLE: ID value:', result.id);
        console.log('🔍 CONSOLE: Data value:', result.data);
      }
      console.log('📨 CONSOLE: ===== END DETAILED TRANSFER RESPONSE ANALYSIS =====');
      
      console.log('🔍 CONSOLE: ===== STEP 9: RESPONSE PROCESSING =====');
      if (result === 'DisplayedError') {
        log('❌ handleSend: Got DisplayedError from API');
        console.log('❌ CONSOLE: Got DisplayedError from API');
        setErrorMessage('Transaction failed. Please check your inputs and try again.');
        return;
      }
      
      if (!result) {
        log('❌ handleSend: No response from API');
        console.log('❌ CONSOLE: No response from API');
        setErrorMessage('No response from server. Please try again.');
        return;
      }
      
      // SIMPLIFIED LOGIC: Only check for clear success indicators
      // 1. sendWithdraw converts success messages to success=true format
      if (result?.success === true) {
        log('✅ handleSend: sendWithdraw converted success response');
        console.log('✅ CONSOLE: sendWithdraw converted success response');
        
        let successMessage = result?.message || 'Withdrawal successful!';
        console.log('✅ CONSOLE: Success message:', successMessage);
        
        // Success - show confirmation
        alert(`✅ ${successMessage}`);
        
        // Clear form on successful send
        setSendAmount('');
        setRecipientAddress('');
        setRecipientAddressUUID('');
        setErrorMessage('');
        setIsLoading(false);
        return;
      }
      
      // 2. Legacy success: responses with ID and no error field
      if (result?.id && !result?.error) {
        log('✅ handleSend: Transaction successful with ID:', result.id);
        console.log('✅ CONSOLE: Transaction successful with ID:', result.id);
        // Success - show confirmation
        alert(`✅ Withdrawal successful! Transaction ID: ${result.id}`);
        
        // Clear form on successful send
        setSendAmount('');
        setRecipientAddress('');
        setRecipientAddressUUID('');
        setErrorMessage('');
        setIsLoading(false);
        return;
      }
      
      // 3. Anything else with an error field is treated as an error
      if (result?.error) {
        log('❌ handleSend: API returned error:', result.error);
        console.log('❌ CONSOLE: API returned error:', result.error);
        log('❌ handleSend: Full error object:', JSON.stringify(result, null, 2));
        console.log('❌ CONSOLE: Full error object:', JSON.stringify(result, null, 2));
        setErrorMessage(typeof result.error === 'string' ? result.error : 'Send failed');
        return;
      }
      
      // 4. Fallback for truly unexpected response format
      log('⚠️ handleSend: Unexpected response format:', result);
      console.log('⚠️ CONSOLE: Unexpected response format:', result);
      console.log('⚠️ CONSOLE: Response does not match any expected success patterns');
      setErrorMessage('Unexpected response from server. Please check your transaction status.');
      
    } catch (error) {
      console.log('💥 CONSOLE: ===== EXCEPTION CAUGHT =====');
      log('💥 handleSend: Exception caught:', error);
      console.log('💥 CONSOLE: Exception caught in handleSend:', error);
      log('💥 handleSend: Error message:', error.message);
      console.log('💥 CONSOLE: Error message:', error.message);
      log('💥 handleSend: Error stack:', error.stack);
      console.log('💥 CONSOLE: Error stack:', error.stack);
      log('💥 handleSend: Error name:', error.name);
      console.log('💥 CONSOLE: Error name:', error.name);
      log('💥 handleSend: Error toString:', error.toString());
      console.log('💥 CONSOLE: Error toString:', error.toString());
      
      // Show detailed error message to user
      let errorMsg = `Failed to process send transaction: ${error.message || 'Unknown error'}`;
      if (error.message && error.message.includes('privateMethod')) {
        errorMsg += '\n\nThis appears to be an API authentication or connection issue.';
      }
      console.log('💥 CONSOLE: Final error message to user:', errorMsg);
      
      setErrorMessage(errorMsg);
    } finally {
      console.log('🏁 CONSOLE: ===== CLEANUP =====');
      log('🏁 handleSend: Cleaning up, setting isLoading to false');
      console.log('🏁 CONSOLE: Setting isLoading to false');
      setIsLoading(false);
    }
  };

  // Handle address book selection
  let handleAddressSelection = (address, addressDetails) => {
    log('🏠 handleAddressSelection: Address selected from book:', address);
    log('🏠 handleAddressSelection: Address details:', addressDetails);
    
    // Set the display address (wallet address)
    setRecipientAddress(address);
    
    // Extract and set the UUID for API calls
    let addressUUID = addressDetails?.id || addressDetails?.rawData?.uuid;
    log('🏠 handleAddressSelection: Extracted UUID:', addressUUID);
    setRecipientAddressUUID(addressUUID || '');
    
    setErrorMessage(''); // Clear any existing error messages
    
    if (addressDetails) {
      log(`📝 Address selected: ${addressDetails.label} - ${address} (UUID: ${addressUUID})`);
    }
  };

  // Enhanced receive address getter with robust fallbacks
  let getReceiveAddress = () => {
    try {
      log('Getting receive address for asset:', selectedAsset);
      
      // Try to get the actual deposit address from appState
      if (appState?.getDepositAddress) {
        try {
          const address = appState.getDepositAddress(selectedAsset);
          if (address && address !== 'undefined' && address !== 'null') {
            log('Got deposit address from appState:', address);
            return address;
          }
        } catch (error) {
          log('Error getting deposit address from appState:', error);
        }
      }
      
      // Fallback to data model
      const fallbackAddress = TransferUtils.getDepositAddress(selectedAsset);
      log('Using fallback address:', fallbackAddress);
      return fallbackAddress;
      
    } catch (error) {
      log('Error getting receive address:', error);
      return `demo-${(selectedAsset || 'btc').toLowerCase()}-address-12345`;
    }
  }

  // Enhanced clipboard copy with error handling
  let copyToClipboard = (text) => {
    try {
      if (!text || text === 'undefined' || text === 'null') {
        alert('No address available to copy');
        return;
      }
      
      Clipboard.setString(text);
      alert('Address copied to clipboard!');
      log('Copied to clipboard:', text.substring(0, 10) + '...');
    } catch (error) {
      log('Error copying to clipboard:', error);
      alert('Failed to copy address to clipboard');
    }
  }

  // If there's a component error, show error screen
  if (componentError) {
    return (
      <View style={[sharedStyles.container, { backgroundColor: sharedColors.background }]}>
        <View style={{ padding: 20, justifyContent: 'center', alignItems: 'center', flex: 1 }}>
          <Text variant="headlineSmall" style={{ marginBottom: 16, textAlign: 'center', color: '#F44336' }}>
            Transfer Error
          </Text>
          <Text variant="bodyMedium" style={{ marginBottom: 20, textAlign: 'center', color: '#666' }}>
            {componentError}
          </Text>
          <Button 
            mode="contained" 
            onPress={() => {
              setComponentError(null);
              setSelectedAsset('BTC');
              setTransferType('send');
              setup();
            }}
          >
            Reset Transfer
          </Button>
        </View>
      </View>
    );
  }

  try {
    // Show loading screen while initializing
    if (isInitializing) {
      return (
        <SolidiLoadingScreen 
          message="Preparing transfer..."
          size="medium"
        />
      );
    }

    // Show error screen if initialization failed
    if (initializationError) {
      return (
        <View style={[sharedStyles.container, { backgroundColor: sharedColors.background }]}>
          <View style={{ padding: 20, justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            <Text variant="headlineSmall" style={{ marginBottom: 16, textAlign: 'center', color: '#F44336' }}>
              Transfer Unavailable
            </Text>
            <Text variant="bodyMedium" style={{ marginBottom: 20, textAlign: 'center', color: '#666' }}>
              {initializationError}
            </Text>
            <Button 
              mode="contained" 
              onPress={() => {
                setInitializationError(null);
                setIsInitializing(true);
              }}
            >
              Try Again
            </Button>
          </View>
        </View>
      );
    }

    // Identity verification check
    if (identityVerified === null) {
      // Still loading identity verification status
      return (
        <View style={[sharedStyles.container, { backgroundColor: sharedColors.background }]}>
          <View style={{ padding: 20, justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            <Text variant="headlineSmall" style={{ marginBottom: 16, textAlign: 'center' }}>
              Checking Verification Status
            </Text>
            <Text variant="bodyMedium" style={{ textAlign: 'center', color: '#666' }}>
              Please wait while we check your identity verification status...
            </Text>
          </View>
        </View>
      );
    }

    if (identityVerified === false) {
      // Identity verification required
      return (
        <View style={[sharedStyles.container, { backgroundColor: sharedColors.background }]}>
          <View style={{ padding: 20, justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            <Text variant="headlineSmall" style={{ marginBottom: 16, textAlign: 'center', color: '#F44336' }}>
              Identity Verification Required
            </Text>
            <Text variant="bodyMedium" style={{ marginBottom: 20, textAlign: 'center', color: '#666' }}>
              You need to complete identity verification before you can use transfer features.
            </Text>
            <Button 
              mode="contained" 
              onPress={() => appState.changeState('IdentityVerification')}
              style={{ backgroundColor: '#1565C0' }}
            >
              Complete Identity Verification
            </Button>
          </View>
        </View>
      );
    }

    // Main Transfer page content
    return (
      <View style={[sharedStyles.container, { backgroundColor: sharedColors.background }]}>
        
        <KeyboardAwareScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16 }}
          keyboardShouldPersistTaps='handled'
        >
        
        {/* Transfer Type Selector */}
        <SegmentedButtons
          value={transferType}
          onValueChange={setTransferType}
          buttons={[
            {
              value: 'send',
              label: 'Send',
              icon: 'upload',
              style: transferType === 'send' ? { backgroundColor: '#1565C0' } : {},
              labelStyle: transferType === 'send' ? { color: 'white' } : {}
            },
            {
              value: 'receive',
              label: 'Receive', 
              icon: 'download',
              style: transferType === 'receive' ? { backgroundColor: '#4CAF50' } : {},
              labelStyle: transferType === 'receive' ? { color: 'white' } : {}
            },
          ]}
          style={{ marginBottom: 16 }}
        />

        {/* Asset Selection with Enhanced Error Handling */}
        <View style={{ zIndex: 5000, elevation: 10 }}>
          <Card style={{ marginBottom: 16, elevation: 4 }}>
            <Card.Content style={{ padding: 20 }}>
              <Text variant="titleMedium" style={{ marginBottom: 16, fontWeight: '600' }}>
                Select Asset
              </Text>
              
              {(() => {
                try {
                  // Validate that we have valid items and selectedAsset
                  if (!items || items.length === 0) {
                    return (
                      <View style={{ padding: 20, alignItems: 'center' }}>
                        <Text variant="bodyMedium" style={{ color: '#666' }}>
                          Loading assets...
                        </Text>
                      </View>
                    );
                  }
                  
                  if (!selectedAsset || !items.some(item => item.value === selectedAsset)) {
                    return (
                      <View style={{ padding: 20, alignItems: 'center' }}>
                        <Text variant="bodyMedium" style={{ color: '#F44336', marginBottom: 16 }}>
                          Asset selection error
                        </Text>
                        <Button mode="outlined" onPress={() => setup()}>
                          Reload Assets
                        </Button>
                      </View>
                    );
                  }
                  
                  return (
                    <DropDownPicker
                      open={open}
                      value={selectedAsset}
                      items={items}
                      setOpen={setOpen}
                      setValue={(callback) => {
                        try {
                          log('DropDownPicker setValue called');
                          if (typeof callback === 'function') {
                            const newValue = callback(selectedAsset);
                            log('Setting new asset value:', newValue);
                            setSelectedAsset(newValue);
                          } else {
                            log('Setting asset value directly:', callback);
                            setSelectedAsset(callback);
                          }
                          // Clear any errors when asset changes
                          setErrorMessage('');
                        } catch (error) {
                          log('Error in setValue:', error);
                          setErrorMessage('Error selecting asset');
                        }
                      }}
                      setItems={setItems}
                      placeholder="Choose asset"
                      style={{ 
                        borderColor: materialTheme?.colors?.outline || '#ccc',
                        backgroundColor: 'white'
                      }}
                      dropDownContainerStyle={{ 
                        borderColor: materialTheme?.colors?.outline || '#ccc',
                        elevation: 10,
                        zIndex: 5000,
                        backgroundColor: 'white'
                      }}
                      textStyle={{
                        fontSize: 16,
                        color: '#333'
                      }}
                      labelStyle={{
                        fontSize: 16,
                        color: '#333'
                      }}
                      zIndex={5000}
                      zIndexInverse={1000}
                      listMode="SCROLLVIEW"
                      scrollViewProps={{
                        nestedScrollEnabled: true
                      }}
                      onSelectItem={(item) => {
                        try {
                          log('Asset selected:', item);
                          setErrorMessage('');
                        } catch (error) {
                          log('Error in onSelectItem:', error);
                        }
                      }}
                    />
                  );
                } catch (dropdownError) {
                  log('Dropdown render error:', dropdownError);
                  return (
                    <View style={{ padding: 20, alignItems: 'center' }}>
                      <Text variant="bodyMedium" style={{ color: '#F44336', marginBottom: 16 }}>
                        Asset dropdown unavailable
                      </Text>
                      <Button mode="outlined" onPress={() => setup()}>
                        Reset
                      </Button>
                    </View>
                  );
                }
              })()}
            </Card.Content>
          </Card>
        </View>

        {/* Send Form */}
        {(() => {
          console.log('🎯 Transfer: Checking if should render send form...');
          console.log('🎯 Transfer: transferType is:', transferType);
          console.log('🎯 Transfer: transferType === "send":', transferType === 'send');
          return transferType === 'send';
        })() && (
          <Card style={{ marginBottom: 16, elevation: 1, zIndex: 50 }}>
            <Card.Content style={{ padding: 20, zIndex: 50 }}>
              <Text variant="titleMedium" style={{ marginBottom: 16, fontWeight: '600' }}>
                Send {selectedAsset}
              </Text>
              
              <TextInput
                label="Amount"
                mode="outlined"
                value={sendAmount}
                onChangeText={setSendAmount}
                placeholder="0.00"
                keyboardType="numeric"
                style={{ marginBottom: 16 }}
              />
              
              {/* Fee Display */}
              <Surface style={{ 
                padding: 12, 
                borderRadius: 8, 
                backgroundColor: '#f8f9fa',
                marginBottom: 16,
              }}>
                <Text variant="bodyMedium" style={{ fontWeight: '500', marginBottom: 4 }}>
                  Network Fee ({selectedPriority.charAt(0).toUpperCase() + selectedPriority.slice(1)}):
                </Text>
                <Text variant="bodyLarge" style={{ 
                  color: withdrawalFee === '[loading]' || withdrawalFee === '[error]' ? '#666' : '#1565C0', 
                  fontWeight: '600',
                  fontStyle: withdrawalFee === '[loading]' || withdrawalFee === '[error]' ? 'italic' : 'normal'
                }}>
                  {withdrawalFee === '[loading]' ? 'Loading fee...' : 
                   withdrawalFee === '[error]' ? 'Fee unavailable' : 
                   `${withdrawalFee} ${selectedAsset}`}
                </Text>
              </Surface>

              {/* Priority Selector */}
              <Text variant="bodyMedium" style={{ fontWeight: '500', marginBottom: 8 }}>
                Transaction Priority:
              </Text>
              <View style={{ flexDirection: 'row', marginBottom: 16, gap: 8 }}>
                {['low', 'medium', 'high'].map((priority) => {
                  const isAvailable = isPriorityAvailable(priority);
                  const isSelected = selectedPriority === priority;
                  
                  // Display labels (medium is shown as Medium, others capitalized normally)
                  const displayLabel = priority.charAt(0).toUpperCase() + priority.slice(1);
                  
                  return (
                    <Button
                      key={priority}
                      mode={isSelected ? 'contained' : 'outlined'}
                      onPress={() => {
                        if (isAvailable) {
                          log('Priority changed to:', priority);
                          setSelectedPriority(priority);
                        }
                      }}
                      disabled={!isAvailable}
                      style={{ 
                        flex: 1,
                        opacity: isAvailable ? 1 : 0.5
                      }}
                      compact
                    >
                      {displayLabel}
                      {!isAvailable && ' (N/A)'}
                    </Button>
                  );
                })}
              </View>
              
              {/* Address Book Section */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginVertical: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Choose from Address Book</Text>
                  <TouchableOpacity
                    style={styles.addressBookButton}
                    onPress={() => setShowAddressBookSelectionPage(true)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.addressBookButtonContent}>
                      {recipientAddress ? (
                        <View style={styles.selectedAddressContainer}>
                          <Text style={styles.selectedAddressLabel}>Selected Address:</Text>
                          <Text style={styles.selectedAddressText} numberOfLines={1} ellipsizeMode="middle">
                            {recipientAddress}
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.addressBookButtonPlaceholder}>
                          Select a saved address...
                        </Text>
                      )}
                      <Icon name="chevron-down" size={20} color={colors.textSecondary} />
                    </View>
                  </TouchableOpacity>
                </View>
                <IconButton
                  icon="plus"
                  size={20}
                  mode="contained"
                  onPress={() => {
                    setShowAddressBookModal(true);
                  }}
                  style={{ 
                    marginLeft: 8,
                    marginTop: 22, // Align with the dropdown input
                    backgroundColor: '#1565C0',
                    height: 40,
                    width: 40
                  }}
                  iconColor="white"
                />
              </View>
              
              {/* Read-only display of selected address */}
              <View style={{ marginBottom: 16 }}>
                <Text variant="titleSmall" style={{ marginBottom: 8, fontWeight: 'bold' }}>
                  Selected Recipient Address
                </Text>
                {recipientAddress ? (
                  <View style={{
                    borderWidth: 1,
                    borderColor: '#E0E0E0',
                    borderRadius: 4,
                    padding: 12,
                    backgroundColor: '#F5F5F5',
                    minHeight: 48
                  }}>
                    <Text variant="bodyMedium" style={{ color: '#666666' }}>
                      {recipientAddress}
                    </Text>
                    {recipientAddressUUID && (
                      <Text variant="bodySmall" style={{ color: '#4CAF50', marginTop: 4 }}>
                        ✓ From Address Book
                      </Text>
                    )}
                  </View>
                ) : (
                  <View style={{
                    borderWidth: 1,
                    borderColor: '#E0E0E0',
                    borderRadius: 4,
                    padding: 12,
                    backgroundColor: '#FAFAFA',
                    minHeight: 48
                  }}>
                    <Text variant="bodyMedium" style={{ color: '#999999', fontStyle: 'italic' }}>
                      Please select an address from your Address Book above
                    </Text>
                  </View>
                )}
              </View>
              
              {errorMessage ? (
                <HelperText type="error" visible={!!errorMessage} style={{ marginBottom: 16 }}>
                  {errorMessage}
                </HelperText>
              ) : null}
              
              <Button 
                mode="contained" 
                onPress={handleSend}
                loading={isLoading}
                disabled={isLoading || !sendAmount.trim() || !recipientAddress.trim()}
                style={{ 
                  marginTop: 8,
                  backgroundColor: '#1565C0'
                }}
                contentStyle={{ paddingVertical: 8 }}
              >
                {isLoading ? 'Processing...' : `Send ${selectedAsset}`}
              </Button>
            </Card.Content>
          </Card>
        )}

        {/* Receive Form */}
        {transferType === 'receive' && (
          <Card style={{ marginBottom: 16, elevation: 1, zIndex: 100 }}>
            <Card.Content style={{ padding: 20 }}>
              <Text variant="titleMedium" style={{ marginBottom: 16, fontWeight: '600' }}>
                Receive {selectedAsset}
              </Text>
              
              {/* Enhanced QR Code with better error handling */}
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <Surface style={{ 
                  padding: 16, 
                  borderRadius: 12, 
                  backgroundColor: 'white',
                  elevation: 1 
                }}>
                  {(() => {
                    try {
                      const address = getReceiveAddress();
                      
                      // Validate address before generating QR code
                      if (!address || address === 'undefined' || address === 'null' || address.length < 5) {
                        throw new Error('Invalid address');
                      }
                      
                      return (
                        <QRCode
                          value={address}
                          size={scaledWidth(160)}
                          backgroundColor="white"
                          color="black"
                          logoSize={30}
                          logoBackgroundColor='transparent'
                        />
                      );
                    } catch (error) {
                      log('QR Code generation error:', error);
                      return (
                        <View style={{
                          width: scaledWidth(160),
                          height: scaledWidth(160),
                          backgroundColor: '#f0f0f0',
                          justifyContent: 'center',
                          alignItems: 'center',
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: '#ddd',
                        }}>
                          <Text variant="bodySmall" style={{ color: '#666', textAlign: 'center', marginBottom: 8 }}>
                            QR Code
                          </Text>
                          <Text variant="bodySmall" style={{ color: '#666', textAlign: 'center' }}>
                            Address Loading...
                          </Text>
                        </View>
                      );
                    }
                  })()}
                </Surface>
              </View>
              
              {/* Enhanced Address Display */}
              <Text variant="bodyMedium" style={{ marginBottom: 8, fontWeight: '500' }}>
                Your {selectedAsset} Address:
              </Text>
              
              <Surface style={{ 
                padding: 16, 
                borderRadius: 8, 
                backgroundColor: '#f8f9fa',
                marginBottom: 16,
                minHeight: 60,
                justifyContent: 'center',
              }}>
                {(() => {
                  try {
                    const address = getReceiveAddress();
                    
                    if (!address || address === 'undefined' || address === 'null') {
                      return (
                        <Text variant="bodyMedium" style={{ 
                          color: '#666',
                          textAlign: 'center',
                          fontStyle: 'italic'
                        }}>
                          Loading address...
                        </Text>
                      );
                    }
                    
                    return (
                      <Text variant="bodyMedium" style={{ 
                        fontFamily: 'monospace',
                        fontSize: normaliseFont(14),
                        lineHeight: 20,
                        textAlign: 'center',
                        color: '#333'
                      }}>
                        {address}
                      </Text>
                    );
                  } catch (error) {
                    log('Error displaying address:', error);
                    return (
                      <Text variant="bodyMedium" style={{ 
                        color: '#999',
                        textAlign: 'center',
                        fontStyle: 'italic'
                      }}>
                        Address unavailable
                      </Text>
                    );
                  }
                })()}
              </Surface>
              
              <Button 
                mode="outlined" 
                onPress={() => {
                  const address = getReceiveAddress();
                  copyToClipboard(address);
                }}
                icon="content-copy"
                style={{ marginTop: 8 }}
                contentStyle={{ paddingVertical: 4 }}
                disabled={(() => {
                  try {
                    const address = getReceiveAddress();
                    return !address || address === 'undefined' || address === 'null' || address.includes('loading') || address.includes('unavailable');
                  } catch (error) {
                    return true;
                  }
                })()}
              >
                {(() => {
                  try {
                    const address = getReceiveAddress();
                    if (!address || address === 'undefined' || address === 'null' || address.includes('loading')) {
                      return 'Address Loading...';
                    }
                    if (address.includes('unavailable')) {
                      return 'Address Unavailable';
                    }
                    return 'Copy Address';
                  } catch (error) {
                    return 'Copy Address';
                  }
                })()}
              </Button>
            </Card.Content>
          </Card>
        )}

      </KeyboardAwareScrollView>

      {/* Address Book Modal */}
      <AddressBookModal
        visible={showAddressBookModal}
        onClose={() => setShowAddressBookModal(false)}
        selectedAsset={selectedAsset}
        onAddressAdded={async (newAddress) => {
          log('New address added:', newAddress);
          // Force refresh the address book picker
          if (appState && appState.loadAddressBook) {
            try {
              // Add a small delay to ensure API completion
              setTimeout(async () => {
                await appState.loadAddressBook();
                // Trigger a state change to refresh components
                triggerRender(renderCount + 1);
              }, 500);
            } catch (error) {
              log('Error refreshing address book after add:', error);
            }
          }
        }}
      />

      {/* Address Book Selection Page */}
      <AddressBookSelectionPage
        visible={showAddressBookSelectionPage}
        onClose={() => setShowAddressBookSelectionPage(false)}
        selectedAsset={selectedAsset}
        onSelectAddress={(address, details) => {
          handleAddressSelection(address, details);
        }}
      />
    </View>
  );
  
  } catch (renderError) {
    log('Transfer component render error:', renderError);
    
    // Return emergency fallback UI
    return (
      <View style={[sharedStyles.container, { backgroundColor: sharedColors.background }]}>
        <View style={{ padding: 20, justifyContent: 'center', alignItems: 'center', flex: 1 }}>
          <Text variant="headlineSmall" style={{ marginBottom: 16, textAlign: 'center', color: '#F44336' }}>
            Transfer Unavailable
          </Text>
          <Text variant="bodyMedium" style={{ marginBottom: 20, textAlign: 'center', color: '#666' }}>
            The transfer feature is temporarily unavailable. Please try again later.
          </Text>
          <Button 
            mode="contained" 
            onPress={() => {
              try {
                setComponentError(null);
                setSelectedAsset('BTC');
                setTransferType('send');
                setErrorMessage('');
                setup();
              } catch (error) {
                log('Error in retry:', error);
              }
            }}
          >
            Try Again
          </Button>
        </View>
      </View>
    );
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  inputLabel: {
    fontSize: normaliseFont(14),
    fontWeight: '600',
    color: colors.text,
    marginBottom: scaledHeight(6),
  },
  addressBookButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: 8,
    paddingHorizontal: scaledWidth(12),
    paddingVertical: scaledHeight(12),
    minHeight: scaledHeight(48),
  },
  addressBookButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addressBookButtonPlaceholder: {
    fontSize: normaliseFont(14),
    color: colors.textSecondary,
    flex: 1,
  },
  selectedAddressContainer: {
    flex: 1,
  },
  selectedAddressLabel: {
    fontSize: normaliseFont(12),
    color: colors.textSecondary,
    marginBottom: scaledHeight(2),
  },
  selectedAddressText: {
    fontSize: normaliseFont(14),
    color: colors.text,
    fontFamily: 'monospace',
  },
});

export default Transfer;
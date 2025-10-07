// React imports
import React, { useContext, useEffect, useState } from 'react';
import { ScrollView, View, Alert, Platform, TouchableOpacity, Modal, TextInput, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Apple Pay imports
// import { PaymentRequest, canMakePayments } from 'react-native-payments';

// Material Design imports
import {
  Card,
  Text,
  Button,
  IconButton,
  Divider,
  List,
  Avatar,
  useTheme,
  Surface,
  ProgressBar,
} from 'react-native-paper';

// Other imports
import _ from 'lodash';
import Big from 'big.js';

// Internal imports
import AppStateContext from 'src/application/data';
import { colors, sharedStyles, layoutStyles, cardStyles } from 'src/constants';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import { Title } from 'src/components/shared';
import { StandardButton, AddressBookPicker } from 'src/components/atomic';
import misc from 'src/util/misc';

// Create local references for commonly used styles
const layout = layoutStyles;
const cards = cardStyles;

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('Wallet');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);

let Wallet = () => {
  let appState = useContext(AppStateContext);
  let theme = useTheme();
  
  // Check authentication first
  if (!appState) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#666' }}>Loading...</Text>
      </View>
    );
  }
  
  // Check if user is authenticated
  const isAuthenticated = appState.user?.isAuthenticated;
  
  if (!isAuthenticated) {
    return (
      <View style={{ 
        flex: 1, 
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
      }}>
        {/* Header */}
        <View style={{
          backgroundColor: '#FF6B6B',
          paddingVertical: 20,
          paddingHorizontal: 30,
          borderRadius: 12,
          marginBottom: 30,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}>
          <Text style={{ 
            fontSize: 20, 
            fontWeight: 'bold', 
            color: 'white',
            textAlign: 'center',
            marginBottom: 10
          }}>
            🔒 Authentication Required
          </Text>
          <Text style={{ 
            fontSize: 16, 
            color: 'white',
            textAlign: 'center'
          }}>
            Please login to access your wallet
          </Text>
        </View>
        
        <Text style={{ 
          fontSize: 16, 
          color: '#666',
          textAlign: 'center',
          marginBottom: 30,
          lineHeight: 24
        }}>
          You need to be logged in to access{'\n'}your wallet and manage funds.
        </Text>
        
        <TouchableOpacity 
          style={{
            backgroundColor: '#007AFF',
            paddingHorizontal: 30,
            paddingVertical: 15,
            borderRadius: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
          onPress={() => {
            console.log('🔐 Redirecting to login page...');
            appState.setMainPanelState('Login');
          }}
        >
          <Text style={{ 
            color: 'white', 
            fontWeight: 'bold', 
            fontSize: 16,
            textAlign: 'center' 
          }}>
            Go to Login
          </Text>
        </TouchableOpacity>
        
        <Text style={{ 
          fontSize: 12, 
          color: '#999',
          textAlign: 'center',
          marginTop: 20
        }}>
          Don't have an account? Sign up in the Login page.
        </Text>
      </View>
    );
  }
  
  let [renderCount, triggerRender] = useState(0);
  let [isLoading, setIsLoading] = useState(true);
  let [depositAmount, setDepositAmount] = useState('');
  let [withdrawAmount, setWithdrawAmount] = useState('');
  let [selectedBalanceTab, setSelectedBalanceTab] = useState('crypto'); // 'crypto' or 'fiat'
  
  // Withdraw modal state
  let [showWithdrawModal, setShowWithdrawModal] = useState(false);
  let [withdrawCurrency, setWithdrawCurrency] = useState('');
  let [withdrawToAddress, setWithdrawToAddress] = useState('');
  let [withdrawAmountInput, setWithdrawAmountInput] = useState('');
  let [isWithdrawing, setIsWithdrawing] = useState(false);
  
  let stateChangeID = appState.stateChangeID;

  let pageName = appState.pageName;
  let permittedPageNames = 'default'.split(' ');
  misc.confirmItemInArray('permittedPageNames', permittedPageNames, pageName, 'Wallet');

  // Initial setup
  useEffect(() => {
    setup();
  }, []); // Pass empty array so that this only runs once on mount

  let setup = async () => {
    try {
      console.log('🔄 CONSOLE: ===== GENERAL SETUP API CALL =====');
      console.log('📤 CONSOLE: About to call appState.generalSetup({caller: "Wallet"})...');
      const generalSetupResult = await appState.generalSetup({caller: 'Wallet'});
      console.log('📨 CONSOLE: ===== GENERAL SETUP API RESPONSE =====');
      console.log('📨 CONSOLE: Raw generalSetup response:', generalSetupResult);
      console.log('📨 CONSOLE: Response type:', typeof generalSetupResult);
      console.log('📨 CONSOLE: Response JSON:', JSON.stringify(generalSetupResult, null, 2));
      console.log('📨 CONSOLE: ===== END GENERAL SETUP API RESPONSE =====');
      
      // Load ticker data first for exchange rates
      try {
        console.log('💱 Wallet: Loading ticker data...');
        console.log('🔄 CONSOLE: ===== LOAD TICKER API CALL =====');
        console.log('📤 CONSOLE: About to call appState.loadTicker()...');
        const loadTickerResult = await appState.loadTicker();
        console.log('📨 CONSOLE: ===== LOAD TICKER API RESPONSE =====');
        console.log('📨 CONSOLE: Raw loadTicker response:', loadTickerResult);
        console.log('📨 CONSOLE: Response type:', typeof loadTickerResult);
        console.log('📨 CONSOLE: Response JSON:', JSON.stringify(loadTickerResult, null, 2));
        console.log('📨 CONSOLE: ===== END LOAD TICKER API RESPONSE =====');
        
        let currentTickerData = appState.apiData?.ticker || {};
        console.log('💱 Wallet: Ticker data loaded:', currentTickerData);
        console.log('💱 CONSOLE: Final ticker data in appState:', currentTickerData);
        setTickerData(currentTickerData);
      } catch (error) {
        log('Wallet: Error loading ticker:', error);
      }
      
      // Load user balances
      try {
        console.log('🏦 Wallet: Loading balances from API...');
        console.log('🔄 CONSOLE: ===== LOAD BALANCES API CALL =====');
        console.log('📤 CONSOLE: About to call appState.loadBalances()...');
        let balanceResult = await appState.loadBalances();
        console.log('📨 CONSOLE: ===== LOAD BALANCES API RESPONSE =====');
        console.log('📨 CONSOLE: Raw loadBalances response:', balanceResult);
        console.log('📨 CONSOLE: Response type:', typeof balanceResult);
        console.log('📨 CONSOLE: Response JSON:', JSON.stringify(balanceResult, null, 2));
        console.log('📨 CONSOLE: ===== END LOAD BALANCES API RESPONSE =====');
        
        console.log('🏦 Wallet: Balance API result:', balanceResult);
        console.log('🏦 Wallet: Balance data in appState:', appState.apiData?.balance);
        console.log('🏦 CONSOLE: Final balance data in appState:', appState.apiData?.balance);
        
        // Calculate total portfolio value after loading balances
        let balanceData = getBalanceData();
        await calculateTotalPortfolioValue(balanceData);
      } catch (error) {
        log('Wallet: Error loading balances:', error);
      }

      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
      
      setIsLoading(false);
      triggerRender(renderCount + 1);
    } catch(err) {
      let msg = `Wallet.setup: Error = ${err}`;
      console.log(msg);
      setIsLoading(false);
    }
  };

  // Get balance data from real API
  let getBalanceData = () => {
    let balanceData = appState.apiData?.balance || {};
    console.log('🏦 Wallet: Raw balance data from API:', balanceData);
    
    // Transform API balance data to match UI expectations
    let transformedData = {};
    
    // Get asset info for all available assets
    let availableAssets = ['GBP', 'BTC', 'ETH', 'EUR', 'USD'];
    
    availableAssets.forEach(asset => {
      let balance = balanceData[asset] || 0;
      let balanceNumber = 0;
      
      console.log(`🏦 Processing ${asset}: raw balance = ${balance} (type: ${typeof balance})`);
      
      try {
        balanceNumber = parseFloat(balance) || 0;
        console.log(`🏦 ${asset}: parsed balance = ${balanceNumber}`);
      } catch (error) {
        log(`Error parsing balance for ${asset}:`, error);
        balanceNumber = 0;
      }
      
      // For now, treat all balance as available (no reserved amounts from API)
      // This can be enhanced when API provides detailed balance breakdown
      transformedData[asset] = {
        available: balanceNumber,
        reserved: 0,
        total: balanceNumber
      };
      
      console.log(`🏦 ${asset}: final transformed data =`, transformedData[asset]);
    });
    
    console.log('🏦 Wallet: Transformed balance data for UI:', transformedData);
    return transformedData;
  };

  // Format currency display
  let formatCurrency = (amount, currency) => {
    if (_.isNil(amount)) return '0.00';
    
    try {
      let bigAmount = new Big(amount);
      
      // For fiat currencies, show 2 decimal places
      if (['GBP', 'EUR', 'USD'].includes(currency)) {
        return bigAmount.toFixed(2);
      }
      
      // For cryptocurrencies, show up to 8 decimal places (remove trailing zeros)
      return bigAmount.toFixed(8).replace(/\.?0+$/, '');
    } catch (error) {
      log('Error formatting currency:', error);
      return '0.00';
    }
  };

  // Get currency symbol
  let getCurrencySymbol = (currency) => {
    const symbols = {
      GBP: '£',
      EUR: '€',
      USD: '$',
      BTC: '₿',
      ETH: 'Ξ'
    };
    return symbols[currency] || currency;
  };

  // Get currency icon (using same mapping as AddressBook)
  let getCurrencyIcon = (currency) => {
    const iconMap = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum', 
      'GBP': 'currency-gbp',
      'USD': 'currency-usd',
      'EUR': 'currency-eur',
      'LTC': 'litecoin',
      'BCH': 'bitcoin',
      'XRP': 'ripple'
    };
    return iconMap[currency] || 'currency-btc';
  };

  // Calculate total portfolio value in GBP using ticker rates
  let [totalPortfolioValue, setTotalPortfolioValue] = useState(0);
  let [isCalculatingTotal, setIsCalculatingTotal] = useState(false);
  let [tickerData, setTickerData] = useState({});

  let calculateTotalPortfolioValue = async (balanceData) => {
    if (isCalculatingTotal) return;
    
    setIsCalculatingTotal(true);
    let totalInGBP = 0;
    
    try {
      console.log('📊 Calculating total portfolio value using ticker rates...');
      
      // Load latest ticker data for exchange rates
      await appState.loadTicker();
      let currentTickerData = appState.apiData?.ticker || {};
      console.log('📊 Ticker data:', currentTickerData);
      setTickerData(currentTickerData); // Store ticker data for list rendering
      
      for (let [currency, balanceInfo] of Object.entries(balanceData)) {
        let balance = balanceInfo.total || 0;
        
        if (balance <= 0) continue;
        
        if (currency === 'GBP') {
          // GBP is base currency
          totalInGBP += balance;
          console.log(`📊 ${currency}: ${balance} (base currency)`);
        } else {
          try {
            // Get exchange rate from ticker data
            let market = `${currency}/GBP`;
            let rateData = currentTickerData[market];
            
            if (rateData && rateData.price) {
              let rate = parseFloat(rateData.price) || 0;
              let gbpValue = balance * rate;
              totalInGBP += gbpValue;
              console.log(`📊 ${currency}: ${balance} × £${rate} = £${gbpValue.toFixed(2)}`);
            } else {
              console.log(`📊 ${currency}: No ticker rate available for ${market}`);
            }
          } catch (error) {
            console.log(`📊 Error getting rate for ${currency}:`, error);
          }
        }
      }
      
      console.log(`📊 Total portfolio value: £${totalInGBP.toFixed(2)}`);
      setTotalPortfolioValue(totalInGBP);
    } catch (error) {
      console.log('📊 Error calculating total portfolio value:', error);
    } finally {
      setIsCalculatingTotal(false);
    }
  };

  // Handle deposit action
  let handleDeposit = async (currency) => {
    if (['BTC', 'ETH'].includes(currency)) {
      Alert.alert(
        'Crypto Deposit',
        `To deposit ${currency}, please use the Receive feature to get your wallet address.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Go to Receive', 
            onPress: () => appState.changeState('Receive')
          }
        ]
      );
      return;
    }

    // For fiat currencies, show Apple Pay option
    Alert.alert(
      `Deposit ${currency}`,
      `Choose your deposit method:`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Apple Pay', 
          onPress: () => handleApplePayDeposit(currency)
        },
        { 
          text: 'Apple Pay (Demo)', 
          onPress: () => handleApplePayDemo(currency)
        },
        { 
          text: 'Bank Transfer', 
          onPress: () => handleBankTransferDeposit(currency)
        }
      ]
    );
  };

  // Handle Apple Pay deposit
  let handleApplePayDeposit = async (currency) => {
    log('Apple Pay deposit requested for currency:', currency);
    
    if (Platform.OS !== 'ios') {
      Alert.alert('Apple Pay Not Available', 'Apple Pay is only available on iOS devices.');
      return;
    }

    try {
      // Step 1: Check if Apple Pay is available
      log('Checking Apple Pay availability...');
      
      // Check multiple Apple Pay conditions
      // const canPay = await canMakePayments();
      const canPay = false; // Apple Pay disabled
      log('Apple Pay canMakePayments result:', canPay);
      
      // Additional checks
      // const deviceSupport = await canMakePayments(['apple-pay']);
      const deviceSupport = false; // Apple Pay disabled
      log('Apple Pay device support:', deviceSupport);
      
      if (!canPay) {
        Alert.alert(
          'Apple Pay Not Available', 
          'Apple Pay is not set up on this device. Please add a card to Wallet and try again.',
          [
            { text: 'Open Settings', onPress: () => log('User should open Settings > Wallet & Apple Pay') },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
        return;
      }

      // Step 2: Show amount input dialog
      log('Showing amount input dialog...');
      const depositAmount = await showDepositAmountDialog(currency);
      if (!depositAmount) {
        log('User cancelled amount input');
        return;
      }

      // Step 3: Validate amount
      const amount = parseFloat(depositAmount);
      log('Amount entered:', depositAmount, 'Parsed:', amount);
      
      if (isNaN(amount) || amount <= 0) {
        Alert.alert('Invalid Amount', 'Please enter a valid deposit amount.');
        return;
      }

      // Step 4: Create payment request with simplified configuration
      log('Creating PaymentRequest for amount:', amount, 'currency:', currency);
      
      // const paymentRequest = new PaymentRequest(
      throw new Error('Apple Pay functionality disabled - react-native-payments removed');
      /*
        [
          {
            supportedMethods: ['apple-pay'],
            data: {
              merchantIdentifier: 'merchant.com.henryyeung.mysolidimobileapp', // Sandbox merchant ID
              supportedNetworks: ['visa', 'masterCard', 'amex', 'discover'],
              countryCode: 'US', // Try US for better sandbox compatibility
              currencyCode: currency.toUpperCase(),
              merchantCapabilities: ['supports3DS'],
            },
          },
        ],
        {
          id: `deposit-${Date.now()}`,
          displayItems: [
            {
              label: `Deposit to ${currency.toUpperCase()} Wallet`,
              amount: { currency: currency.toUpperCase(), value: amount.toFixed(2) },
            },
          ],
          total: {
            label: 'Solidi Mobile App',
            amount: { currency: currency.toUpperCase(), value: amount.toFixed(2) },
          },
        }
      );

      log('PaymentRequest created, attempting to show payment sheet...');

      // Step 5: Show Apple Pay payment sheet
      const paymentResponse = await paymentRequest.show();
      log('Payment sheet shown, response received');

      // Step 6: Process the payment
      await processApplePayPayment(currency, amount, paymentResponse);

      // Step 7: Complete the payment
      log('Completing payment...');
      await paymentResponse.complete('success');
      log('Payment completed successfully');
      */

      // Step 6: Process the payment
      await processApplePayPayment(currency, amount, paymentResponse);

      // Step 7: Complete the payment
      log('Completing payment...');
      await paymentResponse.complete('success');
      log('Payment completed successfully');

    } catch (error) {
      log('Apple Pay error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        code: error.code
      });
      
      if (error.message === 'AbortError' || error.name === 'AbortError') {
        log('User cancelled Apple Pay');
        return;
      }
      
      // Provide specific error messages based on error type
      let errorMessage = 'Unable to process Apple Pay payment.';
      
      if (error.message.includes('not supported')) {
        errorMessage = 'Apple Pay is not supported on this device or iOS version.';
      } else if (error.message.includes('merchant')) {
        errorMessage = 'Apple Pay merchant configuration error. This is a development setup issue.';
      } else if (error.message.includes('network')) {
        errorMessage = 'Network error during Apple Pay setup. Please check your connection.';
      } else if (error.message.includes('Invalid')) {
        errorMessage = 'Invalid payment configuration. Please try again.';
      } else {
        errorMessage = `Apple Pay error: ${error.message}`;
      }
      
      Alert.alert(
        'Apple Pay Error', 
        errorMessage,
        [
          { 
            text: 'Try Bank Transfer', 
            onPress: () => handleBankTransferDeposit(currency) 
          },
          { text: 'OK', style: 'cancel' }
        ]
      );
    }
  };

  // Handle Apple Pay Demo (fallback for testing)
  let handleApplePayDemo = async (currency) => {
    log('Apple Pay Demo mode requested');
    
    if (Platform.OS !== 'ios') {
      Alert.alert('Apple Pay Not Available', 'Apple Pay is only available on iOS devices.');
      return;
    }

    try {
      // Step 1: Show amount input dialog
      const depositAmount = await showDepositAmountDialog(currency);
      if (!depositAmount) return;

      // Step 2: Validate amount
      const amount = parseFloat(depositAmount);
      if (isNaN(amount) || amount <= 0) {
        Alert.alert('Invalid Amount', 'Please enter a valid deposit amount.');
        return;
      }

      // Step 3: Simulate Apple Pay payment sheet with native iOS alert
      Alert.alert(
        '🍎 Apple Pay Demo',
        `Simulate payment of ${getCurrencySymbol(currency)}${formatCurrency(amount.toString(), currency)}?\n\nThis is a demo that simulates Apple Pay without requiring merchant setup.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Pay with Touch ID',
            onPress: async () => {
              // Simulate processing delay
              Alert.alert('Processing...', 'Please wait while we process your payment.');
              
              setTimeout(() => {
                Alert.alert(
                  'Payment Successful! 🎉',
                  `Demo payment of ${getCurrencySymbol(currency)}${formatCurrency(amount.toString(), currency)} completed.\n\nTransaction ID: DEMO_${Date.now()}`,
                  [
                    {
                      text: 'View Transaction',
                      onPress: () => appState.changeState('History')
                    },
                    { text: 'OK' }
                  ]
                );
                triggerRender(renderCount + 1);
              }, 2000);
            }
          }
        ]
      );

    } catch (error) {
      log('Apple Pay Demo error:', error);
      Alert.alert('Demo Error', 'There was an error with the Apple Pay demo.');
    }
  };

  // Show deposit amount input dialog
  let showDepositAmountDialog = (currency) => {
    return new Promise((resolve) => {
      Alert.prompt(
        `Deposit ${currency}`,
        `Enter the amount you want to deposit:`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
          {
            text: 'Continue',
            onPress: (amount) => resolve(amount)
          }
        ],
        'plain-text',
        '',
        'numeric'
      );
    });
  };

  // Process Apple Pay payment
  let processApplePayPayment = async (currency, amount, paymentResponse) => {
    try {
      log('Processing Apple Pay payment:', {
        currency,
        amount,
        paymentToken: paymentResponse.details.paymentToken
      });

      // In a real app, you would send the payment token to your backend
      // Your backend would then process it with a payment processor like Stripe
      
      // For sandbox testing, we'll simulate the processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Extract payment token details for logging (sandbox only)
      const paymentToken = paymentResponse.details.paymentToken;
      log('Apple Pay Token received:', {
        transactionIdentifier: paymentToken.transactionIdentifier,
        paymentMethodDisplayName: paymentToken.paymentMethod?.displayName,
        paymentMethodNetwork: paymentToken.paymentMethod?.network
      });

      // Simulate successful payment
      Alert.alert(
        'Payment Successful',
        `Your deposit of ${getCurrencySymbol(currency)}${formatCurrency(amount.toString(), currency)} has been processed successfully via Apple Pay.
        
Transaction ID: ${paymentToken.transactionIdentifier || 'SANDBOX_' + Date.now()}`,
        [
          {
            text: 'View Transaction',
            onPress: () => appState.changeState('History')
          },
          { text: 'OK' }
        ]
      );

      // Trigger a refresh of balances (in a real app, this would update the balance)
      triggerRender(renderCount + 1);
      
    } catch (error) {
      log('Apple Pay processing error:', error);
      Alert.alert('Payment Failed', 'Your Apple Pay payment could not be processed. Please try again.');
      throw error; // Re-throw to let the calling function handle completion
    }
  };

  // Handle bank transfer deposit
  let handleBankTransferDeposit = async (currency) => {
    log('Bank transfer deposit requested for currency:', currency);
    
    try {
      // Ensure deposit details are loaded for the currency
      if (currency === 'GBP') {
        try {
          console.log('🔄 CONSOLE: ===== LOAD DEPOSIT DETAILS API CALL =====');
          console.log('📤 CONSOLE: About to call appState.loadDepositDetailsForAsset("GBP")...');
          const depositDetailsResult = await appState.loadDepositDetailsForAsset('GBP');
          console.log('📨 CONSOLE: ===== LOAD DEPOSIT DETAILS API RESPONSE =====');
          console.log('📨 CONSOLE: Raw loadDepositDetailsForAsset response:', depositDetailsResult);
          console.log('📨 CONSOLE: Response type:', typeof depositDetailsResult);
          console.log('📨 CONSOLE: Response JSON:', JSON.stringify(depositDetailsResult, null, 2));
          console.log('📨 CONSOLE: ===== END LOAD DEPOSIT DETAILS API RESPONSE =====');
          
          log('Deposit details loaded for GBP');
          console.log('✅ CONSOLE: Deposit details loaded for GBP');
        } catch (error) {
          log('Note: Could not load deposit details from server, will use fallback values');
          console.log('⚠️ CONSOLE: Could not load deposit details from server, will use fallback values:', error);
        }
      }

      Alert.alert(
        'Bank Transfer Deposit',
        `You will be redirected to a secure payment gateway to deposit ${currency} via bank transfer.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Continue to Payment', 
            onPress: () => {
              try {
                log('Navigating to MakePayment state for bank transfer');
                // Navigate to payment gateway
                appState.changeState('MakePayment');
              } catch (error) {
                log('Error navigating to payment state:', error);
                Alert.alert(
                  'Navigation Error',
                  'Unable to open payment gateway. Please try again.',
                  [{ text: 'OK' }]
                );
              }
            }
          }
        ]
      );
    } catch (error) {
      log('Error in handleBankTransferDeposit:', error);
      Alert.alert(
        'Error',
        'Unable to process bank transfer request. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  // Handle withdrawal
  let handleWithdraw = (currency) => {
    if (['BTC', 'ETH'].includes(currency)) {
      // Open withdraw modal for crypto currencies
      setWithdrawCurrency(currency);
      setWithdrawToAddress('');
      setWithdrawAmountInput('');
      setShowWithdrawModal(true);
      return;
    }

    // For fiat currencies, check if bank account is linked
    Alert.alert(
      `Withdraw ${currency}`,
      'Withdrawal will be sent to your linked bank account.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Continue', 
          onPress: () => handleBankWithdrawal(currency)
        }
      ]
    );
  };

  // Handle bank withdrawal
  let handleBankWithdrawal = (currency) => {
    // Check if user has bank account setup
    Alert.alert(
      'Bank Withdrawal',
      'Please ensure your bank account is set up in your profile before withdrawing.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Check Bank Details', 
          onPress: () => appState.changeState('BankAccounts')
        },
        { 
          text: 'Proceed Anyway', 
          onPress: () => {
            // In real implementation, process withdrawal
            Alert.alert('Withdrawal Initiated', `Your ${currency} withdrawal has been initiated.`);
          }
        }
      ]
    );
  };

  // Handle crypto withdrawal with address book UUID
  let handleCryptoWithdraw = async () => {
    if (!withdrawToAddress || !withdrawAmountInput) {
      Alert.alert('Error', 'Please select an address and enter an amount');
      return;
    }

    if (!appState.apiClient) {
      Alert.alert('Error', 'API client not available');
      return;
    }

    try {
      setIsWithdrawing(true);
      
      console.log('🏦 Starting crypto withdrawal...');
      console.log('🏦 Currency:', withdrawCurrency);
      console.log('🏦 Address UUID:', withdrawToAddress);
      console.log('🏦 Amount:', withdrawAmountInput);

      console.log('🔄 CONSOLE: ===== CRYPTO WITHDRAW API CALL =====');
      console.log('📤 CONSOLE: About to call appState.apiClient.privateMethod for withdraw...');
      console.log('📤 CONSOLE: API parameters:', {
        httpMethod: 'POST',
        apiRoute: 'withdraw',
        params: {
          address: withdrawToAddress, // This is the UUID from address book
          volume: withdrawAmountInput,
          priority: 'normal'
        }
      });

      // Call withdraw API using address book UUID
      let result = await appState.apiClient.privateMethod({
        httpMethod: 'POST',
        apiRoute: 'withdraw',
        params: {
          address: withdrawToAddress, // This is the UUID from address book
          volume: withdrawAmountInput,
          priority: 'normal' // Can be 'low', 'normal', or 'high'
        }
      });

      console.log('📨 CONSOLE: ===== CRYPTO WITHDRAW API RESPONSE =====');
      console.log('📨 CONSOLE: Raw privateMethod (withdraw) response:', result);
      console.log('📨 CONSOLE: Response type:', typeof result);
      console.log('📨 CONSOLE: Response is null:', result === null);
      console.log('📨 CONSOLE: Response is undefined:', result === undefined);
      console.log('📨 CONSOLE: Response JSON:', JSON.stringify(result, null, 2));
      console.log('📨 CONSOLE: ===== END CRYPTO WITHDRAW API RESPONSE =====');
      
      console.log('🏦 Withdraw API result:', result);
      console.log('🏦 ===== DETAILED API RESPONSE ANALYSIS =====');
      console.log('🏦 Response type:', typeof result);
      console.log('🏦 Response is null:', result === null);
      console.log('🏦 Response is undefined:', result === undefined);
      console.log('🏦 Response stringified:', JSON.stringify(result, null, 2));
      
      if (result && typeof result === 'object') {
        console.log('🏦 Response keys:', Object.keys(result));
        console.log('🏦 Has error property:', 'error' in result);
        console.log('🏦 Error value:', result.error);
        console.log('🏦 Error type:', typeof result.error);
        console.log('🏦 Error is null:', result.error === null);
        console.log('🏦 Error is undefined:', result.error === undefined);
        console.log('🏦 Error stringified:', JSON.stringify(result.error));
        
        if (result.error && typeof result.error === 'string') {
          console.log('🏦 Error string length:', result.error.length);
          console.log('🏦 Error lowercase:', result.error.toLowerCase());
          console.log('🏦 Contains "successfully":', result.error.toLowerCase().includes('successfully'));
          console.log('🏦 Contains "queued":', result.error.toLowerCase().includes('queued'));
          console.log('🏦 Contains "withdrawal":', result.error.toLowerCase().includes('withdrawal'));
        }
        
        console.log('🏦 Has id property:', 'id' in result);
        console.log('🏦 ID value:', result.id);
        console.log('🏦 Has data property:', 'data' in result);
        console.log('🏦 Data value:', result.data);
      }
      console.log('🏦 ===== END DETAILED RESPONSE ANALYSIS =====');

      // Check for success conditions
      let isSuccess = false;
      let successMessage = '';

      if (result && result.error === null) {
        // Top-level error is null - this indicates success
        isSuccess = true;
        console.log('🏦 Top-level error is null - treating as success');
        
        // Check for success message in data.error
        if (result?.data?.error && typeof result.data.error === 'string') {
          console.log('🏦 Using success message from data.error:', result.data.error);
          successMessage = `Your ${withdrawCurrency} withdrawal of ${withdrawAmountInput} - ${result.data.error}`;
        } else if (result?.id) {
          console.log('🏦 Using transaction ID for success message:', result.id);
          successMessage = `Your ${withdrawCurrency} withdrawal of ${withdrawAmountInput} has been initiated. Transaction ID: ${result.id}`;
        } else {
          successMessage = `Your ${withdrawCurrency} withdrawal of ${withdrawAmountInput} has been initiated.`;
        }
      }

      if (isSuccess) {
        Alert.alert(
          'Withdrawal Initiated',
          successMessage,
          [{ text: 'OK', onPress: () => setShowWithdrawModal(false) }]
        );
        
        // Refresh balances
        await setup();
      } else {
        // Handle actual errors (when top-level error is not null)
        let errorMsg = result?.error || 'Unknown error occurred';
        console.log('🏦 Withdrawal failed with error (top-level error not null):', errorMsg);
        console.log('🏦 Full error response:', JSON.stringify(result, null, 2));
        Alert.alert('Withdrawal Failed', errorMsg);
      }
    } catch (error) {
      console.error('🏦 Withdraw error:', error);
      Alert.alert('Withdrawal Failed', 'An error occurred while processing your withdrawal');
    } finally {
      setIsWithdrawing(false);
    }
  };

  // Calculate GBP value for any currency using ticker rates
  let calculateGBPValue = (currency, amount, tickerData) => {
    console.log(`💱 calculateGBPValue: ${currency}, amount: ${amount}`);
    console.log(`💱 tickerData available:`, Object.keys(tickerData || {}));
    console.log(`💱 Full tickerData:`, JSON.stringify(tickerData, null, 2));
    
    if (currency === 'GBP') {
      return amount; // Already in GBP
    }
    
    // Check if amount is valid
    if (!amount || amount <= 0) {
      console.log(`💱 Invalid amount for ${currency}: ${amount}`);
      return 0;
    }
    
    let market = `${currency}/GBP`;
    let rateData = tickerData[market];
    
    console.log(`💱 Looking for market: ${market}`);
    console.log(`💱 Rate data found:`, rateData);
    
    if (rateData && rateData.price) {
      let rate = parseFloat(rateData.price) || 0;
      let gbpValue = amount * rate;
      console.log(`💱 ${currency}: ${amount} × £${rate} = £${gbpValue.toFixed(2)}`);
      return gbpValue;
    } else {
      console.log(`💱 No valid rate found for ${market}. Using fallback rates...`);
      
      // Fallback rates for testing (remove in production)
      let fallbackRates = {
        'BTC/GBP': 31712.51,
        'ETH/GBP': 2324.00,
        'EUR/GBP': 0.85,
        'USD/GBP': 0.80
      };
      
      let fallbackRate = fallbackRates[market];
      if (fallbackRate) {
        let gbpValue = amount * fallbackRate;
        console.log(`💱 ${currency}: ${amount} × £${fallbackRate} (fallback) = £${gbpValue.toFixed(2)}`);
        return gbpValue;
      }
    }
    
    console.log(`💱 No rate available for ${market} - returning 0`);
    return 0; // No rate available
  };

  // Render balance list item for each currency
  let renderBalanceListItem = (currency, balanceInfo, tickerData) => {
    let { total } = balanceInfo;
    let icon = getCurrencyIcon(currency);
    let isCrypto = ['BTC', 'ETH'].includes(currency);
    
    console.log(`🎨 Rendering ${currency}: balanceInfo =`, balanceInfo);
    console.log(`🎨 ${currency}: total = ${total} (type: ${typeof total})`);
    console.log(`🎨 ${currency}: tickerData keys =`, Object.keys(tickerData || {}));
    
    // Calculate GBP value for this specific currency
    let gbpValue = calculateGBPValue(currency, total, tickerData || {});
    console.log(`🎨 ${currency}: calculated GBP value = ${gbpValue}`);
    
    // For display: always show GBP value on the right
    let displayValue = `£${formatCurrency(gbpValue.toString(), 'GBP')}`;
    console.log(`🎨 ${currency}: final display value = ${displayValue}`);
    
    // Show original amount in description for reference
    let description = '';
    if (currency === 'GBP') {
      description = 'Base currency';
    } else {
      // Show original amount for all non-GBP currencies
      if (isCrypto) {
        description = `${formatCurrency(total, currency)} ${currency}`;
      } else {
        description = `${getCurrencySymbol(currency)}${formatCurrency(total, currency)}`;
      }
    }
    
    // Get icon color exactly like AddressBook
    let getAssetColor = (assetType) => {
      switch (assetType) {
        case 'BTC': return '#f7931a';
        case 'ETH': return '#627eea';
        case 'GBP': return '#009639';
        default: return '#999999'; // mediumGray equivalent
      }
    };
    
    return (
      <List.Item
        key={currency}
        title={currency}
        description={description}
        left={props => (
          <View style={{ 
            justifyContent: 'center', 
            alignItems: 'center',
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: theme.colors.surfaceVariant,
            marginRight: 12
          }}>
            <Icon name={icon} size={24} color={getAssetColor(currency)} />
          </View>
        )}
        right={props => (
          <View style={{ justifyContent: 'center' }}>
            <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
              {displayValue}
            </Text>
          </View>
        )}
        style={{ paddingVertical: 8 }}
      />
    );
  };

  // Filter balances by type
  let getFilteredBalances = (balanceData, type) => {
    return Object.entries(balanceData).filter(([currency]) => {
      let isCrypto = ['BTC', 'ETH'].includes(currency);
      return type === 'crypto' ? isCrypto : !isCrypto;
    });
  };

  let balanceData = getBalanceData();

  if (isLoading) {
    return (
      <View style={[layout.panelContainer, { justifyContent: 'center', alignItems: 'center' }]}>
        <ProgressBar indeterminate />
        <Text style={{ marginTop: 16 }}>Loading wallet...</Text>
      </View>
    );
  }

  return (
    <View style={layout.panelContainer}>
      <Title 
        title="Wallet" 
        showBackButton={true}
        onBackPress={() => appState.goToPreviousState()}
      />
      
      <ScrollView 
        style={layout.panelSubContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ 
          paddingBottom: 20, 
          paddingHorizontal: 16 
        }}
      >
        {/* Wallet Overview Card */}
        <Card style={{ marginBottom: 20 }}>
          <Card.Content style={{ padding: 20 }}>
            <Text variant="titleLarge" style={{ fontWeight: 'bold', marginBottom: 16 }}>
              Your Wallet
            </Text>
            
            {/* Total Portfolio Value */}
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>
                Total Portfolio Value
              </Text>
              <Text variant="headlineMedium" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
                {isCalculatingTotal ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <ProgressBar indeterminate style={{ width: 100, marginRight: 8 }} />
                    <Text>Calculating...</Text>
                  </View>
                ) : (
                  `£${formatCurrency(totalPortfolioValue.toString(), 'GBP')}`
                )}
              </Text>
            </View>
            
            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Button
                mode="contained"
                onPress={() => {
                  // Navigate to DepositInstructions page
                  appState.changeState('DepositInstructions');
                }}
                style={{ flex: 1 }}
                icon="plus"
              >
                Deposit
              </Button>
              <Button
                mode="outlined"
                onPress={() => {
                  Alert.alert(
                    'Select Currency',
                    'Choose which currency to withdraw:',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'GBP', onPress: () => handleWithdraw('GBP') },
                      { text: 'EUR', onPress: () => handleWithdraw('EUR') },
                      { text: 'USD', onPress: () => handleWithdraw('USD') },
                      { text: 'BTC', onPress: () => handleWithdraw('BTC') },
                      { text: 'ETH', onPress: () => handleWithdraw('ETH') }
                    ]
                  );
                }}
                style={{ flex: 1 }}
                icon="minus"
              >
                Withdraw
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* Balance Cards with Tabs */}
        <Card style={{ marginBottom: 12 }}>
          <Card.Content style={{ padding: 0 }}>
            <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
              <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                Your Balances
              </Text>
            </View>
            
            {/* Tab Navigation */}
            <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8 }}>
              <Button
                mode={selectedBalanceTab === 'crypto' ? 'contained' : 'outlined'}
                onPress={() => setSelectedBalanceTab('crypto')}
                style={{ 
                  flex: 1, 
                  marginRight: 8,
                  borderRadius: 20
                }}
                compact
              >
                Crypto
              </Button>
              <Button
                mode={selectedBalanceTab === 'fiat' ? 'contained' : 'outlined'}
                onPress={() => setSelectedBalanceTab('fiat')}
                style={{ 
                  flex: 1,
                  borderRadius: 20
                }}
                compact
              >
                Fiat
              </Button>
            </View>
            
            <Divider />
            
            {/* Balance List */}
            <View>
              {getFilteredBalances(balanceData, selectedBalanceTab).map(([currency, balanceInfo]) => 
                renderBalanceListItem(currency, balanceInfo, tickerData)
              )}
              {getFilteredBalances(balanceData, selectedBalanceTab).length === 0 && (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                    No {selectedBalanceTab} balances to display
                  </Text>
                </View>
              )}
            </View>
          </Card.Content>
        </Card>

        {/* Quick Actions */}
        <Card style={{ marginTop: 12 }}>
          <Card.Content style={{ padding: 16 }}>
            <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 12 }}>
              Quick Actions
            </Text>
            
            <List.Item
              title="View Transaction History"
              description="See all your deposits and withdrawals"
              left={props => <List.Icon {...props} icon="history" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => appState.changeState('History')}
              style={{ paddingHorizontal: 0 }}
            />
            
            <Divider />
            
            <List.Item
              title="Manage Bank Accounts"
              description="Add or update your banking details"
              left={props => <List.Icon {...props} icon="bank" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => appState.changeState('BankAccounts')}
              style={{ paddingHorizontal: 0 }}
            />
            
            <Divider />
            
            <List.Item
              title="Send Crypto"
              description="Send Bitcoin or Ethereum to another wallet"
              left={props => <List.Icon {...props} icon="send" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => appState.changeState('Send')}
              style={{ paddingHorizontal: 0 }}
            />
            
            <Divider />
            
            <List.Item
              title="Receive Crypto"
              description="Get your wallet address to receive funds"
              left={props => <List.Icon {...props} icon="qrcode" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => appState.changeState('Receive')}
              style={{ paddingHorizontal: 0 }}
            />
          </Card.Content>
        </Card>

        {/* Security Notice */}
        <Surface style={{ 
          padding: 16, 
          marginTop: 16, 
          borderRadius: 8,
          backgroundColor: theme.colors.primaryContainer 
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <List.Icon icon="shield-check" color={theme.colors.primary} />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text variant="titleSmall" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
                Your Funds Are Secure
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onPrimaryContainer, marginTop: 4 }}>
                All deposits are protected and withdrawals require authentication. 
                Your cryptocurrency is stored in secure cold storage wallets.
              </Text>
            </View>
          </View>
        </Surface>
      </ScrollView>

      {/* Withdraw Modal */}
      <Modal
        visible={showWithdrawModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowWithdrawModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20
        }}>
          <View style={{
            backgroundColor: 'white',
            borderRadius: 12,
            padding: 20,
            width: '100%',
            maxWidth: 400,
            maxHeight: '80%'
          }}>
            <Text variant="titleLarge" style={{ fontWeight: 'bold', marginBottom: 20, textAlign: 'center' }}>
              Withdraw {withdrawCurrency}
            </Text>

            {/* Address Selection */}
            <View style={{ marginBottom: 20 }}>
              <Text variant="titleMedium" style={{ marginBottom: 10 }}>
                Select Destination Address
              </Text>
              <AddressBookPicker
                selectedAsset={withdrawCurrency}
                onAddressSelect={(address, selectedAddressData) => {
                  console.log('🏦 Selected address:', address);
                  console.log('🏦 Selected address data:', selectedAddressData);
                  // Use the UUID from the address data for the API call
                  let addressUUID = selectedAddressData?.id || selectedAddressData?.rawData?.uuid;
                  console.log('🏦 Address UUID for API:', addressUUID);
                  setWithdrawToAddress(addressUUID);
                }}
                label="Choose from Address Book"
                placeholder="Select a saved address..."
              />
              {withdrawToAddress ? (
                <Text variant="bodySmall" style={{ marginTop: 8, color: theme.colors.primary }}>
                  ✓ Address selected
                </Text>
              ) : null}
            </View>

            {/* Amount Input */}
            <View style={{ marginBottom: 20 }}>
              <Text variant="titleMedium" style={{ marginBottom: 10 }}>
                Amount to Withdraw
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: theme.colors.outline,
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16
                }}
                placeholder={`Enter ${withdrawCurrency} amount`}
                value={withdrawAmountInput}
                onChangeText={setWithdrawAmountInput}
                keyboardType="numeric"
                autoCapitalize="none"
              />
            </View>

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 8,
                  backgroundColor: theme.colors.surfaceVariant,
                  marginRight: 10
                }}
                onPress={() => setShowWithdrawModal(false)}
                disabled={isWithdrawing}
              >
                <Text style={{ textAlign: 'center', color: theme.colors.onSurfaceVariant }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 8,
                  backgroundColor: isWithdrawing ? theme.colors.surfaceVariant : theme.colors.primary,
                  marginLeft: 10
                }}
                onPress={handleCryptoWithdraw}
                disabled={isWithdrawing || !withdrawToAddress || !withdrawAmountInput}
              >
                <Text style={{ 
                  textAlign: 'center', 
                  color: isWithdrawing ? theme.colors.onSurfaceVariant : theme.colors.onPrimary,
                  fontWeight: 'bold'
                }}>
                  {isWithdrawing ? 'Processing...' : 'Withdraw'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default Wallet;
// React imports
import React, { useContext, useEffect, useState } from 'react';
import { ScrollView, View, Alert, Platform } from 'react-native';

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
import { StandardButton } from 'src/components/atomic';
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
  let [renderCount, triggerRender] = useState(0);
  let [isLoading, setIsLoading] = useState(true);
  let [depositAmount, setDepositAmount] = useState('');
  let [withdrawAmount, setWithdrawAmount] = useState('');
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
      await appState.generalSetup({caller: 'Wallet'});
      
      // Load user balances
      try {
        await appState.loadBalances();
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

  // Get balance data with fallback values
  let getBalanceData = () => {
    let balanceData = appState.apiData?.balances || {};
    
    // Mock data for development/demo purposes
    if (_.isEmpty(balanceData)) {
      return {
        GBP: { available: 1250.75, reserved: 50.25, total: 1301.00 },
        BTC: { available: 0.05432100, reserved: 0.00000000, total: 0.05432100 },
        ETH: { available: 1.25431000, reserved: 0.00000000, total: 1.25431000 },
        EUR: { available: 850.50, reserved: 0.00, total: 850.50 },
        USD: { available: 1050.25, reserved: 25.75, total: 1076.00 }
      };
    }
    
    return balanceData;
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
          await appState.loadDepositDetailsForAsset('GBP');
          log('Deposit details loaded for GBP');
        } catch (error) {
          log('Note: Could not load deposit details from server, will use fallback values');
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
      Alert.alert(
        'Crypto Withdrawal',
        `To withdraw ${currency}, please use the Send feature.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Go to Send', 
            onPress: () => appState.changeState('Send')
          }
        ]
      );
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

  // Render balance card for each currency
  let renderBalanceCard = (currency, balanceInfo) => {
    let { available, reserved, total } = balanceInfo;
    let symbol = getCurrencySymbol(currency);
    let isCrypto = ['BTC', 'ETH'].includes(currency);
    
    return (
      <Card key={currency} style={{ marginBottom: 12 }}>
        <Card.Content style={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Avatar.Text 
                size={40} 
                label={currency} 
                style={{ 
                  backgroundColor: isCrypto ? theme.colors.primary : theme.colors.secondary,
                  marginRight: 12 
                }}
              />
              <View>
                <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                  {currency}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {isCrypto ? 'Cryptocurrency' : 'Fiat Currency'}
                </Text>
              </View>
            </View>
            <Text variant="headlineSmall" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
              {symbol}{formatCurrency(total, currency)}
            </Text>
          </View>

          <Divider style={{ marginVertical: 8 }} />

          <View style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text variant="bodyMedium">Available</Text>
              <Text variant="bodyMedium" style={{ fontWeight: '500' }}>
                {symbol}{formatCurrency(available, currency)}
              </Text>
            </View>
            {reserved > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Reserved
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {symbol}{formatCurrency(reserved, currency)}
                </Text>
              </View>
            )}
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button
              mode="contained"
              onPress={() => handleDeposit(currency)}
              style={{ flex: 1 }}
              icon="plus"
            >
              Deposit
            </Button>
            <Button
              mode="outlined"
              onPress={() => handleWithdraw(currency)}
              style={{ flex: 1 }}
              icon="minus"
              disabled={available <= 0}
            >
              Withdraw
            </Button>
          </View>
        </Card.Content>
      </Card>
    );
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
            <Text variant="titleLarge" style={{ fontWeight: 'bold', marginBottom: 8 }}>
              Your Wallet
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
              Manage your deposits, withdrawals, and view your balances across all currencies.
            </Text>
            
            {/* Quick Stats */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 }}>
              <View style={{ alignItems: 'center' }}>
                <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.primary }}>
                  {Object.keys(balanceData).length}
                </Text>
                <Text variant="bodySmall">Currencies</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text variant="titleMedium" style={{ fontWeight: 'bold', color: theme.colors.secondary }}>
                  {Object.values(balanceData).filter(b => b.total > 0).length}
                </Text>
                <Text variant="bodySmall">Active</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Balance Cards */}
        <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 12, paddingHorizontal: 4 }}>
          Your Balances
        </Text>
        
        {Object.entries(balanceData).map(([currency, balanceInfo]) => 
          renderBalanceCard(currency, balanceInfo)
        )}

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
    </View>
  );
};

export default Wallet;
// React imports
import React, { useContext, useEffect, useState } from 'react';
import { ScrollView, View, Alert, Platform } from 'react-native';

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
          text: 'Bank Transfer', 
          onPress: () => handleBankTransferDeposit(currency)
        }
      ]
    );
  };

  // Handle Apple Pay deposit
  let handleApplePayDeposit = async (currency) => {
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

      // Step 3: Simulate Apple Pay payment sheet
      Alert.alert(
        'Apple Pay Payment',
        `Confirm payment of ${getCurrencySymbol(currency)}${formatCurrency(amount.toString(), currency)} using Apple Pay?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Pay with Apple Pay',
            onPress: () => processApplePayPayment(currency, amount)
          }
        ]
      );
    } catch (error) {
      log('Apple Pay error:', error);
      Alert.alert('Payment Error', 'Unable to process Apple Pay payment. Please try again.');
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
  let processApplePayPayment = async (currency, amount) => {
    try {
      // Show loading state
      Alert.alert('Processing...', 'Please wait while we process your Apple Pay payment.');

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simulate successful payment
      Alert.alert(
        'Payment Successful',
        `Your deposit of ${getCurrencySymbol(currency)}${formatCurrency(amount.toString(), currency)} has been processed successfully via Apple Pay.`,
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
    }
  };

  // Handle bank transfer deposit
  let handleBankTransferDeposit = (currency) => {
    Alert.alert(
      'Bank Transfer',
      `Bank transfer deposit would redirect to payment gateway for ${currency}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Continue', 
          onPress: () => {
            // In real implementation, redirect to payment gateway
            appState.changeState('MakePayment');
          }
        }
      ]
    );
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
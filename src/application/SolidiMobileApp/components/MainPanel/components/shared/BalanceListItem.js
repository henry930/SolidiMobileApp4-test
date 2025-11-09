import React from 'react';
import { View } from 'react-native';
import { Text, List } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Helper: Check if currency is crypto
export const isCryptoCurrency = (currency) => {
  // Fiat currencies
  const fiatCurrencies = ['GBP', 'EUR', 'USD', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD'];
  // If it's not fiat, it's crypto
  return !fiatCurrencies.includes(currency);
};

// Helper: Get currency icon
export const getCurrencyIcon = (currency) => {
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

// Helper: Get currency symbol
export const getCurrencySymbol = (currency) => {
  const symbolMap = {
    'GBP': '£',
    'USD': '$',
    'EUR': '€',
    'JPY': '¥',
    'CHF': 'CHF ',
    'CAD': 'C$',
    'AUD': 'A$',
    'NZD': 'NZ$'
  };
  return symbolMap[currency] || '';
};

// Helper: Get asset color
export const getAssetColor = (assetType) => {
  switch (assetType) {
    case 'BTC': return '#f7931a';
    case 'ETH': return '#627eea';
    case 'GBP': return '#009639';
    case 'LTC': return '#345d9d';
    case 'XRP': return '#23292f';
    case 'BCH': return '#8dc351';
    default: return '#999999';
  }
};

// Helper: Calculate GBP value for any currency
export const calculateGBPValue = (currency, amount, appState) => {
  console.log(`🔍 calculateGBPValue: ${currency}, amount = ${amount}`);
  
  if (currency === 'GBP') {
    console.log(`🔍 ${currency} is GBP, returning amount: ${amount}`);
    return amount; // Already in GBP
  }
  
  // Check if amount is valid
  if (!amount || amount <= 0) {
    console.log(`🔍 ${currency} has zero/invalid amount, returning 0`);
    return 0;
  }
  
  // For crypto: Try to get pre-calculated balance first (fastest!)
  if (isCryptoCurrency(currency)) {
    console.log(`🔍 ${currency} is crypto, checking pre-calculated value...`);
    // If this is the user's actual balance, get pre-calculated value
    const userBalance = parseFloat(appState.getBalance(currency));
    console.log(`🔍 User balance from appState = ${userBalance}`);
    
    if (Math.abs(amount - userBalance) < 0.00000001) {
      // This is the user's balance - use pre-calculated value!
      const precalculatedValue = appState.getBalanceInGBP(currency);
      console.log(`🔍 Pre-calculated GBP value = ${precalculatedValue}`);
      
      if (precalculatedValue !== undefined && precalculatedValue !== 0) {
        console.log(`⚡ ${currency} using PRE-CALCULATED balance: £${precalculatedValue.toFixed(2)}`);
        return precalculatedValue;
      }
    }
    
    // Otherwise calculate on-the-fly using cached rate
    console.log(`🔍 Calculating on-the-fly using appState.calculateCryptoGBPValue...`);
    const value = appState.calculateCryptoGBPValue(currency, amount);
    console.log(`🔍 On-the-fly calculated value = ${value}`);
    return value || 0;
  }
  
  // Fallback for fiat currencies (EUR, USD) - would need exchange rates
  console.log(`🔍 ${currency} is fiat (not GBP), returning 0 (no exchange rate)`);
  return 0;
};

// Helper: Format currency
export const formatCurrency = (value, currency) => {
  const num = parseFloat(value);
  if (isNaN(num)) return '0.00';
  
  if (isCryptoCurrency(currency)) {
    // For crypto, show more decimal places
    if (num < 0.01) {
      return num.toFixed(8);
    } else if (num < 1) {
      return num.toFixed(6);
    } else if (num < 100) {
      return num.toFixed(4);
    } else {
      return num.toFixed(2);
    }
  } else {
    // For fiat, show 2 decimal places
    return num.toFixed(2);
  }
};

/**
 * Shared Balance List Item Component
 * Used by both Wallet and Home to display asset balances consistently
 */
const BalanceListItem = ({ 
  currency, 
  balanceInfo, 
  appState,
  theme,
  onPress 
}) => {
  const { total } = balanceInfo;
  const icon = getCurrencyIcon(currency);
  const isCrypto = isCryptoCurrency(currency);
  
  // Calculate GBP value instantly using cached prices
  const gbpValue = calculateGBPValue(currency, total, appState);
  
  console.log(`💰 BALANCE CARD: ${currency} balance = ${total}, GBP value = £${gbpValue.toFixed(2)}`);
  
  // For display: always show GBP value on the right
  const displayValue = `£${formatCurrency(gbpValue.toString(), 'GBP')}`;
  
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
  
  return (
    <View style={{ paddingVertical: 8 }}>
      <List.Item
        title={currency}
        description={description}
        onPress={onPress}
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
        style={{ paddingVertical: 4 }}
      />
    </View>
  );
};

export default BalanceListItem;

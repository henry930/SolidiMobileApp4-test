// React imports
import React, { useContext, useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  TouchableOpacity, 
  Dimensions, 
  TextInput,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import _ from 'lodash';

// Material Design imports
import {
  Text,
  IconButton,
  FAB
} from 'react-native-paper';

// Internal imports
import AppStateContext from 'src/application/data';
import { colors } from 'src/constants';

// Screen dimensions
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

/**
 * Sell Component - Minimal crypto selling interface matching Buy design
 */
const Sell = ({ onBack }) => {
  const appState = useContext(AppStateContext);
  const inputRef = useRef(null);
  
  const handleClose = () => {
    if (onBack && typeof onBack === 'function') {
      onBack();
    }
  };
  
  // Component state
  const [selectedAsset, setSelectedAsset] = useState(appState.selectedCrypto?.asset || 'BTC');
  const [inputMode, setInputMode] = useState('CRYPTO'); // 'GBP' or 'CRYPTO' - default to crypto for selling
  const [inputAmount, setInputAmount] = useState('');
  const [convertedAmount, setConvertedAmount] = useState('0');
  const [isLoading, setIsLoading] = useState(false);
  const [walletCurrency] = useState('GBP'); // Default wallet currency
  
  // Get crypto balance for selected asset
  const getCryptoBalance = () => {
    try {
      const balance = appState.getBalance(selectedAsset);
      return balance || '0.00';
    } catch (error) {
      return '0.00';
    }
  };
  
  const cryptoBalance = getCryptoBalance();
  
  // Fetch best price from API
  const fetchBestPrice = async (amount, mode) => {
    if (!amount || parseFloat(amount) <= 0) {
      setConvertedAmount('0');
      return;
    }
    
    setIsLoading(true);
    try {
      const market = `${selectedAsset}/GBP`;
      
      if (mode === 'CRYPTO') {
        // User entered crypto, get GBP amount
        const params = {
          market,
          side: 'SELL',
          baseOrQuoteAsset: 'base',
          baseAssetVolume: amount
        };
        
        const response = await appState.fetchBestPriceForASpecificVolume(params);
        
        if (response && response.price) {
          setConvertedAmount(response.price);
        } else {
          setConvertedAmount('0');
        }
      } else {
        // User entered GBP, get crypto amount
        const params = {
          market,
          side: 'SELL',
          baseOrQuoteAsset: 'quote',
          quoteAssetVolume: amount
        };
        
        const response = await appState.fetchBestPriceForASpecificVolume(params);
        
        if (response && response.price) {
          setConvertedAmount(response.price);
        } else {
          setConvertedAmount('0');
        }
      }
    } catch (error) {
      console.log('Error fetching best price:', error);
      setConvertedAmount('0');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Update converted amount when input changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBestPrice(inputAmount, inputMode);
    }, 500); // Debounce API calls
    
    return () => clearTimeout(timer);
  }, [inputAmount, inputMode, selectedAsset]);
  
  const handleAmountChange = (value) => {
    // Remove non-numeric characters except decimal point
    const cleaned = value.replace(/[^0-9.]/g, '');
    setInputAmount(cleaned);
  };
  
  const handleSwapCurrency = () => {
    // Toggle between crypto and GBP input
    setInputMode(inputMode === 'CRYPTO' ? 'GBP' : 'CRYPTO');
    // Swap the amounts
    const temp = inputAmount;
    setInputAmount(convertedAmount);
    setConvertedAmount(temp);
  };
  
  const handleReviewOrder = () => {
    // Initialize panels.sell if it doesn't exist
    if (!appState.panels.sell) {
      appState.panels.sell = {};
    }
    
    // Prepare order data based on input mode
    let volumeQA, volumeBA;
    
    if (inputMode === 'CRYPTO') {
      // User entered crypto, we have GBP in convertedAmount
      volumeBA = inputAmount;
      volumeQA = convertedAmount;
    } else {
      // User entered GBP, we have crypto in convertedAmount
      volumeBA = convertedAmount;
      volumeQA = inputAmount;
    }
    
    const assetQA = 'GBP';
    const assetBA = selectedAsset;
    
    // Save order details to appState.panels.sell
    _.assign(appState.panels.sell, {
      volumeQA,
      assetQA,
      volumeBA,
      assetBA
    });
    
    // Set active order flag
    appState.panels.sell.activeOrder = true;
    
    // Navigate to receive payment choice page
    appState.changeState('ChooseHowToReceivePayment', 'balance');
  };
  
  const isValidAmount = inputAmount && parseFloat(inputAmount) > 0;
  
  return (
    <View style={styles.modalContainer}>
      {/* Header */}
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Sell {selectedAsset}</Text>
        <IconButton
          icon="close"
          size={24}
          onPress={handleClose}
          style={styles.closeButton}
        />
      </View>

      <View style={styles.container}>
        <View style={styles.content}>
          {/* Crypto Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.cryptoLogo}>
              <Icon name="bitcoin" size={28} color="#fff" />
            </View>
          </View>
          
          {/* Main Input Area - Centered */}
          <View style={styles.mainInputContainer}>
          <View style={styles.amountInputWrapper}>
            <Text style={styles.currencySymbol}>
              {inputMode === 'GBP' ? '£' : '₿'}
            </Text>
            <TextInput
              ref={inputRef}
              style={styles.amountInput}
              value={inputAmount}
              onChangeText={handleAmountChange}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#9E9E9E"
              selectionColor="#2196F3"
              autoFocus
            />
            <TouchableOpacity style={styles.swapButton} onPress={handleSwapCurrency}>
              <Icon name="swap-vertical" size={20} color="#2196F3" />
            </TouchableOpacity>
          </View>
          
          {/* Converted amount display */}
          <View style={styles.convertedAmountContainer}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#9E9E9E" />
            ) : (
              <Text style={styles.cryptoEquivalent}>
                {inputMode === 'CRYPTO' 
                  ? `£${convertedAmount}`
                  : `${convertedAmount} ${selectedAsset}`
                }
              </Text>
            )}
          </View>
          
          {/* Wallet Selector */}
          <TouchableOpacity style={styles.accountSelector}>
            <View style={styles.accountIcon}>
              <Icon name="bitcoin" size={18} color="#fff" />
            </View>
            <Text style={styles.accountText}>{selectedAsset} Balance · {cryptoBalance}</Text>
            <Icon name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
        </View>
        
        {/* Bottom Actions - Only Review Order Button */}
        <View style={styles.bottomActions}>
          <TouchableOpacity 
            style={[
              styles.reviewButton,
              !isValidAmount && styles.reviewButtonDisabled
            ]}
            disabled={!isValidAmount}
            onPress={handleReviewOrder}
          >
            <Text style={[
              styles.reviewButtonText,
              !isValidAmount && styles.reviewButtonTextDisabled
            ]}>
              Review order
            </Text>
          </TouchableOpacity>
        </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    margin: 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  logoContainer: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 10,
  },
  cryptoLogo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF9800',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainInputContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -80, // Move up to center visually
  },
  amountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  currencySymbol: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#757575',
    marginRight: 8,
  },
  amountInput: {
    amountInput: {
    fontSize: 48, // Reduced from 72
    fontWeight: 'bold',
    color: '#424242',
    minWidth: 100,
    padding: 0,
    textAlign: 'right',
  },
  },
  swapButton: {
    marginLeft: 16,
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  convertedAmountContainer: {
    minHeight: 24,
    marginBottom: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cryptoEquivalent: {
    fontSize: 16,
    color: '#9E9E9E',
  },
  accountSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  accountIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF9800',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  accountText: {
    fontSize: 16,
    color: '#424242',
    flex: 1,
  },
  bottomActions: {
    paddingBottom: 24,
  },
  reviewButton: {
    width: '100%',
    backgroundColor: '#FF5722', // Orange/red for sell action
    paddingVertical: 18,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  reviewButtonDisabled: {
    backgroundColor: '#E0E0E0',
    shadowOpacity: 0,
    elevation: 0,
  },
  reviewButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  reviewButtonTextDisabled: {
    color: '#BDBDBD',
  },
});

export default Sell;

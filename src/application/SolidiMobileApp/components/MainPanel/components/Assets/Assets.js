// React imports
import React, { useContext, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View, TouchableOpacity, RefreshControl, Modal } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Material Design imports
import {
  Text,
  useTheme,
} from 'react-native-paper';

// Other imports
import _ from 'lodash';
import Big from 'big.js';

import AppStateContext from 'src/application/data';
import { colors, sharedStyles, layoutStyles, cardStyles } from 'src/constants';
import { colors as sharedColors } from 'src/styles/shared';
import { scaledWidth, scaledHeight, normalise, normaliseFont } from 'src/util/dimensions';
import { Title } from 'src/components/shared';
import { RiskSummaryModal } from 'src/components/atomic';
import misc from 'src/util/misc';

// Asset Data Model imports
import {
  getAssetInfo
} from './AssetDataModel';

// Import CryptoContent for modal display
import CryptoContent from '../CryptoContent/CryptoContent';

// Create local references for commonly used styles
const layout = layoutStyles;
const cards = cardStyles;

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('Assets');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);

// Number formatting helper - 9 significant digits
const formatTo9Digits = (value) => {
  if (isNaN(value) || !isFinite(value)) return '0';
  
  const num = Number(value);
  if (num === 0) return '0';
  
  if (Math.abs(num) >= 1) {
    // For numbers >= 1, use toPrecision to get 9 significant digits
    return num.toPrecision(9);
  } else {
    // For numbers < 1, use toFixed and remove trailing zeros
    let formatted = num.toFixed(9);
    formatted = formatted.replace(/\.?0+$/, '');
    return formatted === '' ? '0' : formatted;
  }
};

const Assets = () => {
  let appState = useContext(AppStateContext);
  
  // Check if user is authenticated
  const isAuthenticated = appState.user?.isAuthenticated;
  
  // Authentication bypassed - using public /best_volume_price API
  if (!isAuthenticated && !appState.bypassAuthentication) {
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
            Please login to access live asset prices
          </Text>
        </View>
        
        <Text style={{ 
          fontSize: 16, 
          color: '#666',
          textAlign: 'center',
          marginBottom: 30,
          lineHeight: 24
        }}>
          You need to be logged in to access{'\n'}live market data from our exchange.
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
            console.log('🔄 Redirecting to login...');
            // Navigate to login - this would typically be handled by app navigation
            // For now, we'll just log the action
            appState.setMainPanelState('Login');
          }}
        >
          <Text style={{ 
            color: 'white', 
            fontSize: 16,
            fontWeight: '600'
          }}>
            Login to View Prices
          </Text>
        </TouchableOpacity>
        
        <Text style={{ 
          fontSize: 12, 
          color: '#999',
          textAlign: 'center',
          marginTop: 20
        }}>
          Live cryptocurrency prices require authentication{'\n'}
          to access our exchange's live prices via /best_volume_price API
        </Text>
      </View>
    );
  }
  
  // Dynamic asset list based on actual market data from /market API (live data)
  const getAssetListFromMarkets = () => {
    try {
      console.log('📊 Getting asset list from live /market API data...');
      
      // Get available markets from AppState (now live data)
      const markets = appState.getMarkets();
      console.log('🏪 Available markets from live API:', markets);
      
      if (!markets || markets.length === 0) {
        console.log('⚠️ No markets available, using fallback list');
        return getFallbackAssetList();
      }
      
      // Extract unique base assets from markets (e.g., BTC from BTC/GBP)
      const baseAssets = new Set();
      markets.forEach(market => {
        if (typeof market === 'string' && market.includes('/')) {
          const [baseAsset, quoteAsset] = market.split('/');
          // Include crypto assets paired with major fiat currencies
          if (['GBP', 'EUR', 'USD'].includes(quoteAsset)) {
            baseAssets.add(baseAsset);
          }
        } else if (market && market.asset1 && market.asset2) {
          // Handle object format: {asset1: "BTC", asset2: "GBP", ...}
          if (['GBP', 'EUR', 'USD'].includes(market.asset2)) {
            baseAssets.add(market.asset1);
          }
        }
      });
      
      console.log('💰 Base assets found from live markets:', Array.from(baseAssets));
      
      // Convert to asset objects with display names, excluding unwanted assets
      const excludedAssets = ['OM', 'SOL', 'SUL']; // Assets to exclude from display
      const assetList = Array.from(baseAssets)
        .filter(asset => !excludedAssets.includes(asset)) // Filter out unwanted assets
        .map(asset => ({
          asset: asset,
          name: getAssetDisplayName(asset)
        }));
      
      console.log('✅ Generated asset list from live market data (after filtering):', assetList);
      console.log('🚫 Excluded assets:', excludedAssets);
      return assetList;
      
    } catch (error) {
      console.log('❌ Error getting assets from live markets:', error);
      return getFallbackAssetList();
    }
  };
  
  // Fallback asset list when market data is not available
  const getFallbackAssetList = () => {
    console.log('🔄 Using fallback asset list');
    const allAssets = [
      { asset: 'BTC', name: 'Bitcoin' },
      { asset: 'ETH', name: 'Ethereum' },
      { asset: 'LTC', name: 'Litecoin' },
      { asset: 'XRP', name: 'Ripple' },
      { asset: 'BCH', name: 'Bitcoin Cash' }
    ];
    
    // Filter out excluded assets
    const excludedAssets = ['OM', 'SOL', 'SUL'];
    const filteredAssets = allAssets.filter(asset => !excludedAssets.includes(asset.asset));
    
    console.log('🚫 Excluded assets from fallback list:', excludedAssets);
    return filteredAssets;
  };
  
  // Get display name for asset
  const getAssetDisplayName = (asset) => {
    const names = {
      'BTC': 'Bitcoin',
      'ETH': 'Ethereum',
      'LTC': 'Litecoin',
      'XRP': 'Ripple',
      'BCH': 'Bitcoin Cash',
      'ADA': 'Cardano',
      'DOT': 'Polkadot',
      'LINK': 'Chainlink',
      'UNI': 'Uniswap',
      'DOGE': 'Dogecoin'
    };
    return names[asset] || asset;
  };
  
  // Safety check: Ensure appState is available
  if (!appState) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#666' }}>Loading...</Text>
      </View>
    );
  }

  let [renderCount, triggerRender] = useState(0);
  let stateChangeID = appState.stateChangeID;
  
  // API loading states
  let [isLoadingPrices, setIsLoadingPrices] = useState(false);
  let [isDataReady, setIsDataReady] = useState(false);
  let [refreshing, setRefreshing] = useState(false);
  let [showRiskModal, setShowRiskModal] = useState(false);
  let [lastUpdated, setLastUpdated] = useState(null);

  // Crypto modal state
  const [showCryptoModal, setShowCryptoModal] = useState(false);
  const [selectedCryptoAsset, setSelectedCryptoAsset] = useState(null);
  
  // Initialize with fallback asset list, will be updated after markets load
  const [assetData, setAssetData] = useState(() => getFallbackAssetList());
  
  // Define prices state that's used in getAssetPrice
  const [prices, setPrices] = useState({});

  // Refresh function for manual data reload with comprehensive error handling
  let refreshData = async () => {
    try {
      console.log('🔄 Assets: Starting manual refresh...');
      setRefreshing(true);
      
      // Reload live markets first
      console.log('🏪 Refreshing live markets...');
      await appState.loadMarkets();
      
      // Update asset list based on refreshed live market data
      const refreshedAssets = getAssetListFromMarkets();
      setAssetData(refreshedAssets);
      console.log('📊 Asset list refreshed from live market data');
      
      // Then reload prices using public API
      await loadPricesFromBestVolumePrice();
      console.log('✅ Assets: Manual refresh completed');
    } catch (error) {
      console.log('❌ Assets: Manual refresh failed:', error);
      // Even if refresh fails, ensure we have fallback asset data displayed
      setAssetData(getFallbackAssetList());
      triggerRender(renderCount + 1);
    } finally {
      setRefreshing(false);
    }
  };

  // Initial setup.
  useEffect(() => {
    setup();
  }, []); // Pass empty array so that this only runs once on mount.

  // Safety useEffect to ensure assetData is never empty
  useEffect(() => {
    if (!Array.isArray(assetData) || assetData.length === 0) {
      console.log('🔄 Assets: assetData is empty, initializing with fallback assets');
      setAssetData(getFallbackAssetList());
    }
  }, [assetData]);

  // Rerun setup when stateChangeID changes.
  useEffect(() => {
    setup();
  }, [stateChangeID]);

  // Auto-refresh prices every 30 seconds
  useEffect(() => {
    console.log('⏰ Assets: Setting up automatic price refresh every 30 seconds...');
    
    const priceUpdateInterval = setInterval(() => {
      console.log('🔄 Assets: Auto-refreshing prices (30s timer)...');
      loadPricesFromBestVolumePrice();
    }, 30000); // 30 seconds
    
    // Cleanup interval on component unmount
    return () => {
      console.log('🛑 Assets: Clearing price update interval');
      clearInterval(priceUpdateInterval);
    };
  }, [assetData]); // Re-setup when assetData changes

  async function setup() {
    let fn = 'setup';
    try {
      console.log('🚀 Assets: Starting live data setup...');
      console.log('🔐 Authentication status:', appState.user?.isAuthenticated);
      console.log('🔓 Bypass authentication:', appState.bypassAuthentication);
      
      setIsDataReady(false);
      
      // Step 1: Load live markets to understand what trading pairs are available
      console.log('🏪 Loading live markets from /market API...');
      try {
        await appState.loadMarkets();
        console.log('✅ Live markets loaded successfully');
      } catch (error) {
        console.log('❌ Failed to load live markets:', error);
        console.log('🔄 Continuing with fallback asset list');
      }
      
      // Step 2: Generate asset list based on live market data
      const dynamicAssets = getAssetListFromMarkets();
      setAssetData(dynamicAssets);
      console.log('📊 Asset list updated based on live market data');
      
      // Step 3: Load live price data using public /best_volume_price API
      console.log('📈 Loading live prices using public API...');
      await loadPricesFromBestVolumePrice();
      
      setIsDataReady(true);
      console.log('✅ Assets: Live data setup completed successfully');
    } catch (error) {
      console.log('❌ Assets: Live data setup failed:', error);
      // Ensure we always have fallback asset data even if setup fails
      setAssetData(getFallbackAssetList());
      setIsDataReady(true);
    }
  }

  // Load live prices using public /best_volume_price API (no authentication required)
  // Using BUY side as buyer - we want to buy crypto with GBP
  async function loadPricesFromBestVolumePrice() {
    try {
      console.log('📈 Assets: Loading prices using public /best_volume_price API (BUY side)...');
      setIsLoadingPrices(true);
      
      const newPrices = {};
      const volume = 100; // Use £100 GBP volume for better price discovery
      
      // Get price for each asset paired with GBP
      for (const assetItem of assetData) {
        const asset = assetItem.asset;
        const market = `${asset}/GBP`;
        
        try {
          console.log(`💰 Fetching BUY price for ${market} with £${volume} volume...`);
          
          // Call public best_volume_price API - BUY side means we're buying crypto with GBP
          const response = await appState.publicMethod({
            httpMethod: 'GET',
            apiRoute: `best_volume_price/${asset}/GBP/BUY/quote/${volume}`,
          });
          
          console.log(`🔍 API Response for ${market}:`, response);
          
          if (response && response.price) {
            // IMPORTANT: For BUY/quote, response.price is the amount of crypto we get for our GBP volume
            // To get price per unit: price_per_unit = volume_spent / crypto_amount_received
            const cryptoAmountReceived = parseFloat(response.price);
            
            if (cryptoAmountReceived > 0) {
              const pricePerUnit = volume / cryptoAmountReceived;
              newPrices[market] = {
                price: pricePerUnit.toString(),
                currency: 'GBP',
                volume: volume,
                side: 'BUY',
                cryptoReceived: cryptoAmountReceived
              };
              console.log(`✅ ${market}: £${pricePerUnit.toFixed(2)} per ${asset}`);
              console.log(`   📊 Details: £${volume} → ${cryptoAmountReceived} ${asset} = £${pricePerUnit.toFixed(2)}/${asset}`);
            } else {
              console.log(`❌ ${market}: Invalid crypto amount received: ${cryptoAmountReceived}`);
              newPrices[market] = {
                error: 'Invalid crypto amount received',
                price: null,
                rawResponse: response
              };
            }
          } else {
            console.log(`❌ ${market}: No price data returned - Response:`, response);
            newPrices[market] = {
              error: response?.error || 'No price data available',
              price: null,
              rawResponse: response
            };
          }
          
        } catch (error) {
          console.log(`❌ ${market}: Error fetching price:`, error);
          newPrices[market] = {
            error: error.message || 'Price fetch failed',
            price: null
          };
        }
      }
      
      console.log('📊 All prices from /best_volume_price:', newPrices);
      setPrices(newPrices);
      setLastUpdated(new Date());
      
    } catch (error) {
      console.log('❌ Assets: Failed to load prices from best_volume_price API:', error);
    } finally {
      setIsLoadingPrices(false);
    }
  }

  // Get live price from /best_volume_price API only
  function getAssetPrice(asset) {
    try {
      console.log(`💰 Getting live price for ${asset} from /best_volume_price API...`);
      
      const marketKey = `${asset}/GBP`;
      console.log(`🔍 Looking for market: ${marketKey}`);
      console.log(`📊 Available price markets:`, Object.keys(prices));
      
      // Log all available price data for debugging
      if (Object.keys(prices).length > 0) {
        console.log(`📈 All price data:`, prices);
      } else {
        console.log(`⚠️ No price data available at all`);
      }
      
      if (prices[marketKey]) {
        const priceData = prices[marketKey];
        console.log(`📊 Price data for ${marketKey}:`, priceData);
        
        // Check if we have a live price from the API
        if (priceData.price && priceData.price !== null) {
          const livePrice = parseFloat(priceData.price);
          console.log(`✅ Using LIVE /best_volume_price API price for ${asset}: £${livePrice}`);
          return livePrice;
        }
        
        // Check for errors
        if (priceData.error) {
          console.log(`❌ Price error for ${asset}: ${priceData.error}`);
          return null;
        }
      } else {
        console.log(`❌ No price data found for ${marketKey}`);
      }
      
      console.log(`⚠️ Using null price for ${asset} (no live data available)`);
      return null;
      
    } catch (error) {
      console.log(`❌ Error getting price for ${asset}:`, error);
      return null;
    }
  }

  // Get crypto icon (using same mapping as Wallet page)
  const getCryptoIcon = (currency) => {
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

  // Get asset color for consistent theming
  const getAssetColor = (assetType) => {
    const colorMap = {
      'BTC': '#F7931A',
      'ETH': '#627EEA',
      'GBP': '#6B46C1',
      'USD': '#10B981',
      'EUR': '#3B82F6',
      'LTC': '#BFBBBB',
      'BCH': '#8DC351',
      'XRP': '#23292F'
    };
    return colorMap[assetType] || colors.primary;
  };

  // Navigation function to crypto content page - now shows modal instead
  const navigateToCryptoContent = (asset) => {
    console.log(`🔗 Opening crypto content modal for ${asset}`);
    try {
      // Set the selected crypto asset in appState for the CryptoContent page to use
      appState.selectedCrypto = { asset: asset };
      console.log(`📱 Set selectedCrypto to:`, appState.selectedCrypto);
      
      // Show modal instead of navigating
      setSelectedCryptoAsset(asset);
      setShowCryptoModal(true);
      console.log(`✅ Successfully opened CryptoContent modal for ${asset}`);
    } catch (error) {
      console.log(`❌ Error opening CryptoContent modal for ${asset}:`, error);
    }
  };

  const renderAssetItem = (asset, index) => {
    try {
      console.log(`🎨 Rendering asset ${index}:`, asset);
      
      // Validate asset object
      if (!asset || typeof asset !== 'object') {
        console.log(`❌ Invalid asset object at index ${index}:`, asset);
        return (
          <View key={`invalid-${index}`} style={styles.assetItemContainer}>
            <Text style={styles.errorText}>Invalid asset data</Text>
          </View>
        );
      }

      // Validate asset symbol
      if (!asset.asset || typeof asset.asset !== 'string') {
        console.log(`❌ Invalid asset symbol at index ${index}:`, asset);
        return (
          <View key={`no-symbol-${index}`} style={styles.assetItemContainer}>
            <Text style={styles.errorText}>Missing asset symbol</Text>
          </View>
        );
      }

      // Get asset info with fallback
      let assetInfo;
      try {
        assetInfo = getAssetInfo(asset.asset);
      } catch (error) {
        console.log(`❌ Error getting asset info for ${asset.asset}:`, error);
        assetInfo = { name: asset.asset, symbol: asset.asset }; // Fallback
      }

      // Get price with proper null handling
      let price;
      let priceDisplay;
      try {
        price = getAssetPrice(asset.asset);
        if (price !== null && !isNaN(price)) {
          priceDisplay = `£${formatTo9Digits(price)}`;
        } else {
          priceDisplay = 'Price unavailable';
        }
      } catch (error) {
        console.log(`❌ Error getting price for ${asset.asset}:`, error);
        priceDisplay = 'Error loading price';
      }
      
      console.log(`✅ Successfully processed ${asset.asset}: price=${price}, display="${priceDisplay}"`);

      return (
        <TouchableOpacity 
          key={`${asset.asset}-${index}`} 
          style={styles.assetItemContainer}
          onPress={() => navigateToCryptoContent(asset.asset)}
          activeOpacity={0.7}
        >
          <View style={styles.assetIconSection}>
            <Icon 
              name={getCryptoIcon(asset.asset)} 
              size={32} 
              color={getAssetColor(asset.asset)} 
            />
          </View>
          
          <View style={styles.assetMainContent}>
            <Text style={styles.assetName}>{assetInfo.name}</Text>
            <Text style={styles.assetSymbol}>{asset.asset}</Text>
          </View>
          
          <View style={styles.assetPriceSection}>
            <Text style={[
              styles.assetLivePrice,
              price === null && styles.assetPriceUnavailable
            ]}>
              {priceDisplay}
            </Text>
          </View>
        </TouchableOpacity>
      );
    } catch (renderError) {
      console.log(`❌ Error rendering asset ${index}:`, renderError);
      return (
        <View key={`error-${index}`} style={styles.assetItemContainer}>
          <Text style={styles.errorText}>Error displaying asset</Text>
        </View>
      );
    }
  };

  return (
    <View style={[layout.flex1, { backgroundColor: colors.mainPanelBackground }]}>
      <ScrollView 
        style={layout.flex1}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshData}
            tintColor={colors.primary}
          />
        }
      >
        {/* Assets List */}
        <View style={styles.assetsList}>
          {console.log('🎨 Rendering assets, total count:', assetData.length)}
          {console.log('🎨 Asset data for rendering:', assetData)}
          {assetData.map((asset, index) => {
            console.log(`🎨 Rendering asset ${index}:`, asset);
            return renderAssetItem(asset, index);
          })}
        </View>

        {/* Loading Indicators */}
        {isLoadingPrices && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading prices...</Text>
          </View>
        )}

        {/* Data Status */}
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            Data Ready: {isDataReady ? '✅' : '⏳'} | 
            Prices: {isLoadingPrices ? '⏳' : '✅'}
          </Text>
          <Text style={styles.statusSubtext}>
            Live prices from /best_volume_price API • Markets from /market API
            {lastUpdated && ` • Updated: ${lastUpdated.toLocaleTimeString()}`}
          </Text>
          <Text style={styles.statusSubtext}>
            🔄 Auto-refresh every 30s • Pull to refresh manually
          </Text>
        </View>
      </ScrollView>

      {/* Risk Summary Modal */}
      <RiskSummaryModal 
        visible={showRiskModal} 
        onClose={() => setShowRiskModal(false)} 
      />

      {/* Crypto Content Modal */}
      <Modal
        visible={showCryptoModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCryptoModal(false)}
      >
        <CryptoContent onClose={() => setShowCryptoModal(false)} />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  riskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    backgroundColor: '#fff5f0',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  riskButtonText: {
    fontSize: 12,
    color: colors.warning,
    marginLeft: 4,
    fontWeight: '500',
  },
  refreshButton: {
    padding: 8,
  },
  portfolioSummary: {
    backgroundColor: colors.primary,
    margin: 20,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  portfolioLabel: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 8,
  },
  portfolioValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  portfolioSubtext: {
    fontSize: 14,
    color: '#ffffff',
  },
  debugText: {
    fontSize: 10,
    color: '#ffffff80',
    marginTop: 2,
  },
  assetsList: {
    paddingBottom: scaledHeight(20),
  },
  // Asset item styles (address book inspired layout)
  assetItemContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    alignItems: 'center',
    paddingVertical: scaledHeight(8),
    paddingHorizontal: scaledWidth(16),
    borderBottomWidth: 1.5,
    borderBottomColor: colors.lightGray,
  },
  assetIconSection: {
    marginRight: scaledWidth(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  assetMainContent: {
    flex: 1,
    marginRight: scaledWidth(12),
  },
  assetName: {
    fontSize: normaliseFont(14),
    fontWeight: 'bold',
    color: colors.darkGray,
    marginBottom: scaledHeight(2),
  },
  assetSymbol: {
    fontSize: normaliseFont(12),
    color: colors.mediumGray,
  },
  assetPriceSection: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  assetLivePrice: {
    fontSize: normaliseFont(16),
    fontWeight: '500',
    color: colors.darkGray,
  },
  assetPriceUnavailable: {
    color: colors.mediumGray,
    fontStyle: 'italic',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  statusContainer: {
    padding: 20,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    color: '#999',
  },
  statusSubtext: {
    fontSize: 10,
    color: '#bbb',
    marginTop: 4,
  },
  debugContainer: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    margin: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  debugButton: {
    backgroundColor: '#007bff',
    padding: 10,
    borderRadius: 6,
    marginVertical: 5,
    alignItems: 'center',
  },
  debugButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  debugText: {
    fontSize: 10,
    color: '#6c757d',
    marginVertical: 2,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default Assets;
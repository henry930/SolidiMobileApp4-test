// React imports
import React, { useContext, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View, TouchableOpacity, RefreshControl } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Material Design imports
import {
  Text,
  useTheme,
} from 'react-native-paper';

// Other imports
import _ from 'lodash';
import Big from 'big.js';

// Internal imports
import AppStateContext from 'src/application/data';
import { colors, sharedStyles, layoutStyles, cardStyles } from 'src/constants';
import { colors as sharedColors } from 'src/styles/shared';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import { Title } from 'src/components/shared';
import misc from 'src/util/misc';
import { refreshLiveRates, getAssetPriceWithSource } from 'src/util/liveRates';

// Asset Data Model imports
import {
  getAssetInfo,
  generateFallbackAssetData,
  processBalanceData,
  validateAssetDataArray,
  getDemoPrice,
  createAssetItem
} from './AssetDataModel';

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
  
  // Safety check: Ensure appState is available
  if (!appState) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#666' }}>Loading...</Text>
      </View>
    );
  }

  // Check authentication first - fixed path
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
        <View style={{
          backgroundColor: '#FF6B6B',
          paddingVertical: 20,
          paddingHorizontal: 30,
          borderRadius: 12,
          marginBottom: 30,
        }}>
          <Text style={{ 
            fontSize: 20, 
            fontWeight: 'bold', 
            color: 'white',
            textAlign: 'center',
            marginBottom: 10
          }}>
            🔒 Please Login First
          </Text>
          <Text style={{ 
            fontSize: 16, 
            color: 'white',
            textAlign: 'center'
          }}>
            Authentication required to view assets
          </Text>
        </View>
        
        <TouchableOpacity 
          style={{
            backgroundColor: '#007AFF',
            paddingHorizontal: 30,
            paddingVertical: 15,
            borderRadius: 8,
          }}
          onPress={() => {
            try {
              console.log('🔐 Attempting to redirect to login...');
              appState.setMainPanelState('Login');
            } catch (error) {
              console.log('❌ Error redirecting to login:', error);
              alert('Please navigate to login manually');
            }
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
      </View>
    );
  }

  let [renderCount, triggerRender] = useState(0);
  let stateChangeID = appState.stateChangeID;
  
  // API loading states
  let [isLoadingBalances, setIsLoadingBalances] = useState(false);
  let [isLoadingTicker, setIsLoadingTicker] = useState(false);
  let [isDataReady, setIsDataReady] = useState(false);
  let [refreshing, setRefreshing] = useState(false);
  
  // Initialize with safe data immediately to prevent any undefined issues
  const [assetData, setAssetData] = useState(() => generateFallbackAssetData());

  // Use AssetDataModel for consistent fallback data
  const defaultAssetData = generateFallbackAssetData();

  // Refresh function for manual data reload with comprehensive error handling
  let refreshData = async () => {
    try {
      console.log('🔄 Assets: Starting manual refresh...');
      setRefreshing(true);
      await setup();
      console.log('✅ Assets: Manual refresh completed');
    } catch (error) {
      console.log('❌ Assets: Manual refresh failed:', error);
      // Even if refresh fails, ensure we have fallback data displayed
      setAssetData(generateFallbackAssetData());
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
      console.log('🔄 Assets: assetData is empty, initializing with fallback');
      setAssetData(generateFallbackAssetData());
    }
  }, [assetData]);

  // Rerun setup when stateChangeID changes.
  useEffect(() => {
    setup();
  }, [stateChangeID]);

  async function setup() {
    let fn = 'setup';
    try {
      console.log('🚀 Assets: Starting setup...');
      setIsDataReady(false);
      
      // Check authentication first
      if (!appState.user?.isAuthenticated) {
        console.log('❌ User not authenticated, redirecting to login');
        setMainPanelState(appState.constants.mainPanelStates.LOGIN);
        return;
      }
      
      console.log('✅ User authenticated, proceeding with data loading');
      
      // Always start with fallback data to ensure UI renders
      setAssetData(generateFallbackAssetData());
      
      // Log current ticker data before loading
      console.log('📊 Pre-load ticker data:', appState.apiData?.ticker);
      
      await loadBalance();
      await loadTicker();
      
      // Log ticker data after loading
      console.log('📊 Post-load ticker data:', appState.apiData?.ticker);
      
      setIsDataReady(true);
      console.log('✅ Assets: Setup completed successfully');
    } catch (error) {
      console.log('❌ Assets: Setup failed:', error);
      // Ensure we always have fallback data even if setup fails
      setAssetData(generateFallbackAssetData());
      setIsDataReady(true);
    }
  }

  async function loadBalance() {
    try {
      console.log('💰 Assets: Loading balance data...');
      setIsLoadingBalances(true);
      
      // Call the correct balance loading method
      await appState.loadBalances();
      
      // Access balance data from the correct location in appState
      let rawBalanceData = appState.apiData?.balance || {};
      console.log('💰 Assets: Raw balance data:', rawBalanceData);
      console.log('💰 Assets: Raw balance keys:', Object.keys(rawBalanceData));
      console.log('💰 Assets: Raw balance values:', Object.values(rawBalanceData));
      
      // Let's also try creating a simple array directly from the raw data
      const directAssetArray = Object.keys(rawBalanceData).map(asset => ({
        asset: asset,
        balance: String(rawBalanceData[asset] || '0'),
        id: `direct-${asset.toLowerCase()}-${Date.now()}`
      }));
      console.log('💰 Assets: Direct asset array:', directAssetArray);
      
      let processedData = processBalanceData(rawBalanceData);
      console.log('💰 Assets: Processed balance data:', processedData);
      console.log('💰 Assets: Processed data length:', processedData.length);
      
      // Validate processed data
      let validatedData = validateAssetDataArray(processedData);
      console.log('💰 Assets: Validated asset data:', validatedData);
      console.log('💰 Assets: Final data length:', validatedData.length);
      
      // Temporary fix: If we have more raw assets than processed ones, use direct array
      if (Object.keys(rawBalanceData).length > validatedData.length && directAssetArray.length > validatedData.length) {
        console.log('🔧 Assets: Using direct asset array due to processing loss');
        setAssetData(directAssetArray);
      } else {
        setAssetData(validatedData);
      }
      console.log('✅ Assets: Balance data loaded successfully');
      
    } catch (error) {
      console.log('❌ Assets: Balance loading failed:', error);
      // Fallback to demo data
      setAssetData(generateFallbackAssetData());
    } finally {
      setIsLoadingBalances(false);
    }
  }

  async function loadTicker() {
    try {
      console.log('📈 Assets: Loading ticker data...');
      setIsLoadingTicker(true);
      
      // First, let's see what we currently have
      console.log('📊 Current ticker data before refresh:', appState.apiData?.ticker);
      
      // Use shared utility to refresh live rates
      console.log('🔄 Calling refreshLiveRates...');
      const liveRatesSuccess = await refreshLiveRates(appState, ['BTC', 'ETH', 'LTC', 'XRP']);
      console.log('📈 refreshLiveRates result:', liveRatesSuccess);
      
      // Also load internal ticker data as fallback
      console.log('🔄 Loading internal ticker...');
      await appState.loadTicker();
      
      // Force refresh CoinGecko data directly
      console.log('🔄 Force refreshing CoinGecko...');
      await appState.loadCoinGeckoPrices();
      
      // Access ticker data from the correct location
      let tickerData = appState.apiData?.ticker || {};
      console.log('📈 Assets: Final ticker data loaded:', tickerData);
      console.log('📈 Assets: Available markets:', Object.keys(tickerData));
      console.log('📈 Assets: Live rates success:', liveRatesSuccess);
      
      // Count different sources
      const coinGeckoMarkets = Object.keys(tickerData).filter(k => tickerData[k]?.source === 'coingecko');
      const apiMarkets = Object.keys(tickerData).filter(k => tickerData[k]?.source !== 'coingecko' && tickerData[k]?.price);
      
      console.log('🟢 CoinGecko markets:', coinGeckoMarkets);
      console.log('🟡 API markets:', apiMarkets);
      
      // Log individual market prices with source indication
      Object.keys(tickerData).forEach(market => {
        const data = tickerData[market];
        const source = data.source === 'coingecko' ? '🟢 CoinGecko' : '🟡 Internal';
        console.log(`📈 Market ${market} (${source}):`, data);
        if (data.price) {
          console.log(`💰 Price for ${market}: £${data.price} (${source})`);
        } else if (data.error) {
          console.log(`❌ Error for ${market}: ${data.error}`);
        }
      });
      
    } catch (error) {
      console.log('❌ Assets: Ticker loading failed:', error);
    } finally {
      setIsLoadingTicker(false);
    }
  }

  // Get real price from ticker data or fallback to demo price
  function getAssetPrice(asset) {
    try {
      console.log(`� Getting price for ${asset}...`);
      
      const tickerData = appState.apiData?.ticker || {};
      const marketKey = `${asset}/GBP`;
      console.log(`� Looking for market: ${marketKey}`);
      console.log(`📊 Available ticker data:`, Object.keys(tickerData));
      
      if (tickerData[marketKey]) {
        const marketData = tickerData[marketKey];
        console.log(`📊 Market data for ${marketKey}:`, marketData);
        
        // Prioritize CoinGecko live rates
        if (marketData.source === 'coingecko' && marketData.price && marketData.price !== "DOWN") {
          const livePrice = parseFloat(marketData.price);
          console.log(`🟢 Using LIVE CoinGecko price for ${asset}: £${livePrice}`);
          return livePrice;
        }
        
        // Check if we have a direct price field (non-CoinGecko)
        if (marketData.price && marketData.price !== "DOWN") {
          const livePrice = parseFloat(marketData.price);
          console.log(`� Using API price for ${asset}: £${livePrice}`);
          return livePrice;
        }
        
        // Check if we can use bid/ask prices
        if (marketData.bid && marketData.bid !== "DOWN" && marketData.ask && marketData.ask !== "DOWN") {
          const bidPrice = parseFloat(marketData.bid);
          const askPrice = parseFloat(marketData.ask);
          const midPrice = (bidPrice + askPrice) / 2;
          console.log(`🟢 Using LIVE mid-price for ${asset}: £${midPrice} (bid: £${bidPrice}, ask: £${askPrice})`);
          return midPrice;
        }
        
        // Market is down
        if (marketData.bid === "DOWN" || marketData.ask === "DOWN") {
          console.log(`📉 Market ${marketKey} is DOWN - exchange unavailable`);
        }
      } else {
        console.log(`⚠️ No market data available for ${marketKey}`);
      }
      
      const demoData = getDemoPrice(asset);
      console.log(`🔴 Using DEMO price for ${asset}: £${demoData.price} (live market unavailable)`);
      return demoData.price;
    } catch (error) {
      console.log(`❌ Error getting price for ${asset}:`, error);
      const demoData = getDemoPrice(asset);
      console.log(`🔴 Using DEMO price due to error for ${asset}: £${demoData.price}`);
      return demoData.price;
    }
  }

  // Calculate total portfolio value using real ticker data
  const calculatePortfolioValue = () => {
    try {
      const bigTotalValue = assets.reduce((total, asset) => {
        if (!isNaN(asset.balance) && !isNaN(asset.ticker)) {
          const assetValue = new Big(asset.balance).times(asset.ticker);
          return total.plus(assetValue);
        } else {
          logger.debug('Invalid number in asset calculation:', asset);
          return total;
        }
      }, new Big(0));

      const totalValue = bigTotalValue.toNumber();
      return isFinite(totalValue) ? formatTo9Digits(totalValue) : '0';
    } catch (error) {
      logger.error('Error calculating portfolio value:', error);
      return '0';
    }
  };  const renderAssetItem = (asset, index) => {
    try {
      console.log(`🎨 Rendering asset ${index}:`, asset);
      
      // Validate asset object
      if (!asset || typeof asset !== 'object') {
        console.log(`❌ Invalid asset object at index ${index}:`, asset);
        return (
          <View key={`invalid-${index}`} style={styles.assetItem}>
            <Text style={styles.errorText}>Invalid asset data</Text>
          </View>
        );
      }

      // Validate asset symbol
      if (!asset.asset || typeof asset.asset !== 'string') {
        console.log(`❌ Invalid asset symbol at index ${index}:`, asset);
        return (
          <View key={`no-symbol-${index}`} style={styles.assetItem}>
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

      // Get price with fallback
      let price;
      try {
        price = getAssetPrice(asset.asset);
      } catch (error) {
        console.log(`❌ Error getting price for ${asset.asset}:`, error);
        price = new Big(1); // Fallback price
      }

      // Process balance with fallback
      let balance;
      try {
        balance = new Big(asset.balance || 0);
      } catch (error) {
        console.log(`❌ Error processing balance for ${asset.asset}:`, error);
        balance = new Big(0); // Fallback balance
      }

      // Calculate value with fallback
      let value;
      try {
        value = balance.times(price);
      } catch (error) {
        console.log(`❌ Error calculating value for ${asset.asset}:`, error);
        value = new Big(0); // Fallback value
      }
      
      // Get real market data for display
      const tickerData = appState.apiData?.ticker || {};
      const market = `${asset.asset}/GBP`;
      const marketData = tickerData[market];
      
      // Check if we have live pricing (not DOWN and not using demo data)
      const hasLivePrice = marketData && (
        (marketData.price && marketData.price !== "DOWN") ||
        (marketData.bid && marketData.bid !== "DOWN" && marketData.ask && marketData.ask !== "DOWN")
      );
      
      // Determine status icon and text based on source
      let statusIcon = '🔴';  // Default: demo data
      let statusText = 'DEMO';
      
      if (hasLivePrice) {
        if (marketData.source === 'coingecko') {
          statusIcon = '🟢';
          statusText = 'LIVE';
        } else {
          statusIcon = '🟡';
          statusText = 'API';
        }
      } else if (marketData && (marketData.bid === "DOWN" || marketData.ask === "DOWN")) {
        statusIcon = '📉';
        statusText = 'DOWN';
      }
      
      console.log(`✅ Successfully processed ${asset.asset}: balance=${balance.toString()}, price=${price.toString()}, value=${value.toString()}, status=${statusText}`);

      return (
        <View key={`${asset.asset}-${index}`} style={styles.assetItem}>
          <View style={styles.assetHeader}>
            <View style={styles.assetIcon}>
              <Text style={styles.assetSymbol}>{asset.asset}</Text>
            </View>
            <View style={styles.assetInfo}>
              <Text style={styles.assetName}>{assetInfo.name}</Text>
              <Text style={styles.assetSymbolText}>
                {asset.asset} {statusIcon}
              </Text>
            </View>
            <View style={styles.assetValues}>
              <Text style={styles.assetBalance}>
                {formatTo9Digits(balance)}
              </Text>
              <Text style={styles.assetValue}>£{formatTo9Digits(value)}</Text>
              <Text style={styles.assetPrice}>
                @ £{formatTo9Digits(price)} ({statusText})
              </Text>
            </View>
          </View>
        </View>
      );
    } catch (error) {
      console.log(`❌ Assets: Error rendering asset item at index ${index}:`, error);
      console.log(`❌ Asset data that caused error:`, asset);
      return (
        <View key={`error-${index}`} style={styles.assetItem}>
          <Text style={styles.errorText}>Error: {asset?.asset || 'Unknown'}</Text>
          <Text style={styles.errorText}>Details: {error.message}</Text>
        </View>
      );
    }
  };

  const portfolioValue = calculatePortfolioValue();

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
        {/* Header */}
        <View style={styles.header}>
          <Title title="Assets" />
          <TouchableOpacity onPress={refreshData} style={styles.refreshButton}>
            <Icon name="refresh" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Portfolio Summary */}
        <View style={styles.portfolioSummary}>
          <Text style={styles.portfolioLabel}>Total Portfolio Value</Text>
          <Text style={styles.portfolioValue}>£{portfolioValue}</Text>
          <Text style={styles.portfolioSubtext}>
            {isLoadingBalances || isLoadingTicker ? 'Updating...' : `${assetData.length} assets`}
          </Text>
          {/* Debug info */}
          <Text style={styles.debugText}>
            Balance API: {appState.apiData?.balance ? '✅ Connected' : '❌ No Data'}
          </Text>
          <Text style={styles.debugText}>
            Ticker API: {appState.apiData?.ticker ? '✅ Connected' : '❌ No Data'}
          </Text>
        </View>

        {/* Assets List */}
        <View style={styles.assetsList}>
          <Text style={styles.assetsHeader}>Your Assets ({assetData.length})</Text>
          {console.log('🎨 Rendering assets, total count:', assetData.length)}
          {console.log('🎨 Asset data for rendering:', assetData)}
          {assetData.map((asset, index) => {
            console.log(`🎨 Rendering asset ${index}:`, asset);
            return renderAssetItem(asset, index);
          })}
        </View>

        {/* Loading Indicators */}
        {(isLoadingBalances || isLoadingTicker) && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>
              {isLoadingBalances ? 'Loading balances...' : 'Loading prices...'}
            </Text>
          </View>
        )}

        {/* Data Status */}
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            Data Ready: {isDataReady ? '✅' : '⏳'} | 
            Balances: {isLoadingBalances ? '⏳' : '✅'} | 
            Prices: {isLoadingTicker ? '⏳' : '✅'}
          </Text>
          <Text style={styles.statusSubtext}>
            🟢 = Live CoinGecko | 🟡 = API data | 🔴 = Demo data
          </Text>
        </View>

        {/* Debug Info */}
        <View style={styles.debugContainer}>
          <TouchableOpacity 
            onPress={() => {
              console.log('🔍 Current ticker data:', appState.apiData?.ticker);
              const tickerData = appState.apiData?.ticker || {};
              Object.keys(tickerData).forEach(market => {
                const data = tickerData[market];
                console.log(`${market}:`, data);
              });
            }}
            style={styles.debugButton}
          >
            <Text style={styles.debugButtonText}>� Show Ticker Data in Console</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={async () => {
              console.log('🔄 Manually refreshing CoinGecko data...');
              try {
                await appState.loadCoinGeckoPrices();
                console.log('✅ CoinGecko refresh completed');
                console.log('📊 Updated ticker data:', appState.apiData?.ticker);
              } catch (error) {
                console.log('❌ CoinGecko refresh failed:', error);
              }
            }}
            style={styles.debugButton}
          >
            <Text style={styles.debugButtonText}>🟢 Refresh CoinGecko Data</Text>
          </TouchableOpacity>

          <Text style={styles.debugText}>
            Available Markets: {Object.keys(appState.apiData?.ticker || {}).join(', ')}
          </Text>
          
          <Text style={styles.debugText}>
            CoinGecko Markets: {Object.keys(appState.apiData?.ticker || {}).filter(k => 
              appState.apiData?.ticker?.[k]?.source === 'coingecko'
            ).join(', ')}
          </Text>
        </View>
      </ScrollView>
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
    marginHorizontal: 20,
  },
  assetsHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  assetItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  assetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assetIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  assetSymbol: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  assetInfo: {
    flex: 1,
  },
  assetName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  assetSymbolText: {
    fontSize: 14,
    color: '#666',
  },
  assetValues: {
    alignItems: 'flex-end',
  },
  assetBalance: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  assetValue: {
    fontSize: 14,
    color: '#666',
  },
  assetPrice: {
    fontSize: 12,
    color: '#999',
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
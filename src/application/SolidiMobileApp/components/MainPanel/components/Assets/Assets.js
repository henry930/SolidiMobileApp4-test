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
let { deb, dj, log, lj } = logger.getShortcuts(logger2);

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

  // Dynamic asset list based on user's actual balance from /balance API
  const getAssetListFromMarkets = () => {
    try {
      console.log('\n' + '💎'.repeat(60));
      console.log('💎 [ASSETS] Getting asset list from BALANCE API...');
      console.log('💎 [ASSETS] appState exists:', !!appState);
      console.log('💎 [ASSETS] getAvailableAssets function exists:', !!appState?.getAvailableAssets);

      // Check if balance data exists in appState directly
      const balanceData = appState?.state?.apiData?.balance;
      console.log('💎 [ASSETS] Direct balance check - balance exists:', !!balanceData);
      console.log('💎 [ASSETS] Direct balance data:', JSON.stringify(balanceData));
      console.log('💎 [ASSETS] Balance data type:', typeof balanceData);
      console.log('💎 [ASSETS] Is balance an object?:', balanceData && typeof balanceData === 'object');

      // Get available assets from balance API (cached during authentication)
      const availableAssets = appState.getAvailableAssets ? appState.getAvailableAssets() : [];
      console.log('💎 [ASSETS] Available assets from getAvailableAssets():', availableAssets);
      console.log('💎 [ASSETS] Number of assets:', availableAssets.length);

      // Also try direct balance keys as backup
      const directAssets = balanceData ? Object.keys(balanceData) : [];
      console.log('💎 [ASSETS] Direct balance keys:', directAssets);
      console.log('💎 [ASSETS] Direct balance keys length:', directAssets.length);

      // Use whichever has data - prefer getAvailableAssets
      const assetsToUse = availableAssets.length > 0 ? availableAssets : directAssets;
      console.log('💎 [ASSETS] Assets to use:', assetsToUse);
      console.log('💎 [ASSETS] Source:', availableAssets.length > 0 ? 'getAvailableAssets()' : 'direct balance keys');

      if (!assetsToUse || assetsToUse.length === 0) {
        console.log('❌❌❌ [ASSETS] NO ASSETS IN BALANCE DATA!');
        console.log('❌ [ASSETS] balanceData is:', balanceData);
        console.log('❌ [ASSETS] This means balance API returned empty object');
        console.log('💎 [ASSETS] ⚠️ USING: ❌ HARDCODED LIST (empty balance)');
        console.log('💎'.repeat(60) + '\n');
        return getFallbackAssetList();
      }

      // Filter to crypto assets only (exclude fiat currencies)
      const excludedAssets = ['GBP', 'USD', 'EUR', 'OM', 'SOL', 'SUL'];
      const cryptoAssets = assetsToUse.filter(asset => !excludedAssets.includes(asset));

      console.log('💎 [ASSETS] All assets before filtering:', assetsToUse);
      console.log('💎 [ASSETS] Crypto assets (after excluding fiat):', cryptoAssets);
      console.log('💎 [ASSETS] 🚫 Excluded assets:', excludedAssets);
      console.log('💎 [ASSETS] Number of crypto assets:', cryptoAssets.length);

      // NEW FILTERING: Filter by price availability and currency list
      console.log('💎 [ASSETS] 🔍 Applying new filters: price availability + currency list...');
      
      // Get ticker data for price checking
      const ticker = appState.getTicker ? appState.getTicker() : {};
      console.log('💎 [ASSETS] 📊 FULL TICKER DATA:', JSON.stringify(ticker, null, 2));
      console.log('💎 [ASSETS] Ticker markets available:', Object.keys(ticker || {}));
      
      // Get currency list (tradeable/transferrable assets)
      const currencyList = appState.getCurrency ? appState.getCurrency() : [];
      console.log('💎 [ASSETS] 💱 FULL CURRENCY LIST:', JSON.stringify(currencyList, null, 2));
      console.log('💎 [ASSETS] Currency list from /currency API:', currencyList);
      console.log('💎 [ASSETS] Currency list type:', Array.isArray(currencyList) ? 'Array' : typeof currencyList);
      console.log('💎 [ASSETS] Currency list length:', currencyList.length);
      
      // Filter assets based on:
      // 1. Has price in ticker (market exists)
      // 2. Is in currency list (user can trade/transfer)
      const filteredAssets = cryptoAssets.filter(asset => {
        // Check 1: Is in currency list?
        // NOTE: currencyList contains market pairs like "BTC/GBP", not just "BTC"
        // NOTE: Ticker API may use GBPX instead of GBP for some markets
        const market = `${asset}/GBP`;
        const marketX = `${asset}/GBPX`; // Alternative market name used by some APIs
        
        // Only apply currency filter if we have API data (array of market pairs)
        // Default list is asset symbols ['BTC', 'ETH'], API returns market pairs ['BTC/GBP', 'ETH/GBP']
        let inCurrencyList = true; // Default: don't filter
        if (currencyList.length > 0 && currencyList[0] && currencyList[0].includes('/')) {
          // API data detected (contains '/' like "BTC/GBP")
          inCurrencyList = currencyList.includes(market) || currencyList.includes(marketX);
          console.log(`💎 [ASSETS] ${asset}: Using API currency filter - market=${market} or ${marketX}, inList=${inCurrencyList}`);
        } else {
          // Default list or no data - don't filter by currency, just by price
          console.log(`💎 [ASSETS] ${asset}: Skipping currency filter (using default list or no data)`);
        }
        
        // Check 2: Has market price?
        // Try both market names (GBP and GBPX)
        const hasPrice = (ticker && ticker[market] && ticker[market].price && !ticker[market].error) ||
                        (ticker && ticker[marketX] && ticker[marketX].price && !ticker[marketX].error);
        
        console.log(`💎 [ASSETS] ${asset}: market=${market}/${marketX}, inCurrencyList=${inCurrencyList}, hasPrice=${hasPrice}, KEEP=${inCurrencyList && hasPrice}`);
        
        // Keep asset only if it passes both checks
        return inCurrencyList && hasPrice;
      });
      
      console.log('💎 [ASSETS] ✅ Assets after filtering by price+currency:', filteredAssets);
      console.log('💎 [ASSETS] 🚫 Filtered out (no price or not in currency list):', 
        cryptoAssets.filter(a => !filteredAssets.includes(a)));

      // Check if filtering removed all assets
      if (filteredAssets.length === 0) {
        console.log('❌❌❌ [ASSETS] ALL ASSETS WERE FILTERED OUT!');
        console.log('❌ [ASSETS] Original crypto assets:', cryptoAssets);
        console.log('❌ [ASSETS] All were excluded (no price or not in currency list)');
        console.log('💎 [ASSETS] ⚠️ USING: ❌ FALLBACK LIST (all filtered)');
        console.log('💎'.repeat(60) + '\n');
        return getFallbackAssetList();
      }

      // Convert to asset objects with display names
      const assetList = filteredAssets.map(asset => ({
        asset: asset,
        name: getAssetDisplayName(asset)
      }));

      console.log('💎 [ASSETS] ✅ USING: ✅ BALANCE API LIST');
      console.log('💎 [ASSETS] Final asset list:', assetList);
      console.log('💎 [ASSETS] Comparison with fallback:', getFallbackAssetList());
      console.log('💎'.repeat(60) + '\n');

      return assetList;

    } catch (error) {
      console.log('❌ [ASSETS] Error getting assets from balance API:', error);
      console.log('💎 [ASSETS] ⚠️ USING: ❌ HARDCODED LIST (error fallback)');
      console.log('💎'.repeat(60) + '\n');
      return getFallbackAssetList();
    }
  };

  // Fallback asset list when market data is not available
  const getFallbackAssetList = () => {
    console.log('🔄 Using fallback asset list');
    console.log('⚠️⚠️⚠️ FALLBACK LIST - NOT FROM BALANCE API ⚠️⚠️⚠️');
    const allAssets = [
      { asset: 'BTC', name: 'Bitcoin (HARDCODED)' },
      { asset: 'ETH', name: 'Ethereum (HARDCODED)' },
      { asset: 'LTC', name: 'Litecoin (HARDCODED)' },
      { asset: 'XRP', name: 'Ripple (HARDCODED)' },
      { asset: 'BCH', name: 'Bitcoin Cash (HARDCODED)' }
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

  // Track if balance is loaded
  const [balanceLoaded, setBalanceLoaded] = useState(false);

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

  // Track if initial setup has run
  const [hasInitialSetup, setHasInitialSetup] = useState(false);
  const [lastStateChangeID, setLastStateChangeID] = useState(stateChangeID);

  // Initial setup - runs once on mount.
  useEffect(() => {
    console.log('🎬 Assets: Running initial setup...');
    setup();
    setHasInitialSetup(true);
  }, []); // Pass empty array so that this only runs once on mount.

  // Safety useEffect to ensure assetData is never empty
  useEffect(() => {
    if (!Array.isArray(assetData) || assetData.length === 0) {
      console.log('🔄 Assets: assetData is empty, initializing with fallback assets');
      setAssetData(getFallbackAssetList());
    }
  }, [assetData]);

  // Rerun setup only when stateChangeID actually changes (not on initial mount)
  useEffect(() => {
    if (hasInitialSetup && stateChangeID !== lastStateChangeID) {
      console.log(`🔄 Assets: stateChangeID changed (${lastStateChangeID} → ${stateChangeID}), refreshing...`);
      setup();
      setLastStateChangeID(stateChangeID);
    }
  }, [stateChangeID, hasInitialSetup]);

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

      // Just read asset list from CACHED balance data (should already be loaded during authentication)
      console.log('📋 Assets: Reading asset list from CACHED balance data...');
      const dynamicAssets = getAssetListFromMarkets();
      console.log('📋 Assets: Got', dynamicAssets.length, 'assets from cache');
      setAssetData(dynamicAssets);
      console.log('📊 Asset list set from CACHED balance data');

      // Start loading prices immediately - don't wait for markets to load
      console.log('📈 Loading live prices using public API...');
      const priceLoadPromise = loadPricesFromBestVolumePrice();

      // Load markets in parallel (optional, for future use)
      const marketLoadPromise = (async () => {
        try {
          console.log('🏪 Loading live markets from /market API (in background)...');
          await appState.loadMarkets();
          console.log('✅ Live markets loaded successfully');
        } catch (error) {
          console.log('❌ Failed to load live markets:', error);
        }
      })();

      // Wait for prices to load (markets loading in background doesn't block)
      await priceLoadPromise;

      setIsDataReady(true);
      console.log('✅ Assets: Live data setup completed successfully');

      // Markets will continue loading in background
    } catch (error) {
      console.log('❌ Assets: Live data setup failed:', error);
      // Ensure we always have fallback asset data even if setup fails
      setAssetData(getFallbackAssetList());
      setIsDataReady(true);
    }
  }

  // Load prices from AppState cache (instant if available, or trigger update if needed)
  async function loadPricesFromBestVolumePrice() {
    try {
      const startTime = Date.now();
      console.log('[CRYPTO-CACHE] 📱 Assets page: Loading prices...');
      setIsLoadingPrices(true);

      // Check if cache has any prices
      console.log('[CRYPTO-CACHE] � Checking cache state...', {
        hasCryptoRates: !!appState.cryptoRates,
        sellPricesKeys: appState.cryptoRates?.sellPrices ? Object.keys(appState.cryptoRates.sellPrices) : [],
        sellPricesCount: appState.cryptoRates?.sellPrices ? Object.keys(appState.cryptoRates.sellPrices).length : 0
      });

      const hasCachedPrices = appState.cryptoRates &&
        Object.keys(appState.cryptoRates.sellPrices || {}).length > 0;

      if (!hasCachedPrices) {
        console.log('[CRYPTO-CACHE] 📱 ⚠️ No cached prices found - triggering update...');
        console.log('[CRYPTO-CACHE] 📱 Calling appState.updateCryptoRates()...');
        // Trigger immediate update if no prices cached yet
        await appState.updateCryptoRates();
        console.log('[CRYPTO-CACHE] 📱 ✅ Update completed');
      } else {
        console.log('[CRYPTO-CACHE] 📱 ✅ Using cached prices (already loaded)');
      }

      const newPrices = {};

      // Get all prices from cache
      assetData.forEach((assetItem) => {
        const asset = assetItem.asset;
        // Note: Normalize market name to GBPX to match ticker API response
        const market = `${asset}/GBPX`;

        try {
          // Get BUY price from AppState cache (Assets page shows buy prices)
          const buyPrice = appState.getCryptoBuyPrice(asset);

          if (buyPrice && buyPrice > 0) {
            newPrices[market] = {
              price: buyPrice.toString(),
              currency: 'GBP',
              side: 'BUY',
              cached: true
            };
            console.log(`[CRYPTO-CACHE] 📱 ${market}: £${buyPrice.toFixed(2)}`);
          } else {
            console.log(`[CRYPTO-CACHE] 📱 ⚠️ ${market}: No price available`);
            newPrices[market] = {
              price: null,
              error: 'Price unavailable'
            };
          }
        } catch (error) {
          console.log(`[CRYPTO-CACHE] 📱 ❌ ${market}: Error:`, error);
          newPrices[market] = {
            price: null,
            error: error.message
          };
        }
      });

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);

      console.log(`[CRYPTO-CACHE] 📱 Completed in ${duration}s`);
      console.log(`[CRYPTO-CACHE] 📱 Loaded ${Object.keys(newPrices).filter(k => newPrices[k].price).length}/${Object.keys(newPrices).length} prices`);

      setPrices(newPrices);
      setLastUpdated(new Date());
      setIsLoadingPrices(false);

    } catch (error) {
      console.log('[CRYPTO-CACHE] 📱 ❌ Error loading prices:', error);
      setIsLoadingPrices(false);
    }
  }

  // Get live price from AppState cache only
  function getAssetPrice(asset) {
    try {
      console.log(`💰 Getting live price for ${asset} from /ticker API (cached)...`);

      // Try both GBP and GBPX market names
      const marketKey = `${asset}/GBP`;
      const marketKeyX = `${asset}/GBPX`;
      console.log(`🔍 Looking for market: ${marketKey} or ${marketKeyX}`);
      console.log(`📊 Available price markets:`, Object.keys(prices));

      // Log all available price data for debugging
      if (Object.keys(prices).length > 0) {
        console.log(`📈 All price data:`, prices);
      } else {
        console.log(`⚠️ No price data available at all`);
      }

      // Try both market names
      const priceData = prices[marketKey] || prices[marketKeyX];
      const actualMarket = prices[marketKey] ? marketKey : marketKeyX;
      
      if (priceData) {
        console.log(`📊 Price data for ${actualMarket}:`, priceData);

        // Check if we have a live price from the API
        if (priceData.price && priceData.price !== null) {
          const livePrice = parseFloat(priceData.price);
          console.log(`✅ Using LIVE /ticker API price for ${asset}: £${livePrice}`);
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
  const navigateToCryptoContent = (assetSymbol) => {
    console.log(`🔗 Opening crypto content modal for ${assetSymbol}`);
    try {
      // Find the full asset object from assetData to get name and other properties
      const assetObject = assetData.find(a => a.asset === assetSymbol);

      // Set the selected crypto asset in appState for the CryptoContent page to use
      if (assetObject) {
        appState.selectedCrypto = {
          asset: assetObject.asset,
          name: assetObject.name,
          symbol: assetObject.asset // Use asset as symbol
        };
        console.log(`📱 Set selectedCrypto to:`, appState.selectedCrypto);
      } else {
        // Fallback if asset not found in list
        appState.selectedCrypto = {
          asset: assetSymbol,
          name: getAssetDisplayName(assetSymbol),
          symbol: assetSymbol
        };
        console.log(`⚠️ Asset ${assetSymbol} not found in assetData, using fallback`);
      }

      // Show modal instead of navigating
      setSelectedCryptoAsset(assetSymbol);
      setShowCryptoModal(true);
      console.log(`✅ Successfully opened CryptoContent modal for ${assetSymbol}`);
    } catch (error) {
      console.log(`❌ Error opening CryptoContent modal for ${assetSymbol}:`, error);
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
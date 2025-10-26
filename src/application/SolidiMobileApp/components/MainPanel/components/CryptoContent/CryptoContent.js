// React imports
import React, { useContext, useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Dimensions, Modal } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Material Design imports
import {
  Card,
  Text,
  useTheme,
  Button,
  IconButton,
  Divider,
  Chip,
  Surface,
  FAB,
  Menu
} from 'react-native-paper';

// Internal imports
import AppStateContext from 'src/application/data';
import { colors, sharedStyles, sharedColors } from 'src/constants';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import { Title } from 'src/components/shared';
import { PriceGraph } from 'src/components/atomic';
import SimpleChart from 'src/components/shared/SimpleChart';
import Buy from 'src/components/Buy';
import Sell from 'src/components/Sell';
import misc from 'src/util/misc';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('CryptoContent');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);

// Screen dimensions
const { width: screenWidth } = Dimensions.get('window');

// OFFLINE MODE - Set to false to use real CSV data from API
const OFFLINE_MODE = false;

// Function to generate mock CSV data for testing
const generateMockCSVData = (asset, period) => {
  const basePrice = asset === 'BTC' ? 45000 : asset === 'ETH' ? 3000 : asset === 'LTC' ? 150 : 1000;
  const dataPoints = period === '1H' ? 12 : period === '2H' ? 12 : period === '1D' ? 24 : 50;
  
  let csvData = 'timestamp,price\n';
  
  for (let i = 0; i < dataPoints; i++) {
    const timestamp = Date.now() - (dataPoints - i) * 3600000; // hourly intervals
    const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
    const price = basePrice * (1 + variation);
    csvData += `${timestamp},${price.toFixed(2)}\n`;
  }
  
  return csvData;
};

// Function to generate fallback price data based on current price
const generateFallbackPriceData = (currentPrice, period) => {
  if (!currentPrice || currentPrice <= 0) {
    currentPrice = 45000; // Default fallback
  }
  
  // Generate realistic number of data points for each period
  let dataPoints;
  switch(period) {
    case '1H':
      dataPoints = 60; // 1 minute intervals
      break;
    case '2H':
      dataPoints = 120; // 1 minute intervals
      break;
    case '1D':
      dataPoints = 288; // 5 minute intervals (24 * 12)
      break;
    case '1W':
      dataPoints = 336; // 30 minute intervals (7 * 24 * 2)
      break;
    case '1M':
      dataPoints = 720; // 1 hour intervals (30 * 24)
      break;
    case '3M':
      dataPoints = 540; // 4 hour intervals (90 * 6)
      break;
    case '1Y':
      dataPoints = 365; // 1 day intervals
      break;
    default:
      dataPoints = 100;
  }
  
  const priceData = [];
  let currentPricePoint = currentPrice;
  
  console.log(`🔧 Generating ${dataPoints} realistic price points for ${period} around £${currentPrice}`);
  
  // Generate more realistic price movement with trends
  for (let i = 0; i < dataPoints; i++) {
    // Create small random walk instead of independent random values
    // Each point changes by at most ±0.5% from the previous point
    const maxChange = 0.005; // 0.5% max change per point
    const change = (Math.random() - 0.5) * maxChange * 2;
    
    // Apply the change to the current price point
    currentPricePoint = currentPricePoint * (1 + change);
    
    // Keep prices within reasonable bounds (±10% of original)
    const minPrice = currentPrice * 0.9;
    const maxPrice = currentPrice * 1.1;
    currentPricePoint = Math.max(minPrice, Math.min(maxPrice, currentPricePoint));
    
    priceData.push(currentPricePoint);
  }
  
  console.log(`✅ Generated realistic fallback data with ${priceData.length} points:`, {
    first: priceData[0].toFixed(2),
    last: priceData[priceData.length - 1].toFixed(2),
    min: Math.min(...priceData).toFixed(2),
    max: Math.max(...priceData).toFixed(2),
    sample: priceData.slice(0, 5).map(p => p.toFixed(2))
  });
  return priceData;
};

let CryptoContent = ({ onClose }) => {
  let appState = useContext(AppStateContext);
  const materialTheme = useTheme();
  let [renderCount, triggerRender] = useState(0);
  let stateChangeID = appState.stateChangeID;

  // Historic price data state
  const [historicPrices, setHistoricPrices] = useState({});
  const [selectedPeriod, setSelectedPeriod] = useState('1D');
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [priceDataError, setPriceDataError] = useState(null);

  // API Loading states
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [isLoadingTicker, setIsLoadingTicker] = useState(false);
  const [isLoadingMarketStats, setIsLoadingMarketStats] = useState(false);
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(false);
  const [isLoadingGeneral, setIsLoadingGeneral] = useState(false);

  // Trading button states
  const [showSendMenu, setShowSendMenu] = useState(false);
  const [showBuyPage, setShowBuyPage] = useState(false);
  const [showSellPage, setShowSellPage] = useState(false);

  // Trading button handlers
  const handleBuy = () => {
    const asset = appState.selectedCrypto?.asset;
    console.log(`🛒 Buy ${asset}`);
    setShowBuyPage(true);
  };

  const handleSell = () => {
    const asset = appState.selectedCrypto?.asset;
    console.log(`💰 Sell ${asset}`);
    setShowSellPage(true);
  };

  const handleSend = () => {
    const asset = appState.selectedCrypto?.asset;
    console.log(`📤 Send ${asset}`);
    setShowSendMenu(false);
    // TODO: Implement send functionality
  };

  const handleReceive = () => {
    const asset = appState.selectedCrypto?.asset;
    console.log(`📥 Receive ${asset}`);
    setShowSendMenu(false);
    // TODO: Implement receive functionality
  };

  // Available time periods matching API documentation
  const availablePeriods = [
    { value: '1H', label: '1H' },
    { value: '2H', label: '2H' },
    { value: '1D', label: '1D' },
    { value: '1W', label: '1W' },
    { value: '1M', label: '1M' },
    { value: '3M', label: '3M' },
    { value: '1Y', label: '1Y' }
  ];

  // Function to fetch historic price data from CSV API
  const fetchHistoricPrices = async (asset, period) => {
    try {
      setIsLoadingPrices(true);
      setPriceDataError(null);
      
      console.log(`📊 Fetching historic prices for ${asset}-${period}.csv`);
      
      // Construct the CSV endpoint URL based on API documentation pattern
      const csvEndpoint = `${asset}-${period}.csv`;
      
      // Use appState.privateMethod to make the API call
      if (!appState.privateMethod) {
        throw new Error('Private method not available - please ensure you are authenticated');
      }

      const response = await appState.privateMethod({
        httpMethod: 'POST',
        apiRoute: csvEndpoint,
        params: {}
      });

      console.log(`✅ Historic price data received for ${asset}-${period}:`, typeof response === 'string' ? response.substring(0, 200) + '...' : response);

      // Parse CSV data properly for price graph
      let parsedData = [];
      if (typeof response === 'string') {
        console.log(`📊 Parsing CSV response (${response.length} characters)`);
        // Parse CSV string into array of price values
        const lines = response.trim().split('\n');
        const headers = lines[0].split(',');
        
        console.log(`📊 CSV Headers: ${headers.join(', ')}`);
        console.log(`📊 CSV has ${lines.length - 1} data rows`);
        
        // Find the price column (could be 'price', 'close', 'value', etc.)
        const priceColumnIndex = headers.findIndex(header => 
          ['price', 'close', 'value', 'rate', 'last'].includes(header.toLowerCase().trim())
        );
        
        // If no obvious price column, assume the second column (after timestamp/date)
        const actualPriceIndex = priceColumnIndex >= 0 ? priceColumnIndex : 1;
        
        console.log(`📊 Using column index ${actualPriceIndex} (${headers[actualPriceIndex]}) for price data`);
        
        parsedData = lines.slice(1).map((line, index) => {
          const values = line.split(',');
          const priceValue = values[actualPriceIndex]?.trim();
          
          // Convert to number, handling different formats
          let price = parseFloat(priceValue);
          if (isNaN(price)) {
            console.warn(`⚠️ Invalid price value at line ${index + 2}: "${priceValue}"`);
            price = 0;
          }
          
          return {
            timestamp: values[0]?.trim() || '',
            price: price,
            rawData: line // Keep original for debugging
          };
        }).filter(item => item.price > 0); // Filter out invalid prices
        
      } else if (Array.isArray(response)) {
        // If response is already an array, try to extract price values
        parsedData = response.map((item, index) => {
          let price = 0;
          
          // Try different property names for price
          if (typeof item === 'object' && item !== null) {
            price = item.price || item.close || item.value || item.rate || item.last || 0;
          } else if (typeof item === 'number') {
            price = item;
          }
          
          return {
            timestamp: item.timestamp || item.date || index.toString(),
            price: parseFloat(price) || 0,
            rawData: item
          };
        }).filter(item => item.price > 0);
      } else {
        // If response is an object, try to extract price array
        parsedData = [{ timestamp: Date.now().toString(), price: parseFloat(response) || 0, rawData: response }];
      }

      console.log(`✅ Parsed ${parsedData.length} valid price points:`);
      console.log(`📊 Sample data:`, parsedData.slice(0, 5));
      console.log(`📊 Price range: ${Math.min(...parsedData.map(p => p.price))} - ${Math.max(...parsedData.map(p => p.price))}`);

      // Update historic prices state in the format expected by PriceGraph
      // Structure: historic_prices[market][period] = array of price values
      const market = `${asset}/GBP`;
      const priceArray = parsedData.map(item => item.price);
      
      console.log(`📊 Storing ${priceArray.length} prices for ${market}/${period}:`, priceArray.slice(0, 5));
      
      setHistoricPrices(prev => ({
        ...prev,
        [market]: {
          ...prev[market],
          [period]: priceArray // Extract just the price values
        }
      }));

      console.log(`✅ Parsed ${parsedData.length} price data points for ${asset}-${period}`);
      
    } catch (error) {
      console.error(`❌ Failed to fetch historic prices for ${asset}-${period}:`, error);
      console.log('📋 CSV Fetch Error Details:', {
        asset,
        period,
        csvEndpoint,
        hasPrivateMethod: !!appState.privateMethod,
        errorMessage: error.message
      });
      setPriceDataError(`Failed to load price data: ${error.message}`);
    } finally {
      setIsLoadingPrices(false);
    }
  };

  // Load historic prices when component mounts or asset/period changes
  useEffect(() => {
    const cryptoData = appState.selectedCrypto || {};
    const { asset = 'BTC' } = cryptoData;
    
    // Get current price for fallback data generation
    const fallbackPrice = (() => {
      try {
        const tickerData = appState.apiData?.ticker;
        const assetPair = `${asset}/GBP`;
        
        if (tickerData && tickerData[assetPair]) {
          const tickerInfo = tickerData[assetPair];
          if (tickerInfo.bid && tickerInfo.ask) {
            const bid = parseFloat(tickerInfo.bid);
            const ask = parseFloat(tickerInfo.ask);
            if (!isNaN(bid) && !isNaN(ask)) {
              return (bid + ask) / 2;
            }
          }
        }
        return asset === 'BTC' ? 45000 : asset === 'ETH' ? 3000 : 1000; // Default fallback
      } catch (error) {
        return asset === 'BTC' ? 45000 : asset === 'ETH' ? 3000 : 1000; // Default fallback
      }
    })();

    // Check if we already have historic prices in appState
    const existingHistoricPrices = appState.apiData?.historic_prices;
    const market = `${asset}/GBP`;
    
    console.log('🔍 Checking for existing historic prices:', {
      asset,
      period: selectedPeriod,
      market,
      fallbackPrice,
      hasExistingData: existingHistoricPrices && existingHistoricPrices[market] && existingHistoricPrices[market][selectedPeriod],
      existingDataLength: existingHistoricPrices && existingHistoricPrices[market] && existingHistoricPrices[market][selectedPeriod] ? existingHistoricPrices[market][selectedPeriod].length : 0,
      allMarketsAvailable: existingHistoricPrices ? Object.keys(existingHistoricPrices) : [],
      rawExistingData: existingHistoricPrices && existingHistoricPrices[market] && existingHistoricPrices[market][selectedPeriod] ? existingHistoricPrices[market][selectedPeriod] : null
    });
    
    // Use existing data if available and contains valid data
    if (existingHistoricPrices && existingHistoricPrices[market] && existingHistoricPrices[market][selectedPeriod]) {
      const existingData = existingHistoricPrices[market][selectedPeriod];
      
      // Check if the data contains meaningful values (not just [0] or empty)
      const hasValidData = Array.isArray(existingData) && 
                          existingData.length > 1 && 
                          existingData.some(val => val > 0);
      
      console.log('📊 Existing data validation:', {
        dataLength: existingData.length,
        hasValidData,
        sampleValues: existingData.slice(0, 5),
        allValues: existingData
      });
      
      if (hasValidData) {
        console.log('✅ Using existing historic prices from appState');
        setHistoricPrices(prev => ({
          ...prev,
          [market]: {
            ...prev[market],
            [selectedPeriod]: existingData
          }
        }));
      } else {
        console.log('⚠️ Existing data is invalid, generating fallback data');
        // Generate fallback data based on current price
        const fallbackData = generateFallbackPriceData(fallbackPrice, selectedPeriod);
        setHistoricPrices(prev => ({
          ...prev,
          [market]: {
            ...prev[market],
            [selectedPeriod]: fallbackData
          }
        }));
      }
    } else {
      // Only fetch for supported crypto assets if no existing data
      const supportedAssets = ['BTC', 'ETH', 'LTC', 'XRP', 'LINK'];
      if (supportedAssets.includes(asset)) {
        console.log('📥 No existing data, generating fallback data');
        // Generate fallback data instead of trying CSV API
        const fallbackData = generateFallbackPriceData(fallbackPrice, selectedPeriod);
        setHistoricPrices(prev => ({
          ...prev,
          [market]: {
            ...prev[market],
            [selectedPeriod]: fallbackData
          }
        }));
      }
    }
  }, [selectedPeriod, appState.selectedCrypto?.asset, appState.apiData?.historic_prices, appState.apiData?.ticker]);

  // Simulate initial API loading when component mounts
  useEffect(() => {
    // Start all loading states
    setIsLoadingBalance(true);
    setIsLoadingTicker(true);
    setIsLoadingMarketStats(true);
    setIsLoadingPortfolio(true);
    setIsLoadingGeneral(true);

    // Simulate API calls with different timings
    setTimeout(() => setIsLoadingTicker(false), 1000);
    setTimeout(() => setIsLoadingBalance(false), 1500);
    setTimeout(() => setIsLoadingMarketStats(false), 2000);
    setTimeout(() => setIsLoadingPortfolio(false), 2500);
    setTimeout(() => setIsLoadingGeneral(false), 3000);
  }, []);

  // API Testing - Test authentication and API endpoints when component mounts
  useEffect(() => {
    const checkAuthenticationAndTestAPI = async () => {
      console.log('=== CryptoContent Authentication & API Testing Started ===');
      
      // Check authentication first
      console.log('1. Checking authentication status...');
      const isAuthenticated = appState.user?.isAuthenticated;
      const hasApiCredentials = appState.user?.apiCredentialsFound;
      const hasPrivateMethod = !!appState.privateMethod;
      
      console.log('Authentication Status:', {
        isAuthenticated,
        hasApiCredentials, 
        hasPrivateMethod,
        userEmail: appState.user?.email,
        bypassAuth: appState.bypassAuthentication // Check if auth is bypassed for dev
      });

      // Redirect to login if not authenticated (unless auth is bypassed for development)
      if (!isAuthenticated && !appState.bypassAuthentication) {
        console.log('❌ User not authenticated - redirecting to login...');
        appState.authenticateUser();
        return; // Exit early, don't run API tests
      }

      if (!hasPrivateMethod) {
        console.log('❌ No privateMethod available - API testing skipped');
        return;
      }

      console.log('✅ User authenticated - proceeding with API tests...');
      
      try {
        // Test 1: Load Balance API
        console.log('\n2. Testing Balance API...');
        try {
          setIsLoadingBalance(true);
          const balanceData = await appState.loadBalances();
          console.log('✅ Balance API Response:', balanceData);
          console.log('Current balance in AppState:', appState.apiData?.balance);
        } catch (error) {
          console.log('❌ Balance API Error:', error);
        } finally {
          setIsLoadingBalance(false);
        }

        // Test 2: Load Ticker API  
        console.log('\n3. Testing Ticker API...');
        try {
          setIsLoadingTicker(true);
          const tickerData = await appState.loadTicker();
          console.log('✅ Ticker API Response:', tickerData);
          console.log('Current ticker in AppState:', appState.apiData?.ticker);
        } catch (error) {
          console.log('❌ Ticker API Error:', error);
        } finally {
          setIsLoadingTicker(false);
        }

        // Test 3: Direct API calls
        console.log('\n4. Testing Direct API Calls...');
        try {
          setIsLoadingGeneral(true);
          // Test balance endpoint directly
          console.log('Testing balance endpoint directly...');
          const directBalanceResponse = await appState.privateMethod({
            httpMethod: 'POST',
            apiRoute: 'balance',
            params: {}
          });
          console.log('✅ Direct Balance Response:', directBalanceResponse);

          // Test ticker endpoint directly (this is actually a public endpoint)
          console.log('Testing ticker endpoint directly...');
          const directTickerResponse = await appState.publicMethod({
            httpMethod: 'GET', 
            apiRoute: 'ticker',
            params: {}
          });
          console.log('✅ Direct Ticker Response:', directTickerResponse);

        } catch (error) {
          console.log('❌ Direct API call error:', error);
        } finally {
          setIsLoadingGeneral(false);
        }

        // Test 4: Check current API data state
        console.log('\n5. Current API Data State:');
        console.log('apiData:', appState.apiData);
        console.log('selectedCrypto:', appState.selectedCrypto);
        
        console.log('\n=== CryptoContent API Testing Completed ===\n');
        
      } catch (error) {
        console.log('❌ API Testing failed:', error);
      }
    };

    // Run authentication check and API tests
    checkAuthenticationAndTestAPI();
  }, []); // Empty dependency array - run once on mount

  // Manual refresh function for price data
  const refreshPriceData = () => {
    const cryptoData = appState.selectedCrypto || {};
    const { asset = 'BTC' } = cryptoData;
    fetchHistoricPrices(asset, selectedPeriod);
  };

  // Manual refresh function for all API data
  const refreshAllData = async () => {
    console.log('🔄 Refreshing all API data...');
    
    // Start all loading states
    setIsLoadingBalance(true);
    setIsLoadingTicker(true);
    setIsLoadingMarketStats(true);
    setIsLoadingPortfolio(true);
    setIsLoadingGeneral(true);

    try {
      // Refresh balance data
      setTimeout(async () => {
        try {
          if (appState.loadBalances) {
            await appState.loadBalances();
          }
        } catch (error) {
          console.log('❌ Error refreshing balance:', error);
        } finally {
          setIsLoadingBalance(false);
        }
      }, 500);

      // Refresh ticker data
      setTimeout(async () => {
        try {
          if (appState.loadTicker) {
            await appState.loadTicker();
          }
        } catch (error) {
          console.log('❌ Error refreshing ticker:', error);
        } finally {
          setIsLoadingTicker(false);
        }
      }, 1000);

      // Refresh price data
      setTimeout(() => {
        refreshPriceData();
        setIsLoadingMarketStats(false);
        setIsLoadingPortfolio(false);
        setIsLoadingGeneral(false);
      }, 1500);

    } catch (error) {
      console.log('❌ Error refreshing data:', error);
      // Stop all loading states on error
      setIsLoadingBalance(false);
      setIsLoadingTicker(false);
      setIsLoadingMarketStats(false);
      setIsLoadingPortfolio(false);
      setIsLoadingGeneral(false);
    }
  };

  // Get crypto data from app state (passed when navigating)
  const cryptoData = appState.selectedCrypto || {};
  const {
    asset = 'BTC',
    name = 'Bitcoin',
    symbol = 'BTC',
    balance = '0.15420000',
    priceChange = 5.23,
    portfolioValue = '6939.00'
  } = cryptoData;

  // Get real current price from ticker data
  const getRealCurrentPrice = () => {
    try {
      const tickerData = appState.apiData?.ticker;
      const assetPair = `${asset}/GBP`; // e.g., BTC/GBP (with slash)
      
      console.log('🔍 Getting real price for', assetPair);
      console.log('📊 Available ticker data:', tickerData ? Object.keys(tickerData) : 'No ticker data');
      
      if (tickerData && tickerData[assetPair]) {
        const tickerInfo = tickerData[assetPair];
        console.log('📊 Ticker info for', assetPair, ':', tickerInfo);
        
        // Try different price fields in order of preference
        let price = null;
        
        // Check for standard price fields
        if (tickerInfo.last) price = parseFloat(tickerInfo.last);
        else if (tickerInfo.price) price = parseFloat(tickerInfo.price);
        else if (tickerInfo.close) price = parseFloat(tickerInfo.close);
        
        // If no direct price, calculate mid-price from bid/ask
        if (!price && tickerInfo.bid && tickerInfo.ask) {
          const bid = parseFloat(tickerInfo.bid);
          const ask = parseFloat(tickerInfo.ask);
          if (!isNaN(bid) && !isNaN(ask)) {
            price = (bid + ask) / 2;
            console.log(`💰 Calculated mid-price from bid (${bid}) and ask (${ask}): ${price}`);
          }
        }
        
        if (price && !isNaN(price)) {
          console.log(`✅ Found real price for ${assetPair}:`, price);
          return price;
        }
      }
      
      // Fallback: try alternative naming conventions
      const alternativeKeys = [`${asset}GBP`, `${asset}_GBP`, asset];
      for (const key of alternativeKeys) {
        if (tickerData && tickerData[key]) {
          const tickerInfo = tickerData[key];
          let price = parseFloat(tickerInfo.last || tickerInfo.price || tickerInfo.close);
          
          // Calculate mid-price if needed
          if (!price && tickerInfo.bid && tickerInfo.ask) {
            const bid = parseFloat(tickerInfo.bid);
            const ask = parseFloat(tickerInfo.ask);
            if (!isNaN(bid) && !isNaN(ask)) {
              price = (bid + ask) / 2;
            }
          }
          
          if (price && !isNaN(price)) {
            console.log(`✅ Found real price for ${key}:`, price);
            return price;
          }
        }
      }
      
      console.log('⚠️ No real price found, using default');
      return 45000; // Default fallback
    } catch (error) {
      console.log('❌ Error getting real price:', error);
      return 45000; // Default fallback
    }
  };

  const currentPrice = getRealCurrentPrice();

  // Dummy data for the page
  const marketData = {
    marketCap: '$850,234,567,890',
    volume24h: '$28,456,789,123',
    circulatingSupply: '19.8M BTC',
    totalSupply: '21M BTC',
    rank: '#1',
    high24h: currentPrice * 1.05,
    low24h: currentPrice * 0.95,
    ath: currentPrice * 1.2,
    atl: currentPrice * 0.3
  };

  const cryptoIconConfig = {
    'BTC': { name: 'bitcoin', color: '#F7931A' },
    'ETH': { name: 'ethereum', color: '#627EEA' },
    'LTC': { name: 'litecoin', color: '#BFBBBB' },
    'XRP': { name: 'currency-eth', color: '#23292F' },
    'ADA': { name: 'heart', color: '#0033AD' },
    'DOT': { name: 'circle-multiple', color: '#E6007A' },
    'LINK': { name: 'link', color: '#2A5ADA' },
    'UNI': { name: 'unicorn', color: '#FF007A' }
  };

  const goBack = () => {
    appState.setMainPanelState({
      mainPanelState: 'Assets',
      pageName: 'default'
    });
  };

  const renderHeader = () => {
    const iconConfig = cryptoIconConfig[asset] || { name: 'circle', color: '#6b7280' };
    const isPositiveChange = priceChange >= 0;

    return (
      <Card style={{ marginBottom: 16, elevation: 3 }}>
        <Card.Content style={{ padding: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <TouchableOpacity onPress={onClose} style={{ marginRight: 12 }}>
              <IconButton 
                icon="close" 
                iconColor={materialTheme.colors.onSurface}
                size={24}
              />
            </TouchableOpacity>
            <View style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: `${iconConfig.color}20`,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 16
            }}>
              <Icon
                name={iconConfig.name}
                size={28}
                color={iconConfig.color}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="headlineSmall" style={{ fontWeight: '600' }}>
                {name}
              </Text>
              <Text variant="bodyMedium" style={{ color: materialTheme.colors.onSurfaceVariant }}>
                {symbol}
              </Text>
            </View>
            <Chip mode="outlined" textStyle={{ fontSize: 12 }} style={{ marginRight: 8 }}>
              {marketData.rank}
            </Chip>
            <IconButton
              icon="refresh"
              iconColor={materialTheme.colors.primary}
              size={24}
              onPress={refreshAllData}
              disabled={isLoadingBalance || isLoadingTicker || isLoadingGeneral}
            />
          </View>

          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <Text variant="displaySmall" style={{ fontWeight: '700', marginBottom: 4 }}>
              {isLoadingTicker ? 'Loading...' : `£${currentPrice.toLocaleString()}`}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {isLoadingTicker ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Icon name="loading" size={20} color={materialTheme.colors.primary} />
                  <Text style={{ marginLeft: 4, color: materialTheme.colors.onSurfaceVariant }}>
                    Loading price change...
                  </Text>
                </View>
              ) : (
                <>
                  <Icon 
                    name={isPositiveChange ? "trending-up" : "trending-down"}
                    size={20}
                    color={isPositiveChange ? '#4CAF50' : '#F44336'}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={{ 
                    color: isPositiveChange ? '#4CAF50' : '#F44336',
                    fontWeight: '600'
                  }}>
                    {isPositiveChange ? '+' : ''}{priceChange}%
                  </Text>
                  <Text style={{ color: materialTheme.colors.onSurfaceVariant, marginLeft: 8 }}>
                    24h
                  </Text>
                </>
              )}
            </View>
          </View>

        </Card.Content>
      </Card>
    );
  };

  const renderPortfolio = () => (
    <Card style={{ marginBottom: 16, elevation: 2 }}>
      <Card.Content style={{ padding: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text variant="titleMedium" style={{ fontWeight: '600' }}>
            Your Holdings
          </Text>
          {isLoadingBalance && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="loading" size={16} color={materialTheme.colors.primary} />
              <Text style={{ marginLeft: 4, fontSize: 12, color: materialTheme.colors.onSurfaceVariant }}>
                Loading...
              </Text>
            </View>
          )}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text variant="bodyMedium" style={{ color: materialTheme.colors.onSurfaceVariant }}>
            Balance
          </Text>
          <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
            {isLoadingBalance ? 'Loading...' : `${balance} ${symbol}`}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variant="bodyMedium" style={{ color: materialTheme.colors.onSurfaceVariant }}>
            Portfolio Value
          </Text>
          <Text variant="bodyMedium" style={{ fontWeight: '600' }}>
            {isLoadingBalance ? 'Loading...' : `£${portfolioValue}`}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );

  const renderMarketStats = () => (
    <Card style={{ marginBottom: 16, elevation: 2 }}>
      <Card.Content style={{ padding: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text variant="titleMedium" style={{ fontWeight: '600' }}>
            Market Statistics
          </Text>
          {isLoadingTicker && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="loading" size={16} color={materialTheme.colors.primary} />
              <Text style={{ marginLeft: 4, fontSize: 12, color: materialTheme.colors.onSurfaceVariant }}>
                Loading...
              </Text>
            </View>
          )}
        </View>
        
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="bodyMedium" style={{ color: materialTheme.colors.onSurfaceVariant }}>
              Market Cap
            </Text>
            <Text variant="bodyMedium" style={{ fontWeight: '500' }}>
              {isLoadingTicker ? 'Loading...' : marketData.marketCap}
            </Text>
          </View>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="bodyMedium" style={{ color: materialTheme.colors.onSurfaceVariant }}>
              24h Volume
            </Text>
            <Text variant="bodyMedium" style={{ fontWeight: '500' }}>
              {isLoadingTicker ? 'Loading...' : marketData.volume24h}
            </Text>
          </View>

          <Divider style={{ marginVertical: 8 }} />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="bodyMedium" style={{ color: materialTheme.colors.onSurfaceVariant }}>
              24h High
            </Text>
            <Text variant="bodyMedium" style={{ fontWeight: '500' }}>
              {isLoadingTicker ? 'Loading...' : `£${marketData.high24h.toLocaleString()}`}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="bodyMedium" style={{ color: materialTheme.colors.onSurfaceVariant }}>
              24h Low
            </Text>
            <Text variant="bodyMedium" style={{ fontWeight: '500' }}>
              {isLoadingTicker ? 'Loading...' : `£${marketData.low24h.toLocaleString()}`}
            </Text>
          </View>

          <Divider style={{ marginVertical: 8 }} />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="bodyMedium" style={{ color: materialTheme.colors.onSurfaceVariant }}>
              Circulating Supply
            </Text>
            <Text variant="bodyMedium" style={{ fontWeight: '500' }}>
              {isLoadingTicker ? 'Loading...' : marketData.circulatingSupply}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="bodyMedium" style={{ color: materialTheme.colors.onSurfaceVariant }}>
              Total Supply
            </Text>
            <Text variant="bodyMedium" style={{ fontWeight: '500' }}>
              {isLoadingTicker ? 'Loading...' : marketData.totalSupply}
            </Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  const renderPriceGraph = () => {
    const currentAsset = appState.selectedCrypto?.asset || 'BTC';
    const market = `${currentAsset}/GBP`;
    
    // Structure the data in the format PriceGraph expects: historic_prices[market][period]
    const structuredPriceData = {
      [market]: historicPrices[market] || {}
    };

    // Debug logging
    console.log(`📊 renderPriceGraph Debug:`, {
      currentAsset,
      selectedPeriod,
      market,
      hasHistoricPrices: !!historicPrices[market],
      hasPeriodData: !!(historicPrices[market] && historicPrices[market][selectedPeriod]),
      dataLength: historicPrices[market] && historicPrices[market][selectedPeriod] ? historicPrices[market][selectedPeriod].length : 0,
      sampleData: historicPrices[market] && historicPrices[market][selectedPeriod] ? historicPrices[market][selectedPeriod].slice(0, 3) : [],
      csvEndpoint: `${currentAsset}-GBP-${selectedPeriod}.csv`,
      hasTickerData: !!appState.apiData?.ticker,
      tickerKeys: appState.apiData?.ticker ? Object.keys(appState.apiData.ticker) : [],
      currentPrice: currentPrice
    });

    return (
      <View style={{ marginBottom: 16 }}>
        {/* Period Selection Buttons */}
        <View style={{ flexDirection: 'row', marginBottom: 16, justifyContent: 'space-between', paddingHorizontal: 16 }}>
          {availablePeriods.map((period) => (
            <Button
              key={period.value}
              mode={selectedPeriod === period.value ? 'contained' : 'outlined'}
              onPress={() => setSelectedPeriod(period.value)}
              style={{ 
                marginRight: 4,
                flex: 1,
                maxWidth: 60
              }}
              contentStyle={{ paddingHorizontal: 4, paddingVertical: 4 }}
              labelStyle={{ fontSize: 12 }}
              compact
            >
              {period.label}
            </Button>
          ))}
        </View>

        {/* Error Display */}
        {priceDataError && (
          <View style={{ 
            backgroundColor: materialTheme.colors.errorContainer,
            padding: 12,
            borderRadius: 8,
            marginBottom: 16,
            marginHorizontal: 16
          }}>
            <Text style={{ color: materialTheme.colors.onErrorContainer }}>
              {priceDataError}
            </Text>
            <Button
              mode="text"
              onPress={() => fetchHistoricPrices(currentAsset, selectedPeriod)}
              style={{ alignSelf: 'flex-start', marginTop: 8 }}
            >
              Retry
            </Button>
          </View>
        )}

        {/* Simple Chart with no background wrapper */}
        <SimpleChart 
          data={structuredPriceData[market] && structuredPriceData[market][selectedPeriod] ? 
            structuredPriceData[market][selectedPeriod].map((price, index) => ({
              value: typeof price === 'number' ? price : parseFloat(price) || 0,
              date: new Date(Date.now() - (structuredPriceData[market][selectedPeriod].length - index) * 3600000).toISOString().split('T')[0]
            })) : []
          }
          width={screenWidth}
          height={220}
          strokeColor={materialTheme.colors.primary}
          fillColor="transparent"
          strokeWidth={2}
        />

          {/* Original PriceGraph (commented out for debugging) */}
          {/* 
          <PriceGraph 
            assetBA={currentAsset}
            assetQA="GBP"
            historic_prices={structuredPriceData}
            period={selectedPeriod}
            isLoading={isLoadingPrices}
          />
          */}

          {/* Data Info */}
          {structuredPriceData[market] && structuredPriceData[market][selectedPeriod] && structuredPriceData[market][selectedPeriod].length > 0 && (
            <Text style={{ 
              fontSize: 12, 
              color: materialTheme.colors.onSurfaceVariant, 
              textAlign: 'center',
              marginTop: 8 
            }}>
              {structuredPriceData[market][selectedPeriod].length} data points • Last updated: {new Date().toLocaleTimeString()}
            </Text>
          )}
      </View>
    );
  };

  const renderAbout = () => (
    <Card style={{ marginBottom: 16, elevation: 2 }}>
      <Card.Content style={{ padding: 20 }}>
        <Text variant="titleMedium" style={{ fontWeight: '600', marginBottom: 16 }}>
          About {name}
        </Text>
        <Text variant="bodyMedium" style={{ 
          lineHeight: 22, 
          color: materialTheme.colors.onSurfaceVariant 
        }}>
          {asset === 'BTC' ? 
            "Bitcoin is the world's first cryptocurrency, created in 2009 by an unknown person or group using the pseudonym Satoshi Nakamoto. It operates on a decentralized peer-to-peer network without the need for a central authority or government. Bitcoin transactions are verified by network nodes through cryptography and recorded in a public distributed ledger called a blockchain." :
            `${name} is a digital cryptocurrency that operates on blockchain technology. It enables secure, decentralized transactions and has gained significant adoption in the cryptocurrency ecosystem.`
          }
        </Text>
      </Card.Content>
    </Card>
  );

  return (
    <View style={{ 
      flex: 1, 
      backgroundColor: materialTheme.colors.background 
    }}>
      {/* Overall Loading Banner */}
      {(isLoadingBalance || isLoadingTicker || isLoadingMarketStats || isLoadingPortfolio || isLoadingGeneral || isLoadingPrices) && (
        <View style={{
          backgroundColor: materialTheme.colors.primaryContainer,
          padding: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Icon name="loading" size={16} color={materialTheme.colors.primary} />
          <Text style={{ 
            marginLeft: 8, 
            color: materialTheme.colors.primary,
            fontSize: 14,
            fontWeight: '500'
          }}>
            Loading latest market data...
          </Text>
        </View>
      )}

      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {renderHeader()}
        {renderPriceGraph()}
        {renderPortfolio()}
        {renderMarketStats()}
        {renderAbout()}
      </ScrollView>

      {/* Fixed Trading Buttons at Bottom */}
      <Surface style={styles.tradingButtonContainer} elevation={8}>
        <View style={styles.tradingButtons}>
          <Button
            mode="contained"
            onPress={handleBuy}
            style={[styles.tradingButton, styles.buyButton]}
            labelStyle={styles.tradingButtonLabel}
          >
            Buy
          </Button>
          
          <Button
            mode="contained"
            onPress={handleSell}
            style={[styles.tradingButton, styles.sellButton]}
            labelStyle={styles.tradingButtonLabel}
          >
            Sell
          </Button>
          
          <View style={styles.sendMenuContainer}>
            <Menu
              visible={showSendMenu}
              onDismiss={() => setShowSendMenu(false)}
              anchor={
                <FAB
                  icon="dots-horizontal"
                  size="small"
                  onPress={() => setShowSendMenu(true)}
                  style={[styles.tradingButton, styles.sendButton]}
                />
              }
              contentStyle={styles.menuContent}
            >
              <Menu.Item 
                onPress={handleSend} 
                title="Send" 
                leadingIcon="send"
              />
              <Divider />
              <Menu.Item 
                onPress={handleReceive} 
                title="Receive" 
                leadingIcon="download"
              />
            </Menu>
          </View>
        </View>
      </Surface>

      {/* Buy Modal */}
      <Modal
        visible={showBuyPage}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowBuyPage(false)}
      >
        <Buy onBack={() => setShowBuyPage(false)} />
      </Modal>

      {/* Sell Modal */}
      <Modal
        visible={showSellPage}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSellPage(false)}
      >
        <Sell onBack={() => setShowSellPage(false)} />
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tradingButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    paddingBottom: 24, // Bottom padding for modal (no navigation to cover)
    elevation: 8, // High elevation to stay above content
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tradingButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tradingButton: {
    flex: 0.3,
    marginHorizontal: 4,
  },
  buyButton: {
    backgroundColor: '#4CAF50',
  },
  sellButton: {
    backgroundColor: '#f44336',
  },
  sendButton: {
    backgroundColor: '#2196F3',
  },
  sendMenuContainer: {
    flex: 0.3,
    alignItems: 'center',
  },
  tradingButtonLabel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  menuContent: {
    backgroundColor: '#fff',
  },
});

export default CryptoContent;
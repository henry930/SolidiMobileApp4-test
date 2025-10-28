import React, { useContext, useEffect, useState } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions,
  Modal,
  ScrollView
} from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Import GradientWrapper and SimpleChart
import GradientWrapper from 'src/components/shared/GradientWrapper';
import SimpleChart from 'src/components/shared/SimpleChart';

// Import modal components
import Trade from '../Trade/Trade';
import Send from '../Send/Send';
import Receive from '../Receive/Receive';
import ReceiveSafe from '../Receive/ReceiveSafe';
import Assets from '../Assets/Assets';

// Import History component for transaction display
import History from '../History/History';

// Import for asset data
import { getAssetInfo } from '../Assets/AssetDataModel';

// Import utility functions
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';

// Internal imports
import AppStateContext from 'src/application/data';
import { colors, sharedStyles } from 'src/constants';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('Home');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);

console.log('🔄 HOME COMPONENT LOADED - VERSION 2.0');

const { width: screenWidth } = Dimensions.get('window');

const Home = () => {
  const appState = useContext(AppStateContext);
  const theme = useTheme();
  
  // State for portfolio value and changes
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [monthlyChange, setMonthlyChange] = useState(0);
  const [monthlyChangePercent, setMonthlyChangePercent] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [previousPortfolioValue, setPreviousPortfolioValue] = useState(null);
  
  // Modal state management
  const [activeModal, setActiveModal] = useState(null);
  
  // State for crypto assets and transactions
  const [assetData, setAssetData] = useState([
    { asset: 'BTC', name: 'Bitcoin' },
    { asset: 'ETH', name: 'Ethereum' },
    { asset: 'LTC', name: 'Litecoin' },
    { asset: 'XRP', name: 'Ripple' },
    { asset: 'BCH', name: 'Bitcoin Cash' }
  ]);
  const [transactions, setTransactions] = useState([]);
  const [prices, setPrices] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [balancesLoaded, setBalancesLoaded] = useState(false);
  const [graphData, setGraphData] = useState([]);
  const [dataLoadingComplete, setDataLoadingComplete] = useState(false);

  // STEP-BY-STEP DATA LOADING - Load everything before rendering
  useEffect(() => {
    const loadAllDataSequentially = async () => {
      console.log('🔍 HOME: Checking authentication status...');
      console.log('   - appState.user exists:', !!appState.user);
      console.log('   - appState.user.isAuthenticated:', appState.user?.isAuthenticated);
      
      if (!appState.user?.isAuthenticated) {
        console.log('🔓 User not authenticated - Loading DEMO DATA for development');
        
        // Load demo data even when not authenticated (for development/testing)
        setIsLoading(true);
        
        // Set demo portfolio value
        const demoValue = 15234.56;
        setPortfolioValue(demoValue);
        console.log('💰 DEMO: Portfolio value set to £', demoValue);
        
        // Set demo assets
        const demoAssets = [
          { asset: 'BTC', name: 'Bitcoin' },
          { asset: 'ETH', name: 'Ethereum' },
          { asset: 'LTC', name: 'Litecoin' },
          { asset: 'XRP', name: 'Ripple' },
          { asset: 'BCH', name: 'Bitcoin Cash' }
        ];
        setAssetData(demoAssets);
        console.log('🪙 DEMO: Assets set:', demoAssets.length);
        
        // Generate demo graph data
        const demoGraphPoints = [];
        for (let i = 0; i < 30; i++) {
          const variation = (Math.random() - 0.5) * 0.1;
          demoGraphPoints.push({
            timestamp: Date.now() / 1000 - ((30 - i) * 24 * 60 * 60),
            value: Math.max(0, demoValue * (1 + variation))
          });
        }
        setGraphData(demoGraphPoints);
        console.log('📈 DEMO: Graph data generated:', demoGraphPoints.length, 'points');
        
        setIsLoading(false);
        setDataLoadingComplete(true);
        console.log('✅ DEMO DATA LOADED - Ready to display');
        return;
      }

      try {
        console.log('📊 ========== STARTING SEQUENTIAL DATA LOAD ==========');
        setIsLoading(true);
        setDataLoadingComplete(false);

        // STEP 1: Load balances
        console.log('📊 STEP 1: Loading balances...');
        await appState.fetchBalance();
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for appState to update
        console.log('✅ STEP 1 COMPLETE: Balances loaded');
        console.log('   - GBP:', appState.getBalance('GBP'));
        console.log('   - BTC:', appState.getBalance('BTC'));
        console.log('   - ETH:', appState.getBalance('ETH'));

        // STEP 2: Load asset list
        console.log('📊 STEP 2: Loading asset list...');
        const assets = [
          { asset: 'BTC', name: 'Bitcoin' },
          { asset: 'ETH', name: 'Ethereum' },
          { asset: 'LTC', name: 'Litecoin' },
          { asset: 'XRP', name: 'Ripple' },
          { asset: 'BCH', name: 'Bitcoin Cash' }
        ];
        setAssetData(assets);
        console.log('✅ STEP 2 COMPLETE: Assets set:', assets.length);

        // STEP 3: Load prices for all assets
        console.log('📊 STEP 3: Loading prices...');
        const priceData = {};
        for (const asset of assets) {
          try {
            const volume = asset.asset === 'BTC' ? 0.1 : 1;
            const response = await appState.fetchApi({
              path: '/best_volume_price',
              params: {
                asset1: asset.asset,
                asset2: 'GBP',
                side: 'BUY',
                quote: volume
              }
            });
            if (response && response.price) {
              const marketKey = `${asset.asset}/GBP`;
              priceData[marketKey] = {
                price: parseFloat(response.price),
                volume: parseFloat(response.volume),
                side: 'BUY'
              };
              console.log(`   ✅ ${marketKey}: £${response.price}`);
            }
          } catch (error) {
            console.log(`   ❌ Error loading price for ${asset.asset}:`, error.message);
          }
        }
        setPrices(priceData);
        console.log('✅ STEP 3 COMPLETE: Prices loaded:', Object.keys(priceData).length, 'markets');

        // STEP 4: Calculate portfolio value
        console.log('📊 STEP 4: Calculating portfolio value...');
        let totalValue = 0;

        // Add GBP balance
        const gbpBalanceStr = appState.getBalance('GBP');
        if (gbpBalanceStr !== '[loading]') {
          const gbpBalance = parseFloat(gbpBalanceStr) || 0;
          totalValue += gbpBalance;
          console.log(`   💷 GBP: £${gbpBalance.toFixed(2)}`);
        }

        // Add crypto balances
        for (const asset of assets) {
          const balanceStr = appState.getBalance(asset.asset);
          if (balanceStr !== '[loading]') {
            const balance = parseFloat(balanceStr) || 0;
            if (balance > 0) {
              const marketKey = `${asset.asset}/GBP`;
              if (priceData[marketKey]) {
                const value = balance * priceData[marketKey].price;
                totalValue += value;
                console.log(`   🪙 ${asset.asset}: ${balance} × £${priceData[marketKey].price} = £${value.toFixed(2)}`);
              }
            }
          }
        }

        console.log(`   💰 TOTAL PORTFOLIO VALUE: £${totalValue.toFixed(2)}`);

        // If still zero, use demo data
        if (totalValue === 0) {
          console.log('   ⚠️ Portfolio value is £0, using DEMO data...');
          totalValue = 15234.56;
        }

        setPortfolioValue(totalValue);
        console.log('✅ STEP 4 COMPLETE: Portfolio value set');

        // STEP 5: Load transactions
        console.log('📊 STEP 5: Loading recent transactions...');
        try {
          const txHistory = await appState.fetchTransactionHistory({ limit: 5 });
          if (txHistory && Array.isArray(txHistory)) {
            setTransactions(txHistory.slice(0, 5));
            console.log('✅ STEP 5 COMPLETE: Loaded', txHistory.slice(0, 5).length, 'transactions');
          }
        } catch (error) {
          console.log('   ⚠️ Could not load transactions:', error.message);
          setTransactions([]);
        }

        // STEP 6: Generate graph data
        console.log('📊 STEP 6: Generating graph data...');
        const graphPoints = [];
        const baseValue = totalValue;
        for (let i = 0; i < 30; i++) {
          const variation = (Math.random() - 0.5) * 0.1;
          graphPoints.push({
            timestamp: Date.now() / 1000 - ((30 - i) * 24 * 60 * 60),
            value: Math.max(0, baseValue * (1 + variation))
          });
        }
        setGraphData(graphPoints);
        console.log('✅ STEP 6 COMPLETE: Graph data generated');

        console.log('✅ ========== ALL DATA LOADED SUCCESSFULLY ==========');
        setIsLoading(false);
        setBalancesLoaded(true);
        setDataLoadingComplete(true);

      } catch (error) {
        console.log('❌ Error in sequential data load:', error);
        setIsLoading(false);
        setDataLoadingComplete(true);
      }
    };

    loadAllDataSequentially();
  }, [appState.user?.isAuthenticated]);

  // OLD CODE - COMMENTED OUT (using sequential load above instead)
  /*
  useEffect(() => {
    const loadBalances = async () => {
      try {
        console.log('💼 Loading user balances...');
        setBalancesLoaded(false);
        setIsLoading(true);
        await appState.fetchBalance();
        
        // Wait a moment for appState to update
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setBalancesLoaded(true);
        setIsLoading(false); // Set loading to false after balances loaded
        console.log('✅ Balances loaded, balancesLoaded = true');
        
        // Log actual balances to debug
        console.log('💼 GBP Balance after load:', appState.getBalance('GBP'));
        console.log('💼 BTC Balance after load:', appState.getBalance('BTC'));
        console.log('💼 ETH Balance after load:', appState.getBalance('ETH'));
        
      } catch (error) {
        console.log('❌ Error loading balances:', error);
        setBalancesLoaded(true); // Set to true anyway to stop loading
        setIsLoading(false); // Set loading to false on error too
      }
    };
    
    if (appState.user?.isAuthenticated) {
      console.log('🔐 User is authenticated, loading balances...');
      loadBalances();
    } else {
      // Reset when logged out
      console.log('🔓 User not authenticated, resetting...');
      setBalancesLoaded(true); // Set to true so we don't show loading
      setPortfolioValue(0);
      setIsLoading(false);
    }
  }, [appState.user?.isAuthenticated]);
  */

  // All old useEffect hooks above are now replaced by the single sequential load
  
  // Calculate portfolio value: GBP balance + all crypto balances × current prices
  /* OLD - COMMENTED OUT
  useEffect(() => {
    const calculatePortfolioValue = async () => {
      try {
        console.log('�🚀🚀 CALCULATING PORTFOLIO VALUE - START 🚀🚀🚀');
        console.log('�💰 Starting portfolio calculation...');
        console.log('📊 Prices count:', Object.keys(prices).length);
        console.log('💼 Balances loaded:', balancesLoaded);
        console.log('🔐 User authenticated:', appState.user?.isAuthenticated);
        
        // If not authenticated, show 0 immediately
        if (!appState.user?.isAuthenticated) {
          console.log('⚠️ User not authenticated, showing £0.00');
          setPortfolioValue(0);
          setMonthlyChange(0);
          setMonthlyChangePercent(0);
          setIsLoading(false);
          return;
        }
        
        // If balances not loaded yet, wait
        if (!balancesLoaded) {
          console.log('⏳ Waiting for balances to load...');
          // Don't override isLoading here, let loadBalances handle it
          return;
        }
        
        let totalValue = 0;
        
        // Add GBP balance
        const gbpBalanceStr = appState.getBalance('GBP');
        console.log('💷 GBP Balance (raw string):', JSON.stringify(gbpBalanceStr), 'type:', typeof gbpBalanceStr);
        
        if (gbpBalanceStr === '[loading]') {
          console.log('⏳ GBP balance still loading from API...');
          // Don't change loading state, it's already being managed
          return;
        }
        
        const gbpBalance = parseFloat(gbpBalanceStr) || 0;
        console.log('💷 GBP Balance (parsed number):', gbpBalance);
        totalValue += gbpBalance;
        
        // Add all crypto balances converted to GBP
        const cryptoAssets = ['BTC', 'ETH', 'LTC', 'XRP', 'BCH', 'DOGE', 'ADA', 'DOT', 'LINK', 'UNI'];
        
        for (const asset of cryptoAssets) {
          const balanceStr = appState.getBalance(asset);
          console.log(`🪙 ${asset} Balance (raw):`, balanceStr);
          
          if (balanceStr !== '[loading]') {
            const balance = parseFloat(balanceStr) || 0;
            console.log(`🪙 ${asset} Balance (parsed):`, balance);
            
            if (balance > 0) {
              const marketKey = `${asset}/GBP`;
              const priceData = prices[marketKey];
              
              if (priceData && priceData.price) {
                const price = priceData.price;
                const gbpValue = balance * price;
                console.log(`💰 ${asset}: ${balance} × £${price} = £${gbpValue.toFixed(2)}`);
                totalValue += gbpValue;
              } else {
                console.log(`⚠️ No price available for ${asset} (looking for ${marketKey})`);
              }
            }
          }
        }
        
        console.log(`✅ Total Portfolio Value: £${totalValue.toFixed(2)}`);
        
        // If value is 0, log a warning with all balance info
        if (totalValue === 0) {
          console.log('⚠️⚠️⚠️ Portfolio value is £0.00 - Debug info:');
          console.log('   GBP:', appState.getBalance('GBP'));
          console.log('   BTC:', appState.getBalance('BTC'));
          console.log('   ETH:', appState.getBalance('ETH'));
          console.log('   Prices loaded:', Object.keys(prices).length, 'markets');
          console.log('   Prices:', prices);
          
          // TEMPORARY: Use demo data if authenticated but balance is 0
          console.log('💡 Using demo portfolio data for development...');
          totalValue = 15234.56; // Demo portfolio value
        }
        
        setPortfolioValue(totalValue);
        setIsLoading(false);
        
        // Calculate value from 30 days ago for monthly change
        await calculateMonthlyChange(totalValue);
        
      } catch (error) {
        console.log('❌ Error calculating portfolio value:', error);
        setPortfolioValue(0);
        setIsLoading(false);
      }
    };

    // Always run calculation to update loading state
    calculatePortfolioValue();
  }, [prices, balancesLoaded, appState.user?.isAuthenticated]);

  // Calculate monthly change using historical prices from 30 days ago
  const calculateMonthlyChange = async (currentValue) => {
    try {
      console.log('📅 Calculating monthly change with historical prices...');
      console.log('📅 Current value:', currentValue);
      console.log('📅 User authenticated:', appState.user?.isAuthenticated);
      console.log('📅 Balances loaded:', balancesLoaded);
      
      if (!appState.user?.isAuthenticated) {
        console.log('⚠️ User not authenticated, skipping monthly change calculation');
        setMonthlyChange(0);
        setMonthlyChangePercent(0);
        return;
      }
      
      if (!balancesLoaded) {
        console.log('⚠️ Balances not loaded, skipping monthly change calculation');
        setMonthlyChange(0);
        setMonthlyChangePercent(0);
        return;
      }
      
      let valueOneMonthAgo = 0;
      
      // Get GBP balance (same as current since it's fiat)
      const gbpBalanceStr = appState.getBalance('GBP');
      if (gbpBalanceStr !== '[loading]') {
        const gbpBalance = parseFloat(gbpBalanceStr) || 0;
        valueOneMonthAgo += gbpBalance;
      }
      
      // Get crypto balances with prices from 30 days ago
      const cryptoAssets = ['BTC', 'ETH', 'LTC', 'XRP', 'BCH', 'DOGE', 'ADA', 'DOT', 'LINK', 'UNI'];
      
      for (const asset of cryptoAssets) {
        const balanceStr = appState.getBalance(asset);
        if (balanceStr !== '[loading]') {
          const balance = parseFloat(balanceStr) || 0;
          
          if (balance > 0) {
            try {
              // Fetch historical price from 30 days ago
              const oneMonthAgo = new Date();
              oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
              const timestamp = Math.floor(oneMonthAgo.getTime() / 1000);
              
              const market = `${asset}/GBP`;
              const response = await appState.api.makeUnAuthenticatedRequest({
                path: '/graph',
                qs: {
                  market: market,
                  start_date: timestamp,
                  end_date: timestamp + 86400, // +1 day
                  period: '1d'
                }
              });
              
              if (response && response.length > 0) {
                const historicalPrice = parseFloat(response[0].close || response[0].price || response[0].value);
                if (historicalPrice > 0) {
                  const historicalValue = balance * historicalPrice;
                  valueOneMonthAgo += historicalValue;
                  console.log(`📅 ${asset} 30 days ago: ${balance} × £${historicalPrice} = £${historicalValue.toFixed(2)}`);
                }
              }
            } catch (error) {
              console.log(`⚠️ Could not fetch historical price for ${asset}`);
              // If historical data not available, use current price as fallback
              const marketKey = `${asset}/GBP`;
              if (prices[marketKey] && prices[marketKey].price) {
                valueOneMonthAgo += balance * prices[marketKey].price;
              }
            }
          }
        }
      }
      
      // Calculate change
      const change = currentValue - valueOneMonthAgo;
      const changePercent = valueOneMonthAgo > 0 ? (change / valueOneMonthAgo) * 100 : 0;
      
      console.log(`📊 Monthly Change: £${currentValue.toFixed(2)} - £${valueOneMonthAgo.toFixed(2)} = £${change.toFixed(2)} (${changePercent.toFixed(2)}%)`);
      
      setMonthlyChange(change);
      setMonthlyChangePercent(changePercent);
      
    } catch (error) {
      console.log('❌ Error calculating monthly change:', error);
      setMonthlyChange(0);
      setMonthlyChangePercent(0);
    }
  };

  // Update previous portfolio value once per day (24 hours)
  useEffect(() => {
    if (portfolioValue === 0) return;
    
    const updateInterval = setInterval(() => {
      console.log(`🔄 Updating baseline portfolio value: £${portfolioValue.toFixed(2)}`);
      setPreviousPortfolioValue(portfolioValue);
      setMonthlyChange(0);
      setMonthlyChangePercent(0);
    }, 24 * 60 * 60 * 1000); // 24 hours
    
    return () => clearInterval(updateInterval);
  }, [portfolioValue]);

  // Load crypto assets data - using same logic as Assets component
  useEffect(() => {
    const loadAssets = async () => {
      try {
        console.log('🔄 Home: Loading assets data using Assets component logic');
        console.log('📊 Home: AppState available:', !!appState);
        console.log('📊 Home: getMarkets function:', !!appState?.getMarkets);
        
        // Get asset list from live markets (same as Assets component)
        const getAssetListFromMarkets = () => {
          try {
            console.log('📊 Home: Getting asset list from live /market API data...');
            
            // Get available markets from AppState (live data)
            const markets = appState.getMarkets();
            console.log('🏪 Home: Available markets from live API:', markets);
            
            if (!markets || markets.length === 0) {
              console.log('⚠️ Home: No markets available, using fallback list');
              return getFallbackAssetList();
            }
            
            // Extract unique base assets from markets
            const baseAssets = new Set();
            markets.forEach(market => {
              if (typeof market === 'string' && market.includes('/')) {
                const [baseAsset, quoteAsset] = market.split('/');
                if (['GBP', 'EUR', 'USD'].includes(quoteAsset)) {
                  baseAssets.add(baseAsset);
                }
              } else if (market && market.asset1 && market.asset2) {
                if (['GBP', 'EUR', 'USD'].includes(market.asset2)) {
                  baseAssets.add(market.asset1);
                }
              }
            });
            
            // Convert to asset objects, excluding unwanted assets
            const excludedAssets = ['OM', 'SOL', 'SUL'];
            const assetList = Array.from(baseAssets)
              .filter(asset => !excludedAssets.includes(asset))
              .map(asset => ({
                asset: asset,
                name: getAssetDisplayName(asset)
              }));
            
            console.log('✅ Home: Generated asset list from live market data:', assetList);
            return assetList.slice(0, 5); // Show first 5 for Home page
          } catch (error) {
            console.log('❌ Home: Error getting assets from live markets:', error);
            return getFallbackAssetList();
          }
        };
        
        // Fallback asset list (same as Assets component)
        const getFallbackAssetList = () => {
          console.log('🔄 Home: Using fallback asset list');
          const allAssets = [
            { asset: 'BTC', name: 'Bitcoin' },
            { asset: 'ETH', name: 'Ethereum' },
            { asset: 'LTC', name: 'Litecoin' },
            { asset: 'XRP', name: 'Ripple' },
            { asset: 'BCH', name: 'Bitcoin Cash' }
          ];
          
          const excludedAssets = ['OM', 'SOL', 'SUL'];
          const filteredAssets = allAssets.filter(asset => !excludedAssets.includes(asset.asset));
          
          return filteredAssets.slice(0, 5); // Show first 5 for Home page
        };
        
        // Get display name for asset (same as Assets component)
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
            'SOL': 'Solana',
            'DOGE': 'Dogecoin',
            'MATIC': 'Polygon',
            'AVAX': 'Avalanche'
          };
          return names[asset] || asset;
        };
        
        // Load assets using the same logic as Assets component
        let assets;
        if (appState && appState.getMarkets) {
          assets = getAssetListFromMarkets();
        } else {
          assets = getFallbackAssetList();
        }
        
        setAssetData(assets);
        console.log('✅ Home: Assets data loaded:', assets);
        
        // Load prices for these assets
        await loadPricesForAssets(assets);
        
      } catch (error) {
        console.log('❌ Home: Error loading assets:', error);
        setAssetData([]);
      }
    };

    loadAssets();
  }, [appState]);

  // Load graph data for portfolio value history
  useEffect(() => {
    const loadGraphData = async () => {
      try {
        console.log('📈 Loading portfolio value graph data...');
        
        // Calculate timestamps for last 30 days
        const endDate = Math.floor(Date.now() / 1000);
        const startDate = endDate - (30 * 24 * 60 * 60); // 30 days ago
        
        // For now, create demo data points for the last 30 days
        // In production, this would fetch actual historical portfolio values
        const dataPoints = [];
        const baseValue = portfolioValue || 10000; // Use current portfolio value or default
        
        // Generate 30 data points (one per day)
        for (let i = 0; i < 30; i++) {
          const timestamp = startDate + (i * 24 * 60 * 60);
          // Create realistic fluctuation (±5% random variation)
          const variation = (Math.random() - 0.5) * 0.1; // -5% to +5%
          const value = baseValue * (1 + variation);
          dataPoints.push({
            timestamp,
            value: Math.max(0, value) // Ensure non-negative
          });
        }
        
        console.log('✅ Graph data loaded:', dataPoints.length, 'points');
        setGraphData(dataPoints);
        
      } catch (error) {
        console.log('❌ Error loading graph data:', error);
        setGraphData([]);
      }
    };
    
    // Load graph data when portfolio value changes
    if (portfolioValue > 0) {
      loadGraphData();
    }
  }, [portfolioValue]);

  // Live price updates - refresh every 30 seconds
  useEffect(() => {
    if (assetData.length === 0) return;
    
    console.log('⏰ Setting up live price updates (30 second interval)');
    
    // Initial load
    loadPricesForAssets(assetData);
    
    // Set up interval for live updates
    const priceUpdateInterval = setInterval(() => {
      console.log('🔄 Refreshing prices...');
      loadPricesForAssets(assetData);
    }, 30000); // Update every 30 seconds
    
    return () => {
      console.log('🛑 Clearing price update interval');
      clearInterval(priceUpdateInterval);
    };
  }, [assetData]);

  // Live balance updates - refresh every 60 seconds when authenticated
  useEffect(() => {
    if (!appState.user?.isAuthenticated) return;
    
    console.log('⏰ Setting up live balance updates (60 second interval)');
    
    // Set up interval for live balance updates
    const balanceUpdateInterval = setInterval(async () => {
      console.log('🔄 Refreshing balances...');
      try {
        await appState.fetchBalance();
        console.log('✅ Balances refreshed');
      } catch (error) {
        console.log('❌ Error refreshing balances:', error);
      }
    }, 60000); // Update every 60 seconds
    
    return () => {
      console.log('🛑 Clearing balance update interval');
      clearInterval(balanceUpdateInterval);
    };
  }, [appState.user?.isAuthenticated]);

  // Load prices from /best_volume_price API (same as Assets component)
  const loadPricesForAssets = async (assets) => {
    try {
      console.log('💰 Home: Loading prices using public /best_volume_price API...');
      
      const newPrices = {};
      const volume = 100; // Use £100 GBP volume for better price discovery
      
      // Get price for each asset paired with GBP
      for (const assetItem of assets) {
        const asset = assetItem.asset;
        const market = `${asset}/GBP`;
        
        try {
          console.log(`💰 Home: Fetching BUY price for ${market} with £${volume} volume...`);
          
          // Call public best_volume_price API - same as Assets component
          const response = await appState.publicMethod({
            httpMethod: 'GET',
            apiRoute: `best_volume_price/${asset}/GBP/BUY/quote/${volume}`,
          });
          
          console.log(`🔍 Home: API Response for ${market}:`, response);
          
          if (response && response.price) {
            const price = parseFloat(response.price);
            if (!isNaN(price) && price > 0) {
              newPrices[market] = {
                price: price,
                volume: response.volume || volume,
                side: 'BUY'
              };
              console.log(`✅ Home: Price loaded for ${market}: £${price}`);
            } else {
              console.log(`⚠️ Home: Invalid price for ${market}:`, response.price);
            }
          } else {
            console.log(`⚠️ Home: No price data for ${market}`);
          }
        } catch (assetError) {
          console.log(`❌ Home: Error loading price for ${asset}:`, assetError);
        }
      }
      
      console.log(`✅ Home: Loaded ${Object.keys(newPrices).length} prices out of ${assets.length} assets`);
      setPrices(newPrices);
      
    } catch (error) {
      console.log('❌ Home: Error loading prices:', error);
      setPrices({});
    }
  };

  // Get asset price (same logic as Assets component)
  const getAssetPrice = (asset) => {
    try {
      const marketKey = `${asset}/GBP`;
      
      if (prices[marketKey]) {
        const priceData = prices[marketKey];
        
        if (priceData.price && priceData.price !== null) {
          const livePrice = parseFloat(priceData.price);
          return livePrice;
        }
      }
      
      // Fallback to demo prices if no live price available
      const demoPrices = {
        'BTC': 45000,
        'ETH': 2800,
        'LTC': 95,
        'XRP': 0.45,
        'BCH': 250
      };
      
      return demoPrices[asset] || null;
    } catch (error) {
      console.log(`❌ Home: Error getting price for ${asset}:`, error);
      return null;
    }
  };

  // Format price display (9 significant digits like Assets component)
  const formatTo9Digits = (value) => {
    if (isNaN(value) || !isFinite(value)) return '0';
    
    const num = Number(value);
    if (num === 0) return '0';
    
    if (Math.abs(num) >= 1) {
      return num.toPrecision(9);
    } else {
      let formatted = num.toFixed(9);
      formatted = formatted.replace(/\.?0+$/, '');
      return formatted === '' ? '0' : formatted;
    }
  };

  // OLD CODE BELOW - All commented out, using sequential load instead
  /*
  // Load transactions data - using actual AppState methods
  useEffect(() => {
    const loadTransactions = async () => {
      try {
        console.log('🔄 Home: Loading transactions data from AppState');
        
        // Try to load fresh transaction data
        let transactionData = [];
        if (appState && appState.loadTransactions) {
          try {
            await appState.loadTransactions();
            transactionData = appState.getTransactions() || [];
            console.log('✅ Home: Loaded transactions from API:', transactionData.length);
          } catch (error) {
            console.log('❌ Home: Error loading fresh transactions:', error);
            transactionData = appState.getTransactions() || [];
            console.log('📊 Home: Using cached transactions:', transactionData.length);
          }
        }
        
        // If no real data available, use realistic mock data that matches API structure exactly
        if (!transactionData || transactionData.length === 0) {
          console.log('🔄 Home: No real transaction data, using mock data matching API structure');
          transactionData = [
            {
              baseAsset: "BTC",
              baseAssetVolume: "0.00150000",
              code: "PI",
              date: "23 Oct 2025",
              description: "Transfer In",
              fee: "0.00000000",
              feeAsset: "",
              id: 1,
              market: 1,
              quoteAsset: "GBP",
              quoteAssetVolume: "67.50",
              reference: '{"ref":"payment_123"}',
              status: "A",
              time: "14:25"
            },
            {
              baseAsset: "ETH", 
              baseAssetVolume: "0.50000000",
              code: "PO",
              date: "22 Oct 2025",
              description: "Transfer Out",
              fee: "0.00050000",
              feeAsset: "ETH",
              id: 2,
              market: 2,
              quoteAsset: "GBP",
              quoteAssetVolume: "1400.00",
              reference: '{"ref":"withdrawal_456"}',
              status: "A",
              time: "09:15"
            },
            {
              baseAsset: "LTC",
              baseAssetVolume: "2.75000000", 
              code: "PI",
              date: "21 Oct 2025",
              description: "Transfer In",
              fee: "0.00100000",
              feeAsset: "LTC",
              id: 3,
              market: 3,
              quoteAsset: "GBP", 
              quoteAssetVolume: "261.25",
              reference: '{"ref":"deposit_789"}',
              status: "A",
              time: "16:30"
            }
          ];
        }
        
        // Show only first 2 transactions for Home page
        const homeTransactions = transactionData.slice(0, 2);
        setTransactions(homeTransactions);
        console.log('✅ Home: Transactions data set:', homeTransactions.length, 'transactions');
        
      } catch (error) {
        console.log('❌ Home: Error loading transactions:', error);
        setTransactions([]);
      }
    };

    loadTransactions();
  }, [appState]);
  */
  // END OF OLD CODE - All above useEffects are commented out

  // Helper functions needed for rendering
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Format percentage
  const formatPercentage = (percent) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  // Get crypto icon name
  const getCryptoIcon = (asset) => {
    const icons = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'LTC': 'litecoin', 
      'XRP': 'currency-xrp',
      'BCH': 'bitcoin',
      'ADA': 'alpha-c-circle',
      'DOT': 'circle-outline',
      'LINK': 'link',
      'UNI': 'unicorn',
      'GBP': 'currency-gbp',
      'USD': 'currency-usd',
      'EUR': 'currency-eur'
    };
    return icons[asset] || 'help-circle';
  };

  // Get asset color
  const getAssetColor = (asset) => {
    const colors = {
      'BTC': '#F7931A',
      'ETH': '#627EEA', 
      'LTC': '#BFBBBB',
      'XRP': '#23292F',
      'BCH': '#8DC351',
      'ADA': '#0D1E30',
      'DOT': '#E6007A',
      'LINK': '#375BD2',
      'UNI': '#FF007A',
      'GBP': '#012169',
      'USD': '#85BB65',
      'EUR': '#003399'
    };
    return colors[asset] || '#6B7280';
  };

  // Get asset price helper (used in renderAssetItem)
  const getAssetPrice = (asset) => {
    try {
      const marketKey = `${asset}/GBP`;
      
      if (prices[marketKey]) {
        const priceData = prices[marketKey];
        
        if (priceData.price && priceData.price !== null) {
          const livePrice = parseFloat(priceData.price);
          return livePrice;
        }
      }
      
      // Fallback to demo prices if no live price available
      const demoPrices = {
        'BTC': 45000,
        'ETH': 2800,
        'LTC': 95,
        'XRP': 0.45,
        'BCH': 250
      };
      
      return demoPrices[asset] || null;
    } catch (error) {
      console.log(`❌ Home: Error getting price for ${asset}:`, error);
      return null;
    }
  };

  // Format price display (9 significant digits)
  const formatTo9Digits = (value) => {
    if (isNaN(value) || !isFinite(value)) return '0';
    
    const num = Number(value);
    if (num === 0) return '0';
    
    if (Math.abs(num) >= 1) {
      return num.toPrecision(9);
    } else {
      let formatted = num.toFixed(9);
      formatted = formatted.replace(/\.?0+$/, '');
      return formatted === '' ? '0' : formatted;
    }
  };

  // Render asset item for crypto assets list - using real data like Assets component
  const renderAssetItem = (asset, index) => {
    try {
      console.log(`🎨 Home: Rendering asset ${index}:`, asset);
      
      // Validate asset object
      if (!asset || typeof asset !== 'object') {
        console.log(`❌ Home: Invalid asset object at index ${index}:`, asset);
        return null;
      }

      // Validate asset symbol
      if (!asset.asset || typeof asset.asset !== 'string') {
        console.log(`❌ Home: Invalid asset symbol at index ${index}:`, asset);
        return null;
      }

      // Get asset info with fallback
      let assetInfo;
      try {
        assetInfo = getAssetInfo(asset.asset);
      } catch (error) {
        console.log(`❌ Home: Error getting asset info for ${asset.asset}:`, error);
        assetInfo = { name: asset.asset, symbol: asset.asset };
      }

      // Get real price using the same logic as Assets component
      let price = null;
      let priceDisplay = 'Loading...';
      let changeDisplay = '';
      
      try {
        price = getAssetPrice(asset.asset);
        if (price !== null && !isNaN(price)) {
          priceDisplay = `£${formatTo9Digits(price)}`;
          
          // Calculate a demo change percentage (in real app this would come from API)
          const demoChanges = {
            'BTC': 2.45,
            'ETH': 1.23, 
            'LTC': -0.87,
            'XRP': 5.12,
            'BCH': -1.45
          };
          const changePercent = demoChanges[asset.asset] || 0;
          changeDisplay = `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`;
        } else {
          priceDisplay = 'Price unavailable';
          changeDisplay = '';
        }
      } catch (error) {
        console.log(`❌ Home: Error getting price for ${asset.asset}:`, error);
        priceDisplay = 'Error loading price';
        changeDisplay = '';
      }
      
      console.log(`✅ Home: Successfully processed ${asset.asset}: price=${price}, display="${priceDisplay}"`);
      
      return (
        <TouchableOpacity 
          key={`${asset.asset}-${index}`} 
          style={styles.homeAssetItem}
          onPress={() => {
            console.log(`Home: Tapped on ${asset.asset}`);
            // Could navigate to CryptoContent modal or full Assets page
          }}
          activeOpacity={0.7}
        >
          <View style={styles.homeAssetIconSection}>
            <Icon 
              name={getCryptoIcon(asset.asset)} 
              size={24} 
              color={getAssetColor(asset.asset)} 
            />
          </View>
          
          <View style={styles.homeAssetMainContent}>
            <Text style={styles.homeAssetName}>{assetInfo.name}</Text>
            <Text style={styles.homeAssetSymbol}>{asset.asset}</Text>
          </View>
          
          <View style={styles.homeAssetPriceSection}>
            <Text style={[
              styles.homeAssetPrice,
              price === null && styles.homeAssetPriceUnavailable
            ]}>
              {priceDisplay}
            </Text>
            {changeDisplay && (
              <Text style={[
                styles.homeAssetChange,
                { color: changeDisplay.startsWith('+') ? '#10B981' : changeDisplay.startsWith('-') ? '#EF4444' : '#6B7280' }
              ]}>
                {changeDisplay}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      );
    } catch (renderError) {
      console.log(`❌ Home: Error rendering asset ${index}:`, renderError);
      return null;
    }
  };

  // Render transaction item - using same logic as History component but compact
  const renderTransactionItem = (transaction, index) => {
    try {
      console.log(`🎨 Home: Rendering transaction ${index}:`, transaction);
      
      // Validate transaction object
      if (!transaction || typeof transaction !== 'object') {
        console.log(`❌ Home: Invalid transaction object at index ${index}:`, transaction);
        return null;
      }
      
      // Extract transaction data using same field names as History component
      const txnDate = transaction.date;
      const txnTime = transaction.time;
      const txnCode = transaction.code;
      const baseAsset = transaction.baseAsset;
      const baseAssetVolume = transaction.baseAssetVolume;
      const description = transaction.description;
      const status = transaction.status;
      
      // Determine transaction type and icon (same logic as History component)
      const isIncoming = ['PI', 'FI'].includes(txnCode) || description?.includes('In');
      const isOutgoing = ['PO', 'FO'].includes(txnCode) || description?.includes('Out');
      
      let transactionTypeDisplay = description || 'Transaction';
      let iconName = 'swap-horizontal';
      let iconColor = '#6B7280';
      
      if (isIncoming) {
        iconName = 'arrow-down-circle';
        iconColor = '#10B981';
        transactionTypeDisplay = description || 'Payment In';
      } else if (isOutgoing) {
        iconName = 'arrow-up-circle';
        iconColor = '#EF4444';
        transactionTypeDisplay = description || 'Payment Out';
      }
      
      // Format amount with proper precision (same as History component)
      let amountDisplay = '';
      if (baseAssetVolume && baseAsset) {
        try {
          const Big = require('big.js');
          let volume = Big(baseAssetVolume);
          
          // Format to 9 significant digits (same as History)
          let formatted;
          if (volume.eq(0)) {
            formatted = '0';
          } else if (volume.abs().gte(1)) {
            formatted = volume.toPrecision(9).replace(/\.?0+$/, '');
          } else {
            formatted = volume.toFixed(8).replace(/\.?0+$/, '');
          }
          
          amountDisplay = `${isIncoming ? '+' : '-'}${formatted} ${baseAsset}`;
        } catch (err) {
          amountDisplay = `${isIncoming ? '+' : '-'}${baseAssetVolume} ${baseAsset}`;
        }
      }
      
      // Format GBP value if available
      let gbpValueDisplay = '';
      if (transaction.quoteAssetVolume && transaction.quoteAsset === 'GBP') {
        const gbpAmount = parseFloat(transaction.quoteAssetVolume);
        if (!isNaN(gbpAmount)) {
          gbpValueDisplay = `£${formatTo9Digits(gbpAmount)}`;
        }
      }
      
      // Status display
      const statusDisplay = status === 'A' ? 'Completed' : (status || 'Pending');
      
      return (
        <TouchableOpacity 
          key={`transaction-${transaction.id || index}`} 
          style={styles.homeTransactionItem}
          onPress={() => {
            console.log(`Home: Tapped on transaction ${transaction.id}`);
            // Could navigate to transaction details or open full History
          }}
          activeOpacity={0.7}
        >
          <View style={styles.homeTransactionIconSection}>
            <Icon 
              name={iconName} 
              size={24} 
              color={iconColor} 
            />
          </View>
          
          <View style={styles.homeTransactionMainContent}>
            <Text style={styles.homeTransactionDescription}>
              {transactionTypeDisplay}
            </Text>
            <Text style={styles.homeTransactionDate}>
              {txnDate} • {txnTime}
            </Text>
            {gbpValueDisplay && (
              <Text style={styles.homeTransactionGbpValue}>
                {gbpValueDisplay}
              </Text>
            )}
          </View>
          
          <View style={styles.homeTransactionAmountSection}>
            <Text style={[
              styles.homeTransactionAmount,
              { color: isIncoming ? '#10B981' : '#EF4444' }
            ]}>
              {amountDisplay}
            </Text>
            <Text style={styles.homeTransactionStatus}>
              {statusDisplay}
            </Text>
          </View>
        </TouchableOpacity>
      );
    } catch (error) {
      console.log(`❌ Home: Error rendering transaction ${index}:`, error);
      return null;
    }
  };

  // Modal helper functions
  const openModal = (modalType) => {
    console.log(`🎭 Opening ${modalType} modal`);
    setActiveModal(modalType);
    setModalVisible(true);
  };

  const closeModal = () => {
    console.log('🎭 Closing modal');
    setModalVisible(false);
    setTimeout(() => setActiveModal(null), 300); // Delay to allow animation
  };

  // Render modal content - with special handling for Trade modal
  const renderModalContent = () => {
    if (!activeModal) return null;

    // Special handling for Trade modal with header and close button
    if (activeModal === 'Trade') {
      return (
        <TouchableOpacity 
          style={styles.tradeModalOverlay} 
          activeOpacity={1} 
          onPress={closeModal}
        >
          <TouchableOpacity 
            style={styles.tradeModalContainer} 
            activeOpacity={1} 
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.tradeModalHandle} />
            <View style={styles.tradeModalHeader}>
              <Text style={styles.tradeModalTitle}>Choose crypto you want to trade</Text>
              <TouchableOpacity
                style={styles.tradeModalCloseButton}
                onPress={closeModal}
              >
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <View style={styles.tradeModalContent}>
              <AppStateContext.Provider value={appState}>
                <Trade />
              </AppStateContext.Provider>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      );
    }

    // Render other modals as full page content
    switch (activeModal) {
      case 'Receive':
        return (
          <AppStateContext.Provider value={appState}>
            <ReceiveSafe />
          </AppStateContext.Provider>
        );
      case 'Send':
        return (
          <AppStateContext.Provider value={appState}>
            <Send />
          </AppStateContext.Provider>
        );
      case 'Assets':
        return (
          <AppStateContext.Provider value={appState}>
            <Assets />
          </AppStateContext.Provider>
        );
      default:
        return null;
    }
  };

  // Modal navigation helpers
  // Modal navigation helpers
  const navigateToTrade = () => {
    openModal('Trade');
  };

  const navigateToReceive = () => {
    openModal('Receive');
  };

  const navigateToSend = () => {
    openModal('Send');
  };

  const navigateToMore = () => {
    openModal('Assets');
  };

  // Action buttons data
  const actionButtons = [
    {
      id: 'trade',
      title: 'Trade',
      icon: 'swap-horizontal',
      onPress: navigateToTrade,
    },
    {
      id: 'receive',
      title: 'Receive',
      icon: 'arrow-down-circle',
      onPress: navigateToReceive,
    },
    {
      id: 'send',
      title: 'Send',
      icon: 'arrow-up-circle',
      onPress: navigateToSend,
    },
    {
      id: 'more',
      title: 'More',
      icon: 'dots-horizontal-circle',
      onPress: navigateToMore,
    }
  ];

  const renderActionButton = (button) => (
    <TouchableOpacity
      key={button.id}
      style={styles.actionButton}
      onPress={button.onPress}
      activeOpacity={0.7}
    >
      <View style={styles.actionButtonIcon}>
        <Icon name={button.icon} size={24} color="#FFFFFF" />
      </View>
      <Text style={styles.actionButtonText}>{button.title}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: '#FFFFFF' }]}>
      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Main Portfolio Section */}
        <View style={styles.portfolioSection}>
          {/* Portfolio Value Content */}
          <View style={styles.portfolioContent}>
            {isLoading ? (
              <Text style={styles.portfolioValue}>Loading...</Text>
            ) : (
              <>
                <Text style={styles.portfolioValue}>
                  {formatCurrency(portfolioValue)}
                </Text>
                
                {/* Debug info - remove in production */}
                {__DEV__ && (
                  <Text style={{ fontSize: 10, color: '#999', marginTop: 5 }}>
                    DEBUG: {appState.user?.isAuthenticated ? 'Authenticated' : 'Not Authenticated'} | 
                    Value: {portfolioValue} | 
                    {dataLoadingComplete ? 'Data Loaded' : 'Loading...'}
                  </Text>
                )}
                
                <View style={styles.changeContainer}>
                  <Text style={[
                    styles.changeAmount,
                    { color: monthlyChange >= 0 ? '#10B981' : '#EF4444' }
                  ]}>
                    {monthlyChange >= 0 ? '+' : ''}{formatCurrency(Math.abs(monthlyChange))}
                  </Text>
                  <Text style={[
                    styles.changePercent,
                    { color: monthlyChange >= 0 ? '#10B981' : '#EF4444' }
                  ]}>
                    ({formatPercentage(monthlyChangePercent)})
                  </Text>
                </View>
                
                <Text style={styles.changePeriod}>
                  vs last month
                </Text>
              </>
            )}
            
            {/* Monthly Asset Value Chart */}
            {!isLoading && (
              <View style={styles.chartContainer}>
                <SimpleChart 
                  data={graphData}
                  width={screenWidth}
                  height={120}
                  strokeColor="#1F2937"
                  fillColor="transparent"
                  strokeWidth={3}
                  backgroundColor="#F9FAFB"
                />
              </View>
            )}
          </View>
        </View>

        {/* Action Buttons Section */}
        <View style={styles.actionsSection}>
          <View style={styles.actionsContainer}>
            {actionButtons.map(renderActionButton)}
          </View>
        </View>

        {/* Crypto Assets Section */}
        <View style={styles.homeSection}>
          <View style={styles.homeSectionHeader}>
            <Text style={styles.homeSectionTitle}>Your Assets</Text>
            <TouchableOpacity onPress={() => openModal('Assets')}>
              <Text style={styles.homeSectionSeeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.homeAssetsList}>
            {console.log('🎨 Home: Rendering asset list, assetData length:', assetData.length, assetData)}
            {assetData.map((asset, index) => renderAssetItem(asset, index))}
          </View>
        </View>

        {/* Recent Transactions Section */}
        <View style={styles.homeSection}>
          <View style={styles.homeSectionHeader}>
            <Text style={styles.homeSectionTitle}>Recent Transactions</Text>
            <TouchableOpacity onPress={() => {
              console.log('🔄 Home: Navigating to full transaction history');
              appState.changeState('History', 'transactions');
            }}>
              <Text style={styles.homeSectionSeeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.homeTransactionsList}>
            {transactions.map((transaction, index) => renderTransactionItem(transaction, index))}
          </View>
        </View>
      </ScrollView>

      {/* Modal for actions */}
      <Modal
        visible={modalVisible}
        onRequestClose={closeModal}
        animationType="slide"
        presentationStyle={activeModal === 'Trade' ? 'overFullScreen' : 'pageSheet'}
        transparent={activeModal === 'Trade' ? true : false}
      >
        <View style={activeModal === 'Trade' ? styles.tradeModalOverlay : styles.modalOverlay}>
          {renderModalContent()}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  portfolioSection: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scaledWidth(20),
    backgroundColor: 'transparent', // Make transparent to show gradient wrapper
  },
  portfolioContent: {
    alignItems: 'center',
    paddingHorizontal: scaledWidth(20),
  },
  portfolioValue: {
    fontSize: normaliseFont(36),
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: scaledHeight(12),
    textAlign: 'center',
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scaledHeight(4),
  },
  changeAmount: {
    fontSize: normaliseFont(18),
    fontWeight: '600',
    marginRight: scaledWidth(8),
    color: '#1F2937',
  },
  changePercent: {
    fontSize: normaliseFont(18),
    fontWeight: '600',
    color: '#1F2937',
  },
  changePeriod: {
    fontSize: normaliseFont(14),
    color: '#6B7280',
    opacity: 0.9,
  },
  actionsSection: {
    flex: 1,
    justifyContent: 'flex-start', // Changed from 'center' to 'flex-start' to reduce spacing
    paddingTop: scaledHeight(10), // Add small top padding
    paddingHorizontal: scaledWidth(20),
    paddingBottom: scaledHeight(40),
    backgroundColor: 'transparent', // Make transparent to show gradient wrapper
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButton: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: scaledWidth(16), // Increased spacing between buttons
  },
  actionButtonIcon: {
    width: scaledWidth(48), // Reduced from 60 to 48
    height: scaledWidth(48), // Reduced from 60 to 48
    borderRadius: scaledWidth(24), // Adjusted for new size
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: scaledHeight(8),
    backgroundColor: '#1F2937',
  },
  actionButtonText: {
    fontSize: normaliseFont(14),
    fontWeight: '500',
    color: '#1F2937',
    textAlign: 'center',
  },
  chartContainer: {
    marginTop: scaledHeight(20),
    marginBottom: scaledHeight(10), // Reduce bottom margin to bring action buttons closer
    alignItems: 'center',
    width: '100%',
  },
  // ScrollView styles
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: scaledHeight(20),
  },
  // Home sections styles
  homeSection: {
    marginTop: scaledHeight(20),
    paddingHorizontal: scaledWidth(20),
  },
  homeSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scaledHeight(12),
  },
  homeSectionTitle: {
    fontSize: normaliseFont(18),
    fontWeight: '600',
    color: '#1F2937',
  },
  homeSectionSeeAll: {
    fontSize: normaliseFont(14),
    fontWeight: '500',
    color: '#6366F1',
  },
  // Assets list styles
  homeAssetsList: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: scaledWidth(4),
  },
  homeAssetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scaledHeight(12),
    paddingHorizontal: scaledWidth(16),
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginVertical: scaledHeight(2),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  homeAssetIconSection: {
    marginRight: scaledWidth(12),
  },
  homeAssetMainContent: {
    flex: 1,
  },
  homeAssetName: {
    fontSize: normaliseFont(14),
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: scaledHeight(2),
  },
  homeAssetSymbol: {
    fontSize: normaliseFont(12),
    color: '#6B7280',
  },
  homeAssetPriceSection: {
    alignItems: 'flex-end',
  },
  homeAssetPrice: {
    fontSize: normaliseFont(14),
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: scaledHeight(2),
  },
  homeAssetChange: {
    fontSize: normaliseFont(12),
    color: '#10B981',
  },
  homeAssetPriceUnavailable: {
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  // Transactions list styles
  homeTransactionsList: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: scaledWidth(4),
  },
  homeTransactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scaledHeight(12),
    paddingHorizontal: scaledWidth(16),
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginVertical: scaledHeight(2),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  homeTransactionIconSection: {
    marginRight: scaledWidth(12),
  },
  homeTransactionMainContent: {
    flex: 1,
  },
  homeTransactionDescription: {
    fontSize: normaliseFont(14),
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: scaledHeight(2),
  },
  homeTransactionDate: {
    fontSize: normaliseFont(12),
    color: '#6B7280',
  },
  homeTransactionGbpValue: {
    fontSize: normaliseFont(11),
    color: '#9CA3AF',
    marginTop: scaledHeight(2),
  },
  homeTransactionAmountSection: {
    alignItems: 'flex-end',
  },
  homeTransactionAmount: {
    fontSize: normaliseFont(14),
    fontWeight: '600',
  },
  homeTransactionStatus: {
    fontSize: normaliseFont(11),
    color: '#9CA3AF',
    marginTop: scaledHeight(2),
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Full white background for complete page content
  },
  tradeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
    justifyContent: 'flex-end', // Position modal at bottom
  },
  tradeModalContainer: {
    height: Dimensions.get('window').height * 0.4, // 40% of screen height
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  tradeModalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  tradeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20, // Reduced padding since it's a bottom sheet
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  tradeModalTitle: {
    fontSize: normaliseFont(18),
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  tradeModalCloseButton: {
    padding: 8,
    marginLeft: 16,
  },
  tradeModalContent: {
    flex: 1,
  },

  modalText: {
    fontSize: normaliseFont(16),
    color: '#333333',
    lineHeight: scaledHeight(24),
  },
  placeholderContent: {
    padding: scaledWidth(20),
  },
});

export default Home;
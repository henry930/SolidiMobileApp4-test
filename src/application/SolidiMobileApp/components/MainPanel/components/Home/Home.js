import React, { useContext, useEffect, useState } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions,
  Modal,
  ScrollView
} from 'react-native';
import { Text, useTheme, Card, List } from 'react-native-paper';
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
import HistoryDataModel from '../History/HistoryDataModel';

// Import for asset data
import { getAssetInfo } from '../Assets/AssetDataModel';

// Import shared components
import BalanceListItem from '../shared/BalanceListItem';
import TransactionListItem from '../shared/TransactionListItem';
import DateSectionHeader from '../shared/DateSectionHeader';
import { groupByDate, formatDateHeader } from '../shared/TransactionHelpers';

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
  
  // State for graph interaction
  const [selectedGraphPoint, setSelectedGraphPoint] = useState(null);
  const [originalPortfolioValue, setOriginalPortfolioValue] = useState(0);
  const [originalMonthlyChange, setOriginalMonthlyChange] = useState(0);
  const [originalMonthlyChangePercent, setOriginalMonthlyChangePercent] = useState(0);
  
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

      // Define assets array BEFORE try block so it's accessible in STEP 7
      const assets = [
        { asset: 'BTC', name: 'Bitcoin' },
        { asset: 'ETH', name: 'Ethereum' },
        { asset: 'LTC', name: 'Litecoin' },
        { asset: 'XRP', name: 'Ripple' },
        { asset: 'BCH', name: 'Bitcoin Cash' }
      ];

      try {
        setIsLoading(true);
        setDataLoadingComplete(false);

        // STEP 1 & 3: Load balances and prices FAST using Wallet's approach!
        log('⏱️ STEP 1 & 3: Loading balances and crypto rates (Wallet method)...');
        const dataLoadStart = Date.now();
        
        // Load balances and update crypto rates in parallel (like Wallet does!)
        log(`   📡 Loading: Balances + CryptoRates (updateCryptoRates)`);
        const balanceStart = Date.now();
        const cryptoRatesStart = Date.now();
        
        await Promise.all([
          appState.loadBalances().then(() => {
            log(`   ⏱️ loadBalances() done in ${Date.now() - balanceStart}ms`);
          }),
          appState.updateCryptoRates().then(() => {
            log(`   ⏱️ updateCryptoRates() done in ${Date.now() - cryptoRatesStart}ms`);
          })
        ]);
        
        log(`   ⚡ Parallel load complete in ${Date.now() - dataLoadStart}ms`);
        log(`⏱️ STEP 1 & 3 COMPLETE: Data ready in ${Date.now() - dataLoadStart}ms`);

        // Set asset list
        setAssetData(assets);
        log('✅ STEP 2 COMPLETE: Assets set:', assets.length);

        // Build priceData using getCryptoSellPrice (INSTANT! No ticker parsing needed!)
        log('📊 STEP 3B: Building price data from cryptoRates cache...');
        const priceData = {};
        for (const asset of assets) {
          const price = appState.getCryptoSellPrice(asset.asset);
          if (price && price > 0) {
            priceData[`${asset.asset}/GBP`] = { price: price.toString() };
            log(`   ✅ ${asset.asset}/GBP: £${price.toFixed(2)} (from cryptoRates)`);
          } else {
            log(`   ⚠️ ${asset.asset}/GBP: No price available`);
          }
        }
        
        setPrices(priceData);
        log('✅ STEP 3B COMPLETE:', Object.keys(priceData).length, 'prices loaded from cache');

        // STEP 4: Calculate portfolio value
        console.log('📊 STEP 4: Calculating portfolio value...');
        console.log('   📊 Available priceData:', priceData);
        console.log('   📊 priceData keys:', Object.keys(priceData));
        let totalValue = 0;

        // Add GBP balance
        const gbpBalanceStr = appState.getBalance('GBP');
        console.log('   💷 GBP balance string:', gbpBalanceStr);
        if (gbpBalanceStr !== '[loading]') {
          const gbpBalance = parseFloat(gbpBalanceStr) || 0;
          totalValue += gbpBalance;
          console.log(`   💷 GBP: £${gbpBalance.toFixed(2)} (added to portfolio)`);
        }

        // Add crypto balances
        for (const asset of assets) {
          const balanceStr = appState.getBalance(asset.asset);
          console.log(`   🔍 ${asset.asset} balance string:`, balanceStr);
          
          if (balanceStr !== '[loading]' && balanceStr !== null && balanceStr !== undefined) {
            const balance = parseFloat(balanceStr) || 0;
            console.log(`   🔍 ${asset.asset} parsed balance:`, balance);
            
            if (balance > 0) {
              const marketKey = `${asset.asset}/GBP`;
              console.log(`   🔍 Looking for price in priceData['${marketKey}']:`, priceData[marketKey]);
              
              if (priceData[marketKey]) {
                let price = 0;
                
                // Check if price data has 'price' property (old format) or 'ask'/'bid' (new format)
                if (priceData[marketKey].price) {
                  price = parseFloat(priceData[marketKey].price) || 0;
                } else if (priceData[marketKey].ask && priceData[marketKey].bid) {
                  // Calculate mid-price from ask/bid
                  const ask = parseFloat(priceData[marketKey].ask) || 0;
                  const bid = parseFloat(priceData[marketKey].bid) || 0;
                  price = (ask + bid) / 2;
                  console.log(`   🔍 ${asset.asset} Ask: £${ask}, Bid: £${bid}, Mid-price: £${price}`);
                }
                
                if (price > 0) {
                  const value = balance * price;
                  totalValue += value;
                  console.log(`   ✅ ${asset.asset}: ${balance} × £${price.toFixed(2)} = £${value.toFixed(2)}`);
                } else {
                  console.log(`   ⚠️ Could not determine price for ${marketKey}`);
                }
              } else {
                console.log(`   ⚠️ No price data for ${marketKey}`);
              }
            } else {
              console.log(`   ⏭️ ${asset.asset} balance is zero, skipping`);
            }
          } else {
            console.log(`   ⏳ ${asset.asset} still loading, skipping`);
          }
        }

        console.log(`   💰 TOTAL PORTFOLIO VALUE: £${totalValue.toFixed(2)}`);

        // Remove the auto-demo data fallback - let it show actual value even if 0
        // if (totalValue === 0) {
        //   console.log('   ⚠️ Portfolio value is £0, using DEMO data...');
        //   totalValue = 15234.56;
        // }

        setPortfolioValue(totalValue);
        console.log('✅ STEP 4 COMPLETE: Portfolio value set to £' + totalValue.toFixed(2));

        // STEP 5: Load transactions
        console.log('📊 STEP 5: Loading recent transactions...');
        try {
          const transactionResponse = await appState.privateMethod({
            httpMethod: 'POST',
            apiRoute: 'transaction',
            functionName: 'Home.setup.transactions'
          });
          
          console.log('📥 Home: Transaction API response:', transactionResponse);
          
          if (transactionResponse && !transactionResponse.error) {
            // Use the same HistoryDataModel as History component
            const dataModel = new HistoryDataModel();
            const loadedTransactions = dataModel.loadTransactions(transactionResponse);
            
            console.log(`✅ Home: Loaded ${loadedTransactions.length} total transactions`);
            
            // Get the latest 5 transactions
            const recentTransactions = loadedTransactions.slice(0, 5);
            setTransactions(recentTransactions);
            
            console.log('✅ STEP 5 COMPLETE: Loaded', recentTransactions.length, 'recent transactions');
          } else {
            console.log('⚠️ No transactions found or error:', transactionResponse?.error);
            setTransactions([]);
          }
        } catch (error) {
          console.log('   ⚠️ Could not load transactions:', error.message);
          setTransactions([]);
        }

        // STEP 6: Generate graph data showing portfolio value over last 30 days
        console.log('[GRAPH] 📊 STEP 6: Generating portfolio value graph for last 30 days...');
        
        const graphPoints = [];
        
        // Get BTC balance
        const btcBalanceStr = appState.getBalance('BTC');
        const btcBalance = (btcBalanceStr !== '[loading]') ? parseFloat(btcBalanceStr) || 0 : 0;
        console.log('[GRAPH] 💰 BTC Balance:', btcBalance);
        
        // Get GBP balance (constant)
        const gbpBalanceStrForGraph = appState.getBalance('GBP');
        const gbpBalanceForGraph = (gbpBalanceStrForGraph !== '[loading]') ? parseFloat(gbpBalanceStrForGraph) || 0 : 0;
        console.log('[GRAPH] 💷 GBP Balance:', gbpBalanceForGraph);
        
        const btcMarketForGraph = 'BTC/GBP';
        
        // Load BTC historical prices
        try {
          console.log('[GRAPH] 📥 Loading BTC historical prices...');
          await appState.loadHistoricPrices({ market: btcMarketForGraph, period: '1M' });
          console.log('[GRAPH] ✅ BTC historical prices loaded');
        } catch (error) {
          console.log('[GRAPH] ❌ Error loading BTC prices:', error.message);
        }
        
        // Get BTC historical prices
        const btcHistoricPricesForGraph = appState.apiData?.historic_prices?.[btcMarketForGraph]?.['1M'];
        
        if (btcHistoricPricesForGraph && btcHistoricPricesForGraph.length >= 30) {
          console.log('[GRAPH] 📊 BTC historic prices available:', btcHistoricPricesForGraph.length, 'data points');
          
          // Generate graph point for each of the last 30 days
          for (let dayIndex = 0; dayIndex < 30; dayIndex++) {
            const daysAgo = 29 - dayIndex; // 29 days ago to today (0)
            
            // Get BTC price for this day
            const btcPriceOnDay = btcHistoricPricesForGraph[daysAgo];
            
            // Validate price is a valid number
            if (btcPriceOnDay !== undefined && !isNaN(btcPriceOnDay) && isFinite(btcPriceOnDay) && btcPriceOnDay > 0) {
              const timestamp = Date.now() / 1000 - (daysAgo * 24 * 60 * 60);
              
              // Calculate portfolio value = GBP + (BTC balance × BTC price)
              const portfolioValueOnDay = gbpBalanceForGraph + (btcBalance * btcPriceOnDay);
              
              console.log(`[GRAPH] 🔍 Day ${daysAgo}: BTC price = £${btcPriceOnDay.toFixed(2)}, BTC value = £${(btcBalance * btcPriceOnDay).toFixed(2)}, GBP = £${gbpBalanceForGraph.toFixed(2)}, Total = £${portfolioValueOnDay.toFixed(2)}`);
              
              graphPoints.push({
                timestamp: Number(timestamp),
                value: Number(portfolioValueOnDay)
              });
              
              if (dayIndex % 10 === 0) {
                console.log(`[GRAPH] Day ${daysAgo}: BTC price = £${btcPriceOnDay.toFixed(2)}, Portfolio value = £${portfolioValueOnDay.toFixed(2)}`);
              }
            } else {
              console.log(`[GRAPH] ⚠️ Invalid BTC price for day ${daysAgo}:`, btcPriceOnDay);
            }
          }
        } else {
          console.log('[GRAPH] ⚠️ Not enough BTC historical data. Available:', btcHistoricPricesForGraph?.length || 0);
          console.log('[GRAPH]    btcHistoricPricesForGraph value:', btcHistoricPricesForGraph);
          console.log('[GRAPH]    Creating fallback using current prices...');
          
          // Fallback: use current price for all days if no historical data
          const currentPriceData = priceData[btcMarketForGraph];
          console.log('[GRAPH]    currentPriceData for', btcMarketForGraph, ':', currentPriceData);
          
          if (currentPriceData && currentPriceData.price) {
            const currentPrice = parseFloat(currentPriceData.price);
            const currentPortfolioValue = gbpBalanceForGraph + (btcBalance * currentPrice);
            
            console.log('[GRAPH] 📊 Fallback using current price: BTC=£', currentPrice.toFixed(2), ', Portfolio=£', currentPortfolioValue.toFixed(2));
            
            for (let dayIndex = 0; dayIndex < 30; dayIndex++) {
              const daysAgo = 29 - dayIndex;
              const timestamp = Date.now() / 1000 - (daysAgo * 24 * 60 * 60);
              
              graphPoints.push({
                timestamp: Number(timestamp),
                value: Number(currentPortfolioValue)
              });
            }
            console.log('[GRAPH] ✅ Created', graphPoints.length, 'points using current price');
          } else {
            console.log('[GRAPH] ⚠️ No current price data available either. Using totalValue as flat line.');
            // Last resort: create flat line with current total value
            for (let dayIndex = 0; dayIndex < 30; dayIndex++) {
              const daysAgo = 29 - dayIndex;
              const timestamp = Date.now() / 1000 - (daysAgo * 24 * 60 * 60);
              
              graphPoints.push({
                timestamp: Number(timestamp),
                value: Number(totalValue > 0 ? totalValue : 1000)
              });
            }
            console.log('[GRAPH] ✅ Created', graphPoints.length, 'points showing £', (totalValue > 0 ? totalValue : 1000).toFixed(2));
          }
        }
                value: Number(currentPortfolioValue)
              });
            }
          }
        }
        
        console.log('[GRAPH] 📋 Generated', graphPoints.length, 'portfolio value points');
        if (graphPoints.length > 0) {
          console.log('[GRAPH] 📋 First point (30 days ago):', JSON.stringify(graphPoints[0]));
          console.log('[GRAPH] 📋 Last point (today):', JSON.stringify(graphPoints[graphPoints.length - 1]));
          console.log('[GRAPH] 📊 Portfolio value range: £', Math.min(...graphPoints.map(p => p.value)).toFixed(2), 
                      '→ £', Math.max(...graphPoints.map(p => p.value)).toFixed(2));
        } else {
          console.log('[GRAPH] ⚠️ NO GRAPH POINTS GENERATED! Creating fallback flat line...');
          // Create a simple flat line showing current portfolio value
          for (let i = 0; i < 30; i++) {
            const daysAgo = 29 - i;
            const timestamp = Date.now() / 1000 - (daysAgo * 24 * 60 * 60);
            graphPoints.push({
              timestamp: Number(timestamp),
              value: Number(totalValue > 0 ? totalValue : 1000) // Use current value or minimum 1000
            });
          }
          console.log('[GRAPH] 📊 Created fallback graph with', graphPoints.length, 'points showing £', (totalValue > 0 ? totalValue : 1000).toFixed(2));
        }
        
        setGraphData(graphPoints);
        console.log('[GRAPH] ✅ STEP 6 COMPLETE: Generated', graphPoints.length, 'graph points');

        // STEP 7: Calculate monthly change using historical prices
        console.log('[HIST_PRICE]');
        console.log('[HIST_PRICE] ========================================');
        console.log('[HIST_PRICE] 📊 STEP 7: CALCULATING MONTHLY CHANGE');
        console.log('[HIST_PRICE] ========================================');
        console.log('[HIST_PRICE] Current total value:', totalValue);
        console.log('[HIST_PRICE] Price data available:', Object.keys(priceData || {}).length, 'markets');
        console.log('[HIST_PRICE] Assets array length:', assets?.length || 0);
        console.log('[HIST_PRICE] Assets array:', assets);
        console.log('[HIST_PRICE]');
        
        let portfolioValue30DaysAgo = 0;
        
        // Add GBP balance (no change for fiat)
        const gbpBalanceFor30Days = appState.getBalance('GBP');
        if (gbpBalanceFor30Days !== '[loading]') {
          const gbpBalance30Days = parseFloat(gbpBalanceFor30Days) || 0;
          portfolioValue30DaysAgo += gbpBalance30Days;
          console.log('[HIST_PRICE] 💷 GBP balance (30 days ago = now):', gbpBalance30Days);
        }
        
        // Calculate crypto values from 30 days ago
        for (const asset of assets) {
          const balanceStr = appState.getBalance(asset.asset);
          console.log(`[HIST_PRICE] 🔎 Checking ${asset.asset} - balance string:`, balanceStr);
          
          if (balanceStr !== '[loading]') {
            const balance = parseFloat(balanceStr) || 0;
            console.log(`[HIST_PRICE] 🔎 ${asset.asset} parsed balance:`, balance);
            
            if (balance > 0) {
              try {
                const market = `${asset.asset}/GBP`;
                console.log('[HIST_PRICE]');
                console.log(`[HIST_PRICE] 🔍 ===== LOADING HISTORICAL PRICES FOR ${market} =====`);
                console.log(`[HIST_PRICE]    Balance: ${balance} ${asset.asset}`);
                console.log(`[HIST_PRICE]    appState.loadHistoricPrices exists:`, typeof appState.loadHistoricPrices);
                
                // Load 1 month historical prices from Solidi API
                console.log(`[HIST_PRICE]    📞 Calling appState.loadHistoricPrices({ market: "${market}", period: "1M" })`);
                
                try {
                  await appState.loadHistoricPrices({ market, period: '1M' });
                  console.log(`[HIST_PRICE]    ✅ loadHistoricPrices call completed`);
                  // Small delay to ensure state update propagates
                  await new Promise(resolve => setTimeout(resolve, 100));
                } catch (loadError) {
                  console.log(`[HIST_PRICE]    ❌ Error calling loadHistoricPrices:`, loadError.message);
                  console.log(`[HIST_PRICE]    ❌ Error stack:`, loadError.stack);
                }
                
                // Check what's in the state immediately after
                console.log(`[HIST_PRICE]    🔎 Checking appState.apiData.historic_prices...`);
                console.log(`[HIST_PRICE]    - apiData exists:`, !!appState.apiData);
                console.log(`[HIST_PRICE]    - historic_prices exists:`, !!appState.apiData?.historic_prices);
                console.log(`   - historic_prices keys:`, Object.keys(appState.apiData?.historic_prices || {}));
                console.log(`   - market "${market}" exists:`, !!appState.apiData?.historic_prices?.[market]);
                if (appState.apiData?.historic_prices?.[market]) {
                  console.log(`   - periods available:`, Object.keys(appState.apiData.historic_prices[market]));
                }
                
                // Get the historic prices from appState
                const historicPrices = appState.apiData?.historic_prices?.[market]?.['1M'];
                
                console.log(`   � Retrieved historic prices from state:`, {
                  exists: !!historicPrices,
                  length: historicPrices?.length,
                  firstPrice: historicPrices?.[0],
                  lastPrice: historicPrices?.[historicPrices?.length - 1]
                });
                
                if (historicPrices && historicPrices.length > 0) {
                  // Get the first price (30 days ago)
                  const price30DaysAgo = historicPrices[0];
                  const value30DaysAgo = balance * price30DaysAgo;
                  portfolioValue30DaysAgo += value30DaysAgo;
                  
                  // Get current price for comparison
                  const currentPrice = priceData[market] ? parseFloat(priceData[market].price) : 0;
                  
                  console.log(`💰 ${asset.asset}:`);
                  console.log(`   - Balance: ${balance}`);
                  console.log(`   - Price 30 days ago: £${price30DaysAgo}`);
                  console.log(`   - Price now: £${currentPrice}`);
                  console.log(`   - Value 30 days ago: £${value30DaysAgo.toFixed(2)}`);
                  console.log(`   - Value now: £${(balance * currentPrice).toFixed(2)}`);
                } else {
                  console.log(`⚠️ No historical data for ${market}`);
                }
              } catch (error) {
                console.log(`[HIST_PRICE] ❌ Error getting historical price for ${asset.asset}:`, error);
              }
            }
          }
        }
        
        // Calculate current portfolio value (GBP + crypto at current prices)
        let portfolioValueNow = 0;
        
        // Add GBP balance
        const gbpBalanceNow = appState.getBalance('GBP');
        if (gbpBalanceNow !== '[loading]') {
          portfolioValueNow += parseFloat(gbpBalanceNow) || 0;
        }
        
        // Add current crypto values
        for (const asset of assets) {
          if (asset.group === 'Crypto') {
            const balanceStr = appState.getBalance(asset.asset);
            if (balanceStr !== '[loading]') {
              const balance = parseFloat(balanceStr) || 0;
              if (balance > 0) {
                const market = `${asset.asset}/GBP`;
                const currentPrice = priceData[market] ? parseFloat(priceData[market].price) : 0;
                portfolioValueNow += balance * currentPrice;
                
                console.log(`[PORTFOLIO] 💰 ${asset.asset}: ${balance} × £${currentPrice.toFixed(2)} = £${(balance * currentPrice).toFixed(2)}`);
              }
            }
          }
        }
        
        // STEP 7: Calculate portfolio change using ALL assets (not just BTC)
        console.log('[HIST_PRICE] 📊 STEP 7: Calculating portfolio change over 30 days (all assets)');
        console.log('[HIST_PRICE] 📈 Portfolio 30 days ago: £', portfolioValue30DaysAgo.toFixed(2));
        console.log('[HIST_PRICE] 📈 Portfolio now: £', portfolioValueNow.toFixed(2));
        
        if (portfolioValue30DaysAgo > 0 && portfolioValueNow > 0) {
          const portfolioChange = portfolioValueNow - portfolioValue30DaysAgo;
          const portfolioChangePercent = (portfolioChange / portfolioValue30DaysAgo) * 100;
          
          console.log('[HIST_PRICE] 💰 Portfolio value change: £', portfolioChange.toFixed(2));
          console.log('[HIST_PRICE] 📊 Portfolio change %:', portfolioChangePercent.toFixed(2), '%');
          console.log('[HIST_PRICE] ✅ Setting monthlyChange =', portfolioChange);
          console.log('[HIST_PRICE] ✅ Setting monthlyChangePercent =', portfolioChangePercent);
          
          setMonthlyChange(portfolioChange);
          setMonthlyChangePercent(portfolioChangePercent);
        } else {
          console.log('[HIST_PRICE] ⚠️ Invalid portfolio values - 30 days ago:', portfolioValue30DaysAgo, 'now:', portfolioValueNow);
          setMonthlyChange(0);
          setMonthlyChangePercent(0);
        }
        
        console.log('[HIST_PRICE] ✅ STEP 7 COMPLETE: Monthly change calculated');

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
        await appState.loadBalances();
        
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
        
        // Monthly change calculation completed in STEP 7 above - no need to call old function
        console.log('✅ Monthly change already calculated in STEP 7');
        console.log('✅ monthlyChange and monthlyChangePercent are set');
        
      } catch (error) {
        console.log('❌ Error calculating portfolio value:', error);
        setPortfolioValue(0);
        setIsLoading(false);
      }
    };

    // Always run calculation to update loading state
    calculatePortfolioValue();
  }, [prices, balancesLoaded, appState.user?.isAuthenticated]);

  // OLD - Monthly change calculation moved inline to loadAllDataSequentially
  /*
  const calculateMonthlyChange = async (currentValue) => {
    try {
      console.log('📊 Starting monthly change calculation...');
      console.log('📊 Current portfolio value:', currentValue);
      
      if (!appState.user?.isAuthenticated || currentValue === 0) {
        console.log('⚠️ Skipping monthly change - not ready (auth:', appState.user?.isAuthenticated, 'value:', currentValue, ')');
        setMonthlyChange(0);
        setMonthlyChangePercent(0);
        return;
      }
      
      // Calculate portfolio value from 30 days ago using Solidi historical prices
      let portfolioValue30DaysAgo = 0;
      const assets = ['BTC', 'ETH', 'LTC', 'XRP', 'BCH'];
      
      // Add GBP balance (no change for fiat)
      const gbpBalanceStr = appState.getBalance('GBP');
      if (gbpBalanceStr !== '[loading]') {
        const gbpBalance = parseFloat(gbpBalanceStr) || 0;
        portfolioValue30DaysAgo += gbpBalance;
        console.log('💷 GBP balance (30 days ago = now):', gbpBalance);
      }
      
      // Calculate crypto values from 30 days ago using 1M (1 month) historical data
      for (const asset of assets) {
        const balanceStr = appState.getBalance(asset);
        if (balanceStr !== '[loading]') {
          const balance = parseFloat(balanceStr) || 0;
          
          if (balance > 0) {
            try {
              const market = `${asset}/GBP`;
              console.log(`🔍 Loading historical prices for ${market}...`);
              
              // Load 1 month historical prices from Solidi API
              await appState.loadHistoricPrices({ market, period: '1M' });
              
              // Get the historic prices from appState
              const historicPrices = appState.state?.apiData?.historic_prices?.[market]?.['1M'];
              
              console.log(`📈 ${market} historic prices:`, historicPrices?.length, 'data points');
              
              if (historicPrices && historicPrices.length > 0) {
                // Get the first price (30 days ago)
                const price30DaysAgo = historicPrices[0];
                const value30DaysAgo = balance * price30DaysAgo;
                portfolioValue30DaysAgo += value30DaysAgo;
                
                // Get current price for comparison
                const currentPrice = prices[market] ? parseFloat(prices[market].price) : 0;
                
                console.log(`💰 ${asset}:`);
                console.log(`   - Balance: ${balance}`);
                console.log(`   - Price 30 days ago: £${price30DaysAgo}`);
                console.log(`   - Price now: £${currentPrice}`);
                console.log(`   - Value 30 days ago: £${value30DaysAgo.toFixed(2)}`);
                console.log(`   - Value now: £${(balance * currentPrice).toFixed(2)}`);
              } else {
                console.log(`⚠️ No historical data for ${market}`);
              }
            } catch (error) {
              console.log(`❌ Error getting historical price for ${asset}:`, error);
            }
          }
        }
      }
      
      console.log('📊 Portfolio value 30 days ago:', portfolioValue30DaysAgo);
      console.log('📊 Portfolio value now:', currentValue);
      
      // Calculate the change
      if (portfolioValue30DaysAgo > 0) {
        const change = currentValue - portfolioValue30DaysAgo;
        const changePercent = (change / portfolioValue30DaysAgo) * 100;
        
        console.log('📊 Monthly change:', change);
        console.log('📊 Monthly change %:', changePercent);
        
        setMonthlyChange(change);
        setMonthlyChangePercent(changePercent);
      } else {
        console.log('⚠️ No portfolio value 30 days ago');
        setMonthlyChange(0);
        setMonthlyChangePercent(0);
      }
      
    } catch (error) {
      console.log('❌ Error calculating monthly change:', error);
      setMonthlyChange(0);
      setMonthlyChangePercent(0);
    }
  };
  */

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
    
    // DISABLED: This was causing graph to regenerate with random data
    // Graph data is now set once during initial load (STEP 6)
    // if (portfolioValue > 0) {
    //   loadGraphData();
    // }
  }, [portfolioValue]);

  // Load prices once on mount - AppState handles background updates every 30 seconds
  useEffect(() => {
    if (assetData.length === 0) return;
    
    console.log('💰 Home: Loading prices from AppState cache (initial load)');
    
    // Initial load only - AppState background updates handle refreshes
    loadPricesForAssets(assetData);
    
    // No interval needed - AppState updates every 30 seconds globally
  }, [assetData]);

  // Live balance updates - refresh every 60 seconds when authenticated
  useEffect(() => {
    if (!appState.user?.isAuthenticated) return;
    
    console.log('⏰ Setting up live balance updates (60 second interval)');
    
    // Set up interval for live balance updates
    const balanceUpdateInterval = setInterval(async () => {
      console.log('🔄 Refreshing balances...');
      try {
        await appState.loadBalances();
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

  // Load prices from cached AppState (instant, no API calls!)
  const loadPricesForAssets = async (assets) => {
    try {
      console.log('💰 Home: Loading prices from cached AppState (instant)...');
      
      const newPrices = {};
      
      // Get price for each asset from AppState cache
      for (const assetItem of assets) {
        const asset = assetItem.asset;
        const market = `${asset}/GBP`;
        
        try {
          // Get SELL price from cache (instant, no API call!)
          const sellPrice = appState.getCryptoSellPrice(asset);
          
          if (sellPrice && sellPrice > 0) {
            newPrices[market] = {
              price: sellPrice,
              side: 'SELL',
              cached: true
            };
            console.log(`✅ Home: Cached SELL price for ${market}: £${sellPrice.toFixed(2)}`);
          } else {
            console.log(`⚠️ Home: No cached price for ${market} yet (background update pending)`);
          }
        } catch (assetError) {
          console.log(`❌ Home: Error getting cached price for ${asset}:`, assetError);
        }
      }
      
      console.log(`✅ Home: Loaded ${Object.keys(newPrices).length} cached prices out of ${assets.length} assets (instant!)`);
      setPrices(newPrices);
      
    } catch (error) {
      console.log('❌ Home: Error loading cached prices:', error);
      setPrices({});
    }
  };

  // Refresh prices from cache every time crypto prices update in background
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      // Check if we have assets to refresh
      if (assetData && assetData.length > 0) {
        console.log('🔄 Home: Refreshing prices from AppState cache (background update)');
        loadPricesForAssets(assetData);
      }
    }, 31000); // Refresh slightly after AppState updates (every 31 seconds)
    
    return () => clearInterval(refreshInterval);
  }, [assetData]);

  // REMOVED DUPLICATE - getAssetPrice is defined later (line ~1060)

  // REMOVED DUPLICATE - formatTo9Digits is defined later (line ~1051)

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

  // Get asset price helper (uses cached prices - instant!)
  const getAssetPrice = (asset) => {
    try {
      const marketKey = `${asset}/GBP`;
      
      // First try to get from loaded prices state
      if (prices[marketKey] && prices[marketKey].price) {
        const price = parseFloat(prices[marketKey].price);
        console.log(`💰 Price for ${asset} from state: £${price.toFixed(2)}`);
        return price;
      }
      
      // Fallback: get directly from AppState cache
      const cachedPrice = appState.getCryptoSellPrice(asset);
      if (cachedPrice && cachedPrice > 0) {
        console.log(`💰 Price for ${asset} from AppState cache: £${cachedPrice.toFixed(2)}`);
        return cachedPrice;
      }
      
      console.log(`⚠️ No price for ${asset} (background update pending)`);
      return null;
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

  // Import helper from shared utilities
  const { isCryptoCurrency } = require('../shared/BalanceListItem');

  // Get balance data (same as Wallet)
  const getBalanceData = () => {
    const balances = {};
    const allBalances = appState.apiData?.balance || {};
    
    Object.entries(allBalances).forEach(([currency, balance]) => {
      const balanceNum = parseFloat(balance);
      if (balanceNum > 0) {
        balances[currency] = {
          total: balanceNum,
          available: balanceNum,
          reserved: 0
        };
      }
    });
    
    return balances;
  };

  // Render transaction item - using same logic as History component but compact
  // renderTransactionItem moved to shared/TransactionListItem.js

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

  // Handle graph point selection
  const handleGraphPointSelected = (pointData) => {
    if (!pointData) {
      // Reset to current values (when user stops dragging)
      console.log('[GRAPH_TOUCH] 📊 Reset to current values');
      if (selectedGraphPoint !== null) {
        // Only reset if we were showing a selected point
        setPortfolioValue(originalPortfolioValue);
        setMonthlyChange(originalMonthlyChange);
        setMonthlyChangePercent(originalMonthlyChangePercent);
        console.log('[GRAPH_TOUCH] ✅ Restored values:', {
          portfolioValue: originalPortfolioValue,
          monthlyChange: originalMonthlyChange,
          monthlyChangePercent: originalMonthlyChangePercent
        });
      }
      setSelectedGraphPoint(null);
      return;
    }

    // Store original values if this is the first touch
    if (selectedGraphPoint === null) {
      setOriginalPortfolioValue(portfolioValue);
      setOriginalMonthlyChange(monthlyChange);
      setOriginalMonthlyChangePercent(monthlyChangePercent);
      console.log('[GRAPH_TOUCH] 💾 Stored original values:', {
        portfolioValue,
        monthlyChange,
        monthlyChangePercent
      });
    }

    console.log(`[GRAPH_TOUCH] 📊 Selected day ${pointData.daysAgo}: £${pointData.value.toFixed(2)}`);
    setSelectedGraphPoint(pointData);

    // Update displayed BTC price to the selected point
    setPortfolioValue(pointData.value);

    // Calculate change from 30 days ago to the selected point
    if (graphData && graphData.length > 0) {
      const priceAt30DaysAgo = graphData[0].value; // First point in graph (30 days ago)
      const selectedPrice = pointData.value;       // Selected point's BTC price
      const change = selectedPrice - priceAt30DaysAgo;
      const changePercent = (change / priceAt30DaysAgo) * 100;

      setMonthlyChange(change);
      setMonthlyChangePercent(changePercent);
      
      const daysAgoText = pointData.daysAgo === 0 ? 'today' : `${pointData.daysAgo} days ago`;
      console.log(`[GRAPH_TOUCH] 💰 Portfolio Value ${daysAgoText}: £${selectedPrice.toFixed(2)}`);
      console.log(`[GRAPH_TOUCH] 💰 Change from 30 days ago: £${change.toFixed(2)} (${changePercent.toFixed(2)}%)`);
    }
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
                <Trade inModal={true} />
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
    // Navigate to Transfer page with receive tab selected
    appState.changeState('Transfer', 'receive');
  };

  const navigateToSend = () => {
    // Navigate to Transfer page with send tab selected
    appState.changeState('Transfer', 'send');
  };

  const navigateToWallet = () => {
    appState.changeState('Wallet');
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
      id: 'send',
      title: 'Send',
      icon: 'arrow-up-circle',
      onPress: navigateToSend,
    },
    {
      id: 'receive',
      title: 'Receive',
      icon: 'arrow-down-circle',
      onPress: navigateToReceive,
    },
    {
      id: 'wallet',
      title: 'Wallet',
      icon: 'wallet',
      onPress: navigateToWallet,
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
      {/* DEBUG BANNER */}
      <View style={{ backgroundColor: '#1F2937', padding: 10, position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000 }}>
        <Text style={{ color: '#FFFFFF', fontSize: 10, fontFamily: 'monospace' }}>
          🐛 DEBUG: isLoading={isLoading ? 'TRUE' : 'FALSE'} | graphData={graphData?.length || 0} pts | auth={appState?.user?.isAuthenticated ? 'YES' : 'NO'}
        </Text>
      </View>
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
                {console.log('[UI_RENDER] 🖥️  monthlyChange:', monthlyChange, 'monthlyChangePercent:', monthlyChangePercent)}
                
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
            {console.log('📊 [CHART RENDER CHECK]', {
              isLoading,
              hasGraphData: !!graphData,
              graphDataLength: graphData?.length || 0,
              firstPoint: graphData?.[0],
              lastPoint: graphData?.[graphData.length - 1]
            })}
            {!isLoading && (
              <View style={[styles.chartContainer, { minHeight: 140, backgroundColor: '#E5E7EB', borderRadius: 12, paddingVertical: 10, borderWidth: 2, borderColor: '#3B82F6' }]}>
                <Text style={{ color: '#3B82F6', fontSize: 12, fontWeight: 'bold', textAlign: 'center', marginBottom: 5 }}>
                  CHART AREA (Loading: {isLoading ? 'YES' : 'NO'}, Data Points: {graphData?.length || 0})
                </Text>
                {graphData && graphData.length > 0 ? (
                  <SimpleChart 
                    data={graphData}
                    width={screenWidth - 40}
                    height={120}
                    strokeColor="#1F2937"
                    fillColor="transparent"
                    strokeWidth={3}
                    backgroundColor="#F9FAFB"
                    onPointSelected={handleGraphPointSelected}
                  />
                ) : (
                  <View style={{ height: 120, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FEF3C7', borderRadius: 8 }}>
                    <Text style={{ color: '#92400E', fontSize: 16, fontWeight: 'bold' }}>⚠️ No chart data available</Text>
                    <Text style={{ color: '#78350F', fontSize: 12, marginTop: 4 }}>Debug: isLoading={isLoading.toString()}, points={graphData?.length || 0}</Text>
                  </View>
                )}
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
            <TouchableOpacity onPress={() => {
              console.log('🔄 Home: Navigating to Assets page');
              appState.changeState('Assets', 'default');
            }}>
              <Text style={styles.homeSectionSeeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.homeAssetsList}>
            {Object.entries(getBalanceData())
              .filter(([currency]) => isCryptoCurrency(currency))
              .slice(0, 5)
              .map(([currency, balanceInfo]) => (
                <BalanceListItem
                  key={currency}
                  currency={currency}
                  balanceInfo={balanceInfo}
                  appState={appState}
                  theme={theme}
                  onPress={() => {
                    console.log(`Home: Tapped on ${currency}`);
                    openModal('Assets');
                  }}
                />
              ))}
            {Object.entries(getBalanceData()).filter(([currency]) => isCryptoCurrency(currency)).length === 0 && (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: '#6B7280', textAlign: 'center' }}>
                  No crypto assets to display
                </Text>
              </View>
            )}
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
            {groupByDate(transactions).map((group, groupIndex) => (
              <View key={`date-group-${groupIndex}`}>
                <DateSectionHeader date={formatDateHeader(group.date)} />
                {group.items.map((transaction, index) => (
                  <TransactionListItem
                    key={`transaction-${transaction.id || index}`}
                    transaction={transaction}
                    index={index}
                    compact={true}
                    onPress={() => {
                      console.log(`Home: Tapped on transaction ${transaction.id}`);
                      appState.changeState('History', 'transactions');
                    }}
                  />
                ))}
              </View>
            ))}
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
    fontSize: normaliseFont(28),
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
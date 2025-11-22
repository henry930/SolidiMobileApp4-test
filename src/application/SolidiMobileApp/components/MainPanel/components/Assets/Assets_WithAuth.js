import React, { useState, useContext, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import AppStateContext from 'src/application/data';

const Assets = () => {
  const currentTime = new Date().toLocaleTimeString();
  const appState = useContext(AppStateContext);
  
  // Check authentication first
  if (!appState) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#666' }}>Loading...</Text>
      </View>
    );
  }
  
  // Check if user is authenticated
  const isAuthenticated = appState.state?.user?.isAuthenticated;
  
  if (!isAuthenticated) {
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
            Please login to view your assets
          </Text>
        </View>
        
        <Text style={{ 
          fontSize: 16, 
          color: '#666',
          textAlign: 'center',
          marginBottom: 30,
          lineHeight: 24
        }}>
          You need to be logged in to access{'\n'}your portfolio and asset information.
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
            console.log('🔐 Redirecting to login page...');
            appState.setMainPanelState('Login');
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
        
        <Text style={{ 
          fontSize: 12, 
          color: '#999',
          textAlign: 'center',
          marginTop: 20
        }}>
          Don't have an account? Sign up in the Login page.
        </Text>
      </View>
    );
  }
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(currentTime);
  const [portfolioValue, setPortfolioValue] = useState('£11,159.00');
  const [portfolioChange, setPortfolioChange] = useState('+£234.56 (+2.15%)');
  
  // Demo price data as fallback
  const demoPrices = {
    'BTC': { price: 45000, change_24h: 2.45 },
    'ETH': { price: 2800, change_24h: 1.23 },
    'LTC': { price: 95, change_24h: -0.87 },
    'XRP': { price: 0.45, change_24h: 5.12 },
    'ADA': { price: 0.38, change_24h: -1.45 },
    'DOT': { price: 5.25, change_24h: 3.67 },
    'LINK': { price: 14.75, change_24h: 0.95 },
    'UNI': { price: 6.85, change_24h: -2.34 },
    'GBP': { price: 1.0, change_24h: 0.0 },
    'USD': { price: 0.82, change_24h: 0.12 },
    'EUR': { price: 0.95, change_24h: -0.05 },
  };
  
  // Fallback dummy asset data
  const fallbackData = [
    { asset: 'BTC', name: 'Bitcoin', balance: '0.05000000', value: '£2,250.00' },
    { asset: 'ETH', name: 'Ethereum', balance: '2.50000000', value: '£7,000.00' },
    { asset: 'GBP', name: 'British Pound', balance: '1000.00', value: '£1,000.00' },
    { asset: 'USD', name: 'US Dollar', balance: '500.00', value: '£410.00' },
    { asset: 'LTC', name: 'Litecoin', balance: '5.25000000', value: '£499.00' },
  ];
  
  // Asset data state - start with fallback
  const [assetData, setAssetData] = useState(fallbackData);
  
  // Function to get current price for an asset
  const getCurrentPrice = (asset) => {
    try {
      // Try to get live price from ticker
      if (appState) {
        const ticker = appState.getTicker();
        const market = `${asset}/GBP`;
        if (ticker && ticker[market] && ticker[market].price) {
          return {
            price: parseFloat(ticker[market].price),
            change_24h: ticker[market].change_24h || 0
          };
        }
      }
      
      // Fall back to demo prices
      return demoPrices[asset] || { price: 0, change_24h: 0 };
    } catch (error) {
      console.log(`Error getting price for ${asset}:`, error);
      return demoPrices[asset] || { price: 0, change_24h: 0 };
    }
  };
  
  // Function to calculate portfolio values
  const calculatePortfolioValue = (assets) => {
    try {
      let totalValue = 0;
      let totalChange = 0;
      let hasRealPrices = false;
      
      const updatedAssets = assets.map(asset => {
        const priceData = getCurrentPrice(asset.asset);
        const balance = parseFloat(asset.balance) || 0;
        const value = balance * priceData.price;
        
        totalValue += value;
        totalChange += value * (priceData.change_24h / 100);
        
        // Check if we have real price data
        if (appState) {
          const ticker = appState.getTicker();
          const market = `${asset.asset}/GBP`;
          if (ticker && ticker[market] && ticker[market].price) {
            hasRealPrices = true;
          }
        }
        
        return {
          ...asset,
          value: `£${value.toFixed(2)}`,
          change_24h: priceData.change_24h,
          pricePerUnit: `£${priceData.price.toFixed(priceData.price < 1 ? 4 : 2)}`
        };
      });
      
      const changePercent = totalValue > 0 ? (totalChange / totalValue) * 100 : 0;
      const changeSign = totalChange >= 0 ? '+' : '';
      
      setPortfolioValue(`£${totalValue.toFixed(2)}`);
      setPortfolioChange(`${changeSign}£${Math.abs(totalChange).toFixed(2)} (${changeSign}${changePercent.toFixed(2)}%) ${hasRealPrices ? '' : 'demo'}`);
      
      return updatedAssets;
    } catch (error) {
      console.log('Error calculating portfolio value:', error);
      return assets;
    }
  };
  
  // Function to get asset name
  const getAssetName = (asset) => {
    const names = {
      'BTC': 'Bitcoin',
      'ETH': 'Ethereum', 
      'LTC': 'Litecoin',
      'XRP': 'Ripple',
      'ADA': 'Cardano',
      'DOT': 'Polkadot',
      'LINK': 'Chainlink',
      'UNI': 'Uniswap',
      'GBP': 'British Pound',
      'USD': 'US Dollar',
      'EUR': 'Euro'
    };
    return names[asset] || asset;
  };
  
  // Function to load real data
  const loadRealData = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Loading real asset data...');
      
      // Safety check for appState
      if (!appState) {
        console.log('⚠️ AppState not available, keeping fallback data');
        return;
      }
      
      // Try to load balances and ticker data
      await appState.generalSetup({caller: 'Assets'});
      
      // Load balances and ticker in parallel
      const [balanceResult, tickerResult] = await Promise.allSettled([
        appState.loadBalances(),
        appState.loadTickerWithCoinGecko()
      ]);
      
      console.log('📊 Balance result:', balanceResult.status);
      console.log('📈 Ticker result:', tickerResult.status);
      
      // Get balance data
      let realBalances = {};
      // Use balance API to get actual asset list instead of hardcoded
      const assetList = appState.getAvailableAssets && appState.getAvailableAssets().length > 0 
        ? appState.getAvailableAssets() 
        : ['BTC', 'ETH', 'LTC', 'XRP', 'GBP', 'USD', 'EUR'];
      
      console.log('📋 Using asset list from balance API:', assetList);
      
      // Check if we have API balance data
      if (appState.state && appState.state.apiData && appState.state.apiData.balance) {
        realBalances = appState.state.apiData.balance;
        console.log('📊 Got API balance data:', Object.keys(realBalances));
      } else {
        // Try individual balance calls
        assetList.forEach(asset => {
          const balance = appState.getBalance(asset);
          if (balance && balance !== '[loading]' && balance !== '0.00000000') {
            realBalances[asset] = balance;
          }
        });
        console.log('📊 Got individual balances:', Object.keys(realBalances));
      }
      
      // Convert to display format if we have real data
      if (Object.keys(realBalances).length > 0) {
        const realAssetData = Object.keys(realBalances)
          .filter(asset => realBalances[asset] && realBalances[asset] !== '[loading]')
          .map(asset => ({
            asset: asset,
            name: getAssetName(asset),
            balance: realBalances[asset],
            value: '£0.00' // Will be calculated below
          }));
          
        if (realAssetData.length > 0) {
          // Calculate portfolio values with real price data
          const assetsWithValues = calculatePortfolioValue(realAssetData);
          setAssetData(assetsWithValues);
          console.log('✅ Updated with real data:', assetsWithValues.length, 'assets');
        } else {
          console.log('⚠️ No valid real data, keeping fallback');
          // Still calculate values for fallback data
          const fallbackWithValues = calculatePortfolioValue(fallbackData);
          setAssetData(fallbackWithValues);
        }
      } else {
        console.log('⚠️ No balance data found, keeping fallback');
        // Calculate values for fallback data
        const fallbackWithValues = calculatePortfolioValue(fallbackData);
        setAssetData(fallbackWithValues);
      }
      
      setLastUpdated(new Date().toLocaleTimeString());
      
    } catch (error) {
      console.log('❌ Error loading real data:', error);
      // Keep fallback data on error but still calculate values
      const fallbackWithValues = calculatePortfolioValue(fallbackData);
      setAssetData(fallbackWithValues);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load data on component mount
  useEffect(() => {
    // Calculate initial portfolio values with fallback data
    const initialData = calculatePortfolioValue(fallbackData);
    setAssetData(initialData);
    
    // Then try to load real data
    loadRealData();
  }, []);

  // Simple asset item component
  const AssetItem = ({ asset }) => (
    <View style={{
      backgroundColor: '#ffffff',
      padding: 16,
      marginVertical: 4,
      marginHorizontal: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#e0e0e0',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    }}>
      {/* Asset Icon */}
      <View style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12
      }}>
        <Text style={{
          fontSize: 14,
          fontWeight: '600',
          color: '#333'
        }}>
          {asset.asset.substring(0, 2)}
        </Text>
      </View>
      
      {/* Asset Info */}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: '#000' }}>
          {asset.asset}
        </Text>
        <Text style={{ fontSize: 14, color: '#666', marginTop: 2 }}>
          {asset.name}
        </Text>
        <Text style={{ fontSize: 12, color: '#999', marginTop: 1 }}>
          {asset.balance} {asset.pricePerUnit ? `@ ${asset.pricePerUnit}` : ''}
        </Text>
      </View>
      
      {/* Value and Change */}
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: '#000' }}>
          {asset.value}
        </Text>
        {asset.change_24h !== undefined && (
          <Text style={{ 
            fontSize: 12, 
            color: asset.change_24h >= 0 ? '#4CAF50' : '#f44336',
            marginTop: 2 
          }}>
            {asset.change_24h >= 0 ? '+' : ''}{asset.change_24h.toFixed(2)}%
          </Text>
        )}
      </View>
    </View>
  );
  
  return (
    <View style={{ 
      flex: 1, 
      backgroundColor: '#f5f5f5'
    }}>
      {/* Header */}
      <View style={{
        backgroundColor: '#007AFF',
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 20
      }}>
        <Text style={{ 
          fontSize: 28, 
          fontWeight: 'bold', 
          color: 'white',
          textAlign: 'center'
        }}>
          Assets
        </Text>
        <Text style={{ 
          fontSize: 14, 
          color: 'rgba(255,255,255,0.8)',
          textAlign: 'center',
          marginTop: 5
        }}>
          {isLoading ? 'Loading...' : `Updated: ${lastUpdated}`}
        </Text>
      </View>

      {/* Portfolio Summary */}
      <View style={{
        backgroundColor: '#ffffff',
        padding: 20,
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}>
        <Text style={{ 
          fontSize: 16, 
          color: '#666',
          textAlign: 'center',
          marginBottom: 8
        }}>
          Total Portfolio Value
        </Text>
        <Text style={{ 
          fontSize: 32, 
          fontWeight: 'bold', 
          color: '#000',
          textAlign: 'center'
        }}>
          {portfolioValue}
        </Text>
        <Text style={{ 
          fontSize: 14, 
          color: portfolioChange.includes('+') ? '#4CAF50' : '#f44336',
          textAlign: 'center',
          marginTop: 5
        }}>
          {portfolioChange}
        </Text>
      </View>

      {/* Assets List */}
      <ScrollView 
        style={{ flex: 1, marginTop: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{
          fontSize: 18,
          fontWeight: '600',
          color: '#000',
          marginHorizontal: 16,
          marginBottom: 8
        }}>
          Your Assets
        </Text>
        
        <Text style={{
          fontSize: 12,
          color: '#666',
          marginHorizontal: 16,
          marginBottom: 12
        }}>
          {assetData === fallbackData ? 
            '📋 Showing demo data (API not connected)' : 
            '🔗 Showing real balance data'
          }
        </Text>
        
        {assetData.map((asset, index) => (
          <AssetItem key={asset.asset + index} asset={asset} />
        ))}
        
        {/* Test Button */}
        <TouchableOpacity 
          style={{
            backgroundColor: isLoading ? '#999' : '#007AFF',
            paddingHorizontal: 20,
            paddingVertical: 15,
            borderRadius: 8,
            marginHorizontal: 16,
            marginTop: 20,
            marginBottom: 30
          }}
          onPress={loadRealData}
          disabled={isLoading}
        >
          <Text style={{ color: 'white', fontWeight: 'bold', textAlign: 'center', fontSize: 16 }}>
            {isLoading ? 'Loading...' : 'Refresh Assets'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default Assets;
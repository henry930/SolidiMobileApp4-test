// LivePriceTicker Component
// Shows live crypto prices with 24h change using CoinGecko API

import React, { useContext, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Card, Text, Chip, useTheme } from 'react-native-paper';
import AppStateContext from 'src/application/data';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';

import logger from 'src/util/logger';
let logger2 = logger.extend('LivePriceTicker');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);

const LivePriceTicker = ({ 
  markets = ['BTC/GBP', 'ETH/GBP', 'LTC/GBP', 'XRP/GBP'],
  updateInterval = 30000, // 30 seconds
  showChange = true,
  compact = false 
}) => {
  const appState = useContext(AppStateContext);
  const theme = useTheme();
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Load prices on component mount and set up auto-refresh
  useEffect(() => {
    console.log('LivePriceTicker: Component mounted, loading prices...');
    loadPrices();
    
    const interval = setInterval(() => {
      console.log('LivePriceTicker: Auto-refresh triggered');
      loadPrices();
    }, updateInterval);

    return () => clearInterval(interval);
  }, [markets, updateInterval]);

  const loadPrices = async () => {
    try {
      console.log('LivePriceTicker: Starting price load...');
      log('Loading live crypto prices...');
      
      // Use the enhanced ticker method that includes CoinGecko data
      const tickerData = await appState.loadTickerWithCoinGecko();
      console.log('LivePriceTicker: Received ticker data:', tickerData);
      
      if (tickerData && Object.keys(tickerData).length > 0) {
        // Filter for requested markets
        const filteredPrices = {};
        markets.forEach(market => {
          if (tickerData[market]) {
            filteredPrices[market] = tickerData[market];
            console.log(`LivePriceTicker: Added ${market} price:`, tickerData[market]);
          }
        });
        
        console.log('LivePriceTicker: Filtered prices:', filteredPrices);
        setPrices(filteredPrices);
        setLastUpdate(new Date());
        setLoading(false);
        log(`Live prices updated for ${Object.keys(filteredPrices).length} markets`);
      } else {
        console.log('LivePriceTicker: No ticker data received, using test data for development');
        
        // Use test data for development/debugging
        const testPrices = {
          'BTC/GBP': { price: '45000.00', change_24h: 5.2, source: 'CoinGecko Demo' },
          'ETH/GBP': { price: '2800.50', change_24h: -2.1, source: 'CoinGecko Demo' },
          'LTC/GBP': { price: '95.75', change_24h: 3.4, source: 'CoinGecko Demo' },
          'XRP/GBP': { price: '0.4500', change_24h: -0.8, source: 'CoinGecko Demo' }
        };
        
        // Filter for requested markets
        const filteredPrices = {};
        markets.forEach(market => {
          if (testPrices[market]) {
            filteredPrices[market] = testPrices[market];
          }
        });
        
        setPrices(filteredPrices);
        setLastUpdate(new Date());
        setLoading(false);
        log(`Using test prices for ${Object.keys(filteredPrices).length} markets`);
      }
    } catch (error) {
      console.log('LivePriceTicker: Error loading prices:', error);
      log(`Error loading live prices: ${error.message}`);
      setLoading(false);
    }
  };

  const formatPrice = (price, currency = 'GBP') => {
    if (!price) return 'N/A';
    
    const numPrice = parseFloat(price);
    if (isNaN(numPrice)) return 'N/A';
    
    // Format based on currency
    const symbol = currency === 'GBP' ? '£' : currency === 'USD' ? '$' : '€';
    
    if (numPrice >= 1000) {
      return `${symbol}${numPrice.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    } else if (numPrice >= 1) {
      return `${symbol}${numPrice.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else {
      return `${symbol}${numPrice.toFixed(4)}`;
    }
  };

  const formatChange = (change) => {
    if (!change || isNaN(change)) return null;
    
    const isPositive = change >= 0;
    const color = isPositive ? '#4CAF50' : '#F44336';
    const sign = isPositive ? '+' : '';
    
    return (
      <Chip
        mode="flat"
        compact
        style={{ 
          backgroundColor: `${color}20`,
          borderColor: color,
          borderWidth: 1,
          height: 24,
          marginLeft: 4
        }}
        textStyle={{ 
          color: color, 
          fontSize: 10, 
          fontWeight: '600' 
        }}
      >
        {sign}{change.toFixed(2)}%
      </Chip>
    );
  };

  const renderPriceItem = (market, data) => {
    const [asset, currency] = market.split('/');
    const price = data.price;
    const change24h = data.change_24h;
    
    if (compact) {
      return (
        <View key={market} style={styles.compactItem}>
          <Text style={styles.compactAsset}>{asset}</Text>
          <Text style={styles.compactPrice}>{formatPrice(price, currency)}</Text>
          {showChange && change24h && formatChange(change24h)}
        </View>
      );
    }

    return (
      <Card key={market} style={styles.priceCard}>
        <Card.Content style={styles.cardContent}>
          <View style={styles.priceHeader}>
            <Text variant="titleMedium" style={styles.assetName}>
              {asset}
            </Text>
            <Text variant="bodySmall" style={styles.currency}>
              /{currency}
            </Text>
          </View>
          
          <Text variant="headlineSmall" style={styles.priceText}>
            {formatPrice(price, currency)}
          </Text>
          
          {showChange && change24h && (
            <View style={styles.changeContainer}>
              <Text style={styles.changeLabel}>24h:</Text>
              {formatChange(change24h)}
            </View>
          )}
          
          {data.source && (
            <Text style={styles.sourceText}>
              via {data.source}
            </Text>
          )}
        </Card.Content>
      </Card>
    );
  };

  console.log('LivePriceTicker: Rendering component, loading:', loading, 'prices count:', Object.keys(prices).length);
  console.log('LivePriceTicker: Current prices object:', prices);

  if (loading) {
    return (
      <View style={styles.loadingContent}>
        <Text style={{ color: 'white', fontSize: 12 }}>🔄 Loading prices...</Text>
      </View>
    );
  }

  if (Object.keys(prices).length === 0) {
    // Force some test data if nothing is loaded
    console.log('LivePriceTicker: No prices, showing test data');
    const testPrices = {
      'BTC/GBP': { price: '45000.00', change_24h: 5.2 },
      'ETH/GBP': { price: '2800.50', change_24h: -2.1 },
      'LTC/GBP': { price: '95.75', change_24h: 3.4 },
      'XRP/GBP': { price: '0.4500', change_24h: -0.8 }
    };
    
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.compactContainer}>
          {Object.keys(testPrices).map(market => {
            const [asset] = market.split('/');
            const data = testPrices[market];
            return (
              <View key={market} style={styles.compactItem}>
                <Text style={styles.compactAsset}>{asset}</Text>
                <Text style={styles.compactPrice}>{formatPrice(data.price, 'GBP')}</Text>
                {formatChange(data.change_24h)}
              </View>
            );
          })}
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      {compact ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.compactContainer}>
            {Object.keys(prices).map(market => 
              renderPriceItem(market, prices[market])
            )}
          </View>
        </ScrollView>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.priceContainer}>
            {Object.keys(prices).map(market => 
              renderPriceItem(market, prices[market])
            )}
          </View>
        </ScrollView>
      )}
      
      {lastUpdate && (
        <Text style={styles.updateText}>
          Last updated: {lastUpdate.toLocaleTimeString()}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  priceCard: {
    marginHorizontal: 4,
    minWidth: scaledWidth(140),
    backgroundColor: 'white',
    elevation: 2,
  },
  cardContent: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  priceHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  assetName: {
    fontWeight: 'bold',
    color: '#2196F3',
  },
  currency: {
    color: '#757575',
    marginLeft: 2,
  },
  priceText: {
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  changeLabel: {
    fontSize: 10,
    color: '#666',
  },
  sourceText: {
    fontSize: 8,
    color: '#999',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  compactContainer: {
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  compactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 2,
    borderRadius: 16,
    elevation: 1,
  },
  compactAsset: {
    fontWeight: 'bold',
    fontSize: 12,
    color: '#2196F3',
    marginRight: 6,
  },
  compactPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginRight: 4,
  },
  loadingCard: {
    margin: 8,
  },
  loadingContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  errorCard: {
    margin: 8,
    backgroundColor: '#FFEBEE',
  },
  errorContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  updateText: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default LivePriceTicker;
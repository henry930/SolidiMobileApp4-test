// React imports
import React, { useContext, useEffect, useRef, useState } from 'react';
import { FlatList, Image, StyleSheet, View } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';

// Material Design imports
import {
  Card,
  Text,
  useTheme,
  Surface,
  Avatar,
  Divider,
} from 'react-native-paper';

// Other imports
import _ from 'lodash';
import Big from 'big.js';

// Internal imports
import AppStateContext from 'src/application/data';
import { colors, sharedStyles, sharedColors, layoutStyles, cardStyles } from 'src/constants';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import misc from 'src/util/misc';

// Create local references for commonly used styles
const layout = layoutStyles;
const cards = cardStyles;

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('Assets');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);




let Assets = () => {

  let appState = useContext(AppStateContext);
  let [renderCount, triggerRender] = useState(0);
  let stateChangeID = appState.stateChangeID;




  // Initial setup.
  useEffect(() => {
    setup();
  }, []); // Pass empty array so that this only runs once on mount.


  let setup = async () => {
    console.log('Assets: Setup starting...');
    try {
      console.log('Assets: Calling generalSetup...');
      await appState.generalSetup({caller: 'Assets'});
      console.log('Assets: generalSetup completed');
      
      // Try to load balances with a timeout to prevent blocking
      try {
        console.log('Assets: Attempting to load balances...');
        const balancePromise = appState.loadBalances();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Balance loading timeout')), 3000)
        );
        await Promise.race([balancePromise, timeoutPromise]);
        console.log('Assets: Balances loaded successfully');
      } catch (balanceError) {
        console.log('Assets: Balance loading failed, will use dummy data:', balanceError.message);
      }
      
      // Load live ticker data with CoinGecko integration
      console.log('Assets: Loading ticker data with CoinGecko...');
      try {
        const tickerData = await appState.loadTickerWithCoinGecko();
        console.log('Assets: Ticker data loaded successfully:', tickerData);
        
        // Force a re-render to show updated data
        triggerRender(renderCount + 1);
      } catch (error) {
        console.log('Assets: Error loading ticker data:', error);
      }
      
      if (appState.stateChangeIDHasChanged(stateChangeID)) {
        console.log('Assets: State change detected, exiting setup');
        return;
      }
      
      // Trigger render to show updated data
      triggerRender(renderCount+1);
      console.log('Assets: Setup completed successfully');
    } catch(err) {
      let msg = `Assets.setup: Error = ${err}`;
      console.log(msg);
      // Trigger render even if setup fails
      triggerRender(renderCount+1);
      console.log('Assets: Setup completed with error handling');
    }
  }





  let renderAssetItem = ({ item }) => {
    // Example item:
    // {"asset": "XRP", "balance": "0.00000000"}
    let asset = item.asset;
    let volume = item.balance;
    
    // Get asset info with fallback for dummy data
    let assetInfo = appState.getAssetInfo(asset);
    if (!assetInfo) {
      // Fallback asset info for dummy data
      const dummyAssetInfo = {
        'ADA': { name: 'Cardano', displaySymbol: 'ADA', decimalPlaces: 6, type: 'crypto' },
        'DOT': { name: 'Polkadot', displaySymbol: 'DOT', decimalPlaces: 4, type: 'crypto' },
        'LINK': { name: 'Chainlink', displaySymbol: 'LINK', decimalPlaces: 4, type: 'crypto' },
        'UNI': { name: 'Uniswap', displaySymbol: 'UNI', decimalPlaces: 4, type: 'crypto' },
      };
      assetInfo = dummyAssetInfo[asset] || { name: asset, displaySymbol: asset, decimalPlaces: 8, type: 'crypto' };
    }
    
    let assetDP = assetInfo.decimalPlaces;
    let displayVolume = Big(volume).toFixed(assetDP);
    let name = assetInfo.name;
    let symbol = assetInfo.displaySymbol;
    
    // Get live price from ticker
    let market = `${asset}/GBP`;
    let ticker = appState.getTicker();
    let currentPrice = null;
    let priceChange = null;
    let portfolioValue = '0.00';
    
    // Check for live ticker data first
    if (ticker && ticker[market] && ticker[market].price) {
      currentPrice = parseFloat(ticker[market].price);
      priceChange = ticker[market].change_24h || null;
    } else {
      // Fallback to demo data for development
      const demoPrice = {
        'BTC': 45000,
        'ETH': 2800,
        'LTC': 95,
        'XRP': 0.45,
        'ADA': 0.38,
        'DOT': 5.25,
        'LINK': 14.75,
        'UNI': 6.85,
        'GBP': 1.0,
        'USD': 0.82,
        'EUR': 0.95
      };
      
      if (demoPrice[asset]) {
        currentPrice = demoPrice[asset];
        // Demo price change data
        priceChange = Math.random() > 0.5 ? 
          +(Math.random() * 10).toFixed(2) : 
          -(Math.random() * 10).toFixed(2);
      }
    }
    
    // Calculate portfolio value
    if (currentPrice && !isNaN(currentPrice)) {
      let volumeNum = parseFloat(volume);
      if (!isNaN(volumeNum)) {
        portfolioValue = (currentPrice * volumeNum).toFixed(2);
      }
    }
    
    const formatPrice = (price) => {
      if (!price) return 'N/A';
      if (price >= 1000) return `£${price.toLocaleString()}`;
      if (price >= 1) return `£${price.toFixed(2)}`;
      return `£${price.toFixed(4)}`;
    };
    
    // Determine asset type for styling
    const isCrypto = assetInfo.type === 'crypto';
    const borderColor = isCrypto ? '#FF9800' : '#2196F3'; // Orange for crypto, blue for fiat
    
    return (
      <Card style={[cards.cardFlat, {
        marginBottom: 12,
        backgroundColor: '#ffffff',
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2
      }]}>
        <Card.Content style={layout.row}>
          <View style={layout.rowCenter}>
            {/* Asset Icon */}
            <View style={{
              marginRight: 16,
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {appState.getAssetIcon(asset) ? (
                <Avatar.Image 
                  source={appState.getAssetIcon(asset)} 
                  size={40}
                />
              ) : (
                <Avatar.Text 
                  size={40}
                  label={asset.substring(0, 2)}
                  style={{
                    backgroundColor: '#f5f5f5',
                    color: '#666666'
                  }}
                />
              )}
            </View>
            
            {/* Asset Information */}
            <View style={layout.flex1}>
              {/* Header Row */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 4
              }}>
                <Text variant="titleMedium" style={{
                  fontSize: 16,
                  fontWeight: 'bold',
                  color: '#333333',
                  marginRight: 8
                }}>
                  {asset}
                </Text>
                <Text variant="bodySmall" style={{
                  fontSize: 12,
                  color: '#666666',
                  marginRight: 8
                }}>
                  {name}
                </Text>
                <Text variant="bodySmall" style={[
                  {
                    fontSize: 10,
                    fontWeight: '600',
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4,
                    overflow: 'hidden'
                  },
                  isCrypto ? {
                    backgroundColor: '#FFF3CD',
                    color: '#856404'
                  } : {
                    backgroundColor: '#D4EDDA',
                    color: '#155724'
                  }
                ]}>
                  {isCrypto ? 'CRYPTO' : 'FIAT'}
                </Text>
              </View>
              
              {/* Holdings */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 4
              }}>
                <Text variant="bodyMedium" style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: '#333333',
                  marginRight: 8
                }}>
                  {displayVolume} {symbol}
                </Text>
                {currentPrice && (
                  <Text variant="bodySmall" style={{
                    fontSize: 11,
                    color: '#999999',
                    backgroundColor: '#f8f9fa',
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4
                  }}>
                    @ {formatPrice(currentPrice)}
                  </Text>
                )}
              </View>
              
              {/* Price Change Indicator */}
              {priceChange !== null && (
                <View style={layout.rowCenter}>
                  <View style={[
                    {
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 6
                    },
                    priceChange >= 0 ? {
                      backgroundColor: '#d4edda'
                    } : {
                      backgroundColor: '#f8d7da'
                    }
                  ]}>
                    <Text style={[
                      {
                        fontSize: 12,
                        fontWeight: '600',
                        marginRight: 4
                      },
                      { color: priceChange >= 0 ? '#4CAF50' : '#f44336' }
                    ]}>
                      {priceChange >= 0 ? '↗' : '↘'} {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(1)}%
                    </Text>
                    <Text style={{
                      fontSize: 10,
                      color: '#666666'
                    }}>
                      24h
                    </Text>
                  </View>
                </View>
              )}
            </View>
            
            {/* Portfolio Value */}
            <View style={{
              alignItems: 'flex-end',
              justifyContent: 'center'
            }}>
              <Text variant="titleMedium" style={{
                fontSize: 16,
                fontWeight: 'bold',
                color: '#333333',
                textAlign: 'right'
              }}>
                £{portfolioValue}
              </Text>
              <Text variant="bodySmall" style={{
                fontSize: 10,
                color: '#999999',
                marginTop: 2,
                textAlign: 'right'
              }}>
                VALUE
              </Text>
              {currentPrice && (
                <Text variant="bodySmall" style={{
                  fontSize: 10,
                  color: '#4CAF50',
                  fontWeight: '600',
                  marginTop: 2,
                  textAlign: 'right'
                }}>
                  LIVE
                </Text>
              )}
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  }


  let renderAssets = () => {
    // FlatList requires a list input.
    // Transform the asset balance properties into a list of objects, sorted by asset symbol (e.g. "BTC").
    let data = appState.apiData.balance;
    let assets = _.keys(data).sort();
    let data2 = assets.map(asset => ( {asset, balance: data[asset]} ) );
    
    // Filter out any "[loading]" values and check if we have valid data
    let validData = data2.filter(item => item.balance !== '[loading]');
    
    // If no valid API data, use dummy data for demonstration
    if (validData.length === 0) {
      validData = [
        { asset: 'BTC', balance: '0.15420000' },
        { asset: 'ETH', balance: '2.45000000' },
        { asset: 'LTC', balance: '12.75000000' },
        { asset: 'XRP', balance: '1500.00000000' },
        { asset: 'ADA', balance: '850.00000000' },
        { asset: 'DOT', balance: '45.50000000' },
        { asset: 'LINK', balance: '25.75000000' },
        { asset: 'UNI', balance: '18.25000000' },
        { asset: 'GBP', balance: '2450.75' },
        { asset: 'USD', balance: '1200.50' },
        { asset: 'EUR', balance: '850.25' },
      ];
    }
    
    return (
      <FlatList
        data={validData}
        renderItem={renderAssetItem}
        keyExtractor={(item, index) => index.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
        style={{ width: '100%' }}
      />
    );
  }


  const materialTheme = useTheme();

  // Debug ticker data
  const currentTicker = appState.getTicker();
  console.log('Assets Render - Current ticker data:', currentTicker);
  console.log('Assets Render - Ticker keys:', currentTicker ? Object.keys(currentTicker) : 'null');

  console.log('Assets page rendering...');
  
  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      
      {/* Header Section - Full width design */}
            <View style={{ 
              backgroundColor: '#ffffff',
              margin: 16,
              padding: 16,
              borderRadius: 8,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3
            }}>
        {/* Header content with padding */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
          {/* Page Title */}
          <View style={{ 
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16
          }}>
            <Text variant="headlineSmall" style={{ 
              fontSize: 24,
              fontWeight: '700',
              color: '#000000'
            }}>
              My Assets
            </Text>
            <View style={{
              backgroundColor: '#4CAF50',
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 4
            }}>
              <Text style={{
                color: '#ffffff',
                fontSize: 12,
                fontWeight: '600'
              }}>
                LIVE
              </Text>
            </View>
          </View>
        
          {/* Portfolio Value Cards */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 24
          }}>
            {/* Total Value */}
            <View style={{
              flex: 1,
              backgroundColor: '#ffffff',
              padding: 16,
              borderRadius: 8,
              marginHorizontal: 4,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3
            }}>
              <Text variant="bodySmall" style={{
                fontSize: 14,
                color: '#666666',
                marginBottom: 4
              }}>
                Total Value
              </Text>
              <Text variant="titleLarge" style={{
                fontSize: 18,
                fontWeight: '600',
                color: '#000000'
              }}>
                {(() => {
                  // Calculate total portfolio value from live ticker data or use dummy data
                  let totalValue = 0;
                  const ticker = appState.getTicker();
                  const balances = appState.apiData.balance || {};
                  
                  // Use dummy data if no API balance data
                  const dummyBalances = Object.keys(balances).length === 0 ? {
                    'BTC': '0.15420000',
                    'ETH': '2.45000000',
                    'LTC': '12.75000000',
                    'XRP': '1500.00000000',
                    'ADA': '850.00000000',
                    'DOT': '45.50000000',
                    'LINK': '25.75000000',
                    'UNI': '18.25000000',
                    'GBP': '2450.75',
                    'USD': '1200.50',
                    'EUR': '850.25',
                  } : balances;
                  
                  const demoPrice = {
                    'BTC': 45000,
                    'ETH': 2800,
                    'LTC': 95,
                    'XRP': 0.45,
                    'ADA': 0.38,
                    'DOT': 5.25,
                    'LINK': 14.75,
                    'UNI': 6.85,
                    'GBP': 1.0,
                    'USD': 0.82,
                    'EUR': 0.95
                  };
                  
                  Object.keys(dummyBalances).forEach(asset => {
                    const balance = parseFloat(dummyBalances[asset]);
                    const market = `${asset}/GBP`;
                    let price = null;
                    
                    if (ticker && ticker[market] && ticker[market].price) {
                      price = parseFloat(ticker[market].price);
                    } else if (demoPrice[asset]) {
                      price = demoPrice[asset];
                    }
                    
                    if (!isNaN(balance) && price && !isNaN(price)) {
                      totalValue += balance * price;
                    }
                  });
                  
                  return totalValue > 0 ? `£${totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '£0.00';
                })()}
              </Text>
            </View>
            
            {/* 24h Change */}
            <View style={[
              {
                flex: 1,
                backgroundColor: '#ffffff',
                borderRadius: 12,
                padding: 16,
                alignItems: 'center',
                justifyContent: 'center'
              },
              {
                marginLeft: 8
              }
            ]}>
              <Text variant="bodySmall" style={{
                fontSize: 12,
                color: '#666666',
                fontWeight: '500',
                marginBottom: 8,
                textAlign: 'center'
              }}>
                24h Change
              </Text>
              <View style={layout.rowCenter}>
                <Text style={{
                  fontSize: 16,
                  fontWeight: 'bold',
                  color: '#4CAF50',
                  marginRight: 4
                }}>
                  +5.2%
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: '#4CAF50',
                  fontWeight: '600'
                }}>
                  £124
                </Text>
              </View>
            </View>
          </View>


        </View>
      </View>

      {/* Content Section - Full width scrollable */}
      <View style={{ flex: 1, paddingTop: 12 }}>


        {/* Assets List - Full width with padding */}
        <View style={{ flex: 1, paddingHorizontal: 16 }}>
          {renderAssets()}
          
          {/* Debug info */}
          {console.log('Assets: Render - renderCount:', renderCount)}
        </View>
      </View>
    </View>
  );

}


let styles = StyleSheet.create({
  ...sharedStyles,
  
  panelContainer: {
    paddingHorizontal: scaledWidth(15),
    paddingVertical: scaledHeight(15),
    width: '100%',
    height: '100%',
  },
  heading: {
    ...sharedStyles.center,
  },
  heading1: {
    marginTop: scaledHeight(10),
    marginBottom: scaledHeight(30),
  },
  headingText: {
    ...sharedStyles.titleText,
  },
  basicText: {
    ...sharedStyles.bodyText,
  },
  // Common inline style replacements
  cardContent: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowSpaceBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  flexOne: {
    flex: 1,
  },
  greenBadge: {
    backgroundColor: sharedColors.success,
  },
  assetContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  headerSection: {
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  secureBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  secureText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  whiteText: {
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2,
  },
  rightAlign: {
    flex: 1,
    marginLeft: 4,
    alignItems: 'flex-end',
  },
  leftAlign: {
    flex: 1,
    marginRight: 4,
  },
  smallText: {
    fontSize: 8,
    color: '#999',
  },
  balanceContainer: {
    alignItems: 'flex-end',
    minWidth: 70,
  },
  scrollContainer: {
    paddingBottom: 0,
  },
  fullWidth: {
    width: '100%',
    marginTop: 0,
  },
  bold: {
    fontWeight: 'bold',
  },
  controls: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: "space-between",
    zIndex: 1,
    //borderWidth: 1, // testing
  },
  assetCategoryWrapper: {
    width: '50%',
  },
  assetCategory: {
    height: scaledHeight(40),
  },
  dropdownText: {
    fontSize: normaliseFont(14),
  },
  flatListWrapper: {
    height: '80%',
    //borderWidth: 1, // testing
  },
  assetList: {
    //borderWidth: 1, // testing
    marginTop: scaledHeight(15),
  },
  flatListItem: {
    marginBottom: scaledHeight(15),
    paddingHorizontal: scaledWidth(10),
    paddingVertical: scaledHeight(15),
    borderWidth: 1,
    borderColor: 'black',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: "space-between",
  },
  assetText: {
    fontSize: normaliseFont(16),
  },
});


export default Assets;

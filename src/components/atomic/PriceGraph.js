// React imports
import AppStateContext from 'src/application/data';
import { appTier } from 'src/application/appTier';

import React, { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, StyleSheet, View, TouchableOpacity } from 'react-native';
import { Button, StandardButton, FixedWidthButton, Spinner } from 'src/components/atomic';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import { Dimensions, Platform, PixelRatio } from 'react-native';
import { colors } from 'src/constants';

import { LineChart } from 'react-native-chart-kit'

import logger from 'src/util/logger';
let logger2 = logger.extend('PriceGraph ');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);

// OFFLINE MODE - Set to true to disable all API calls for layout testing
const OFFLINE_MODE = true;

let PriceGraph = ({assetBA, assetQA, historic_prices}) => {
  let appState = useContext(AppStateContext);
  let selectedPeriod = '1D';
  let market = assetBA + '/' + assetQA;

  let [period, setPeriod] = useState(selectedPeriod);
  let [graphMarket, setGraphMarket] = useState(market);
  let [liveData, setLiveData] = useState([]);
  let [loading, setLoading] = useState(false);
  let [error, setError] = useState(null);

  if(historic_prices['current']==undefined) {
    historic_prices['current'] = [];
  }

  // Mapping of asset symbols to CoinGecko IDs
  const coinGeckoIds = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'LTC': 'litecoin',
    'XRP': 'ripple',
    'ADA': 'cardano',
    'DOT': 'polkadot',
    'LINK': 'chainlink',
    'UNI': 'uniswap'
  };

  // Fetch live data from CoinGecko API
  const fetchLiveData = async (asset, period) => {
    try {
      setLoading(true);
      setError(null);
      
      // OFFLINE MODE - Return mock data for layout testing
      if (OFFLINE_MODE) {
        log(`[OFFLINE MODE] Generating mock price data for ${asset} - ${period}`);
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
        
        // Generate mock price data
        const basePrice = asset === 'BTC' ? 45000 : asset === 'ETH' ? 3000 : 1000;
        const dataPoints = period === '2H' ? 12 : period === '8H' ? 48 : 24;
        const mockPrices = [];
        
        for (let i = 0; i < dataPoints; i++) {
          const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
          const price = basePrice * (1 + variation);
          mockPrices.push(price);
        }
        
        setGraphData(mockPrices);
        setCurrentPrice(mockPrices[mockPrices.length - 1]);
        setLoading(false);
        return;
      }
      
      const coinId = coinGeckoIds[asset] || 'bitcoin';
      let days = '1';
      
      // Map period to days for API
      switch(period) {
        case '2H': days = '1'; break;
        case '8H': days = '1'; break;
        case '1D': days = '1'; break;
        case '1W': days = '7'; break;
        case '1M': days = '30'; break;
        case '6M': days = '180'; break;
        case '1Y': days = '365'; break;
        default: days = '1';
      }

      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=gbp&days=${days}&interval=${days === '1' ? 'hourly' : 'daily'}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      
      const data = await response.json();
      const prices = data.prices.map(([timestamp, price]) => price);
      
      // Filter data based on period for intraday periods
      let filteredPrices = prices;
      if (period === '2H') {
        filteredPrices = prices.slice(-2);
      } else if (period === '8H') {
        filteredPrices = prices.slice(-8);
      }
      
      setLiveData(filteredPrices);
      log(`Fetched ${filteredPrices.length} price points for ${asset}`);
      
    } catch (err) {
      console.error('Error fetching live data:', err);
      setError(err.message);
      // Fallback to sample data
      setLiveData(generateSampleData(asset));
    } finally {
      setLoading(false);
    }
  };

  // Generate sample data as fallback
  const generateSampleData = (asset) => {
    const basePrice = asset === 'BTC' ? 45000 : asset === 'ETH' ? 3000 : 100;
    const dataPoints = [];
    for (let i = 0; i < 24; i++) {
      const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
      dataPoints.push(basePrice * (1 + variation));
    }
    return dataPoints;
  };


 function  getlinedata({assetBA, assetQA, period}) {
    let market = assetBA+ '/' + assetQA;
    let data = [];

    // Use live data if available, otherwise fallback to historic_prices
    let currentData = liveData.length > 0 ? liveData : [];
    
    if(currentData.length === 0) {
      if(historic_prices[market]!=null &&
         historic_prices[market][period]!=null)
      {
        currentData = historic_prices[market][period];
      }
      else
      {
        // Generate sample data as last resort
        currentData = generateSampleData(assetBA);
      }
    }

    // Create appropriate labels based on period
    let labels = [];
    if (period === '2H' || period === '8H') {
      labels = ['', ...currentData.map((_, i) => `${i}h`), ''];
    } else if (period === '1D') {
      labels = ['', '00:00', '06:00', '12:00', '18:00', ''];
    } else if (period === '1W') {
      labels = ['', 'Mon', 'Wed', 'Fri', 'Sun', ''];
    } else {
      labels = ['', ...currentData.map((_, i) => ''), ''];
    }

    linedata = {
      labels: labels,
      datasets: [
        {
          data: currentData.length > 0 ? currentData : [1, 1],
          strokeWidth: 2,
          color: (opacity = 1) => `rgba(74, 175, 79, ${opacity})`, // Green color
        },
      ],
    };
    return linedata;
  }



  function getPriceDP({assetBA, assetQA, period}) {
//    log(`getPriceDP ${assetBA} ${assetQA} ${period}`);
    //appState.apiData.historic_prices["BTC/GBP"]["1D"]
    let market = assetBA+'/'+assetQA;
//    log("X = "+market);
//    log("X = "+JSON.stringify(appState.apiData.historic_prices[market]));
    // If we've got no prices currently then fallback to a guestimate based on the market.
    if(historic_prices[market]==undefined ||
      historic_prices[market][period]==undefined) {
      let marketDP = {
        "BTC/GBP": 0,
        "LTC/GBP": 2,
        "XRP/GBP": 4,
        "ETH/GBP": 0,
        "LINK/GBP": 2,
      }
      if(market in marketDP) {
        return marketDP[market];
      } else {
        return 2;
      }
    }
    let assetPrice = historic_prices[market][period][0]
    if(assetPrice>100) {
      return 0;
    }
    if(assetPrice>1) {
      return 2;
    }
    if(assetPrice>0.1) {
      return 4;
    }
    if(assetPrice>0.01) {
      return 5;
    }
    if(assetPrice>0.001) {
      return 6;
    }
    return 8;
  }

  function periodStyle(buttonPeriod) {
    if(period==buttonPeriod) {
      return styleButtonSelected;
    } else {
      return styleButton;

    }
  }

  useEffect(() => {
    // Fetch live data when component mounts or when asset/period changes
    fetchLiveData(assetBA, period);
  }, [assetBA, period]);

  useEffect(() => {
    // Check if we need to fetch data for the graph (triggered when we change currency in the dropdown).
    let market = assetBA + '/' + assetQA;
    if(market!=graphMarket) {
      log("Market changed from "+graphMarket+" to "+market+", updating graph");
      appState.loadHistoricPrices({market:market, period:period});
      setGraphMarket(market);
    }
  }, [assetBA, assetQA]);



  return (
    <View style={styles.container}>

{ (loading || appState.loadingPrices) &&
    <View style={styles.loading}>
      <ActivityIndicator size='large' color="#1976d2" />
    </View>
}

{error && (
    <View style={{ 
      padding: 12, 
      backgroundColor: '#ffebee', 
      marginBottom: 16, 
      borderRadius: 8,
      borderLeftWidth: 4,
      borderLeftColor: '#f44336'
    }}>
      <Text style={{ 
        color: '#c62828', 
        textAlign: 'center',
        fontSize: normaliseFont(12),
        fontWeight: '500'
      }}>
        Error loading live data. Using sample data.
      </Text>
    </View>
)}

  <View style={styles.chartContainer}>
    <LineChart
    data={getlinedata({assetBA, assetQA, period})}
    width={Dimensions.get('window').width - 48}
    height={220}
    yAxisLabel={'£'}
    xLabelsOffset={5}
    horizontalOffset={20}
    verticalLabelRotation={0}
    withHorizontalLabels={true}
    withVerticalLabels={true}
    chartConfig={{
      backgroundColor: '#ffffff',
      fillShadowGradientFrom: '#1976d2',
      fillShadowGradientFromOpacity: 0.2,
      fillShadowGradientTo: '#1976d2',
      fillShadowGradientToOffset: 1,
      fillShadowGradientToOpacity: 0.02,
      backgroundGradientFrom: '#ffffff',
      backgroundGradientTo: '#ffffff',
      decimalPlaces: getPriceDP({assetBA, assetQA, period}),
      color: (opacity = 1) => `rgba(25, 118, 210, ${opacity})`,
      labelColor: (opacity = 1) => `rgba(97, 97, 97, ${opacity})`,
      style: {
        borderRadius: 12,
      },
      propsForBackgroundLines: {
        strokeWidth: 1,
        stroke: '#f0f0f0',
        strokeDasharray: "0"
      },
      propsForDots: {
        r: "0",
        strokeWidth: "0",
        stroke: "transparent"
      },
      propsForLabels: {
        fontSize: 11,
        fontWeight: '400',
      }
    }}
    bezier
      style={{
        marginVertical: 8,
        borderRadius: 16,
      }}
    />
  </View>

  <View style={styles.buttonContainer}>
    <View style={styles.buttonRow}>
      <TouchableOpacity 
        style={[styles.periodButton, period === '2H' && styles.periodButtonActive]}
        onPress={async () => {
          setPeriod("2H");
          await fetchLiveData(assetBA, "2H");
          await appState.loadHistoricPrices({market:assetBA+ '/' + assetQA, period:"2H"});
        }}
      >
        <Text style={[styles.periodButtonText, period === '2H' && styles.periodButtonTextActive]}>2H</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.periodButton, period === '8H' && styles.periodButtonActive]}
        onPress={async () => {
          setPeriod("8H");
          await fetchLiveData(assetBA, "8H");
          await appState.loadHistoricPrices({market:assetBA+ '/' + assetQA, period:"8H"});
        }}
      >
        <Text style={[styles.periodButtonText, period === '8H' && styles.periodButtonTextActive]}>8H</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.periodButton, period === '1D' && styles.periodButtonActive]}
        onPress={async () => {
          setPeriod("1D");
          await fetchLiveData(assetBA, "1D");
          await appState.loadHistoricPrices({market:assetBA+ '/' + assetQA, period:"1D"});
        }}
      >
        <Text style={[styles.periodButtonText, period === '1D' && styles.periodButtonTextActive]}>1D</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.periodButton, period === '1W' && styles.periodButtonActive]}
        onPress={async () => {
          setPeriod("1W");
          await fetchLiveData(assetBA, "1W");
          await appState.loadHistoricPrices({market:assetBA+ '/' + assetQA, period:"1W"});
        }}
      >
        <Text style={[styles.periodButtonText, period === '1W' && styles.periodButtonTextActive]}>1W</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.periodButton, period === '1M' && styles.periodButtonActive]}
        onPress={async () => {
          setPeriod("1M");
          await fetchLiveData(assetBA, "1M");
          await appState.loadHistoricPrices({market:assetBA+ '/' + assetQA, period:"1M"});
        }}
      >
        <Text style={[styles.periodButtonText, period === '1M' && styles.periodButtonTextActive]}>1M</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.periodButton, period === '6M' && styles.periodButtonActive]}
        onPress={async () => {
          setPeriod("6M");
          await fetchLiveData(assetBA, "6M");
          await appState.loadHistoricPrices({market:assetBA+ '/' + assetQA, period:"6M"});
        }}
      >
        <Text style={[styles.periodButtonText, period === '6M' && styles.periodButtonTextActive]}>6M</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.periodButton, period === '1Y' && styles.periodButtonActive]}
        onPress={async () => {
          setPeriod("1Y");
          await fetchLiveData(assetBA, "1Y");
          await appState.loadHistoricPrices({market:assetBA+ '/' + assetQA, period:"1Y"});
        }}
      >
        <Text style={[styles.periodButtonText, period === '1Y' && styles.periodButtonTextActive]}>1Y</Text>
      </TouchableOpacity>
    </View>
  </View>

    </View>
  );
}

let styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  chartContainer: {
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  periodButtonActive: {
    backgroundColor: '#1976d2',
    shadowColor: '#1976d2',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  periodButtonText: {
    fontSize: normaliseFont(12),
    fontWeight: '600',
    color: '#666',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  loading: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 100,
    bottom: 0,
    alignItems: 'center',
    zIndex: +100,
    elevation: +100,
  },
});



export default PriceGraph;
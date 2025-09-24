// React imports
import AppStateContext from 'src/application/data';

import React, { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, StyleSheet, View } from 'react-native';
import { Button, StandardButton, FixedWidthButton, Spinner } from 'src/components/atomic';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import { Dimensions, Platform, PixelRatio } from 'react-native';
import { colors } from 'src/constants';

import { LineChart } from 'react-native-chart-kit'

import logger from 'src/util/logger';
let logger2 = logger.extend('PriceGraph ');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);

let PriceGraph = ({assetBA, assetQA, historic_prices}) => {
  let appState = useContext(AppStateContext);
  let selectedPeriod = '1D';
  let market = assetBA + '/' + assetQA;

  let [period, setPeriod] = useState(selectedPeriod);
  let [graphMarket, setGraphMarket] = useState(market);

  if(historic_prices['current']==undefined) {
    historic_prices['current'] = [];
  }


 function  getlinedata({assetBA, assetQA, period}) {
    let market = assetBA+ '/' + assetQA;
    let data = [];

    if(historic_prices[market]!=null &&
       historic_prices[market][period]!=null)
    {
      // We have data for the requested market and period - display it.
      historic_prices['current'] = historic_prices[market][period];
    }
    else
    {
      // No data for the requested period - set to 'blank'
      historic_prices['current'] = [1,1];
    }
    linedata = {
      labels: ['', '00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00',''],
      datasets: [
        {
          data: historic_prices['current'],
          strokeWidth: 2, // optional
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
    // Check if we need to fetch data for the graph (triggered when we change currency in the dropdown).
    let market = assetBA + '/' + assetQA;
    if(market!=graphMarket) {
      log("Market changed from "+graphMarket+" to "+market+", updating graph");
      appState.loadHistoricPrices({market:market, period:period});
      setGraphMarket(market);
    }
  }, [assetBA, assetQA]);



  return (
    <View>

{ appState.loadingPrices &&
    <View style={styles.loading}>
      <ActivityIndicator size='large' />
    </View>
}

  <LineChart
    data={getlinedata({assetBA, assetQA, period})}
    width={Dimensions.get('window').width * 0.9}
    //width={100 * horizontalScale} // from react-native
    height={220}
    yAxisLabel={'£'}
//    yLabelsOffset={-50}
    xLabelsOffset={+10}
    horizontalOffset={30}
    verticalLabelRotation={-45}
    withHorizontalLabels={true}
    withVerticalLabels={false}
    chartConfig={{
      backgroundColor: '#ff0000',
      fillShadowGradientFrom: '#000000',
      fillShadowGradientFromOpacity: '0.3',
      fillShadowGradientTo:   '#FFFFFF',
      fillShadowGradientToOffset: '0.8',
      fillShadowGradientToOpacity: '0.0',
      backgroundGradientFrom: '#ffffff',
      backgroundGradientTo:   '#ffffff',
      decimalPlaces:getPriceDP({assetBA, assetQA, period}),
      color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,

      yLabelsOffset: "50",
        propsForHorizontalLabels: {
            dx: 60 
        },      
      propsForBackgroundLines: {
        strokeWidth: "0",
      },
      propsForDots: {
        r: "0",
        strokeWidth: "1",
        stroke: "#000000"
      },
      style: {
        marginVertical: 80,
        borderRadius: 16,
      }
    }}
    bezier
    style={{
      marginVertical: 8,
      marginHorizontal: 0,
      paddingHorizontal: 0,
      borderHorizontal: 200,
      borderRadius: 30,
     paddingRight: 0,

    }}
  /> 

  <View style={styles.buttonWrapper2}>
       <View style={styleButton.wrapper}>
        <FixedWidthButton styles={periodStyle('2H')} title='2H'
          onPress={ async () => {
            setPeriod("2H");
            await appState.loadHistoricPrices({market:assetBA+ '/' + assetQA, period:"2H"});
          } }
        />
      </View>   

      <View style={styleButton.wrapper}>

        <FixedWidthButton styles={periodStyle('8H')} title='8H'
          onPress={ async () => {
            setPeriod("8H");
            await appState.loadHistoricPrices({market:assetBA+ '/' + assetQA, period:"8H"});
          } }
        />
      </View>  
      <View style={styleButton.wrapper}>
        <FixedWidthButton styles={periodStyle('1D')} title='1D'
          onPress={ async () => { 
            setPeriod("1D");
            await appState.loadHistoricPrices({market:assetBA+ '/' + assetQA, period:"1D"});
          } }
        />
      </View>  
      <View style={styleButton.wrapper}>
        <FixedWidthButton styles={periodStyle('1W')} title='1W'
          onPress={ async () => { 
            setPeriod("1W");
            await appState.loadHistoricPrices({market:assetBA+ '/' + assetQA, period:"1W"});
          } }
        />
      </View>  
      <View style={styleButton.wrapper}>
        <FixedWidthButton styles={periodStyle('1M')} title='1M'
          onPress={ async () => { 
            setPeriod("1M");
            await appState.loadHistoricPrices({market:assetBA+ '/' + assetQA, period:"1M"});
          } }
        />
      </View>  
      <View style={styleButton.wrapper}>
        <FixedWidthButton styles={periodStyle('6M')} title='6M'
          onPress={ async () => { 
            setPeriod("6M");
            await appState.loadHistoricPrices({market:assetBA+ '/' + assetQA, period:"6M"});
          } }
        />
      </View>  
      <View style={styleButton.wrapper}>
        <FixedWidthButton styles={periodStyle('1Y')} title='1Y'
          onPress={ async () => { 
            setPeriod("1Y");
            await appState.loadHistoricPrices({market:assetBA+ '/' + assetQA, period:"1Y"});
          } }
        />
      </View>  

      </View>  
      </View>  
  );
}

let styles = StyleSheet.create({
  buttonWrapper2: {
    marginTop: scaledHeight(-20), // Reduced from -30 to -20
    marginBottom: scaledHeight(10), // Reduced from 20 to 10
    justifyContent:'center',
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scaledWidth(5), // Added padding to center buttons better
  },
  loading: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 100,
    bottom: 0,
    alignItems: 'center',
//    justifyContent: 'center'
    zIndex: +100, // works on ios
    elevation: +100, // works on android
   },  

});

let styleButton = StyleSheet.create({
  view: {
    backgroundColor: colors.greyedOutIcon,
    height: scaledHeight(12), // Reduced from 20 to 12
    paddingHorizontal: scaledWidth(8), // Reduced from 15 to 8
    minWidth:'10%', // Reduced from 12% to 10%
    borderRadius: 6, // Added border radius for modern look
  },
  text: {
    color: colors.standardButtonText,
    fontWeight: '600', // Slightly less bold
    fontSize: normaliseFont(10), // Reduced from 12 to 10
    padding:'0%',
    margin: '0%',
  },
  wrapper: {
    marginTop: scaledHeight(0),
    marginBottom: scaledHeight(6), // Reduced from 10 to 6
    marginLeft: scaledWidth(3), // Reduced from 5 to 3
  }
});

let styleButtonSelected = StyleSheet.create({
  view: {
    backgroundColor: colors.selectedIcon, // Added background color for selected state
    height: scaledHeight(12), // Reduced from 20 to 12
    paddingHorizontal: scaledWidth(8), // Reduced from 15 to 8
    minWidth:'10%', // Reduced from 12% to 10%
    borderRadius: 6, // Added border radius for modern look
  },
  text: {
    color: 'white', // White text for selected state
    fontWeight: '600', // Slightly less bold
    fontSize: normaliseFont(10), // Reduced from 12 to 10
    padding:'0%',
    margin: '0%',
  },
  wrapper: {
    marginTop: scaledHeight(0),
    marginBottom: scaledHeight(6), // Reduced from 10 to 6
    marginLeft: scaledWidth(3), // Reduced from 5 to 3
  }
});

export default PriceGraph;
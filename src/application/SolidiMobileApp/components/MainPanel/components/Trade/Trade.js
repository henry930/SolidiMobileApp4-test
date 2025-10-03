// React imports
import React, { useContext, useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

// Material Design imports
import {
  Button,
  Card,
  Divider,
  HelperText,
  Surface,
  Text,
  TextInput,
  useTheme,
  Icon,
  ActivityIndicator,
  SegmentedButtons,
} from 'react-native-paper';

// Other imports
import _ from 'lodash';
import Big from 'big.js';

// Internal imports
import AppStateContext from 'src/application/data';
import { scaledWidth, scaledHeight } from 'src/util/dimensions';
import { PriceGraph } from 'src/components/atomic';
import LivePriceTicker from 'src/components/LivePriceTicker';
import misc from 'src/util/misc';
import ImageLookup from 'src/images';
import { getLiveExchangeRate, refreshLiveRates } from 'src/util/liveRates';
import { sharedStyles as styles, layoutStyles as layout, textStyles as text, cardStyles as cards, buttonStyles as buttons, formStyles as forms } from 'src/styles';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('Trade');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);

let Trade = () => {
  let appState = useContext(AppStateContext);
  let firstRender = misc.useFirstRender();
  let stateChangeID = appState.stateChangeID;

  // Trade type state - 'buy' or 'sell'
  const [tradeType, setTradeType] = useState('buy');

  // Default values for both buy and sell
  let selectedVolumeBA = '0';
  let selectedAssetBA = 'BTC';
  let selectedVolumeQA = '100';
  let selectedAssetQA = 'GBP';

  // Asset item generation function
  let deriveAssetItems = (assetList) => {
    return assetList.map((asset) => {
      let assetIcon = appState.getAssetIcon(asset);
      let displayString = appState.getAssetInfo(asset).displayString;
      let assetItem = {
        label: displayString,
        value: asset,
        icon: () => <Image source={assetIcon} style={{
            width: scaledWidth(27),
            height: scaledHeight(27),
            resizeMode: misc.getFlatListIconResizeMode(),
          }}
        />,
      }
      return assetItem;
    });
  }

  // Functions that derive dropdown properties from the current lists of base and quote assets.
  let generateBaseAssetItems = () => { 
    let baseAssets = appState.getBaseAssets();
    // Fallback to default assets if API data is empty
    if (!baseAssets || baseAssets.length === 0) {
      baseAssets = ['BTC', 'ETH', 'LTC', 'XRP'];
    }
    return deriveAssetItems(baseAssets);
  }
  
  let generateQuoteAssetItems = () => { 
    let quoteAssets = appState.getQuoteAssets();
    // Fallback to default assets if API data is empty
    if (!quoteAssets || quoteAssets.length === 0) {
      quoteAssets = ['GBP', 'EUR', 'USD'];
    }
    return deriveAssetItems(quoteAssets);
  }

  // Volume state:
  // BA = Base Asset
  let [volumeBA, setVolumeBA] = useState(selectedVolumeBA);
  // QA = Quote Asset
  let [volumeQA, setVolumeQA] = useState(selectedVolumeQA);

  // Dropdown state: Base asset
  let [openBA, setOpenBA] = useState(false);
  let [assetBA, setAssetBA] = useState(selectedAssetBA);
  let [itemsBA, setItemsBA] = useState(generateBaseAssetItems());

  // Dropdown state: Quote asset
  let [openQA, setOpenQA] = useState(false);
  let [assetQA, setAssetQA] = useState(selectedAssetQA);
  let [itemsQA, setItemsQA] = useState(generateQuoteAssetItems());

  // More state
  let [newAPIVersionDetected, setNewAPIVersionDetected] = useState(false);
  let [errorMessage, setErrorMessage] = useState('');
  let [loadingBestPrice, setLoadingBestPrice] = useState(true);

  // Initial setup.
  useEffect(() => {
    setup();
  }, []); // Pass empty array to only run once on mount.

  // Auto-update receive amount when pay amount changes
  useEffect(() => {
    const updateReceiveAmount = async () => {
      if (tradeType === 'buy' && volumeQA && parseFloat(volumeQA) > 0) {
        // When buying: QA (fiat) amount changes -> update BA (crypto) amount
        await fetchBestPriceForQuoteAssetVolume();
      } else if (tradeType === 'sell' && volumeBA && parseFloat(volumeBA) > 0) {
        // When selling: BA (crypto) amount changes -> update QA (fiat) amount
        await fetchBestPriceForBaseAssetVolume();
      }
    };

    // Debounce the update to avoid too frequent API calls
    const timeoutId = setTimeout(updateReceiveAmount, 500);
    return () => clearTimeout(timeoutId);
  }, [volumeQA, volumeBA, tradeType]);

  // Auto-update when assets change (different exchange rates)
  useEffect(() => {
    const updateForNewAssets = async () => {
      if (tradeType === 'buy' && volumeQA && parseFloat(volumeQA) > 0) {
        await fetchBestPriceForQuoteAssetVolume();
      } else if (tradeType === 'sell' && volumeBA && parseFloat(volumeBA) > 0) {
        await fetchBestPriceForBaseAssetVolume();
      }
    };

    updateForNewAssets();
  }, [assetBA, assetQA]);

  // Auto-update when trade type changes
  useEffect(() => {
    const updateForTradeType = async () => {
      if (tradeType === 'buy' && volumeQA && parseFloat(volumeQA) > 0) {
        await fetchBestPriceForQuoteAssetVolume();
      } else if (tradeType === 'sell' && volumeBA && parseFloat(volumeBA) > 0) {
        await fetchBestPriceForBaseAssetVolume();
      }
    };

    updateForTradeType();
  }, [tradeType]);

  let setup = async () => {
    try {
      await appState.generalSetup({caller: 'Trade'});
      await fetchBestPriceForQuoteAssetVolume();
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
      setItemsBA(generateBaseAssetItems());
      setItemsQA(generateQuoteAssetItems());
      setLoadingBestPrice(false);
    } catch (error) {
      log('Trade.setup: Error =', error);
      setErrorMessage('Unable to load trading data. Please try again.');
      setLoadingBestPrice(false);
    }
  };

  let fetchBestPriceForQuoteAssetVolume = async () => {
    try {
      setLoadingBestPrice(true);
      let quoteAssetVolumeFloat = parseFloat(volumeQA) || 0;
      if (quoteAssetVolumeFloat <= 0) {
        setVolumeBA('0');
        setLoadingBestPrice(false);
        return;
      }

      // Try to get live rate from CoinGecko first
      const liveRate = await getLiveExchangeRate(appState, assetBA, assetQA);
      
      if (liveRate) {
        // Use live CoinGecko rate for calculation
        const cryptoAmount = (quoteAssetVolumeFloat / liveRate).toString();
        setVolumeBA(parseFloat(cryptoAmount).toFixed(8));
        log(`Used live CoinGecko rate: 1 ${assetBA} = ${liveRate} ${assetQA}`);
      } else {
        // Fallback to internal API or demo prices
        const { getAssetPriceWithSource } = await import('src/util/liveRates');
        const priceInfo = getAssetPriceWithSource(appState, assetBA, assetQA);
        
        if (priceInfo.price) {
          const cryptoAmount = (quoteAssetVolumeFloat / priceInfo.price).toString();
          setVolumeBA(parseFloat(cryptoAmount).toFixed(8));
          log(`Used ${priceInfo.label} rate: 1 ${assetBA} = ${priceInfo.price} ${assetQA}`);
        } else {
          // Use a demo rate as last resort
          const demoRate = assetBA === 'BTC' ? 45000 : 2800; // Demo prices
          const cryptoAmount = (quoteAssetVolumeFloat / demoRate).toString();
          setVolumeBA(parseFloat(cryptoAmount).toFixed(8));
          log(`Used DEMO rate: 1 ${assetBA} = ${demoRate} ${assetQA} (no live data available)`);
        }
      }
      
      setLoadingBestPrice(false);
    } catch (error) {
      log('fetchBestPriceForQuoteAssetVolume: Error =', error);
      setLoadingBestPrice(false);
    }
  };

  let fetchBestPriceForBaseAssetVolume = async () => {
    try {
      setLoadingBestPrice(true);
      let baseAssetVolumeFloat = parseFloat(volumeBA) || 0;
      if (baseAssetVolumeFloat <= 0) {
        setVolumeQA('0');
        setLoadingBestPrice(false);
        return;
      }

      // Try to get live rate from CoinGecko first
      const liveRate = await getLiveExchangeRate(appState, assetBA, assetQA);
      
      if (liveRate) {
        // Use live CoinGecko rate for calculation
        const fiatAmount = (baseAssetVolumeFloat * liveRate).toString();
        setVolumeQA(parseFloat(fiatAmount).toFixed(2));
        log(`Used live CoinGecko rate: 1 ${assetBA} = ${liveRate} ${assetQA}`);
      } else {
        // Fallback to internal API or demo prices
        const { getAssetPriceWithSource } = await import('src/util/liveRates');
        const priceInfo = getAssetPriceWithSource(appState, assetBA, assetQA);
        
        if (priceInfo.price) {
          const fiatAmount = (baseAssetVolumeFloat * priceInfo.price).toString();
          setVolumeQA(parseFloat(fiatAmount).toFixed(2));
          log(`Used ${priceInfo.label} rate: 1 ${assetBA} = ${priceInfo.price} ${assetQA}`);
        } else {
          // Use a demo rate as last resort
          const demoRate = assetBA === 'BTC' ? 45000 : 2800; // Demo prices
          const fiatAmount = (baseAssetVolumeFloat * demoRate).toString();
          setVolumeQA(parseFloat(fiatAmount).toFixed(2));
          log(`Used DEMO rate: 1 ${assetBA} = ${demoRate} ${assetQA} (no live data available)`);
        }
      }
      
      setLoadingBestPrice(false);
    } catch (error) {
      log('fetchBestPriceForBaseAssetVolume: Error =', error);
      setLoadingBestPrice(false);
    }
  };

  let generatePriceDescription = () => {
    if (loadingBestPrice) return 'Loading current price...';
    
    let baseAssetDisplayString = appState.getAssetInfo(assetBA).displayString;
    let quoteAssetDisplayString = appState.getAssetInfo(assetQA).displayString;
    
    if (!volumeBA || !volumeQA || volumeBA === '0' || volumeQA === '0') {
      return `Enter amount to see ${baseAssetDisplayString}/${quoteAssetDisplayString} rate`;
    }
    
    try {
      let rate = Big(volumeQA).div(Big(volumeBA));
      
      // Check if we're using live CoinGecko data
      const tickerData = appState.apiData?.ticker || {};
      const marketKey = `${assetBA}/${assetQA}`;
      const isLiveRate = tickerData[marketKey]?.source === 'coingecko';
      const rateSource = isLiveRate ? '🟢 Live' : '📊 Estimate';
      
      return `${rateSource}: 1 ${baseAssetDisplayString} = ${rate.toFixed(2)} ${quoteAssetDisplayString}`;
    } catch (error) {
      return 'Price calculation error';
    }
  };

  let startTradeRequest = () => {
    console.log('\n' + '🔀'.repeat(60));
    console.log('🚨 START TRADE REQUEST CALLED! 🚨');
    console.log(`📊 Trade Type: ${tradeType}`);
    console.log('🔀'.repeat(60));
    
    if (tradeType === 'buy') {
      console.log('🟢 CALLING startBuyRequest()');
      return startBuyRequest();
    } else {
      console.log('🔴 CALLING startSellRequest()');
      return startSellRequest();
    }
  };

  let startBuyRequest = () => {
    // Validate input
    if (!volumeQA || parseFloat(volumeQA) <= 0) {
      setErrorMessage('Please enter a valid amount to buy.');
      return;
    }

    // Store order details in appropriate panel
    _.assign(appState.panels.buy, {
      volumeQA: volumeQA,
      assetQA: assetQA,
      volumeBA: volumeBA,
      assetBA: assetBA,
      activeOrder: true
    });

    if (!appState.user.isAuthenticated) {
      return appState.authenticateUser();
    }

    return appState.changeState('ChooseHowToPay');
  };

  let startSellRequest = () => {
    console.log('\n' + '🔶'.repeat(60));
    console.log('🚨 SELL REQUEST STARTED! 🚨');
    console.log(`📊 Trade Type: ${tradeType}`);
    console.log(`📦 Volume BA: ${volumeBA}`);
    console.log(`📦 Volume QA: ${volumeQA}`);
    console.log(`🪙 Asset BA: ${assetBA}`);
    console.log(`🪙 Asset QA: ${assetQA}`);
    console.log(`🔐 Is Authenticated: ${appState.user.isAuthenticated}`);
    console.log('🔶'.repeat(60));
    
    // Validate input
    if (!volumeBA || parseFloat(volumeBA) <= 0) {
      console.log('❌ SELL REQUEST FAILED: Invalid volume');
      setErrorMessage('Please enter a valid amount to sell.');
      return;
    }

    // Store order details in appropriate panel
    _.assign(appState.panels.sell, {
      volumeQA: volumeQA,
      assetQA: assetQA,
      volumeBA: volumeBA,
      assetBA: assetBA,
      activeOrder: true
    });

    console.log('✅ SELL ORDER STORED IN PANELS.SELL');
    console.log('🔄 NAVIGATING TO ChooseHowToReceivePayment');

    if (!appState.user.isAuthenticated) {
      console.log('🔐 NOT AUTHENTICATED - REDIRECTING TO AUTH');
      return appState.authenticateUser();
    }

    return appState.changeState('ChooseHowToReceivePayment');
  };

  // Function to get balance for an asset
  const getBalance = (asset) => {
    try {
      const balances = appState.apiData?.balance || {};
      const balance = balances[asset];
      if (balance && typeof balance === 'object' && balance.balance !== undefined) {
        return parseFloat(balance.balance).toFixed(asset === 'GBP' ? 2 : 8);
      }
      return '0.00';
    } catch (error) {
      return '0.00';
    }
  };

  const materialTheme = useTheme();

  return (
    <View style={{ 
      flex: 1, 
      backgroundColor: materialTheme.colors.background,
    }}>
      <KeyboardAwareScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ 
          padding: 16,
          backgroundColor: materialTheme.colors.background
        }}
        keyboardShouldPersistTaps='handled'
      >
        
    <SegmentedButtons
              value={tradeType}
              onValueChange={setTradeType}
              buttons={[
                {
                  value: 'buy',
                  label: 'Buy',
                  icon: 'trending-up',
                  style: tradeType === 'buy' ? { backgroundColor: '#4CAF50' } : {},
                  labelStyle: tradeType === 'buy' ? { color: 'white' } : {}
                },
                {
                  value: 'sell',
                  label: 'Sell', 
                  icon: 'trending-down',
                  style: tradeType === 'sell' ? { backgroundColor: '#1565C0' } : {},
                  labelStyle: tradeType === 'sell' ? { color: 'white' } : {}
                },
              ]}
              style={{ marginBottom: 8 }}
            />

        {/* Trade Type Selector */}
        {/* <Card style={{ marginBottom: 16, elevation: 2 }}>
          <Card.Content>
            <Text variant="titleMedium" style={{ marginBottom: 12, color: materialTheme.colors.primary }}>
              📈 Trade Type
            </Text>
            <SegmentedButtons
              value={tradeType}
              onValueChange={setTradeType}
              buttons={[
                {
                  value: 'buy',
                  label: 'Buy',
                  icon: 'trending-up',
                  style: tradeType === 'buy' ? { backgroundColor: '#4CAF50' } : {},
                  labelStyle: tradeType === 'buy' ? { color: 'white' } : {}
                },
                {
                  value: 'sell',
                  label: 'Sell', 
                  icon: 'trending-down',
                  style: tradeType === 'sell' ? { backgroundColor: '#1565C0' } : {},
                  labelStyle: tradeType === 'sell' ? { color: 'white' } : {}
                },
              ]}
              style={{ marginBottom: 8 }}
            />
          </Card.Content>
        </Card> */}

        {/* Trading Form */}
        <Card style={{ marginBottom: 16, elevation: 2 }}>
          <Card.Content>
            {/* Trade Type Indicator */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
              <Icon 
                source={tradeType === 'buy' ? "arrow-down" : "arrow-up"} 
                size={32} 
                color={tradeType === 'buy' ? '#4CAF50' : '#1565C0'} 
              />
              <Text variant="headlineSmall" style={{ 
                marginLeft: 8,
                color: tradeType === 'buy' ? '#4CAF50' : '#1565C0',
                fontWeight: 'bold'
              }}>
                {tradeType === 'buy' ? 'BUY' : 'SELL'}
              </Text>
            </View>

            {/* Two Column Layout */}
            <View style={{ flexDirection: 'row', gap: 16 }}>
              
              {/* Left Column - FROM */}
              <View style={{ flex: 1 }}>
                <Text variant="titleMedium" style={{ 
                  textAlign: 'center', 
                  marginBottom: 16, 
                  color: materialTheme.colors.primary,
                  fontWeight: '600'
                }}>
                  FROM
                </Text>
                
                {/* Asset Selection */}
                <View style={{ marginBottom: 12, zIndex: tradeType === 'buy' ? 1000 : 2000 }}>
                  <DropDownPicker
                    open={tradeType === 'buy' ? openQA : openBA}
                    value={tradeType === 'buy' ? assetQA : assetBA}
                    items={tradeType === 'buy' ? itemsQA : itemsBA}
                    setOpen={tradeType === 'buy' ? setOpenQA : setOpenBA}
                    setValue={tradeType === 'buy' ? setAssetQA : setAssetBA}
                    setItems={tradeType === 'buy' ? setItemsQA : setItemsBA}
                    placeholder={tradeType === 'buy' ? "Pay with" : "Sell"}
                    style={{ 
                      borderColor: materialTheme.colors.outline,
                      height: 56,
                      backgroundColor: materialTheme.colors.surface
                    }}
                    dropDownContainerStyle={{ 
                      borderColor: materialTheme.colors.outline,
                      backgroundColor: materialTheme.colors.surface,
                      zIndex: 3000
                    }}
                    listMode="SCROLLVIEW"
                    scrollViewProps={{ nestedScrollEnabled: true }}
                  />
                </View>

                {/* Amount Input */}
                <TextInput
                  label="Amount"
                  value={tradeType === 'buy' ? volumeQA : volumeBA}
                  onChangeText={tradeType === 'buy' ? setVolumeQA : setVolumeBA}
                  keyboardType="numeric"
                  mode="outlined"
                  style={{ 
                    backgroundColor: materialTheme.colors.surface,
                    marginBottom: 8
                  }}
                />

                {/* Balance Display */}
                <Text variant="bodySmall" style={{ 
                  textAlign: 'center', 
                  color: materialTheme.colors.onSurfaceVariant 
                }}>
                  Balance: {getBalance(tradeType === 'buy' ? assetQA : assetBA)} {tradeType === 'buy' ? assetQA : assetBA}
                </Text>
              </View>

              {/* Center Arrow */}
              <View style={{ 
                justifyContent: 'center', 
                alignItems: 'center',
                paddingHorizontal: 8,
                paddingTop: 40
              }}>
                <Icon 
                  source="arrow-right" 
                  size={24} 
                  color={materialTheme.colors.primary} 
                />
              </View>

              {/* Right Column - TO */}
              <View style={{ flex: 1 }}>
                <Text variant="titleMedium" style={{ 
                  textAlign: 'center', 
                  marginBottom: 16, 
                  color: materialTheme.colors.primary,
                  fontWeight: '600'
                }}>
                  TO
                </Text>
                
                {/* Asset Selection */}
                <View style={{ marginBottom: 12, zIndex: tradeType === 'buy' ? 2000 : 1000 }}>
                  <DropDownPicker
                    open={tradeType === 'buy' ? openBA : openQA}
                    value={tradeType === 'buy' ? assetBA : assetQA}
                    items={tradeType === 'buy' ? itemsBA : itemsQA}
                    setOpen={tradeType === 'buy' ? setOpenBA : setOpenQA}
                    setValue={tradeType === 'buy' ? setAssetBA : setAssetQA}
                    setItems={tradeType === 'buy' ? setItemsBA : setItemsQA}
                    placeholder={tradeType === 'buy' ? "Buy" : "Receive"}
                    style={{ 
                      borderColor: materialTheme.colors.outline,
                      height: 56,
                      backgroundColor: materialTheme.colors.surface
                    }}
                    dropDownContainerStyle={{ 
                      borderColor: materialTheme.colors.outline,
                      backgroundColor: materialTheme.colors.surface,
                      zIndex: 3000
                    }}
                    listMode="SCROLLVIEW"
                    scrollViewProps={{ nestedScrollEnabled: true }}
                  />
                </View>

                {/* Amount Display (Auto-calculated) */}
                <TextInput
                  label="You receive"
                  value={tradeType === 'buy' ? volumeBA : volumeQA}
                  editable={false}
                  mode="outlined"
                  style={{ 
                    backgroundColor: materialTheme.colors.surfaceVariant,
                    marginBottom: 8
                  }}
                  right={<TextInput.Icon icon="calculator" />}
                />

                {/* Balance Display */}
                <Text variant="bodySmall" style={{ 
                  textAlign: 'center', 
                  color: materialTheme.colors.onSurfaceVariant 
                }}>
                  Balance: {getBalance(tradeType === 'buy' ? assetBA : assetQA)} {tradeType === 'buy' ? assetBA : assetQA}
                </Text>
              </View>
            </View>

            {/* Exchange Rate Display */}
            <Surface style={{ 
              padding: 12, 
              borderRadius: 8, 
              marginTop: 20,
              backgroundColor: materialTheme.colors.surfaceVariant
            }}>
              <Text variant="bodyMedium" style={{ 
                textAlign: 'center',
                color: materialTheme.colors.onSurfaceVariant
              }}>
                {generatePriceDescription()}
              </Text>
            </Surface>

            {/* Error Message */}
            {errorMessage && (
              <HelperText type="error" style={{ marginTop: 8, textAlign: 'center' }}>
                {errorMessage}
              </HelperText>
            )}
          </Card.Content>
        </Card>

        {/* Trade Button */}
        <Button
          mode="contained"
          onPress={startTradeRequest}
          style={{ 
            marginBottom: 16, 
            paddingVertical: 12,
            borderRadius: 16,
            elevation: 3,
            backgroundColor: tradeType === 'buy' ? '#4CAF50' : '#1565C0'
          }}
          contentStyle={{ paddingVertical: 4 }}
          labelStyle={{ fontSize: 18, fontWeight: '600', color: 'white' }}
          icon={tradeType === 'buy' ? "trending-up" : "trending-down"}
          loading={loadingBestPrice}
          disabled={loadingBestPrice}
        >
          {tradeType === 'buy' ? 'Buy Now' : 'Sell Now'}
        </Button>

        <View style={{ height: 20 }} />
      </KeyboardAwareScrollView>
    </View>
  )
};

export default Trade;
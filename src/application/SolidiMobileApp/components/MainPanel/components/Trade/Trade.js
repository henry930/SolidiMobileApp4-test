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
  let generateBaseAssetItems = () => { return deriveAssetItems(appState.getBaseAssets()) }
  let generateQuoteAssetItems = () => { return deriveAssetItems(appState.getQuoteAssets()) }

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

      let bestPrice = await appState.getBestPrice({
        volumeQA: volumeQA,
        assetQA: assetQA,
        assetBA: assetBA,
        side: tradeType // Use the current trade type
      });

      if (appState.stateChangeIDHasChanged(stateChangeID)) return;

      if (bestPrice && bestPrice.volumeBA) {
        setVolumeBA(bestPrice.volumeBA);
      }
      setLoadingBestPrice(false);
    } catch (error) {
      log('fetchBestPriceForQuoteAssetVolume: Error =', error);
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
      return `1 ${baseAssetDisplayString} = ${rate.toFixed(2)} ${quoteAssetDisplayString}`;
    } catch (error) {
      return 'Price calculation error';
    }
  };

  let startTradeRequest = () => {
    if (tradeType === 'buy') {
      return startBuyRequest();
    } else {
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
    // Validate input
    if (!volumeBA || parseFloat(volumeBA) <= 0) {
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

    if (!appState.user.isAuthenticated) {
      return appState.authenticateUser();
    }

    return appState.changeState('ChooseHowToReceivePayment');
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
            <Text variant="titleMedium" style={{ marginBottom: 16, color: materialTheme.colors.primary }}>
              💱 {tradeType === 'buy' ? 'Buy' : 'Sell'} Order
            </Text>

            {/* Amount Input */}
            <TextInput
              label={tradeType === 'buy' ? 'Amount to spend (GBP)' : 'Amount to sell'}
              value={tradeType === 'buy' ? volumeQA : volumeBA}
              onChangeText={tradeType === 'buy' ? setVolumeQA : setVolumeBA}
              keyboardType="numeric"
              mode="outlined"
              style={{ marginBottom: 16 }}
              right={<TextInput.Icon icon="currency-gbp" />}
            />

            {/* Asset Dropdowns */}
            <View style={{ marginBottom: 16, zIndex: 2000 }}>
              <Text variant="bodyMedium" style={{ marginBottom: 8 }}>
                {tradeType === 'buy' ? 'Cryptocurrency to buy:' : 'Cryptocurrency to sell:'}
              </Text>
              <DropDownPicker
                open={openBA}
                value={assetBA}
                items={itemsBA}
                setOpen={setOpenBA}
                setValue={setAssetBA}
                setItems={setItemsBA}
                placeholder="Select cryptocurrency"
                style={{ borderColor: materialTheme.colors.outline }}
                dropDownContainerStyle={{ borderColor: materialTheme.colors.outline }}
              />
            </View>

            <View style={{ marginBottom: 16, zIndex: 1000 }}>
              <Text variant="bodyMedium" style={{ marginBottom: 8 }}>
                {tradeType === 'buy' ? 'Currency to pay with:' : 'Currency to receive:'}
              </Text>
              <DropDownPicker
                open={openQA}
                value={assetQA}
                items={itemsQA}
                setOpen={setOpenQA}
                setValue={setAssetQA}
                setItems={setItemsQA}
                placeholder="Select currency"
                style={{ borderColor: materialTheme.colors.outline }}
                dropDownContainerStyle={{ borderColor: materialTheme.colors.outline }}
              />
            </View>

            {/* Price Display */}
            <Surface style={{ 
              padding: 12, 
              borderRadius: 8, 
              marginBottom: 16,
              backgroundColor: tradeType === 'buy' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(21, 101, 192, 0.1)'
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon 
                  source={tradeType === 'buy' ? "trending-up" : "trending-down"} 
                  size={20} 
                  color={tradeType === 'buy' ? '#4CAF50' : '#1565C0'} 
                />
                <Text variant="bodyMedium" style={{ 
                  marginLeft: 8,
                  color: tradeType === 'buy' ? '#2E7D32' : '#1565C0',
                  fontWeight: '600'
                }}>
                  {generatePriceDescription()}
                </Text>
              </View>
            </Surface>

            {/* Result Display */}
            {(tradeType === 'buy' ? volumeBA : volumeQA) !== '0' && (
              <Surface style={{ 
                padding: 12, 
                borderRadius: 8, 
                marginBottom: 16,
                backgroundColor: materialTheme.colors.surfaceVariant
              }}>
                <Text variant="bodyMedium" style={{ textAlign: 'center' }}>
                  {tradeType === 'buy' 
                    ? `You will receive: ${volumeBA} ${appState.getAssetInfo(assetBA).displayString}`
                    : `You will receive: ${volumeQA} ${appState.getAssetInfo(assetQA).displayString}`
                  }
                </Text>
              </Surface>
            )}

            {/* Error Message */}
            {errorMessage && (
              <HelperText type="error" style={{ marginBottom: 16 }}>
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
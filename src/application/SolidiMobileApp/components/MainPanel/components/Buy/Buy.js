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
import { sharedStyles as styles, layoutStyles as layout, textStyles as text, cardStyles as cards, buttonStyles as buttons, formStyles as forms, buyStyles } from 'src/styles';
import ImageLookup from 'src/images';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('Buy');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);


/* Notes

We don't use a loading spinner here. Instead, we show '[loading]' for the baseAsset amount until we get price data back from the server.

We focus on keeping the fiat quoteAsset volume (at the moment, only GBP) constant, because our target customer thinks in terms of GBP rather than in amounts of a crypto asset.

User changes a value:
- Either baseAssetVolume or quoteAssetVolume can be changed.
- We then need to automatically update the other volume.
- We send the changed volume to the API to query the best available price for this volume (in terms of the other volume).

*/




let Buy = () => {

  let appState = useContext(AppStateContext);
  let firstRender = misc.useFirstRender();
  let stateChangeID = appState.stateChangeID;

  let pageName = appState.pageName;
  let permittedPageNames = 'default'.split(' ');
  misc.confirmItemInArray('permittedPageNames', permittedPageNames, pageName, 'Buy');

  // Keep track of the last user action that changed an aspect of the order.
  // - It's 'volumeQA' at the beginning so that the trigger functions act appropriately.
  let [lastUserInput, setLastUserInput] = useState('volumeQA');

  // Defaults.
  let selectedAssetBA = 'BTC';
  let selectedVolumeBA = '[loading]'; // On first render, we send the selectedVolumeQA to the API to get the best price.
  let selectedAssetQA = 'GBP';
  let selectedVolumeQA = '10';

  // Function that derives dropdown properties from an asset list.
  let deriveAssetItems = (assets) => {
    return assets.map(asset => {
      let info = appState.getAssetInfo(asset);
      let assetIcon = appState.getAssetIcon(asset);
      let assetItem = {
        label: info.displayString,
        value: info.displaySymbol,
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
  // Use getAvailableAssets() to get all assets from the balance API response
  let generateBaseAssetItems = () => { 
    console.log('\n' + '🔷'.repeat(60));
    console.log('🔷 [BUY] generateBaseAssetItems CALLED');
    let availableAssets = appState.getAvailableAssets();
    console.log('🔷 [BUY] Available assets from balance API:', availableAssets);
    // Filter to crypto assets (exclude fiat currencies like GBP, USD, EUR)
    let cryptoAssets = availableAssets.filter(asset => !['GBP', 'USD', 'EUR'].includes(asset));
    console.log('🔷 [BUY] Crypto assets (after filtering):', cryptoAssets);
    let hardcodedAssets = appState.getBaseAssets();
    console.log('🔷 [BUY] Hardcoded base assets (fallback):', hardcodedAssets);
    
    let finalAssets = cryptoAssets.length > 0 ? cryptoAssets : hardcodedAssets;
    console.log('🔷 [BUY] ⚠️ USING:', cryptoAssets.length > 0 ? '✅ BALANCE API LIST' : '❌ HARDCODED LIST');
    console.log('🔷 [BUY] Final base assets:', finalAssets);
    console.log('🔷'.repeat(60) + '\n');
    return deriveAssetItems(finalAssets);
  }
  let generateQuoteAssetItems = () => { 
    console.log('\n' + '🔶'.repeat(60));
    console.log('🔶 [BUY] generateQuoteAssetItems CALLED');
    let availableAssets = appState.getAvailableAssets();
    console.log('🔶 [BUY] Available assets from balance API:', availableAssets);
    // Filter to fiat currencies for quote assets
    let fiatAssets = availableAssets.filter(asset => ['GBP', 'USD', 'EUR'].includes(asset));
    console.log('🔶 [BUY] Fiat assets (after filtering):', fiatAssets);
    let hardcodedAssets = appState.getQuoteAssets();
    console.log('🔶 [BUY] Hardcoded quote assets (fallback):', hardcodedAssets);
    
    let finalAssets = fiatAssets.length > 0 ? fiatAssets : hardcodedAssets;
    console.log('🔶 [BUY] ⚠️ USING:', fiatAssets.length > 0 ? '✅ BALANCE API LIST' : '❌ HARDCODED LIST');
    console.log('🔶 [BUY] Final quote assets:', finalAssets);
    console.log('🔶'.repeat(60) + '\n');
    return deriveAssetItems(finalAssets);
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
  useEffect( () => {
    setup();
  }, []); // Pass empty array to only run once on mount.


  let setup = async () => {
    try {
      await appState.generalSetup({caller: 'Buy'});
      // Balance data is now loaded during authentication (cached)
      await fetchBestPriceForQuoteAssetVolume();
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
      // Generate asset items from cached balance data
      setItemsBA(generateBaseAssetItems());
      setItemsQA(generateQuoteAssetItems());
      setNewAPIVersionDetected(appState.checkLatestAPIVersion());
      setLoadingBestPrice(false);

      let market = assetBA + '/' + assetQA;
      let period = "2H";
      await appState.loadHistoricPrices({market, period});
    } catch(err) {
      let msg = `Buy.setup: Error = ${err}`;
      console.log(msg);
    }
  }


  let fetchBestPriceForQuoteAssetVolume = async () => {
    // We know the quoteAssetVolume. We want to find the best price in terms of baseAssetVolume.
    if (appState.stateChangeIDHasChanged(stateChangeID)) return;
    log(`START fetchBestPriceForQuoteAssetVolume: volumeQA = ${volumeQA}`);
    if (lastUserInput == 'volumeBA') {
      /*
      - If the user changes volumeQA, this will cause best price (volumeBA) to be fetched.
      - This clause prevents the volumeBA change from causing best price (volumeQA) to be fetched for a second time (which would then be a recursive event loop).
      */
      log(`- lastUserInput = ${lastUserInput}. Stopping here.`);
      return;
    }
    let invalidVolumeQA = false;
    if (! misc.isNumericString(volumeQA)) invalidVolumeQA = true;
    if (volumeQA === '') invalidVolumeQA = true;
    if (volumeQA.match(/^0+$/)) invalidVolumeQA = true; // only zeros.
    if (volumeQA.match(/^0+\.0+$/)) invalidVolumeQA = true; // only zeros.
    if (! misc.isNumericString(volumeQA)) invalidVolumeQA = true;
    if (invalidVolumeQA) {
      log('- invalid volumeQA value');
      setErrorMessage('');
      return;
    }
    setLoadingBestPrice(true);
    setVolumeBA('[loading]');
    appState.abortAllRequests({tag: 'best_volume_price'}); // Bit hacky but we'll do this for now to speed up the price updates (by ignoring any best price requests in the pipeline).
    // This also avoids any problem with previous best price requests trying to update the state.
    let market = assetBA + '/' + assetQA;
    let side = 'BUY';
    let params = {market, side, baseOrQuoteAsset: 'quote', quoteAssetVolume: volumeQA};
    let output = await appState.fetchBestPriceForASpecificVolume(params);
    lj({output});
    if (appState.stateChangeIDHasChanged(stateChangeID)) return;
    if (_.isUndefined(output)) {
      // Happens if the request was aborted.
      return;
    }
    //lj(output);
    if (_.has(output, 'error')) {
      setVolumeBA('[not loaded]');
      let error = output.error;
      if (error == "ValidationError: INSUFFICIENT_ORDERBOOK_VOLUME") {
        let msg = `Unfortunately, we don't currently have enough ${assetBA} in stock to match ${volumeQA} ${assetQA}.`;
        let quoteDP = appState.getAssetInfo(assetQA).decimalPlaces;
        let minVolumeQA = '0.' + '0'.repeat(quoteDP - 1) + '1'; // e.g. "0.01"
        if (! (Big(volumeQA).eq(minVolumeQA))) {
          msg += ` Please choose a lower ${assetQA} amount.`;
        } else {
          msg += ` The ${market} market is currently empty.`;
        }
        setErrorMessage(msg);
      } else if (error == "ValidationError: QUOTE_VOLUME_IS_TOO_SMALL") {
        let msg = `Unfortunately, ${volumeQA} ${assetQA} is too small an amount for us to process. Please choose a larger ${assetQA} amount.`;
        setErrorMessage(msg);
      } else {
        setErrorMessage(misc.itemToString(output.error));
      }
    } else {
      setErrorMessage('');
    }
    if (_.has(output, 'price')) {
      let bestPrice = output.price;
      log("New baseAssetVolume: " + bestPrice);
      if (assetBA == 'ETH') bestPrice = Big(bestPrice).toFixed(8); // hacky.
      setVolumeBA(bestPrice);
    }
    setLoadingBestPrice(false);
  }

  // When volumeQA is changed, get a new volumeBA value.
  useEffect(() => {
    if (! firstRender) fetchBestPriceForQuoteAssetVolume();
  }, [volumeQA]);

  // When either asset is changed, get new volumeBA value. Hold volumeQA steady.
  // - Exception: If volumeQA isn't a valid numeric string.
  useEffect(() => {
    if (! firstRender) {
      if (! misc.isNumericString(volumeQA)) {
        fetchBestPriceForBaseAssetVolume();
      } else {
        fetchBestPriceForQuoteAssetVolume();
      }
    }
  }, [assetBA, assetQA]);
 

  let fetchBestPriceForBaseAssetVolume = async () => {
    // We know the baseAssetVolume. We want to find the best price in terms of quoteAssetVolume.
    log(`START fetchBestPriceForBaseAssetVolume: volumeBA = ${volumeBA}`);
    if (lastUserInput == 'volumeQA') {
      /*
      - If the user changes volumeBA, this will cause best price (volumeQA) to be fetched.
      - This clause prevents the volumeQA change from causing best price (volumeBA) to be fetched for a second time (which would then be a recursive event loop).
      */
      log(`- lastUserInput = ${lastUserInput}. Stopping here.`);
      return;
    }
    let invalidVolumeBA = false;
    if (! misc.isNumericString(volumeBA)) invalidVolumeBA = true;
    if (volumeBA === '') invalidVolumeBA = true;
    if (volumeBA.match(/^0+$/)) invalidVolumeBA = true; // only zeros.
    if (volumeBA.match(/^0+\.0+$/)) invalidVolumeBA = true; // only zeros.
    if (! misc.isNumericString(volumeBA)) invalidVolumeBA = true;
    if (invalidVolumeBA) {
      log('- invalid volumeBA value');
      setErrorMessage('');
      return;
    }
    setLoadingBestPrice(true);
    setVolumeQA('[loading]');
    appState.abortAllRequests({tag: 'best_volume_price'}); // Bit hacky but we'll do this for now to speed up the price updates (by ignoring any best price requests in the pipeline).
    // This also avoids any problem with previous best price requests trying to update the state.
    let market = assetBA + '/' + assetQA;
    let params = {market, side: 'BUY', baseOrQuoteAsset: 'base', baseAssetVolume: volumeBA};
    let output = await appState.fetchBestPriceForASpecificVolume(params);
    if (appState.stateChangeIDHasChanged(stateChangeID)) return;
    if (_.isUndefined(output)) {
      // Happens if the request was aborted.
      return;
    }
    //lj(output);
    if (_.has(output, 'error')) {
      setVolumeQA('[not loaded]');
      let error = output.error;
      if (error == "ValidationError: INSUFFICIENT_ORDERBOOK_VOLUME") {
        let msg = `Unfortunately, we don't currently have enough ${assetQA} in stock to match ${volumeBA} ${assetBA}.`;
        let baseDP = appState.getAssetInfo(assetBA).decimalPlaces;
        let minVolumeBA = '0.' + '0'.repeat(baseDP - 1) + '1'; // e.g. "0.00000001"
        if (! (Big(volumeBA).eq(minVolumeBA))) {
          msg += ` Please choose a lower ${assetBA} amount.`;
        } else {
          msg += ` The ${market} market is currently empty.`;
        }
        setErrorMessage(msg);
      } else if (error == "ValidationError: QUOTE_VOLUME_IS_TOO_SMALL") {
        let msg = `Unfortunately, ${volumeBA} ${assetBA} is too small an amount for us to process. Please choose a larger ${assetBA} amount.`;
        setErrorMessage(msg);
      } else {
        setErrorMessage(misc.itemToString(output.error));
      }
    } else {
      setErrorMessage('');
    }
    if (_.has(output, 'price')) {
      let bestPrice = output.price;
      log("New quoteAssetVolume: " + bestPrice);
      setVolumeQA(bestPrice);
    }
    setLoadingBestPrice(false);
  }

  // When volumeBA is changed, get a new volumeQA value.
  useEffect(() => {
    if (! firstRender) fetchBestPriceForBaseAssetVolume();
  }, [volumeBA]);


  let validateAndSetVolumeBA = (newVolumeBA) => {
    setLastUserInput('volumeBA');
    let baseDP = appState.getAssetInfo(assetBA).decimalPlaces;
    // This matches a digit sequence + optional period + optional digit sequence.
    // The second digit sequence can only be as long as the baseAsset's decimalPlaces.
    let regexString = `^\\d+(\\.\\d{0,${baseDP}})?$`;
    let regex = new RegExp(regexString);
    if (! _.isString(newVolumeBA)) {
      // Not sure if this could actually happen.
    } else if (_.isEmpty(newVolumeBA)) {
      // We permit the user to completely empty the input box. It feels better.
      setVolumeBA(newVolumeBA);
    } else if (volumeBA == '[not loaded]') {
      // Allow user to wipe the value '[not loaded]'.
      setVolumeBA('');
    } else if (! regex.test(newVolumeBA)) {
      // No need to do anything. The input simply won't accept any non decimal-string input,
      // such as symbols or alphabet characters.
    } else {
      // Valid input.
      setVolumeBA(newVolumeBA);
    }
  }

  let validateAndSetVolumeQA = (newVolumeQA) => {
    setLastUserInput('volumeQA');
    let quoteDP = appState.getAssetInfo(assetQA).decimalPlaces;
    // This matches a digit sequence + optional (period + digit sequence).
    // The second digit sequence can only be as long as the quoteAsset's decimalPlaces.
    let regexString = `^\\d+(\\.\\d{0,${quoteDP}})?$`;
    let regex = new RegExp(regexString);
    if (! _.isString(newVolumeQA)) {
      // Not sure if this could actually happen.
    } else if (_.isEmpty(newVolumeQA)) {
      // We permit the user to completely empty the input box. It feels better.
      setVolumeQA(newVolumeQA);
    } else if (volumeQA == '[not loaded]') {
      // Allow user to wipe the value '[not loaded]'.
      setVolumeQA('');
    } else if (! regex.test(newVolumeQA)) {
      // No need to do anything. The input simply won't accept any non decimal-string input,
      // such as symbols or alphabet characters.
    } else {
      // Valid input.
      setVolumeQA(newVolumeQA);
    }
  }


  let generatePriceDescription = () => {
    // Calculate price from the ratio of volumeQA to volumeBA.
    let quoteDP = appState.getAssetInfo(assetQA).decimalPlaces;
    let priceString = '';
    if (! loadingBestPrice) {
      if (misc.isNumericString(volumeQA) && misc.isNumericString(volumeBA)) {
        if (
          ! volumeQA.match(/^0+$/) && ! volumeQA.match(/^0+\.0+$/) &&
          ! volumeBA.match(/^0+$/) && ! volumeBA.match(/^0+\.0+$/)
        ) {
          priceString = Big(volumeQA).div(Big(volumeBA)).toFixed(quoteDP);
        }
      }
    }
    let market = assetBA + '/' + assetQA;
    //log(`Market price for ${market} market = ${priceString}`);
    let description = '';
    if (priceString) {
      description = `1 ${assetBA} = ${priceString} ${assetQA}`;
    }
    return description;
  }


  let startBuyRequest = async () => {

    if (volumeBA == '[loading]') {
      return setErrorMessage(`Please wait a moment. Price data hasn't been loaded yet.`);
    }

    if (! misc.isNumericString(volumeBA) || ! misc.isNumericString(volumeQA)) {
      var msg = `Error: Price data has not been loaded.`;
      return setErrorMessage(msg);
    }

    // Save the order details in the global state.
    // We enforce the full decimal value just in case.
    let volumeQA2 = appState.getFullDecimalValue({asset: assetQA, value: volumeQA, functionName: 'Buy'});
    let volumeBA2 = appState.getFullDecimalValue({asset: assetBA, value: volumeBA, functionName: 'Buy'});
    _.assign(appState.panels.buy, {volumeQA:volumeQA2, assetQA, volumeBA:volumeBA2, assetBA});

    // Store the fact that we have an active BUY order.
    appState.panels.buy.activeOrder = true;

    /* Check if the user is logged in, and redirect them if they aren't.
    - This happens here, rather than earlier, because we want the user to make the choice to buy prior to having to authenticate.
    - After authentication, we'll redirect to ChooseHowToPay (which will send the order when the user clicks the "Confirm & Pay" button).
    */
    if (! appState.user.isAuthenticated) {
      return appState.authenticateUser();
    }

    return appState.changeState('ChooseHowToPay');
  }


  let getDomain = () => {
    let domain = appState.domain;
    log(`getDomain: domain = ${domain}`);
    return domain;
  }


  let upgradeRequired = () => {
    return (
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <Icon source="alert-circle" size={24} color={materialTheme.colors.onSecondaryContainer} />
          <Text variant="titleMedium" style={{ 
            marginLeft: 8, 
            color: materialTheme.colors.onSecondaryContainer,
            fontWeight: 'bold'
          }}>
            App Update Required
          </Text>
        </View>
        <Text variant="bodyMedium" style={{ 
          marginBottom: 16,
          color: materialTheme.colors.onSecondaryContainer,
          lineHeight: 20
        }}>
          Solidi has finished a major new release. Please upgrade to switch over to the new system. 
          Visit our website for instructions.
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Text variant="bodyMedium" style={{ color: materialTheme.colors.onSecondaryContainer }}>
            If you have any trouble, please{' '}
          </Text>
          <Button 
            mode="text" 
            onPress={() => { appState.changeState('ContactUs') }}
            compact={true}
            textColor={materialTheme.colors.primary}
          >
            Contact Us
          </Button>
        </View>
      </View>
    )
  }


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
        
        {/* Hero Image Header */}
        <Card style={{ marginBottom: 16, elevation: 2, overflow: 'hidden' }}>
          <View style={{ position: 'relative', height: scaledHeight(180) }}>
            <Image 
              source={ImageLookup.buy} 
              style={{ 
                width: '100%', 
                height: '100%', 
                resizeMode: 'cover',
                opacity: 0.9
              }} 
            />
            <View style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: 'rgba(76, 175, 80, 0.8)', // Green overlay for buy
              padding: 16
            }}>
              <Text variant="headlineSmall" style={{ 
                color: 'white',
                fontWeight: 'bold',
                textAlign: 'center'
              }}>
                🛒 Buy Cryptocurrency
              </Text>
              <Text variant="bodyMedium" style={{ 
                color: 'white',
                textAlign: 'center',
                marginTop: 4,
                opacity: 0.9
              }}>
                Trade with confidence on Solidi
              </Text>
            </View>
          </View>
        </Card>
        
        {/* Live Prices Ticker */}
        <Card style={{ marginBottom: 16, elevation: 2 }}>
          <Card.Content>
            <Text variant="titleMedium" style={{ marginBottom: 12, color: materialTheme.colors.primary }}>
              📊 Live Prices
            </Text>
            <LivePriceTicker 
              markets={['BTC/GBP', 'ETH/GBP', 'LTC/GBP', 'XRP/GBP']}
              updateInterval={30000}
              showChange={true}
              compact={true}
            />
          </Card.Content>
        </Card>
        
        {/* Price Chart Card */}
        <Card style={{ marginBottom: 16, elevation: 2 }}>
          <Card.Content>
            <Text variant="titleMedium" style={{ marginBottom: 12, color: materialTheme.colors.primary }}>
              📈 Price Chart
            </Text>
            <PriceGraph assetBA={assetBA} assetQA={assetQA} historic_prices={appState.apiData.historic_prices}/>
          </Card.Content>
        </Card>

        {/* Error Message */}
        {!!errorMessage && (
          <Card style={{ 
            marginBottom: 16, 
            backgroundColor: materialTheme.colors.errorContainer,
            elevation: 3 
          }}>
            <Card.Content>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon source="alert-circle" size={24} color={materialTheme.colors.onErrorContainer} />
                <Text style={{ 
                  color: materialTheme.colors.onErrorContainer, 
                  marginLeft: 8,
                  flex: 1,
                  fontSize: 16
                }}>
                  {errorMessage}
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Trading Form Card */}
        <Card style={{ 
          marginBottom: 16, 
          elevation: 4,
          backgroundColor: materialTheme.colors.surface,
          borderTopWidth: 3,
          borderTopColor: '#4CAF50' // Green accent for buy
        }}>
          <Card.Title 
            title="Buy Cryptocurrency"
            subtitle="Enter your trading details"
            left={(props) => <Icon {...props} source="shopping" color="#4CAF50" />}
            titleStyle={{ color: '#4CAF50', fontWeight: 'bold' }}
          />
          <Card.Content>

            {/* Amount to Spend Section */}
            <View style={{ marginBottom: 24 }}>
              <Text variant="titleSmall" style={{ 
                marginBottom: 12, 
                color: materialTheme.colors.onSurface,
                fontWeight: '600'
              }}>
                💷 Amount to Spend
              </Text>
              
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                <TextInput
                  mode="outlined"
                  label="Enter amount"
                  value={volumeQA}
                  onChangeText={validateAndSetVolumeQA}
                  keyboardType='decimal-pad'
                  style={{ flex: 2 }}
                  contentStyle={{ fontSize: 18 }}
                  left={<TextInput.Icon icon="currency-gbp" />}
                />
                <Surface style={{ 
                  flex: 1, 
                  borderRadius: 4,
                  elevation: 1 
                }}>
                  <DropDownPicker
                    listMode="MODAL"
                    placeholder={appState.getAssetInfo(assetQA).displayString}
                    style={{ 
                      borderColor: materialTheme.colors.outline,
                      borderRadius: 4,
                      minHeight: 56,
                      backgroundColor: materialTheme.colors.surface,
                    }}
                    textStyle={{
                      fontSize: 16,
                      color: materialTheme.colors.onSurface
                    }}
                    open={openQA}
                    value={assetQA}
                    items={itemsQA}
                    setOpen={setOpenQA}
                    setValue={setAssetQA}
                    setItems={setItemsQA}
                    searchable={true}
                    searchTextInputProps={{ maxLength: 15 }}
                    maxHeight={scaledHeight(300)}
                  />
                </Surface>
              </View>
            </View>

            <Divider style={{ marginVertical: 16 }} />

            {/* Amount to Receive Section */}
            <View style={{ marginBottom: 24 }}>
              <Text variant="titleSmall" style={{ 
                marginBottom: 12, 
                color: materialTheme.colors.onSurface,
                fontWeight: '600'
              }}>
                🪙 Amount to Receive
              </Text>
              
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                <View style={{ flex: 2, position: 'relative' }}>
                  <TextInput
                    mode="outlined"
                    label="You will receive"
                    value={volumeBA}
                    onChangeText={validateAndSetVolumeBA}
                    keyboardType='decimal-pad'
                    contentStyle={{ fontSize: 18 }}
                    left={<TextInput.Icon icon="bitcoin" />}
                  />
                  {loadingBestPrice && volumeBA === '[loading]' && (
                    <View style={{ 
                      position: 'absolute', 
                      right: 12, 
                      top: 16, 
                      zIndex: 10 
                    }}>
                      <ActivityIndicator size="small" />
                    </View>
                  )}
                </View>
                <Surface style={{ 
                  flex: 1, 
                  borderRadius: 4,
                  elevation: 1 
                }}>
                  <DropDownPicker
                    listMode="MODAL"
                    placeholder={appState.getAssetInfo(assetBA).displayString}
                    style={{ 
                      borderColor: materialTheme.colors.outline,
                      borderRadius: 4,
                      minHeight: 56,
                      backgroundColor: materialTheme.colors.surface,
                    }}
                    textStyle={{
                      fontSize: 16,
                      color: materialTheme.colors.onSurface
                    }}
                    open={openBA}
                    value={assetBA}
                    items={itemsBA}
                    setOpen={setOpenBA}
                    setValue={setAssetBA}
                    setItems={setItemsBA}
                    searchable={true}
                    searchTextInputProps={{ maxLength: 15 }}
                    maxHeight={scaledHeight(300)}
                  />
                </Surface>
              </View>
            </View>

            {/* Current Price Display */}
            <Surface style={{ 
              padding: 12, 
              borderRadius: 8, 
              marginBottom: 16,
              backgroundColor: 'rgba(76, 175, 80, 0.1)', // Light green for buy
              borderWidth: 1,
              borderColor: 'rgba(76, 175, 80, 0.3)'
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <Icon source="trending-up" size={20} color="#4CAF50" />
                <Text variant="bodyMedium" style={{ 
                  marginLeft: 8,
                  color: '#2E7D32',
                  fontWeight: '600'
                }}>
                  {generatePriceDescription() || 'Loading current price...'}
                </Text>
              </View>
            </Surface>

            {/* Development Info */}
            {appState.getUserStatus('supportLevel2') === true && 
             appState.user.isAuthenticated == true && (
              <HelperText type="info" style={{ textAlign: 'center' }}>
                Dev Domain: {getDomain()}
              </HelperText>
            )}
          </Card.Content>
        </Card>

        {/* Buy Button */}
        <Button
          mode="contained"
          onPress={startBuyRequest}
          style={{ 
            marginBottom: 16, 
            paddingVertical: 12,
            borderRadius: 16,
            elevation: 3,
            backgroundColor: '#4CAF50' // Green theme for buy
          }}
          contentStyle={{ paddingVertical: 8 }}
          labelStyle={{ fontSize: 18, fontWeight: 'bold', color: 'white' }}
          icon="shopping"
          disabled={loadingBestPrice || !!errorMessage}
        >
          {loadingBestPrice ? 'Loading...' : 'Buy Cryptocurrency'}
        </Button>

        {/* API Version Upgrade Notice */}
        {newAPIVersionDetected && (
          <Card style={{ 
            backgroundColor: materialTheme.colors.secondaryContainer,
            elevation: 2,
            marginBottom: 16
          }}>
            <Card.Content>
              {upgradeRequired()}
            </Card.Content>
          </Card>
        )}

        <View style={{ height: 20 }} />
      </KeyboardAwareScrollView>
    </View>
  )
};


export default Buy;

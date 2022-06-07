// React imports
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Image, Text, TextInput, StyleSheet, View, ScrollView } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';

// Other imports
import _ from 'lodash';
import Big from 'big.js';

// Internal imports
import AppStateContext from 'src/application/data';
import { mainPanelStates } from 'src/constants';
import { StandardButton } from 'src/components/atomic';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import misc from 'src/util/misc';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('Sell');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);


/* Future

If we start adding crypto-crypto markets, we'll need to distinguish between available and non-available assets pairs.

Example: If LTC is the selected quoteAsset, and it's a quoteAsset only for the BTC/LTC market, then when the user opens the baseAsset dropdown, the two options should be:
- [Show all assets]
- BTC (Bitcoin)

If the user selects "Show all assets", and then e.g. ETH, then we should not show the current price or a "Sell now" button. Instead, we should show:
"Solidi does not currently support this market. Please choose from one of the following markets."
and then include a FlatList with the markets that include either the selected baseAsset or the selected quoteAsset.

*/


/* Notes

We don't use a loading spinner here. Instead, we show '[loading]' for the baseAsset amount until we get price data back from the server.

We focus on keeping the fiat quoteAsset volume (at the moment, only GBP) constant, because our target customer thinks in terms of GBP rather than in amounts of a crypto asset.

User changes a value:
- Either baseAssetVolume or quoteAssetVolume can be changed.
- We then need to automatically update the other volume.
- We send the changed volume to the API to query the best available price for this volume (in terms of the other volume).

*/




let Sell = () => {

  let appState = useContext(AppStateContext);
  let firstRender = misc.useFirstRender();
  let stateChangeID = appState.stateChangeID;

  let pageName = appState.pageName;
  let permittedPageNames = 'default loadExistingOrder'.split(' ');
  misc.confirmItemInArray('permittedPageNames', permittedPageNames, pageName, 'Sell');

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
            resizeMode: 'cover',
          }}
        />,
      }
      return assetItem;
    });
  }

  // Functions that derive dropdown properties from the current lists of base and quote assets.
  let generateBaseAssetItems = () => { return deriveAssetItems(appState.getBaseAssets()) }
  let generateQuoteAssetItems = () => { return deriveAssetItems(appState.getQuoteAssets()) }

  // If we're reloading an existing order, load its details from the global state.
  if (appState.pageName === 'loadExistingOrder') {
    ({volumeQA: selectedVolumeQA, assetQA: selectedAssetQA} = appState.panels.sell);
    ({volumeBA: selectedVolumeBA, assetBA: selectedAssetBA} = appState.panels.sell);
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

  // More state.
  let [balanceBA, setBalanceBA] = useState(appState.getBalance(assetBA));
  let [errorMessage, setErrorMessage] = useState('');
  let [loadingBestPrice, setLoadingBestPrice] = useState(true);


  // Initial setup.
  useEffect( () => {
    setup();
  }, []); // Pass empty array so that this only runs once on mount.


  let setup = async () => {
    try {
      await appState.generalSetup();
      await appState.loadBalances();
      await fetchBestPriceForQuoteAssetVolume();
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
      setItemsBA(generateBaseAssetItems());
      setItemsQA(generateQuoteAssetItems());
      setBalanceBA(appState.getBalance(assetBA));
      setLoadingBestPrice(false);
    } catch(err) {
      let msg = `Sell.setup: Error = ${err}`;
      console.log(msg);
    }
  }


  // When the user changes the assetBA, select the balance value appropriately, and also reload it, in case it has changed.
  let loadBalanceData = async () => {
    setBalanceBA(appState.getBalance(assetBA));
    await appState.loadBalances();
    if (appState.stateChangeIDHasChanged(stateChangeID)) return;
    setBalanceBA(appState.getBalance(assetBA));
  }
  useEffect(() => {
    if (! firstRender) loadBalanceData();
  }, [assetBA]);


  let fetchBestPriceForQuoteAssetVolume = async () => {
    // We know the quoteAssetVolume. We want to find the best price in terms of baseAssetVolume.
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
    if (['[loading]', '[not loaded]'].includes(volumeQA)) invalidVolumeQA = true;
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
    let params = {market, side: 'BUY', baseOrQuoteAsset: 'quote', quoteAssetVolume: volumeQA};
    let output = await appState.fetchBestPriceForASpecificVolume(params);
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
      if (['[loading]', '[not loaded]'].includes(volumeQA)) {
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
    if (['[loading]', '[not loaded]'].includes(volumeBA)) invalidVolumeBA = true;
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
    // This matches a digit sequence + optional (period + digit sequence).
    // The second digit sequence can only be as long as the baseAsset's decimalPlaces.
    let regexString = `^\\d+(\\.\\d{0,${baseDP}})?$`;
    let regex = new RegExp(regexString);
    if (! _.isString(newVolumeBA)) {
      // Not sure if this could actually happen.
    } else if (_.isEmpty(newVolumeBA)) {
      // We permit the user to completely empty the input box. It feels better.
      setVolumeBA(newVolumeBA);
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
    // This matches a digit sequence + optional period + optional digit sequence.
    // The second digit sequence can only be as long as the quoteAsset's decimalPlaces.
    let regexString = `^\\d+(\\.\\d{0,${quoteDP}})?$`;
    let regex = new RegExp(regexString);
    if (! _.isString(newVolumeQA)) {
      // Not sure if this could actually happen.
    } else if (_.isEmpty(newVolumeQA)) {
      // We permit the user to completely empty the input box. It feels better.
      setVolumeQA(newVolumeQA);
    } else if (! regex.test(newVolumeQA)) {
      // No need to do anything. The input simply won't accept any non decimal-string input,
      // such as symbols or alphabet characters.
    } else {
      // Valid input.
      setVolumeQA(newVolumeQA);
    }
  }


  let generateBalanceSection = () => {
    let balanceExceeded = false;
    let volumeBA = volumeBA;
    if (
      misc.isNumericString(balanceBA) && misc.isNumericString(volumeBA) &&
      ! volumeBA.match(/^0+$/) && ! volumeBA.match(/^0+\.0+$/) // zero values
    ) {
      balanceExceeded = Big(balanceBA).lt(Big(volumeBA));
    }
    let _styleBalanceText = balanceExceeded ? {color: 'red'} : {};
    return (
      <View style={styles.balanceWrapper}>
        <Text style={[_styleBalanceText, styles.descriptionText2]}>Your balance: {balanceBA} {(balanceBA != '[loading]') && assetBA}</Text>
      </View>
    )
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


  let startSellRequest = async () => {

    if (volumeBA == '[loading]') {
      return setErrorMessage(`Please wait a moment. Price data hasn't been loaded yet.`);
    }

    // Check if the user has supplied a default account at which they can receive a payment.
    // Note: Not all SELL orders require a receiving external account, but we check here anyway and redirect if necessary.
    let account = appState.getDefaultAccountForAsset(assetQA);
    lj({account})
    // We're only handling GBP at the moment.
    let {accountName, sortCode, accountNumber} = account;
    if (_.isEmpty(accountName) || _.isEmpty(sortCode) || _.isEmpty(accountNumber)) {
      let msg = `No default account found for ${assetQA}. Redirecting so that user can input account details.`;
      log(msg);
      appState.stashCurrentState();
      return appState.changeState('BankAccounts');
    }

    // Save the order details in the global state.
    // We enforce the full decimal value just in case.
    let volumeQA2 = appState.getFullDecimalValue({asset: assetQA, value: volumeQA, functionName: 'Sell'});
    let volumeBA2 = appState.getFullDecimalValue({asset: assetBA, value: volumeBA, functionName: 'Sell'});
    _.assign(appState.panels.sell, {volumeQA:volumeQA2, assetQA, volumeBA:volumeBA2, assetBA});

    // Store the fact that we have an active SELL order.
    appState.panels.sell.activeOrder = true;

    // Check if the user's balance is large enough for this order volume.
    let balanceBA = appState.getBalance(assetBA);
    if (Big(balanceBA).lt(Big(volumeBA))) {
      let msg = `User's ${assetBA} balance (${balanceBA}) is less than the specified ${assetBA} sell volume (${volumeBA}).`;
      log(msg);
      return appState.changeState('InsufficientBalance', 'sell');
    }

    // Transfer to the receive-payment sequence (which will send the order).
    appState.changeState('ChooseHowToReceivePayment', 'balance');
  }


  return (

    <View style={styles.panelContainer}>
    <View style={styles.panelSubContainer}>

      <View style={styles.heading}>
        <Text style={styles.headingText}>Sell</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={true} style={styles.mainScrollView}>

      <Text style={styles.descriptionText}>I want to get:</Text>

      <View style={styles.quoteAssetWrapper}>
        <TextInput
          style={styles.volumeQA}
          onChangeText={validateAndSetVolumeQA}
          value={volumeQA}
        />
        <DropDownPicker
          listMode="SCROLLVIEW"
          placeholder={appState.getAssetInfo(assetQA).displayString}
          style={styles.quoteAsset}
          containerStyle={styles.quoteAssetContainer}
          open={openQA}
          value={assetQA}
          items={itemsQA}
          setOpen={setOpenQA}
          setValue={setAssetQA}
          setItems={setItemsQA}
          searchable={true}
          searchTextInputProps={{
            maxLength: 15
          }}
          maxHeight={scaledHeight(300)}
        />
      </View>

      <Text style={styles.descriptionText}>By selling:</Text>

      <View style={styles.baseAssetWrapper}>
        <TextInput
          style={styles.volumeBA}
          onChangeText={validateAndSetVolumeBA}
          value={volumeBA}
        />
        <DropDownPicker
          listMode="SCROLLVIEW"
          placeholder={appState.getAssetInfo(assetBA).displayString}
          style={styles.baseAsset}
          containerStyle={styles.baseAssetContainer}
          open={openBA}
          value={assetBA}
          items={itemsBA}
          setOpen={setOpenBA}
          setValue={setAssetBA}
          setItems={setItemsBA}
          onChangeValue={(value) => {
            //log({newAssetBA: value});
          }}
          searchable={true}
          searchTextInputProps={{
            maxLength: 15
          }}
          maxHeight={scaledHeight(300)}
        />
      </View>

      {generateBalanceSection()}

      <View style={styles.priceWrapper}>
        <Text style={styles.descriptionText2}>Current price: {generatePriceDescription()}</Text>
      </View>

      <View style={styles.buttonWrapper}>
        <StandardButton title="Sell now" onPress={ startSellRequest } />
      </View>

      {!! errorMessage &&
        <View style={styles.errorWrapper}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      }

      </ScrollView>

    </View>
    </View>

  )
};


let styles = StyleSheet.create({
  panelContainer: {
    paddingVertical: scaledHeight(15),
    paddingHorizontal: scaledWidth(15),
    width: '100%',
    height: '100%',
  },
  panelSubContainer: {
    paddingTop: scaledHeight(10),
    //paddingHorizontal: scaledWidth(30),
    height: '100%',
    //borderWidth: 1, // testing
  },
  heading: {
    alignItems: 'center',
    marginBottom: scaledHeight(40),
  },
  headingText: {
    fontSize: normaliseFont(20),
    fontWeight: 'bold',
  },
  boldText: {
    fontWeight: 'bold',
  },
  descriptionText: {
    fontWeight: 'bold',
    fontSize: normaliseFont(18),
  },
  quoteAssetWrapper: {
    paddingVertical: scaledHeight(20),
    width: '100%',
    flexDirection: "row",
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  volumeQA: {
    height: scaledHeight(40),
    width: scaledWidth(125),
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: scaledWidth(10),
    marginRight: scaledWidth(15),
  },
  quoteAssetContainer: {
    width: scaledWidth(220),
  },
  quoteAsset: {
    height: scaledHeight(40),
    width: scaledWidth(220),
  },
  baseAssetWrapper: {
    paddingVertical: scaledHeight(20),
    width: '100%',
    flexDirection: "row",
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
  },
  volumeBA: {
    height: scaledHeight(40),
    width: scaledWidth(125),
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: scaledWidth(10),
    marginRight: scaledWidth(15),
  },
  baseAssetContainer: {
    width: scaledWidth(220),
  },
  baseAsset: {
    height: scaledHeight(40),
    width: scaledWidth(220),
  },
  balanceWrapper: {
    //marginBottom: scaledHeight(10),
  },
  priceWrapper: {
    marginTop: scaledHeight(20),
  },
  descriptionText2: {
    fontWeight: 'bold',
    fontSize: normaliseFont(16),
  },
  buttonWrapper: {
    marginTop: scaledHeight(20),
  },
  errorWrapper: {
    marginTop: scaledHeight(20),
    marginBottom: scaledHeight(20),
  },
  errorText: {
    color: 'red',
  },
});


export default Sell;

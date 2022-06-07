// React imports
import React, { useContext, useState, useEffect } from 'react';
import { Image, Text, TextInput, StyleSheet, View, ScrollView } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';

// Other imports
import _ from 'lodash';
import Big from 'big.js';

// Internal imports
import AppStateContext from 'src/application/data';
import { mainPanelStates, colors } from 'src/constants';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import { Button, StandardButton, Spinner } from 'src/components/atomic';
import misc from 'src/util/misc';

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
  let [newAPIVersion, setNewAPIVersion] = useState(false);
  let [errorMessage, setErrorMessage] = useState('');
  let [loadingBestPrice, setLoadingBestPrice] = useState(true);


  // Initial setup.
  useEffect( () => {
    setup();
  }, []); // Pass empty array to only run once on mount.


  let setup = async () => {
    try {
      await appState.generalSetup();
      await fetchBestPriceForQuoteAssetVolume();
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
      setItemsBA(generateBaseAssetItems());
      setItemsQA(generateQuoteAssetItems());
      setNewAPIVersion(appState.checkLatestAPIVersion());
      setLoadingBestPrice(false);
    } catch(err) {
      let msg = `Buy.setup: Error = ${err}`;
      console.log(msg);
    }
  }


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
    // This matches a digit sequence + optional period + optional digit sequence.
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
    // This matches a digit sequence + optional (period + digit sequence).
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


  let upgradeRequired = () => {
    return (
      <View style={styles.upgradeRequired}>
        <Text style={styles.upgradeRequiredText}>Solidi has finished a major new release. Please upgrade to switch over to the new system. Visit our website for instructions.</Text>
        <View style={styles.upgradeButtonSection}>
          <Text style={styles.upgradeRequiredText}>If you have any trouble, please </Text>
          <Button title="Contact Us" onPress={ () => { appState.changeState('ContactUs') } }
            styles={styleContactUsButton}/>
          <Text style={styles.upgradeRequiredText}>.</Text>
        </View>
      </View>
    )
  }


  return (

    <View style={styles.panelContainer}>
    <View style={styles.panelSubContainer}>

      <View style={styles.heading}>
        <Text style={styles.headingText}>Buy</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={true} style={styles.mainScrollView}>

      <Text style={styles.descriptionText}>I want to spend:</Text>

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

      <Text style={styles.descriptionText}>To get:</Text>

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

      <View style={styles.priceWrapper}>
        <Text style={styles.priceText}>Current price: {generatePriceDescription()}</Text>
      </View>

      <View style={styles.buttonWrapper}>
        <StandardButton title="Buy now" onPress={ startBuyRequest } />
      </View>

      {!! errorMessage &&
        <View style={styles.errorWrapper}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      }

      {newAPIVersion && upgradeRequired()}

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
    //borderWidth: 1, // testing
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
    //borderWidth: 1, //testing
  },
  volumeBA: {
    height: scaledHeight(40),
    width: scaledWidth(125),
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: scaledWidth(10),
    marginRight: scaledWidth(15),
    //borderWidth: 1, //testing
  },
  baseAssetContainer: {
    width: scaledWidth(220),
    //borderWidth: 1, //testing
  },
  baseAsset: {
    height: scaledHeight(40),
    width: scaledWidth(220),
    //borderWidth: 1, //testing
  },
  priceWrapper: {
    marginVertical: scaledHeight(10),
  },
  priceText: {
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
  upgradeRequired: {
    marginTop: scaledHeight(40),
    marginHorizontal: scaledWidth(30),
  },
  upgradeRequiredText: {
    fontWeight: 'bold',
    color: 'red',
  },
  upgradeButtonSection: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
});


let styleContactUsButton = StyleSheet.create({
  text: {
    margin: 0,
    padding: 0,
    fontSize: normaliseFont(14),
  },
});


export default Buy;

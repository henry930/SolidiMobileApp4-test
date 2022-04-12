// React imports
import React, { useContext, useState, useEffect } from 'react';
import { Text, TextInput, StyleSheet, View } from 'react-native';
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

We focus on keeping the fiat quoteAsset volume (usually GBP at the moment) constant, because our target customer thinks in terms of GBP rather than in amounts of a crypto asset.

*/




let Buy = () => {

  let appState = useContext(AppStateContext);
  let firstRender = misc.useFirstRender();
  let stateChangeID = appState.stateChangeID;
  // priceString is used to trigger a recalculation of volumeBA when the market prices change.
  let [priceString, setPriceString] = useState('');

  let pageName = appState.pageName;
  let permittedPageNames = 'default'.split(' ');
  misc.confirmItemInArray('permittedPageNames', permittedPageNames, pageName, 'Buy');

  // Keep track of the last user action that changed an aspect of the order.
  let [lastUserInput, setLastUserInput] = useState('volumeQA');

  // Defaults.
  let selectedAssetBA = 'BTC';
  let selectedVolumeBA = '[loading]'; // Later, we calculate this from the price and the volumeQA.
  let selectedAssetQA = 'GBP';
  let selectedVolumeQA = '100';

  // Function that derives dropdown properties from an asset list.
  let deriveAssetItems = (assets) => {
    return assets.map(asset => {
      let info = appState.getAssetInfo(asset);
      return {label: info.displayString, value: info.displaySymbol};
    });
  }

  // Functions that derive dropdown properties from the current lists of base and quote assets.
  let baseAssetItems = () => { return deriveAssetItems(appState.getBaseAssets()) }
  let quoteAssetItems = () => { return deriveAssetItems(appState.getQuoteAssets()) }

  // Dropdown State:
  // BA = Base Asset
  let [volumeBA, setVolumeBA] = useState(selectedVolumeBA);
  let [openBA, setOpenBA] = useState(false);
  let [assetBA, setAssetBA] = useState(selectedAssetBA);
  let [itemsBA, setItemsBA] = useState(baseAssetItems());
  // QA = Quote Asset
  let [volumeQA, setVolumeQA] = useState(selectedVolumeQA);
  let [openQA, setOpenQA] = useState(false);
  let [assetQA, setAssetQA] = useState(selectedAssetQA);
  let [itemsQA, setItemsQA] = useState(quoteAssetItems());

  let [newAPIVersion, setNewAPIVersion] = useState(false);


  // Initial setup.
  useEffect( () => {
    setup();
  }, []); // Pass empty array to only run once on mount.


  let setup = async () => {
    try {
      await appState.loadAssetsInfo();
      await appState.loadMarkets();
      await appState.loadPrices();
      let apiCheck = await appState.checkForNewAPIVersion();
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
      setItemsBA(baseAssetItems());
      setItemsQA(quoteAssetItems());
      calculateVolumeBA();
      setNewAPIVersion(apiCheck);
    } catch(err) {
      let msg = `Buy.setup: Error = ${err}`;
      console.log(msg);
    }
  }


  // Handle recalculating volumeBA when:
  // - the price changes.
  // - the user changes the volumeQA value.
  let calculateVolumeBA = (args) => {
    if (appState.stateChangeIDHasChanged(stateChangeID)) return;
    log(`Check whether volumeBA should be recalculated. assetBA = ${assetBA}`);
    // Defaults
    if (_.isNil(args)) args = {};
    let {priceStringChange, assetChange} = args;
    if (_.isNil(priceStringChange)) priceStringChange = false
    if (_.isNil(assetChange)) assetChange = false
    // Use stored price for this market to recalculate the value of volumeBA.
    let market = assetBA + '/' + assetQA;
    let price = appState.getPrice(market);
    let prevPrice = appState.getPrevPrice(market);
    let priceChange = (price !== prevPrice);
    if (_.isEmpty(volumeQA)) {
      // pass
    } else if (lastUserInput == 'volumeBA' && ! priceStringChange && ! assetChange) {
      /*
      - If the user changes volumeBA, this will cause volumeQA to be recalculated.
      - This clause prevents the volumeQA change causing volumeBA to be recalculated for a second time (which would be a recursive event loop).
      - However, if there has been a change in one of the market prices, or the user has changed an asset, then we should recalculate.
      */
    } else {
      log('Recalculate base asset volume');
      let checkVolumeBA = _.isEmpty(volumeBA) ? '0' : volumeBA;
      if (price === '0') {
        // Price data has not yet been retrieved from server.
        setVolumeBA('[loading]');
        return;
      }
      /*
      Check if: We are triggering based on a price change.
      But: A price change has not occurrred in this specific market.
      */
      if (priceStringChange && ! priceChange) {
        log(`No change in price (${price}). Stopping recalculation of volumeBA.`);
        return;
      }
      let baseDP = appState.getAssetInfo(assetBA).decimalPlaces;
      let newVolumeBA = Big(volumeQA).div(Big(price)).toFixed(baseDP);
      // If new value of volumeBA is different, update it.
      if (
        checkVolumeBA == '[loading]' ||
        (! Big(newVolumeBA).eq(Big(checkVolumeBA)))
      ) {
        log("New base asset volume: " + newVolumeBA);
        setVolumeBA(newVolumeBA);
      }
    }
  }

  useEffect(() => {
    if (! firstRender) calculateVolumeBA();
  }, [volumeQA]);

  useEffect(() => {
    if (! firstRender) calculateVolumeBA({priceStringChange:true});
  }, [priceString]);


  // Handle user recalculating volumeQA when:
  // - the user changes the volumeBA value.
  let calculateVolumeQA = () => {
    log(`Check whether volumeQA should be recalculated. assetQA = ${assetQA}`);
    if (_.isEmpty(volumeBA)) {
      // pass
    } else if (lastUserInput == 'volumeQA') {
      // If the user changes volumeQA, this will cause volumeBA to be recalculated.
      // This clause prevents the volumeBA change causing volumeQA to be recalculated for a second time (which would be a recursive event loop).
    } else {
      log('Recalculate quote asset volume');
      let checkVolumeQA = _.isEmpty(volumeQA) ? '0' : volumeQA;
      let market = assetBA + '/' + assetQA;
      let price = appState.getPrice(market);
      if (price === '0') {
        // Price data has not yet been retrieved from server.
        setVolumeQA('[loading]');
        return;
      }
      let quoteDP = appState.getAssetInfo(assetQA).decimalPlaces;
      let newVolumeQA = Big(volumeBA).mul(Big(price)).toFixed(quoteDP);
      if (! Big(newVolumeQA).eq(Big(checkVolumeQA))) {
        log("New quote asset volume: " + newVolumeQA);
        setVolumeQA(newVolumeQA);
      }
    }
  }

  useEffect(() => {
    if (! firstRender) calculateVolumeQA();
  }, [volumeBA]);

  // Recalculate volumeBA when the assetBA or the assetQA is changed in a dropdown.
  // Hold the volumeQA constant.
  useEffect(() => {
    if (! firstRender) calculateVolumeBA({assetChange:true});
  }, [assetBA, assetQA]);


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


  let generatePriceDescription = () => {
    let market = assetBA + '/' + assetQA;
    let price = appState.getPrice(market);
    log(`Market price for ${market} market = ${price}`);
    let dp = appState.getAssetInfo(assetQA).decimalPlaces;
    let priceString = Big(price).toFixed(dp);
    let displayStringBA = appState.getAssetInfo(assetBA).displaySymbol;
    let displayStringQA = appState.getAssetInfo(assetQA).displaySymbol;
    let description = `1 ${displayStringBA} = ${priceString} ${displayStringQA}`;
    return description;
  }


  // Set an interval timer that periodically reloads the price data from the server.
  let checkTimeSeconds = 15000; // Todo: At end, change this to 15.
  //checkTimeSeconds = 10; // Testing
  // Timer function.
  /*
  Note: setInterval runs in a separate execution context.
  - The only way that it can affect the main page is by updating state.
  - It can't retrieve state from the main page.
  - So: We update state (and trigger a reload) using the results of the API call.
  */
  let checkPrice = async () => {
    await appState.loadPrices();
    let newPriceString = JSON.stringify(appState.getPrices());
    setPriceString(newPriceString);
  }
  // Set timer.
  useEffect(() => {
    let intervalID = setInterval(() => {
      checkPrice();
    }, checkTimeSeconds * 1000);
    // This cleanup callback is run when the component is unmounted.
    return () => {
      clearInterval(intervalID);
    }
  }, []); // Run once on start.


  let startBuyRequest = async () => {

    // Save the order details in the global state.
    _.assign(appState.panels.buy, {volumeQA, assetQA, volumeBA, assetBA});

    // Store the fact that we have an active BUY order.
    appState.panels.buy.activeOrder = true;

    /* Check if the user is not logged in.
    - This happens here, rather than in setMainPanelState, because we want the user to make the choice to buy prior to having to authenticate.
    - After authentication, we'll redirect to ChooseHowToPay (which will send the order as it loads).
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

      <View>

      <View style={styles.heading}>
        <Text style={styles.headingText}>Buy</Text>
      </View>

      <Text style={styles.descriptionText}>I want to spend:</Text>

      <View style={styles.quoteAssetWrapper}>
        <TextInput
          style={styles.volumeQA}
          onChangeText={validateAndSetVolumeQA}
          value={volumeQA}
        />
        <DropDownPicker
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
        />
      </View>

      <View style={styles.priceWrapper}>
        <Text style={styles.priceText}>Current price: {generatePriceDescription()}</Text>
      </View>

      <View style={styles.buttonWrapper}>
        <StandardButton title="Buy now" onPress={ startBuyRequest } />
      </View>

      {newAPIVersion && upgradeRequired()}

      </View>

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
    width: scaledWidth(120),
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: scaledWidth(10),
    marginRight: scaledWidth(20),
  },
  quoteAsset: {
    height: scaledHeight(40),
    width: scaledWidth(220),
  },
  quoteAssetContainer: {
    width: scaledWidth(220),
  },
  baseAssetWrapper: {
    paddingVertical: scaledHeight(20),
    width: '80%',
    flexDirection: "row",
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
  },
  volumeBA: {
    height: scaledHeight(40),
    width: scaledWidth(120),
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: scaledWidth(10),
    marginRight: scaledWidth(20),
  },
  baseAsset: {
    height: scaledHeight(40),
    width: scaledWidth(220),
  },
  baseAssetContainer: {
    width: scaledWidth(220),
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

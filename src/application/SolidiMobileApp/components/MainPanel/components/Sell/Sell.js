// React imports
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Text, TextInput, StyleSheet, View } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';

// Other imports
import _ from 'lodash';
import Big from 'big.js';

// Internal imports
import AppStateContext from 'src/application/data';
import { assetsInfo, mainPanelStates } from 'src/constants';
import { StandardButton } from 'src/components/atomic';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import misc from 'src/util/misc';


/*
Note: In future, if we start adding crypto-crypto markets, we'll need to distinguish between available and non-available assets pairs.
Example: If LTC is the selected quoteAsset, and it's only a quoteAsset for the BTC/LTC market, then when the user opens the baseAsset dropdown, the two options should be:
- [Show all assets]
- BTC (Bitcoin)
If the user selects "Show all assets", and then e.g. ETH, then we should not show the current price or a "Sell now" button. Instead, we should show:
"Solidi does not currently support this market. Please choose from one of the following markets."
and then include a FlatList with the markets that include either the selected baseAsset or the selected quoteAsset.
*/


/* Notes

We don't use a loading spinner here. Instead, we show '[loading]' for the baseAsset amount until we get price data back from the server.

*/




let Sell = () => {

  let appState = useContext(AppStateContext);
  let firstRender = misc.useFirstRender();
  let stateChangeID = appState.stateChangeID;

  let pageName = appState.pageName;
  let permittedPageNames = 'default loadExistingOrder'.split(' ');
  misc.confirmItemInArray('permittedPageNames', permittedPageNames, pageName, 'Sell');

  let [lastUserInput, setLastUserInput] = useState('');

  // Defaults.
  let defaultMarkets = appState.getMarkets();
  let defaultBaseAssets = ['BTC'];
  let defaultQuoteAssets = ['GBP'];
  let selectedVolumeBA = ''; // Later, we calculate this from the price and the volumeQA.
  let selectedAssetBA = 'BTC';
  let selectedVolumeQA = '100';
  let selectedAssetQA = 'GBP';

  // Function that derives dropdown properties from an asset list.
  let deriveAssetItems = (assets) => {
    return assets.map(x => {
      let a = assetsInfo[x];
      return {label: a.displayString, value: a.displaySymbol};
    });
  }
  let baseAssetItems = deriveAssetItems(defaultBaseAssets);
  let quoteAssetItems = deriveAssetItems(defaultQuoteAssets);

  // If we're reloading an existing order, load its details from the global state.
  if (appState.pageName === 'loadExistingOrder') {
    ({volumeQA: selectedVolumeQA, assetQA: selectedAssetQA} = appState.panels.sell);
    ({volumeBA: selectedVolumeBA, assetBA: selectedAssetBA} = appState.panels.sell);
  }

  // Dropdown State:
  // BA = Base Asset
  let [volumeBA, setVolumeBA] = useState(selectedVolumeBA);
  let [openBA, setOpenBA] = useState(false);
  let [assetBA, setAssetBA] = useState(selectedAssetBA);
  let [itemsBA, setItemsBA] = useState(baseAssetItems);
  // QA = Quote Asset
  let [volumeQA, setVolumeQA] = useState(selectedVolumeQA);
  let [openQA, setOpenQA] = useState(false);
  let [assetQA, setAssetQA] = useState(selectedAssetQA);
  let [itemsQA, setItemsQA] = useState(quoteAssetItems);

  // More state.
  let [markets, setMarkets] = useState(defaultMarkets);
  let [baseAssets, setBaseAssets] = useState(defaultBaseAssets);
  let [quoteAssets, setQuoteAssets] = useState(defaultQuoteAssets);
  let [balanceBA, setBalanceBA] = useState('');
  let [marketPrice, setMarketPrice] = useState('');

  // Initial setup.
  useEffect( () => {
    setup();
  }, []); // Pass empty array so that this only runs once on mount.


  let setup = async () => {
    if (_.isEmpty(lastUserInput)) setLastUserInput('volumeQA');
    await loadMarketData();
    await loadPriceData();
    await loadBalanceData();
  }


  let loadMarketData = async () => {
    if (appState.stateChangeIDHasChanged(stateChangeID)) return;
    // First, get the markets we have in storage.
    let markets = appState.getMarkets();
    loadAssetData();
    // Reload data from the server.
    let markets2 = await appState.loadMarkets();
    if (appState.stateChangeIDHasChanged(stateChangeID)) return;
    // Store the new data, if it's different, so that our display updates.
    if (markets !== markets2) setMarkets(markets2);
    loadAssetData();
  }

  let loadAssetData = () => {
    let baseAssets2 = appState.getBaseAssets();
    // If the asset list has changed, save the state.
    if (baseAssets != baseAssets2) {
      let baseAssetItems = deriveAssetItems(baseAssets2);
      setItemsBA(baseAssetItems);
    }
    let quoteAssets2 = appState.getQuoteAssets();
    // If the asset list has changed, save the state.
    if (quoteAssets != quoteAssets2) {
      let quoteAssetItems = deriveAssetItems(quoteAssets2);
      setItemsQA(quoteAssetItems);
    }
  }

  let loadPriceData = async () => {
    if (appState.stateChangeIDHasChanged(stateChangeID)) return;
    let market = assetBA + '/' + assetQA;
    // First, get the price we have in storage.
    let price = appState.getPrice(market);
    setMarketPrice(price);
    // Reload data from the server.
    await appState.loadPrices();
    if (appState.stateChangeIDHasChanged(stateChangeID)) return;
    let price2 = appState.getPrice(market);
    // Tmp: To mimic price changes during testing, increment the price slightly.
    /*
    let dp = assetsInfo[assetQA].decimalPlaces;
    let priceX = (Big(price).plus(Big('1.01'))).toFixed(dp);
    appState.apiData.ticker[market] = priceX;
    price2 = priceX;
    */
    // End tmp.
    // Store the new data, if it's different, so that our display updates.
    if (price != price2) setMarketPrice(price2);
    // Need to recalculate volumeBA if the price has changed.
    // Note: The QA volume will stay at its current value.
    calculateVolumeBA();
  }

  let loadBalanceData = async () => {
    if (appState.stateChangeIDHasChanged(stateChangeID)) return;
    // Display the value we have in storage first.
    let balance1 = appState.getBalance(assetBA);
    setBalanceBA(balance1);
    // Load the balance from the server.
    await appState.loadBalances();
    if (appState.stateChangeIDHasChanged(stateChangeID)) return;
    // Display the new value, if it's different.
    let balance2 = appState.getBalance(assetBA);
    if (balance1 !== balance2) {
      setBalanceBA(balance2);
    }
  }
  // When the user changes the assetBA, reload the balance data.
  useEffect(() => {
    if (! firstRender) loadBalanceData();
  }, [assetBA]);

  // Handle recalculating volumeBA when:
  // - the price changes.
  // - the user changes the volumeQA value.
  let calculateVolumeBA = () => {
    if (appState.stateChangeIDHasChanged(stateChangeID)) return;
    log("Check whether volumeBA should be recalculated.")
    // Use stored price for this market to recalculate the value of volumeBA.
    if (_.isEmpty(volumeQA)) {
      // pass
    } else if (lastUserInput == 'volumeBA') {
      // If the user changes volumeBA, this will cause volumeQA to be recalculated.
      // This clause prevents the volumeQA change causing volumeBA to be recalculated for a second time (which would be a recursive event loop).
    } else {
      log('Recalculate base asset volume');
      let checkVolumeBA = _.isEmpty(volumeBA) ? '0' : volumeBA;
      let market = assetBA + '/' + assetQA;
      let price = appState.getPrice(market);
      if (price === '0') {
        // Price data has not yet been retrieved from server.
        setVolumeBA('[loading]');
        return;
      }
      let baseDP = assetsInfo[assetBA].decimalPlaces;
      let newVolumeBA = Big(volumeQA).div(Big(price)).toFixed(baseDP);
      // If new value of volumeBA is different, update it.
      if (Big(newVolumeBA) !== Big(checkVolumeBA)) {
        log("New base asset volume: " + newVolumeBA);
        setVolumeBA(newVolumeBA);
      }
    }
  }
  useEffect(() => {
    calculateVolumeBA();
  }, [volumeQA]);

  // Handle user recalculating volumeQA when:
  // - the user changes the volumeBA value.
  let calculateVolumeQA = () => {
    log("Check whether volumeQA should be recalculated.")
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
      let quoteDP = assetsInfo[assetQA].decimalPlaces;
      let newVolumeQA = Big(volumeBA).mul(Big(price)).toFixed(quoteDP);
      if (Big(newVolumeQA) !== Big(checkVolumeQA)) {
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
    if (! firstRender) calculateVolumeBA();
  }, [assetBA, assetQA]);

  let validateAndSetVolumeBA = (newVolumeBA) => {
    setLastUserInput('volumeBA');
    let baseDP = assetsInfo[assetBA].decimalPlaces;
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
    let quoteDP = assetsInfo[assetQA].decimalPlaces;
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
    let dp = assetsInfo[assetQA].decimalPlaces;
    let priceString = Big(price).toFixed(dp);
    let displayStringBA = assetsInfo[assetBA].displaySymbol;
    let displayStringQA = assetsInfo[assetQA].displaySymbol;
    let description = `1 ${displayStringBA} = ${priceString} ${displayStringQA}`;
    return description;
  }

  // Set an interval timer that periodically reloads the price data from the server.
  let checkTimeSeconds = 15000; // Todo: At end, change this to 15.
  // Time function.
  let checkPrice = async () => {
    await loadPriceData();
  }
  // Set timer on load.
  if (_.isNil(appState.panels.sell.timerID)) {
    let timerID = setInterval(checkPrice, checkTimeSeconds * 1000);
    appState.panels.sell.timerID = timerID;
  }

  let startSellRequest = async () => {
    // Check if the user's balance is large enough for this order volume.
    if (Big(balanceBA).lt(Big(volumeBA))) {
      let msg = `User's ${assetBA} balance (${balanceBA}) is less than the specified ${assetBA} sell volume (${volumeBA}).`;
      log(msg);
      appState.changeState('InsufficientBalance', 'sell');
      return;
    }
    // Save the order data internally.
    _.assign(appState.panels.sell, {volumeQA, assetQA, volumeBA, assetBA});
    // Transfer to the receive-payment sequence (which will send the order).
    appState.changeState('ChooseHowToReceivePayment', 'balance');
  }


  return (

    <View style={styles.panelContainer}>
    <View style={styles.panelSubContainer}>

      <View>

      <View style={styles.heading}>
        <Text style={styles.headingText}>Sell</Text>
      </View>

      <Text style={styles.descriptionText}>I want to get:</Text>

      <View style={styles.quoteAssetWrapper}>
        <TextInput
          style={styles.volumeQA}
          onChangeText={validateAndSetVolumeQA}
          value={volumeQA}
        />
        <DropDownPicker
          placeholder={assetsInfo[assetQA].displayString}
          style={styles.quoteAsset}
          containerStyle={styles.quoteAssetContainer}
          open={openQA}
          value={assetQA}
          items={itemsQA}
          setOpen={setOpenQA}
          setValue={setAssetQA}
          setItems={setItemsQA}
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
          placeholder={assetsInfo[assetBA].displayString}
          style={styles.baseAsset}
          containerStyle={styles.baseAssetContainer}
          open={openBA}
          value={assetBA}
          items={itemsBA}
          setOpen={setOpenBA}
          setValue={setAssetBA}
          setItems={setItemsBA}
        />
      </View>

      <View style={styles.balanceWrapper}>
        <Text style={styles.descriptionText2}>Your balance: {balanceBA} {(balanceBA != '[loading]') && assetBA}</Text>
      </View>

      <View style={styles.priceWrapper}>
        <Text style={styles.descriptionText2}>Current price: {generatePriceDescription()}</Text>
      </View>

      <View style={styles.buttonWrapper}>
        <StandardButton title="Sell now" onPress={ startSellRequest } />
      </View>

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
  },
  volumeQA: {
    height: 40,
    width: scaledWidth(120),
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: scaledWidth(10),
    marginRight: scaledWidth(20),
  },
  quoteAsset: {
    height: 40,
    width: scaledWidth(220),
  },
  quoteAssetContainer: {
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
    height: 40,
    width: scaledWidth(120),
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: scaledWidth(10),
    marginRight: scaledWidth(20),
  },
  baseAsset: {
    height: 40,
    width: scaledWidth(220),
  },
  baseAssetContainer: {
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
});


export default Sell;

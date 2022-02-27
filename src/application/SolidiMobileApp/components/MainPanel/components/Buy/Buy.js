// React imports
import React, { useContext, useState, useEffect } from 'react';
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




let Buy = () => {

  let appState = useContext(AppStateContext);

  let pageName = appState.pageName;
  let permittedPageNames = 'default userHasClickedBuyButton'.split(' ');
  misc.confirmItemInArray('permittedPageNames', permittedPageNames, pageName, 'Buy');

  let [priceLoadCount, setPriceLoadCount] = useState(0);
  let [lastUserInput, setLastUserInput] = useState('');

  let selectedVolumeQA = '100';
  let selectedAssetQA = 'GBP';
  let selectedVolumeBA = ''; // Later, we calculate this from the price and the volumeQA.
  let selectedAssetBA = 'BTC';

  // If we're reloading an existing order, load its details from the global state.
  if (appState.pageName === 'userHasClickedBuyButton') {
    ({volumeQA: selectedVolumeQA, assetQA: selectedAssetQA} = appState.panels.buy);
    ({volumeBA: selectedVolumeBA, assetBA: selectedAssetBA} = appState.panels.buy);
  }

  // QA = Quote Asset
  let [volumeQA, setVolumeQA] = useState(selectedVolumeQA);
  let [openQA, setOpenQA] = useState(false);
  let [assetQA, setAssetQA] = useState(selectedAssetQA);
  let quoteAssets = 'GBP EUR'.split(' ');
  let quoteAssetItems = quoteAssets.map(x => {
    let a = assetsInfo[x];
    return {label: a.displayString, value: a.displaySymbol};
  });
  let [itemsQA, setItemsQA] = useState(quoteAssetItems);

  // BA = Base Asset
  let [volumeBA, setVolumeBA] = useState(selectedVolumeBA);
  let [openBA, setOpenBA] = useState(false);
  let [assetBA, setAssetBA] = useState(selectedAssetBA);
  let baseAssets = 'BTC ETH'.split(' ');
  let baseAssetItems = baseAssets.map(x => {
    let a = assetsInfo[x];
    return {label: a.displayString, value: a.displaySymbol};
  });
  let [itemsBA, setItemsBA] = useState(baseAssetItems);

  let loadPriceData = async () => {
    let fxmarket = assetBA + '/' + assetQA;
    let data = await appState.apiClient.publicMethod({
      httpMethod: 'GET',
      apiMethod: 'ticker',
      params: {},
    });
    // Future: log the data, extract relevant bits, calculate volumeBA that can be bought for default 100 GBP, and use setVolumeBA to change the volumeBA value.
  }

  useEffect(() => {
    // Tmp: Set market prices here.
    // Future: Load them from the API. Use loadPriceData.
    let prices = {
      'BTC/GBP': '2000',
      'ETH/GBP': '100',
      'BTC/EUR': '3000',
      'ETH/EUR': '150',
    }
    appState.setAPIData({key: 'prices', data: prices});
    // Trigger a recalculation of volumeBA that uses the stored price data.
    if (_.isEmpty(lastUserInput)) setLastUserInput('volumeQA');
    setPriceLoadCount(priceLoadCount+1);
  }, []); // Pass empty array to only run once on mount.

  useEffect(() => {
    // Use stored price for this market to recalculate the value of volumeBA.
    if (_.isEmpty(volumeQA)) {
      // pass
    } else if (lastUserInput == 'volumeBA') {
      // If the last action the user did was to change volumeBA, don't recalculate it. This will just be annoying.
      // - Note: Without this clause, the two recalculation events would trigger each other.
    } else if (appState.apiData.prices) {
      log('Recalculate base asset volume')
      let checkVolumeBA = _.isEmpty(volumeBA) ? '0' : volumeBA;
      let market = assetBA + '/' + assetQA;
      let price = appState.apiData.prices[market];
      let baseDP = assetsInfo[assetBA].decimalPlaces;
      let newVolumeBA = Big(volumeQA).div(Big(price)).toFixed(baseDP);
      // If new value of volumeBA is different, update it.
      if (Big(newVolumeBA) !== Big(checkVolumeBA)) {
        log("New base asset volume: " + newVolumeBA);
        setVolumeBA(newVolumeBA);
      }
    }
  }, [volumeQA, priceLoadCount]);

  useEffect(() => {
    if (_.isEmpty(volumeBA)) {
      // pass
    } else if (lastUserInput == 'volumeQA') {
      // If the last action the user did was to change volumeQA, don't recalculate it. This will just be annoying.
      // - Note: Without this clause, the two recalculation events would trigger each other.
    } else if (appState.apiData.prices) {
      log('Recalculate quote asset volume');
      let checkVolumeQA = _.isEmpty(volumeQA) ? '0' : volumeQA;
      let market = assetBA + '/' + assetQA;
      let price = appState.apiData.prices[market];
      let quoteDP = assetsInfo[assetQA].decimalPlaces;
      let newVolumeQA = Big(volumeBA).mul(Big(price)).toFixed(quoteDP);
      if (Big(newVolumeQA) !== Big(checkVolumeQA)) {
        log("New quote asset volume: " + newVolumeQA);
        setVolumeQA(newVolumeQA);
      }
    }
  }, [volumeBA]);

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

  let startBuyRequest = async () => {
    // If the user isn't authenticated, push them into the auth sequence.

    if (! appState.user.isAuthenticated) {
      // This happens here, rather than in setMainPanelState, because we want the user to make the choice to buy prior to having to authenticate.
      // Save the order details in the global state.
      _.assign(appState.panels.buy, {volumeQA, assetQA, volumeBA, assetBA});
      // Stash the BUY state for later retrieval.
      appState.stashState({mainPanelState: 'Buy', pageName: 'userHasClickedBuyButton'});
      appState.authenticateUser();
      return;
    }

    // At this point, the user is already authenticated, or has just returned from the auth sequence.
    // We send the BUY order to the server.
    // Unprincipled exception: On the app, we think in terms of GBP, but on the server, the fxmarkets are in terms of GBPX (GBP that is off-exchange).
    // Therefore, here, we add an 'X' to specific quote assets.
    let offExchangeList = 'GBP EUR'.split(' ');
    if (offExchangeList.includes(assetQA)) assetQA += 'X';
    let fxmarket = assetBA + '/' + assetQA;
    log(`Send order to server: BUY ${volumeBA} ${fxmarket} @ MARKET ${volumeQA}`);
    let data = await appState.apiClient.privateMethod({
      httpMethod: 'POST',
      apiMethod: 'buy',
      params: {
        fxmarket,
        amount: volumeBA,
        price: volumeQA,
      }
    });
    /*
    Example error response:
    {"error":"Insufficient Funds"}
    Example data:
    {"id":11,"datetime":1643047261277,"type":0,"price":"100","amount":"0.05"}
    */
   // Todo: If an error occurs, display it.
   // Store the orderID. Later, we'll use this to check whether the payment for it has been received.
   appState.panels.buy.orderID = data.id;
   log(`OrderID: ${appState.panels.buy.orderID}`);

    // We transfer to the payment sequence.
    appState.changeState('ChooseHowToPay', 'direct_payment');
  }

  // Submit the order automatically if we have returned from auth sequence.
  if (appState.pageName === 'userHasClickedBuyButton') {
    startBuyRequest();
  }

  return (

    <View style={styles.panelContainer}>

      <View>

      <Text style={styles.boldText}>I want to spend:</Text>

      <View style={styles.quoteAssetWrapper}>
        <TextInput
          style={styles.volumeQA}
          onChangeText={validateAndSetVolumeQA}
          value={volumeQA}
        />
        <DropDownPicker
          placeholder={assetsInfo[selectedAssetQA].displayString}
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

      <Text style={styles.boldText}>To get:</Text>

      <View style={styles.baseAssetWrapper}>
        <TextInput
          style={styles.volumeBA}
          onChangeText={validateAndSetVolumeBA}
          value={volumeBA}
        />
        <DropDownPicker
          placeholder={assetsInfo[selectedAssetBA].displayString}
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

      <View style={styles.buttonWrapper}>
        <StandardButton title="Buy now" onPress={ startBuyRequest } />
      </View>

      </View>

    </View>

  )
};


let styles = StyleSheet.create({
  panelContainer: {
    paddingTop: scaledHeight(80),
    paddingHorizontal: scaledWidth(15),
    width: '100%',
    height: '100%',
  },
  boldText: {
    fontWeight: 'bold',
  },
  quoteAssetWrapper: {
    paddingVertical: scaledHeight(20),
    width: '80%',
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
    width: '80%',
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
  buttonWrapper: {
    marginTop: scaledHeight(20),
  },
  orderSubmittedMessage: {
    marginTop: 10,
    padding: 10,
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
});


export default Buy;

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




let Sell = () => {

  let appState = useContext(AppStateContext);

  let [lastUserInput, setLastUserInput] = useState('');

  let selectedVolumeQA = '100';
  let selectedAssetQA = 'GBPX';
  let selectedVolumeBA = ''; // Later, we calculate this from the price and the volumeQA.
  let selectedAssetBA = 'BTC';

  // QA = Quote Asset
  let [volumeQA, setVolumeQA] = useState(selectedVolumeQA);
  let [openQA, setOpenQA] = useState(false);
  let [assetQA, setAssetQA] = useState(selectedAssetQA);
  let quoteAssets = 'GBPX EURX'.split(' ');
  let quoteAssetItems = quoteAssets.map(x => {
    let a = assetsInfo[x];
    return {label: a.displayString, value: a.displaySymbol};
  });
  let [itemsQA, setItemsQA] = useState(quoteAssetItems);

  // BA = Base Asset
  let [volumeBA, setVolumeBA] = useState(selectedVolumeBA);
  let [openBA, setOpenBA] = useState(false);
  let [assetBA, setAssetBA] = useState(selectedAssetBA);
  // Future: Load baseAssets from "list of enabled markets" ?
  let baseAssets = 'BTC ETH'.split(' ');
  let baseAssetItems = baseAssets.map(x => {
    let a = assetsInfo[x];
    return {label: a.displayString, value: a.displaySymbol};
  });
  let [itemsBA, setItemsBA] = useState(baseAssetItems);

  let [balanceBA, setBalanceBA] = useState('');

  let loadPriceData = async () => {
    let fxmarket = assetBA + '/' + assetQA;
    let data = await appState.apiClient.publicMethod({
      httpMethod: 'GET',
      apiMethod: 'ticker',
      params: {},
    });
    log(data)
    // Tmp: To mimic price changes, increment the price slightly.
    let price = appState.apiData.prices[fxmarket];
    let dp = assetsInfo[assetQA].decimalPlaces;
    let price2 = (Big(price).minus(Big('1.01'))).toFixed(dp);
    appState.apiData.prices[fxmarket] = price2;
    // End tmp.
    log(`Price data loaded from server. Focus: ${fxmarket} market. Price: ${price2}`);
    // Todo: Log the data, store it in the apiData, extract the relevant bits, calculate volumeBA that can be sold for the current QA volume, and use setVolumeBA to change the volumeBA value.
    // The QA volume will stay at its current value.
    // Need to recalculate volumeBA if the price has changed.
    calculateVolumeBA();
  }

  let loadBalanceData = async () => {
    // If we have a balance stored, display that first.
    if (! _.isUndefined(appState.apiData.balance)) {
      if (! _.isUndefined(appState.apiData.balance[assetBA])) {
        let balanceValue = appState.apiData.balance[assetBA].balance;
        setBalanceBA(balanceValue);
      }
    }
    // Load the balance from the server.
    await appState.loadBalances();
    let balanceValue = appState.apiData.balance[assetBA].balance;
    setBalanceBA(balanceValue);
  }
  // When the user changes the assetBA, reload the balance data.
  useEffect(() => {
    loadBalanceData();
  }, [assetBA]);

  // Initial setup.
  useEffect( () => {
    if (_.isEmpty(lastUserInput)) setLastUserInput('volumeQA');
    loadPriceData();
    loadBalanceData();
  }, []); // Pass empty array to only run once on mount.

  // Handle recalculating volumeBA when:
  // - the price changes.
  // - the user changes the volumeQA value.
  let calculateVolumeBA = () => {
    log("Check whether volumeBA should be recalculated.")
    // Use stored price for this market to recalculate the value of volumeBA.
    if (_.isEmpty(volumeQA)) {
      // pass
    } else if (lastUserInput == 'volumeBA') {
      // If the user changes volumeBA, this will cause volumeQA to be recalculated.
      // This clause prevents the volumeQA change causing volumeBA to be recalculated for a second time (which would be a recursive event loop).
    } else if (appState.apiData.prices) {
      log('Recalculate base asset volume');
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
  }
  useEffect(() => {
    calculateVolumeQA();
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

  let generatePriceDescription = () => {
    let market = selectedAssetBA + '/' + selectedAssetQA;
    let price = appState.apiData.prices[market];
    let dp = assetsInfo[selectedAssetQA].decimalPlaces;
    let priceString = Big(price).toFixed(dp);
    let displayStringBA = assetsInfo[selectedAssetBA].displaySymbol;
    let displayStringQA = assetsInfo[selectedAssetQA].displaySymbol;
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
    // We send the SELL order to the server.
    let fxmarket = assetBA + '/' + assetQA;
    log(`Send order to server: SELL ${volumeBA} ${fxmarket} @ MARKET ${volumeQA}`);
    let data = await appState.apiClient.privateMethod({
      httpMethod: 'POST',
      apiMethod: 'sell',
      params: {
        fxmarket,
        amount: volumeBA,
        price: volumeQA,
      },
    });
    /*
    Example error response:

    */
    // Todo: If an error occurs, display it.
    // Store the orderID. Later, we'll use it to check the order's status.
    appState.panels.sell.orderID = data.id;

    // We transfer to the receive-payment sequence.
    appState.changeState('ChooseHowToReceivePayment', 'balance');
  }


  return (

    <View style={styles.panelContainer}>

      <View>

      <Text style={styles.descriptionText}>I want to get:</Text>

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

      <Text style={styles.descriptionText}>By selling:</Text>

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

      <View style={styles.balanceWrapper}>
        <Text style={styles.descriptionText}>Your balance: {balanceBA} {assetBA}</Text>
      </View>

      <View style={styles.descriptionWrapper}>
        <Text style={styles.descriptionText}>Current price: {generatePriceDescription()}</Text>
      </View>

      <View style={styles.buttonWrapper}>
        <StandardButton title="Sell now" onPress={ startSellRequest } />
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
  descriptionText: {
    fontWeight: 'bold',
    fontSize: normaliseFont(16),
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
  balanceWrapper: {
    marginBottom: scaledHeight(15),
  },
});


export default Sell;

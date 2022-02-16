// React imports
import React, { useContext, useState, useEffect } from 'react';
import { Text, TextInput, StyleSheet, View } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';

// Other imports
import _ from 'lodash';

// Internal imports
import AppStateContext from 'src/application/data';
import { assetInfo, mainPanelStates } from 'src/constants';
import { StandardButton } from 'src/components/atomic';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';




let Buy = () => {

  let appState = useContext(AppStateContext);

  appState.loadPIN();

  let selectedOrderSubmitted = (appState.pageName === 'continue') ? true : false;
  let [orderSubmitted, setOrderSubmitted] = useState(selectedOrderSubmitted);

  let selectedVolumeQA = '100';
  let selectedAssetQA = 'GBPX';
  let selectedVolumeBA = '0.05'; // Future: Set this to "Loading..." on start.
  let selectedAssetBA = 'BTC';

  // If we're reloading an existing order, load its details from the global state.
  if (appState.pageName === 'continue') {
    ({volumeQA: selectedVolumeQA, assetQA: selectedAssetQA} = appState.buyPanel);
    ({volumeBA: selectedVolumeBA, assetBA: selectedAssetBA} = appState.buyPanel);
  }

  // QA = Quote Asset
  let [volumeQA, setVolumeQA] = useState(selectedVolumeQA);
  let [openQA, setOpenQA] = useState(false);
  let [assetQA, setAssetQA] = useState(selectedAssetQA);
  let quoteAssets = 'GBPX EUR'.split(' ');
  let quoteAssetItems = quoteAssets.map(x => {
    let a = assetInfo[x];
    return {label: a.displayString, value: a.displaySymbol};
  });
  let [itemsQA, setItemsQA] = useState(quoteAssetItems);

  // BA = Base Asset
  let [volumeBA, setVolumeBA] = useState(selectedVolumeBA);
  let [openBA, setOpenBA] = useState(false);
  let [assetBA, setAssetBA] = useState(selectedAssetBA);
  let baseAssets = 'BTC ETH'.split(' ');
  let baseAssetItems = baseAssets.map(x => {
    let a = assetInfo[x];
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

  // By default, load price data.
  if (appState.pageName === 'default') {
    //loadPriceData(); // API call isn't working atm.
  }

  useEffect(() => {
    log('Recalculate volume');
    // Can't tell which volume value the user changed. Can only know that one of them did change.
    // So: Track previous values of both, compare with new values, find out which changed.
    // Then, use stored price for this market to recalculate the non-changed value.
    // Store the new values into the previous value holders.
    // Update the value that the user didn't manually change. This will trigger a re-render.
  }, [volumeQA, volumeBA]);

  let submitBuyRequest = async () => {
    // If the user isn't authenticated, push them into the auth sequence.

    if (! appState.user.isAuthenticated) {
      // This happens here, rather than in setMainPanelState, because we want the user to make the choice to buy prior to having to authenticate.
      // Save the order details in the global state.
      _.assign(appState.buyPanel, {volumeQA, assetQA, volumeBA, assetBA});
      // Stash the BUY state for later retrieval.
      appState.stashState({mainPanelState: mainPanelStates.BUY, pageName: 'continue'});
      appState.authenticateUser();
      return;
    }

    // To continue, we are either already authed, or we have returned from the auth sequence.
    let fxmarket = assetBA + '/' + assetQA;
    let data = await appState.apiClient.privateMethod({
      httpMethod: 'POST',
      apiMethod: 'buy',
      params: {
        fxmarket,
        amount: volumeBA,
        price: volumeQA,
      }
    })
    log(`submitBuyRequest: BUY ${volumeBA} ${fxmarket} @ MARKET ${volumeQA}`)
    log(data)
    /*
    Example error response:
    {"error":"Insufficient Funds"}
    Example data:
    {"id":11,"datetime":1643047261277,"type":0,"price":"100","amount":"0.05"}
    */
   // Future: If an error occurs, display the error description below the orderSubmitted description.
   setOrderSubmitted(true);
  }

  // Submit the order automatically if we have returned from auth sequence.
  if (appState.pageName === 'continue') {
    submitBuyRequest();
  }

  return (

    <View style={styles.panelContainer}>

      { ! orderSubmitted &&

        <View>

        <Text style={styles.boldText}>I want to spend:</Text>

        <View style={styles.quoteAssetWrapper}>
          <TextInput
            style={styles.volumeQA}
            onChangeText={setVolumeQA}
            value={volumeQA}
          />
          <DropDownPicker
            placeholder={assetInfo[selectedAssetQA].displayString}
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
            onChangeText={setVolumeBA}
            value={volumeBA}
          />
          <DropDownPicker
            placeholder={assetInfo[selectedAssetBA].displayString}
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
          <StandardButton title="Buy now" onPress={ submitBuyRequest } />
        </View>

        </View>
      }

      { orderSubmitted &&
        <View>
          <View style={styles.orderSubmittedMessage}>
            <Text style={styles.boldText}>Order submitted.{'\n'}</Text>
            <Text>Order description: Spend {volumeQA} {assetQA} to buy {volumeBA} {assetBA}.</Text>
          </View>
          <View style={styles.buttonWrapper}>
            <StandardButton title="Buy another asset" onPress={
              () => {
                appState.setMainPanelState({mainPanelState: mainPanelStates.BUY, pageName: 'default'});
                setOrderSubmitted(false);
              }
            } />
          </View>
          <View style={styles.buttonWrapper}>
            <StandardButton title="View orders" onPress={
              () => appState.setMainPanelState({mainPanelState: mainPanelStates.HISTORY, pageName: 'orders'})
            } />
          </View>
        </View>
      }

    </View>
  
  )
};


let styles = StyleSheet.create({
  panelContainer: {
    paddingTop: scaledHeight(80),
    paddingHorizontal: scaledWidth(15),
    borderLeftWidth: 1,
    borderRightWidth: 1,
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

// React imports
import React, { useContext, useState } from 'react';
import { FlatList, Text, TextInput, StyleSheet, View } from 'react-native';
import * as Keychain from 'react-native-keychain';
import { hasUserSetPinCode } from '@haskkor/react-native-pincode';
import DropDownPicker from 'react-native-dropdown-picker';

// Other imports
import _ from 'lodash';

// Internal imports
import AppStateContext from 'src/application/data';
import { colours, mainPanelStates } from 'src/constants';
import { StandardButton } from 'src/components/atomic';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';




let Buy = () => {

  let appState = useContext(AppStateContext);

  // We're using the BUY panel as the initial landing page.
  // -> Load the PIN from the keychain if it exists.
  // Note that this is via a promise - there will be a slight delay while the data is retrieved.
  // Future: Is it possible to move this to the splash page ?
  Keychain.getInternetCredentials(appState.appName).then((credentials) => {
    // Example result:
    // {"password": "1111", "server": "SolidiMobileApp", "storage": "keychain", "username": "SolidiMobileApp"}
    if (credentials) {
      let pin = credentials.password;
      appState.user.pin = pin;
      log(`PIN loaded: ${pin}`);
    }
  });


  let selectedOrderSubmitted = (appState.pageName === 'continue') ? true : false;
  let [orderSubmitted, setOrderSubmitted] = useState(selectedOrderSubmitted);

  let selectedVolumeQA = '100';
  let selectedSymbolQA = 'GBPX';
  let selectedVolumeBA = '0.05';
  let selectedSymbolBA = 'BTC';

  // If we're picking up an existing order, load its details from the global state.
  if (appState.pageName === 'continue') {
    ({volumeQA: selectedVolumeQA, symbolQA: selectedSymbolQA} = appState.buyPanel);
    ({volumeBA: selectedVolumeBA, symbolBA: selectedSymbolBA} = appState.buyPanel);
  }

  // QA = Quote Asset
  // Future: Load the items from the server.
  let [volumeQA, onChangeVolumeQA] = useState(selectedVolumeQA);
  let [openQA, setOpenQA] = useState(false);
  let [symbolQA, setSymbolQA] = useState(selectedSymbolQA);
  let [itemsQA, setItemsQA] = useState([
    {label: 'GBP (British Pound)', value: 'GBPX'},
    {label: 'EUR (Euro)', value: 'EUR'},
  ]);

  // BA = Base Asset
  let [volumeBA, onChangeVolumeBA] = useState(selectedVolumeBA);
  let [openBA, setOpenBA] = useState(false);
  let [symbolBA, setSymbolBA] = useState(selectedSymbolBA);
  let [itemsBA, setItemsBA] = useState([
    {label: 'BTC (Bitcoin)', value: 'BTC'},
    {label: 'ETH (Ethereum)', value: 'ETH'},
  ]);

  let submitBuyRequest = async () => {
    // If the user isn't authenticated, push them into the auth sequence.

    if (! appState.user.isAuthenticated) {
      // Save the order details in the global state.
      _.assign(appState.buyPanel, {volumeQA, symbolQA, volumeBA, symbolBA});
      // Stash the BUY state for later retrieval.
      appState.stashedState = {mainPanelState: mainPanelStates.BUY, pageName: 'continue'};
      // Choose auth sequence entry point.
      if (! appState.user.pin) {
        appState.setMainPanelState({mainPanelState: mainPanelStates.LOGIN});
      } else {
        appState.setMainPanelState({mainPanelState: mainPanelStates.PIN});
      }
      return;
    }

    // To continue, we are either already authed, or we have returned from the auth sequence.
    let fxmarket = symbolBA + '/' + symbolQA;
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
            onChangeText={onChangeVolumeQA}
            value={volumeQA}
          />
          <DropDownPicker
            placeholder="BTC (Bitcoin)"
            style={styles.quoteAsset}
            open={openQA}
            value={symbolQA}
            items={itemsQA}
            setOpen={setOpenQA}
            setValue={setSymbolQA}
            setItems={setItemsQA}
          />
        </View>

        <Text style={styles.boldText}>To get:</Text>

        <View style={styles.baseAssetWrapper}>
          <TextInput
            style={styles.volumeBA}
            onChangeText={onChangeVolumeBA}
            value={volumeBA}
          />
          <DropDownPicker
            placeholder="BTC (Bitcoin)"
            style={styles.baseAsset}
            open={openBA}
            value={symbolBA}
            items={itemsBA}
            setOpen={setOpenBA}
            setValue={setSymbolBA}
            setItems={setItemsBA}
          />
        </View>

        <View style={styles.buyButtonWrapper}>
          <StandardButton title="Buy now" onPress={ submitBuyRequest } />
        </View>

        </View>
      }

      { orderSubmitted &&
        <View style={styles.orderSubmittedMessage}>
          <Text style={styles.boldText}>Order submitted:{'\n'}</Text>
          <Text>Description: Spend {volumeQA} {symbolQA} to buy {volumeBA} {symbolBA}.</Text>
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
    /* 
    - quoteAssetWrapper needs to have a higher zIndex than baseAssetWrapper,
    so that the quoteAsset dropdown is overlaid "above" the baseAsset dropdown.
    - For some reason, this only works if the index values are negative.
    */
    zIndex: -1,
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
  baseAssetWrapper: {
    paddingVertical: scaledHeight(20),
    width: '80%',
    flexDirection: "row",
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: -5,
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
  buyButtonWrapper: {
    marginTop: 10,
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

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

  // Treat this as the initial page.
  // Load the PIN from the keychain if it exists. Note that this is via a promise - it'll race.
  // Future: Move this to the splash page ?
  Keychain.getInternetCredentials(appState.appName).then((credentials) => {
    // Example result:
    // {"password": "1111", "server": "SolidiMobileApp", "storage": "keychain", "username": "SolidiMobileApp"}
    if (credentials) {
      let pin = credentials.password;
      appState.user.pin = pin;
      log(`PIN loaded: ${pin}`);
    }
  });

  // QA = Quote Asset
  let [volumeQA, onChangeVolumeQA] = useState("100");
  let [openQA, setOpenQA] = useState(false);
  let [symbolQA, setSymbolQA] = useState('GBPX');
  let [itemsQA, setItemsQA] = useState([
    {label: 'GBP (British Pound)', value: 'GBPX'},
    {label: 'EUR (Euro)', value: 'EUR'},
  ]);

  // BA = Base Asset
  let [volumeBA, onChangeVolumeBA] = useState("0.05");
  let [openBA, setOpenBA] = useState(false);
  let [symbolBA, setSymbolBA] = useState('BTC');
  let [itemsBA, setItemsBA] = useState([
    {label: 'BTC (Bitcoin)', value: 'BTC'},
    {label: 'ETH (Ethereum)', value: 'ETH'},
  ]);

  //let [isLoading, setIsLoading] = useState(true);

  let submitBuyRequest = async () => {
    if (! appState.user.isAuthenticated) {
      if (! appState.user.pin) {
        appState.setMainPanelState({mainPanelState: mainPanelStates.LOGIN});
      } else {
        appState.setMainPanelState({mainPanelState: mainPanelStates.PIN});
      }
      return;
    }
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
  }

  return (

    <View style={styles.panelContainer}>

      <Text style={styles.text1}>I want to spend:</Text>

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

      <Text style={styles.text2}>To get:</Text>

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
  text1: {
    fontWeight: 'bold',
  },
  text2: {
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
});


export default Buy;

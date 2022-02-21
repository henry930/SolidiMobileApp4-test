// React imports
import React, { useContext, useEffect, useState } from 'react';
import { FlatList, Text, StyleSheet, View } from 'react-native';

// Other imports
import DropDownPicker from 'react-native-dropdown-picker';
import _ from 'lodash';
import Big from 'big.js';

// Internal imports
import { assetsInfo, mainPanelStates } from 'src/constants';
import AppStateContext from 'src/application/data';
import { Button } from 'src/components/atomic';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';


let Assets = () => {

  let appState = useContext(AppStateContext);

  let [isLoading, setIsLoading] = useState(true);
  let [reloadCount, setReloadCount] = useState(0);

  let selectedCategory = 'crypto';

  let [open, setOpen] = useState(false);
  let [category, setCategory] = useState(selectedCategory);
  let [categoryItems, setCategoryItems] = useState([
    {label: 'Crypto', value: 'crypto'},
    {label: 'Fiat', value: 'fiat'},
  ]);

  let getData = async () => {
    let data = await appState.apiClient.privateMethod({
      httpMethod: 'POST',
      apiMethod: 'balance',
      params: {},
    });
    // Example data:
/*
{
  "BTC": {
    "shortname": "Bitcoin",
    "confirms": 6,
    "deposit_enabled": 0,
    "withdraw_enabled": 0,
    "free_fee": "0.00000000",
    "high_fee": "0.00030000",
    "immed_fee": "0.00050000",
    "dp": 8,
    "deposit_msg": null,
    "withdraw_msg": null,
    "balance": "0.00000000"
  },
  "GBP": {
    "shortname": "GBP",
    "confirms": 1,
    "deposit_enabled": 0,
    "withdraw_enabled": 0,
    "free_fee": "0.50000000",
    "high_fee": "0.50000000",
    "immed_fee": "0.50000000",
    "dp": 2,
    "deposit_msg": null,
    "withdraw_msg": null,
    "balance": "9598.00000000"
  },
  "LTC": {
    "shortname": "Litecoin",
    "confirms": 12,
    "deposit_enabled": 0,
    "withdraw_enabled": 0,
    "free_fee": "0.00000000",
    "high_fee": "0.00005100",
    "immed_fee": "0.00011000",
    "dp": 8,
    "deposit_msg": null,
    "withdraw_msg": null,
    "balance": "0.00000000"
  },
  "XRP": {
    "shortname": "Ripple",
    "confirms": 20,
    "deposit_enabled": 0,
    "withdraw_enabled": 0,
    "free_fee": "-1.00000000",
    "high_fee": "-1.00000000",
    "immed_fee": "0.02000000",
    "dp": 6,
    "deposit_msg": null,
    "withdraw_msg": null,
    "balance": "0.00000000"
  }
}
*/
    appState.setAPIData({key: 'balance', data});
    setIsLoading(false);
  }

  useEffect(() => {
    getData();
  }, [reloadCount]);

  let renderLoadingMessage = () => {
    // Empty at present.
    return (
      <View style={styles.loadingMsg}>
        <Text></Text>
      </View>
    );
  }

  let renderControls = () => {
    return (
      <View style={styles.controls}>
        <View style={styles.assetCategoryWrapper}>
          <DropDownPicker
            placeholder='crypto'
            style={styles.assetCategory}
            open={open}
            value={category}
            items={categoryItems}
            setOpen={setOpen}
            setValue={setCategory}
            setItems={setCategoryItems}
          />
        </View>
        <Button title='Reload' onPress={ () => { setReloadCount(reloadCount+1); } } />
      </View>
    )
  }

  let renderAssetItem = ({ item }) => {
    // Example item:
    // {"asset": "XRP", "balance": "0.00000000", "confirms": 20, "deposit_enabled": 0, "deposit_msg": null, "dp": 6, "free_fee": "-1.00000000", "high_fee": "-1.00000000", "immed_fee": "0.02000000", "shortname": "Ripple", "withdraw_enabled": 0, "withdraw_msg": null}
    let asset = item.asset;
    let volume = item.balance;
    let assetDP = assetsInfo[asset].decimalPlaces;
    let displayVolume = Big(volume).toFixed(assetDP);
    let name = assetsInfo[asset].name;
    let symbol = assetsInfo[asset].displaySymbol;
    return (
      <View style={styles.flatListItem}>
        <Text style={[styles.assetText]}>{displayVolume}</Text>
        <Text style={[styles.boldText, styles.assetText]}>{name} - {symbol}</Text>
      </View>
    );
  }

  let renderAssets = () => {
    // FlatList requires a list input.
    // Transform the stored asset data into a list, sorted by asset symbol (e.g. "BTC").
    let data = appState.apiData.balance;
    let assets = _.keys(data).sort();
    let data2 = assets.map(asset => {
      let item = data[asset];
      item.asset = asset;
      return item;
    });
    // Filter depending on dropdown category.
    let data3 = data2.filter(item => assetsInfo[item.asset].type == category);
    return (
      <View style={styles.flatListWrapper}>
        <FlatList
          style={styles.assetList}
          data={data3}
          renderItem={renderAssetItem}
          keyExtractor={(item, index) => index}
          numColumns={1}
          scrollEnabled='true'
          contentContainerStyle={{justifyContent: 'center'}}
        />
      </View>
    );
  }

  return (
    <View style={styles.panelContainer}>

      { isLoading && renderLoadingMessage() }

      { ! isLoading && renderControls() }
      { ! isLoading && renderAssets() }

    </View>
  );

}


let styles = StyleSheet.create({
  panelContainer: {
    paddingHorizontal: scaledWidth(15),
    paddingVertical: scaledHeight(15),
    borderLeftWidth: 1,
    borderRightWidth: 1,
    width: '100%',
    height: '100%',
  },
  controls: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: "space-between",
    zIndex: 1,
    //borderWidth: 1,
  },
  assetCategoryWrapper: {
    width: '50%',
  },
  flatListWrapper: {
    height: '90%',
  },
  assetList: {
    //borderWidth: 1,
    marginTop: scaledHeight(15),
  },
  flatListItem: {
    marginBottom: scaledHeight(15),
    paddingHorizontal: scaledWidth(10),
    paddingVertical: scaledHeight(15),
    borderWidth: 1,
    borderColor: 'black',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: "space-between",
  },
  boldText: {
    fontWeight: 'bold',
  },
  assetText: {
    fontSize: normaliseFont(16),
  },
});


export default Assets;

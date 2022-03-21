// React imports
import React, { useContext, useEffect, useRef, useState } from 'react';
import { FlatList, Text, StyleSheet, View } from 'react-native';

// Other imports
import DropDownPicker from 'react-native-dropdown-picker';
import _ from 'lodash';
import Big from 'big.js';

// Internal imports
import { assetsInfo, mainPanelStates, colors } from 'src/constants';
import AppStateContext from 'src/application/data';
import { Button, StandardButton, Spinner } from 'src/components/atomic';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import misc from 'src/util/misc';




let Assets = () => {

  let appState = useContext(AppStateContext);
  let [isLoading, setIsLoading] = useState(true);
  let stateChangeID = appState.stateChangeID;

  let [reloadCount, setReloadCount] = useState(0);

  let selectedCategory = appState.pageName;
  if (selectedCategory == 'default') selectedCategory = 'crypto';
  let categories = 'crypto fiat'.split(' ');
  misc.confirmItemInArray('categories', categories, selectedCategory, 'Assets');

  let [open, setOpen] = useState(false);
  let [category, setCategory] = useState(selectedCategory);
  let [categoryItems, setCategoryItems] = useState([
    {label: 'Crypto', value: 'crypto'},
    {label: 'Fiat', value: 'fiat'},
  ]);


  // Initial setup.
  useEffect(() => {
    setup();
  }, []); // Pass empty array so that this only runs once on mount.


  let setup = async () => {
    await getData();
    setIsLoading(false); // Causes re-render.
  }


  let getData = async () => {
    await appState.loadBalances();
    if (appState.stateChangeIDHasChanged(stateChangeID)) return;
    // Todo: Need to cause a re-render. E.g. increment the reloadCount.
    // Alternatively, write a "reload" function, which handles the re-render step.
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
        <Button title='Reload' onPress={ getData } />
      </View>
    )
  }

  let renderAssetItem = ({ item }) => {
    // Example item:
    // {"asset": "XRP", "balance": "0.00000000"}
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
    // Transform the asset balance properties into a list of objects, sorted by asset symbol (e.g. "BTC").
    let data = appState.apiData.balance;
    let assets = _.keys(data).sort();
    let data2 = assets.map(asset => ( {asset, balance: data[asset]} ) );
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

      { isLoading && <Spinner/> }

      { ! isLoading &&
        <View style={[styles.heading, styles.heading1]}>
          <Text style={styles.headingText}>Assets</Text>
        </View>
      }

      { ! isLoading && renderControls() }
      { ! isLoading && renderAssets() }

    </View>
  );

}


let styles = StyleSheet.create({
  panelContainer: {
    paddingHorizontal: scaledWidth(15),
    paddingVertical: scaledHeight(15),
    width: '100%',
    height: '100%',
  },
  heading: {
    alignItems: 'center',
  },
  heading1: {
    marginTop: scaledHeight(10),
    marginBottom: scaledHeight(30),
  },
  headingText: {
    fontSize: normaliseFont(20),
    fontWeight: 'bold',
  },
  controls: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: "space-between",
    zIndex: 1,
    //borderWidth: 1, // testing
  },
  assetCategoryWrapper: {
    width: '50%',
  },
  flatListWrapper: {
    height: '80%',
    //borderWidth: 1, // testing
  },
  assetList: {
    //borderWidth: 1, // testing
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

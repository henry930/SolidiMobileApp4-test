// React imports
import React, { useContext, useEffect, useState } from 'react';
import { FlatList, Text, StyleSheet, View } from 'react-native';

// Other imports
import DropDownPicker from 'react-native-dropdown-picker';
import _ from 'lodash';
import Big from 'big.js';

// Internal imports
import AppStateContext from 'src/application/data';
import { mainPanelStates, colors } from 'src/constants';
import { Button, StandardButton, Spinner } from 'src/components/atomic';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import misc from 'src/util/misc';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('History');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);




let History = () => {

  let appState = useContext(AppStateContext);
  let [renderCount, triggerRender] = useState(0);
  let stateChangeID = appState.stateChangeID;
  let [isLoading, setIsLoading] = useState(true);


  // Check pageName to see if a category has been specified as this panel is loaded.
  let selectedCategory = 'orders'; // default value.
  let categories = 'orders transactions'.split(' ');
  let pageName = appState.pageName;
  if (pageName !== 'default') {
    if (! categories.includes(pageName)) {
      throw Error(`Unrecognised category: ${pageName}`);
    }
    selectedCategory = pageName;
  }


  // Dropdown state: Category
  let [open, setOpen] = useState(false);
  let [category, setCategory] = useState(selectedCategory);
  let [categoryItems, setCategoryItems] = useState([
    {label: 'Orders', value: 'orders'},
    {label: 'All Transactions', value: 'transactions'},
  ]);


  // Initial setup.
  useEffect(() => {
    setup();
  }, []); // Pass empty array so that this only runs once on mount.


  let setup = async () => {
    try {
      await appState.generalSetup();
      await appState.loadOrders();
      await appState.loadTransactions();
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
      setIsLoading(false);
      triggerRender(renderCount+1);
    } catch(err) {
      let msg = `History.setup: Error = ${err}`;
      console.log(msg);
    }
  }


  let displayHistoryControls = () => {

    return (
      <View style={styles.historyControls}>
        <View style={styles.historyCategoryWrapper}>
          <DropDownPicker
            placeholder="transactions"
            style={styles.historyCategory}
            open={open}
            value={category}
            items={categoryItems}
            setOpen={setOpen}
            setValue={setCategory}
            setItems={setCategoryItems}
            textStyle={{
              fontSize: normaliseFont(10),
            }}
          />
        </View>
        <Button title='Reload' onPress={ setup } />
      </View>
    );
  }


  let codeToType = (code) => {
    let convert = {
      'PI': 'Receive', // == deposit
      'PO': 'Send', // == withdrawal
      'FI': 'Fees',
      'FO': 'Fees',
      'BY': 'Buy',
      'SL': 'Sell',
    }
    let type = convert[code];
    return type;
  }


  let renderTransactions = () => {
    let data = appState.getTransactions();
    return (
      <View style={styles.flatListWrapper}>
        <FlatList
          style={styles.transactionList}
          data={data}
          renderItem={renderTransactionItem}
          keyExtractor={(item, index) => index}
          numColumns={1}
          scrollEnabled={true}
          contentContainerStyle={{justifyContent: 'center'}}
        />
      </View>
    );
  }


  let renderTransactionItem = ({ item }) => {
    let txnDate = item['date'];
    let txnTime = item['time'];
    let txnCode = item['code'];
    let baseAsset = item['baseAsset'];
    let baseDP = appState.getAssetInfo(baseAsset).decimalPlaces;
    let baseAssetVolume = Big(item['baseAssetVolume']).toFixed(baseDP);
    let reference = item['reference'];
    try {
      reference = JSON.parse(reference);
    } catch(err) {}
    // Example reference:
    // {"ref":"CKF2NM7","paymeth":8,"txntype":"standard"}
    if (_.has(reference, 'ref')) {
      reference = reference.ref;
    } else {
      reference = '[none]';
    }
    if (! _.isString(reference)) reference = JSON.stringify(reference); // just in case.
    return (
      <View style={styles.flatListItem}>
        <Text style={styles.basicText}>{txnDate} {txnTime}</Text>
        <Text style={[styles.basicText, styles.typeField]}>{codeToType(txnCode)}</Text>
        <Text style={styles.basicText}>{baseAssetVolume} {appState.getAssetInfo(baseAsset).displayString}</Text>
        <Text style={styles.basicText}>Reference: {reference}</Text>
      </View>
    );
  }


  let renderOrders = () => {
    let data = appState.getOrders();
    return (
      <View style={styles.flatListWrapper}>
        <FlatList
          style={styles.orderList}
          data={data}
          renderItem={renderOrderItem}
          keyExtractor={(item, index) => index}
          numColumns={1}
          scrollEnabled={true}
          contentContainerStyle={{justifyContent: 'center'}}
        />
      </View>
    );
  }


  let renderOrderItem = ({ item }) => {
    let market = item['market'];
    let orderSide = item['side'];
    let [baseAsset, quoteAsset] = market.split('/');
    let baseDP = appState.getAssetInfo(baseAsset).decimalPlaces;
    let quoteDP = appState.getAssetInfo(quoteAsset).decimalPlaces;
    let baseVolume = Big(item['baseVolume']).toFixed(baseDP);
    let quoteVolume = Big(item['quoteVolume']).toFixed(quoteDP);
    let orderStatus = item['status'];
    let _styleOrder = styles.settledOrderStatus;
    if (orderStatus == 'LIVE') _styleOrder = styles.liveOrderStatus;
    if (orderStatus == 'CANCELLED') _styleOrder = styles.cancelledOrderStatus;
    return (
      <View style={styles.flatListItem}>
        <View style={styles.orderTopWrapper}>
          <Text style={styles.basicText}>{item['date']} {item['time']}</Text>
          <Text style={[styles.basicText, _styleOrder]}>{orderStatus}</Text>
        </View>
        <Text style={[styles.basicText, styles.typeField]}>{orderSide}</Text>
        <Text style={styles.basicText}>Spent {quoteVolume} {quoteAsset} to get {baseVolume} {baseAsset}.</Text>
      </View>
    );
  }


  return (
    <View style={styles.panelContainer}>

      <View style={styles.historySection}>

        <View style={[styles.heading, styles.heading1]}>
          <Text style={styles.headingText}>History</Text>
        </View>

        { isLoading && <Spinner/> }

        {! isLoading && displayHistoryControls()}

        {! isLoading && category === 'orders' &&
          renderOrders()}

        {! isLoading && category === 'transactions' &&
          renderTransactions()}
      </View>
    </View>
  );

}


let styles = StyleSheet.create({
  panelContainer: {
    width: '100%',
    height: '100%',
    paddingTop: scaledHeight(15),
    paddingHorizontal: scaledWidth(15),
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
  basicText: { // Note: basicText size is normally 16.
    fontSize: normaliseFont(10),
  },
  historySection: {
    height: '100%',
    //borderWidth: 1, // testing
  },
  historyControls: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: "space-between",
    zIndex: 1,
  },
  historyCategoryWrapper: {
    width: '50%',
    //borderWidth: 1, // testing
  },
  historyCategory: {
    height: scaledHeight(40),
  },
  flatListWrapper: {
    height: '80%',
    //borderWidth: 1, // testing
  },
  flatListItem: {
    marginTop: scaledHeight(10),
    paddingHorizontal: scaledWidth(10),
    paddingVertical: scaledHeight(10),
    borderWidth: 1,
    borderColor: 'black',
    borderRadius: 8,
  },
  orderTopWrapper: {
    flexDirection: 'row',
    justifyContent: "space-between",
  },
  settledOrderStatus: {
    color: 'blue',
    fontWeight: '500',
  },
  liveOrderStatus: {
    color: 'green',
    fontWeight: '500',
  },
  cancelledOrderStatus: {
    color: 'darkgrey',
    fontWeight: '500',
  },
  typeField: {
    fontWeight: 'bold',
  },
})


export default History;

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
  let [isLoading, setIsLoading] = useState(true);
  let stateChangeID = appState.stateChangeID;


  // Initial setup.
  useEffect(() => {
    setup();
  }, []); // Pass empty array so that this only runs once on mount.


  let setup = async () => {
    try {
      await getData();
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
      setIsLoading(false); // Causes re-render.
    } catch(err) {
      let msg = `History.setup: Error = ${err}`;
      console.log(msg);
    }
  }


  let getData = async () => {
    let data = await appState.privateMethod({apiRoute: 'transaction'});
    if (appState.stateChangeIDHasChanged(stateChangeID)) return;
    // Example data:
    // {"total": 1, "transactions": [{"cur1": "GBP", "cur1amt": "10000.00000000", "cur2": "", "cur2amt": "0.00000000", "fee_cur": "", "fees": "0.00000000", "fxmarket": 1, "ref": "initial deposit", "short_desc": "Transfer In", "status": "A", "txn_code": "PI", "txn_date": "14 Feb 2022", "txn_time": "16:56"}]}
    //appState.setAPIData({key: 'transaction', data});
    appState.apiData.transaction = data;
    let data2 = await appState.privateMethod({apiRoute: 'order'});
    if (appState.stateChangeIDHasChanged(stateChangeID)) return;
    // Example data:
    // {"results": [{"date": "14 Feb 2022", "fxmarket": "BTC/GBPX", "id": 31, "ocount": "1", "order_age": "147", "order_type": "Limit", "price": "100.00000000", "qty": "0.05000000", "s1_id": null, "s1_status": null, "s2_id": null, "s2_status": null, "side": "Buy", "status": "LIVE", "time": "17:34:42", "unixtime": "1644860082"}], "total": "1"}
    //appState.setAPIData({key: 'order', data:data2});
    appState.apiData.order = data2;
  }

  // Check to see if a category has been specified as this panel is loaded.
  let selectedCategory = 'orders'; // default value.
  let categories = 'transactions orders'.split(' ');
  let pageName = appState.pageName;
  if (pageName !== 'default') {
    if (! categories.includes(pageName)) {
      throw Error(`Unrecognised category: ${pageName}`);
    }
    selectedCategory = pageName;
  }

  let [open, setOpen] = useState(false);
  let [category, setCategory] = useState(selectedCategory);
  let [categoryItems, setCategoryItems] = useState([
    {label: 'Orders', value: 'orders'},
    {label: 'All Transactions', value: 'transactions'},
  ]);

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
          />
        </View>
        <Button title='Reload' onPress={ getData } />
      </View>
    );
  }

  let codeToType = (code) => {
    let convert = {
      'PI': 'Deposit',
      'PO': 'Withdrawal',
      'FI': 'Fees',
      'FO': 'Fees',
      'BY': 'Buy',
      'SL': 'Sell',
    }
    let type = convert[code];
    return type;
  }

  let renderTransactionItem = ({ item }) => {
    let asset = item.cur1;
    let volumeDP = appState.getAssetInfo(asset).decimalPlaces;
    let volume = Big(item.cur1amt).toFixed(volumeDP);
    return (
      <View style={styles.flatListItem}>
        <Text>{item.txn_date} {item.txn_time}</Text>
        <Text style={styles.typeField}>{codeToType(item.txn_code)}</Text>
        <Text>{volume} {appState.getAssetInfo(asset).displayString}</Text>
        <Text>Reference: {item.ref}</Text>
      </View>
    );
  }

  let renderTransactions = () => {
    let data = appState.apiData.transaction.transactions;
    return (
      <View style={styles.flatListWrapper}>
        <FlatList
          style={styles.transactionList}
          data={data}
          renderItem={renderTransactionItem}
          keyExtractor={(item, index) => index}
          numColumns={1}
          scrollEnabled='true'
          contentContainerStyle={{justifyContent: 'center'}}
        />
      </View>
    );
  }
  let renderOrderItem = ({ item }) => {
    let market = misc.getStandardMarket(item['fxmarket'])
    let [baseAsset, quoteAsset] = market.split('/');
    let priceDP = appState.getAssetInfo(quoteAsset).decimalPlaces;
    let price = Big(item.price).toFixed(priceDP);
    let orderStatus = item.status;
    return (
      <View style={styles.flatListItem}>
        <View style={styles.orderTopWrapper}>
          <Text>{item.date} {item.time}</Text>
          { orderStatus == 'LIVE' &&
            <Text style={styles.liveOrderStatus}>{orderStatus}</Text>
          }
          { orderStatus == 'SETTLED' &&
            <Text style={styles.settledOrderStatus}>{orderStatus}</Text>
          }
        </View>
        <Text style={styles.typeField}>{item.side} Order</Text>
        <Text>Spent {price} {appState.getAssetInfo(quoteAsset).displaySymbol} to get {item.qty} {appState.getAssetInfo(baseAsset).displaySymbol}.</Text>
      </View>
    );
  }

  let renderOrders = () => {
    let data = appState.apiData.order.results;
    return (
      <View style={styles.flatListWrapper}>
        <FlatList
          style={styles.orderList}
          data={data}
          renderItem={renderOrderItem}
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

      <View style={styles.historySection}>

        { isLoading && <Spinner/> }

        {! isLoading &&
          <View style={[styles.heading, styles.heading1]}>
            <Text style={styles.headingText}>History</Text>
          </View>
        }

        {! isLoading && displayHistoryControls()}
        {! isLoading && category === 'transactions' &&
          renderTransactions()}
        {! isLoading && category === 'orders' &&
          renderOrders()}
      </View>
    </View>
  );

}


const styles = StyleSheet.create({
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
  liveOrderStatus: {
    color: 'green',
    fontWeight: '500',
  },
  settledOrderStatus: {
    color: 'blue',
    fontWeight: '500',
  },
  typeField: {
    fontWeight: 'bold',
  },
})


export default History;

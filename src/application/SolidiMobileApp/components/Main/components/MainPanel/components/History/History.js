// React imports
import React, { useContext, useEffect, useState } from 'react';
import { FlatList, Text, StyleSheet, View } from 'react-native';

// Other imports
import DropDownPicker from 'react-native-dropdown-picker';
import _ from 'lodash';
import Big from 'big.js';

// Internal imports
import { assets, mainPanelStates } from 'src/constants';
import AppStateContext from 'src/application/data';
import { Button } from 'src/components/atomic';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';


let History = () => {

  let appState = useContext(AppStateContext);

  let [isLoading, setIsLoading] = useState(true);
  let [reloadCount, setReloadCount] = useState(0);

  let getData = async () => {
    let data = await appState.apiClient.privateMethod({
      httpMethod: 'POST',
      apiMethod: 'transaction',
      params: {}
    })
    // Example data:
    // {"total": 1, "transactions": [{"cur1": "GBP", "cur1amt": "10000.00000000", "cur2": "", "cur2amt": "0.00000000", "fee_cur": "", "fees": "0.00000000", "fxmarket": 1, "ref": "initial deposit", "short_desc": "Transfer In", "status": "A", "txn_code": "PI", "txn_date": "14 Feb 2022", "txn_time": "16:56"}]}
    appState.setHistoryTransactions(data.transactions);
    data = await appState.apiClient.privateMethod({
      httpMethod: 'POST',
      apiMethod: 'order',
      params: {}
    })
    // Example data:
    // {"results": [{"date": "14 Feb 2022", "fxmarket": "BTC/GBPX", "id": 31, "ocount": "1", "order_age": "147", "order_type": "Limit", "price": "100.00000000", "qty": "0.05000000", "s1_id": null, "s1_status": null, "s2_id": null, "s2_status": null, "side": "Buy", "status": "LIVE", "time": "17:34:42", "unixtime": "1644860082"}], "total": "1"}
    appState.setHistoryOrders(data.results);
    setIsLoading(false);
  }

  let displayLoadingMsg = () => {
    let loadingMsg = 'Loading... please wait.';
    return (
      <View style={styles.loadingMsg}>
        <Text>{loadingMsg}</Text>
      </View>
    );
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
    {label: 'Transactions', value: 'transactions'},
  ]);

  useEffect(() => {
    getData();
  }, [reloadCount]);

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
        <Button title='Reload' styles={stylesReloadButton}
          onPress={ () => { setReloadCount(reloadCount+1); } }
        />
      </View>
    );
  }

  let codeToType = (code) => {
    let convert = {
      'PI': 'Transfer In',
      'PO': 'Transfer Out',
      'FI': 'Fees',
      'FO': 'Fees',
      'BY': 'Buy',
      'SL': 'Sell',
    }
    let type = convert[code];
    return type;
  }

  let renderTransactionItem = ({ item }) => {
    return (
      <View style={styles.flatListItem}>
        <Text>{item.txn_date} {item.txn_time}</Text>
        <Text style={styles.typeField}>{codeToType(item.txn_code)}</Text>
        <Text>Currency: {item.cur1}</Text>
        <Text>Amount: {item.cur1amt}</Text>
        <Text>Reference: {item.ref}</Text>
      </View>
    );
  }

  let renderTransactions = () => {
    return (
      <View style={styles.flatListWrapper}>
        <FlatList
          style={styles.transactionList}
          data={appState.history.transactions}
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
    let [baseAsset, quoteAsset] = item['fxmarket'].split('/');
    let priceDP = assets[quoteAsset].decimalPlaces;
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
        <Text>Spent {price} {assets[quoteAsset].displaySymbol} to get {item.qty} {assets[baseAsset].displaySymbol}.</Text>
      </View>
    );
  }

  let renderOrders = () => {
    return (
      <View style={styles.flatListWrapper}>
        <FlatList
          style={styles.orderList}
          data={appState.history.orders}
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
    <AppStateContext.Consumer>
    {(context) =>
      <View style={styles.history}>
        <View style={styles.historyInternalBox}>
          {isLoading && displayLoadingMsg()}
          {/* {! isLoading && displayHistoryControls()} */}
          {! isLoading && displayHistoryControls()}
          {! isLoading && category === 'transactions' &&
            renderTransactions()}
          {! isLoading && category === 'orders' &&
            renderOrders()}
        </View>
      </View>
    }
    </AppStateContext.Consumer>
  );

}


const styles = StyleSheet.create({
  history: {
    width: '100%',
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  historyInternalBox: {
    height: '100%',
    paddingHorizontal: scaledWidth(15),
    paddingVertical: scaledHeight(15),
  },
  historyControls: {
    width: '100%',
    height: '10%',
    flexDirection: 'row',
    justifyContent: "space-between",
    zIndex: 1,
  },
  historyCategoryWrapper: {
    width: '50%',
  },
  flatListWrapper: {
    height: '90%',
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


const stylesReloadButton = StyleSheet.create({
  text: {
    paddingRight: 0,
    marginRight: 0,
    fontSize: normaliseFont(16),
  }
})


export default History;

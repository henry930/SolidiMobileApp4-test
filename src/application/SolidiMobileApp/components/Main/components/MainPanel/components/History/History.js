// React imports
import React, { useContext, useEffect, useState } from 'react';
import { FlatList, Text, StyleSheet, View } from 'react-native';

// Other imports
import DropDownPicker from 'react-native-dropdown-picker';
import _ from 'lodash';

// Internal imports
import { colours, mainPanelStates } from 'src/constants';
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
    appState.setHistoryTransactions(data.transactions);
    /*
    data = await appState.apiClient.privateMethod({
      httpMethod: 'GET',
      apiMethod: 'order',
      params: {}
    })
    log(data)
    */
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

  let [open, setOpen] = useState(false);
  let [category, setCategory] = useState('transactions');
  let [categoryItems, setCategoryItems] = useState([
    {label: 'Orders', value: 'orders'},
    {label: 'Transactions', value: 'transactions'},
  ]);

  useEffect(() => {
    getData();
  }, [category, reloadCount]);

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
      <View style={styles.transaction}>
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
      <View style={styles.transactionListWrapper}>
        <FlatList
          style={styles.transactionList}
          data={appState.history.transactions}
          renderItem={renderTransactionItem}
          keyExtractor={(item, index) => index}
          numColumns={1}
          scrollEnabled='true'
          contentContainerStyle={{flexGrow: 1, justifyContent: 'center'}}
        />
      </View>
    );
  }

  let renderOrders = () => {
    // placeholder
    return renderTransactions();
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
  transactionListWrapper: {
    height: '90%',
  },
  transaction: {
    marginTop: scaledHeight(10),
    paddingHorizontal: scaledWidth(10),
    paddingVertical: scaledHeight(10),
    borderWidth: 1,
    borderColor: 'black',
    borderRadius: 8,
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

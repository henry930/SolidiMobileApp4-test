// React imports
import React, { useContext, useEffect, useState } from 'react';
import { FlatList, StyleSheet, View, Platform } from 'react-native';
import { TouchableNativeFeedback, TouchableOpacity } from 'react-native';

// Material Design imports
import {
  Card,
  Text,
  useTheme,
  SegmentedButtons,
  Avatar,
  Chip,
  Button,
  Surface,
} from 'react-native-paper';

// Other imports
import _ from 'lodash';
import Big from 'big.js';

// Internal imports
import AppStateContext from 'src/application/data';
import { colors } from 'src/constants';
import { Spinner } from 'src/components/atomic';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import misc from 'src/util/misc';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('History');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);


let Touchable = Platform.select({
  ios: TouchableOpacity,
  android: TouchableNativeFeedback,
  // Note: TouchableNativeFeedback expects exactly 1 child element e.g. <View/>
});




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
      await appState.generalSetup({caller: 'History'});
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
      <Card style={{ marginBottom: 16 }}>
        <Card.Content>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text variant="titleMedium">View:</Text>
            <SegmentedButtons
              value={category}
              onValueChange={setCategory}
              buttons={[
                { value: 'orders', label: 'Orders' },
                { value: 'transactions', label: 'Transactions' },
              ]}
              density="small"
            />
          </View>
        </Card.Content>
      </Card>
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
    data = data['txns'];
    
    if (!data || data.length === 0) {
      return (
        <Card>
          <Card.Content style={{ alignItems: 'center', paddingVertical: 32 }}>
            <Avatar.Icon icon="swap-horizontal" size={64} style={{ marginBottom: 16 }} />
            <Text variant="titleMedium" style={{ marginBottom: 8 }}>
              No transactions found
            </Text>
            <Text variant="bodyMedium" style={{ textAlign: 'center', color: 'rgba(0,0,0,0.6)' }}>
              Your transaction history will appear here.
            </Text>
          </Card.Content>
        </Card>
      );
    }
    
    return (
      <FlatList
        data={data}
        renderItem={renderTransactionItem}
        keyExtractor={(item, index) => index.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
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
    } catch(err) {
      log(`Failed to parse txn. Error=${err.stack}`)
    }
    // Example reference:
    // {"ref":"CKF2NM7","paymeth":8,"txntype":"standard"}
    if (_.has(reference, 'ref')) {
      reference = reference.ref;
    } else {
      reference = '[none]';
    }
    if (! _.isString(reference)) reference = JSON.stringify(reference); // just in case.
    
    const getTransactionIcon = (code) => {
      const iconMap = {
        'PI': 'arrow-down-circle',
        'PO': 'arrow-up-circle', 
        'FI': 'cash-minus',
        'FO': 'cash-minus',
        'BY': 'shopping',
        'SL': 'trending-down',
      };
      return iconMap[code] || 'swap-horizontal';
    };

    const getTransactionColor = (code) => {
      const colorMap = {
        'PI': materialTheme.colors.primary,
        'PO': materialTheme.colors.secondary, 
        'FI': materialTheme.colors.error,
        'FO': materialTheme.colors.error,
        'BY': materialTheme.colors.primary,
        'SL': materialTheme.colors.secondary,
      };
      return colorMap[code] || materialTheme.colors.outline;
    };
    
    return (
      <Card style={{ marginBottom: 8 }}>
        <Card.Content style={{ paddingVertical: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Avatar.Icon 
                icon={getTransactionIcon(txnCode)}
                size={40}
                style={{ marginRight: 12, backgroundColor: getTransactionColor(txnCode) }}
              />
              <View style={{ flex: 1 }}>
                <Text variant="titleMedium" style={{ fontWeight: '600' }}>
                  {codeToType(txnCode)}
                </Text>
                <Text variant="bodyMedium" style={{ color: 'rgba(0,0,0,0.6)' }}>
                  {txnDate} {txnTime}
                </Text>
                <Text variant="bodySmall" style={{ color: 'rgba(0,0,0,0.6)' }}>
                  Ref: {reference}
                </Text>
              </View>
            </View>
            <Text variant="titleMedium" style={{ fontWeight: '600' }}>
              {baseAssetVolume} {appState.getAssetInfo(baseAsset).displayString}
            </Text>
          </View>
        </Card.Content>
      </Card>
    );
  }


  let renderOrders = () => {
    let data = appState.getOrders();
    
    if (data.length === 0) {
      return (
        <Card>
          <Card.Content style={{ alignItems: 'center', paddingVertical: 32 }}>
            <Avatar.Icon icon="shopping-outline" size={64} style={{ marginBottom: 16 }} />
            <Text variant="titleMedium" style={{ marginBottom: 8 }}>
              No orders found
            </Text>
            <Text variant="bodyMedium" style={{ textAlign: 'center', color: 'rgba(0,0,0,0.6)' }}>
              Your trading orders will appear here once you make some trades.
            </Text>
          </Card.Content>
        </Card>
      );
    }
    
    return (
      <FlatList
        data={data}
        renderItem={renderOrderItem}
        keyExtractor={(item, index) => index.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    );
  }


  let renderOrderItem = ({ item }) => {
    let orderID = item['id'];
    let market = item['market'];
    let orderSide = item['side'];
    let [baseAsset, quoteAsset] = market.split('/');
    let baseDP = appState.getAssetInfo(baseAsset).decimalPlaces;
    let quoteDP = appState.getAssetInfo(quoteAsset).decimalPlaces;
    let baseVolume = Big(item['baseVolume']).toFixed(baseDP);
    let quoteVolume = Big(item['quoteVolume']).toFixed(quoteDP);
    let orderStatus = item['status'];
    
    const getStatusColor = (status) => {
      switch(status) {
        case 'LIVE': return materialTheme.colors.primary;
        case 'SETTLED': return materialTheme.colors.tertiary;
        case 'CANCELLED': return materialTheme.colors.error;
        default: return materialTheme.colors.outline;
      }
    };

    const getOrderIcon = (side) => {
      return side === 'BUY' ? 'trending-up' : 'trending-down';
    };

    return (
      <Surface style={{ marginBottom: 8, borderRadius: 12 }} elevation={1}>
        <TouchableOpacity 
          onPress={() => {
            if (orderStatus != 'SETTLED') return;
            // Move to order-specific page.
            let side = orderSide.toLowerCase();
            appState.changeStateParameters.orderID = orderID;
            if (side == 'buy') {
              appState.changeState('PurchaseSuccessful');
            } else {
              appState.changeState('SaleSuccessful');
            }
          }}
          style={{ padding: 16 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Avatar.Icon 
                icon={getOrderIcon(orderSide)}
                size={32}
                style={{ marginRight: 8 }}
              />
              <Text variant="titleMedium" style={{ fontWeight: '600' }}>
                {orderSide}
              </Text>
            </View>
            <Chip 
              mode="flat"
              textStyle={{ fontSize: 12, color: getStatusColor(orderStatus) }}
              style={{ backgroundColor: `${getStatusColor(orderStatus)}20` }}
            >
              {orderStatus}
            </Chip>
          </View>
          
          <Text variant="bodyMedium" style={{ color: 'rgba(0,0,0,0.6)', marginBottom: 4 }}>
            {item['date']} {item['time']}
          </Text>
          
          <Text variant="bodyMedium">
            Spent {quoteVolume} {quoteAsset} to get {baseVolume} {baseAsset}
          </Text>
        </TouchableOpacity>
      </Surface>
    );
  }


  const materialTheme = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: materialTheme.colors.background, padding: 16 }}>
      <Card style={{ marginBottom: 16 }}>
        <Card.Title 
          title="Transaction History" 
          subtitle="View your trading orders and transactions"
          left={(props) => <Avatar.Icon {...props} icon="history" />}
        />
      </Card>

      { isLoading && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Spinner/>
        </View>
      )}

      {! isLoading && displayHistoryControls()}

      {! isLoading && category === 'orders' && renderOrders()}

      {! isLoading && category === 'transactions' && renderTransactions()}
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
  basicText: {
    fontSize: normaliseFont(14),
  },
  mediumText: {
    fontSize: normaliseFont(16),
  },
  dropdownText: {
    fontSize: normaliseFont(14),
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

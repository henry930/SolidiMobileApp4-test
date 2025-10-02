// React imports
import React, { useContext, useEffect, useState } from 'react';
import { FlatList, StyleSheet, View, Platform, ScrollView } from 'react-native';
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
import { Title } from 'src/components/shared';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import misc from 'src/util/misc';
import HistoryDataModel, { TransactionDataModel, OrderDataModel } from './HistoryDataModel';

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
  let [historyDataModel, setHistoryDataModel] = useState(new HistoryDataModel());
  let [selectedHistoryCategory, setSelectedHistoryCategory] = useState('Transactions');
  let [transactionsData, setTransactionsData] = useState([]);  // Add state for transaction data


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


  const setup = async () => {
    console.log('History setup - loading transaction history');
    
    try {
      // Check if API client is available
      if (!appState.apiClient) {
        console.log('API client not available yet');
        setIsLoading(false);
        return;
      }
      
      // Load data from API using the correct appState method
      let response = await appState.privateMethod({
        apiRoute: 'transaction',
        functionName: 'History.setup'
      });
      
      if (response.error) {
        console.log('Error loading transaction history:', response.error);
        setIsLoading(false);
        return;
      }
      
      // Create data model and load transaction data
      const dataModel = new HistoryDataModel();
      const loadedTransactions = dataModel.loadTransactions(response);
      
      console.log('Transaction history loaded successfully - Count:', loadedTransactions.length);
      setHistoryDataModel(dataModel);
      
      console.log('Transaction history loaded successfully');
      setIsLoading(false);
    } catch (error) {
      console.log('Exception loading transaction history:', error);
      setIsLoading(false);
    }
  }


  let displayHistoryControls = () => {
    return (
      <Card style={{ marginBottom: 16, elevation: 2 }}>
        <Card.Content>
          <SegmentedButtons
            value={selectedHistoryCategory}
            onValueChange={setSelectedHistoryCategory}
            buttons={[
              {
                value: 'Transactions',
                label: 'Transactions',
                icon: 'swap-horizontal',
                style: selectedHistoryCategory === 'Transactions' ? { backgroundColor: '#10b981' } : {},
                labelStyle: selectedHistoryCategory === 'Transactions' ? { color: 'white', fontWeight: '600' } : { fontWeight: '500' }
              },
              {
                value: 'Orders',
                label: 'Orders',
                icon: 'format-list-bulleted',
                style: selectedHistoryCategory === 'Orders' ? { backgroundColor: '#6366f1' } : {},
                labelStyle: selectedHistoryCategory === 'Orders' ? { color: 'white', fontWeight: '600' } : { fontWeight: '500' }
              },
            ]}
            style={{ marginBottom: 8 }}
          />
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
    console.log('🔍 renderTransactions called');
    console.log('🔍 historyDataModel exists:', !!historyDataModel);
    
    if (!historyDataModel) {
      console.log('🔍 No historyDataModel - showing no data card');
      return (
        <Card>
          <Card.Content style={{ alignItems: 'center', paddingVertical: 32 }}>
            <Avatar.Icon icon="history" size={64} style={{ marginBottom: 16 }} />
            <Text variant="titleMedium" style={{ marginBottom: 8 }}>
              No transaction data
            </Text>
            <Text variant="bodyMedium" style={{ textAlign: 'center', color: 'rgba(0,0,0,0.6)' }}>
              Unable to load transaction history at this time.
            </Text>
          </Card.Content>
        </Card>
      );
    }
    
    let data = historyDataModel.getTransactions();
    console.log('🔍 Transaction data:', data);
    console.log('🔍 Transaction data length:', data?.length);
    console.log('🔍 Transaction data type:', typeof data);
    console.log('🔍 Transaction data isArray:', Array.isArray(data));
    console.log('🔍 First item:', data?.[0]);
    console.log('🔍 Second item:', data?.[1]);
    
    if (!data || data.length === 0) {
      console.log('🔍 No transaction data - showing empty card');
      return (
        <Card>
          <Card.Content style={{ alignItems: 'center', paddingVertical: 32 }}>
            <Avatar.Icon icon="history" size={64} style={{ marginBottom: 16 }} />
            <Text variant="titleMedium" style={{ marginBottom: 8 }}>
              No transactions found
            </Text>
            <Text variant="bodyMedium" style={{ textAlign: 'center', color: 'rgba(0,0,0,0.6)' }}>
              Your transaction history will appear here once you make some transactions.
            </Text>
          </Card.Content>
        </Card>
      );
    }
    
    console.log('🔍 Rendering ScrollView with', data.length, 'transactions');
    
    // Show the actual transactions in a working ScrollView (with fixed height)
    return (
      <ScrollView 
        style={{ height: 400 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 10 }}
      >
        {data.map((item, index) => (
          <View key={item.id || index.toString()}>
            {renderTransactionItem({ item })}
          </View>
        ))}
      </ScrollView>
    );
  }


  let renderTransactionItem = ({ item }) => {
    console.log('🎨 renderTransactionItem starting for:', item?.baseAsset);
    
    // Handle error items
    if (item?.error) {
      console.log('❌ Item has error, returning error card');
      return (
        <Card style={{ marginBottom: 8 }}>
          <Card.Content style={{ paddingVertical: 12 }}>
            <Text style={{ color: 'red' }}>Invalid transaction data</Text>
          </Card.Content>
        </Card>
      );
    }
    
    try {
      if (!item) {
        console.log('❌ Item is null/undefined');
        return (
          <Card style={{ marginBottom: 8 }}>
            <Card.Content style={{ paddingVertical: 12 }}>
              <Text style={{ color: 'red' }}>Invalid transaction data</Text>
            </Card.Content>
          </Card>
        );
      }
      
      let txnDate = item.date;
      let txnTime = item.time;
      let txnCode = item.code;
      let baseAsset = item.baseAsset;
      
      // Safe asset info retrieval
      let assetInfo = appState.getAssetInfo(baseAsset) || { decimalPlaces: 8, displayString: baseAsset };
      
      // Use _original reference to call methods if available, otherwise use precomputed values
      let baseAssetVolume;
      if (item._original && item._original.getFormattedVolume) {
        baseAssetVolume = item._original.getFormattedVolume(assetInfo);
      } else {
        // Fallback formatting with 9 significant digits max
        try {
          const Big = require('big.js');
          let volume = Big(item.baseAssetVolume || '0');
          
          // Format to 9 significant digits
          let formatted;
          if (volume.eq(0)) {
            formatted = '0';
          } else if (volume.abs().gte(1)) {
            // For numbers >= 1, use toPrecision(9) and remove trailing zeros
            formatted = volume.toPrecision(9).replace(/\.?0+$/, '');
          } else {
            // For numbers < 1, use toFixed with appropriate decimal places
            let decimalPlaces = Math.min(9, assetInfo.decimalPlaces || 8);
            formatted = volume.toFixed(decimalPlaces).replace(/\.?0+$/, '');
          }
          
          baseAssetVolume = formatted;
        } catch (err) {
          baseAssetVolume = item.baseAssetVolume || '0';
        }
      }
      
      let reference = item.parsedReference;
    
    const getTransactionIcon = (code) => {
      return item.icon || 'swap-horizontal';
    };

    const getTransactionColor = (code) => {
      return item.color || '#757575';
    };
    
    console.log('🎨 About to return transaction card JSX for:', baseAsset, baseAssetVolume);
    
    // Determine if this is a payment in or out
    const isPaymentIn = txnCode === 'PI' || txnCode === 'BY'; // Payment In or Buy
    const isPaymentOut = txnCode === 'PO' || txnCode === 'SL'; // Payment Out or Sell
    
    // Color scheme for payment direction
    const colors = {
      paymentIn: {
        primary: '#10b981',      // Green
        background: '#ecfdf5',   // Light green background
        text: '#047857'          // Dark green text
      },
      paymentOut: {
        primary: '#ef4444',      // Red
        background: '#fef2f2',   // Light red background
        text: '#dc2626'          // Dark red text
      },
      neutral: {
        primary: '#6b7280',      // Gray
        background: '#f9fafb',   // Light gray background
        text: '#374151'          // Dark gray text
      }
    };
    
    const currentColors = isPaymentIn ? colors.paymentIn : 
                         isPaymentOut ? colors.paymentOut : 
                         colors.neutral;
    
    return (
      <Card 
        style={{ 
          marginBottom: 12, 
          borderRadius: 16,
          elevation: 2,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          backgroundColor: '#ffffff',
          borderLeftWidth: 4,
          borderLeftColor: currentColors.primary
        }}
      >
        <Card.Content style={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View style={{ 
                width: 48, 
                height: 48, 
                borderRadius: 24, 
                backgroundColor: currentColors.background,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 16,
                borderWidth: 2,
                borderColor: currentColors.primary + '40'
              }}>
                <Avatar.Icon 
                  icon={getTransactionIcon(txnCode)}
                  size={24}
                  style={{ 
                    backgroundColor: 'transparent',
                    margin: 0
                  }}
                  color={currentColors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text 
                  variant="titleMedium" 
                  style={{ 
                    fontWeight: '600', 
                    fontSize: 16,
                    color: '#1a1a1a',
                    marginBottom: 4
                  }}
                >
                  {item.type}
                </Text>
                <Text 
                  variant="bodyMedium" 
                  style={{ 
                    color: '#666666',
                    fontSize: 14,
                    marginBottom: 2
                  }}
                >
                  {txnDate} • {txnTime}
                </Text>
                <Text 
                  variant="bodySmall" 
                  style={{ 
                    color: '#999999',
                    fontSize: 12
                  }}
                >
                  Ref: {reference}
                </Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text 
                variant="titleMedium" 
                style={{ 
                  fontWeight: '700',
                  fontSize: 18,
                  color: currentColors.primary
                }}
              >
                {isPaymentOut ? '-' : '+'}{baseAssetVolume}
              </Text>
              <Text 
                variant="bodySmall" 
                style={{ 
                  color: '#999999',
                  fontSize: 12,
                  marginTop: 2
                }}
              >
                {assetInfo.displayString || baseAsset}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
    } catch (error) {
      console.log('❌ Error rendering transaction item:', error);
      return (
        <Card style={{ marginBottom: 8 }}>
          <Card.Content style={{ paddingVertical: 12 }}>
            <Text style={{ color: 'red' }}>Error loading transaction</Text>
          </Card.Content>
        </Card>
      );
    }
  }


  let renderOrders = () => {
    if (!historyDataModel) {
      return (
        <Card>
          <Card.Content style={{ alignItems: 'center', paddingVertical: 32 }}>
            <Avatar.Icon icon="shopping-outline" size={64} style={{ marginBottom: 16 }} />
            <Text variant="titleMedium" style={{ marginBottom: 8 }}>
              No order data
            </Text>
            <Text variant="bodyMedium" style={{ textAlign: 'center', color: 'rgba(0,0,0,0.6)' }}>
              Unable to load order history at this time.
            </Text>
          </Card.Content>
        </Card>
      );
    }
    
    let data = historyDataModel.getOrders();
    
    if (!data || data.length === 0) {
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
    
    console.log(`Rendering ${data.length} orders with ScrollView`);
    
    // Use ScrollView instead of FlatList as workaround for React Native bug
    return (
      <ScrollView 
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {data.map((item, index) => (
          <View key={item.id || index.toString()}>
            {renderOrderItem({ item })}
          </View>
        ))}
      </ScrollView>
    );
  }


  let renderOrderItem = ({ item }) => {
    // item is already an OrderDataModel instance with safe fallbacks
    try {
      let orderID = item.id;
      let market = item.market;
      let orderSide = item.side;
      let baseAsset = item.parsedMarket.baseAsset;
      let quoteAsset = item.parsedMarket.quoteAsset;
      
      // Safe asset info retrieval
      let baseAssetInfo = appState.getAssetInfo(baseAsset) || { decimalPlaces: 8, displayString: baseAsset };
      let quoteAssetInfo = appState.getAssetInfo(quoteAsset) || { decimalPlaces: 2, displayString: quoteAsset };
      
      let { baseVolume, quoteVolume } = item.getFormattedVolumes(baseAssetInfo, quoteAssetInfo);
      let orderStatus = item.status;
      let orderDate = item.date;
      let orderTime = item.time;
    
    const getStatusColor = (status) => {
      return item.getStatusColor();
    };

    const getOrderIcon = (side) => {
      return item.getIcon();
    };

    return (
      <Surface style={{ marginBottom: 8, borderRadius: 12 }} elevation={1}>
        <TouchableOpacity 
          onPress={() => {
            if (!item.isClickable()) return;
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
            {orderDate} {orderTime}
          </Text>
          
          <Text variant="bodyMedium">
            Spent {quoteVolume} {quoteAsset} to get {baseVolume} {baseAsset}
          </Text>
        </TouchableOpacity>
      </Surface>
    );
    } catch (error) {
      console.log('Error rendering order item:', error);
      return (
        <Surface style={{ marginBottom: 8, borderRadius: 12 }} elevation={1}>
          <View style={{ padding: 16 }}>
            <Text style={{ color: 'red' }}>Error loading order</Text>
          </View>
        </Surface>
      );
    }
  }


  const materialTheme = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: materialTheme.colors.background }}>
      
      <Title>
        Transaction History
      </Title>

      <View style={{ padding: 16 }}>

      { isLoading && (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Spinner/>
        </View>
      )}

      {! isLoading && displayHistoryControls()}

      {! isLoading && selectedHistoryCategory === 'Orders' && renderOrders()}

      {! isLoading && selectedHistoryCategory === 'Transactions' && renderTransactions()}
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
  segmentedButtonLabel: {
    fontSize: normaliseFont(12),
    fontWeight: '500',
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

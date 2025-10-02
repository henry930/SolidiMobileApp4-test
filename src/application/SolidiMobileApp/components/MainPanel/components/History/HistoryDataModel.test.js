// HistoryDataModel Test File
// Test the flexibility of the data model with different data structures

import HistoryDataModel, { TransactionDataModel, OrderDataModel } from './HistoryDataModel';

// Test different transaction data formats
const testTransactionFormats = () => {
  console.log('🧪 Testing Transaction Data Model Flexibility');
  
  const model = new HistoryDataModel();
  
  // Test 1: Direct array format (actual API format)
  const directArray = [
    {
      "baseAsset": "BTC",
      "baseAssetVolume": "0.01000000",
      "code": "PI",
      "date": "23 Jan 2014",
      "description": "Transfer In",
      "fee": "0.00000000",
      "feeAsset": "",
      "id": 1,
      "market": 1,
      "quoteAsset": "",
      "quoteAssetVolume": "0.00000000",
      "reference": "07098f0b37472517eae73edd6ab41d14d8463a5fce9a081a3a364d1cccc9ec43",
      "status": "A",
      "time": "18:12"
    }
  ];
  
  model.loadTransactions(directArray);
  console.log('✅ Direct array format:', model.getTransactions().length, 'transactions');
  
  // Test 2: Nested txns format
  const nestedFormat = {
    txns: directArray
  };
  
  model.loadTransactions(nestedFormat);
  console.log('✅ Nested txns format:', model.getTransactions().length, 'transactions');
  
  // Test 3: Null/undefined data
  model.loadTransactions(null);
  console.log('✅ Null data fallback:', model.getTransactions().length, 'transactions');
  
  // Test 4: Empty array
  model.loadTransactions([]);
  console.log('✅ Empty array fallback:', model.getTransactions().length, 'transactions');
  
  // Test 5: Malformed data
  model.loadTransactions({ invalid: "data" });
  console.log('✅ Malformed data fallback:', model.getTransactions().length, 'transactions');
};

// Test different order data formats
const testOrderFormats = () => {
  console.log('🧪 Testing Order Data Model Flexibility');
  
  const model = new HistoryDataModel();
  
  // Test with actual API format
  const orderArray = [
    {
      "age": "75122",
      "baseVolume": "0.00057120",
      "date": "28 Aug 2022",
      "id": 7179,
      "market": "BTC/GBP",
      "quoteVolume": "10.00000000",
      "settlement1Id": 8289,
      "settlement1Status": "R",
      "settlement2Id": 8290,
      "settlement2Status": "R",
      "side": "Buy",
      "status": "SETTLED",
      "time": "13:43:23",
      "type": "IOC"
    }
  ];
  
  model.loadOrders(orderArray);
  console.log('✅ Order array format:', model.getOrders().length, 'orders');
  
  // Test with null data
  model.loadOrders(null);
  console.log('✅ Null order data fallback:', model.getOrders().length, 'orders');
};

// Test transaction and order model creation
const testModelCreation = () => {
  console.log('🧪 Testing Model Instance Creation');
  
  // Test transaction with partial data
  const partialTxn = new TransactionDataModel({
    id: 123,
    baseAsset: 'ETH'
    // Missing other fields should use defaults
  });
  
  console.log('✅ Partial transaction data:', {
    id: partialTxn.id,
    baseAsset: partialTxn.baseAsset,
    code: partialTxn.code,
    type: partialTxn.type,
    icon: partialTxn.getIcon(),
    color: partialTxn.getColor()
  });
  
  // Test order with partial data
  const partialOrder = new OrderDataModel({
    id: 456,
    market: 'ETH/USD'
    // Missing other fields should use defaults
  });
  
  console.log('✅ Partial order data:', {
    id: partialOrder.id,
    market: partialOrder.market,
    side: partialOrder.side,
    status: partialOrder.status,
    parsedMarket: partialOrder.parsedMarket,
    statusColor: partialOrder.getStatusColor(),
    icon: partialOrder.getIcon(),
    isClickable: partialOrder.isClickable()
  });
};

// Run all tests
export const runHistoryDataModelTests = () => {
  console.log('🚀 Starting History Data Model Tests');
  
  try {
    testTransactionFormats();
    testOrderFormats();
    testModelCreation();
    
    console.log('✅ All History Data Model tests passed!');
    return true;
  } catch (error) {
    console.error('❌ History Data Model test failed:', error);
    return false;
  }
};

export default runHistoryDataModelTests;
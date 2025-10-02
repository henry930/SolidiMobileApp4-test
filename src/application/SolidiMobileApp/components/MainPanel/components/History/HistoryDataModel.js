// HistoryDataModel.js
// Data models for Transaction History with fallback values to prevent rendering failures

class TransactionDataModel {
  constructor(data = {}) {
    this.id = data.id || this.generateId();
    this.date = data.date || new Date().toISOString().split('T')[0];
    this.time = data.time || '00:00:00';
    this.code = data.code || 'PI'; // Default to 'Payment In'
    this.baseAsset = data.baseAsset || 'BTC';
    this.baseAssetVolume = data.baseAssetVolume || '0';
    this.quoteAsset = data.quoteAsset || '';
    this.quoteAssetVolume = data.quoteAssetVolume || '0';
    this.reference = data.reference || '{}';
    this.status = data.status || 'completed';
    this.description = data.description || '';
    this.fee = data.fee || '0';
    this.feeAsset = data.feeAsset || '';
    this.market = data.market || null;
    this.type = data.type || this.codeToType(this.code);
    
    // Parse reference safely
    this.parsedReference = this.parseReference();
  }

  generateId() {
    return 'txn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  parseReference() {
    try {
      const ref = JSON.parse(this.reference);
      if (ref && typeof ref === 'object' && ref.ref) {
        return ref.ref;
      }
      return '[none]';
    } catch (err) {
      return '[none]';
    }
  }

  codeToType(code) {
    const typeMap = {
      'PI': 'Payment In',
      'PO': 'Payment Out', 
      'FI': 'Funds In',
      'FO': 'Funds Out',
      'BY': 'Buy Order',
      'SL': 'Sell Order',
    };
    return typeMap[code] || 'Transaction';
  }

  getIcon() {
    const iconMap = {
      'PI': 'cash-plus',
      'PO': 'cash-minus',
      'FI': 'bank-transfer-in',
      'FO': 'bank-transfer-out',
      'BY': 'trending-up',
      'SL': 'trending-down',
    };
    return iconMap[this.code] || 'swap-horizontal';
  }

  getColor() {
    const colorMap = {
      'PI': '#4CAF50', // Green
      'PO': '#F44336', // Red
      'FI': '#2196F3', // Blue
      'FO': '#FF9800', // Orange
      'BY': '#9C27B0', // Purple
      'SL': '#607D8B', // Blue Grey
    };
    return colorMap[this.code] || '#757575';
  }

  // Format volume with proper decimal places
  getFormattedVolume(assetInfo = { decimalPlaces: 8 }) {
    try {
      const Big = require('big.js');
      return Big(this.baseAssetVolume).toFixed(assetInfo.decimalPlaces || 8);
    } catch (err) {
      return '0';
    }
  }
}

class OrderDataModel {
  constructor(data = {}) {
    this.id = data.id || this.generateId();
    this.market = data.market || 'BTC/USD';
    this.side = data.side || 'BUY';
    this.baseVolume = data.baseVolume || '0';
    this.quoteVolume = data.quoteVolume || '0';
    this.status = data.status || 'LIVE';
    this.date = data.date || new Date().toISOString().split('T')[0];
    this.time = data.time || '00:00:00';
    this.price = data.price || '0';
    this.type = data.type || 'IOC'; // Immediate or Cancel
    this.age = data.age || '';
    this.settlement1Id = data.settlement1Id || null;
    this.settlement1Status = data.settlement1Status || null;
    this.settlement2Id = data.settlement2Id || null;
    this.settlement2Status = data.settlement2Status || null;
    
    // Parse market
    this.parsedMarket = this.parseMarket();
  }

  generateId() {
    return 'order_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  parseMarket() {
    try {
      const [baseAsset, quoteAsset] = this.market.split('/');
      return {
        baseAsset: baseAsset || 'BTC',
        quoteAsset: quoteAsset || 'USD'
      };
    } catch (err) {
      return {
        baseAsset: 'BTC',
        quoteAsset: 'USD'
      };
    }
  }

  getStatusColor() {
    const colorMap = {
      'LIVE': '#4CAF50',      // Green
      'SETTLED': '#2196F3',   // Blue
      'CANCELLED': '#F44336', // Red
      'PENDING': '#FF9800',   // Orange
      'PARTIAL': '#9C27B0',   // Purple
    };
    return colorMap[this.status] || '#757575';
  }

  getIcon() {
    return this.side === 'BUY' ? 'trending-up' : 'trending-down';
  }

  // Format volumes with proper decimal places
  getFormattedVolumes(baseAssetInfo = { decimalPlaces: 8 }, quoteAssetInfo = { decimalPlaces: 2 }) {
    try {
      const Big = require('big.js');
      return {
        baseVolume: Big(this.baseVolume).toFixed(baseAssetInfo.decimalPlaces || 8),
        quoteVolume: Big(this.quoteVolume).toFixed(quoteAssetInfo.decimalPlaces || 2)
      };
    } catch (err) {
      return {
        baseVolume: '0',
        quoteVolume: '0'
      };
    }
  }

  isClickable() {
    return this.status === 'SETTLED';
  }
}

class HistoryDataModel {
  constructor() {
    this.transactions = [];
    this.orders = [];
  }

  // Load transactions with fallback data
  loadTransactions(data) {
    try {
      if (!data) {
        this.transactions = this.getDefaultTransactions();
        return this.transactions;
      }

      // Handle different data structures flexibly
      let transactionData = [];
      
      if (Array.isArray(data)) {
        // Direct array format: [txn1, txn2, ...]
        transactionData = data;
      } else if (data.txns && Array.isArray(data.txns)) {
        // Nested format: { txns: [txn1, txn2, ...] }
        transactionData = data.txns;
      } else if (data.transactions && Array.isArray(data.transactions)) {
        // Alternative nested format: { transactions: [txn1, txn2, ...] }
        transactionData = data.transactions;
      } else if (typeof data === 'object' && data !== null) {
        // Single transaction object
        transactionData = [data];
      } else {
        // Unknown format, use default
        transactionData = [];
      }

      this.transactions = transactionData.map(txn => new TransactionDataModel(txn));
      
      // If no real data, provide sample data for testing
      if (this.transactions.length === 0) {
        this.transactions = this.getDefaultTransactions();
      }

      return this.transactions;
    } catch (err) {
      console.log('Error loading transactions:', err);
      this.transactions = this.getDefaultTransactions();
      return this.transactions;
    }
  }

  // Load orders with fallback data
  loadOrders(data) {
    try {
      if (!data || !Array.isArray(data)) {
        this.orders = this.getDefaultOrders();
        return this.orders;
      }

      this.orders = data.map(order => new OrderDataModel(order));
      
      // If no real data, provide sample data for testing
      if (this.orders.length === 0) {
        this.orders = this.getDefaultOrders();
      }

      return this.orders;
    } catch (err) {
      console.log('Error loading orders:', err);
      this.orders = this.getDefaultOrders();
      return this.orders;
    }
  }

  // Default transactions for testing/fallback
  getDefaultTransactions() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0];

    return [
      new TransactionDataModel({
        id: 'demo_txn_1',
        date: today,
        time: time,
        code: 'PI',
        baseAsset: 'BTC',
        baseAssetVolume: '0.01',
        reference: JSON.stringify({ ref: 'DEMO001', paymeth: 1, txntype: 'standard' }),
        status: 'completed'
      }),
      new TransactionDataModel({
        id: 'demo_txn_2',
        date: today,
        time: time,
        code: 'BY',
        baseAsset: 'ETH',
        baseAssetVolume: '0.5',
        reference: JSON.stringify({ ref: 'DEMO002', paymeth: 2, txntype: 'buy' }),
        status: 'completed'
      }),
    ];
  }

  // Default orders for testing/fallback
  getDefaultOrders() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0];

    return [
      new OrderDataModel({
        id: 'demo_order_1',
        market: 'BTC/USD',
        side: 'BUY',
        baseVolume: '0.01',
        quoteVolume: '650.00',
        status: 'SETTLED',
        date: today,
        time: time,
        price: '65000.00'
      }),
      new OrderDataModel({
        id: 'demo_order_2',
        market: 'ETH/USD',
        side: 'SELL',
        baseVolume: '0.5',
        quoteVolume: '1250.00',
        status: 'LIVE',
        date: today,
        time: time,
        price: '2500.00'
      }),
    ];
  }

  getTransactions() {
    return this.transactions;
  }

  getOrders() {
    return this.orders;
  }

  // Get safe transactions data structure for backward compatibility
  getTransactionsData() {
    return {
      txns: this.transactions
    };
  }

  // Alternative method to provide transactions directly from appState call
  static createFromAppState(appState) {
    const model = new HistoryDataModel();
    
    try {
      // Get data directly from appState methods (might return null/undefined)
      const transactionsData = appState.getTransactions();
      const ordersData = appState.getOrders();
      
      model.loadTransactions(transactionsData);
      model.loadOrders(ordersData);
    } catch (err) {
      console.log('Error creating HistoryDataModel from appState:', err);
      // Use default data if appState calls fail
      model.loadTransactions(null);
      model.loadOrders(null);
    }
    
    return model;
  }
}

export { TransactionDataModel, OrderDataModel, HistoryDataModel };
export default HistoryDataModel;
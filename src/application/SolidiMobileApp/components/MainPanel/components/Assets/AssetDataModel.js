/**
 * Asset Data Model
 * Provides type-safe data structures and fallback data for the Assets component
 */

/**
 * Asset Data Structure Definition
 * @typedef {Object} AssetItem
 * @property {string} asset - Asset symbol (e.g., 'BTC', 'ETH', 'GBP')
 * @property {string} balance - Asset balance as string for precision
 * @property {string} [id] - Optional unique identifier
 */

/**
 * Extended Asset Info Structure
 * @typedef {Object} AssetInfo
 * @property {string} name - Full asset name (e.g., 'Bitcoin')
 * @property {string} displaySymbol - Display symbol (e.g., 'BTC')
 * @property {number} decimalPlaces - Number of decimal places to display
 * @property {string} type - Asset type ('crypto' or 'fiat')
 * @property {string} [iconName] - Optional icon name for UI
 */

/**
 * Static asset information catalog
 * Contains display properties for all supported assets
 */
export const ASSET_INFO_CATALOG = {
  'BTC': { name: 'Bitcoin', displaySymbol: 'BTC', decimalPlaces: 8, type: 'crypto', iconName: 'bitcoin' },
  'ETH': { name: 'Ethereum', displaySymbol: 'ETH', decimalPlaces: 6, type: 'crypto', iconName: 'ethereum' },
  'LTC': { name: 'Litecoin', displaySymbol: 'LTC', decimalPlaces: 8, type: 'crypto', iconName: 'litecoin' },
  'XRP': { name: 'Ripple', displaySymbol: 'XRP', decimalPlaces: 6, type: 'crypto', iconName: 'ripple' },
  'ADA': { name: 'Cardano', displaySymbol: 'ADA', decimalPlaces: 6, type: 'crypto', iconName: 'cardano' },
  'DOT': { name: 'Polkadot', displaySymbol: 'DOT', decimalPlaces: 4, type: 'crypto', iconName: 'polkadot' },
  'LINK': { name: 'Chainlink', displaySymbol: 'LINK', decimalPlaces: 4, type: 'crypto', iconName: 'chainlink' },
  'UNI': { name: 'Uniswap', displaySymbol: 'UNI', decimalPlaces: 4, type: 'crypto', iconName: 'uniswap' },
  'GBP': { name: 'British Pound', displaySymbol: 'GBP', decimalPlaces: 2, type: 'fiat', iconName: 'pound' },
  'USD': { name: 'US Dollar', displaySymbol: 'USD', decimalPlaces: 2, type: 'fiat', iconName: 'dollar' },
  'EUR': { name: 'Euro', displaySymbol: 'EUR', decimalPlaces: 2, type: 'fiat', iconName: 'euro' },
};

/**
 * Default fallback balances for different assets
 * Used when API fails or returns no data
 */
export const DEFAULT_ASSET_BALANCES = {
  'BTC': '0.15420000',
  'ETH': '2.45000000',
  'LTC': '12.75000000',
  'XRP': '1500.00000000',
  'ADA': '850.00000000',
  'DOT': '45.50000000',
  'LINK': '25.75000000',
  'UNI': '18.25000000',
  'GBP': '2450.75',
  'USD': '1200.50',
  'EUR': '850.25',
};

/**
 * Demo price data for development and fallback scenarios
 */
export const DEMO_PRICE_DATA = {
  'BTC': { price: 45000, change_24h: 2.45 },
  'ETH': { price: 2800, change_24h: 1.23 },
  'LTC': { price: 95, change_24h: -0.87 },
  'XRP': { price: 0.45, change_24h: 5.12 },
  'ADA': { price: 0.38, change_24h: -1.45 },
  'DOT': { price: 5.25, change_24h: 3.67 },
  'LINK': { price: 14.75, change_24h: 0.95 },
  'UNI': { price: 6.85, change_24h: -2.34 },
  'GBP': { price: 1.0, change_24h: 0.0 },
  'USD': { price: 0.82, change_24h: 0.12 },
  'EUR': { price: 0.95, change_24h: -0.05 },
};

/**
 * Creates a valid AssetItem with proper structure and validation
 * @param {string} asset - Asset symbol
 * @param {string|number} balance - Asset balance
 * @returns {AssetItem} Validated asset item
 */
export const createAssetItem = (asset, balance) => {
  try {
    // Validate inputs
    if (!asset || typeof asset !== 'string') {
      throw new Error(`Invalid asset symbol: ${asset}`);
    }
    
    // Convert balance to string for precision
    const balanceStr = balance !== null && balance !== undefined ? String(balance) : '0.00000000';
    
    // Ensure balance is a valid number string
    if (isNaN(parseFloat(balanceStr))) {
      console.warn(`Invalid balance for ${asset}: ${balance}, using default`);
      return {
        asset: asset.toUpperCase(),
        balance: DEFAULT_ASSET_BALANCES[asset.toUpperCase()] || '0.00000000',
        id: `asset-${asset.toLowerCase()}-${Date.now()}`
      };
    }
    
    return {
      asset: asset.toUpperCase(),
      balance: balanceStr,
      id: `asset-${asset.toLowerCase()}-${Date.now()}`
    };
  } catch (error) {
    console.error('createAssetItem error:', error);
    return {
      asset: 'UNKNOWN',
      balance: '0.00000000',
      id: `asset-unknown-${Date.now()}`
    };
  }
};

/**
 * Gets asset information with fallback for unknown assets
 * @param {string} asset - Asset symbol
 * @returns {AssetInfo} Asset information object
 */
export const getAssetInfo = (asset) => {
  try {
    const assetUpper = asset ? asset.toUpperCase() : 'UNKNOWN';
    return ASSET_INFO_CATALOG[assetUpper] || {
      name: assetUpper,
      displaySymbol: assetUpper,
      decimalPlaces: 8,
      type: 'crypto',
      iconName: 'help-circle'
    };
  } catch (error) {
    console.error('getAssetInfo error:', error);
    return {
      name: 'Unknown Asset',
      displaySymbol: 'UNKNOWN',
      decimalPlaces: 8,
      type: 'crypto',
      iconName: 'help-circle'
    };
  }
};

/**
 * Generates fallback asset data when API fails or returns invalid data
 * @returns {AssetItem[]} Array of valid asset items
 */
export const generateFallbackAssetData = () => {
  try {
    return Object.keys(DEFAULT_ASSET_BALANCES).map(asset => 
      createAssetItem(asset, DEFAULT_ASSET_BALANCES[asset])
    );
  } catch (error) {
    console.error('generateFallbackAssetData error:', error);
    // Ultimate fallback - minimal but safe data
    return [
      { asset: 'BTC', balance: '0.00000000', id: 'fallback-btc' },
      { asset: 'ETH', balance: '0.00000000', id: 'fallback-eth' },
      { asset: 'GBP', balance: '0.00', id: 'fallback-gbp' }
    ];
  }
};

/**
 * Validates and sanitizes raw balance data from API
 * @param {Object} rawBalanceData - Raw balance data from API
 * @returns {AssetItem[]} Array of validated asset items
 */
export const processBalanceData = (rawBalanceData) => {
  try {
    if (!rawBalanceData || typeof rawBalanceData !== 'object') {
      console.warn('processBalanceData: Invalid raw data, using fallback');
      return generateFallbackAssetData();
    }
    
    const validAssets = [];
    
    Object.keys(rawBalanceData).forEach(asset => {
      try {
        const balance = rawBalanceData[asset];
        
        // Skip invalid balances
        if (balance === null || balance === undefined || balance === '[loading]') {
          console.warn(`Skipping asset ${asset} with invalid balance: ${balance}`);
          return;
        }
        
        validAssets.push(createAssetItem(asset, balance));
      } catch (error) {
        console.error(`Error processing asset ${asset}:`, error);
      }
    });
    
    // If no valid assets found, return fallback data
    if (validAssets.length === 0) {
      console.warn('processBalanceData: No valid assets found, using fallback');
      return generateFallbackAssetData();
    }
    
    return validAssets;
  } catch (error) {
    console.error('processBalanceData error:', error);
    return generateFallbackAssetData();
  }
};

/**
 * Validates an array of asset items
 * @param {any} data - Data to validate
 * @returns {AssetItem[]} Valid array of asset items
 */
export const validateAssetDataArray = (data) => {
  try {
    if (!Array.isArray(data)) {
      console.warn('validateAssetDataArray: Data is not an array, using fallback');
      return generateFallbackAssetData();
    }
    
    if (data.length === 0) {
      console.warn('validateAssetDataArray: Empty array, using fallback');
      return generateFallbackAssetData();
    }
    
    // Validate each item in the array
    const validItems = data.filter(item => {
      if (!item || typeof item !== 'object') {
        console.warn('validateAssetDataArray: Invalid item found:', item);
        return false;
      }
      
      if (!item.asset || typeof item.asset !== 'string') {
        console.warn('validateAssetDataArray: Item missing valid asset property:', item);
        return false;
      }
      
      if (item.balance === null || item.balance === undefined) {
        console.warn('validateAssetDataArray: Item missing balance property:', item);
        return false;
      }
      
      return true;
    });
    
    // If too many items were filtered out, use fallback
    if (validItems.length === 0) {
      console.warn('validateAssetDataArray: No valid items after filtering, using fallback');
      return generateFallbackAssetData();
    }
    
    return validItems;
  } catch (error) {
    console.error('validateAssetDataArray error:', error);
    return generateFallbackAssetData();
  }
};

/**
 * Gets demo price for an asset with fallback
 * @param {string} asset - Asset symbol
 * @returns {Object} Price data object with price and change
 */
export const getDemoPrice = (asset) => {
  try {
    const assetUpper = asset ? asset.toUpperCase() : 'BTC';
    const demoData = DEMO_PRICE_DATA[assetUpper];
    
    if (demoData) {
      return {
        price: demoData.price,
        change_24h: demoData.change_24h
      };
    }
    
    // Fallback for unknown assets
    return {
      price: 1.0,
      change_24h: 0.0
    };
  } catch (error) {
    console.error('getDemoPrice error:', error);
    return {
      price: 1.0,
      change_24h: 0.0
    };
  }
};

export default {
  ASSET_INFO_CATALOG,
  DEFAULT_ASSET_BALANCES,
  DEMO_PRICE_DATA,
  createAssetItem,
  getAssetInfo,
  generateFallbackAssetData,
  processBalanceData,
  validateAssetDataArray,
  getDemoPrice
};
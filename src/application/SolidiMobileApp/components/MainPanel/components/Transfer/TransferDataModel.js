/**
 * Transfer Data Model
 * Provides type-safe data structures and fallback data for the Transfer component
 */

/**
 * Transfer Asset Structure Definition
 * @typedef {Object} TransferAsset
 * @property {string} asset - Asset symbol (e.g., 'BTC', 'ETH', 'GBP')
 * @property {string} label - Display label for dropdown
 * @property {string} value - Value for dropdown (usually same as asset)
 * @property {boolean} withdrawalEnabled - Whether asset can be sent
 * @property {boolean} depositEnabled - Whether asset can be received
 * @property {string} [depositAddress] - Deposit address for receiving
 * @property {number} [minSendAmount] - Minimum amount that can be sent
 * @property {number} [maxSendAmount] - Maximum amount that can be sent
 * @property {string} [network] - Network type (e.g., 'mainnet', 'testnet')
 */

/**
 * Transfer capabilities for different assets
 */
export const TRANSFER_CAPABILITIES = {
  'BTC': {
    withdrawalEnabled: true,
    depositEnabled: true,
    minSendAmount: 0.0001,
    maxSendAmount: 10,
    network: 'mainnet',
    addressFormat: 'bitcoin',
  },
  'ETH': {
    withdrawalEnabled: true,
    depositEnabled: true,
    minSendAmount: 0.001,
    maxSendAmount: 50,
    network: 'ethereum',
    addressFormat: 'ethereum',
  },
  'LTC': {
    withdrawalEnabled: true,
    depositEnabled: true,
    minSendAmount: 0.001,
    maxSendAmount: 100,
    network: 'litecoin',
    addressFormat: 'litecoin',
  },
  'XRP': {
    withdrawalEnabled: true,
    depositEnabled: true,
    minSendAmount: 10,
    maxSendAmount: 10000,
    network: 'ripple',
    addressFormat: 'ripple',
  },
  'ADA': {
    withdrawalEnabled: true,
    depositEnabled: true,
    minSendAmount: 1,
    maxSendAmount: 5000,
    network: 'cardano',
    addressFormat: 'cardano',
  },
  'GBP': {
    withdrawalEnabled: true,
    depositEnabled: true,
    minSendAmount: 1,
    maxSendAmount: 10000,
    network: 'fiat',
    addressFormat: 'bank_account',
  },
  'USD': {
    withdrawalEnabled: true,
    depositEnabled: true,
    minSendAmount: 1,
    maxSendAmount: 10000,
    network: 'fiat',
    addressFormat: 'bank_account',
  },
  'EUR': {
    withdrawalEnabled: true,
    depositEnabled: true,
    minSendAmount: 1,
    maxSendAmount: 10000,
    network: 'fiat',
    addressFormat: 'bank_account',
  },
};

/**
 * Asset display information for transfer dropdowns
 */
export const TRANSFER_ASSET_DISPLAY = {
  'BTC': { label: 'Bitcoin (BTC)', value: 'BTC' },
  'ETH': { label: 'Ethereum (ETH)', value: 'ETH' },
  'LTC': { label: 'Litecoin (LTC)', value: 'LTC' },
  'XRP': { label: 'Ripple (XRP)', value: 'XRP' },
  'ADA': { label: 'Cardano (ADA)', value: 'ADA' },
  'DOT': { label: 'Polkadot (DOT)', value: 'DOT' },
  'LINK': { label: 'Chainlink (LINK)', value: 'LINK' },
  'UNI': { label: 'Uniswap (UNI)', value: 'UNI' },
  'GBP': { label: 'British Pound (GBP)', value: 'GBP' },
  'USD': { label: 'US Dollar (USD)', value: 'USD' },
  'EUR': { label: 'Euro (EUR)', value: 'EUR' },
};

/**
 * Default transfer data model class
 * Provides safe fallback methods and data structures
 */
export class TransferDataModel {
  constructor(appState = null) {
    this.appState = appState;
    this.capabilities = TRANSFER_CAPABILITIES;
    this.addresses = {}; // Empty - must be loaded from API
    this.displayInfo = TRANSFER_ASSET_DISPLAY;
    // Initialize assets - will be updated when setAppState is called
    this._updateAssets();
  }

  /**
   * Update appState reference and refresh assets from balance API
   * @param {Object} appState - AppState instance
   */
  setAppState(appState) {
    this.appState = appState;
    this._updateAssets();
  }

  /**
   * Internal method to update assets from balance API or fallback
   * @private
   */
  _updateAssets() {
    // Use ALL AVAILABLE (tradeable) assets from balance API for the full list
    if (this.appState && this.appState.getAvailableAssets) {
      this.assets = this.appState.getAvailableAssets();
      console.log('📤 [TRANSFER] Using ALL tradeable assets from balance API:', this.assets);
    } else {
      this.assets = Object.keys(TRANSFER_CAPABILITIES);
      console.log('📤 [TRANSFER] Using hardcoded TRANSFER_CAPABILITIES assets:', this.assets);
    }
  }

  /**
   * Get all assets that support withdrawals (sending)
   * @returns {Array<string>} Array of asset symbols
   */
  getWithdrawalEnabledAssets() {
    try {
      // Use OWNED assets (balance > 0) for withdrawal/send
      if (this.appState && this.appState.getOwnedAssets) {
        const ownedAssets = this.appState.getOwnedAssets();
        // Use ownedAssets directly (includes Fiat if balance > 0)
        console.log('📤 [TRANSFER] Withdrawal assets (owned assets):', ownedAssets);
        return ownedAssets;
      }
      // Fallback to filtering this.assets by capabilities
      return this.assets.filter(asset =>
        this.capabilities[asset] && this.capabilities[asset].withdrawalEnabled
      );
    } catch (error) {
      console.warn('Error getting withdrawal assets:', error);
      return ['BTC', 'ETH']; // Last resort fallback
    }
  }

  /**
   * Get all assets that support deposits (receiving)
   * @returns {Array<string>} Array of asset symbols
   */
  getDepositEnabledAssets() {
    try {
      // Use OWNED assets (balance > 0) for deposit/receive
      if (this.appState && this.appState.getOwnedAssets) {
        const ownedAssets = this.appState.getOwnedAssets();
        console.log('📤 [TRANSFER] Deposit assets (owned assets):', ownedAssets);
        return ownedAssets;
      }
      // Fallback to filtering this.assets by capabilities
      return this.assets.filter(asset =>
        this.capabilities[asset] && this.capabilities[asset].depositEnabled
      );
    } catch (error) {
      console.warn('Error getting deposit assets:', error);
      return ['BTC', 'ETH', 'GBP']; // Last resort fallback
    }
  }

  /**
   * Get deposit address for an asset
   * @param {string} asset - Asset symbol
   * @returns {string} Deposit address or null if not loaded
   */
  getDepositAddress(asset) {
    try {
      if (!asset || typeof asset !== 'string') {
        return null;
      }

      return this.addresses[asset.toUpperCase()] || null;
    } catch (error) {
      console.warn('Error getting deposit address:', error);
      return null;
    }
  }

  /**
   * Get transfer capabilities for an asset
   * @param {string} asset - Asset symbol
   * @returns {Object} Transfer capabilities or safe defaults
   */
  getAssetCapabilities(asset) {
    try {
      if (!asset || typeof asset !== 'string') {
        return {
          withdrawalEnabled: false,
          depositEnabled: false,
          minSendAmount: 0,
          maxSendAmount: 0,
        };
      }

      return this.capabilities[asset.toUpperCase()] || {
        withdrawalEnabled: false,
        depositEnabled: false,
        minSendAmount: 0,
        maxSendAmount: 0,
      };
    } catch (error) {
      console.warn('Error getting asset capabilities:', error);
      return {
        withdrawalEnabled: false,
        depositEnabled: false,
        minSendAmount: 0,
        maxSendAmount: 0,
      };
    }
  }

  /**
   * Get display information for an asset
   * @param {string} asset - Asset symbol
   * @returns {Object} Display information
   */
  getAssetDisplayInfo(asset) {
    try {
      if (!asset || typeof asset !== 'string') {
        return { label: 'Unknown Asset', value: 'UNKNOWN' };
      }

      const upperAsset = asset.toUpperCase();
      return this.displayInfo[upperAsset] || {
        label: `${asset} (${upperAsset})`,
        value: upperAsset
      };
    } catch (error) {
      console.warn('Error getting display info:', error);
      return { label: 'Unknown Asset', value: 'UNKNOWN' };
    }
  }

  /**
   * Generate dropdown items for send assets
   * @returns {Array<Object>} Dropdown items
   */
  generateSendAssetItems() {
    try {
      const sendAssets = this.getWithdrawalEnabledAssets();
      return sendAssets.map(asset => {
        const displayInfo = this.getAssetDisplayInfo(asset);
        return {
          label: displayInfo.label,
          value: displayInfo.value,
        };
      });
    } catch (error) {
      console.warn('Error generating send asset items:', error);
      return [
        { label: 'Bitcoin (BTC)', value: 'BTC' },
        { label: 'Ethereum (ETH)', value: 'ETH' },
        { label: 'British Pound (GBP)', value: 'GBP' },
      ];
    }
  }

  /**
   * Generate dropdown items for receive assets
   * @returns {Array<Object>} Dropdown items
   */
  generateReceiveAssetItems() {
    try {
      const receiveAssets = this.getDepositEnabledAssets();
      return receiveAssets.map(asset => {
        const displayInfo = this.getAssetDisplayInfo(asset);
        return {
          label: displayInfo.label,
          value: displayInfo.value,
        };
      });
    } catch (error) {
      console.warn('Error generating receive asset items:', error);
      return [
        { label: 'Bitcoin (BTC)', value: 'BTC' },
        { label: 'Ethereum (ETH)', value: 'ETH' },
        { label: 'British Pound (GBP)', value: 'GBP' },
      ];
    }
  }

  /**
   * Validate send amount for an asset
   * @param {string} asset - Asset symbol
   * @param {string|number} amount - Amount to validate
   * @returns {Object} Validation result
   */
  validateSendAmount(asset, amount) {
    try {
      const capabilities = this.getAssetCapabilities(asset);
      const numAmount = parseFloat(amount);

      if (isNaN(numAmount) || numAmount <= 0) {
        return { valid: false, error: 'Please enter a valid amount' };
      }

      if (numAmount < capabilities.minSendAmount) {
        return {
          valid: false,
          error: `Minimum send amount is ${capabilities.minSendAmount} ${asset}`
        };
      }

      if (numAmount > capabilities.maxSendAmount) {
        return {
          valid: false,
          error: `Maximum send amount is ${capabilities.maxSendAmount} ${asset}`
        };
      }

      return { valid: true, error: null };
    } catch (error) {
      console.warn('Error validating send amount:', error);
      return { valid: false, error: 'Amount validation failed' };
    }
  }

  /**
   * Format asset amount for display
   * @param {string} asset - Asset symbol
   * @param {string|number} amount - Amount to format
   * @returns {string} Formatted amount
   */
  formatAmount(asset, amount) {
    try {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount)) return '0.00';

      const capabilities = this.getAssetCapabilities(asset);
      const isCrypto = capabilities.network !== 'fiat';
      const decimals = isCrypto ? 6 : 2;

      return numAmount.toFixed(decimals);
    } catch (error) {
      console.warn('Error formatting amount:', error);
      return '0.00';
    }
  }
}

/**
 * Singleton instance for use throughout the application
 */
export const transferDataModel = new TransferDataModel();

/**
 * Export utility functions for easy access
 */
export const TransferUtils = {
  getWithdrawalAssets: () => transferDataModel.getWithdrawalEnabledAssets(),
  getDepositAssets: () => transferDataModel.getDepositEnabledAssets(),
  getDepositAddress: (asset) => transferDataModel.getDepositAddress(asset),
  generateSendItems: () => transferDataModel.generateSendAssetItems(),
  generateReceiveItems: () => transferDataModel.generateReceiveAssetItems(),
  validateAmount: (asset, amount) => transferDataModel.validateSendAmount(asset, amount),
  formatAmount: (asset, amount) => transferDataModel.formatAmount(asset, amount),
};

export default TransferDataModel;
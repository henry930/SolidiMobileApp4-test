// React imports
import React, { useState, useContext, useEffect } from 'react';
import {
  Text,
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  Dimensions,
  FlatList,
  Alert
} from 'react-native';
import { Title, IconButton } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Internal imports
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import { colors } from 'src/constants';
import AppStateContext from 'src/application/data';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('AddressBookSelectionPage');
let { deb, dj, log, lj } = logger.getShortcuts(logger2);

const { height: screenHeight } = Dimensions.get('window');

let AddressBookSelectionPage = ({ visible, onClose, onSelectAddress, selectedAsset }) => {
  // Get app state for API access
  let appState = useContext(AppStateContext);

  // Component state
  let [addresses, setAddresses] = useState([]);
  let [filteredAddresses, setFilteredAddresses] = useState([]);
  let [loading, setLoading] = useState(false);
  let [error, setError] = useState(null);
  let [isInitializing, setIsInitializing] = useState(true);

  // Asset filter state
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [showAssetDropdown, setShowAssetDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  // Load addresses when modal opens
  useEffect(() => {
    if (visible) {
      initializePage();
      // Set the selected asset filter if provided
      if (selectedAsset) {
        setSelectedAssets([selectedAsset]);
      }
    }
  }, [visible, selectedAsset]);

  // Filter addresses when selection changes
  useEffect(() => {
    filterAddresses();
  }, [addresses, selectedAssets, selectedTypes]);

  let initializePage = async () => {
    try {
      setIsInitializing(true);
      setError(null);

      // Step 1: Check if AppState is available
      if (!appState) {
        setError('Loading application state...');
        return;
      }

      // Step 2: Setup general app state
      await appState.generalSetup({ caller: 'AddressBookSelectionPage' });

      // Step 3: Check if API client is available
      if (!appState?.apiClient) {
        setError('API client not available. Please ensure you are logged in.');
        return;
      }

      // Step 4: Check credentials
      const { apiKey, apiSecret } = appState.apiClient;
      if (!apiKey || !apiSecret || apiKey.length === 0 || apiSecret.length === 0) {
        setError('Please log in to view your address book. API credentials are required.');
        return;
      }

      // Step 5: Load address book data
      await loadAddresses();

      setIsInitializing(false);

    } catch (error) {
      log('❌ Error initializing page:', error);
      setError(error.message || 'Failed to initialize address book');
      setIsInitializing(false);
    }
  };

  let loadAddresses = async () => {
    try {
      setLoading(true);
      setError(null);

      log('📖 Loading addresses for selection...');

      if (!appState?.apiClient) {
        throw new Error('API client not available. Please ensure you are logged in.');
      }

      // Check if credentials are available
      const { apiKey, apiSecret } = appState.apiClient;
      if (!apiKey || !apiSecret || apiKey.length === 0 || apiSecret.length === 0) {
        throw new Error('Please log in to view your address book. API credentials are required.');
      }

      // Load addresses for each supported asset using live API calls
      let assets = ['BTC', 'ETH', 'GBP'];

      // Use dynamic assets if available
      if (appState && appState.getAvailableAssets) {
        const dynamicAssets = appState.getAvailableAssets();
        if (dynamicAssets && dynamicAssets.length > 0) {
          assets = dynamicAssets;
          // Ensure GBP is included
          if (!assets.includes('GBP')) {
            assets = [...assets, 'GBP'];
          }
        }
      }
      const allAddresses = [];

      for (const asset of assets) {
        try {
          if (appState.loadAddressBook) {
            const addressBookResult = await appState.loadAddressBook(asset);

            // Process the addresses from appState.loadAddressBook result
            if (addressBookResult && Array.isArray(addressBookResult) && addressBookResult.length > 0) {
              // Add asset type to each address for easier management
              const assetAddresses = addressBookResult.map(addr => ({
                ...addr,
                assetType: asset // Ensure assetType is set
              }));
              allAddresses.push(...assetAddresses);
            }
          }
        } catch (assetError) {
          log(`❌ Error loading addresses for ${asset}:`, assetError);
          // Continue with other assets even if one fails
        }
      }

      log('✅ Loaded addresses:', allAddresses);
      setAddresses(allAddresses || []);
    } catch (err) {
      log('❌ Error loading addresses:', err);
      setError(err.message || 'Failed to load addresses');
    } finally {
      setLoading(false);
    }
  };

  let filterAddresses = () => {
    let filtered = addresses.filter(address => {
      // Asset filter
      if (selectedAssets.length > 0 && !selectedAssets.includes(address.assetType)) {
        return false;
      }

      // Type filter
      if (selectedTypes.length > 0 && !selectedTypes.includes(address.type)) {
        return false;
      }

      return true;
    });

    setFilteredAddresses(filtered);
  };

  // Helper function to get crypto icon
  const getCryptoIcon = (assetType) => {
    const iconMap = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'GBP': 'currency-gbp',
      'USD': 'currency-usd',
      'EUR': 'currency-eur',
      'LTC': 'litecoin',
      'BCH': 'bitcoin',
      'XRP': 'ripple'
    };
    return iconMap[assetType] || 'currency-btc';
  };

  // Helper function to get address type icon
  const getAddressTypeIcon = (type) => {
    const typeIconMap = {
      'CRYPTO_UNHOSTED': 'wallet',
      'CRYPTO_HOSTED': 'bank',
      'FIAT': 'credit-card-outline',
      'EXCHANGE': 'swap-horizontal'
    };
    return typeIconMap[type] || 'wallet-outline';
  };

  // Helper function to get asset color
  const getAssetColor = (assetType) => {
    const colorMap = {
      'BTC': '#F7931A',
      'ETH': '#627EEA',
      'GBP': '#6B46C1',
      'USD': '#10B981',
      'EUR': '#3B82F6',
      'LTC': '#BFBBBB',
      'BCH': '#8DC351',
      'XRP': '#23292F'
    };
    return colorMap[assetType] || colors.primary;
  };

  // Helper function to extract address from JSON string or object
  const extractAddress = (addressData) => {
    if (typeof addressData === 'string') {
      try {
        const parsed = JSON.parse(addressData);
        // For GBP bank accounts (NEW FORMAT)
        if (parsed.sortcode && parsed.accountnumber) {
          const sortCode = parsed.sortcode;
          const formattedSortCode = sortCode.length === 6
            ? `${sortCode.slice(0, 2)}-${sortCode.slice(2, 4)}-${sortCode.slice(4, 6)}`
            : sortCode;
          return `Sort Code: ${formattedSortCode}, Account: ${parsed.accountnumber}`;
        }
        return parsed.address || parsed.withdrawAddress || addressData;
      } catch (error) {
        return addressData;
      }
    } else if (typeof addressData === 'object' && addressData !== null) {
      // For GBP bank accounts (NEW FORMAT)
      if (addressData.sortcode && addressData.accountnumber) {
        const sortCode = addressData.sortcode;
        const formattedSortCode = sortCode.length === 6
          ? `${sortCode.slice(0, 2)}-${sortCode.slice(2, 4)}-${sortCode.slice(4, 6)}`
          : sortCode;
        return `Sort Code: ${formattedSortCode}, Account: ${addressData.accountnumber}`;
      }
      return addressData.address || addressData.withdrawAddress || JSON.stringify(addressData);
    }
    return addressData || '';
  };

  let handleAddressSelection = (address) => {
    // Parse the address data for selection
    const addressData = typeof address.address === 'string'
      ? JSON.parse(address.address)
      : address.address;

    const actualAddress = extractAddress(addressData);

    log('📍 Address selected:', {
      name: address.name,
      address: actualAddress,
      assetType: address.assetType,
      type: address.type,
      uuid: address.uuid,
      id: address.id
    });

    // Call the selection callback
    if (onSelectAddress) {
      onSelectAddress(actualAddress, {
        id: address.uuid || address.id, // UUID is required for API calls
        name: address.name,
        assetType: address.assetType,
        type: address.type,
        fullData: addressData,
        rawData: address // Include the full address object with uuid
      });
    }

    // Close the modal
    onClose();
  };

  let renderAddressItem = (item) => {
    const addressData = typeof item.address === 'string'
      ? JSON.parse(item.address)
      : item.address;

    const cryptoIcon = getCryptoIcon(item.assetType);
    const addressTypeIcon = getAddressTypeIcon(item.type);
    const actualAddress = extractAddress(addressData);

    // Ensure actualAddress is always a string
    const displayAddress = String(actualAddress || 'Invalid address');

    return (
      <TouchableOpacity
        key={`${item.assetType}-${item.name}`}
        style={styles.addressItemContainer}
        onPress={() => handleAddressSelection(item)}
      >
        <View style={styles.addressIconSection}>
          <Icon name={cryptoIcon} size={32} color={getAssetColor(item.assetType)} />
        </View>

        <View style={styles.addressMainContent}>
          <View style={styles.addressHeaderRow}>
            <Text style={styles.addressName}>{item.name}</Text>
            <View style={styles.addressTypeContainer}>
              <Icon name={addressTypeIcon} size={14} color={colors.mediumGray} />
            </View>
          </View>

          <Text style={styles.addressValue} numberOfLines={1} ellipsizeMode="middle">
            {displayAddress}
          </Text>

          {/* For GBP bank accounts, show account holder name */}
          {addressData.accountname && (
            <Text style={styles.addressOwner}>
              Account Holder: {addressData.accountname}
            </Text>
          )}

          {/* For businesses */}
          {addressData.business && (
            <Text style={styles.addressBusiness}>{addressData.business}</Text>
          )}

          {/* For individuals (crypto addresses) */}
          {addressData.firstname && addressData.lastname && (
            <Text style={styles.addressOwner}>
              {addressData.firstname} {addressData.lastname}
            </Text>
          )}
        </View>

        <View style={styles.addressSelectSection}>
          <Icon name="chevron-right" size={20} color={colors.mediumGray} />
        </View>
      </TouchableOpacity>
    );
  };

  // Get unique asset types for filter
  const getUniqueAssets = () => {
    const assets = [...new Set(addresses.map(addr => addr.assetType))];
    return assets.sort();
  };

  // Get unique address types for filter
  const getUniqueTypes = () => {
    const types = [...new Set(addresses.map(addr => addr.type))];
    return types.sort();
  };

  // Asset filter toggle
  const toggleAssetFilter = (asset) => {
    setSelectedAssets(prev =>
      prev.includes(asset)
        ? prev.filter(a => a !== asset)
        : [...prev, asset]
    );
  };

  // Type filter toggle
  const toggleTypeFilter = (type) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={colors.darkGray} />
            </TouchableOpacity>
          </View>

          <View style={styles.headerCenter}>
            <Title style={styles.title}>Select Address</Title>
          </View>

          <View style={styles.headerRight}>
            {/* Placeholder for balance */}
          </View>
        </View>

        {/* Filters */}
        <View style={styles.filtersContainer}>
          {/* Asset Filter */}
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowAssetDropdown(!showAssetDropdown)}
          >
            <Text style={styles.filterButtonText}>
              Assets {selectedAssets.length > 0 ? `(${selectedAssets.length})` : ''}
            </Text>
            <Icon name="chevron-down" size={20} color={colors.mediumGray} />
          </TouchableOpacity>

          {/* Type Filter */}
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowTypeDropdown(!showTypeDropdown)}
          >
            <Text style={styles.filterButtonText}>
              Types {selectedTypes.length > 0 ? `(${selectedTypes.length})` : ''}
            </Text>
            <Icon name="chevron-down" size={20} color={colors.mediumGray} />
          </TouchableOpacity>
        </View>

        {/* Asset Filter Dropdown */}
        {showAssetDropdown && (
          <View style={styles.filterDropdown}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {getUniqueAssets().map(asset => (
                <TouchableOpacity
                  key={asset}
                  style={[
                    styles.filterChip,
                    selectedAssets.includes(asset) && styles.filterChipSelected
                  ]}
                  onPress={() => toggleAssetFilter(asset)}
                >
                  <Text style={[
                    styles.filterChipText,
                    selectedAssets.includes(asset) && styles.filterChipTextSelected
                  ]}>
                    {asset}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Type Filter Dropdown */}
        {showTypeDropdown && (
          <View style={styles.filterDropdown}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {getUniqueTypes().map(type => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.filterChip,
                    selectedTypes.includes(type) && styles.filterChipSelected
                  ]}
                  onPress={() => toggleTypeFilter(type)}
                >
                  <Text style={[
                    styles.filterChipText,
                    selectedTypes.includes(type) && styles.filterChipTextSelected
                  ]}>
                    {type.replace('CRYPTO_', '').replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Content */}
        <View style={styles.content}>
          {isInitializing ? (
            <View style={styles.centerContainer}>
              <Text style={styles.loadingText}>Initializing...</Text>
            </View>
          ) : loading ? (
            <View style={styles.centerContainer}>
              <Text style={styles.loadingText}>Loading addresses...</Text>
            </View>
          ) : error ? (
            <View style={styles.centerContainer}>
              <Text style={styles.errorText}>Error: {error}</Text>
              <TouchableOpacity onPress={initializePage} style={styles.retryButton}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : filteredAddresses.length === 0 ? (
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>
                {addresses.length === 0
                  ? 'No addresses found. Add some addresses first.'
                  : 'No addresses match the current filters.'}
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.addressList}>
              {filteredAddresses.map(renderAddressItem)}
            </ScrollView>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.mainPanelBackground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaledWidth(16),
    paddingVertical: scaledHeight(12),
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
    backgroundColor: colors.white,
  },
  headerLeft: {
    flex: 1,
  },
  headerCenter: {
    flex: 2,
    alignItems: 'center',
  },
  headerRight: {
    flex: 1,
  },
  closeButton: {
    padding: scaledWidth(8),
  },
  title: {
    fontSize: normaliseFont(18),
    fontWeight: 'bold',
    color: colors.darkGray,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: scaledWidth(16),
    paddingVertical: scaledHeight(12),
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaledWidth(12),
    paddingVertical: scaledHeight(6),
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: scaledWidth(20),
    marginRight: scaledWidth(8),
  },
  filterButtonText: {
    fontSize: normaliseFont(12),
    color: colors.darkGray,
    marginRight: scaledWidth(4),
  },
  filterDropdown: {
    backgroundColor: colors.white,
    paddingHorizontal: scaledWidth(16),
    paddingVertical: scaledHeight(8),
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  filterChip: {
    paddingHorizontal: scaledWidth(12),
    paddingVertical: scaledHeight(6),
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: scaledWidth(16),
    marginRight: scaledWidth(8),
    backgroundColor: colors.white,
  },
  filterChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: normaliseFont(12),
    color: colors.darkGray,
  },
  filterChipTextSelected: {
    color: colors.white,
  },
  content: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scaledWidth(20),
  },
  loadingText: {
    fontSize: normaliseFont(16),
    color: colors.mediumGray,
  },
  errorText: {
    fontSize: normaliseFont(16),
    color: colors.red,
    textAlign: 'center',
    marginBottom: scaledHeight(16),
  },
  emptyText: {
    fontSize: normaliseFont(16),
    color: colors.mediumGray,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: scaledWidth(20),
    paddingVertical: scaledHeight(10),
    backgroundColor: colors.primary,
    borderRadius: scaledWidth(8),
  },
  retryText: {
    color: colors.white,
    fontSize: normaliseFont(14),
    fontWeight: '500',
  },
  addressList: {
    flex: 1,
  },
  // Address item styles (matching AddressBookManagement)
  addressItemContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    alignItems: 'center',
    paddingVertical: scaledHeight(8),
    paddingHorizontal: scaledWidth(16),
    borderBottomWidth: 1.5,
    borderBottomColor: colors.lightGray,
  },
  addressIconSection: {
    marginRight: scaledWidth(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressMainContent: {
    flex: 1,
    marginRight: scaledWidth(12),
  },
  addressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scaledHeight(2),
  },
  addressName: {
    fontSize: normaliseFont(14),
    fontWeight: 'bold',
    color: colors.darkGray,
    flex: 1,
    marginRight: scaledWidth(8),
  },
  addressTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressValue: {
    fontSize: normaliseFont(12),
    color: colors.mediumGray,
    fontFamily: 'monospace',
    marginBottom: scaledHeight(2),
  },
  addressOwner: {
    fontSize: normaliseFont(11),
    color: colors.mediumGray,
    fontStyle: 'italic',
    marginBottom: scaledHeight(1),
  },
  addressBusiness: {
    fontSize: normaliseFont(11),
    color: colors.mediumGray,
    marginBottom: scaledHeight(1),
  },
  addressSelectSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: scaledWidth(8),
  },
});

export default AddressBookSelectionPage;
// React imports
import React, { useState, useContext, useEffect } from 'react';
import { Text, StyleSheet, View, ScrollView, TouchableOpacity, TouchableWithoutFeedback, Alert, FlatList, Modal } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Clipboard from '@react-native-clipboard/clipboard';

// Internal imports
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import { colors } from 'src/constants';
import AppStateContext from 'src/application/data';

// Import the original AddressBook component
import OriginalAddressBook from './AddressBook';

const AddressBookManagement = () => {
  // Get app state for API access
  let appState = useContext(AppStateContext);

  // Tab navigation state
  const [activeTab, setActiveTab] = useState('list'); // 'add' or 'list'

  // Asset filter state - now arrays for multi-select
  const [selectedAssets, setSelectedAssets] = useState([]); // ['BTC', 'ETH', 'GBP', etc.]
  const [selectedTypes, setSelectedTypes] = useState([]); // ['CRYPTO_HOSTED', 'CRYPTO_UNHOSTED', 'FIAT', etc.]
  const [showAssetDropdown, setShowAssetDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  // Address list state
  const [addresses, setAddresses] = useState([]);
  const [filteredAddresses, setFilteredAddresses] = useState([]);
  const [initiallyLoadedAddresses, setInitiallyLoadedAddresses] = useState([]); // Store the initially loaded data
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [waitingForClient, setWaitingForClient] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Page initialization state (like Transfer page)
  const [isInitializing, setIsInitializing] = useState(true);
  const [initializationError, setInitializationError] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Render trigger for state updates
  const [renderCount, setRenderCount] = useState(0);

  // Timeout management
  const [currentTimeoutId, setCurrentTimeoutId] = useState(null);
  const [isMounted, setIsMounted] = useState(true);
  const triggerRender = (newRenderCount) => setRenderCount(newRenderCount);

  // State change tracking
  const [stateChangeID, setStateChangeID] = useState(appState.stateChangeID);

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
      'BANK': 'bank',
      'EXCHANGE': 'swap-horizontal'
    };
    return typeIconMap[type] || 'wallet-outline';
  };

  // Helper function to extract address from JSON string or object
  const extractAddress = (addressData) => {
    try {
      // If it's already an object, extract the address property
      if (typeof addressData === 'object' && addressData !== null) {
        // For GBP bank accounts (NEW FORMAT with nested bank details)
        if (addressData.sortcode && addressData.accountnumber) {
          // Format: "Sort Code: XX-XX-XX, Account: XXXXXXXX"
          const sortCode = addressData.sortcode;
          const formattedSortCode = sortCode.length === 6
            ? `${sortCode.slice(0, 2)}-${sortCode.slice(2, 4)}-${sortCode.slice(4, 6)}`
            : sortCode;
          return `Sort Code: ${formattedSortCode}, Account: ${addressData.accountnumber}`;
        }
        // For crypto addresses
        return addressData.address || 'No address found';
      }
      // If it's a string, try to parse it
      if (typeof addressData === 'string') {
        const parsed = JSON.parse(addressData);
        // Check if it's a GBP bank account after parsing
        if (parsed.sortcode && parsed.accountnumber) {
          const sortCode = parsed.sortcode;
          const formattedSortCode = sortCode.length === 6
            ? `${sortCode.slice(0, 2)}-${sortCode.slice(2, 4)}-${sortCode.slice(4, 6)}`
            : sortCode;
          return `Sort Code: ${formattedSortCode}, Account: ${parsed.accountnumber}`;
        }
        return parsed.address || addressData;
      }
      return addressData || 'Invalid address';
    } catch (error) {
      return addressData || 'Invalid address';
    }
  };

  // Copy address to clipboard
  const copyToClipboard = async (address, name) => {
    try {
      const actualAddress = extractAddress(address);
      await Clipboard.setString(actualAddress);
      Alert.alert(
        'Copied!',
        `Address for "${name}" has been copied to clipboard.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to copy address to clipboard.');
    }
  };

  // Page initialization effect - load data before rendering (like Transfer page)
  useEffect(() => {
    const initializePage = async () => {
      try {
        setIsInitializing(true);
        setInitializationError(null);

        // Step 1: Check if AppState is available
        if (!appState) {
          setInitializationError('Loading application state...');
          return;
        }

        // Step 2: Setup general app state
        await appState.generalSetup({ caller: 'AddressBookManagement' });

        // Step 3: Check if API client is available
        if (!appState?.apiClient) {
          setInitializationError('API client not available. Please ensure you are logged in.');
          return;
        }

        // Step 4: Check credentials
        const { apiKey, apiSecret } = appState.apiClient;
        if (!apiKey || !apiSecret || apiKey.length === 0 || apiSecret.length === 0) {
          setInitializationError('Please log in to view your address book. API credentials are required.');
          return;
        }

        // Step 5: Load address book data initially (with live API calls)
        await loadAddressesInitially();

        setDataLoaded(true);
        setIsInitializing(false);

      } catch (error) {
        setInitializationError(error.message || 'Failed to initialize address book');
        setIsInitializing(false);
      }
    };

    initializePage();
  }, []); // Only run once on mount

  // Refresh trigger useEffect - for post-delete refreshes
  useEffect(() => {
    if (refreshTrigger > 0 && activeTab === 'list') {
      loadAddresses();
    }
  }, [refreshTrigger]);

  // Filter addresses based on selected assets and types
  useEffect(() => {
    let filtered = addresses;

    // Filter by asset if any assets are selected
    if (selectedAssets.length > 0) {
      filtered = filtered.filter(address => selectedAssets.includes(address.assetType));
    }

    // Filter by type if any types are selected
    if (selectedTypes.length > 0) {
      filtered = filtered.filter(address => selectedTypes.includes(address.type));
    }

    setFilteredAddresses(filtered);
  }, [addresses, selectedAssets, selectedTypes]);

  // Reset filters when addresses are loaded for the first time
  useEffect(() => {
    if (addresses.length > 0 && selectedAssets.length === 0 && selectedTypes.length === 0) {
      // Show all addresses initially
      setFilteredAddresses(addresses);
    }
  }, [addresses.length]);

  // Get available asset types - dynamic from API
  const getAvailableAssets = () => {
    if (appState && appState.getAvailableAssets) {
      const assets = appState.getAvailableAssets();
      if (assets && assets.length > 0) {
        // Ensure GBP is always included if not present (it's a base currency)
        if (!assets.includes('GBP')) {
          return [...assets, 'GBP'];
        }
        return assets;
      }
    }
    // Fallback if API not ready
    return ['BTC', 'ETH', 'GBP'];
  };

  // Get available address types - hardcoded for reliability
  const getAddressTypes = () => {
    const types = ['CRYPTO_HOSTED', 'CRYPTO_UNHOSTED', 'FIAT', 'BANK'];
    return types.sort();
  };

  // Helper functions for multi-select management
  const closeDropdowns = () => {
    setShowAssetDropdown(false);
    setShowTypeDropdown(false);
  };

  const toggleAssetSelection = (asset) => {
    setSelectedAssets(prev => {
      if (prev.includes(asset)) {
        return prev.filter(a => a !== asset);
      } else {
        return [...prev, asset];
      }
    });
  };

  const toggleTypeSelection = (type) => {
    setSelectedTypes(prev => {
      if (prev.includes(type)) {
        return prev.filter(t => t !== type);
      } else {
        return [...prev, type];
      }
    });
  };

  const clearAllFilters = () => {
    setSelectedAssets([]);
    setSelectedTypes([]);
    setShowAssetDropdown(false);
    setShowTypeDropdown(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentTimeoutId) {
        clearTimeout(currentTimeoutId);
      }
    };
  }, [currentTimeoutId]);

  // Initial load with live API calls (used only once during initialization)
  const loadAddressesInitially = async () => {
    setIsLoading(true);
    setError('');

    // Add timeout for initial load
    const timeoutId = setTimeout(() => {
      setIsLoading(false);
      setError('Initial load is taking longer than expected. Please try refreshing.');
    }, 30000);

    try {
      if (!appState?.apiClient) {
        throw new Error('API client not available. Please ensure you are logged in.');
      }

      // Check if credentials are available
      const { apiKey, apiSecret } = appState.apiClient;
      if (!apiKey || !apiSecret || apiKey.length === 0 || apiSecret.length === 0) {
        throw new Error('Please log in to view your address book. API credentials are required.');
      }

      // Load addresses for each supported asset using live API calls
      const assets = getAvailableAssets();
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
          // Continue with other assets even if one fails
        }
      }

      // Store the initially loaded data for future use
      setInitiallyLoadedAddresses(allAddresses);
      setAddresses(allAddresses);

      if (allAddresses.length === 0) {
        // Don't treat an empty address list as an error — show the empty state instead
        setError('');
      } else {
        setError('');
      }

    } catch (error) {
      setError(`Failed to load addresses: ${error.message}`);
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // Refresh using initially loaded data (no new API calls)
  const loadAddresses = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Use the initially loaded addresses instead of making new API calls
      if (initiallyLoadedAddresses.length > 0) {
        setAddresses([...initiallyLoadedAddresses]); // Create a fresh copy
        setError('');
      } else {
        setError('No initial data available. Please restart the app to load fresh data.');
      }

    } catch (error) {
      setError(`Failed to refresh addresses: ${error.message}`);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // Delete an address
  const deleteAddress = async (address) => {

    Alert.alert(
      'Delete Address',
      `Are you sure you want to delete "${address.name}"?\n\nThis action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ [AddressBook] Deleting address:', address.uuid);

              // Delete address using dedicated DELETE method
              const result = await appState.apiClient.privateDeleteMethod({
                apiRoute: `addressBook/delete/${address.uuid}`
              });

              console.log('🗑️ [AddressBook] Delete response:', result);
              console.log('🗑️ [AddressBook] Delete response type:', typeof result);
              console.log('🗑️ [AddressBook] Delete response JSON:', JSON.stringify(result, null, 2));
              console.log('🗑️ [AddressBook] result.error:', result?.error);
              console.log('🗑️ [AddressBook] result.data:', result?.data);

              // Check for success: either string "success" or {error: null, data: "success"}
              const isSuccess = result === 'success' ||
                (result && result.error === null && result.data === 'success') ||
                (result && result.error === null);

              if (isSuccess) {
                console.log('✅ [AddressBook] Delete successful - clearing cache and updating UI');

                // Clear address book cache for this asset to force refresh
                if (appState.clearAddressBookCache && typeof appState.clearAddressBookCache === 'function') {
                  appState.clearAddressBookCache(address.asset);
                }

                // Update the initially loaded addresses to remove the deleted address
                setInitiallyLoadedAddresses(prev => prev.filter(addr => addr.uuid !== address.uuid));

                Alert.alert('Success', 'Address deleted successfully.');

                // Trigger refresh using state change
                setTimeout(() => {
                  setRefreshTrigger(prev => prev + 1);
                }, 500);
              } else {
                const errorMsg = result?.error || 'Failed to delete address.';
                console.error('❌ [AddressBook] Delete failed with error:', errorMsg);
                Alert.alert('Error', errorMsg);
              }
            } catch (error) {
              console.error('❌ [AddressBook] Delete exception:', error);
              console.error('❌ [AddressBook] Exception message:', error.message);
              console.error('❌ [AddressBook] Exception stack:', error.stack);
              Alert.alert('Error', `Failed to delete address: ${error.message}`);
            }
          },
        },
      ]
    );
  };

  // Parse address data safely - handle both objects and strings
  const parseAddressData = (addressInput) => {
    try {
      // If it's already an object, return it directly
      if (typeof addressInput === 'object' && addressInput !== null) {
        return addressInput;
      }
      // If it's a string, try to parse it
      if (typeof addressInput === 'string') {
        return JSON.parse(addressInput);
      }
      // Fallback for other types
      return { address: String(addressInput) };
    } catch (e) {
      // If parsing fails, wrap the input as an address property
      return { address: String(addressInput) };
    }
  };

  // Render individual address item with copy and delete functionality
  const renderAddressItem = ({ item }) => {
    // Safety check for malformed items
    if (!item || typeof item !== 'object') {
      return null;
    }

    const addressData = parseAddressData(item.address);

    const cryptoIcon = getCryptoIcon(item.assetType);
    const addressTypeIcon = getAddressTypeIcon(item.type);
    const actualAddress = extractAddress(addressData);

    // Ensure actualAddress is always a string
    const displayAddress = String(actualAddress || 'Invalid address');

    return (
      <View style={styles.addressItemContainer}>
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

        <View style={styles.addressActionsSection}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => copyToClipboard(displayAddress, item.name)}
          >
            <Icon name="content-copy" size={16} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteActionButton]}
            onPress={() => deleteAddress(item)}
          >
            <Icon name="delete" size={16} color={colors.red} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Get color for asset badge
  const getAssetColor = (asset) => {
    switch (asset) {
      case 'BTC': return '#f7931a';
      case 'ETH': return '#627eea';
      case 'GBP': return '#009639';
      default: return colors.mediumGray;
    }
  };

  // Handle refresh
  const onRefresh = () => {
    setRefreshing(true);
    loadAddresses();
  };

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="book-open-page-variant" size={80} color={colors.lightGray} />
      <Text style={styles.emptyStateTitle}>No Addresses Yet</Text>
      <Text style={styles.emptyStateText}>
        Add your first address using the "Add" tab above.
      </Text>
    </View>
  );

  // Render error state
  const renderErrorState = () => (
    <View style={styles.errorState}>
      <Icon name="alert-circle" size={80} color={colors.red} />
      <Text style={styles.errorTitle}>Failed to Load</Text>
      <Text style={styles.errorText}>{error}</Text>

      {/* Show different action based on error type */}
      {error.includes('API client not available') ? (
        <View style={styles.errorActions}>
          <TouchableOpacity style={styles.retryButton} onPress={checkAPIClient}>
            <Text style={styles.retryButtonText}>Check API Client</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.mediumGray, marginTop: 10 }]} onPress={loadAddresses}>
            <Text style={styles.retryButtonText}>Force Retry</Text>
          </TouchableOpacity>
          <Text style={styles.errorHint}>
            Make sure you are logged in to access your address book.
          </Text>
        </View>
      ) : error.includes('API credentials are required') || error.includes('Please log in') ? (
        <View style={styles.errorActions}>
          <Text style={styles.errorHint}>
            You need to log in with your Solidi account to view your address book.
          </Text>
          <Text style={[styles.errorHint, { marginTop: 10, fontSize: normaliseFont(12) }]}>
            Your API credentials are not yet available. Please log in through the app's login process.
          </Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.retryButton} onPress={loadAddresses}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Handle address added callback
  const handleAddressAdded = () => {
    // Clear any existing timeout to prevent conflicts
    if (currentTimeoutId) {
      clearTimeout(currentTimeoutId);
      setCurrentTimeoutId(null);
    }

    // Switch to list tab and reload initial data to include the new address
    setTimeout(() => {
      setActiveTab('list');
      // Reload the initial data to include the newly added address
      loadAddressesInitially();
    }, 100);
  };

  return (
    <View style={styles.container}>
      {/* Show initialization loading screen first */}
      {isInitializing ? (
        <View style={styles.initializingContainer} testID="address-book-loading">
          <Text style={styles.initializingTitle}>Loading Address Book</Text>
          <Text style={styles.initializingText}>Please wait while we load your addresses...</Text>
        </View>
      ) : initializationError ? (
        <View style={styles.errorContainer} testID="address-book-error">
          <Text style={styles.errorTitle}>Failed to Load</Text>
          <Text style={styles.errorText}>{initializationError}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setIsInitializing(true);
              setInitializationError(null);
              // Restart initialization
              setTimeout(() => {
                const initializePage = async () => {
                  try {
                    setIsInitializing(true);
                    setInitializationError(null);

                    if (!appState) {
                      setInitializationError('Loading application state...');
                      setIsInitializing(false);
                      return;
                    }

                    await appState.generalSetup({ caller: 'AddressBookManagement' });

                    if (!appState?.apiClient) {
                      setInitializationError('API client not available. Please ensure you are logged in.');
                      setIsInitializing(false);
                      return;
                    }

                    const { apiKey, apiSecret } = appState.apiClient;
                    if (!apiKey || !apiSecret || apiKey.length === 0 || apiSecret.length === 0) {
                      setInitializationError('Please log in to view your address book. API credentials are required.');
                      setIsInitializing(false);
                      return;
                    }

                    await loadAddresses();
                    setDataLoaded(true);
                    setIsInitializing(false);

                  } catch (error) {
                    setInitializationError(error.message || 'Failed to initialize address book');
                    setIsInitializing(false);
                  }
                };
                initializePage();
              }, 100);
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Tab Header */}
          <View style={styles.tabContainer} testID="address-book-root">
            <TouchableOpacity
              style={[styles.tab, activeTab === 'list' && styles.activeTab]}
              onPress={() => setActiveTab('list')}
            >
              <Icon
                name="format-list-bulleted"
                size={20}
                color={activeTab === 'list' ? colors.white : colors.mediumGray}
              />
              <Text style={[styles.tabText, activeTab === 'list' && styles.activeTabText]}>
                Address List
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'add' && styles.activeTab]}
              testID="address-book-add-tab"
              onPress={() => {
                setActiveTab('add');
              }}
            >
              <Icon
                name="plus"
                size={20}
                color={activeTab === 'add' ? colors.white : colors.mediumGray}
              />
              <Text style={[styles.tabText, activeTab === 'add' && styles.activeTabText]}>
                Add Address
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          {activeTab === 'add' ? (
            <View style={{ flex: 1 }}>
              <OriginalAddressBook onAddressAdded={handleAddressAdded} />
            </View>
          ) : (
            <View style={styles.listContainer}>
              {/* List Header with Asset Filter */}
              <View style={styles.listHeader}>
                <Text style={styles.listTitle}>Address Book</Text>
                <Text style={styles.listSubtitle}>
                  {filteredAddresses.length} address{filteredAddresses.length !== 1 ? 'es' : ''}
                </Text>
                <TouchableOpacity
                  style={styles.refreshButton}
                  onPress={onRefresh}
                  disabled={isLoading}
                >
                  <Icon
                    name="refresh"
                    size={18}
                    color={isLoading ? colors.lightGray : colors.primary}
                  />
                  <Text style={[styles.refreshButtonText, isLoading && styles.refreshButtonTextDisabled]}>
                    {isLoading ? 'Loading...' : 'Reload Cache'}
                  </Text>
                </TouchableOpacity>

                {/* Force reload button if there are issues */}
                {error && (
                  <TouchableOpacity
                    style={[styles.refreshButton, { backgroundColor: colors.mediumGray, marginLeft: 10 }]}
                    onPress={() => {
                      setAddresses([]); // Clear existing addresses
                      setInitiallyLoadedAddresses([]); // Clear initially loaded data
                      setError(''); // Clear error
                      loadAddressesInitially(); // Force fresh load with live API calls
                    }}
                    disabled={isLoading}
                  >
                    <Icon
                      name="refresh-circle"
                      size={18}
                      color={isLoading ? colors.lightGray : colors.white}
                    />
                    <Text style={[styles.refreshButtonText, { color: colors.white }]}>
                      Reload Fresh
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Multi-Select Filter Row */}
              <View style={styles.filterContainer}>
                <View style={styles.filterHeaderRow}>
                  <Text style={styles.filterLabel}>Filter Addresses</Text>
                  <TouchableOpacity
                    style={styles.clearFiltersButton}
                    onPress={clearAllFilters}
                  >
                    <Text style={styles.clearFiltersText}>Clear All</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.filterRowContainer}>
                  {/* Asset Filter Dropdown */}
                  <View style={styles.dropdownContainer}>
                    <TouchableOpacity
                      style={styles.dropdownButton}
                      onPress={() => setShowAssetDropdown(!showAssetDropdown)}
                    >
                      <Text style={styles.dropdownButtonText}>
                        Assets {selectedAssets.length > 0 ? `(${selectedAssets.length})` : ''}
                      </Text>
                      <Icon
                        name={showAssetDropdown ? "chevron-up" : "chevron-down"}
                        size={16}
                        color={colors.mediumGray}
                      />
                    </TouchableOpacity>

                    {showAssetDropdown && (
                      <Modal
                        visible={showAssetDropdown}
                        transparent={true}
                        animationType="fade"
                        onRequestClose={() => setShowAssetDropdown(false)}
                      >
                        <TouchableWithoutFeedback onPress={() => setShowAssetDropdown(false)}>
                          <View style={styles.modalOverlay}>
                            <TouchableWithoutFeedback onPress={() => { }}>
                              <View style={styles.modalDropdownContainer}>
                                <View style={styles.dropdownContent}>
                                  <ScrollView style={styles.dropdownScrollView} nestedScrollEnabled={true}>
                                    {getAvailableAssets().map(asset => {
                                      const count = addresses.filter(addr => addr.assetType === asset).length;
                                      const isSelected = selectedAssets.includes(asset);
                                      return (
                                        <TouchableOpacity
                                          key={asset}
                                          style={[styles.dropdownItem, isSelected && styles.dropdownItemSelected]}
                                          onPress={() => toggleAssetSelection(asset)}
                                        >
                                          <View style={styles.dropdownItemContent}>
                                            <View style={[styles.assetBadge, { backgroundColor: getAssetColor(asset) }]}>
                                              <Text style={styles.assetBadgeText}>{asset}</Text>
                                            </View>
                                            <Text style={styles.dropdownItemText}>({count})</Text>
                                          </View>
                                          {isSelected && (
                                            <Icon name="check" size={16} color={colors.primary} />
                                          )}
                                        </TouchableOpacity>
                                      );
                                    })}
                                  </ScrollView>
                                  <View style={styles.dropdownActions}>
                                    <TouchableOpacity
                                      style={styles.modalDoneButton}
                                      onPress={() => setShowAssetDropdown(false)}
                                    >
                                      <Text style={styles.modalDoneButtonText}>Done</Text>
                                    </TouchableOpacity>
                                  </View>
                                </View>
                              </View>
                            </TouchableWithoutFeedback>
                          </View>
                        </TouchableWithoutFeedback>
                      </Modal>
                    )}
                  </View>

                  {/* Type Filter Dropdown */}
                  <View style={styles.dropdownContainer}>
                    <TouchableOpacity
                      style={styles.dropdownButton}
                      onPress={() => setShowTypeDropdown(!showTypeDropdown)}
                    >
                      <Text style={styles.dropdownButtonText}>
                        Types {selectedTypes.length > 0 ? `(${selectedTypes.length})` : ''}
                      </Text>
                      <Icon
                        name={showTypeDropdown ? "chevron-up" : "chevron-down"}
                        size={16}
                        color={colors.mediumGray}
                      />
                    </TouchableOpacity>

                    {showTypeDropdown && (
                      <Modal
                        visible={showTypeDropdown}
                        transparent={true}
                        animationType="fade"
                        onRequestClose={() => setShowTypeDropdown(false)}
                      >
                        <TouchableWithoutFeedback onPress={() => setShowTypeDropdown(false)}>
                          <View style={styles.modalOverlay}>
                            <TouchableWithoutFeedback onPress={() => { }}>
                              <View style={styles.modalDropdownContainer}>
                                <View style={styles.dropdownContent}>
                                  <ScrollView style={styles.dropdownScrollView} nestedScrollEnabled={true}>
                                    {getAvailableTypes().map(type => {
                                      const count = addresses.filter(addr => addr.type === type).length;
                                      const isSelected = selectedTypes.includes(type);
                                      return (
                                        <TouchableOpacity
                                          key={type}
                                          style={[styles.dropdownItem, isSelected && styles.dropdownItemSelected]}
                                          onPress={() => toggleTypeSelection(type)}
                                        >
                                          <View style={styles.dropdownItemContent}>
                                            <Icon
                                              name={getAddressTypeIcon(type)}
                                              size={16}
                                              color={colors.mediumGray}
                                            />
                                            <Text style={styles.dropdownItemText}>{type} ({count})</Text>
                                          </View>
                                          {isSelected && (
                                            <Icon name="check" size={16} color={colors.primary} />
                                          )}
                                        </TouchableOpacity>
                                      );
                                    })}
                                  </ScrollView>
                                  <View style={styles.dropdownActions}>
                                    <TouchableOpacity
                                      style={styles.modalDoneButton}
                                      onPress={() => setShowTypeDropdown(false)}
                                    >
                                      <Text style={styles.modalDoneButtonText}>Done</Text>
                                    </TouchableOpacity>
                                  </View>
                                </View>
                              </View>
                            </TouchableWithoutFeedback>
                          </View>
                        </TouchableWithoutFeedback>
                      </Modal>
                    )}
                  </View>
                </View>

                {/* Selected Filters Summary */}
                {(selectedAssets.length > 0 || selectedTypes.length > 0) && (
                  <View style={styles.selectedFiltersContainer}>
                    <Text style={styles.selectedFiltersLabel}>Active Filters:</Text>
                    <View style={styles.selectedFiltersChips}>
                      {selectedAssets.map(asset => (
                        <View key={`asset-${asset}`} style={[styles.selectedChip, { borderColor: getAssetColor(asset) }]}>
                          <Text style={styles.selectedChipText}>{asset}</Text>
                        </View>
                      ))}
                      {selectedTypes.map(type => (
                        <View key={`type-${type}`} style={styles.selectedChip}>
                          <Text style={styles.selectedChipText}>{type}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              {/* Address List */}
              <View style={styles.addressListWrapper}>
                {waitingForClient ? (
                  <View style={styles.loadingState}>
                    <Icon name="clock-outline" size={60} color={colors.primary} />
                    <Text style={styles.loadingText}>Waiting for login...</Text>
                    <Text style={[styles.loadingText, { fontSize: 12, marginTop: 5 }]}>
                      Please ensure you are logged in to access your address book
                    </Text>
                  </View>
                ) : isLoading && filteredAddresses.length === 0 ? (
                  <View style={styles.loadingState}>
                    <Text style={styles.loadingText}>Loading addresses...</Text>
                  </View>
                ) : error ? (
                  renderErrorState()
                ) : filteredAddresses.length === 0 ? (
                  (selectedAssets.length === 0 && selectedTypes.length === 0) ? renderEmptyState() : (
                    <View style={styles.emptyState}>
                      <Icon name="filter" size={80} color={colors.lightGray} />
                      <Text style={styles.emptyStateTitle}>No Matching Addresses</Text>
                      <Text style={styles.emptyStateText}>
                        No addresses found for the selected filters. Try adjusting your filter criteria.
                      </Text>
                    </View>
                  )
                ) : (
                  <ScrollView
                    style={{ height: 400 }}
                    showsVerticalScrollIndicator={true}
                    contentContainerStyle={{ paddingBottom: 20 }}
                  >
                    {(filteredAddresses || []).map((item, index) => {
                      if (!item || typeof item !== 'object') {
                        return null;
                      }
                      return (
                        <View key={item?.uuid || `addr-${index}`}>
                          {renderAddressItem({ item })}
                        </View>
                      );
                    })}
                  </ScrollView>
                )}
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: '100%',
    backgroundColor: colors.white,
    position: 'relative',
  },

  // Tab styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.lightGray,
    borderRadius: 8,
    margin: scaledWidth(10),
    padding: scaledWidth(3),
  },

  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scaledHeight(10),
    paddingHorizontal: scaledWidth(12),
    borderRadius: 6,
  },

  activeTab: {
    backgroundColor: colors.primary,
  },

  tabText: {
    fontSize: normaliseFont(14),
    fontWeight: '600',
    color: colors.mediumGray,
    marginLeft: scaledWidth(8),
  },

  activeTabText: {
    color: colors.white,
  },

  // List container styles
  listContainer: {
    flex: 1,
    height: '100%',
    padding: scaledWidth(10),
    position: 'relative',
  },

  // List header styles
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scaledHeight(10),
  },

  listTitle: {
    fontSize: normaliseFont(18),
    fontWeight: 'bold',
    color: colors.darkGray,
    flex: 1,
  },

  listSubtitle: {
    fontSize: normaliseFont(14),
    color: colors.mediumGray,
    marginRight: scaledWidth(15),
  },

  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scaledHeight(8),
    paddingHorizontal: scaledWidth(12),
    borderRadius: 6,
    backgroundColor: colors.lightGray,
  },

  refreshButtonText: {
    fontSize: normaliseFont(12),
    color: colors.primary,
    marginLeft: scaledWidth(4),
    fontWeight: '600',
  },

  // Address list styles
  addressListWrapper: {
    flex: 1,
    height: '80%',  // Match Transaction History pattern
    minHeight: 200,
    zIndex: 1,
  },

  addressScrollView: {
    flex: 1,
    marginTop: scaledHeight(5),
  },

  addressScrollContent: {
    paddingBottom: scaledHeight(20),
  },

  addressListContainer: {
    backgroundColor: colors.white,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.lightGray,
  },

  addressListContent: {
    paddingBottom: scaledHeight(20),
  },

  // Address item styles (new layout with no spacing)
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

  addressTypeText: {
    fontSize: normaliseFont(12),
    color: colors.mediumGray,
    marginLeft: scaledWidth(4),
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

  addressActionsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lightestGray,
    borderRadius: 12,
    paddingHorizontal: scaledWidth(4),
    paddingVertical: scaledHeight(2),
  },

  actionButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: scaledWidth(28),
    height: scaledHeight(28),
    borderRadius: 14,
    backgroundColor: 'transparent',
    marginHorizontal: scaledWidth(2),
  },

  deleteActionButton: {
    backgroundColor: 'transparent',
  },

  // State styles
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    fontSize: normaliseFont(16),
    color: colors.mediumGray,
  },

  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scaledWidth(40),
  },

  emptyStateTitle: {
    fontSize: normaliseFont(20),
    fontWeight: 'bold',
    color: colors.mediumGray,
    marginTop: scaledHeight(20),
    marginBottom: scaledHeight(10),
  },

  emptyStateText: {
    fontSize: normaliseFont(16),
    color: colors.mediumGray,
    textAlign: 'center',
    lineHeight: scaledHeight(24),
  },

  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scaledWidth(40),
  },

  errorTitle: {
    fontSize: normaliseFont(20),
    fontWeight: 'bold',
    color: colors.red,
    marginTop: scaledHeight(20),
    marginBottom: scaledHeight(10),
  },

  errorText: {
    fontSize: normaliseFont(16),
    color: colors.mediumGray,
    textAlign: 'center',
    lineHeight: scaledHeight(24),
    marginBottom: scaledHeight(20),
  },

  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: scaledWidth(24),
    paddingVertical: scaledHeight(12),
    borderRadius: 8,
  },

  retryButtonText: {
    fontSize: normaliseFont(16),
    fontWeight: '600',
    color: colors.white,
  },

  errorActions: {
    alignItems: 'center',
  },

  errorHint: {
    fontSize: normaliseFont(14),
    color: colors.mediumGray,
    textAlign: 'center',
    marginTop: scaledHeight(10),
    fontStyle: 'italic',
  },

  // Simple address list styles
  simpleAddressItem: {
    padding: scaledWidth(10),
    marginBottom: scaledHeight(8),
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.lightGray,
  },

  simpleAddressName: {
    fontSize: normaliseFont(14),
    fontWeight: 'bold',
    color: colors.darkGray,
    marginBottom: scaledHeight(4),
  },

  simpleAddressValue: {
    fontSize: normaliseFont(12),
    color: colors.mediumGray,
    fontFamily: 'monospace',
    marginBottom: scaledHeight(4),
  },

  simpleAddressAsset: {
    fontSize: normaliseFont(11),
    color: colors.primary,
    fontWeight: '600',
  },

  // Multi-select filter styles
  filterContainer: {
    marginBottom: scaledHeight(15),
    paddingHorizontal: scaledWidth(5),
    zIndex: 99999,
    elevation: 100,
    position: 'relative',
  },

  filterHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scaledHeight(10),
  },

  filterLabel: {
    fontSize: normaliseFont(14),
    fontWeight: '600',
    color: colors.darkGray,
  },

  clearFiltersButton: {
    paddingHorizontal: scaledWidth(12),
    paddingVertical: scaledHeight(6),
    backgroundColor: colors.lightGray,
    borderRadius: 15,
  },

  clearFiltersText: {
    fontSize: normaliseFont(12),
    color: colors.mediumGray,
    fontWeight: '500',
  },

  filterRowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: scaledWidth(10),
  },

  dropdownContainer: {
    flex: 1,
    position: 'relative',
    zIndex: 99998,
    elevation: 99,
  },

  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scaledWidth(12),
    paddingVertical: scaledHeight(10),
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: 8,
  },

  dropdownButtonText: {
    fontSize: normaliseFont(13),
    color: colors.darkGray,
    fontWeight: '500',
  },

  dropdownContent: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: 8,
    marginTop: scaledHeight(2),
    maxHeight: scaledHeight(200),
    zIndex: 99997,
    elevation: 98,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },

  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scaledWidth(12),
    paddingVertical: scaledHeight(10),
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },

  dropdownItemSelected: {
    backgroundColor: colors.primary + '10',
  },

  dropdownItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  dropdownItemText: {
    fontSize: normaliseFont(12),
    color: colors.darkGray,
    marginLeft: scaledWidth(8),
  },

  selectedFiltersContainer: {
    marginTop: scaledHeight(10),
    paddingTop: scaledHeight(10),
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
  },

  selectedFiltersLabel: {
    fontSize: normaliseFont(12),
    color: colors.mediumGray,
    marginBottom: scaledHeight(5),
  },

  selectedFiltersChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scaledWidth(5),
  },

  selectedChip: {
    paddingHorizontal: scaledWidth(8),
    paddingVertical: scaledHeight(4),
    backgroundColor: colors.primary + '20',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
  },

  selectedChipText: {
    fontSize: normaliseFont(10),
    color: colors.primary,
    fontWeight: '600',
  },

  // Legacy styles (keep for existing components)
  filterChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scaledWidth(8),
    paddingHorizontal: scaledWidth(5),
  },

  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaledWidth(12),
    paddingVertical: scaledHeight(6),
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.lightGray,
    backgroundColor: colors.white,
    marginRight: scaledWidth(8),
    marginBottom: scaledHeight(6),
  },

  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  filterChipText: {
    fontSize: normaliseFont(12),
    color: colors.mediumGray,
    fontWeight: '500',
    marginLeft: scaledWidth(4),
  },

  filterChipTextActive: {
    color: colors.white,
    fontWeight: '600',
  },

  assetBadge: {
    paddingHorizontal: scaledWidth(6),
    paddingVertical: scaledHeight(2),
    borderRadius: 10,
    minWidth: scaledWidth(28),
    alignItems: 'center',
  },

  assetBadgeText: {
    fontSize: normaliseFont(10),
    fontWeight: 'bold',
    color: colors.white,
  },

  // Initialization loading styles
  initializingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scaledWidth(20),
  },

  initializingTitle: {
    fontSize: normaliseFont(18),
    fontWeight: 'bold',
    color: colors.darkGray,
    marginBottom: scaledHeight(10),
  },

  initializingText: {
    fontSize: normaliseFont(14),
    color: colors.mediumGray,
    textAlign: 'center',
  },

  // Error state styles
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scaledWidth(20),
  },

  errorTitle: {
    fontSize: normaliseFont(18),
    fontWeight: 'bold',
    color: colors.error,
    marginBottom: scaledHeight(10),
  },

  errorText: {
    fontSize: normaliseFont(14),
    color: colors.mediumGray,
    textAlign: 'center',
    marginBottom: scaledHeight(20),
  },

  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: scaledWidth(20),
    paddingVertical: scaledHeight(10),
    borderRadius: 8,
  },

  retryButtonText: {
    color: colors.white,
    fontSize: normaliseFont(14),
    fontWeight: 'bold',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  modalDropdownContainer: {
    backgroundColor: colors.white,
    borderRadius: 12,
    maxHeight: 400,
    width: '100%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },

  modalDoneButton: {
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    margin: 12,
  },

  modalDoneButtonText: {
    color: colors.white,
    fontSize: normaliseFont(16),
    fontWeight: '600',
  },

  dropdownScrollView: {
    maxHeight: 300,
  },

  dropdownActions: {
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
    paddingTop: 8,
  },
});

export default AddressBookManagement;
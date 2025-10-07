// React imports
import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { Text, HelperText } from 'react-native-paper';

// Internal imports
import { colors } from 'src/constants';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import AppStateContext from 'src/application/data';

let AddressBookPicker = ({ 
  selectedAsset = 'BTC', 
  onAddressSelect, 
  label = "Select from Address Book",
  placeholder = "Choose a saved address..."
}) => {
  // Get app state for API access
  let appState = useContext(AppStateContext);
  let stateChangeID = appState?.stateChangeID || 0;
  
  // Component state
  let [open, setOpen] = useState(false);
  let [value, setValue] = useState(null);
  let [items, setItems] = useState([]);
  let [addresses, setAddresses] = useState([]);
  let [loading, setLoading] = useState(false);
  let [error, setError] = useState(null);

  // Helper function to transform address data
  let transformAddressData = (addressData, asset) => {
    if (!addressData || !Array.isArray(addressData)) {
      return [];
    }
    
    return addressData.map((addr, index) => {
      // Parse the address JSON string to get the actual wallet address
      let addressInfo = {};
      try {
        if (typeof addr.address === 'string') {
          addressInfo = JSON.parse(addr.address);
        } else {
          addressInfo = addr.address || {};
        }
      } catch (e) {
        addressInfo = { address: addr.address };
      }
      
      return {
        id: addr.uuid || `${asset.toLowerCase()}_${index}`,
        label: addr.name || `${asset} Address ${index + 1}`,
        address: addressInfo.address || addr.address,
        description: `${addr.name} (${addr.type})`,
        rawData: addr
      };
    });
  };

  // Function to load addresses from cache or API
  let loadAddressesFromAPI = async (asset) => {
    if (!appState) {
      setError('App state not available');
      return [];
    }

    try {
      setLoading(true);
      setError(null);
      
      // First try to get cached addresses
      let cachedAddresses = appState.getAddressBook ? appState.getAddressBook(asset) : [];
      
      if (cachedAddresses && cachedAddresses.length > 0) {
        let transformedAddresses = transformAddressData(cachedAddresses, asset);
        return transformedAddresses;
      }
      
      // If no cached data, load from API
      let result = null;
      
      if (appState.loadAddressBook) {
        // Use the cached version from AppState
        result = await appState.loadAddressBook(asset);
      } else {
        // Fallback to direct API call
        if (!appState.apiClient) {
          setError('API client not available');
          return [];
        }
        
        result = await appState.apiClient.privateMethod({
          httpMethod: 'GET',
          apiRoute: `addressBook/${asset}`,
          params: {}
        });
        
        if (result && result.error === null && result.data) {
          result = result.data;
        }
      }
      
      let transformedAddresses = transformAddressData(result, asset);
      return transformedAddresses;
      
    } catch (error) {
      setError(`Failed to load ${selectedAsset} addresses`);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Load addresses when selectedAsset changes
  useEffect(() => {
    let loadAddresses = async () => {
      let addressesForAsset = await loadAddressesFromAPI(selectedAsset);
      setAddresses(addressesForAsset);
    };
    
    loadAddresses();
  }, [selectedAsset]); // Remove appState dependency to ensure it always runs

  // Refresh addresses when appState changes (e.g., after adding new address)
  useEffect(() => {
    if (stateChangeID > 0) {
      let loadAddresses = async () => {
        let addressesForAsset = await loadAddressesFromAPI(selectedAsset);
        setAddresses(addressesForAsset);
      };
      
      loadAddresses();
    }
  }, [stateChangeID, selectedAsset]);

  // Force initial load on mount regardless of appState
  useEffect(() => {
    // Add a small delay to ensure appState is available
    const timer = setTimeout(() => {
      loadAddressesFromAPI(selectedAsset).then(addressesForAsset => {
        setAddresses(addressesForAsset);
      });
    }, 100);
    
    return () => {
      clearTimeout(timer);
    };
  }, []); // Only run on mount

  // Get addresses for the selected asset with error handling
  let addressesForAsset = addresses;
  
  // Convert to dropdown format with safe array handling
  let dropdownItems = [];
  try {
    // Ensure we have a valid array of addresses
    const safeAddresses = Array.isArray(addressesForAsset) ? addressesForAsset.filter(addr => 
      addr && 
      typeof addr.label === 'string' && 
      typeof addr.address === 'string' && 
      addr.label.length > 0 && 
      addr.address.length > 0
    ) : [];
    
    // Always start with a consistent base structure
    dropdownItems = [];
    
    // Add placeholder item
    dropdownItems.push({
      label: safeAddresses.length > 0 ? placeholder : "No saved addresses available",
      value: null,
      disabled: true,
      key: 'placeholder_item'
    });
    
    // Add address items with guaranteed unique keys
    safeAddresses.forEach((addr, index) => {
      dropdownItems.push({
        label: `${addr.label} (${addr.address.substring(0, 8)}...)`,
        value: addr.address,
        key: `addr_${selectedAsset}_${index}_${addr.address.substring(0, 8)}`,
        description: addr.description || ''
      });
    });
    
  } catch (error) {
    dropdownItems = [
      {
        label: "Error loading addresses",
        value: null,
        disabled: true,
        key: 'error_fallback'
      }
    ];
  }

  // Update the items state when dropdownItems change
  useEffect(() => {
    try {
      // Ensure all items have the required structure for DropDownPicker
      const validatedItems = dropdownItems.map((item, index) => ({
        label: item.label || `Item ${index + 1}`,
        value: item.value !== undefined ? item.value : `item_${index}`,
        key: item.key || `key_${index}`,
        disabled: item.disabled || false
      }));
      
      setItems(validatedItems);
    } catch (error) {
      setItems([{
        label: "Error loading items", 
        value: null, 
        disabled: true, 
        key: 'error_fallback'
      }]);
    }
  }, [selectedAsset, addressesForAsset.length]);

  let handleValueChange = (selectedValue) => {
    try {
      setValue(selectedValue);
      if (selectedValue && onAddressSelect) {
        // Find the full address details
        let selectedAddress = addressesForAsset.find(addr => addr.address === selectedValue);
        onAddressSelect(selectedValue, selectedAddress);
      }
    } catch (error) {
      // Handle error silently
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      
      {loading && (
        <View style={[styles.dropdown, {justifyContent: 'center', alignItems: 'center'}]}>
          <Text style={{color: '#666666', fontSize: 14}}>Loading addresses...</Text>
        </View>
      )}
      
      {error && !loading && (
        <View style={[styles.dropdown, {justifyContent: 'center', alignItems: 'center'}]}>
          <Text style={{color: '#cc0000', fontSize: 14}}>{error}</Text>
        </View>
      )}
      
      {!loading && !error && items.length > 0 ? (
        <View style={{zIndex: 4000, elevation: 4000}}>
          <DropDownPicker
            open={open}
            value={value}
            items={items.length > 0 ? items : [{label: "No items", value: null, disabled: true, key: 'empty'}]}
            setOpen={setOpen}
            setValue={setValue}
            setItems={setItems}
            onChangeValue={handleValueChange}
            placeholder={addressesForAsset.length > 0 ? placeholder : "No addresses available"}
            style={styles.dropdown}
            dropDownContainerStyle={styles.dropdownContainer}
            textStyle={styles.dropdownText}
            placeholderStyle={styles.placeholderText}
            disabled={addressesForAsset.length === 0}
            zIndex={4000}
            zIndexInverse={1000}
            listMode="SCROLLVIEW"
            scrollViewProps={{
              nestedScrollEnabled: true,
              showsVerticalScrollIndicator: true,
              showsHorizontalScrollIndicator: false,
              bounces: true,
              contentContainerStyle: { 
                paddingVertical: 5
              }
            }}
            maxHeight={250}
            autoScroll={true}
            closeAfterSelecting={true}
          />
        </View>
      ) : !loading && !error && (
        <View style={[styles.dropdown, {justifyContent: 'center', alignItems: 'center'}]}>
          <Text style={{color: '#666666', fontSize: 14}}>No dropdown items available</Text>
        </View>
      )}
      
      {addressesForAsset.length === 0 && !loading && !error && (
        <HelperText type="info" visible={true} style={styles.helperText}>
          No saved addresses for {selectedAsset}
        </HelperText>
      )}
      
      {addressesForAsset.length > 0 && !loading && (
        <HelperText type="info" visible={true} style={styles.helperText}>
          {addressesForAsset.length} saved address{addressesForAsset.length > 1 ? 'es' : ''} available
        </HelperText>
      )}
      
      {loading && (
        <HelperText type="info" visible={true} style={styles.helperText}>
          Loading {selectedAsset} addresses...
        </HelperText>
      )}
      
      {error && (
        <HelperText type="error" visible={true} style={styles.helperText}>
          {error}
        </HelperText>
      )}
    </View>
  );
};

let styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    zIndex: 4000,
    elevation: 4000
  },
  label: {
    fontSize: normaliseFont(14),
    fontWeight: '600',
    color: colors.darkGray,
    marginBottom: 8
  },
  dropdown: {
    backgroundColor: colors.white,
    borderColor: colors.lightGray,
    borderWidth: 1,
    borderRadius: 4,
    minHeight: 48,
    zIndex: 4000
  },
  dropdownContainer: {
    backgroundColor: colors.white,
    borderColor: colors.lightGray,
    borderWidth: 1,
    borderRadius: 4,
    elevation: 10,
    zIndex: 4000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    maxHeight: 250
  },
  dropdownText: {
    fontSize: normaliseFont(14),
    color: colors.darkGray
  },
  placeholderText: {
    fontSize: normaliseFont(14),
    color: colors.mediumGray
  },
  helperText: {
    fontSize: normaliseFont(12),
    marginTop: 4
  }
});

export default AddressBookPicker;
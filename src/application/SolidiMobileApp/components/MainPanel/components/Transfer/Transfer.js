// TextEncoder polyfill for React Native
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = class TextEncoder {
    encode(str) {
      const utf8 = [];
      for (let i = 0; i < str.length; i++) {
        let charcode = str.charCodeAt(i);
        if (charcode < 0x80) utf8.push(charcode);
        else if (charcode < 0x800) {
          utf8.push(0xc0 | (charcode >> 6), 
                    0x80 | (charcode & 0x3f));
        }
        else if (charcode < 0xd800 || charcode >= 0xe000) {
          utf8.push(0xe0 | (charcode >> 12), 
                    0x80 | ((charcode>>6) & 0x3f), 
                    0x80 | (charcode & 0x3f));
        }
        else {
          i++;
          charcode = 0x10000 + (((charcode & 0x3ff)<<10)
                              | (str.charCodeAt(i) & 0x3ff));
          utf8.push(0xf0 | (charcode >>18), 
                    0x80 | ((charcode>>12) & 0x3f), 
                    0x80 | ((charcode>>6) & 0x3f), 
                    0x80 | (charcode & 0x3f));
        }
      }
      return new Uint8Array(utf8);
    }
  };
}

// React imports
import React, { useContext, useEffect, useState } from 'react';
import { Image, StyleSheet, View, ScrollView } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import QRCode from 'react-native-qrcode-svg';
import Clipboard from '@react-native-clipboard/clipboard';

// Material Design imports
import {
  Text,
  Card,
  Button,
  TextInput,
  useTheme,
  SegmentedButtons,
  Surface,
  HelperText,
} from 'react-native-paper';

// Other imports
import _ from 'lodash';

// Internal imports
import AppStateContext from 'src/application/data';
import { colors, sharedStyles, sharedColors } from 'src/constants';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import { TransferUtils, transferDataModel } from './TransferDataModel';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('Transfer');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);

let Transfer = () => {
  let appState = useContext(AppStateContext);
  let materialTheme = useTheme();
  let [renderCount, triggerRender] = useState(0);
  let stateChangeID = appState?.stateChangeID || 0;

  // Transfer type state - 'send' or 'receive'
  const [transferType, setTransferType] = useState('send');

  // Asset selection state with safe defaults
  let [selectedAsset, setSelectedAsset] = useState('BTC');
  let [open, setOpen] = useState(false);
  let [items, setItems] = useState([
    { label: 'Bitcoin (BTC)', value: 'BTC' },
    { label: 'Ethereum (ETH)', value: 'ETH' },
    { label: 'British Pound (GBP)', value: 'GBP' },
  ]);

  // Send form state
  let [sendAmount, setSendAmount] = useState('');
  let [recipientAddress, setRecipientAddress] = useState('');
  let [errorMessage, setErrorMessage] = useState('');
  let [isLoading, setIsLoading] = useState(false);
  let [componentError, setComponentError] = useState(null);

  // Error boundary effect
  useEffect(() => {
    const handleError = (error) => {
      log('Component error caught:', error);
      setComponentError(error.message || 'An error occurred');
    };
    
    // Reset component error when transfer type changes
    setComponentError(null);
  }, [transferType, selectedAsset]);

  // Function that derives dropdown properties from an asset list with safe fallbacks
  let deriveAssetItems = (assetList) => {
    try {
      if (!assetList || !Array.isArray(assetList) || assetList.length === 0) {
        log('Asset list is empty or invalid, using fallback');
        return transferDataModel.generateSendAssetItems();
      }

      return assetList.map((asset) => {
        try {
          let displayInfo = transferDataModel.getAssetDisplayInfo(asset);
          let displayString = displayInfo.label;
          
          // Try to get asset icon from appState, but don't fail if it doesn't work
          let assetIcon = null;
          try {
            if (appState?.getAssetIcon) {
              assetIcon = appState.getAssetIcon(asset);
            }
          } catch (iconError) {
            log('Error getting asset icon for', asset, ':', iconError);
          }
          
          // Try to get additional info from appState
          try {
            if (appState?.getAssetInfo) {
              let info = appState.getAssetInfo(asset);
              if (info?.displayString) {
                displayString = info.displayString;
              }
            }
          } catch (infoError) {
            log('Error getting asset info for', asset, ':', infoError);
          }
          
          let assetItem = {
            label: displayString,
            value: asset,
          };
          
          // Only add icon if we successfully got one
          if (assetIcon) {
            assetItem.icon = () => {
              try {
                return (
                  <Image 
                    source={assetIcon} 
                    style={{
                      width: scaledWidth(27),
                      height: scaledHeight(27),
                      resizeMode: 'contain',
                    }}
                  />
                );
              } catch (renderError) {
                log('Error rendering icon for', asset, ':', renderError);
                return null;
              }
            };
          }
          
          return assetItem;
        } catch (error) {
          log('Error processing asset item:', asset, error);
          // Return safe fallback for this asset
          let displayInfo = transferDataModel.getAssetDisplayInfo(asset);
          return {
            label: displayInfo.label,
            value: displayInfo.value,
          };
        }
      });
    } catch (error) {
      log('Error in deriveAssetItems:', error);
      return transferDataModel.generateSendAssetItems();
    }
  }

  // Generate asset items for dropdowns with enhanced error handling
  let generateSendAssetItems = () => { 
    try {
      // Try to get assets from appState first
      if (appState?.getAssets) {
        let withdrawalAssets = appState.getAssets({withdrawalEnabled: true});
        if (withdrawalAssets && withdrawalAssets.length > 0) {
          log('Using appState withdrawal assets:', withdrawalAssets);
          return deriveAssetItems(withdrawalAssets);
        }
      }
      
      // Fallback to data model
      log('Using fallback withdrawal assets from data model');
      return TransferUtils.generateSendItems();
    } catch (error) {
      log('Error generating send assets, using safe fallback:', error);
      return TransferUtils.generateSendItems();
    }
  }

  let generateReceiveAssetItems = () => { 
    try {
      // Try to get assets from appState first
      if (appState?.getAssets) {
        let depositAssets = appState.getAssets({depositEnabled: true});
        if (depositAssets && depositAssets.length > 0) {
          log('Using appState deposit assets:', depositAssets);
          return deriveAssetItems(depositAssets);
        }
      }
      
      // Fallback to data model
      log('Using fallback deposit assets from data model');
      return TransferUtils.generateReceiveItems();
    } catch (error) {
      log('Error generating receive assets, using safe fallback:', error);
      return TransferUtils.generateReceiveItems();
    }
  }

  // Initial setup
  useEffect(() => {
    setup();
  }, []);

  // Enhanced setup with better error handling and state management
  let setup = () => {
    try {
      log('Setting up Transfer component, transferType:', transferType);
      
      // Close dropdown during setup to prevent conflicts
      setOpen(false);
      
      let newItems;
      if (transferType === 'send') {
        newItems = generateSendAssetItems();
      } else {
        newItems = generateReceiveAssetItems();
      }
      
      log('Generated items:', newItems?.length || 0);
      
      if (!newItems || newItems.length === 0) {
        log('No items generated, using emergency fallback');
        newItems = [
          { label: 'Bitcoin (BTC)', value: 'BTC' },
          { label: 'Ethereum (ETH)', value: 'ETH' },
          { label: 'British Pound (GBP)', value: 'GBP' },
        ];
      }
      
      // Clear any existing error messages
      setErrorMessage('');
      
      // Update items first
      setItems(newItems);
      
      // Then validate and update selected asset
      setTimeout(() => {
        try {
          if (!selectedAsset || !newItems.some(item => item.value === selectedAsset)) {
            log('Selected asset not in items, setting to first available');
            const firstAsset = newItems[0]?.value || 'BTC';
            setSelectedAsset(firstAsset);
            log('Set selected asset to:', firstAsset);
          } else {
            log('Selected asset', selectedAsset, 'is valid');
          }
        } catch (validationError) {
          log('Error validating selected asset:', validationError);
          setSelectedAsset('BTC');
        }
      }, 100);
      
    } catch (error) {
      log('Setup error:', error);
      // Emergency fallback
      setOpen(false);
      setErrorMessage('');
      setItems([
        { label: 'Bitcoin (BTC)', value: 'BTC' },
        { label: 'Ethereum (ETH)', value: 'ETH' },
        { label: 'British Pound (GBP)', value: 'GBP' },
      ]);
      setSelectedAsset('BTC');
    }
  }

  // Update items when transfer type changes with debounce
  useEffect(() => {
    log('Transfer type changed to:', transferType);
    
    // Use timeout to debounce rapid changes
    const timer = setTimeout(() => {
      try {
        setup();
      } catch (error) {
        log('Error in transfer type change effect:', error);
      }
    }, 150);
    
    return () => {
      clearTimeout(timer);
    };
  }, [transferType]);

  // Enhanced send transaction handler with validation
  let handleSend = async () => {
    try {
      setErrorMessage('');
      
      // Validate amount using data model
      const validation = TransferUtils.validateAmount(selectedAsset, sendAmount);
      if (!validation.valid) {
        setErrorMessage(validation.error);
        return;
      }
      
      if (!recipientAddress.trim()) {
        setErrorMessage('Please enter recipient address');
        return;
      }

      // Get asset capabilities for additional validation
      const capabilities = transferDataModel.getAssetCapabilities(selectedAsset);
      if (!capabilities.withdrawalEnabled) {
        setErrorMessage(`${selectedAsset} withdrawals are not currently available`);
        return;
      }

      log('Processing send:', {
        asset: selectedAsset,
        amount: sendAmount,
        recipient: recipientAddress,
        capabilities: capabilities
      });
      
      // Here you would integrate with the actual send functionality
      alert(`Send ${sendAmount} ${selectedAsset} to ${recipientAddress.substring(0, 10)}...`);
      
      // Clear form on successful send
      setSendAmount('');
      setRecipientAddress('');
      
    } catch (error) {
      log('Send error:', error);
      setErrorMessage('Failed to process send transaction. Please try again.');
    }
  }

  // Enhanced receive address getter with robust fallbacks
  let getReceiveAddress = () => {
    try {
      log('Getting receive address for asset:', selectedAsset);
      
      // Try to get the actual deposit address from appState
      if (appState?.getDepositAddress) {
        try {
          const address = appState.getDepositAddress(selectedAsset);
          if (address && address !== 'undefined' && address !== 'null') {
            log('Got deposit address from appState:', address);
            return address;
          }
        } catch (error) {
          log('Error getting deposit address from appState:', error);
        }
      }
      
      // Fallback to data model
      const fallbackAddress = TransferUtils.getDepositAddress(selectedAsset);
      log('Using fallback address:', fallbackAddress);
      return fallbackAddress;
      
    } catch (error) {
      log('Error getting receive address:', error);
      return `demo-${(selectedAsset || 'btc').toLowerCase()}-address-12345`;
    }
  }

  // Enhanced clipboard copy with error handling
  let copyToClipboard = (text) => {
    try {
      if (!text || text === 'undefined' || text === 'null') {
        alert('No address available to copy');
        return;
      }
      
      Clipboard.setString(text);
      alert('Address copied to clipboard!');
      log('Copied to clipboard:', text.substring(0, 10) + '...');
    } catch (error) {
      log('Error copying to clipboard:', error);
      alert('Failed to copy address to clipboard');
    }
  }

  // If there's a component error, show error screen
  if (componentError) {
    return (
      <View style={[sharedStyles.container, { backgroundColor: sharedColors.background }]}>
        <View style={{ padding: 20, justifyContent: 'center', alignItems: 'center', flex: 1 }}>
          <Text variant="headlineSmall" style={{ marginBottom: 16, textAlign: 'center', color: '#F44336' }}>
            Transfer Error
          </Text>
          <Text variant="bodyMedium" style={{ marginBottom: 20, textAlign: 'center', color: '#666' }}>
            {componentError}
          </Text>
          <Button 
            mode="contained" 
            onPress={() => {
              setComponentError(null);
              setSelectedAsset('BTC');
              setTransferType('send');
              setup();
            }}
          >
            Reset Transfer
          </Button>
        </View>
      </View>
    );
  }

  try {
    return (
      <View style={[sharedStyles.container, { backgroundColor: sharedColors.background }]}>
        
        <KeyboardAwareScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16 }}
          keyboardShouldPersistTaps='handled'
        >
        
        {/* Transfer Type Selector */}
        <SegmentedButtons
          value={transferType}
          onValueChange={setTransferType}
          buttons={[
            {
              value: 'send',
              label: 'Send',
              icon: 'upload',
              style: transferType === 'send' ? { backgroundColor: '#1565C0' } : {},
              labelStyle: transferType === 'send' ? { color: 'white' } : {}
            },
            {
              value: 'receive',
              label: 'Receive', 
              icon: 'download',
              style: transferType === 'receive' ? { backgroundColor: '#4CAF50' } : {},
              labelStyle: transferType === 'receive' ? { color: 'white' } : {}
            },
          ]}
          style={{ marginBottom: 16 }}
        />

        {/* Asset Selection with Enhanced Error Handling */}
        <View style={{ zIndex: 5000, elevation: 10 }}>
          <Card style={{ marginBottom: 16, elevation: 4 }}>
            <Card.Content style={{ padding: 20 }}>
              <Text variant="titleMedium" style={{ marginBottom: 16, fontWeight: '600' }}>
                Select Asset
              </Text>
              
              {(() => {
                try {
                  // Validate that we have valid items and selectedAsset
                  if (!items || items.length === 0) {
                    return (
                      <View style={{ padding: 20, alignItems: 'center' }}>
                        <Text variant="bodyMedium" style={{ color: '#666' }}>
                          Loading assets...
                        </Text>
                      </View>
                    );
                  }
                  
                  if (!selectedAsset || !items.some(item => item.value === selectedAsset)) {
                    return (
                      <View style={{ padding: 20, alignItems: 'center' }}>
                        <Text variant="bodyMedium" style={{ color: '#F44336', marginBottom: 16 }}>
                          Asset selection error
                        </Text>
                        <Button mode="outlined" onPress={() => setup()}>
                          Reload Assets
                        </Button>
                      </View>
                    );
                  }
                  
                  return (
                    <DropDownPicker
                      open={open}
                      value={selectedAsset}
                      items={items}
                      setOpen={setOpen}
                      setValue={(callback) => {
                        try {
                          log('DropDownPicker setValue called');
                          if (typeof callback === 'function') {
                            const newValue = callback(selectedAsset);
                            log('Setting new asset value:', newValue);
                            setSelectedAsset(newValue);
                          } else {
                            log('Setting asset value directly:', callback);
                            setSelectedAsset(callback);
                          }
                          // Clear any errors when asset changes
                          setErrorMessage('');
                        } catch (error) {
                          log('Error in setValue:', error);
                          setErrorMessage('Error selecting asset');
                        }
                      }}
                      setItems={setItems}
                      placeholder="Choose asset"
                      style={{ 
                        borderColor: materialTheme?.colors?.outline || '#ccc',
                        backgroundColor: 'white'
                      }}
                      dropDownContainerStyle={{ 
                        borderColor: materialTheme?.colors?.outline || '#ccc',
                        elevation: 10,
                        zIndex: 5000,
                        backgroundColor: 'white'
                      }}
                      textStyle={{
                        fontSize: 16,
                        color: '#333'
                      }}
                      labelStyle={{
                        fontSize: 16,
                        color: '#333'
                      }}
                      zIndex={5000}
                      zIndexInverse={1000}
                      listMode="SCROLLVIEW"
                      scrollViewProps={{
                        nestedScrollEnabled: true
                      }}
                      onSelectItem={(item) => {
                        try {
                          log('Asset selected:', item);
                          setErrorMessage('');
                        } catch (error) {
                          log('Error in onSelectItem:', error);
                        }
                      }}
                    />
                  );
                } catch (dropdownError) {
                  log('Dropdown render error:', dropdownError);
                  return (
                    <View style={{ padding: 20, alignItems: 'center' }}>
                      <Text variant="bodyMedium" style={{ color: '#F44336', marginBottom: 16 }}>
                        Asset dropdown unavailable
                      </Text>
                      <Button mode="outlined" onPress={() => setup()}>
                        Reset
                      </Button>
                    </View>
                  );
                }
              })()}
            </Card.Content>
          </Card>
        </View>

        {/* Send Form */}
        {transferType === 'send' && (
          <Card style={{ marginBottom: 16, elevation: 1, zIndex: 100 }}>
            <Card.Content style={{ padding: 20 }}>
              <Text variant="titleMedium" style={{ marginBottom: 16, fontWeight: '600' }}>
                Send {selectedAsset}
              </Text>
              
              <TextInput
                label="Amount"
                mode="outlined"
                value={sendAmount}
                onChangeText={setSendAmount}
                placeholder="0.00"
                keyboardType="numeric"
                style={{ marginBottom: 16 }}
              />
              
              <TextInput
                label="Recipient Address"
                mode="outlined"
                value={recipientAddress}
                onChangeText={setRecipientAddress}
                placeholder={`Enter ${selectedAsset} address`}
                style={{ marginBottom: 16 }}
                multiline={selectedAsset === 'BTC' || selectedAsset === 'ETH'}
              />
              
              {errorMessage ? (
                <HelperText type="error" visible={!!errorMessage} style={{ marginBottom: 16 }}>
                  {errorMessage}
                </HelperText>
              ) : null}
              
              <Button 
                mode="contained" 
                onPress={handleSend}
                style={{ 
                  marginTop: 8,
                  backgroundColor: '#1565C0'
                }}
                contentStyle={{ paddingVertical: 8 }}
              >
                Send {selectedAsset}
              </Button>
            </Card.Content>
          </Card>
        )}

        {/* Receive Form */}
        {transferType === 'receive' && (
          <Card style={{ marginBottom: 16, elevation: 1, zIndex: 100 }}>
            <Card.Content style={{ padding: 20 }}>
              <Text variant="titleMedium" style={{ marginBottom: 16, fontWeight: '600' }}>
                Receive {selectedAsset}
              </Text>
              
              {/* Enhanced QR Code with better error handling */}
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <Surface style={{ 
                  padding: 16, 
                  borderRadius: 12, 
                  backgroundColor: 'white',
                  elevation: 1 
                }}>
                  {(() => {
                    try {
                      const address = getReceiveAddress();
                      
                      // Validate address before generating QR code
                      if (!address || address === 'undefined' || address === 'null' || address.length < 5) {
                        throw new Error('Invalid address');
                      }
                      
                      return (
                        <QRCode
                          value={address}
                          size={scaledWidth(160)}
                          backgroundColor="white"
                          color="black"
                          logoSize={30}
                          logoBackgroundColor='transparent'
                        />
                      );
                    } catch (error) {
                      log('QR Code generation error:', error);
                      return (
                        <View style={{
                          width: scaledWidth(160),
                          height: scaledWidth(160),
                          backgroundColor: '#f0f0f0',
                          justifyContent: 'center',
                          alignItems: 'center',
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: '#ddd',
                        }}>
                          <Text variant="bodySmall" style={{ color: '#666', textAlign: 'center', marginBottom: 8 }}>
                            QR Code
                          </Text>
                          <Text variant="bodySmall" style={{ color: '#666', textAlign: 'center' }}>
                            Address Loading...
                          </Text>
                        </View>
                      );
                    }
                  })()}
                </Surface>
              </View>
              
              {/* Enhanced Address Display */}
              <Text variant="bodyMedium" style={{ marginBottom: 8, fontWeight: '500' }}>
                Your {selectedAsset} Address:
              </Text>
              
              <Surface style={{ 
                padding: 16, 
                borderRadius: 8, 
                backgroundColor: '#f8f9fa',
                marginBottom: 16,
                minHeight: 60,
                justifyContent: 'center',
              }}>
                {(() => {
                  try {
                    const address = getReceiveAddress();
                    
                    if (!address || address === 'undefined' || address === 'null') {
                      return (
                        <Text variant="bodyMedium" style={{ 
                          color: '#666',
                          textAlign: 'center',
                          fontStyle: 'italic'
                        }}>
                          Loading address...
                        </Text>
                      );
                    }
                    
                    return (
                      <Text variant="bodyMedium" style={{ 
                        fontFamily: 'monospace',
                        fontSize: normaliseFont(14),
                        lineHeight: 20,
                        textAlign: 'center',
                        color: '#333'
                      }}>
                        {address}
                      </Text>
                    );
                  } catch (error) {
                    log('Error displaying address:', error);
                    return (
                      <Text variant="bodyMedium" style={{ 
                        color: '#999',
                        textAlign: 'center',
                        fontStyle: 'italic'
                      }}>
                        Address unavailable
                      </Text>
                    );
                  }
                })()}
              </Surface>
              
              <Button 
                mode="outlined" 
                onPress={() => {
                  const address = getReceiveAddress();
                  copyToClipboard(address);
                }}
                icon="content-copy"
                style={{ marginTop: 8 }}
                contentStyle={{ paddingVertical: 4 }}
                disabled={(() => {
                  try {
                    const address = getReceiveAddress();
                    return !address || address === 'undefined' || address === 'null' || address.includes('loading') || address.includes('unavailable');
                  } catch (error) {
                    return true;
                  }
                })()}
              >
                {(() => {
                  try {
                    const address = getReceiveAddress();
                    if (!address || address === 'undefined' || address === 'null' || address.includes('loading')) {
                      return 'Address Loading...';
                    }
                    if (address.includes('unavailable')) {
                      return 'Address Unavailable';
                    }
                    return 'Copy Address';
                  } catch (error) {
                    return 'Copy Address';
                  }
                })()}
              </Button>
            </Card.Content>
          </Card>
        )}

      </KeyboardAwareScrollView>
    </View>
  );
  
  } catch (renderError) {
    log('Transfer component render error:', renderError);
    
    // Return emergency fallback UI
    return (
      <View style={[sharedStyles.container, { backgroundColor: sharedColors.background }]}>
        <View style={{ padding: 20, justifyContent: 'center', alignItems: 'center', flex: 1 }}>
          <Text variant="headlineSmall" style={{ marginBottom: 16, textAlign: 'center', color: '#F44336' }}>
            Transfer Unavailable
          </Text>
          <Text variant="bodyMedium" style={{ marginBottom: 20, textAlign: 'center', color: '#666' }}>
            The transfer feature is temporarily unavailable. Please try again later.
          </Text>
          <Button 
            mode="contained" 
            onPress={() => {
              try {
                setComponentError(null);
                setSelectedAsset('BTC');
                setTransferType('send');
                setErrorMessage('');
                setup();
              } catch (error) {
                log('Error in retry:', error);
              }
            }}
          >
            Try Again
          </Button>
        </View>
      </View>
    );
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
});

export default Transfer;
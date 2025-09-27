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

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('Transfer');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);

let Transfer = () => {
  let appState = useContext(AppStateContext);
  let materialTheme = useTheme();
  let [renderCount, triggerRender] = useState(0);
  let stateChangeID = appState.stateChangeID;

  // Transfer type state - 'send' or 'receive'
  const [transferType, setTransferType] = useState('send');

  // Asset selection state
  let [selectedAsset, setSelectedAsset] = useState('BTC');
  let [open, setOpen] = useState(false);
  let [items, setItems] = useState([]);

  // Send form state
  let [sendAmount, setSendAmount] = useState('');
  let [recipientAddress, setRecipientAddress] = useState('');
  let [errorMessage, setErrorMessage] = useState('');

  // Function that derives dropdown properties from an asset list
  let deriveAssetItems = (assetList) => {
    return assetList.map((asset) => {
      let assetIcon = appState.getAssetIcon(asset);
      let info = appState.getAssetInfo(asset);
      let displayString = info ? info.displayString : asset;
      let assetItem = {
        label: displayString,
        value: asset,
        icon: () => <Image source={assetIcon} style={{
            width: scaledWidth(27),
            height: scaledHeight(27),
            resizeMode: 'contain',
          }}
        />,
      }
      return assetItem;
    });
  }

  // Generate asset items for dropdowns
  let generateSendAssetItems = () => { 
    try {
      return deriveAssetItems(appState.getAssets({withdrawalEnabled: true}));
    } catch (error) {
      console.log('Error generating send assets:', error);
      return [
        { label: 'Bitcoin', value: 'BTC' },
        { label: 'Ethereum', value: 'ETH' },
        { label: 'British Pound', value: 'GBP' },
      ];
    }
  }

  let generateReceiveAssetItems = () => { 
    try {
      return deriveAssetItems(appState.getAssets({depositEnabled: true}));
    } catch (error) {
      console.log('Error generating receive assets:', error);
      return [
        { label: 'Bitcoin', value: 'BTC' },
        { label: 'Ethereum', value: 'ETH' },
        { label: 'British Pound', value: 'GBP' },
      ];
    }
  }

  // Initial setup
  useEffect(() => {
    setup();
  }, []);

  let setup = () => {
    try {
      if (transferType === 'send') {
        setItems(generateSendAssetItems());
      } else {
        setItems(generateReceiveAssetItems());
      }
    } catch (error) {
      console.log('Setup error:', error);
      setItems([{ label: 'Bitcoin', value: 'BTC' }]);
    }
  }

  // Update items when transfer type changes
  useEffect(() => {
    setup();
  }, [transferType]);

  // Handle send transaction
  let handleSend = async () => {
    try {
      setErrorMessage('');
      
      if (!sendAmount || parseFloat(sendAmount) <= 0) {
        setErrorMessage('Please enter a valid amount');
        return;
      }
      
      if (!recipientAddress.trim()) {
        setErrorMessage('Please enter recipient address');
        return;
      }

      console.log('Processing send:', {
        asset: selectedAsset,
        amount: sendAmount,
        recipient: recipientAddress
      });
      
      // Here you would integrate with the actual send functionality
      alert('Send functionality would be implemented here');
      
    } catch (error) {
      console.log('Send error:', error);
      setErrorMessage('Failed to process send transaction');
    }
  }

  // Get receive address for selected asset
  let getReceiveAddress = () => {
    try {
      // Try to get the actual deposit address
      if (appState && appState.getDepositAddress) {
        return appState.getDepositAddress(selectedAsset) || `${selectedAsset} address loading...`;
      }
      // Fallback address format for demo
      return `demo-${selectedAsset.toLowerCase()}-address-12345`;
    } catch (error) {
      console.log('Error getting receive address:', error);
      return `demo-${selectedAsset.toLowerCase()}-address-12345`;
    }
  }

  // Copy address to clipboard
  let copyToClipboard = (text) => {
    Clipboard.setString(text);
    alert('Address copied to clipboard!');
  }

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

        {/* Asset Selection */}
        <View style={{ zIndex: 5000, elevation: 10 }}>
          <Card style={{ marginBottom: 16, elevation: 4 }}>
            <Card.Content style={{ padding: 20 }}>
              <Text variant="titleMedium" style={{ marginBottom: 16, fontWeight: '600' }}>
                Select Asset
              </Text>
              
              <DropDownPicker
                open={open}
                value={selectedAsset}
                items={items}
                setOpen={setOpen}
                setValue={setSelectedAsset}
                setItems={setItems}
                placeholder="Choose asset"
                style={{ borderColor: materialTheme.colors.outline }}
                dropDownContainerStyle={{ 
                  borderColor: materialTheme.colors.outline,
                  elevation: 10,
                  zIndex: 5000
                }}
                zIndex={5000}
                zIndexInverse={1000}
              />
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
              
              {/* QR Code */}
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <Surface style={{ 
                  padding: 16, 
                  borderRadius: 12, 
                  backgroundColor: 'white',
                  elevation: 1 
                }}>
                  {(() => {
                    try {
                      return (
                        <QRCode
                          value={getReceiveAddress()}
                          size={scaledWidth(160)}
                          backgroundColor="white"
                          color="black"
                        />
                      );
                    } catch (error) {
                      console.log('QR Code error:', error);
                      return (
                        <View style={{
                          width: scaledWidth(160),
                          height: scaledWidth(160),
                          backgroundColor: '#f0f0f0',
                          justifyContent: 'center',
                          alignItems: 'center',
                          borderRadius: 8,
                        }}>
                          <Text variant="bodySmall" style={{ color: '#666', textAlign: 'center' }}>
                            QR Code{'\n'}Loading...
                          </Text>
                        </View>
                      );
                    }
                  })()}
                </Surface>
              </View>
              
              {/* Address Display */}
              <Text variant="bodyMedium" style={{ marginBottom: 8, fontWeight: '500' }}>
                Your {selectedAsset} Address:
              </Text>
              
              <Surface style={{ 
                padding: 16, 
                borderRadius: 8, 
                backgroundColor: '#f8f9fa',
                marginBottom: 16 
              }}>
                <Text variant="bodyMedium" style={{ 
                  fontFamily: 'monospace',
                  fontSize: normaliseFont(14),
                  lineHeight: 20,
                  textAlign: 'center'
                }}>
                  {getReceiveAddress()}
                </Text>
              </Surface>
              
              <Button 
                mode="outlined" 
                onPress={() => copyToClipboard(getReceiveAddress())}
                icon="content-copy"
                style={{ marginTop: 8 }}
                contentStyle={{ paddingVertical: 4 }}
              >
                Copy Address
              </Button>
            </Card.Content>
          </Card>
        )}

      </KeyboardAwareScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
});

export default Transfer;
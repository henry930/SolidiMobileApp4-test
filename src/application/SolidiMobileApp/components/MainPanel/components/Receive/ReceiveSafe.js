// React imports
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, View, ScrollView } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import Clipboard from '@react-native-clipboard/clipboard';
import QRCode from 'react-native-qrcode-svg';

// Material Design imports
import {
  Card,
  Text,
  useTheme,
  Surface,
  Avatar,
  Divider,
} from 'react-native-paper';

// Other imports
import _ from 'lodash';
import Big from 'big.js';

// Internal imports
import AppStateContext from 'src/application/data';
import { colors, sharedStyles, sharedColors } from 'src/constants';
import { 
  colors as newColors, 
  layoutStyles, 
  textStyles, 
  cardStyles, 
  formStyles,
  receiveStyles 
} from 'src/styles';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import { Button, StandardButton, ImageButton, Spinner, FixedWidthButton } from 'src/components/atomic';
import { Title } from 'src/components/shared';
import misc from 'src/util/misc';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('ReceiveSafe');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);

const ReceiveSafe = ({ navigation, route }) => {
  const appState = useContext(AppStateContext);
  const theme = useTheme();

  // Safety check for appState context
  if (!appState) {
    return (
      <View style={styles.errorContainer}>
        <Card style={styles.errorCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.errorTitle}>
              Receive Feature Unavailable
            </Text>
            <Text style={styles.errorText}>
              The application context is not available in modal view.
              {'\n\n'}
              Please navigate to the Receive page through the main navigation to access this feature.
            </Text>
          </Card.Content>
        </Card>
      </View>
    );
  }

  // Safe asset items generation with fallbacks
  const generateSafeAssetItems = () => {
    try {
      if (!appState.getAssets) {
        return [{
          label: 'Bitcoin',
          value: 'BTC',
          icon: () => <Text>₿</Text>
        }];
      }

      const assets = appState.getAssets({depositEnabled: true});
      if (!assets || assets.length === 0) {
        return [{
          label: 'Bitcoin',
          value: 'BTC',
          icon: () => <Text>₿</Text>
        }];
      }

      return assets.map(asset => {
        try {
          const info = appState.getAssetInfo(asset);
          const assetIcon = appState.getAssetIcon(asset);
          return {
            label: info?.displayString || asset,
            value: info?.displaySymbol || asset,
            icon: assetIcon ? () => <Image source={assetIcon} style={{
                width: scaledWidth(27),
                height: scaledHeight(27),
                resizeMode: 'contain',
              }} /> : () => <Text>🪙</Text>
          };
        } catch (err) {
          console.log('Asset item generation error:', err);
          return {
            label: asset,
            value: asset,
            icon: () => <Text>🪙</Text>
          };
        }
      });
    } catch (err) {
      console.log('Safe asset items generation error:', err);
      return [{
        label: 'Bitcoin',
        value: 'BTC',
        icon: () => <Text>₿</Text>
      }];
    }
  };

  // State with safe initialization
  const [openCA, setOpenCA] = useState(false);
  const [assetCA, setAssetCA] = useState('BTC');
  const [itemsCA, setItemsCA] = useState(generateSafeAssetItems());
  const [cryptoTxnsEnabled, setCryptoTxnsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const setup = async () => {
      try {
        setIsLoading(true);
        
        // Safe setup with error handling
        if (appState.generalSetup) {
          await appState.generalSetup({caller: 'ReceiveSafe'});
        }
        
        const safeItems = generateSafeAssetItems();
        setItemsCA(safeItems);
        
        if (safeItems.length > 0) {
          setAssetCA(safeItems[0].value);
        }
        
        setIsLoading(false);
      } catch (err) {
        console.log('ReceiveSafe setup error:', err);
        setIsLoading(false);
      }
    };

    setup();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Spinner />
        <Text style={styles.loadingText}>Loading receive options...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Title title="Receive" />
        
        {/* Asset Selection Card */}
        <Card style={styles.inputCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>I want to receive:</Text>
            <View style={styles.dropdownContainer}>
              <DropDownPicker
                listMode="MODAL"
                searchable={false}
                placeholder="Select asset"
                style={styles.chosenAssetDropdown}
                containerStyle={styles.chosenAssetDropdownContainer}
                open={openCA}
                value={assetCA}
                items={itemsCA || []}
                setOpen={setOpenCA}
                setValue={setAssetCA}
                setItems={setItemsCA}
                maxHeight={scaledHeight(300)}
                textStyle={styles.dropdownText}
                onSelectItem={(item) => {
                  console.log('Selected asset:', item);
                }}
              />
            </View>
          </Card.Content>
        </Card>

        {/* Placeholder for deposit details */}
        <Card style={styles.detailsCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Deposit Details for {assetCA}
            </Text>
            <Text style={styles.modalText}>
              Deposit functionality is being optimized for modal view.
              {'\n\n'}
              For full deposit address generation and QR codes, please use the main Receive page through the navigation menu.
            </Text>
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  errorCard: {
    width: '100%',
    maxWidth: 400,
  },
  errorTitle: {
    textAlign: 'center',
    marginBottom: 16,
    color: '#d32f2f',
  },
  errorText: {
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    textAlign: 'center',
  },
  inputCard: {
    marginVertical: 8,
    elevation: 2,
  },
  detailsCard: {
    marginVertical: 8,
    elevation: 2,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: '600',
  },
  dropdownContainer: {
    zIndex: 1000,
  },
  chosenAssetDropdown: {
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
  },
  chosenAssetDropdownContainer: {
    marginBottom: 16,
  },
  dropdownText: {
    fontSize: 16,
  },
  modalText: {
    lineHeight: 20,
    textAlign: 'center',
  },
});

export default ReceiveSafe;
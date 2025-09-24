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
import misc from 'src/util/misc';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('Receive');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);


/* Notes

We refer to the asset (in the variable names etc) as the "chosen asset" (CA).

GBP deposit address comes with a user-specific "reference" e.g. 'SHMPQKC'.

*/




let Receive = () => {

  let appState = useContext(AppStateContext);
  let [renderCount, triggerRender] = useState(0);
  let firstRender = misc.useFirstRender();
  let stateChangeID = appState.stateChangeID;

  let pageName = appState.pageName;
  let permittedPageNames = 'default'.split(' ');

  // Don't check the pageName here - check below against the depositEnabled assets.
  // misc.confirmItemInArray('permittedPageNames', permittedPageNames, pageName, 'Receive');


  // Function that derives dropdown properties from an asset list.
  let deriveAssetItems = (assets) => {
    return assets.map(asset => {
      let info = appState.getAssetInfo(asset);
      let assetIcon = appState.getAssetIcon(asset);
      let assetItem = {
        label: info.displayString,
        value: info.displaySymbol,
        icon: () => <Image source={assetIcon} style={{
            width: scaledWidth(27),
            height: scaledHeight(27),
            resizeMode: misc.getFlatListIconResizeMode(),
          }}
        />,
      }
      return assetItem;
    });
  }
  let generateAssetItems = () => { return deriveAssetItems(appState.getAssets({depositEnabled: true})) }

  // Initial state:
  let selectedAssetCA = 'BTC';

  // Check if the pageName matches one of our assets and if so switch to that instead of the default asset.
  let possibleAssets = generateAssetItems();
  possibleAssets.forEach(item => {
    console.log(item.value);
    if(item.value == pageName) {
      selectedAssetCA = pageName
    }
  });

  // Dropdown state: Select asset
  // CA = Chosen Asset
  let [openCA, setOpenCA] = useState(false);
  let [assetCA, setAssetCA] = useState(selectedAssetCA);
  let [itemsCA, setItemsCA] = useState(generateAssetItems());
  let [cryptoTxnsEnabled, setCryptoTxnsEnabled] = useState(false);

  // Initial setup.
  useEffect( () => {
    setup();
  }, []); // Pass empty array so that this only runs once on mount.


  let setup = async () => {
    try {
      await appState.generalSetup({caller: 'Receive'});
      await appState.loadDepositDetailsForAsset(assetCA);

      // If the deposit address returns "idrequired" or we have disabled cryptoWithdraw for the
      // user, then don't display withdraw details and display error dialog
      let addressProperties = appState.getDepositDetailsForAsset(assetCA);
      if(("result" in addressProperties && addressProperties['result']=="idrequired") || appState.getUserStatus('cryptoWithdrawDisabled') ) {
        setCryptoTxnsEnabled(false);
      } else {
        setCryptoTxnsEnabled(true);
      }
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
      let assetItems = generateAssetItems();
      setItemsCA(assetItems);
      if (assetItems.length === 0) {
        let msg = 'Receive.setup: No assets with deposit enabled.';
        logger.error(msg);
        setAssetCA('[None]');
      }

      triggerRender(renderCount+1);
    } catch(err) {
      let msg = `Receive.setup: Error = ${err}`;
      console.log(msg);
    }
  }


  // When the user selects an asset from the dropdown, retrieve the relevant deposit details from the server, and then re-render.
  useEffect( () => {
    updateDepositDetails();
  }, [assetCA]);


  let updateDepositDetails = async () => {
    if (firstRender) return;
    try {
      log(`Set assetCA: ${assetCA}`);
      await appState.loadDepositDetailsForAsset(assetCA);
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
      triggerRender(renderCount+1);
    } catch(err) {
      let msg = `Receive.updateDepositDetails: Error = ${err}`;
      console.log(msg);
    }
  }


  let getDescriptionString = () => {
    let assetType = appState.getAssetInfo(assetCA).type;
    let destinationText = (assetType == 'crypto') ? 'Address' : 'Account';
    destinationText +=  ' details:';
    return destinationText;
  }


  let copyToClipboard = async (x) => {
    Clipboard.setString(x);
    /* For testing */
    /*
    let text = await Clipboard.getString();
    log(`Copy text to clipboard: ${text}`);
    */
  }


  let getDepositDetails = () => {
    /* Build section that includes:
    - Address / account details
    - QR code (for crypto addresses)
    */
    let assetType = appState.getAssetInfo(assetCA).type;
    let accountString = (assetType == 'crypto') ? 'address' : 'account';
    let assetString = appState.getAssetInfo(assetCA).displayString;
    let addressProperties = appState.getDepositDetailsForAsset(assetCA);
    if (addressProperties == '[loading]') {
      return (
        <View style={styles.depositDetails}>
          <Spinner style={styles.spinner}/>
        </View>
      )
    }

    let addressKeys = _.keys(addressProperties);
    // Check for an error response.
    if (_.isEqual(addressKeys, ['error'])) {
      return (
        <View style={styles.depositDetails}>
          <View style={sharedStyles.center}>
            <Text style={styles.errorMessageText}>Error: Could not retrieve {accountString} details from server.{'\n'}</Text>
            <Button title="Tap here to contact us"
              onPress={ () => { appState.changeState('ContactUs') } }
              styles={styleContactUsButton}
            />
          </View>
        </View>
      )
    }

    return (
      <View>

        {assetType == 'crypto' &&
          <View style={styles.qrCodeSection}>
            <QRCode
              size={scaledWidth(150)}
              value={addressProperties.address}
            />
            <Text style={styles.qrCodeText}>
              Scan this QR code to deposit {assetString}
            </Text>
          </View>
        }

        { (! _.isUndefined(addressProperties.warningMessage)) &&
          <Surface style={sharedStyles.warningCard}>
            <Text style={sharedStyles.warningText}>{addressProperties.warningMessage}</Text>
          </Surface>
        }

        { (! _.isUndefined(addressProperties.infoMessage)) &&
          <Surface style={sharedStyles.infoCard}>
            <Text style={sharedStyles.infoText}>{addressProperties.infoMessage}</Text>
          </Surface>
        }

        { addressKeys.includes('address') &&
          <Surface style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailLabel}>Address:</Text>
              <ImageButton imageName='clone' imageType='icon'
                styles={styleCopyButton}
                onPress={ () => { copyToClipboard(addressProperties.address) } }
              />
            </View>
            <Text style={[styles.detailValue, styles.bold]}>{addressProperties.address}</Text>
          </Surface>
        }

        { addressKeys.includes('destinationTag') &&
          <Surface style={styles.detailCardOneLine}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailLabel}>Destination Tag:</Text>
              <ImageButton imageName='clone' imageType='icon'
                styles={styleCopyButton}
                onPress={ () => { copyToClipboard(addressProperties.destinationTag) } }
              />
            </View>
            <Text style={[styles.detailValue, styles.bold]}>{addressProperties.destinationTag}</Text>
          </Surface>
        }

        { addressKeys.includes('accountName') &&
          <Surface style={styles.detailCardOneLine}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailLabel}>Account Name:</Text>
              <ImageButton imageName='clone' imageType='icon'
                styles={styleCopyButton}
                onPress={ () => { copyToClipboard(addressProperties.accountName) } }
              />
            </View>
            <Text style={[styles.detailValue, styles.bold]}>{addressProperties.accountName}</Text>
          </Surface>
        }

        { addressKeys.includes('sortCode') &&
          <Surface style={styles.detailCardOneLine}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailLabel}>Sort Code:</Text>
              <ImageButton imageName='clone' imageType='icon'
                styles={styleCopyButton}
                onPress={ () => { copyToClipboard(addressProperties.sortCode) } }
              />
            </View>
            <Text style={[styles.detailValue, styles.bold]}>{addressProperties.sortCode}</Text>
          </Surface>
        }

        { addressKeys.includes('accountNumber') &&
          <Surface style={styles.detailCardOneLine}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailLabel}>Account Number:</Text>
              <ImageButton imageName='clone' imageType='icon'
                styles={styleCopyButton}
                onPress={ () => { copyToClipboard(addressProperties.accountNumber) } }
              />
            </View>
            <Text style={[styles.detailValue, styles.bold]}>{addressProperties.accountNumber}</Text>
          </Surface>
        }

        { addressKeys.includes('BIC') &&
          <Surface style={styles.detailCardOneLine}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailLabel}>BIC/SWIFT:</Text>
              <ImageButton imageName='clone' imageType='icon'
                styles={styleCopyButton}
                onPress={ () => { copyToClipboard(addressProperties.BIC) } }
              />
            </View>
            <Text style={[styles.detailValue, styles.bold]}>{addressProperties.BIC}</Text>
          </Surface>
        }

        { addressKeys.includes('IBAN') &&
          <Surface style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailLabel}>IBAN:</Text>
              <ImageButton imageName='clone' imageType='icon'
                styles={styleCopyButton}
                onPress={ () => { copyToClipboard(addressProperties.IBAN) } }
              />
            </View>
            <Text style={[styles.detailValue, styles.bold]}>{addressProperties.IBAN}</Text>
          </Surface>
        }

        { addressKeys.includes('reference') &&
          <Surface style={styles.detailCardOneLine}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailLabel}>Reference:</Text>
              <ImageButton imageName='clone' imageType='icon'
                styles={styleCopyButton}
                onPress={ () => { copyToClipboard(addressProperties.reference) } }
              />
            </View>
            <Text style={[styles.detailValue, styles.bold]}>{addressProperties.reference}</Text>
          </Surface>
        }

      </View>
    )

  }

  let assetType = appState.getAssetInfo(assetCA).type;

  function changeToGBP() {
    setAssetCA('GBP');
  }

  function goToIDCheck() {
    return appState.changeState('IdentityVerification');
  }

  return (
    <View style={[sharedStyles.container, { backgroundColor: sharedColors.background }]}>
      
      {/* Header Section - Full width design */}
      <View style={styles.headerSection}>
        {/* Header content with padding */}
        <View style={styles.headerContent}>
          {/* Page Title */}
          <View style={[sharedStyles.row, { marginBottom: 12 }]}>
            <Text variant="headlineSmall" style={[sharedStyles.headerTitle, { flex: 1 }]}>
              Receive Crypto
            </Text>
            <View style={styles.secureBadge}>
              <Text style={styles.secureText}>
                INSTANT
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Content Section */}
      <View style={styles.panelSubContainer}>

        <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={styles.scrollContent} >

          {/* Asset Selection Card */}
          <Card style={styles.inputCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>I want to receive:</Text>
              <View style={styles.dropdownContainer}>
                <DropDownPicker
                  listMode="MODAL"
                  searchable={true}
                  placeholder={appState.getAssetInfo(assetCA).displayString}
                  style={styles.chosenAssetDropdown}
                  containerStyle={styles.chosenAssetDropdownContainer}
                  open={openCA}
                  value={assetCA}
                  items={itemsCA}
                  setOpen={setOpenCA}
                  setValue={setAssetCA}
                  setItems={setItemsCA}
                  searchTextInputProps={{
                    maxLength: 15
                  }}
                  maxHeight={scaledHeight(300)}
                  textStyle={styles.dropdownText}
                />
              </View>
            </Card.Content>
          </Card>

          { (cryptoTxnsEnabled || (assetType != 'crypto')) && 
            <Card style={styles.detailsCard}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.sectionTitle}>{getDescriptionString()}</Text>
                {getDepositDetails()}
              </Card.Content>
            </Card>
          }

          { (!cryptoTxnsEnabled && (assetType == 'crypto')) && 
            <Card style={styles.upgradeCard}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.upgradeTitle}>Upgrade your account</Text>
                <Text variant="bodyMedium" style={styles.upgradeDescription}>
                  To enable crypto deposits you need to either deposit from your bank account or get ID verified.
                </Text>
                <View style={styles.upgradeActions}>
                  <FixedWidthButton title="Verify ID" onPress={goToIDCheck}/>
                  <FixedWidthButton title="Deposit GBP" onPress={changeToGBP} />
                </View>
              </Card.Content>
            </Card>
          }

        </ScrollView>

      </View>
    </View>
  )

}


let styles = StyleSheet.create({
  // Combine shared styles with component-specific styles
  ...sharedStyles,
  ...layoutStyles,
  ...cardStyles,
  ...receiveStyles,
  
  // Component-specific overrides
  panelSubContainer: {
    flex: 1,
    paddingTop: 12,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  inputCard: {
    ...sharedStyles.card,
    marginBottom: 8,
    marginHorizontal: 0,
  },
  detailsCard: {
    ...sharedStyles.card,   
    marginBottom: 8,
    marginHorizontal: 0,
  },
  upgradeCard: {
    ...sharedStyles.card,
    marginBottom: 8,
    marginHorizontal: 0,
    backgroundColor: sharedColors.warning,
  },
  sectionTitle: {
    ...sharedStyles.subtitleText,
    marginBottom: 16,
    fontWeight: 'bold',
  },
  upgradeTitle: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  upgradeDescription: {
    marginBottom: 16,
    lineHeight: 20,
  },
  upgradeActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 8,
  },
  dropdownContainer: {
    zIndex: 2,
  },
  dropdownText: {
    fontSize: normaliseFont(14),
  },
  chosenAssetDropdown: {
    height: scaledHeight(40),
  },
  chosenAssetDropdownContainer: {
    width: '100%',
  },
  bold: {
    fontWeight: 'bold',
  },
  errorMessageText: {
    fontSize: normaliseFont(14),
    fontWeight: 'bold',
    color: 'red',
  },
  scanMessage: {
    //borderWidth: 1, // testing
    marginTop: scaledHeight(10),
    alignItems: 'center',
  },
  scanMessageText: {
    fontSize: normaliseFont(14),
  },
  warningMessage: {
    //borderWidth: 1, // testing
    marginTop: scaledHeight(5),
    alignItems: 'center',
  },
  warningMessageText: {
    fontSize: normaliseFont(14),
    color: 'red',
  },
  infoMessage: {
    marginTop: scaledHeight(10),
    alignItems: 'center',
  },
  infoMessageText: {
    fontSize: normaliseFont(14),
    fontWeight: 'bold',
  },
  detailWrapper: {
    marginTop: scaledHeight(10),
    paddingVertical: scaledHeight(10),
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
  },
  detailWrapperOneLine: {
    paddingHorizontal: scaledHeight(15),
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detail: {
    //borderWidth: 1, // testing
    maxWidth: '80%',
  },
  detailText: {
    fontSize: normaliseFont(16),
  },
  buttonWrapper: {
    marginTop: scaledHeight(20),
    marginLeft: '25%',
    width: '50%',
  },
  // Modern card styles
  header: {
    backgroundColor: '#1565C0',
    padding: 20,
    alignItems: 'center',
    marginBottom: 0,
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
  },
  detailCard: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  detailCardOneLine: {
    backgroundColor: 'white',
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    flexWrap: 'wrap',
  },
});


let styleContactUsButton = StyleSheet.create({
  text: {
    margin: 0,
    padding: 0,
  },
});


let styleCopyButton = StyleSheet.create({
  image: {
    iconSize: normaliseFont(14), // Should match detailText.fontSize.
    iconColor: colors.greyedOutIcon,
  },
  view: {
    marginLeft: scaledWidth(5),
    //borderWidth: 1, // testing
    height: scaledHeight(25),
  }
});


export default Receive;

// React imports
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Image, Text, StyleSheet, View, ScrollView } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';

// Other imports
import DropDownPicker from 'react-native-dropdown-picker';
import QRCode from 'react-native-qrcode-svg';
import _ from 'lodash';
import Big from 'big.js';

// Internal imports
import AppStateContext from 'src/application/data';
import { mainPanelStates, colors } from 'src/constants';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import { Button, StandardButton, ImageButton, Spinner } from 'src/components/atomic';
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
  misc.confirmItemInArray('permittedPageNames', permittedPageNames, pageName, 'Receive');


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

  // Dropdown state: Select asset
  // CA = Chosen Asset
  let [openCA, setOpenCA] = useState(false);
  let [assetCA, setAssetCA] = useState(selectedAssetCA);
  let [itemsCA, setItemsCA] = useState(generateAssetItems());


  // Initial setup.
  useEffect( () => {
    setup();
  }, []); // Pass empty array so that this only runs once on mount.


  let setup = async () => {
    try {
      await appState.generalSetup();
      await appState.loadDepositDetailsForAsset(assetCA);
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
      setItemsCA(generateAssetItems());
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
          <Spinner style={{height: '50%'}}/>
        </View>
      )
    }
    let addressKeys = _.keys(addressProperties);
    // Check for an error response.
    if (_.isEqual(addressKeys, ['error'])) {
      return (
        <View style={styles.depositDetails}>
          <View style={{alignItems:'center'}}>
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
      <View style={styles.depositDetails}>

        {assetType == 'crypto' &&

          <View>

            <View style={{alignItems:'center'}}>
              <QRCode
                size={scaledWidth(130)}
                value={addressProperties.address}
              />
            </View>

            <View style={styles.scanMessage}>
              <Text style={[styles.bold, styles.scanMessageText]}>Scan this QR code to deposit {assetString}</Text>
            </View>

          </View>
        }

        { (! _.isUndefined(addressProperties.warningMessage)) &&
          <View style={styles.warningMessage}>
            <Text style={styles.warningMessageText}>{addressProperties.warningMessage}</Text>
          </View>
        }

        { (! _.isUndefined(addressProperties.infoMessage)) &&
          <View style={styles.infoMessage}>
            <Text style={styles.infoMessageText}>{addressProperties.infoMessage}</Text>
          </View>
        }

        { addressKeys.includes('address') &&
          <View style={styles.detailWrapper}>
            <View style={styles.detailLabel}>
              <View>
                <Text style={styles.detailText}>Address:</Text>
              </View>
              <ImageButton imageName='clone' imageType='icon'
                styles={styleCopyButton}
                onPress={ () => { copyToClipboard(addressProperties.address) } }
              />
            </View>
            <View>
              <Text style={[styles.detailText, styles.bold]}>{addressProperties.address}</Text>
            </View>
          </View>
        }

        { addressKeys.includes('destinationTag') &&
          <View style={[styles.detailWrapper, styles.detailWrapperOneLine]}>
            <View style={styles.detailLabel}>
              <View>
                <Text style={styles.detailText}>Destination Tag:</Text>
              </View>
              <ImageButton imageName='clone' imageType='icon'
                styles={styleCopyButton}
                onPress={ () => { copyToClipboard(addressProperties.destinationTag) } }
              />
            </View>
            <View style={styles.detail}>
              <Text style={[styles.detailText, styles.bold]}>{addressProperties.destinationTag}</Text>
            </View>
          </View>
        }

        { addressKeys.includes('accountName') &&
          <View style={[styles.detailWrapper, styles.detailWrapperOneLine]}>
            <View style={styles.detailLabel}>
              <View>
                <Text style={styles.detailText}>Account Name:</Text>
              </View>
              <ImageButton imageName='clone' imageType='icon'
                styles={styleCopyButton}
                onPress={ () => { copyToClipboard(addressProperties.accountName) } }
              />
            </View>
            <View style={styles.detail}>
              <Text style={[styles.detailText, styles.bold]}>{addressProperties.accountName}</Text>
            </View>
          </View>
        }

        { addressKeys.includes('sortCode') &&
          <View style={[styles.detailWrapper, styles.detailWrapperOneLine]}>
            <View style={styles.detailLabel}>
              <View>
                <Text style={styles.detailText}>Sort Code:</Text>
              </View>
              <ImageButton imageName='clone' imageType='icon'
                styles={styleCopyButton}
                onPress={ () => { copyToClipboard(addressProperties.sortCode) } }
              />
            </View>
            <View style={styles.detail}>
              <Text style={[styles.detailText, styles.bold]}>{addressProperties.sortCode}</Text>
            </View>
          </View>
        }

        { addressKeys.includes('accountNumber') &&
          <View style={[styles.detailWrapper, styles.detailWrapperOneLine]}>
            <View style={styles.detailLabel}>
              <View>
                <Text style={styles.detailText}>Account Number:</Text>
              </View>
              <ImageButton imageName='clone' imageType='icon'
                styles={styleCopyButton}
                onPress={ () => { copyToClipboard(addressProperties.accountNumber) } }
              />
            </View>
            <View style={styles.detail}>
              <Text style={[styles.detailText, styles.bold]}>{addressProperties.accountNumber}</Text>
            </View>
          </View>
        }

        { addressKeys.includes('BIC') &&
          <View style={[styles.detailWrapper, styles.detailWrapperOneLine]}>
            <View style={styles.detailLabel}>
              <View>
                <Text style={styles.detailText}>BIC:</Text>
              </View>
              <ImageButton imageName='clone' imageType='icon'
                styles={styleCopyButton}
                onPress={ () => { copyToClipboard(addressProperties.BIC) } }
              />
            </View>
            <View style={styles.detail}>
              <Text style={[styles.detailText, styles.bold]}>{addressProperties.BIC}</Text>
            </View>
          </View>
        }

        { addressKeys.includes('IBAN') &&
          <View style={styles.detailWrapper}>
            <View style={styles.detailLabel}>
              <View>
                <Text style={styles.detailText}>IBAN:</Text>
              </View>
              <ImageButton imageName='clone' imageType='icon'
                styles={styleCopyButton}
                onPress={ () => { copyToClipboard(addressProperties.IBAN) } }
              />
            </View>
            <View style={styles.detail}>
              <Text style={[styles.detailText, styles.bold]}>{addressProperties.IBAN}</Text>
            </View>
          </View>
        }

        { addressKeys.includes('reference') &&
          <View style={[styles.detailWrapper, styles.detailWrapperOneLine]}>
            <View style={styles.detailLabel}>
              <View>
                <Text style={styles.detailText}>Reference:</Text>
              </View>
              <ImageButton imageName='clone' imageType='icon'
                styles={styleCopyButton}
                onPress={ () => { copyToClipboard(addressProperties.reference) } }
              />
            </View>
            <View style={styles.detail}>
              <Text style={[styles.detailText, styles.bold]}>{addressProperties.reference}</Text>
            </View>
          </View>
        }

      </View>
    )

  }


  return (
    <View style={styles.panelContainer}>
    <View style={styles.panelSubContainer}>

      <View style={[styles.heading, styles.heading1]}>
        <Text style={styles.headingText}>Receive</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={{ flexGrow: 1 }} >

      <View style={styles.description1}>
        <Text style={styles.descriptionText}>I want to receive:</Text>
      </View>

      <View style={styles.chosenAssetWrapper}>
        <DropDownPicker
          listMode="MODAL"
          placeholder={appState.getAssetInfo(assetCA).displayString}
          style={styles.chosenAssetDropdown}
          containerStyle={styles.chosenAssetDropdownContainer}
          open={openCA}
          value={assetCA}
          items={itemsCA}
          setOpen={setOpenCA}
          setValue={setAssetCA}
          setItems={setItemsCA}
          searchable={true}
          searchTextInputProps={{
            maxLength: 15
          }}
          maxHeight={scaledHeight(300)}
          textStyle={{
            fontSize: normaliseFont(10),
          }}
        />
      </View>

      <View style={styles.description1}>
        <Text style={styles.descriptionText}>{getDescriptionString()}</Text>
      </View>

      <View style={styles.depositDetailsSection}>
        {getDepositDetails()}
      </View>

      </ScrollView>

    </View>
    </View>
  )

}


let styles = StyleSheet.create({
  panelContainer: {
    paddingHorizontal: scaledWidth(15),
    paddingVertical: scaledHeight(5),
    width: '100%',
    height: '100%',
  },
  panelSubContainer: {
    paddingTop: scaledHeight(10),
    //paddingHorizontal: scaledWidth(30),
    height: '100%',
    //borderWidth: 1, // testing
  },
  heading: {
    alignItems: 'center',
  },
  heading1: {
    marginTop: scaledHeight(10),
    marginBottom: scaledHeight(40),
  },
  headingText: {
    fontSize: normaliseFont(20),
    fontWeight: 'bold',
  },
  bold: {
    fontWeight: 'bold',
  },
  description1: {
    //borderWidth: 1, // testing
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  descriptionText: {
    fontWeight: 'bold',
    fontSize: normaliseFont(18),
  },
  chosenAssetWrapper: {
    paddingVertical: scaledHeight(20),
    width: '100%',
    flexDirection: "row",
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    //borderWidth: 1, // testing
  },
  chosenAssetDropdown: {
    height: scaledHeight(40),
    width: scaledWidth(280),
  },
  chosenAssetDropdownContainer: {
    width: scaledWidth(280),
    //borderWidth: 1, // testing
  },
  depositDetailsSection: {
    marginTop: scaledHeight(20),
    //borderWidth: 1, // testing
    height: '60%', // bad practice ?
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
    fontSize: normaliseFont(14),
  },
});


let styleContactUsButton = StyleSheet.create({
  text: {
    margin: 0,
    padding: 0,
    fontSize: normaliseFont(14),
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

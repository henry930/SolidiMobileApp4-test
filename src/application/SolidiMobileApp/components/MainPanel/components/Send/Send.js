// React imports
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

// Material Design imports
import {
  Button,
  Card,
  Text,
  TextInput,
  useTheme,
  HelperText,
  Avatar,
  Surface,
} from 'react-native-paper';

// Other imports
import _ from 'lodash';
import Big from 'big.js';

// Internal imports
import AppStateContext from 'src/application/data';
import { colors, sharedStyles, sharedColors } from 'src/constants';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import { Spinner } from 'src/components/atomic';
import misc from 'src/util/misc';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('Send');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);




/* Notes

We refer to the asset (in the variable names etc) as the "stored asset". (SA)

The address properties vary between assets.

Examples:

Bitcoin (BTC):
- Address

UK Pound (GBP):
- Account Name
- Sort Code
- Account Number

Euro (EUR):
- Account Name
- BIC
- IBAN

Ripple (XRP):
- Address
- Destination Tag

So: When the user selects a particular asset to send:
- Get the list of address properties from the asset info.
- Render the appropriate input for each property.

Example values:
- Address:
1BwmSDfQQDnkC4DkovjjtUCbaz9ijBYGcY
- Account Name:
William Brown
- Sort Code:
12-34-56
- Account Number:
123456789
- Destination Tag:
52
- BIC:
INGDESMM
- IBAN:
ES91 2100 0418 4502 0005 1332


- Address (XRP):
rfLoKvknjaQQeVuhG7E2evSp93gjmkuuMq

*/




let Send = () => {

  let appState = useContext(AppStateContext);
  let [renderCount, triggerRender] = useState(0);
  let firstRender = misc.useFirstRender();
  let stateChangeID = appState.stateChangeID;

  let pageName = appState.pageName;
  let permittedPageNames = 'default'.split(' ');
  misc.confirmItemInArray('permittedPageNames', permittedPageNames, pageName, 'Send');

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
  let generateStoredAssetItems = () => { return deriveAssetItems(appState.getAssets({withdrawEnabled: true})) }

  // Initial state:
  let selectedAssetSA = 'BTC';
  let [volumeSA, setVolumeSA] = useState('');
  let [disableSendButton, setDisableSendButton] = useState(true);

  // Dropdown state: Select asset
  // SA = Stored Asset
  let [openSA, setOpenSA] = useState(false);
  let [assetSA, setAssetSA] = useState(selectedAssetSA);
  let [itemsSA, setItemsSA] = useState(generateStoredAssetItems());

  // Address Properties state:
  let [address, setAddress] = useState('');
  let [destinationTag, setDestinationTag] = useState('');
  let [accountName, setAccountName] = useState('');
  let [sortCode, setSortCode] = useState('');
  let [accountNumber, setAccountNumber] = useState('');
  let [BIC, setBIC] = useState('');
  let [IBAN, setIBAN] = useState('');

  // Misc state:
  let [destinationText, setDestinationText] = useState(' this address');
  let [balanceSA, setBalanceSA] = useState(appState.getBalance(assetSA));
  let [errorMessage, setErrorMessage] = useState('');
  let [cryptoTxnsEnabled, setCryptoTxnsEnabled] = useState(false);


  // Function: Select fee based on priority and asset.
  let selectFee = ({priority, asset}) => { return appState.getFee({feeType: 'withdraw', asset, priority}) }

  // Different assets may have different available priorities.
  let generatePriorityItemsForAsset = (asset) => {
    let priorities = 'low medium high'.split(' ');
    let priorityItems = [];
    for (let priority of priorities) {
      let fee = selectFee({priority, asset});
      //let fee = appState.getFee({feeType: 'withdraw', asset, priority});
      if (! misc.isNumericString(fee)) return []; // we're still loading data.
      // A negative fee indicates that this priority is not supported for this asset.
      if (Big(fee).lt(0)) continue;
      let label = createPriorityLabel({priority, asset});
      let value = priority;
      let priorityItem = {label, value};
      priorityItems.push(priorityItem);
    }
    return priorityItems;
  }

  let selectLowestAvailablePriority = (asset) => {
    let available = generatePriorityItemsForAsset(asset);
    if (_.isEmpty(available)) return 'none';
    // Assume that the lowest priority is the first item in the list.
    let lowest = available[0].value;
    return lowest;
  }

  // Derive dropdown properties from a priority list.
  let createPriorityLabel = ({priority, asset}) => {
    if (priority == 'none') return '[loading]';
    let label = misc.capitalise(priority) + ' Priority';
    let fee = selectFee({priority, asset});
    if (misc.isNumericString(fee)) {
      let feeIsZero = ( Big(fee).eq(Big(0)) );
      let feeLabelSection = feeIsZero ? 'FREE' : `${fee} ${asset}`;
      label += ` (Fee = ${feeLabelSection})`;
    }
    return label;
  }

  // Dropdown state: Select priority
  let [priority, setPriority] = useState(selectLowestAvailablePriority(assetSA));
  let [openPriority, setOpenPriority] = useState(false);
  let [itemsPriority, setItemsPriority] = useState(generatePriorityItemsForAsset(assetSA));
  let [transferFee, setTransferFee] = useState(selectFee({priority: 'low', asset: assetSA}));


  // Initial setup.
  useEffect( () => {
    setup();
  }, []); // Pass empty array so that this only runs once on mount.


  let setup = async () => {
    try {
      await appState.generalSetup({caller: 'Send'});
      await appState.loadBalances();
      await appState.loadFees();
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
      setDisableSendButton(false);
      setBalanceSA(appState.getBalance(assetSA));
      setItemsSA(generateStoredAssetItems());
      setItemsPriority(generatePriorityItemsForAsset(assetSA));
      setPriority(selectLowestAvailablePriority(assetSA));
      setTransferFee(selectFee({priority, asset: assetSA}));

      // If the deposit address returns "idrequired" or we have disabled cryptoWithdraw for the
      // user, then don't display withdraw details and display error dialog
      await appState.loadDepositDetailsForAsset(assetSA);
      let addressProperties = appState.getDepositDetailsForAsset(assetSA);
      if(("result" in addressProperties && addressProperties['result']=="idrequired") || appState.getUserStatus('cryptoWithdrawDisabled') ) {
        setCryptoTxnsEnabled(false);
      } else {
        setCryptoTxnsEnabled(true);
      }

      triggerRender(renderCount+1);
    } catch(err) {
      let msg = `Send.setup: ${err}`;
      console.log(msg);
    }
  }


  // If the user changes the asset, then we need to re-set lots of things.
  useEffect(() => {
    if (! firstRender) {
      log(`Set assetSA to: ${assetSA}`);
      //log({addressProperties: appState.getAssetInfo(assetSA).addressProperties});
      // If the volume is zero, change its number of decimal places appropriately.
      let volumeIsZero = false;
      if (misc.isNumericString(volumeSA)) {
        if (Big(volumeSA).eq(Big(0)) ) {
          volumeIsZero = true;
        }
      }
      if (volumeIsZero) {
        let zeroValue = appState.getZeroValue(assetSA);
        setVolumeSA(zeroValue);
      }
      setBalanceSA(appState.getBalance(assetSA));
      setItemsPriority(generatePriorityItemsForAsset(assetSA));
      setPriority(selectLowestAvailablePriority(assetSA));
      setTransferFee(selectFee({priority, asset: assetSA}));
      let assetType = appState.getAssetInfo(assetSA).type;
      let destinationText = (assetType == 'crypto') ? ' this address' : ' this account';
      setDestinationText(destinationText);
      triggerRender(renderCount+1);
    }
  }, [assetSA]);


  // If the user changes the priority, then we need to re-set the fee.
  useEffect(() => {
    if (! firstRender) {
      let fee = selectFee({priority, asset: assetSA});
      log(`Set priority to: ${priority} (Fee = ${fee} ${assetSA})`);
      setTransferFee(fee);
    }
  }, [priority]);


  let validateAndSetVolumeSA = (newVolumeSA) => {
    let storedDP = appState.getAssetInfo(assetSA).decimalPlaces;
    // This matches a digit sequence + optional period + optional digit sequence.
    // The second digit sequence can only be as long as the storedAsset's decimalPlaces.
    let regexString = `^\\d+(\\.\\d{0,${storedDP}})?$`;
    let regex = new RegExp(regexString);
    if (! _.isString(newVolumeSA)) {
      // Not sure if this could actually happen.
    } else if (_.isEmpty(newVolumeSA)) {
      // We permit the user to completely empty the input box. It feels better.
      setVolumeSA(newVolumeSA);
    } else if (! regex.test(newVolumeSA)) {
      // No need to do anything. The input simply won't accept any non decimal-string input,
      // such as symbols or alphabet characters.
    } else {
      // Valid input. Save it.
      setVolumeSA(newVolumeSA);
    }
  }


  let renderAddressInput = () => {
    return (
      <View style={styles.inputWrapper}>
        <TextInput
          mode="outlined"
          label={`${appState.getAssetInfo(assetSA).displayString} Address`}
          style={styles.materialTextInput}
          onChangeText={setAddress}
          value={address}
          placeholder={`Enter ${appState.getAssetInfo(assetSA).displayString} address`}
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>
    )
  }


  let renderDestinationTagInput = () => {
    return (
      <View style={styles.inputWrapper}>
        <TextInput
          mode="outlined"
          label="Destination Tag"
          style={styles.materialTextInput}
          onChangeText={setDestinationTag}
          value={destinationTag}
          placeholder="52"
          autoCorrect={false}
          keyboardType="number-pad"
        />
      </View>
    )
  }


  let renderAccountNameInput = () => {
    return (
      <View style={styles.inputWrapper}>
        <TextInput
          mode="outlined"
          label="Account Name"
          style={styles.materialTextInput}
          onChangeText={setAccountName}
          value={accountName}
          placeholder={`Enter ${appState.getAssetInfo(assetSA).displayString} account name`}
          autoCorrect={false}
        />
      </View>
    )
  }


  let renderSortCodeInput = () => {
    return (
      <View style={styles.inputWrapper}>
        <TextInput
          mode="outlined"
          label="Sort Code"
          style={styles.materialTextInput}
          onChangeText={setSortCode}
          value={sortCode}
          placeholder="12-34-56"
          autoCorrect={false}
          keyboardType="numbers-and-punctuation"
        />
      </View>
    )
  }


  let renderAccountNumberInput = () => {
    return (
      <View style={styles.inputWrapper}>
        <TextInput
          mode="outlined"
          label="Account Number"
          style={styles.materialTextInput}
          onChangeText={setAccountNumber}
          value={accountNumber}
          placeholder="123456789"
          autoCorrect={false}
          keyboardType="number-pad"
        />
      </View>
    )
  }


  let renderBICInput = () => {
    return (
      <View style={styles.inputWrapper}>
        <TextInput
          mode="outlined"
          label="BIC"
          style={styles.materialTextInput}
          onChangeText={setBIC}
          value={BIC}
          placeholder="INGDESMM"
          autoCorrect={false}
        />
      </View>
    )
  }


  let renderIBANInput = () => {
    return (
      <View style={styles.inputWrapper}>
        <TextInput
          mode="outlined"
          label="IBAN"
          style={styles.materialTextInput}
          onChangeText={setIBAN}
          value={IBAN}
          placeholder="ES91 2100 0418 4502 0005 1332"
          autoCorrect={false}
        />
      </View>
    )
  }


  let renderAddressProperties = () => {
    let ap = appState.getAssetInfo(assetSA).addressProperties;
    return (
      <View style={styles.addressProperties}>
        {ap.includes('address') && renderAddressInput()}
        {ap.includes('destinationTag') && renderDestinationTagInput()}
        {ap.includes('accountName') && renderAccountNameInput()}
        {ap.includes('sortCode') && renderSortCodeInput()}
        {ap.includes('accountNumber') && renderAccountNumberInput()}
        {ap.includes('BIC') && renderBICInput()}
        {ap.includes('IBAN') && renderIBANInput()}
      </View>
    )
  }


  let renderPrioritySection = () => {
    let assetType = appState.getAssetInfo(assetSA).type;
    if (assetType == '[loading]') {
      return (
        <Card style={styles.priorityCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Transaction Priority</Text>
            <Spinner />
          </Card.Content>
        </Card>
      )
    }
    let choosePriority = (assetType == 'crypto');
    if (! choosePriority) {
      return (
        <Card style={styles.priorityCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Transaction Priority</Text>
            <Text variant="bodyMedium" style={styles.priorityMessage}>
              All {assetSA} withdrawals are sent within 8 hours.
            </Text>
          </Card.Content>
        </Card>
      )
    }
    return (
      <Card style={styles.priorityCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>Transaction Priority</Text>
          <View style={styles.priorityDropdownWrapper}>
            <DropDownPicker
              listMode="SCROLLVIEW"
              placeholder={createPriorityLabel({priority, asset: assetSA})}
              style={styles.priorityDropdown}
              containerStyle={styles.priorityDropdownContainer}
              open={openPriority}
              value={priority}
              items={itemsPriority}
              setOpen={setOpenPriority}
              setValue={setPriority}
              setItems={setItemsPriority}
              textStyle={styles.dropdownText}
            />
          </View>
        </Card.Content>
      </Card>
    )
  }


  let highlightBalance = () => {
    // Check if the volumeSA is greater than the user's balance.
    // Highlight the balance if so.
    let balanceSA = appState.getBalance(assetSA);
    if (! (misc.isNumericString(volumeSA) && misc.isNumericString(balanceSA))) {
      return false;
    }
    if (Big(volumeSA).gt(Big(balanceSA)) ) {
      return true;
    }
    return false;
  }


  let _styleBalanceText = highlightBalance() ? styles.highlightedBalanceText : {};


  let calculateTotal = () => {
    let v = misc.removeFinalDecimalPointIfItExists(volumeSA);
    if (! (misc.isNumericString(v) && misc.isNumericString(transferFee))) {
      return '';
    }
    let result = Big(v).plus(Big(transferFee)).toFixed();
    let result2 = appState.getFullDecimalValue({asset:assetSA, value:result});
    return result2;
  }


  let calculateFinalBalance = () => {
    if (! misc.isNumericString(balanceSA)) return '';
    let total = calculateTotal();
    if (! misc.isNumericString(total)) return '';
    let result = Big(balanceSA).minus(Big(total)).toFixed();
    let result2 = appState.getFullDecimalValue({asset:assetSA, value:result});
    return result2;
  }


  let highlightFinalBalance = () => {
    // Check if the final balance (after calculating cost of fees etc) is negative.
    // Highlight the final balance if so.
    let finalBalance = calculateFinalBalance();
    if (! misc.isNumericString(finalBalance)) return false;
    if (Big(finalBalance).lt(Big(0))) {
      return true;
    }
    return false;
  }


  let _styleFinalBalanceText = highlightFinalBalance() ? styles.highlightedBalanceText : {};


  let calculateAmountToSend = () => {
    let v = misc.removeFinalDecimalPointIfItExists(volumeSA);
    let amount = appState.getFullDecimalValue({asset:assetSA, value:v, functionName:'Send'});
    return amount;
  }


  let startSendRequest = async () => {
    log('Clicked "Send".'); //tmp
    setErrorMessage('');
    let total = calculateTotal();
    if (! misc.isNumericString(total)) {
      let msg = `Had trouble calculating "Total to spend". Please try again.`;
      return setErrorMessage(msg);
    }
    let finalBalance = calculateFinalBalance();
    if (! misc.isNumericString(finalBalance)) {
      let msg = `Had trouble calculating final balance. Please try again.`;
      return setErrorMessage(msg);
    }
    let negativeFinalBalance = Big(finalBalance).lt(Big(0));
    if (negativeFinalBalance) {
      let msg = `Cannot send this amount - it's too high. Please choose a lower amount.`;
      return setErrorMessage(msg);
    }
    // Collect user-specified address properties.
    let addressProperties = {
      address,
      destinationTag,
      accountName,
      sortCode,
      accountNumber,
      BIC,
      IBAN,
    }
    // Remove any blank values.
    addressProperties = _.pickBy(addressProperties, (value, key) => {
      return (value !== '');
    });
    // Look up required address properties for this asset.
    let ap = appState.getAssetInfo(assetSA).addressProperties;
    // Check if the user has supplied all the required properties.
    let missing = ap.filter(x => { return ! _.keys(addressProperties).includes(x); });
    if (missing.length > 0) {
      let missingList = missing.map(x => misc.camelCaseToCapitalisedWords(x));
      let msg = `Please supply: ${missingList.join(', ')}`;
      return setErrorMessage(msg);
    }
    // Store the withdraw details in the global appState.
    // These will be loaded later by the SendSuccessful page.
    _.assign(appState.panels.send, {asset:assetSA, volume:total, addressProperties, priority});
    // Send the withdraw request to the server.
    let result = await appState.sendWithdraw({asset:assetSA, volume:total, addressInfo:addressProperties, priority, functionName:'startSendRequest'});
    if (result == 'DisplayedError') return;
    // Check to see if the server returned an error.
    // Stop and display the error message if so.
    if (_.has(result, 'error')) {
      let msg = result.error;
      return setErrorMessage(msg);
    }
    // Change state.
    appState.changeState('SendSuccessful');
  }

  let assetType = appState.getAssetInfo(assetSA).type;

  function changeToGBP() {
    return appState.changeState('Receive','GBP');
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
              Send Crypto
            </Text>
            <View style={styles.secureBadge}>
              <Text style={styles.secureText}>
                SECURE
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Content Section */}
      <View style={styles.panelSubContainer}>

        {(! _.isEmpty(errorMessage)) &&
          <Card style={styles.errorCard}>
            <Card.Content>
              <Text style={styles.errorText}>{errorMessage}</Text>
              <Button mode="outlined" onPress={() => setErrorMessage('')} style={styles.clearErrorButton}>
                Clear Error
              </Button>
            </Card.Content>
          </Card>
        }

      <KeyboardAwareScrollView
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps='handled'
      >

      <Card style={styles.inputCard}>
        <Card.Content>
          <View style={styles.amountSection}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Amount to Send</Text>
            <View style={styles.amountInputRow}>
              <TextInput
                mode="outlined"
                label="Amount"
                placeholder="0.1532"
                style={styles.amountInput}
                onChangeText={validateAndSetVolumeSA}
                value={volumeSA}
                keyboardType="decimal-pad"
              />
              <Button 
                mode="contained-tonal" 
                onPress={() => {
                  // We calculate the maximum amount by subtracting the fee from the user's balance.
                  if (!(misc.isNumericString(balanceSA) && misc.isNumericString(transferFee))) {
                    return;
                  }
                  let result = Big(balanceSA).minus(Big(transferFee)).toFixed();
                  let result2 = appState.getFullDecimalValue({asset:assetSA, value:result, functionName:'Send'});
                  validateAndSetVolumeSA(result2);
                }}
                style={styles.maxButton}
              >
                MAX
              </Button>
            </View>
            <View style={styles.dropdownContainer}>
              <DropDownPicker
                listMode="MODAL"
                placeholder={appState.getAssetInfo(assetSA).displayString}
                style={styles.assetDropdown}
                containerStyle={styles.assetDropdownContainer}
                open={openSA}
                value={assetSA}
                items={itemsSA}
                setOpen={setOpenSA}
                setValue={setAssetSA}
                setItems={setItemsSA}
                searchable={true}
                searchTextInputProps={{
                  maxLength: 15
                }}
                maxHeight={scaledHeight(300)}
                textStyle={styles.dropdownText}
              />
            </View>
          </View>
        </Card.Content>
      </Card>

      { (cryptoTxnsEnabled || assetType!='crypto') && renderPrioritySection()}

      { (cryptoTxnsEnabled || assetType!='crypto') &&  
      <Card style={styles.detailsCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>Transaction Details</Text>
          <View style={styles.detailRow}>
            <Text style={[_styleBalanceText, styles.detailLabel]}>Current balance:</Text>
            <Text style={[_styleBalanceText, styles.detailValue]}>{balanceSA} {assetSA}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Amount to send:</Text>
            <Text style={styles.detailValue}>{calculateAmountToSend()} {assetSA}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Network fee:</Text>
            <Text style={styles.detailValue}>{appState.getFullDecimalValue({asset:assetSA, value:transferFee, functionName:'Send'})} {assetSA}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total to spend:</Text>
            <Text style={styles.detailValue}>{calculateTotal()} {assetSA}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[_styleFinalBalanceText, styles.detailLabel]}>Final balance:</Text>
            <Text style={[_styleFinalBalanceText, styles.detailValue]}>{calculateFinalBalance()} {assetSA}</Text>
          </View>
        </Card.Content>
      </Card> }

      { (cryptoTxnsEnabled || assetType!='crypto') &&  
      <Card style={styles.addressCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>Send To{destinationText}</Text>
          {renderAddressProperties()}
        </Card.Content>
      </Card>}

      { (cryptoTxnsEnabled || assetType!='crypto') &&  
      <Card style={styles.actionCard}>
        <Card.Content>
          <Button 
            mode="contained" 
            onPress={startSendRequest}
            disabled={disableSendButton}
            style={styles.sendButton}
            contentStyle={styles.sendButtonContent}
          >
            Send Now
          </Button>
        </Card.Content>
      </Card>}

{ (!cryptoTxnsEnabled && (assetType == 'crypto')) && 
      <Card style={styles.upgradeCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.upgradeTitle}>Upgrade your account</Text>
          <Text variant="bodyMedium" style={styles.upgradeDescription}>
            To enable sending crypto you need to either deposit and make your first crypto purchase or get ID verified.
          </Text>
          <View style={styles.upgradeActions}>
            <Button 
              mode="contained" 
              onPress={goToIDCheck}
              style={styles.upgradeButton}
            >
              Verify ID
            </Button>
            <Button 
              mode="outlined" 
              onPress={changeToGBP}
              style={styles.upgradeButton}
            >
              Deposit GBP
            </Button>
          </View>
        </Card.Content>
      </Card> }
        </KeyboardAwareScrollView>

      </View>
    </View>
  )

}


let styles = StyleSheet.create({
  // Header styles
  headerSection: {
    backgroundColor: sharedColors.primary,
    paddingHorizontal: 0,
    paddingTop: 12,
    paddingBottom: 20,
    elevation: 2,
  },
  headerContent: {
    paddingHorizontal: 16,
  },
  secureBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  secureText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  
  // Content styles
  panelSubContainer: {
    flex: 1,
    paddingTop: 12,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  
  // Error styles - extend shared styles
  errorCard: {
    ...sharedStyles.errorCard,
    margin: 16,
    marginVertical: 8,
  },
  errorText: {
    ...sharedStyles.errorText,
    marginBottom: 8,
  },
  clearErrorButton: {
    alignSelf: 'flex-start',
  },
  
  // Input card styles
  inputCard: {
    ...sharedStyles.card,
    margin: 16,
    marginVertical: 8,
  },
  amountSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    ...sharedStyles.sectionTitle,
    marginBottom: 16,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  amountInput: {
    flex: 1,
    marginRight: 8,
    backgroundColor: sharedColors.surface,
  },
  maxButton: {
    minWidth: 80,
  },
  
  // Dropdown styles
  dropdownContainer: {
    zIndex: 2,
  },
  assetDropdown: {
    height: scaledHeight(40),
    ...sharedStyles.dropdown,
  },
  assetDropdownContainer: {
    ...sharedStyles.dropdownContainer,
  },
  dropdownText: {
    fontSize: normaliseFont(14),
  },
  
  // Details card
  detailsCard: {
    ...sharedStyles.card,
    margin: 16,
    marginVertical: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  detailLabel: {
    ...sharedStyles.label,
    fontSize: normaliseFont(14),
    flex: 1,
  },
  detailValue: {
    ...sharedStyles.valueBold,
    fontSize: normaliseFont(14),
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  
  // Address and action cards
  addressCard: {
    ...sharedStyles.card,
    margin: 16,
    marginVertical: 8,
  },
  actionCard: {
    ...sharedStyles.card,
    margin: 16,
    marginVertical: 8,
  },
  sendButton: {
    paddingVertical: 4,
  },
  sendButtonContent: {
    paddingVertical: 8,
  },
  
  // Upgrade card
  upgradeCard: {
    ...sharedStyles.card,
    margin: 16,
    marginVertical: 8,
    backgroundColor: '#fff3e0',
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
  },
  upgradeButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  
  // Input wrapper
  inputWrapper: {
    marginVertical: 8,
  },
  materialTextInput: {
    backgroundColor: sharedColors.surface,
  },
  
  // Priority card
  priorityCard: {
    ...sharedStyles.card,
    margin: 16,
    marginVertical: 8,
  },
  priorityMessage: {
    textAlign: 'center',
    fontStyle: 'italic',
    color: sharedColors.textSecondary,
  },
  priorityDropdownWrapper: {
    zIndex: 1,
  },
  priorityDropdown: {
    height: scaledHeight(40),
    width: '100%',
    ...sharedStyles.dropdown,
  },
  priorityDropdownContainer: {
    width: '100%',
    ...sharedStyles.dropdownContainer,
  },
  
  // Highlighted text
  highlightedBalanceText: {
    color: sharedColors.error,
  },
});


export default Send;

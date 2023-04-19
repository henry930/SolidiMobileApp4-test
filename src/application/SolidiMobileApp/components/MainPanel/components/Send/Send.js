// React imports
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Image, Text, TextInput, StyleSheet, View, ScrollView } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

// Other imports
import _ from 'lodash';
import Big from 'big.js';

// Internal imports
import AppStateContext from 'src/application/data';
import { colors } from 'src/constants';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import { Button, StandardButton, ImageButton, Spinner, FixedWidthButton } from 'src/components/atomic';
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
    //log('Render address input.')
    return (
      <View>
        <TextInput
          style={styles.fullWidthTextInput}
          onChangeText={setAddress}
          value={address}
          placeholder={appState.getAssetInfo(assetSA).displayString + ' address goes here'}
          placeholderTextColor={colors.placeHolderTextColor}
          autoCorrect={false}
          autoCapitalize={'none'}
        />
      </View>
    )
  }


  let renderDestinationTagInput = () => {
    return (
      <View style={styles.fullWidthLabelledInputWrapper}>
        <View style={styles.inputLabel}>
          <Text style={styles.inputLabelText}>Destination Tag:</Text>
        </View>
        <View style={styles.halfWidthTextInputWrapper}>
          <TextInput
            style={styles.halfWidthTextInput}
            onChangeText={setDestinationTag}
            value={destinationTag}
            //placeholder={'52'}
            //placeholderTextColor={colors.placeHolderTextColor}
            autoCorrect={false}
            keyboardType='number-pad'
          />
        </View>
      </View>
    )
  }


  let renderAccountNameInput = () => {
    return (
      <View>
        {/* <Text style={styles.inputLabelText}>Account Name:</Text> */}
        <View>
          <TextInput
            style={styles.fullWidthTextInput}
            onChangeText={setAccountName}
            value={accountName}
            placeholder={appState.getAssetInfo(assetSA).displayString + ' account name goes here'}
            placeholderTextColor={colors.placeHolderTextColor}
            autoCorrect={false}
          />
        </View>
      </View>
    )
  }


  let renderSortCodeInput = () => {
    return (
      <View style={styles.fullWidthLabelledInputWrapper}>
        <View style={styles.inputLabel}>
          <Text style={styles.inputLabelText}>Sort Code:</Text>
        </View>
        <View style={styles.halfWidthTextInputWrapper}>
          <TextInput
            style={styles.halfWidthTextInput}
            onChangeText={setSortCode}
            value={sortCode}
            placeholder={'12-34-56'}
            placeholderTextColor={colors.placeHolderTextColor}
            autoCorrect={false}
            keyboardType='numbers-and-punctuation'
          />
        </View>
      </View>
    )
  }


  let renderAccountNumberInput = () => {
    return (
      <View style={styles.fullWidthLabelledInputWrapper}>
        <View style={styles.inputLabel}>
          <Text style={styles.inputLabelText}>Account Number:</Text>
        </View>
        <View style={styles.halfWidthTextInputWrapper}>
          <TextInput
            style={styles.halfWidthTextInput}
            onChangeText={setAccountNumber}
            value={accountNumber}
            placeholder={'123456789'}
            placeholderTextColor={colors.placeHolderTextColor}
            autoCorrect={false}
            keyboardType='number-pad'
          />
        </View>
      </View>
    )
  }


  let renderBICInput = () => {
    return (
      <View style={styles.fullWidthLabelledInputWrapper}>
        <View style={styles.inputLabel}>
          <Text style={styles.inputLabelText}>BIC:</Text>
        </View>
        <View style={styles.halfWidthTextInputWrapper}>
          <TextInput
            style={styles.halfWidthTextInput}
            onChangeText={setBIC}
            value={BIC}
            placeholder={'INGDESMM'}
            placeholderTextColor={colors.placeHolderTextColor}
            autoCorrect={false}
          />
        </View>
      </View>
    )
  }


  let renderIBANInput = () => {
    return (
      <View>
        <View style={styles.inputLabel}>
            <Text style={styles.inputLabelText}>IBAN:</Text>
        </View>
        <View>
          <TextInput
            style={styles.fullWidthTextInput}
            onChangeText={setIBAN}
            value={BIC}
            placeholder={'ES91 2100 0418 4502 0005 1332'}
            placeholderTextColor={colors.placeHolderTextColor}
            autoCorrect={false}
          />
        </View>
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
        <View style={styles.priorityWrapper}></View>
      )
    }
    let choosePriority = (assetType == 'crypto');
    if (! choosePriority) {
      return (
        <View style={styles.priorityWrapper}>
          <View style={styles.importantMessage}>
            <Text style={styles.importantMessageText}>All {assetSA} withdrawals are sent within 8 hours.</Text>
          </View>
        </View>
      )
    }
    return (
      <View style={styles.priorityWrapper}>
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
    <View style={styles.panelContainer}>
    <View style={styles.panelSubContainer}>

      <View style={[styles.heading, styles.heading1]}>
        <Text style={styles.headingText}>Send</Text>
      </View>

      {(! _.isEmpty(errorMessage)) &&
        <View style={styles.errorMessageWrapper}>
          <View style={styles.errorMessage}>
            <Text style={styles.errorMessageText}>{errorMessage}</Text>
          </View>
          <Button title="Clear Error" onPress={ () => { setErrorMessage('') } }/>
        </View>
      }

      <KeyboardAwareScrollView
        showsVerticalScrollIndicator={true}
        contentContainerStyle={{ flexGrow: 1, margin: 20 }}
        keyboardShouldPersistTaps='handled'
      >

      <View style={styles.description1}>
        <View>
          <Text style={styles.descriptionText}>I want to send:</Text>
        </View>
        <View>
          <Button title='[max]' onPress={ () => {
              // We calculate the maximum amount by subtracting the fee from the user's balance.
              if (! (misc.isNumericString(balanceSA) && misc.isNumericString(transferFee)) ) {
               return;
              }
              let result = Big(balanceSA).minus(Big(transferFee)).toFixed();
              let result2 = appState.getFullDecimalValue({asset:assetSA, value:result, functionName:'Send'});
              validateAndSetVolumeSA(result2);
            }}
            styles={styleMaxButton}
          />
        </View>
      </View>

      <View style={styles.storedAssetWrapper}>
        <TextInput
          placeholder={'0.1532'}
          style={styles.volumeSA}
          onChangeText={validateAndSetVolumeSA}
          value={volumeSA}
          keyboardType='decimal-pad'
        />
        <DropDownPicker
          listMode="MODAL"
          placeholder={appState.getAssetInfo(assetSA).displayString}
          style={styles.storedAssetDropdown}
          containerStyle={styles.storedAssetDropdownContainer}
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

      { (cryptoTxnsEnabled || assetType!='crypto') && renderPrioritySection()}

      { (cryptoTxnsEnabled || assetType!='crypto') &&  
      <View style={styles.transferDetailsSection}>
        <View style={styles.transferDetail}>
          <Text style={[_styleBalanceText, styles.detailText]}>Current balance:</Text>
          <Text style={[_styleBalanceText, styles.monospaceText]}>{balanceSA} {assetSA}</Text>
        </View>
        <View style={styles.transferDetail}>
          <Text style={styles.detailText}>Amount to send:</Text>
          <Text style={styles.monospaceText}>{calculateAmountToSend()} {assetSA}</Text>
        </View>
        <View style={styles.transferDetail}>
          <Text style={styles.detailText}>Network fee:</Text>
          <Text style={styles.monospaceText}>{appState.getFullDecimalValue({asset:assetSA, value:transferFee, functionName:'Send'})} {assetSA}</Text>
        </View>
        <View style={styles.transferDetail}>
          <Text style={styles.detailText}>Total to spend: </Text>
          <Text style={styles.monospaceText}>{calculateTotal()} {assetSA}</Text>
        </View>
        <View style={styles.transferDetail}>
          <Text style={[_styleFinalBalanceText, styles.detailText]}>Final balance:</Text>
          <Text style={[_styleFinalBalanceText, styles.monospaceText]}>{calculateFinalBalance()} {assetSA}</Text>
        </View>
      </View> }

      { (cryptoTxnsEnabled || assetType!='crypto') &&  
      <View style={styles.description2}>
        <Text style={styles.descriptionText}>To{destinationText}:</Text>
      </View>}

      { (cryptoTxnsEnabled || assetType!='crypto') &&  
      <View style={styles.addressPropertiesWrapper}>

        {renderAddressProperties()}

      </View>}

      { (cryptoTxnsEnabled || assetType!='crypto') &&  
      <View style={styles.sendButtonWrapper}>
        <StandardButton title="Send now"
          onPress={ startSendRequest }
          disabled={disableSendButton}
        />
      </View>}

{ (!cryptoTxnsEnabled && (assetType == 'crypto')) && 
      <View>
      <Text style={styles.headingText}>Upgrade your account:</Text>
      <Text></Text>
      <Text style={styles.descriptionText}>To enable sending crypto you need to either withdraw/deposit to/from your bank account or get ID verified.</Text>
      <Text></Text>

        <View style={styles.buttonWrapper}>
          <FixedWidthButton title="Verify ID" onPress={goToIDCheck}/>
        </View>

        <View style={styles.buttonWrapper}>
          <FixedWidthButton title="Deposit GBP" onPress={changeToGBP} />
        </View>

      </View> }
      </KeyboardAwareScrollView>

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
    marginBottom: scaledHeight(20),
  },
  headingText: {
    fontSize: normaliseFont(20),
    fontWeight: 'bold',
  },
  basicText: {
    fontSize: normaliseFont(14),
  },
  dropdownText: {
    fontSize: normaliseFont(14),
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
  description2: {
    marginTop: scaledHeight(20),
  },
  descriptionText: {
    fontWeight: 'bold',
    fontSize: normaliseFont(18),
  },
  storedAssetWrapper: {
    paddingVertical: scaledHeight(20),
    width: '100%',
    zIndex: 2,
    //borderWidth: 1, // testing
  },
  volumeSA: {
    //borderWidth: 1, // testing
    //backgroundColor: 'blue',
    fontSize: normaliseFont(16),
    height: scaledHeight(40),
    width: scaledWidth(140),
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: scaledWidth(10),
    marginBottom: scaledWidth(20),
  },
  storedAssetDropdown: {
    height: scaledHeight(40),
    width: scaledWidth(220),
  },
  storedAssetDropdownContainer: {
    width: scaledWidth(220),
    //borderWidth: 1, // testing
  },
  priorityWrapper: {
    //borderWidth: 1, // testing
    flexDirection: "row",
    justifyContent: 'space-between',
    marginBottom: scaledHeight(20),
    zIndex: 1,
  },
  priorityDropdown: {
    height: scaledHeight(40),
    width: '100%',
  },
  priorityDropdownContainer: {
    //borderWidth: 1, // testing
    width: '100%',
  },
  transferDetailsSection: {
    //marginVertical: scaledHeight(20),
    paddingHorizontal: scaledWidth(30),
  },
  transferDetail: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  monospaceText: {
    fontSize: normaliseFont(14),
    // For Android, a second solution may be needed.
    fontVariant: ['tabular-nums'],
  },
  detailText: {
    fontSize: normaliseFont(14),
  },
  highlightedBalanceText: {
    color: 'red',
  },
  addressPropertiesWrapper: {
    //borderWidth: 1, // testing
    marginTop: scaledHeight(10),
    marginBottom: scaledHeight(20),
  },
  addressProperties: {

  },
  fullWidthTextInput: {
    fontSize: normaliseFont(14),
    marginTop: scaledHeight(10),
    height: scaledHeight(40),
    width: '99%',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: scaledWidth(10),
    flexDirection: "row",
  },
  fullWidthLabelledInputWrapper: {
    //borderWidth: 1, // testing
    marginTop: scaledHeight(10),
    width: '99%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    //justifyContent: 'space-between',
  },
  inputLabel: {
    //borderWidth: 1, // testing
    justifyContent: 'center',
    paddingRight: scaledWidth(20),
  },
  inputLabelText: {
    //fontWeight: 'bold',
    fontSize: normaliseFont(14),
  },
  halfWidthTextInputWrapper: {
    //borderWidth: 1, // testing
    width: '50%',
  },
  halfWidthTextInput: {
    fontSize: normaliseFont(14),
    height: scaledHeight(40),
    width: '100%',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: scaledWidth(10),
    flexDirection: "row",
  },
  importantMessage: {
    //borderWidth: 1, // testing
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  importantMessageText: {
    fontSize: normaliseFont(14),
    textDecorationLine: 'underline'
  },
  sendButtonWrapper: {
    //borderWidth: 1, // testing
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  errorMessageWrapper: {
    //borderWidth: 1, // testing
    marginBottom: scaledHeight(20),
    paddingLeft: scaledWidth(5),
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  errorMessage: {
    width: '60%',
  },
  errorMessageText: {
    fontSize: normaliseFont(14),
    color: 'red',
  },
  buttonWrapper: {
    marginTop: scaledHeight(20),
    marginLeft: '25%',
    width: '50%',
  },
});


let styleMaxButton = StyleSheet.create({
  text: {
    paddingVertical: 0,
    marginVertical: 0,
  },
});


export default Send;

// React imports
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Text, TextInput, StyleSheet, View } from 'react-native';

// Other imports
import DropDownPicker from 'react-native-dropdown-picker';
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
let logger2 = logger.extend('Send');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);




/* Notes

We refer to the asset (in the variable names etc) as the "stored asset". (SA)

The address properties vary between assets.

Examples:

Bitcoin (BTC):
- Address

British Pound (GBP):
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
      return {label: info.displayString, value: info.displaySymbol};
    });
  }
  let getStoredAssetItems = () => { return deriveAssetItems(appState.getAssets()) }

  // Initial state:
  let selectedAssetSA = 'BTC';
  let selectedVolumeSA = '0.00000000';
  let [volumeSA, setVolumeSA] = useState(selectedVolumeSA);

  // Dropdown state: Select asset
  // SA = Stored Asset
  let [openSA, setOpenSA] = useState(false);
  let [assetSA, setAssetSA] = useState(selectedAssetSA);
  let [itemsSA, setItemsSA] = useState(getStoredAssetItems());

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

  // Function: Select fee based on asset and priority.
  let selectFee = (priority) => { return appState.getFee({feeType: 'withdraw', asset: assetSA, priority }) }

  // Derive dropdown properties from a priority list.
  let createPriorityLabel = (priority) => {
    let label = misc.capitalise(priority) + ' Priority';
    let fee = selectFee(priority);
    if (misc.isNumericString(fee)) {
      let feeIsZero = ( Big(fee).eq(Big(0)) );
      let feeLabelSection = feeIsZero ? 'FREE' : `${fee} ${assetSA}`;
      label += ` (Fee = ${feeLabelSection})`;
    }
    return label;
  }
  let getPriorityItems = () => {
    let priorities = 'low medium high'.split(' ');
    return priorities.map(priority => {
      return {label: createPriorityLabel(priority), value: priority};
    });
  }

  // Dropdown state: Select priority
  let [priority, setPriority] = useState('low');
  let [openPriority, setOpenPriority] = useState(false);
  let [itemsPriority, setItemsPriority] = useState(getPriorityItems());

  let [transferFee, setTransferFee] = useState(selectFee('low'));


  // Initial setup.
  useEffect( () => {
    setup();
  }, []); // Pass empty array so that this only runs once on mount.


  let setup = async () => {
    try {
      await appState.loadFees();
      await appState.loadAssetsInfo();
      await appState.loadBalances();
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
      setBalanceSA(appState.getBalance(assetSA));
      setItemsSA(getStoredAssetItems());
      setItemsPriority(getPriorityItems())
      setTransferFee(selectFee(priority));
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
      let currentVolumeSA = volumeSA;
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
        currentVolumeSA = zeroValue;
      }
      setBalanceSA(appState.getBalance(assetSA));
      setItemsPriority(getPriorityItems());
      setTransferFee(selectFee(priority));
      let assetType = appState.getAssetInfo(assetSA).type;
      let destinationText = (assetType == 'crypto') ? ' this address' : ' this account';
      setDestinationText(destinationText);
      triggerRender(renderCount+1);
    }
  }, [assetSA]);


  // If the user changes the priority, then we need to re-set the fee.
  useEffect(() => {
    if (! firstRender) {
      let fee = selectFee(priority);
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
            onChangeText={setBIC}
            value={BIC}
            placeholder={'ES91 2100 0418 4502 0005 1332'}
            placeholderTextColor={colors.placeHolderTextColor}
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
          placeholder={createPriorityLabel('low')}
          style={styles.priorityDropdown}
          containerStyle={styles.priorityDropdownContainer}
          open={openPriority}
          value={priority}
          items={itemsPriority}
          setOpen={setOpenPriority}
          setValue={setPriority}
          setItems={setItemsPriority}
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


  let _styleBalanceText = highlightBalance() ? styles.highlightedBalanceText : styles.balanceText;


  let calculateTotal = () => {
    if (! (misc.isNumericString(volumeSA) && misc.isNumericString(transferFee))) {
      return '';
    }
    let result = Big(volumeSA).plus(Big(transferFee)).toFixed();
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


  let _styleFinalBalanceText = highlightFinalBalance() ? styles.highlightedBalanceText : styles.balanceText;


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
    // Check to see if the server returned an error.
    // Stop and display the error message if so.
    if (_.has(result, 'error')) {
      let msg = result.error;
      return setErrorMessage(msg);
    }
    // Change state.
    appState.changeState('SendSuccessful');
  }


  return (
    <View style={styles.panelContainer}>
    <View style={styles.panelSubContainer}>

      <View style={[styles.heading, styles.heading1]}>
        <Text style={styles.headingText}>Send</Text>
      </View>

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
              setVolumeSA(result2);
            }}
            styles={styleMaxButton}
          />
        </View>
      </View>

      <View style={styles.storedAssetWrapper}>
        <TextInput
          style={styles.volumeSA}
          onChangeText={validateAndSetVolumeSA}
          value={volumeSA}
        />
        <DropDownPicker
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
        />
      </View>

      {renderPrioritySection()}

      <View style={styles.transferDetailsSection}>
        <View style={styles.transferDetail}>
          <Text style={_styleBalanceText}>Current balance:</Text>
          <Text style={[styles.monospaceText, _styleBalanceText]}>{balanceSA} {assetSA}</Text>
        </View>
        <View style={styles.transferDetail}>
          <Text>Amount to send:</Text>
          <Text style={styles.monospaceText}>{appState.getFullDecimalValue({asset:assetSA, value:volumeSA, functionName:'Send'})} {assetSA}</Text>
        </View>
        <View style={styles.transferDetail}>
          <Text>Network fee:</Text>
          <Text style={styles.monospaceText}>{appState.getFullDecimalValue({asset:assetSA, value:transferFee, functionName:'Send'})} {assetSA}</Text>
        </View>
        <View style={styles.transferDetail}>
          <Text>Total to spend: </Text>
          <Text style={styles.monospaceText}>{calculateTotal()} {assetSA}</Text>
        </View>
        <View style={styles.transferDetail}>
          <Text style={_styleFinalBalanceText}>Final balance:</Text>
          <Text style={[styles.monospaceText, _styleFinalBalanceText]}>{calculateFinalBalance()} {assetSA}</Text>
        </View>
      </View>

      <View style={styles.description2}>
        <Text style={styles.descriptionText}>To{destinationText}:</Text>
      </View>

      <View style={styles.addressPropertiesWrapper}>

        {renderAddressProperties()}

      </View>

      <View style={styles.sendButtonWrapper}>
        <StandardButton title="Send now" onPress={ startSendRequest } />
        {(! _.isEmpty(errorMessage)) &&
          <View style={styles.errorMessage}>
            <Text style={styles.errorMessageText}>{errorMessage}</Text>
            <Button title="Clear Error" onPress={ () => { setErrorMessage('') } }/>
          </View>
        }
      </View>

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
    flexDirection: "row",
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
    //borderWidth: 1, // testing
  },
  volumeSA: {
    height: scaledHeight(40),
    width: scaledWidth(120),
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: scaledWidth(10),
    marginRight: scaledWidth(20),
  },
  storedAssetDropdown: {
    height: 40,
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
    height: 40,
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
    // For Android, a second solution may be needed.
    fontVariant: ['tabular-nums'],
  },
  balanceText: {
    //borderWidth: 1, // testing
    fontSize: normaliseFont(14),
  },
  highlightedBalanceText: {
    color: 'red',
    fontSize: normaliseFont(14),
  },
  addressPropertiesWrapper: {
    //borderWidth: 1, // testing
    marginTop: scaledHeight(10),
    marginBottom: scaledHeight(20),
  },
  addressProperties: {

  },
  fullWidthTextInput: {
    marginTop: scaledHeight(10),
    height: scaledHeight(40),
    width: '100%',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: scaledWidth(10),
    flexDirection: "row",
  },
  fullWidthLabelledInputWrapper: {
    //borderWidth: 1, // testing
    marginTop: scaledHeight(10),
    width: '100%',
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
    fontSize: normaliseFont(16),
  },
  halfWidthTextInputWrapper: {
    //borderWidth: 1, // testing
    width: '50%',
  },
  halfWidthTextInput: {
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
    textDecorationLine: 'underline'
  },
  sendButtonWrapper: {
    //borderWidth: 1, // testing
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  errorMessage: {
    //borderWidth: 1, // testing
    width: '50%',
  },
  errorMessageText: {
    color: 'red',
  },
});


let styleMaxButton = StyleSheet.create({
  text: {
    padding: 0,
    margin: 0,
  },
});


export default Send;

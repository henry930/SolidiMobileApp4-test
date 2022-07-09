// React imports
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Text, TextInput, StyleSheet, View, ScrollView } from 'react-native';

// Other imports
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
let logger2 = logger.extend('BankAccounts');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);


/* Notes


*/




let BankAccounts = () => {

  let appState = useContext(AppStateContext);
  let [renderCount, triggerRender] = useState(0);
  let stateChangeID = appState.stateChangeID;
  let [isLoading, setIsLoading] = useState(true);

  let pageName = appState.pageName;
  let permittedPageNames = 'default'.split(' ');
  misc.confirmItemInArray('permittedPageNames', permittedPageNames, pageName, 'BankAccounts');


  // For now, we're just handling GBP (not e.g. EUR).
  let accountAsset = 'GBP';
  let account1 = {};


  // Misc
  let [updateMessage, setUpdateMessage] = useState('');
  let [errorMessage, setErrorMessage] = useState('');


  // Bank Account state
  let [accountName, setAccountName] = useState('');
  let [sortCode, setSortCode] = useState('');
  let [accountNumber, setAccountNumber] = useState('');


  // Initial setup.
  useEffect( () => {
    setup();
  }, []); // Pass empty array so that this only runs once on mount.


  let setup = async () => {
    try {
      await appState.generalSetup();
      await appState.loadInitialStuffAboutUser();
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
      account1 = appState.getDefaultAccountForAsset(accountAsset);
      setAccountName(account1.accountName);
      setSortCode(account1.sortCode);
      setAccountNumber(account1.accountNumber);
      setUpdateMessage('');
      setIsLoading(false);
      triggerRender(renderCount+1);
    } catch(err) {
      let msg = `BankAccounts.setup: Error = ${err}`;
      console.log(msg);
    }
  }


  let updateBankAccountDetails = async () => {
    let params = {accountName, sortCode, accountNumber};
    setUpdateMessage('');
    let output = await appState.updateDefaultAccountForAsset('GBP', params);
    if (appState.stateChangeIDHasChanged(stateChangeID)) return;
    // Future: The error should be an object with 'code' and 'message' properties.
    if (_.has(output, 'error')) {
      setErrorMessage(misc.itemToString(output.error));
    } else if (output.result == 'success') {
      await misc.sleep(0.1);
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
      setUpdateMessage('Update successful');
      setErrorMessage('');
      await misc.sleep(0.1);
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
      // tmp
      if (_.isEmpty(accountName) || _.isEmpty(sortCode) || _.isEmpty(accountNumber)) {
        return;
      }
      // If there's a stashed state (e.g. the Sell page), return to it.
      if (! _.isEmpty(appState.stashedState)) {
        return appState.loadStashedState();
      }
    }
  }


  return (
    <View style={styles.panelContainer}>
    <View style={styles.panelSubContainer}>

      <View style={[styles.heading, styles.heading1]}>
        <Text style={styles.headingText}>Bank Account</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={{ flexGrow: 1 }} >

      { isLoading && <Spinner/> }

      { ! isLoading &&
        (_.isEmpty(accountName) && _.isEmpty(sortCode) && _.isEmpty(accountNumber)) &&
        _.isEmpty(errorMessage) &&
        <View style={styles.initialMessage}>
          <Text style={styles.initialMessageText}>Please enter your bank account details.</Text>
        </View>
      }

      { ! isLoading && ! _.isEmpty(errorMessage) &&
        <View style={styles.errorMessage}>
          <Text style={styles.errorMessageText}>{errorMessage}</Text>
        </View>
      }

      { ! isLoading &&

        <View style={styles.bankAccount}>

          <View style={styles.detail}>
            <View style={styles.detailName}>
              <Text style={styles.detailNameText}>{`\u2022  `}Account Name</Text>
            </View>
            <View>
              <TextInput defaultValue={appState.getDefaultAccountForAsset(accountAsset).accountName}
                style={[styles.detailValue, styles.editableTextInput]}
                onChangeText={setAccountName}
                autoCompleteType='off'
              />
            </View>
          </View>

          <View style={styles.detail}>
            <View style={styles.detailName}>
              <Text style={styles.detailNameText}>{`\u2022  `}Sort Code</Text>
            </View>
            <View>
              <TextInput defaultValue={appState.getDefaultAccountForAsset(accountAsset).sortCode}
                style={[styles.detailValue, styles.editableTextInput]}
                onChangeText={setSortCode}
                autoCompleteType='off'
              />
            </View>
          </View>

          <View style={styles.detail}>
            <View style={styles.detailName}>
              <Text style={styles.detailNameText}>{`\u2022  `}Account Number</Text>
            </View>
            <View>
              <TextInput defaultValue={appState.getDefaultAccountForAsset(accountAsset).accountNumber}
                style={[styles.detailValue, styles.editableTextInput]}
                onChangeText={setAccountNumber}
                autoCompleteType='off'
              />
            </View>
          </View>

          <View style={styles.detail}>
            <View style={styles.detailName}>
              <Text style={styles.detailNameText}>{`\u2022  `}Currency</Text>
            </View>
            <View>
            <Text style={styles.detailNameText}>{appState.getAssetInfo(accountAsset).displayString}</Text>
            </View>
          </View>

          <View style={styles.buttonWrapper}>
            <StandardButton title="Update details" onPress={ updateBankAccountDetails } />
            <View style={styles.updateMessage}>
              <Text style={styles.updateMessageText}>{updateMessage}</Text>
            </View>
          </View>

        </View>

      }

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
    marginBottom: scaledHeight(40),
  },
  headingText: {
    fontSize: normaliseFont(20),
    fontWeight: 'bold',
  },
  bold: {
    fontWeight: 'bold',
  },
  initialMessage: {
    alignItems: 'center',
    marginBottom: scaledHeight(20),
    //borderWidth: 1, //testing
  },
  initialMessageText: {
    fontSize: normaliseFont(14),
    color: 'red',
  },
  bankAccount: {
    marginTop: scaledHeight(20),
    //borderWidth: 1, //testing
  },
  detail: {
    //borderWidth: 1, // testing
    marginBottom: scaledHeight(10),
    flexDirection: 'row',
    flexWrap: 'wrap', // Allows long detail value to move onto the next line.
    alignItems: 'center',
  },
  detailName: {
    paddingRight: scaledWidth(10),
    paddingVertical: scaledHeight(10),
    //borderWidth: 1, // testing
    minWidth: '45%', // Expands with length of detail name.
  },
  detailNameText: {
    fontSize: normaliseFont(14),
    fontWeight: 'bold',
  },
  detailValue: {
    //borderWidth: 1, // testing
    paddingLeft: scaledWidth(10),
    paddingVertical: scaledHeight(10),
    minWidth: '54%', // slightly reduced width so that right-hand border is not cut off.
  },
  detailValueText: {
    //borderWidth: 1, // testing
    fontSize: normaliseFont(14),
  },
  editableTextInput: {
    borderWidth: 1,
    borderRadius: 16,
    borderColor: colors.greyedOutIcon,
    fontSize: normaliseFont(14),
  },
  buttonWrapper: {
    marginTop: scaledHeight(20),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  updateMessage: {
    //borderWidth: 1, //testing
  },
  updateMessageText: {
    fontSize: normaliseFont(14),
    color: 'red',
  },
  errorMessage: {
    //borderWidth: 1, //testing
    paddingHorizontal: scaledHeight(15),
    paddingVertical: scaledHeight(15),
  },
  errorMessageText: {
    fontSize: normaliseFont(14),
    color: 'red',
  }
});


export default BankAccounts;

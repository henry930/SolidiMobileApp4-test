// React imports
import React, { useContext, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

// Internal imports
import { AddressBookForm } from 'src/components/atomic';
import AppStateContext from 'src/application/data';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('AddressBook');
let { deb, dj, log, lj } = logger.getShortcuts(logger2);

/**
 * AddressBook Page Component
 * Displays the address book form as a full page
 * Uses the shared AddressBookForm component
 * @param {Function} onAddressAdded - Callback when address is added
 * @param {string} selectedAsset - Pre-selected asset for the form
 */
let AddressBook = ({ onAddressAdded, selectedAsset, ...props }) => {
  let appState = useContext(AppStateContext);
  let [renderCount, setRenderCount] = useState(0);
  let [stateChangeID, setStateChangeID] = useState(appState.stateChangeID);

  // Setup effect - Initialize API client and other required setup
  useEffect(() => {
    console.log('🔧 AddressBook: Component mounted, calling setup...');
    setup();
  }, []); // Run once on mount

  let setup = async () => {
    try {
      console.log('🔧 AddressBook: Calling appState.generalSetup...');
      await appState.generalSetup({ caller: 'AddressBook' });
      console.log('✅ AddressBook: generalSetup completed successfully');

      // Load ticker data to get available crypto assets
      // Ticker API provides all available cryptocurrencies
      console.log('🔧 AddressBook: Loading ticker data for crypto asset list...');
      try {
        await appState.loadTicker();
        console.log('✅ AddressBook: Ticker data loaded successfully');
      } catch (tickerErr) {
        console.log('⚠️ AddressBook: Ticker load failed, will use fallback assets:', tickerErr);
      }

      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
      setRenderCount(renderCount + 1);
    } catch (err) {
      let msg = `AddressBook.setup: Error = ${err}`;
      console.log('❌ AddressBook setup error:', msg);
    }
  };

  // Handle successful address addition
  let handleSuccess = (addressData) => {
    log('✅ Address added successfully from page:', addressData);

    // Call callback if provided
    if (onAddressAdded) {
      onAddressAdded(addressData);
    }

    // Navigate back or show success message (only if not in modal mode)
    if (!onAddressAdded && appState && appState.changeState) {
      // Go back to profile or previous page
      setTimeout(() => {
        appState.changeState('Profile');
      }, 1500);
    }
  };

  // Handle cancel - navigate back
  let handleCancel = () => {
    if (appState && appState.changeState) {
      appState.changeState('Profile');
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        keyboardShouldPersistTaps='handled'
        showsVerticalScrollIndicator={true}
      >
        <AddressBookForm
          selectedAsset={selectedAsset}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
          showHeader={true}
          standalone={true}
        />
      </KeyboardAwareScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
});

export default AddressBook;

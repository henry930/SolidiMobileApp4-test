// React imports
import React from 'react';
import { StyleSheet, View, Modal, Dimensions } from 'react-native';
import { IconButton } from 'react-native-paper';

// Internal imports
import AddressBookManagement from 'src/application/SolidiMobileApp/components/MainPanel/components/AddressBook/AddressBookManagement';
import { colors } from 'src/constants';
import { scaledWidth, scaledHeight } from 'src/util/dimensions';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('AddressBookManagementModal');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);

const { height: screenHeight } = Dimensions.get('window');

/**
 * AddressBookManagementModal - Modal wrapper for AddressBookManagement component
 * Provides a unified interface for both viewing address list and adding new addresses
 * Used in Transfer page and Settings to manage addresses
 * 
 * @param {boolean} visible - Whether the modal is visible
 * @param {Function} onClose - Callback when modal closes
 * @param {string} defaultTab - Which tab to show by default: 'list' or 'add'
 * @param {string} selectedAsset - Pre-selected asset for filtering (optional)
 * @param {Function} onAddressAdded - Callback when address is successfully added
 * @param {Function} onAddressSelected - Callback when address is selected from list
 */
let AddressBookManagementModal = ({ 
  visible, 
  onClose, 
  defaultTab = 'list',
  selectedAsset,
  onAddressAdded,
  onAddressSelected 
}) => {
  
  log(`Opening AddressBookManagementModal with defaultTab: ${defaultTab}`);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {/* Header with close button */}
        <View style={styles.modalHeader}>
          <IconButton
            icon="close"
            size={24}
            onPress={onClose}
            style={styles.closeButton}
          />
        </View>

        {/* AddressBookManagement Component */}
        <View style={styles.contentContainer}>
          <AddressBookManagement
            defaultTab={defaultTab}
            selectedAsset={selectedAsset}
            onAddressAdded={onAddressAdded}
            onAddressSelected={onAddressSelected}
            onClose={onClose}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: scaledWidth(10),
    paddingTop: scaledHeight(10),
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  closeButton: {
    margin: 0,
  },
  contentContainer: {
    flex: 1,
  },
});

export default AddressBookManagementModal;

// Trade Component - Shows Assets page for selecting crypto to trade
import React, { useState, useContext } from 'react';
import { View, Modal, TouchableOpacity, StyleSheet, Text } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Assets from '../Assets/Assets';
import AppStateContext from 'src/application/data';

const Trade = ({ inModal = false, onClose = null }) => {
  const appState = useContext(AppStateContext);
  const [modalVisible, setModalVisible] = useState(true);

  console.log('🎯 [Trade] Component rendering');
  console.log('🎯 [Trade] inModal:', inModal);
  console.log('🎯 [Trade] onClose provided:', !!onClose);
  console.log('🎯 [Trade] AppState exists:', !!appState);
  console.log('🎯 [Trade] User authenticated:', appState?.user?.isAuthenticated);

  // If being used inside another modal (like Home page), just render Assets without another modal
  if (inModal) {
    console.log('🎯 [Trade] Rendering as inline content (inside Home modal)');
    return <Assets />;
  }

  // Otherwise, render as a modal (when accessed from footer navigation)
  console.log('🎯 [Trade] Rendering as standalone modal');
  
  const handleClose = () => {
    console.log('🎯 [Trade] Closing modal');
    setModalVisible(false);
    
    // If onClose callback is provided, use it (for Home page modal)
    if (onClose) {
      console.log('🎯 [Trade] Calling onClose callback');
      onClose();
    } else {
      // Otherwise, navigate back using state history (for footer navigation)
      console.log('🎯 [Trade] Using state history to go back');
      appState.decrementStateHistory();
    }
  };

  return (
    <View style={styles.container}>
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="overFullScreen"
        transparent={true}
        onRequestClose={handleClose}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={handleClose}
        >
          <TouchableOpacity 
            style={styles.modalContainer} 
            activeOpacity={1} 
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose crypto you want to trade</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
              >
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              <AppStateContext.Provider value={appState}>
                <Assets />
              </AppStateContext.Provider>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '60%',
    overflow: 'hidden',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
  },
});

export default Trade;

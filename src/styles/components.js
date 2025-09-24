import { StyleSheet } from 'react-native';

// Component-specific style factory
const createComponentStyles = (componentName, customStyles = {}) => {
  const baseStyles = {
    container: {
      flex: 1,
    },
    // Add more base component styles as needed
  };

  return StyleSheet.create({
    ...baseStyles,
    ...customStyles,
  });
};

// Individual component style generators
export const createReceiveStyles = (customStyles = {}) => {
  return createComponentStyles('Receive', {
    qrCodeSection: {
      alignItems: 'center',
      marginBottom: 24,
    },
    qrCodeText: {
      marginTop: 12,
      textAlign: 'center',
      fontSize: 14,
      color: '#666',
    },
    secureBadge: {
      backgroundColor: '#4CAF50',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    secureText: {
      color: 'white',
      fontSize: 10,
      fontWeight: 'bold',
    },
    depositDetails: {
      alignItems: 'center',
      padding: 16,
    },
    spinner: {
      marginTop: 20,
    },
    ...customStyles,
  });
};

export const createSendStyles = (customStyles = {}) => {
  return createComponentStyles('Send', {
    // Send-specific styles
    amountSection: {
      marginBottom: 20,
    },
    addressSection: {
      marginBottom: 20,
    },
    feeSection: {
      marginBottom: 20,
    },
    confirmSection: {
      marginTop: 20,
    },
    ...customStyles,
  });
};

export const createAssetsStyles = (customStyles = {}) => {
  return createComponentStyles('Assets', {
    // Assets-specific styles
    assetItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#e0e0e0',
    },
    assetIcon: {
      width: 40,
      height: 40,
      marginRight: 12,
    },
    assetInfo: {
      flex: 1,
    },
    assetName: {
      fontSize: 16,
      fontWeight: '500',
      color: '#333',
    },
    assetBalance: {
      fontSize: 14,
      color: '#666',
    },
    assetValue: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#333',
      textAlign: 'right',
    },
    ...customStyles,
  });
};

export const createBuyStyles = (customStyles = {}) => {
  return createComponentStyles('Buy', {
    // Buy-specific styles
    ...customStyles,
  });
};

export default {
  createComponentStyles,
  createReceiveStyles,
  createSendStyles,
  createAssetsStyles,
  createBuyStyles,
};
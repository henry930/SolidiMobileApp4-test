// React imports
import React, { useState, useContext, useEffect } from 'react';
import { Text, TextInput, StyleSheet, View, ScrollView, TouchableOpacity, Alert, Modal, Dimensions } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { RadioButton, Title, IconButton } from 'react-native-paper';

// Internal imports
import { StandardButton, QRScanner } from 'src/components/atomic';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import { colors } from 'src/constants';
import AppStateContext from 'src/application/data';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('AddressBookModal');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);

const { height: screenHeight } = Dimensions.get('window');

let AddressBookModal = ({ visible, onClose, onAddressAdded, selectedAsset }) => {
  // Get app state for API access
  let appState = useContext(AppStateContext);
  
  // Navigation state
  let [currentStep, setCurrentStep] = useState(1);
  let [formData, setFormData] = useState({
    recipient: '',
    firstName: '',
    lastName: '',
    asset: selectedAsset || '',
    withdrawAddress: '',
    destinationType: '',
    exchangeName: '',
    // GBP-specific fields
    accountName: '',
    sortCode: '',
    accountNumber: ''
  });
  let [errorMessage, setErrorMessage] = useState('');
  let [showAssetDropdown, setShowAssetDropdown] = useState(false);
  let [showQRScanner, setShowQRScanner] = useState(false);
  
  // API submission state
  let [isSubmitting, setIsSubmitting] = useState(false);
  let [submitError, setSubmitError] = useState('');
  let [submitStatus, setSubmitStatus] = useState('');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (visible) {
      setCurrentStep(1);
      setFormData({
        recipient: '',
        firstName: '',
        lastName: '',
        asset: selectedAsset || '',
        withdrawAddress: '',
        destinationType: '',
        exchangeName: '',
        accountName: '',
        sortCode: '',
        accountNumber: ''
      });
      setErrorMessage('');
      setSubmitError('');
      setSubmitStatus('');
    }
  }, [visible, selectedAsset]);

  // Define steps
  let steps = [
    { title: 'Choose Asset', subtitle: 'Select cryptocurrency or fiat currency' },
    { title: 'Recipient Info', subtitle: 'Enter recipient details' },
    { title: 'Destination Type', subtitle: 'What type of address is this?' },
    { title: 'Address Details', subtitle: 'Enter withdrawal address or account details' },
    { title: 'Review', subtitle: 'Confirm and submit' }
  ];

  // Asset options
  let assetOptions = [
    { label: 'Bitcoin (BTC)', value: 'BTC' },
    { label: 'Ethereum (ETH)', value: 'ETH' },
    { label: 'British Pound (GBP)', value: 'GBP' },
  ];

  // Handle next step
  let handleNext = () => {
    let newErrorMessage = '';

    // Validation for each step
    switch (currentStep) {
      case 1: // Asset selection
        if (!formData.asset) {
          newErrorMessage = 'Please select an asset.';
        }
        break;
      case 2: // Recipient info
        if (!formData.recipient.trim()) {
          newErrorMessage = 'Please enter recipient name.';
        }
        break;
      case 3: // Destination type (only for crypto assets)
        if (formData.asset !== 'GBP' && !formData.destinationType) {
          newErrorMessage = 'Please select the destination type.';
        }
        break;
      case 4: // Address details
        if (formData.asset === 'GBP') {
          if (!formData.accountName.trim() || !formData.sortCode.trim() || !formData.accountNumber.trim()) {
            newErrorMessage = 'Please fill in all bank account details.';
          } else if (!/^\d{2}-\d{2}-\d{2}$/.test(formData.sortCode)) {
            newErrorMessage = 'Sort code must be in NN-NN-NN format.';
          } else if (!/^\d{8}$/.test(formData.accountNumber)) {
            newErrorMessage = 'Account number must be exactly 8 digits.';
          }
        } else {
          if (!formData.withdrawAddress.trim()) {
            newErrorMessage = 'Please enter withdrawal address.';
          }
          if (formData.destinationType === 'crypto_exchange' && !formData.exchangeName.trim()) {
            newErrorMessage = 'Please enter the exchange name.';
          }
        }
        break;
    }

    if (newErrorMessage) {
      setErrorMessage(newErrorMessage);
      return;
    }

    setErrorMessage('');
    if (currentStep < steps.length) {
      let nextStep = currentStep + 1;
      
      // Skip destination type step for GBP since it's not applicable
      if (nextStep === 3 && formData.asset === 'GBP') {
        nextStep = 4;
      }
      
      setCurrentStep(nextStep);
    }
  };

  // Handle previous step
  let handlePrevious = () => {
    setErrorMessage('');
    if (currentStep > 1) {
      let prevStep = currentStep - 1;
      
      // Skip destination type step for GBP when going backwards
      if (prevStep === 3 && formData.asset === 'GBP') {
        prevStep = 2;
      }
      
      setCurrentStep(prevStep);
    }
  };

  // Handle form submission
  let handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setSubmitError('');
      
      log('Submitting address book entry:', formData);

      if (!appState || !appState.apiClient) {
        throw new Error('API client not available');
      }

      // Determine address type and prepare API payload based on asset type
      let apiPayload;
      let addressType;
      
      if (formData.asset === 'GBP') {
        addressType = 'FIAT';  // Changed from 'bankaccount' to 'FIAT'
        // Remove dashes from sort code for API
        const sortCodeNoDashes = formData.sortCode.replace(/-/g, '');
        
        apiPayload = {
          name: formData.recipient.trim(),
          asset: formData.asset.toUpperCase(),
          network: formData.asset.toUpperCase(),
          accountName: formData.accountName.trim(),
          sortCode: sortCodeNoDashes,
          accountNumber: formData.accountNumber.trim(),
          thirdparty: true
        };
      } else {
        // Determine address type based on destination for the API route
        if (formData.destinationType === 'hosted_wallet') {
          addressType = 'CRYPTO_HOSTED';
        } else if (formData.destinationType === 'crypto_exchange') {
          addressType = 'CRYPTO_HOSTED';
        } else if (formData.destinationType === 'unhosted_wallet') {
          addressType = 'CRYPTO_UNHOSTED';
        } else if (formData.destinationType === 'dont_know') {
          addressType = 'CRYPTO_UNHOSTED';
        } else {
          addressType = 'CRYPTO_UNHOSTED'; // Default fallback
        }
        
        // For crypto assets, use nested address object structure like the original AddressBook
        let addressObject = {
          firstname: null,
          lastname: null,
          business: (formData.destinationType === 'crypto_exchange' && formData.exchangeName && formData.exchangeName.trim()) ? formData.exchangeName.trim() : null,
          address: formData.withdrawAddress.trim(),
          dtag: null,
          vasp: null
        };
        
        apiPayload = {
          name: formData.recipient.trim(),
          asset: formData.asset.toUpperCase(),
          network: formData.asset.toUpperCase(),
          address: addressObject,
          thirdparty: formData.destinationType === 'unhosted_wallet' || formData.destinationType === 'dont_know'
        };
      }

      log('API payload prepared:', apiPayload);
      log('API route:', `addressBook/${formData.asset.toUpperCase()}/${addressType}`);

      // Create abort controller
      const abortController = appState.createAbortController({tag: 'addAddressModal'});
      
      let response = await appState.apiClient.privateMethod({
        httpMethod: 'POST',
        apiRoute: `addressBook/${formData.asset.toUpperCase()}/${addressType}`,
        params: apiPayload,
        abortController
      });
      
      log('Address book submission response:', response);

      // Check for success - API should return success:true OR no error property
      const isSuccess = response && (response.success === true || (!response.error && !response.message));
      
      if (isSuccess) {
        setSubmitStatus('Address added successfully!');
        
        // Call callback first to trigger refresh
        if (onAddressAdded) {
          onAddressAdded(formData);
        }
        
        // Refresh address book data if available
        if (appState.loadAddressBook) {
          try {
            await appState.loadAddressBook();
            log('Address book refreshed successfully after adding address');
          } catch (refreshError) {
            log('Error refreshing address book:', refreshError);
          }
        }
        
        // Close modal after short delay to allow refresh to complete
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        throw new Error(response?.error || response?.message || 'Failed to add address');
      }
    } catch (error) {
      log('Address book submission error:', error);
      setSubmitError(error.message || 'Failed to add address. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle sort code formatting
  let handleSortCodeChange = (text) => {
    // Remove all non-digits
    let digits = text.replace(/\D/g, '');
    
    // Limit to 6 digits
    if (digits.length > 6) {
      digits = digits.substring(0, 6);
    }
    
    // Format as NN-NN-NN
    let formatted = '';
    for (let i = 0; i < digits.length; i++) {
      if (i > 0 && i % 2 === 0) {
        formatted += '-';
      }
      formatted += digits[i];
    }
    
    setFormData(prev => ({ ...prev, sortCode: formatted }));
  };

  // Handle account number formatting
  let handleAccountNumberChange = (text) => {
    // Remove all non-digits and limit to 8 digits
    let digits = text.replace(/\D/g, '').substring(0, 8);
    setFormData(prev => ({ ...prev, accountNumber: digits }));
  };

  // Render step content
  let renderStepContent = () => {
    switch (currentStep) {
      case 1: // Asset selection
        return (
          <View style={styles.stepContent}>
            <Text style={styles.label}>Select Asset:</Text>
            {assetOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.assetOption,
                  formData.asset === option.value && styles.assetOptionSelected
                ]}
                onPress={() => setFormData(prev => ({ ...prev, asset: option.value }))}
              >
                <RadioButton
                  value={option.value}
                  status={formData.asset === option.value ? 'checked' : 'unchecked'}
                  onPress={() => setFormData(prev => ({ ...prev, asset: option.value }))}
                />
                <Text style={styles.assetOptionText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 2: // Recipient info
        return (
          <View style={styles.stepContent}>
            <Text style={styles.label}>Recipient Name:</Text>
            <TextInput
              style={styles.input}
              value={formData.recipient}
              onChangeText={(text) => setFormData(prev => ({ ...prev, recipient: text }))}
              placeholder="Enter recipient name"
            />
          </View>
        );

      case 3: // Destination type (only for crypto assets)
        if (formData.asset === 'GBP') {
          // Skip this step for GBP
          return null;
        }
        
        const destinationOptions = [
          { id: 'crypto_exchange', text: 'Crypto Exchange' },
          { id: 'hosted_wallet', text: 'Hosted Wallet' },
          { id: 'unhosted_wallet', text: 'Unhosted Wallet' },
          { id: 'dont_know', text: "I don't know" }
        ];
        
        return (
          <View style={styles.stepContent}>
            <Text style={styles.label}>What is the destination address?</Text>
            {destinationOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.assetOption,
                  formData.destinationType === option.id && styles.assetOptionSelected
                ]}
                onPress={() => setFormData(prev => ({ ...prev, destinationType: option.id }))}
              >
                <RadioButton
                  value={option.id}
                  status={formData.destinationType === option.id ? 'checked' : 'unchecked'}
                  onPress={() => setFormData(prev => ({ ...prev, destinationType: option.id }))}
                />
                <Text style={styles.assetOptionText}>{option.text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 4: // Address details
        if (formData.asset === 'GBP') {
          return (
            <View style={styles.stepContent}>
              <Text style={styles.label}>Bank Account Details:</Text>
              
              <Text style={styles.subLabel}>Account Name:</Text>
              <TextInput
                style={styles.input}
                value={formData.accountName}
                onChangeText={(text) => setFormData(prev => ({ ...prev, accountName: text }))}
                placeholder="Enter account holder name"
              />
              
              <Text style={styles.subLabel}>Sort Code:</Text>
              <TextInput
                style={styles.input}
                value={formData.sortCode}
                onChangeText={handleSortCodeChange}
                placeholder="NN-NN-NN"
                keyboardType="numeric"
                maxLength={8}
              />
              
              <Text style={styles.subLabel}>Account Number:</Text>
              <TextInput
                style={styles.input}
                value={formData.accountNumber}
                onChangeText={handleAccountNumberChange}
                placeholder="8 digit account number"
                keyboardType="numeric"
                maxLength={8}
              />
            </View>
          );
        } else {
          return (
            <View style={styles.stepContent}>
              <Text style={styles.label}>Withdrawal Address:</Text>
              <TextInput
                style={[styles.input, styles.addressInput]}
                value={formData.withdrawAddress}
                onChangeText={(text) => setFormData(prev => ({ ...prev, withdrawAddress: text }))}
                placeholder={`Enter ${formData.asset} address`}
                multiline={true}
                numberOfLines={3}
              />
              <TouchableOpacity
                style={styles.qrButton}
                onPress={() => setShowQRScanner(true)}
              >
                <Text style={styles.qrButtonText}>Scan QR Code</Text>
              </TouchableOpacity>
              
              {formData.destinationType === 'crypto_exchange' && (
                <>
                  <Text style={styles.subLabel}>Exchange Name:</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.exchangeName}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, exchangeName: text }))}
                    placeholder="Enter exchange name"
                  />
                </>
              )}
            </View>
          );
        }

      case 5: // Review
        return (
          <View style={styles.stepContent}>
            <Text style={styles.reviewTitle}>Review Details:</Text>
            
            <View style={styles.reviewItem}>
              <Text style={styles.reviewLabel}>Asset:</Text>
              <Text style={styles.reviewValue}>{formData.asset}</Text>
            </View>
            
            <View style={styles.reviewItem}>
              <Text style={styles.reviewLabel}>Recipient:</Text>
              <Text style={styles.reviewValue}>{formData.recipient}</Text>
            </View>
            
            {formData.asset !== 'GBP' && (
              <View style={styles.reviewItem}>
                <Text style={styles.reviewLabel}>Destination Type:</Text>
                <Text style={styles.reviewValue}>
                  {formData.destinationType === 'crypto_exchange' ? 'Crypto Exchange' :
                   formData.destinationType === 'hosted_wallet' ? 'Hosted Wallet' :
                   formData.destinationType === 'unhosted_wallet' ? 'Unhosted Wallet' :
                   formData.destinationType === 'dont_know' ? "I don't know" : 'Not selected'}
                </Text>
              </View>
            )}
            
            {formData.asset === 'GBP' ? (
              <>
                <View style={styles.reviewItem}>
                  <Text style={styles.reviewLabel}>Account Name:</Text>
                  <Text style={styles.reviewValue}>{formData.accountName}</Text>
                </View>
                <View style={styles.reviewItem}>
                  <Text style={styles.reviewLabel}>Sort Code:</Text>
                  <Text style={styles.reviewValue}>{formData.sortCode}</Text>
                </View>
                <View style={styles.reviewItem}>
                  <Text style={styles.reviewLabel}>Account Number:</Text>
                  <Text style={styles.reviewValue}>{formData.accountNumber}</Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.reviewItem}>
                  <Text style={styles.reviewLabel}>Address:</Text>
                  <Text style={[styles.reviewValue, styles.addressText]}>{formData.withdrawAddress}</Text>
                </View>
                {formData.destinationType === 'crypto_exchange' && formData.exchangeName && (
                  <View style={styles.reviewItem}>
                    <Text style={styles.reviewLabel}>Exchange Name:</Text>
                    <Text style={styles.reviewValue}>{formData.exchangeName}</Text>
                  </View>
                )}
              </>
            )}
            
            {submitStatus && (
              <Text style={styles.successMessage}>{submitStatus}</Text>
            )}
            
            {submitError && (
              <Text style={styles.errorText}>{submitError}</Text>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Title style={styles.title}>Add to Address Book</Title>
          <IconButton
            icon="close"
            size={24}
            onPress={onClose}
            style={styles.closeButton}
          />
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressWrapper}>
          <Text style={styles.progressText}>
            Step {currentStep} of {steps.length}: {steps[currentStep - 1].title}
          </Text>
          <Text style={styles.progressSubtext}>
            {steps[currentStep - 1].subtitle}
          </Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={[
            styles.progressBar, 
            { width: `${(currentStep / steps.length) * 100}%` }
          ]} />
        </View>

        {/* Content */}
        <KeyboardAwareScrollView style={styles.content}>
          {renderStepContent()}
          
          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}
        </KeyboardAwareScrollView>

        {/* Footer buttons */}
        <View style={styles.footer}>
          {currentStep > 1 && (
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={handlePrevious}
            >
              <Text style={styles.secondaryButtonText}>Previous</Text>
            </TouchableOpacity>
          )}
          
          {currentStep < steps.length ? (
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleNext}
            >
              <Text style={styles.primaryButtonText}>Next</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.primaryButton, isSubmitting && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              <Text style={[styles.primaryButtonText, isSubmitting && styles.disabledButtonText]}>
                {isSubmitting ? "Adding..." : "Add Address"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* QR Scanner Modal */}
        {showQRScanner && (
          <QRScanner
            visible={showQRScanner}
            onClose={() => setShowQRScanner(false)}
            onScanSuccess={(code) => {
              console.log('[QR-SCAN] 📥 AddressBookModal received:', code);
              setFormData(prev => ({ ...prev, withdrawAddress: code }));
              setShowQRScanner(false);
            }}
            title="Scan Wallet Address"
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  
  title: {
    fontSize: normaliseFont(18),
    fontWeight: 'bold',
    color: colors.darkGray,
  },
  
  closeButton: {
    margin: 0,
  },
  
  progressWrapper: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  
  progressText: {
    fontSize: normaliseFont(16),
    fontWeight: 'bold',
    color: colors.darkGray,
    marginBottom: 5,
  },
  
  progressSubtext: {
    fontSize: normaliseFont(14),
    color: colors.mediumGray,
  },
  
  progressBarContainer: {
    height: 4,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 2,
  },
  
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  
  stepContent: {
    paddingVertical: 10,
  },
  
  label: {
    fontSize: normaliseFont(16),
    fontWeight: 'bold',
    color: colors.darkGray,
    marginBottom: 15,
  },
  
  subLabel: {
    fontSize: normaliseFont(14),
    fontWeight: '600',
    color: colors.darkGray,
    marginBottom: 8,
    marginTop: 15,
  },
  
  input: {
    borderWidth: 1,
    borderColor: '#D0D0D0',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: normaliseFont(16),
    marginBottom: 15,
    backgroundColor: 'white',
    color: '#000000',
  },
  
  addressInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  
  assetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#D0D0D0',
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: 'white',
  },
  
  assetOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: '#F0F8FF',
  },
  
  assetOptionText: {
    fontSize: normaliseFont(16),
    color: colors.darkGray,
    marginLeft: 10,
  },
  
  qrButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  
  qrButtonText: {
    color: 'white',
    fontSize: normaliseFont(16),
    fontWeight: '600',
  },
  
  reviewTitle: {
    fontSize: normaliseFont(18),
    fontWeight: 'bold',
    color: colors.darkGray,
    marginBottom: 20,
  },
  
  reviewItem: {
    marginBottom: 15,
  },
  
  reviewLabel: {
    fontSize: normaliseFont(14),
    fontWeight: '600',
    color: colors.mediumGray,
    marginBottom: 5,
  },
  
  reviewValue: {
    fontSize: normaliseFont(16),
    color: colors.darkGray,
  },
  
  addressText: {
    fontFamily: 'monospace',
    fontSize: normaliseFont(14),
  },
  
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: 'white',
  },
  
  button: {
    flex: 1,
    marginHorizontal: 5,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  primaryButton: {
    backgroundColor: colors.primary,
  },
  
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  
  primaryButtonText: {
    color: 'white',
    fontSize: normaliseFont(16),
    fontWeight: '600',
  },
  
  secondaryButtonText: {
    color: colors.primary,
    fontSize: normaliseFont(16),
    fontWeight: '600',
  },
  
  disabledButton: {
    backgroundColor: '#ccc',
    borderColor: '#ccc',
  },
  
  disabledButtonText: {
    color: '#999',
  },
  
  errorText: {
    color: '#D32F2F',
    fontSize: normaliseFont(14),
    marginTop: 10,
    textAlign: 'center',
  },
  
  successMessage: {
    color: '#2E7D32',
    fontSize: normaliseFont(16),
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 15,
  },
});

export default AddressBookModal;
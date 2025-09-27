// React imports
import React, { useState } from 'react';
import { Text, TextInput, StyleSheet, View, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { RadioButton, Title } from 'react-native-paper';

// Internal imports
import { StandardButton, QRScanner } from 'src/components/atomic';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import { colors } from 'src/constants';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('AddressBook');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);

let AddressBook = () => {
  // Navigation state
  let [currentStep, setCurrentStep] = useState(1);
  let [formData, setFormData] = useState({
    recipient: '',
    firstName: '',
    lastName: '',
    asset: '',
    withdrawAddress: '',
    destinationType: '',
    exchangeName: ''
  });
  let [errorMessage, setErrorMessage] = useState('');
  let [showAssetDropdown, setShowAssetDropdown] = useState(false);
  let [showQRScanner, setShowQRScanner] = useState(false);

  // Step configuration
  const steps = [
    { id: 1, title: 'Recipient', subtitle: 'Who will receive this withdraw?' },
    { id: 2, title: 'Details', subtitle: 'Recipient information' },
    { id: 3, title: 'Asset', subtitle: 'What are you withdrawing?' },
    { id: 4, title: 'Destination', subtitle: 'What is the destination address?' },
    { id: 5, title: 'Wallet', subtitle: 'Exchange information' },
    { id: 6, title: 'Summary', subtitle: 'Review and confirm' }
  ];

  // Asset options for dropdown
  const assetOptions = [
    { id: 'btc', label: 'Bitcoin (BTC)' },
    { id: 'eth', label: 'Ethereum (ETH)' },
    { id: 'usdt', label: 'Tether (USDT)' },
    { id: 'usdc', label: 'USD Coin (USDC)' },
    { id: 'bnb', label: 'Binance Coin (BNB)' }
  ];

  // Handle input changes
  let handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setErrorMessage(''); // Clear error on input
  };

  // Handle QR code scan success
  let handleQRScanSuccess = (qrData) => {
    setShowQRScanner(false);
    
    // Basic validation for wallet address format
    if (qrData && qrData.length > 10) {
      handleInputChange('withdrawAddress', qrData);
      Alert.alert(
        'QR Code Scanned',
        'Wallet address has been filled in from the QR code.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Invalid QR Code',
        'The scanned QR code does not appear to contain a valid wallet address.',
        [{ text: 'OK' }]
      );
    }
  };

  // Validation for each step
  let validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        if (!formData.recipient) {
          setErrorMessage('Please select who will receive this withdraw.');
          return false;
        }
        break;
      case 2:
        if (!formData.firstName || !formData.lastName) {
          setErrorMessage('Please enter both first name and last name.');
          return false;
        }
        if (formData.firstName.trim() === '' || formData.lastName.trim() === '') {
          setErrorMessage('First name and last name cannot be empty.');
          return false;
        }
        break;
      case 3:
        if (!formData.asset) {
          setErrorMessage('Please select an asset to withdraw.');
          return false;
        }
        if (!formData.withdrawAddress) {
          setErrorMessage('Please enter the withdraw address.');
          return false;
        }
        break;
      case 4:
        if (!formData.destinationType) {
          setErrorMessage('Please select the destination type.');
          return false;
        }
        break;
      case 5:
        if (formData.destinationType === 'crypto_exchange' && !formData.exchangeName) {
          setErrorMessage('Please enter the exchange name.');
          return false;
        }
        break;
    }
    return true;
  };

  // Navigation functions
  let goToNextStep = () => {
    if (!validateCurrentStep()) {
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }
    
    if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
      setErrorMessage('');
    }
  };

  let goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setErrorMessage('');
    }
  };

  let isFirstStep = () => currentStep === 1;
  let isLastStep = () => currentStep === 6;

  // Submit address book entry
  let submitAddress = () => {
    if (!validateCurrentStep()) {
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    log('Address book entry submitted:', formData);
    Alert.alert(
      'Address Added',
      'The address has been successfully added to your address book.',
      [{ text: 'OK' }]
    );
  };

  // Render different steps
  let renderStep = () => {
    switch (currentStep) {
      case 1: // Recipient
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepQuestion}>Please tell us who will receive this withdraw. It has 3 options:</Text>
            
            <RadioButton.Group
              onValueChange={(value) => handleInputChange('recipient', value)}
              value={formData.recipient}
            >
              {[
                { id: 'myself', text: 'Myself' },
                { id: 'another_person', text: 'Another Person' },
                { id: 'another_business', text: 'Another Business' }
              ].map((option) => (
                <TouchableOpacity 
                  key={option.id} 
                  style={[
                    styles.radioOption,
                    formData.recipient === option.id && styles.selectedRadioOption
                  ]}
                  onPress={() => handleInputChange('recipient', option.id)}
                >
                  <RadioButton value={option.id} />
                  <Text style={[
                    styles.radioText,
                    formData.recipient === option.id && styles.selectedRadioText
                  ]}>
                    {option.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </RadioButton.Group>
          </View>
        );

      case 2: // Details
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepQuestion}>
              Please supply the firstname & lastname of the recipient. These must match exactly.
            </Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>First Name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter first name"
                value={formData.firstName}
                onChangeText={(value) => handleInputChange('firstName', value)}
                autoCapitalize="words"
                autoFocus={true}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Last Name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter last name"
                value={formData.lastName}
                onChangeText={(value) => handleInputChange('lastName', value)}
                autoCapitalize="words"
              />
            </View>
          </View>
        );

      case 3: // Asset & Withdraw Address
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepQuestion}>What asset are you withdrawing?</Text>
            
            {/* Asset Dropdown */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Select Asset</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setShowAssetDropdown(true)}
              >
                <Text style={[styles.dropdownText, !formData.asset && styles.placeholderText]}>
                  {formData.asset ? assetOptions.find(opt => opt.id === formData.asset)?.label : 'Choose an asset...'}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
            </View>

            {/* Withdraw Address */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Withdraw Address</Text>
              <View style={styles.addressInputContainer}>
                <TextInput
                  style={[styles.textInput, styles.addressInput]}
                  placeholder="Enter wallet address or scan QR code"
                  value={formData.withdrawAddress}
                  onChangeText={(value) => handleInputChange('withdrawAddress', value)}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity 
                  style={styles.qrButton}
                  onPress={() => setShowQRScanner(true)}
                >
                  <Text style={styles.qrButtonText}>📷 QR</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Asset Dropdown Modal */}
            <Modal
              visible={showAssetDropdown}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setShowAssetDropdown(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Select Asset</Text>
                  {assetOptions.map((option) => (
                    <TouchableOpacity
                      key={option.id}
                      style={styles.modalOption}
                      onPress={() => {
                        handleInputChange('asset', option.id);
                        setShowAssetDropdown(false);
                      }}
                    >
                      <Text style={styles.modalOptionText}>{option.label}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => setShowAssetDropdown(false)}
                  >
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            {/* QR Scanner Component */}
            <QRScanner
              visible={showQRScanner}
              onScanSuccess={handleQRScanSuccess}
              onClose={() => setShowQRScanner(false)}
              title="Scan Wallet Address"
            />
          </View>
        );

      case 4: // Destination Type
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepQuestion}>What is the destination address?</Text>
            
            <RadioButton.Group
              onValueChange={(value) => handleInputChange('destinationType', value)}
              value={formData.destinationType}
            >
              {[
                { id: 'crypto_exchange', text: 'Crypto Exchange' },
                { id: 'hosted_wallet', text: 'Hosted Wallet' },
                { id: 'unhosted_wallet', text: 'Unhosted Wallet' },
                { id: 'dont_know', text: "I don't know" }
              ].map((option) => (
                <TouchableOpacity 
                  key={option.id} 
                  style={[
                    styles.radioOption,
                    formData.destinationType === option.id && styles.selectedRadioOption
                  ]}
                  onPress={() => handleInputChange('destinationType', option.id)}
                >
                  <RadioButton value={option.id} />
                  <Text style={[
                    styles.radioText,
                    formData.destinationType === option.id && styles.selectedRadioText
                  ]}>
                    {option.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </RadioButton.Group>
          </View>
        );

      case 5: // Exchange Information
        return (
          <View style={styles.stepContainer}>
            {formData.destinationType === 'crypto_exchange' ? (
              <>
                <Text style={styles.stepQuestion}>
                  Please provide the name of the exchange you are sending to:
                </Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Exchange Name</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g., Binance, Coinbase, Kraken..."
                    value={formData.exchangeName}
                    onChangeText={(value) => handleInputChange('exchangeName', value)}
                    autoFocus={true}
                    autoCapitalize="words"
                  />
                  <Text style={styles.helperText}>
                    💡 Enter the name of the cryptocurrency exchange
                  </Text>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.stepQuestion}>
                  {formData.destinationType === 'hosted_wallet' && 'Hosted wallet selected - no additional information needed.'}
                  {formData.destinationType === 'unhosted_wallet' && 'Unhosted wallet selected - no additional information needed.'}
                  {formData.destinationType === 'dont_know' && "That's okay - we'll help you identify the destination type later."}
                </Text>
                
                <View style={styles.infoCard}>
                  <Text style={styles.infoCardTitle}>
                    {formData.destinationType === 'hosted_wallet' && 'Hosted Wallet'}
                    {formData.destinationType === 'unhosted_wallet' && 'Unhosted Wallet'}
                    {formData.destinationType === 'dont_know' && 'Unknown Destination'}
                  </Text>
                  <Text style={styles.infoCardText}>
                    {formData.destinationType === 'hosted_wallet' && 
                      'A hosted wallet is managed by a third-party service like a crypto exchange or wallet provider.'}
                    {formData.destinationType === 'unhosted_wallet' && 
                      'An unhosted wallet gives you full control of your private keys and cryptocurrency.'}
                    {formData.destinationType === 'dont_know' && 
                      'Our support team can help you identify the destination type when processing your withdrawal.'}
                  </Text>
                </View>
              </>
            )}
          </View>
        );

      case 6: // Summary
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepQuestion}>Review your address book entry:</Text>
            
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Address Summary</Text>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Recipient:</Text>
                <Text style={styles.summaryValue}>
                  {formData.recipient === 'myself' ? 'Myself' : 
                   formData.recipient === 'another_person' ? 'Another Person' : 
                   'Another Business'}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Name:</Text>
                <Text style={styles.summaryValue}>
                  {formData.firstName} {formData.lastName}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Asset:</Text>
                <Text style={styles.summaryValue}>
                  {formData.asset === 'btc' && '₿ Bitcoin (BTC)'}
                  {formData.asset === 'eth' && 'Ξ Ethereum (ETH)'}
                  {formData.asset === 'gbp' && '£ British Pound (GBP)'}
                  {!formData.asset && 'Not selected'}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Destination Type:</Text>
                <Text style={styles.summaryValue}>
                  {formData.destinationType === 'crypto_exchange' && 'Cryptocurrency Exchange'}
                  {formData.destinationType === 'hosted_wallet' && 'Hosted Wallet'}
                  {formData.destinationType === 'unhosted_wallet' && 'Unhosted Wallet'}
                  {formData.destinationType === 'dont_know' && 'Unknown (to be identified)'}
                  {!formData.destinationType && 'Not selected'}
                </Text>
              </View>

              {formData.destinationType === 'crypto_exchange' && formData.exchangeName && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Exchange:</Text>
                  <Text style={styles.summaryValue}>{formData.exchangeName}</Text>
                </View>
              )}

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Address:</Text>
                <Text style={[styles.summaryValue, styles.addressText]}>
                  {formData.withdrawAddress || 'Not provided'}
                </Text>
              </View>
            </View>
            
            <View style={styles.warningCard}>
              <Text style={styles.warningTitle}>⚠️ Important</Text>
              <Text style={styles.warningText}>
                Please verify the wallet address is correct. Sending to an incorrect address may result in permanent loss of funds.
              </Text>
            </View>

            <Text style={styles.confirmationText}>
              By adding this address, you confirm that all information above is accurate.
            </Text>

            <View style={styles.submitButtonWrapper}>
              <StandardButton
                title="Add to Address Book"
                onPress={submitAddress}
                style={styles.submitButton}
                textStyle={styles.submitButtonText}
              />
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <KeyboardAwareScrollView style={styles.container}>
      <View style={styles.contentWrapper}>
        {/* Header */}
        <Title style={styles.title}>Address Book</Title>
        <Text style={styles.subtitle}>Add a new withdrawal address</Text>

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

        {/* Error Message */}
        {errorMessage && (
          <View style={styles.errorWrapper}>
            <Text style={styles.errorText}>
              <Text style={styles.errorTextBold}>Error: </Text>
              <Text>{errorMessage}</Text>
            </Text>
          </View>
        )}

        {/* Step Content */}
        {renderStep()}

        {/* Navigation Buttons */}
        <View style={styles.navigationWrapper}>
          <TouchableOpacity 
            style={[styles.navButton, styles.backButton, isFirstStep() && styles.disabledButton]}
            onPress={goToPreviousStep}
            disabled={isFirstStep()}
          >
            <Text style={[styles.backButtonText, isFirstStep() && styles.disabledButtonText]}>
              Previous
            </Text>
          </TouchableOpacity>

          {!isLastStep() && (
            <TouchableOpacity 
              style={[styles.navButton, styles.nextButton]}
              onPress={goToNextStep}
            >
              <Text style={styles.nextButtonText}>
                Next
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAwareScrollView>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  contentWrapper: {
    paddingHorizontal: scaledWidth(20),
    paddingBottom: scaledHeight(30),
  },
  title: {
    fontSize: normaliseFont(24),
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
    marginTop: scaledHeight(20),
    marginBottom: scaledHeight(10),
  },
  subtitle: {
    fontSize: normaliseFont(16),
    color: colors.darkGray,
    textAlign: 'center',
    marginBottom: scaledHeight(20),
  },
  progressWrapper: {
    alignItems: 'center',
    marginBottom: scaledHeight(15),
  },
  progressText: {
    fontSize: normaliseFont(16),
    fontWeight: '600',
    color: colors.primary,
    marginBottom: scaledHeight(5),
  },
  progressSubtext: {
    fontSize: normaliseFont(14),
    color: colors.darkGray,
  },
  progressBarContainer: {
    height: scaledHeight(4),
    backgroundColor: colors.lightGray,
    borderRadius: scaledHeight(2),
    marginBottom: scaledHeight(25),
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: scaledHeight(2),
  },
  errorWrapper: {
    marginBottom: scaledHeight(15),
    paddingHorizontal: scaledWidth(15),
    paddingVertical: scaledHeight(12),
    backgroundColor: colors.errorBackground,
    borderRadius: 8,
  },
  errorText: {
    fontSize: normaliseFont(14),
    color: colors.error,
  },
  errorTextBold: {
    fontWeight: 'bold',
  },
  stepContainer: {
    marginBottom: scaledHeight(30),
  },
  stepQuestion: {
    fontSize: normaliseFont(16),
    color: colors.darkGray,
    marginBottom: scaledHeight(20),
    lineHeight: normaliseFont(24),
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scaledHeight(12),
    paddingHorizontal: scaledWidth(16),
    paddingVertical: scaledHeight(14),
    borderWidth: 2,
    borderColor: colors.lightGray,
    borderRadius: 12,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedRadioOption: {
    borderColor: colors.primary,
    backgroundColor: '#f0f7ff',
    shadowOpacity: 0.15,
  },
  radioText: {
    fontSize: normaliseFont(15),
    color: colors.darkGray,
    marginLeft: scaledWidth(12),
    flex: 1,
    lineHeight: normaliseFont(22),
  },
  selectedRadioText: {
    color: colors.primary,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: scaledHeight(20),
  },
  inputLabel: {
    fontSize: normaliseFont(14),
    fontWeight: '600',
    color: colors.darkGray,
    marginBottom: scaledHeight(8),
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: 8,
    paddingHorizontal: scaledWidth(12),
    paddingVertical: scaledHeight(12),
    fontSize: normaliseFont(14),
    backgroundColor: colors.white,
  },
  textArea: {
    height: scaledHeight(80),
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: normaliseFont(12),
    color: colors.darkGray,
    marginTop: scaledHeight(5),
    fontStyle: 'italic',
  },
  summaryContainer: {
    backgroundColor: colors.lightBackground,
    borderRadius: 12,
    padding: scaledWidth(16),
    marginBottom: scaledHeight(20),
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: scaledHeight(12),
    paddingBottom: scaledHeight(8),
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  summaryLabel: {
    fontSize: normaliseFont(14),
    fontWeight: '600',
    color: colors.darkGray,
    flex: 1,
  },
  summaryValue: {
    fontSize: normaliseFont(14),
    color: colors.darkGray,
    flex: 2,
    textAlign: 'right',
  },
  addressText: {
    fontFamily: 'monospace',
    fontSize: normaliseFont(12),
    flexWrap: 'wrap',
  },
  submitButtonWrapper: {
    marginTop: scaledHeight(10),
  },
  submitButton: {
    backgroundColor: colors.success,
  },
  submitButtonText: {
    color: colors.white,
    fontWeight: 'bold',
  },
  navigationWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: scaledHeight(30),
  },
  navButton: {
    paddingHorizontal: scaledWidth(24),
    paddingVertical: scaledHeight(12),
    borderRadius: 8,
    minWidth: scaledWidth(100),
    alignItems: 'center',
  },
  backButton: {
    backgroundColor: colors.lightGray,
  },
  nextButton: {
    backgroundColor: colors.primary,
  },
  disabledButton: {
    backgroundColor: colors.lightGray,
    opacity: 0.5,
  },
  backButtonText: {
    fontSize: normaliseFont(14),
    fontWeight: '600',
    color: colors.darkGray,
  },
  nextButtonText: {
    fontSize: normaliseFont(14),
    fontWeight: '600',
    color: colors.white,
  },
  disabledButtonText: {
    color: colors.lightGray,
  },
  
  // Dropdown styles
  dropdownButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: 8,
    padding: scaledHeight(15),
    marginVertical: scaledHeight(10),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  dropdownButtonText: {
    fontSize: normaliseFont(16),
    color: colors.darkGray,
  },
  
  dropdownPlaceholder: {
    fontSize: normaliseFont(16),
    color: colors.mediumGray,
  },
  
  dropdownArrow: {
    fontSize: normaliseFont(16),
    color: colors.mediumGray,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: scaledWidth(20),
    width: '80%',
    maxHeight: '70%',
  },
  
  modalTitle: {
    fontSize: normaliseFont(18),
    fontWeight: 'bold',
    marginBottom: scaledHeight(15),
    textAlign: 'center',
    color: colors.darkGray,
  },
  
  modalOption: {
    padding: scaledHeight(15),
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  modalOptionText: {
    fontSize: normaliseFont(16),
    marginLeft: scaledWidth(10),
    color: colors.darkGray,
  },
  
  modalCloseButton: {
    marginTop: scaledHeight(15),
    backgroundColor: colors.mediumGray,
    padding: scaledHeight(12),
    borderRadius: 8,
    alignItems: 'center',
  },
  
  modalCloseButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: normaliseFont(14),
  },

  // QR Scanner styles
  qrButton: {
    backgroundColor: colors.primary,
    padding: scaledHeight(15),
    borderRadius: 8,
    marginTop: scaledHeight(10),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  qrButtonText: {
    color: colors.white,
    fontWeight: '600',
    marginLeft: scaledWidth(8),
    fontSize: normaliseFont(14),
  },

  // Info card styles
  infoCard: {
    backgroundColor: '#e3f2fd',
    padding: scaledWidth(15),
    borderRadius: 8,
    marginVertical: scaledHeight(10),
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  
  infoCardTitle: {
    fontSize: normaliseFont(16),
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: scaledHeight(5),
  },
  
  infoCardText: {
    fontSize: normaliseFont(14),
    color: colors.darkGray,
    lineHeight: scaledHeight(20),
  },

  // Summary styles
  summaryCard: {
    backgroundColor: colors.lightBackground,
    padding: scaledWidth(16),
    borderRadius: 8,
    marginVertical: scaledHeight(10),
    borderWidth: 1,
    borderColor: colors.lightGray,
  },
  
  summaryTitle: {
    fontSize: normaliseFont(18),
    fontWeight: 'bold',
    color: colors.darkGray,
    marginBottom: scaledHeight(15),
    textAlign: 'center',
  },

  // Warning card styles
  warningCard: {
    backgroundColor: '#fff3cd',
    padding: scaledWidth(15),
    borderRadius: 8,
    marginVertical: scaledHeight(10),
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  
  warningTitle: {
    fontSize: normaliseFont(16),
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: scaledHeight(5),
  },
  
  warningText: {
    fontSize: normaliseFont(14),
    color: '#856404',
    lineHeight: scaledHeight(20),
  },
  
  confirmationText: {
    fontSize: normaliseFont(14),
    color: colors.mediumGray,
    textAlign: 'center',
    marginVertical: scaledHeight(10),
    fontStyle: 'italic',
  },
});

export default AddressBook;
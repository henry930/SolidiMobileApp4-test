// React imports
import React, { useState, useContext, useEffect } from 'react';
import { Text, TextInput, StyleSheet, View, ScrollView, TouchableOpacity, Alert, Modal } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { RadioButton, Title } from 'react-native-paper';

// Internal imports
import { StandardButton, QRScanner } from 'src/components/atomic';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import { colors } from 'src/constants';
import AppStateContext from 'src/application/data';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('AddressBook');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);

let AddressBook = (props) => {
  // Get app state for API access
  let appState = useContext(AppStateContext);
  
  // Navigation state
  let [currentStep, setCurrentStep] = useState(1);
  let [formData, setFormData] = useState({
    recipient: '',
    firstName: '',
    lastName: '',
    asset: '',
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
  let [submitStatus, setSubmitStatus] = useState(''); // New status message

  // Render trigger for state updates
  let [renderCount, setRenderCount] = useState(0);
  let triggerRender = (newRenderCount) => setRenderCount(newRenderCount);

  // State change tracking
  let [stateChangeID, setStateChangeID] = useState(appState.stateChangeID);

  // Setup effect - Initialize API client and other required setup
  useEffect(() => {
    console.log('🔧 AddressBook: Component mounted, calling setup...');
    setup();
  }, []); // Pass empty array so that this only runs once on mount.

  let setup = async () => {
    try {
      console.log('🔧 AddressBook: Calling appState.generalSetup...');
      await appState.generalSetup({caller: 'AddressBook'});
      console.log('✅ AddressBook: generalSetup completed successfully');
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
      triggerRender(renderCount + 1);
    } catch (err) {
      let msg = `AddressBook.setup: Error = ${err}`;
      console.log('❌ AddressBook setup error:', msg);
    }
  };

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
    { id: 'usdc', label:'USD Coin (USDC)' },
    { id: 'bnb', label: 'Binance Coin (BNB)' },
    { id: 'gbp', label: 'British Pound (GBP)' }
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
    console.log('🔍 AddressBook: validateCurrentStep called for step:', currentStep);
    switch (currentStep) {
      case 1:
        console.log('🔍 AddressBook: Validating step 1 - recipient:', formData.recipient);
        if (!formData.recipient) {
          setErrorMessage('Please select who will receive this withdraw.');
          return false;
        }
        break;
      case 2:
        console.log('🔍 AddressBook: Validating step 2 - names:', formData.firstName, formData.lastName);
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
        console.log('🔍 AddressBook: Validating step 3 - asset:', formData.asset);
        if (!formData.asset) {
          setErrorMessage('Please select an asset to withdraw.');
          return false;
        }
        
        if (formData.asset === 'gbp') {
          // Validate GBP bank details
          console.log('🔍 AddressBook: Validating GBP bank details:', {
            accountName: formData.accountName,
            sortCode: formData.sortCode,
            accountNumber: formData.accountNumber
          });
          
          if (!formData.accountName) {
            setErrorMessage('Please enter the account holder name.');
            return false;
          }
          if (!formData.sortCode) {
            setErrorMessage('Please enter the sort code.');
            return false;
          }
          if (!formData.accountNumber) {
            setErrorMessage('Please enter the account number.');
            return false;
          }
          
          // Validate sort code format (should be 6 digits, can have dashes)
          const sortCodeRegex = /^\d{2}-?\d{2}-?\d{2}$/;
          if (!sortCodeRegex.test(formData.sortCode)) {
            setErrorMessage('Sort code must be in format 12-34-56 or 123456.');
            return false;
          }
          
          // Validate account number (should be 6-12 digits)
          const accountNumberRegex = /^\d{6,12}$/;
          if (!accountNumberRegex.test(formData.accountNumber)) {
            setErrorMessage('Account number must be 6-12 digits.');
            return false;
          }
        } else {
          // Validate crypto address
          console.log('🔍 AddressBook: Validating crypto address:', formData.withdrawAddress);
          if (!formData.withdrawAddress) {
            setErrorMessage('Please enter the withdraw address.');
            return false;
          }
        }
        break;
      case 4:
        console.log('🔍 AddressBook: Validating step 4 - destinationType:', formData.destinationType);
        if (!formData.destinationType) {
          setErrorMessage('Please select the destination type.');
          return false;
        }
        break;
      case 5:
        console.log('🔍 AddressBook: Validating step 5 - destinationType:', formData.destinationType, 'exchangeName:', formData.exchangeName);
        if (formData.destinationType === 'crypto_exchange' && !formData.exchangeName) {
          setErrorMessage('Please enter the exchange name.');
          return false;
        }
        break;
      case 6:
        console.log('🔍 AddressBook: Validating step 6 (Summary) - all form data:', formData);
        // Step 6 is summary, no additional validation needed
        break;
    }
    console.log('✅ AddressBook: Validation passed for step:', currentStep);
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

  // Submit address book entry to API
  let submitAddress = async () => {
    console.log('🚀 AddressBook: submitAddress called!');
    console.log('🚀 AddressBook: Current step:', currentStep);
    console.log('🚀 AddressBook: Form data:', formData);
    
    if (!validateCurrentStep()) {
      console.log('❌ AddressBook: Validation failed');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }
    console.log('✅ AddressBook: Validation passed');

    if (!appState) {
      console.log('❌ AddressBook: No appState available');
      setSubmitError('App state not available');
      return;
    }
    console.log('✅ AddressBook: AppState available');
    
    if (!appState.apiClient) {
      console.log('❌ AddressBook: No API client available');
      setSubmitError('API client not available');
      return;
    }
    console.log('✅ AddressBook: API client available');

    try {
      setIsSubmitting(true);
      setSubmitError('');
      setSubmitStatus('🔄 Preparing submission...');
      console.log('🔄 AddressBook: Starting submission...');
      
      log('Address book entry being submitted:', formData);
      
      // Determine address type based on destination
      let addressType = 'CRYPTO_UNHOSTED'; // Default
      if (formData.destinationType === 'hosted_wallet') {
        addressType = 'CRYPTO_HOSTED';
      } else if (formData.destinationType === 'exchange') {
        addressType = 'CRYPTO_HOSTED';
      } else if (formData.destinationType === 'thirdParty') {
        addressType = 'CRYPTO_UNHOSTED';
      }
      
      // Transform form data to API format (matching test-addressbook.js structure)
      setSubmitStatus('🔄 Preparing API data...');
      
      let apiPayload;
      if (formData.asset === 'gbp') {
        // For GBP, use bank account details directly (not nested in address object)
        apiPayload = {
          name: `${formData.firstName} ${formData.lastName}`.trim() || formData.recipient,
          asset: formData.asset.toUpperCase(),
          network: formData.asset.toUpperCase(),
          accountName: formData.accountName,
          sortCode: formData.sortCode.replace(/-/g, ''), // Remove dashes from sort code
          accountNumber: formData.accountNumber,
          thirdparty: formData.destinationType === 'thirdParty'
        };
      } else {
        // For crypto assets, use nested address object structure
        let addressObject = {
          firstname: (formData.firstName && formData.firstName.trim()) ? formData.firstName.trim() : null,
          lastname: (formData.lastName && formData.lastName.trim()) ? formData.lastName.trim() : null,
          business: (formData.exchangeName && formData.exchangeName.trim()) ? formData.exchangeName.trim() : null,
          address: formData.withdrawAddress,
          dtag: null,
          vasp: null
        };
        
        apiPayload = {
          name: `${formData.firstName} ${formData.lastName}`.trim() || formData.recipient,
          asset: formData.asset.toUpperCase(),
          network: formData.asset.toUpperCase(),
          address: addressObject,
          thirdparty: formData.destinationType === 'thirdParty'
        };
      }
      
      console.log('📝 AddressBook: API payload prepared:', apiPayload);
      console.log('📝 AddressBook: Address type:', addressType);
      log('API payload prepared:', apiPayload);
      
      // Make API call using the same pattern as AddressBookManagement
      setSubmitStatus('🌐 Sending to server...');
      console.log('🌐 AddressBook: Making API call...');
      console.log('🌐 AddressBook: API Route:', `addressBook/${formData.asset.toUpperCase()}/${addressType}`);
      console.log('🌐 AddressBook: HTTP Method: POST');
      console.log('🌐 AddressBook: API Payload:', JSON.stringify(apiPayload, null, 2));
      
      // Special logging for GBP requests
      if (formData.asset === 'gbp') {
        console.log('🏦 GBP-SPECIFIC DEBUG:');
        console.log('🏦 Asset:', formData.asset);
        console.log('🏦 Network:', formData.asset.toUpperCase());
        console.log('🏦 Address Type:', addressType);
        console.log('🏦 Bank Details (Direct Payload):');
        console.log('🏦   - Account Name:', apiPayload.accountName);
        console.log('🏦   - Sort Code (no dashes):', apiPayload.sortCode);
        console.log('🏦   - Account Number:', apiPayload.accountNumber);
        console.log('🏦   - Name:', apiPayload.name);
        console.log('🏦   - Third Party:', apiPayload.thirdparty);
        console.log('🏦 Full Route:', `addressBook/${formData.asset.toUpperCase()}/${addressType}`);
        console.log('🏦 NEW GBP Payload Structure:', JSON.stringify(apiPayload, null, 2));
      }
      
      // Create abort controller for this request
      const abortController = appState.createAbortController({tag: 'addAddress'});
      
      let result = await appState.apiClient.privateMethod({
        httpMethod: 'POST',
        apiRoute: `addressBook/${formData.asset.toUpperCase()}/${addressType}`,
        params: apiPayload,
        abortController
      });
      
      setSubmitStatus('📥 Processing response...');
      console.log('🌐 AddressBook: ===== API RESPONSE START =====');
      console.log('🌐 AddressBook: Raw API Response:', result);
      console.log('🌐 AddressBook: Response Type:', typeof result);
      console.log('🌐 AddressBook: Response Keys:', result ? Object.keys(result) : 'null');
      if (result) {
        console.log('🌐 AddressBook: Response Success:', result.success);
        console.log('🌐 AddressBook: Response Data:', result.data);
        console.log('🌐 AddressBook: Response Error:', result.error);
        console.log('🌐 AddressBook: Response Status:', result.status);
        console.log('🌐 AddressBook: Response Message:', result.message);
      }
      console.log('🌐 AddressBook: ===== API RESPONSE END =====');
      
      console.log('✅ AddressBook: API call completed');
      log('Address book API response:', result);
      
      // Check for success - API should return success:true OR no error property
      const isSuccess = result && (result.success === true || (!result.error && !result.message));
      const hasError = result && (result.error || result.message);
      
      console.log('🔍 AddressBook: Success Analysis:');
      console.log('🔍   - Has result:', !!result);
      console.log('🔍   - result.success:', result?.success);
      console.log('🔍   - result.error:', result?.error);
      console.log('🔍   - result.message:', result?.message);
      console.log('🔍   - isSuccess:', isSuccess);
      console.log('🔍   - hasError:', hasError);
      
      if (isSuccess && !hasError) {
        setSubmitStatus('✅ Address saved successfully!');
        console.log('✅ AddressBook: SUCCESS - API returned positive response');
        console.log('✅ AddressBook: Success criteria met - showing success alert');
        
        // Set a visible success message
        setSubmitError('');
        console.log('✅ AddressBook: About to show success Alert');
        
        // Create appropriate success message based on asset type
        let successMessage;
        if (formData.asset === 'gbp') {
          successMessage = `${formData.firstName} ${formData.lastName}'s ${formData.asset.toUpperCase()} bank account has been successfully added to your address book.\n\nAccount: ${formData.accountName}\nSort Code: ${formData.sortCode}\nAccount Number: ${formData.accountNumber}`;
        } else {
          successMessage = `${formData.firstName} ${formData.lastName}'s ${formData.asset.toUpperCase()} address has been successfully added to your address book.\n\nAddress: ${formData.withdrawAddress.substring(0, 20)}...`;
        }
        
        Alert.alert(
          'Address Added Successfully! ✅',
          successMessage,
          [{ 
            text: 'OK', 
            onPress: () => {
              console.log('✅ AddressBook: User pressed OK on success alert - resetting form...');
              
              // Clear address book cache for this asset to force refresh
              if (appState.clearAddressBookCache && typeof appState.clearAddressBookCache === 'function') {
                console.log('🧹 AddressBook: Clearing address book cache for', formData.asset);
                appState.clearAddressBookCache(formData.asset.toUpperCase());
              }
              
              // Reset form but DON'T navigate away for debugging
              setCurrentStep(1);
              setFormData({
                recipient: '',
                firstName: '',
                lastName: '',
                asset: '',
                withdrawAddress: '',
                destinationType: '',
                exchangeName: '',
                // Reset GBP-specific fields
                accountName: '',
                sortCode: '',
                accountNumber: ''
              });
              setSubmitStatus('');
              console.log('✅ AddressBook: Form reset completed - staying on page for debugging');
              
              // Call the onAddressAdded callback if provided
              if (props && props.onAddressAdded) {
                console.log('✅ AddressBook: Calling onAddressAdded callback');
                props.onAddressAdded();
              }
            }
          }]
        );
        console.log('✅ AddressBook: Success Alert displayed');
      } else {
        setSubmitStatus('❌ Failed to save address');
        console.log('❌ AddressBook: FAILURE - API returned error response');
        console.log('❌ AddressBook: Response indicates failure, throwing error');
        
        // Extract error message from various possible locations
        let errorDetails = result?.error || result?.message || 'Failed to add address';
        if (typeof errorDetails === 'string' && errorDetails.startsWith('Error: ')) {
          errorDetails = errorDetails.substring(7); // Remove "Error: " prefix
        }
        
        console.log('❌ AddressBook: Error details:', errorDetails);
        throw new Error(errorDetails);
      }
      
    } catch (error) {
      setSubmitStatus('❌ Submission failed');
      console.log('❌ AddressBook: Exception caught:', error);
      console.log('❌ AddressBook: Error message:', error.message);
      console.log('❌ AddressBook: Error stack:', error.stack);
      log('Error submitting address book entry:', error);
      let errorMsg = error.message || 'Failed to add address to address book';
      setSubmitError(errorMsg);
      Alert.alert(
        'Error Adding Address ❌',
        `Failed to add address to your address book.\n\nError: ${errorMsg}`,
        [{ text: 'OK' }]
      );
    } finally {
      console.log('🏁 AddressBook: Submission process complete');
      setIsSubmitting(false);
      // Keep status message visible for a few seconds
      setTimeout(() => {
        setSubmitStatus('');
      }, 3000);
    }
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

            {/* Conditional Address/Bank Details Section */}
            {formData.asset === 'gbp' ? (
              // GBP Bank Details Form
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Account Name</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter account holder name"
                    value={formData.accountName}
                    onChangeText={(value) => handleInputChange('accountName', value)}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Sort Code</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="12-34-56"
                    value={formData.sortCode}
                    onChangeText={(value) => handleInputChange('sortCode', value)}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="numeric"
                    maxLength={8}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Account Number</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter bank account number"
                    value={formData.accountNumber}
                    onChangeText={(value) => handleInputChange('accountNumber', value)}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="numeric"
                    maxLength={12}
                  />
                </View>
              </>
            ) : (
              // Crypto Address Form
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
            )}

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
                title={isSubmitting ? "Adding Address..." : "Add to Address Book"}
                onPress={() => {
                  console.log('🔥 AddressBook: Button pressed!');
                  submitAddress();
                }}
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                textStyle={styles.submitButtonText}
                disabled={isSubmitting}
              />
              {submitStatus ? (
                <Text style={styles.submitStatusText}>{submitStatus}</Text>
              ) : null}
              {submitError ? (
                <Text style={styles.submitErrorText}>{submitError}</Text>
              ) : null}
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
  submitButtonDisabled: {
    backgroundColor: colors.gray,
    opacity: 0.6,
  },
  submitErrorText: {
    color: colors.error,
    fontSize: normaliseFont(12),
    textAlign: 'center',
    marginTop: scaledHeight(8),
  },
  submitStatusText: {
    color: colors.primary,
    fontSize: normaliseFont(12),
    textAlign: 'center',
    marginTop: scaledHeight(8),
    fontWeight: '600',
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
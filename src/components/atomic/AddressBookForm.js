// React imports
import React, { useState, useContext, useEffect, useRef } from 'react';
import { Text, TextInput, StyleSheet, View, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { RadioButton, IconButton } from 'react-native-paper';

// Internal imports
import { StandardButton, QRScanner } from 'src/components/atomic';
import ContactPickerModal from 'src/components/atomic/ContactPickerModal';
import VaspSearchModal from 'src/components/atomic/VaspSearchModal';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import { colors } from 'src/constants';
import AppStateContext from 'src/application/data';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('AddressBookForm');
let { deb, dj, log, lj } = logger.getShortcuts(logger2);

/**
 * AddressBookForm - Shared component for adding addresses to the address book
 * Used by both AddressBook page and AddressBookModal popup
 * 
 * @param {Object} props
 * @param {string} props.selectedAsset - Pre-selected asset (optional)
 * @param {Function} props.onSuccess - Callback when address is added successfully
 * @param {Function} props.onCancel - Callback when user cancels (optional)
 * @param {boolean} props.showHeader - Whether to show the title/header (default: true)
 * @param {boolean} props.standalone - Whether this is standalone page or modal (default: false)
 */
let AddressBookForm = ({
  selectedAsset = '',
  onSuccess,
  onCancel,
  showHeader = true,
  standalone = false
}) => {
  // Get app state for API access
  let appState = useContext(AppStateContext);

  // Navigation state
  let [currentStep, setCurrentStep] = useState(1);
  let [formData, setFormData] = useState({
    recipient: '',
    firstName: '',
    lastName: '',
    asset: selectedAsset ? selectedAsset.toLowerCase() : '',
    withdrawAddress: '',
    destinationType: '',
    exchangeName: '',
    // GBP-specific fields
    accountName: '',
    sortCode: '',
    accountNumber: ''
    ,
    vasp: null // selected VASP object or id when exchange is selected
  });
  let [errorMessage, setErrorMessage] = useState('');
  let [showAssetDropdown, setShowAssetDropdown] = useState(false);
  let [showQRScanner, setShowQRScanner] = useState(false);
  let [manualInput, setManualInput] = useState(false); // For "another_person" option
  let [showContactPicker, setShowContactPicker] = useState(false); // Contact picker modal
  let [showVaspSearch, setShowVaspSearch] = useState(false); // VASP search modal
  let [assetSearchQuery, setAssetSearchQuery] = useState(''); // Asset search filter

  // API submission state
  let [isSubmitting, setIsSubmitting] = useState(false);
  let [submitError, setSubmitError] = useState('');
  let [submitStatus, setSubmitStatus] = useState('');

  const lastSelectedAssetRef = useRef(selectedAsset ? selectedAsset.toLowerCase() : '');

  // Update asset when selectedAsset prop changes
  useEffect(() => {
    if (selectedAsset && selectedAsset.toLowerCase() !== lastSelectedAssetRef.current) {
      lastSelectedAssetRef.current = selectedAsset.toLowerCase();
      setFormData(prev => ({ ...prev, asset: selectedAsset.toLowerCase() }));
    }
  }, [selectedAsset]);

  // State for dynamic asset options
  const [dynamicAssetOptions, setDynamicAssetOptions] = useState([]);

  // Ensure API client is initialized and load balance data
  useEffect(() => {
    const initializeApiClient = async () => {
      console.log('🔧 AddressBookForm: Checking API client...');
      console.log('🔧 AddressBookForm: appState exists?', !!appState);
      console.log('🔧 AddressBookForm: apiClient exists?', !!appState?.apiClient);
      console.log('🔧 AddressBookForm: apiClient.post exists?', !!appState?.apiClient?.post);

      // If apiClient is not initialized, call generalSetup
      if (!appState?.apiClient?.post) {
        console.log('⚠️ AddressBookForm: API client not ready, calling generalSetup...');
        try {
          await appState.generalSetup({ caller: 'AddressBookForm' });
          console.log('✅ AddressBookForm: generalSetup completed');
        } catch (err) {
          console.error('❌ AddressBookForm: generalSetup failed:', err);
        }
      } else {
        console.log('✅ AddressBookForm: API client already initialized');
      }

      // Use cached balance data to populate asset options
      // Balance data is loaded during authentication
      try {
        console.log('✅ AddressBookForm: Using cached balance data');
        // Generate asset options from cached balance data
        const newOptions = getAssetOptions();
        console.log('📋 AddressBookForm: Asset options generated:', newOptions);
        setDynamicAssetOptions(newOptions);
      } catch (err) {
        console.error('❌ AddressBookForm: Failed to get asset options:', err);
        // Use fallback options
        setDynamicAssetOptions(getAssetOptions());
      }
    };

    initializeApiClient();
  }, []); // Run once on mount

  // Step configuration
  const steps = [
    { id: 1, title: 'Recipient', subtitle: 'Who will receive this withdraw?' },
    { id: 2, title: 'Details', subtitle: 'Recipient information' },
    { id: 3, title: 'Asset', subtitle: 'What are you withdrawing?' },
    { id: 4, title: 'Destination', subtitle: 'What is the destination address?' },
    { id: 5, title: 'Wallet', subtitle: 'Exchange information' },
    { id: 6, title: 'Summary', subtitle: 'Review and confirm' }
  ];

  // Asset options for dropdown - dynamically loaded from ticker API
  const getAssetOptions = () => {
    // Get available crypto assets from ticker API
    // Ticker data format: {"BTC/GBP": {...}, "ETH/GBP": {...}, ...}
    let tickerData = appState?.state?.apiData?.ticker || {};

    console.log('🔍 DEBUG: Checking ticker data...');
    console.log('🔍 DEBUG: appState exists?', !!appState);
    console.log('🔍 DEBUG: appState.state exists?', !!appState?.state);
    console.log('🔍 DEBUG: apiData exists?', !!appState?.state?.apiData);
    console.log('🔍 DEBUG: ticker exists?', !!appState?.state?.apiData?.ticker);
    console.log('🔍 DEBUG: ticker keys:', Object.keys(tickerData));
    console.log('🔍 DEBUG: ticker keys count:', Object.keys(tickerData).length);


    if (tickerData && Object.keys(tickerData).length > 0) {
      console.log('📊 AddressBookForm: Using ticker data for asset list');

      // Extract unique crypto assets from ticker pairs (e.g., "BTC/GBP" -> "BTC")
      let cryptoAssets = new Set();
      Object.keys(tickerData).forEach(pair => {
        let [asset, quote] = pair.split('/');
        cryptoAssets.add(asset.toLowerCase());
      });

      // Convert to array and map to asset options format
      let assetList = Array.from(cryptoAssets);
      console.log(`📊 Found ${assetList.length} crypto assets from ticker:`, assetList);

      return assetList.map(asset => {
        let displayName = appState.getAssetInfo(asset)?.displayString || asset.toUpperCase();
        return {
          id: asset.toLowerCase(),
          label: displayName
        };
      }).sort((a, b) => a.label.localeCompare(b.label)); // Sort alphabetically
    }

    console.log('⚠️ AddressBookForm: No ticker data available, using fallback assets');
    // Fallback to hardcoded list if ticker API not available
    return [
      { id: 'btc', label: 'Bitcoin (BTC)' },
      { id: 'eth', label: 'Ethereum (ETH)' },
      { id: 'usdt', label: 'Tether (USDT)' },
      { id: 'usdc', label: 'USD Coin (USDC)' },
      { id: 'bnb', label: 'Binance Coin (BNB)' },
      { id: 'gbp', label: 'British Pound (GBP)' }
    ];
  };

  // Use dynamic asset options if loaded, otherwise use initial options
  const assetOptions = dynamicAssetOptions.length > 0 ? dynamicAssetOptions : getAssetOptions();

  // Contact picker handlers
  const openContactPicker = () => {
    setShowContactPicker(true);
  };

  const handleContactSelect = (contact) => {
    console.log('📱 Contact selected:', contact);
    setFormData(prev => ({
      ...prev,
      firstName: contact.firstName,
      lastName: contact.lastName
    }));
    setShowContactPicker(false);
    setManualInput(true); // Show the filled form
  };

  const handleContactPickerCancel = () => {
    setShowContactPicker(false);
  };

  // Handle input changes
  let handleInputChange = async (field, value) => {
    // Special handling for recipient selection
    if (field === 'recipient') {
      if (value === 'myself') {
        console.log('=== AUTOFILL START ===');

        // Check if user info is loaded
        const userInfoObject = appState?.user?.info?.user;
        console.log('AUTOFILL: userInfoObject:', JSON.stringify(userInfoObject, null, 2));
        console.log('AUTOFILL: isEmpty?', !userInfoObject || Object.keys(userInfoObject).length === 0);

        // If user info is empty, try to load it
        if (!userInfoObject || Object.keys(userInfoObject).length === 0) {
          console.log('AUTOFILL: Loading user info...');
          if (appState.loadUserInfo) {
            try {
              await appState.loadUserInfo();
              console.log('AUTOFILL: Loaded. New data:', JSON.stringify(appState?.user?.info?.user, null, 2));
            } catch (err) {
              console.log('AUTOFILL: Load error:', err);
            }
          }
        }

        // Get the names
        let userFirstName = '';
        let userLastName = '';

        if (appState.getUserInfo) {
          const fn = appState.getUserInfo('firstname');
          const ln = appState.getUserInfo('lastname');
          console.log('AUTOFILL: getUserInfo results - firstname:', fn, ', lastname:', ln);
          if (fn && fn !== '[loading]') userFirstName = fn;
          if (ln && ln !== '[loading]') userLastName = ln;
        }

        if (!userFirstName || !userLastName) {
          const userData = appState?.user?.info?.user || {};
          if (!userFirstName) userFirstName = userData.firstname || userData.firstName || '';
          if (!userLastName) userLastName = userData.lastname || userData.lastName || '';
        }

        console.log('AUTOFILL: Final - firstName:', userFirstName, ', lastName:', userLastName);
        console.log('=== AUTOFILL END ===');

        setFormData(prev => ({
          ...prev,
          recipient: value,
          firstName: userFirstName,
          lastName: userLastName
        }));
        setManualInput(false);
      } else if (value === 'another_person') {
        // Reset names and show manual input option
        setFormData(prev => ({
          ...prev,
          recipient: value,
          firstName: '',
          lastName: ''
        }));
        setManualInput(false); // Will show choice between contacts/manual
      } else {
        // another_business - set lastName to "-"
        setFormData(prev => ({
          ...prev,
          recipient: value,
          firstName: '',
          lastName: '-'
        }));
        setManualInput(false);
      }
    } else {
      // Normal field update
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }

    setErrorMessage(''); // Clear error on input
    setSubmitError(''); // Clear submit error on input

  };

  // Navigation functions
  let goToNextStep = () => {
    if (validateCurrentStep()) {
      let nextStep = currentStep + 1;

      // Skip step 5 (wallet info) for GBP since it's not needed
      if (nextStep === 5 && formData.asset.toLowerCase() === 'gbp') {
        nextStep = 6;
      }

      setCurrentStep(Math.min(nextStep, steps.length));
    } else {
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  let goToPreviousStep = () => {
    let prevStep = currentStep - 1;

    // Skip step 5 (wallet info) for GBP when going backwards
    if (prevStep === 5 && formData.asset.toLowerCase() === 'gbp') {
      prevStep = 4;
    }

    // Reset manual input mode when going back to step 1
    if (prevStep === 1) {
      setManualInput(false);
    }

    setCurrentStep(Math.max(prevStep, 1));
    setErrorMessage('');
  };

  let isLastStep = () => currentStep === 6;

  // Validation function
  let validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        if (!formData.recipient) {
          setErrorMessage('Please select a recipient option');
          return false;
        }
        break;

      case 2:
        if (!formData.firstName.trim()) {
          setErrorMessage(formData.recipient === 'another_business' ? 'Company name is required' : 'First name is required');
          return false;
        }
        // For businesses, lastName is automatically set to "-"
        if (formData.recipient !== 'another_business' && !formData.lastName.trim()) {
          setErrorMessage('Last name is required');
          return false;
        }
        // Validation: Only check that fields are not empty
        // We allow all characters to support international names, special characters, etc.
        // As per requirements: "In general we should not try to limit characters like this - its a never ending problem."
        break;

      case 3:
        console.log('🔍 [VALIDATION] Step 3 - Asset selection');
        console.log('🔍 [VALIDATION] formData.asset:', formData.asset);
        console.log('🔍 [VALIDATION] formData.asset type:', typeof formData.asset);
        console.log('🔍 [VALIDATION] formData.asset.trim():', formData.asset ? formData.asset.trim() : 'N/A');

        if (!formData.asset || formData.asset.trim() === '') {
          console.log('❌ [VALIDATION] Asset validation FAILED - no asset selected');
          setErrorMessage('Please select an asset');
          return false;
        }
        console.log('✅ [VALIDATION] Asset validation PASSED');
        break;

      case 4:
        // Different validation for GBP vs crypto
        if (formData.asset.toLowerCase() === 'gbp') {
          if (!formData.accountName.trim()) {
            setErrorMessage('Account name is required');
            return false;
          }
          if (!formData.sortCode.trim()) {
            setErrorMessage('Sort code is required');
            return false;
          }
          if (!formData.accountNumber.trim()) {
            setErrorMessage('Account number is required');
            return false;
          }
          // UK sort code format: XX-XX-XX
          if (!/^\d{2}-\d{2}-\d{2}$/.test(formData.sortCode)) {
            setErrorMessage('Sort code must be in format: XX-XX-XX (e.g., 12-34-56)');
            return false;
          }
          // UK account number: 8 digits
          if (!/^\d{8}$/.test(formData.accountNumber)) {
            setErrorMessage('Account number must be 8 digits');
            return false;
          }
        } else {
          // Crypto address - NO VALIDATION
          // Per Issue #80: No validation API available, different cryptocurrencies have different address formats
          // Validation will be handled server-side during actual withdrawal
        }
        break;

      case 5:
        if (!formData.destinationType) {
          setErrorMessage('Please select destination type');
          return false;
        }
        if (formData.destinationType === 'exchange') {
          if (!formData.exchangeName.trim()) {
            setErrorMessage('Exchange name is required');
            return false;
          }
        }
        break;

      case 6:
        // Final validation before submission
        return true;
    }
    return true;
  };

  // Helper to check if Next button should be disabled
  const isNextButtonDisabled = () => {
    switch (currentStep) {
      case 1: // Recipient
        return !formData.recipient;
      case 2: // Name
        if (!formData.firstName.trim()) return true;
        if (formData.recipient !== 'another_business' && !formData.lastName.trim()) return true;
        return false;
      case 3: // Asset
        return !formData.asset || formData.asset.trim() === '';
      case 4: // Destination
        if (formData.asset.toLowerCase() === 'gbp') {
          return !formData.accountName.trim() || !formData.sortCode.trim() || !formData.accountNumber.trim();
        } else {
          return !formData.withdrawAddress || formData.withdrawAddress.trim() === '';
        }
      case 5: // Wallet Type
        if (!formData.destinationType) return true;
        if (formData.destinationType === 'exchange' && !formData.exchangeName.trim()) return true;
        return false;
      default:
        return false;
    }
  };

  // Handle QR code scan
  let handleQRCodeScanned = (data) => {
    log('QR Code scanned:', data);
    handleInputChange('withdrawAddress', data);
    setShowQRScanner(false);
  };

  // Handle VASP selection from modal
  const handleVaspSelect = (vasp) => {
    console.log('✅ VASP selected:', vasp);
    setFormData(prev => ({
      ...prev,
      exchangeName: vasp.name || vasp.label || prev.exchangeName,
      vasp: vasp
    }));
    setShowVaspSearch(false);
  };

  const handleVaspCancel = () => {
    setShowVaspSearch(false);
  };

  // Submit address book entry to API
  let submitAddress = async () => {
    if (!validateCurrentStep()) {
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');
    setSubmitStatus('');

    try {
      log('📤 Submitting address to API:', formData);
      console.log('📤 CONSOLE: ===== SUBMITTING ADDRESS TO API =====');
      console.log('📤 CONSOLE: Form data:', JSON.stringify(formData, null, 2));

      // Check if API client exists and initialize if needed
      console.log('🔍 Checking API client before submission...');
      console.log('🔍 appState exists?', !!appState);
      console.log('🔍 apiClient exists?', !!appState?.apiClient);
      console.log('🔍 apiClient.privateMethod exists?', !!appState?.apiClient?.privateMethod);

      if (!appState || !appState.apiClient || typeof appState.apiClient.privateMethod !== 'function') {
        console.log('⚠️ API client not ready, calling generalSetup now...');
        await appState.generalSetup({ caller: 'AddressBookForm-Submit' });
        console.log('✅ generalSetup completed, checking again...');
        console.log('✅ apiClient.privateMethod exists now?', !!appState?.apiClient?.privateMethod);

        if (!appState.apiClient || typeof appState.apiClient.privateMethod !== 'function') {
          throw new Error('API client could not be initialized');
        }
      }

      // Determine address type based on asset and destination type
      let addressType;

      if (formData.asset.toLowerCase() === 'gbp') {
        // GBP always uses BANK address type
        addressType = 'BANK';
      } else {
        // For crypto assets, determine based on destination type
        if (formData.destinationType === 'exchange') {
          addressType = 'CRYPTO_HOSTED'; // Exchange wallets are hosted
        } else if (formData.destinationType === 'personal') {
          addressType = 'CRYPTO_UNHOSTED'; // Personal wallets are unhosted
        } else {
          addressType = 'CRYPTO_UNHOSTED'; // Default to unhosted
        }
      }

      console.log('📋 Address type determined:', addressType);

      // Prepare the API payload
      let apiPayload;

      if (formData.asset.toLowerCase() === 'gbp') {
        // For GBP, use bank account format with nested address structure (NEW API FORMAT)
        apiPayload = {
          name: `${formData.firstName} ${formData.lastName}`.trim() || formData.recipient,
          type: 'BANK',  // Required for GBP addresses
          asset: 'GBP',
          network: 'GBPFPS',  // NEW: Required network field for GBP
          address: {
            firstname: (formData.firstName && formData.firstName.trim()) ? formData.firstName.trim() : null,
            lastname: (formData.lastName && formData.lastName.trim()) ? formData.lastName.trim() : null,
            business: formData.recipient === 'another_business' ? formData.firstName : null,  // NEW: Business name field
            accountname: formData.accountName,
            sortcode: formData.sortCode.replace(/-/g, ''),  // Remove dashes for API
            accountnumber: formData.accountNumber,
            reference: '',  // NEW: Payment reference field (optional, default empty)
            dtag: null,
            vasp: formData.vasp ? (formData.vasp.id || formData.vasp) : null
          },
          thirdparty: formData.destinationType === 'thirdParty' || false
        };
      } else {
        // For crypto assets, use nested address object structure
        let addressObject = {
          firstname: (formData.firstName && formData.firstName.trim()) ? formData.firstName.trim() : null,
          lastname: (formData.lastName && formData.lastName.trim()) ? formData.lastName.trim() : null,
          business: (formData.exchangeName && formData.exchangeName.trim()) ? formData.exchangeName.trim() : null,
          address: formData.withdrawAddress,
          dtag: null,
          vasp: formData.vasp ? (formData.vasp.id || formData.vasp) : null
        };

        apiPayload = {
          name: `${formData.firstName} ${formData.lastName}`.trim() || formData.recipient,
          asset: formData.asset.toUpperCase(),
          network: formData.asset.toUpperCase(),
          address: addressObject,
          thirdparty: formData.destinationType === 'thirdParty'
        };
      }

      console.log('📤 CONSOLE: API payload prepared:', JSON.stringify(apiPayload, null, 2));
      console.log('📤 CONSOLE: API Route:', `addressBook/${formData.asset.toUpperCase()}/${addressType}`);

      // Create abort controller for this request
      const abortController = appState.createAbortController({ tag: 'addAddress' });

      // Call the API using privateMethod
      const result = await appState.apiClient.privateMethod({
        httpMethod: 'POST',
        apiRoute: `addressBook/${formData.asset.toUpperCase()}/${addressType}`,
        params: apiPayload,
        abortController
      });

      console.log('📨 CONSOLE: ===== API RESPONSE =====');
      console.log('📨 CONSOLE: Result:', JSON.stringify(result, null, 2));
      console.log('📨 CONSOLE: ===== END API RESPONSE =====');

      // Check for errors first
      if (result && result.error) {
        throw new Error(result.error);
      }

      // Check for success - API should return success:true OR no error property
      const isSuccess = result && (result.success === true || (!result.error && !result.message));
      const hasError = result && (result.error || result.message);

      if (isSuccess && !hasError) {
        log('✅ Address added successfully:', result);
        console.log('📨 CONSOLE: Address added result:', JSON.stringify(result, null, 2));
        setSubmitStatus('✅ Address saved successfully!');

        // Clear address book cache for this asset to force fresh data load
        if (appState.clearAddressBookCache && typeof appState.clearAddressBookCache === 'function') {
          console.log('🧹 CONSOLE: Clearing address book cache for', formData.asset);
          appState.clearAddressBookCache(formData.asset);
        }

        // Reload address book to get fresh data with the new UUID
        if (appState.loadAddressBook && typeof appState.loadAddressBook === 'function') {
          console.log('🔄 CONSOLE: Reloading address book for', formData.asset);
          try {
            await appState.loadAddressBook(formData.asset);
            console.log('✅ CONSOLE: Address book reloaded successfully');
          } catch (reloadError) {
            console.error('❌ CONSOLE: Failed to reload address book:', reloadError);
          }
        }

        // Create appropriate success message based on asset type
        let successMessage;
        if (formData.asset.toLowerCase() === 'gbp') {
          successMessage = `${formData.firstName} ${formData.lastName}'s ${formData.asset.toUpperCase()} bank account has been successfully added to your address book.\n\nAccount: ${formData.accountName}\nSort Code: ${formData.sortCode}\nAccount Number: ${formData.accountNumber}`;
        } else {
          successMessage = `${formData.firstName} ${formData.lastName}'s ${formData.asset.toUpperCase()} address has been successfully added to your address book.\n\nAddress: ${formData.withdrawAddress.substring(0, 20)}...`;
        }

        // Call success callback or show alert
        if (onSuccess) {
          setTimeout(() => {
            onSuccess(result.data || result);
          }, 1000);
        } else {
          // Show success alert if no callback
          setTimeout(() => {
            Alert.alert(
              'Address Added Successfully! ✅',
              successMessage,
              [{
                text: 'OK',
                onPress: () => {
                  // Reset form
                  resetForm();
                }
              }]
            );
          }, 1000);
        }
      } else {
        throw new Error(result?.message || result?.error || 'Invalid API response');
      }

    } catch (error) {
      log('❌ Error submitting address:', error);
      console.error('❌ CONSOLE: Error submitting address:', error);

      let errorMsg = 'Failed to add address. Please try again.';
      if (error.message) {
        errorMsg = error.message;
      } else if (error.error) {
        errorMsg = error.error;
      }

      setSubmitError(errorMsg);
      Alert.alert('Error', errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form to initial state
  let resetForm = () => {
    setCurrentStep(1);
    setFormData({
      recipient: '',
      firstName: '',
      lastName: '',
      asset: selectedAsset ? selectedAsset.toLowerCase() : '',
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
  };

  // Render different steps
  let renderStep = () => {
    switch (currentStep) {
      case 1: // Recipient
        return (
          <View style={styles.stepContainer} testID="address-book-form-step-1">
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
                  testID={`recipient-option-${option.id}`}
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
          <View style={styles.stepContainer} testID="address-book-form-step-2">
            {formData.recipient === 'myself' ? (
              // Auto-filled for myself (but editable)
              <>
                <Text style={styles.stepQuestion}>
                  Your information has been auto-filled from your profile:
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>First Name</Text>
                  <TextInput
                    style={[styles.input, styles.autoFilledInput]}
                    placeholder="Enter first name"
                    value={formData.firstName}
                    onChangeText={(value) => handleInputChange('firstName', value)}
                    autoCapitalize="words"
                    testID="input-firstname"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Last Name</Text>
                  <TextInput
                    style={[styles.input, styles.autoFilledInput]}
                    placeholder="Enter last name"
                    value={formData.lastName}
                    onChangeText={(value) => handleInputChange('lastName', value)}
                    autoCapitalize="words"
                    testID="input-lastname"
                  />
                </View>

                <Text style={styles.helperText}>
                  ℹ️ Auto-filled from your account. You can edit if needed.
                </Text>
              </>
            ) : formData.recipient === 'another_person' && !manualInput ? (
              // Choice for another person: contacts or manual
              <>
                <Text style={styles.stepQuestion}>
                  How would you like to add the recipient's details?
                </Text>

                <TouchableOpacity
                  style={styles.contactOptionButton}
                  onPress={() => setManualInput(true)}
                  testID="button-enter-manually"
                >
                  <Text style={styles.contactOptionIcon}>✏️</Text>
                  <View style={styles.contactOptionTextContainer}>
                    <Text style={styles.contactOptionTitle}>Enter Manually</Text>
                    <Text style={styles.contactOptionSubtitle}>Type the recipient's name</Text>
                  </View>
                </TouchableOpacity>

                <Text style={styles.orDivider}>OR</Text>

                <TouchableOpacity
                  style={styles.contactOptionButton}
                  onPress={openContactPicker}
                  testID="button-select-contacts"
                >
                  <Text style={styles.contactOptionIcon}>📱</Text>
                  <View style={styles.contactOptionTextContainer}>
                    <Text style={styles.contactOptionTitle}>Select from Contacts</Text>
                    <Text style={styles.contactOptionSubtitle}>Choose from your phone contacts</Text>
                  </View>
                </TouchableOpacity>
              </>
            ) : (
              // Manual input for another_person or another_business
              <>
                <Text style={styles.stepQuestion}>
                  {formData.recipient === 'another_business'
                    ? 'Please supply the company name of the recipient. This must match exactly.'
                    : 'Please supply the firstname & lastname of the recipient. These must match exactly.'}
                </Text>

                {formData.recipient === 'another_person' && (
                  <TouchableOpacity
                    style={styles.backToChoiceButton}
                    onPress={() => setManualInput(false)}
                    testID="button-back-to-choice"
                  >
                    <Text style={styles.backToChoiceText}>← Back to selection</Text>
                  </TouchableOpacity>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    {formData.recipient === 'another_business' ? 'Company Name' : 'First Name'}
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder={formData.recipient === 'another_business' ? 'Enter company name' : 'Enter first name'}
                    value={formData.firstName}
                    onChangeText={(value) => handleInputChange('firstName', value)}
                    autoCapitalize="words"
                    testID="input-firstname-manual"
                  />
                </View>

                {formData.recipient !== 'another_business' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Last Name</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter last name"
                      value={formData.lastName}
                      onChangeText={(value) => handleInputChange('lastName', value)}
                      autoCapitalize="words"
                      testID="input-lastname-manual"
                    />
                  </View>
                )}
              </>
            )}
          </View>
        );

      case 3: // Asset
        // If selectedAsset is provided (from Transfer page), skip asset selection
        if (selectedAsset) {
          return (
            <View style={styles.stepContainer} testID="address-book-form-step-3">
              <Text style={styles.stepQuestion}>Asset for withdrawal:</Text>

              {/* Show locked asset badge */}
              <View style={styles.lockedAssetContainer}>
                <View style={styles.lockedAssetBadge}>
                  <Text style={styles.lockedAssetIcon}>🔒</Text>
                  <Text style={styles.lockedAssetText}>{selectedAsset.toUpperCase()} Only</Text>
                </View>
                <Text style={styles.lockedAssetHint}>
                  Asset is locked to {selectedAsset.toUpperCase()} for this withdrawal address.
                </Text>
              </View>
            </View>
          );
        }

        // Filter assets based on search query
        const filteredAssetOptions = assetOptions.filter(asset =>
          asset.label.toLowerCase().includes(assetSearchQuery.toLowerCase()) ||
          asset.id.toLowerCase().includes(assetSearchQuery.toLowerCase())
        );

        return (
          <View style={styles.stepContainer} testID="address-book-form-step-3">
            <Text style={styles.stepQuestion}>What asset are you withdrawing?</Text>

            {/* Search Input - show if more than 3 assets */}
            {assetOptions.length > 3 && (
              <View style={styles.searchContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search assets..."
                  value={assetSearchQuery}
                  onChangeText={setAssetSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                  testID="asset-search-input"
                />
              </View>
            )}

            <View style={styles.assetGrid}>
              {filteredAssetOptions.map((asset) => (
                <TouchableOpacity
                  key={asset.id}
                  testID={`asset-option-${asset.id}`}
                  style={[
                    styles.assetOption,
                    formData.asset === asset.id && styles.selectedAssetOption
                  ]}
                  onPress={() => handleInputChange('asset', asset.id)}
                >
                  <Text style={[
                    styles.assetText,
                    formData.asset === asset.id && styles.selectedAssetText
                  ]}>
                    {asset.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* No results message */}
            {filteredAssetOptions.length === 0 && (
              <Text style={styles.noResultsText}>No assets found matching "{assetSearchQuery}"</Text>
            )}
          </View>
        );

      case 4: // Destination
        // Safety check - shouldn't reach here without an asset selected
        if (!formData.asset) {
          return (
            <View style={styles.stepContainer}>
              <Text style={styles.errorMessageText}>Please select an asset in the previous step</Text>
            </View>
          );
        }

        if (formData.asset.toLowerCase() === 'gbp') {
          // GBP bank account form
          return (
            <View style={styles.stepContainer} testID="address-book-form-step-4-gbp">
              <Text style={styles.stepQuestion}>Please provide the UK bank account details:</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Account Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="John Smith"
                  value={formData.accountName}
                  onChangeText={(value) => handleInputChange('accountName', value)}
                  autoCapitalize="words"
                  testID="input-account-name"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Sort Code</Text>
                <TextInput
                  style={styles.input}
                  placeholder="12-34-56"
                  value={formData.sortCode}
                  onChangeText={(value) => {
                    // Auto-format sort code
                    let formatted = value.replace(/\D/g, '').substring(0, 6);
                    if (formatted.length >= 2) {
                      formatted = formatted.substring(0, 2) + '-' + formatted.substring(2);
                    }
                    if (formatted.length >= 5) {
                      formatted = formatted.substring(0, 5) + '-' + formatted.substring(5);
                    }
                    handleInputChange('sortCode', formatted);
                  }}
                  keyboardType="numeric"
                  maxLength={8}
                  testID="input-sort-code"
                />
                <Text style={styles.inputHint}>Format: XX-XX-XX</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Account Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="12345678"
                  value={formData.accountNumber}
                  onChangeText={(value) => handleInputChange('accountNumber', value.replace(/\D/g, '').substring(0, 8))}
                  keyboardType="numeric"
                  maxLength={8}
                  testID="input-account-number"
                />
                <Text style={styles.inputHint}>8 digits</Text>
              </View>
            </View>
          );
        } else {
          // Crypto address form
          return (
            <View style={styles.stepContainer} testID="address-book-form-step-4-crypto">
              <Text style={styles.stepQuestion}>What is the destination address for {formData.asset.toUpperCase()}?</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Withdrawal Address</Text>
                <TextInput
                  style={[styles.input, styles.addressInput]}
                  placeholder={`Enter ${formData.asset.toUpperCase()} address`}
                  value={formData.withdrawAddress}
                  onChangeText={(value) => handleInputChange('withdrawAddress', value)}
                  multiline
                  numberOfLines={3}
                  autoCapitalize="none"
                  autoCorrect={false}
                  testID="input-withdrawal-address"
                />

                <TouchableOpacity
                  style={styles.qrButton}
                  onPress={() => setShowQRScanner(true)}
                >
                  <Text style={styles.qrButtonText}>📷 Scan QR Code</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }

      case 5: // Wallet
        // This step is skipped for GBP (handled in goToNextStep)
        if (formData.asset.toLowerCase() === 'gbp') {
          return null;
        }

        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepQuestion}>Where is this address from?</Text>

            <RadioButton.Group
              onValueChange={(value) => handleInputChange('destinationType', value)}
              value={formData.destinationType}
            >
              {[
                { id: 'personal', text: 'My Personal Wallet' },
                { id: 'exchange', text: 'An Exchange' }
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

            {formData.destinationType === 'exchange' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Exchange Name</Text>
                <TouchableOpacity
                  style={[styles.input, formData.vasp ? styles.inputSelected : null]}
                  onPress={() => setShowVaspSearch(true)}
                >
                  <Text style={formData.exchangeName ? styles.inputValueText : styles.inputPlaceholderText}>
                    {formData.exchangeName || 'Tap to search for exchange'}
                  </Text>
                </TouchableOpacity>

                {/* Show selected VASP indicator */}
                {formData.vasp && (
                  <Text style={styles.vaspSelectedHint}>✓ Exchange selected from database</Text>
                )}

                <Text style={styles.inputHint}>
                  Tap to search and select from our exchange database
                </Text>
              </View>
            )}
          </View>
        );

      case 6: { // Summary
        const isGBP = formData.asset.toLowerCase() === 'gbp';
        const assetUpper = formData.asset.toUpperCase();

        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepQuestion}>Please review your information:</Text>

            <View style={styles.summaryContainer}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Recipient:</Text>
                <Text style={styles.summaryValue}>{formData.recipient}</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Name:</Text>
                <Text style={styles.summaryValue}>{formData.firstName} {formData.lastName}</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Asset:</Text>
                <Text style={styles.summaryValue}>{assetUpper}</Text>
              </View>

              {isGBP ? (
                <>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Account Name:</Text>
                    <Text style={styles.summaryValue}>{formData.accountName}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Sort Code:</Text>
                    <Text style={styles.summaryValue}>{formData.sortCode}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Account Number:</Text>
                    <Text style={styles.summaryValue}>{formData.accountNumber}</Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Address:</Text>
                    <Text style={[styles.summaryValue, styles.addressText]}>
                      {formData.withdrawAddress}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Type:</Text>
                    <Text style={styles.summaryValue}>{formData.destinationType}</Text>
                  </View>
                  {formData.destinationType === 'exchange' && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Exchange:</Text>
                      <Text style={styles.summaryValue}>{formData.exchangeName}</Text>
                    </View>
                  )}
                </>
              )}
            </View>

            <View style={styles.warningCard}>
              <Text style={styles.warningTitle}>⚠️ Important Notice</Text>
              <Text style={styles.warningText}>
                Please verify {isGBP ? 'the bank account details are' : 'the wallet address is'} correct.
                {!isGBP && ' Sending to an incorrect address may result in permanent loss of funds.'}
              </Text>
            </View>

            <Text style={styles.confirmationText}>
              By adding this {isGBP ? 'bank account' : 'address'}, you confirm that all information above is accurate.
            </Text>

            {submitStatus ? (
              <View style={styles.successCard}>
                <Text style={styles.successText}>✅ {submitStatus}</Text>
              </View>
            ) : null}

            {submitError ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>❌ {submitError}</Text>
              </View>
            ) : null}

            {/* Submit button moved to the navigation bar so the Next button
                becomes the Submit button on the final step. */}
          </View>
        );
      }

      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={scaledHeight(100)}
    >
      {/* Header */}
      {showHeader && (
        <>
          <Text style={styles.title}>Address Book</Text>
          <Text style={styles.subtitle}>Add a new withdrawal address</Text>
        </>
      )}

      {/* Progress Indicator */}
      <View style={styles.progressWrapper}>
        <Text style={styles.progressText}>
          Step {currentStep} of {steps.length}
        </Text>
        <View style={styles.progressBar}>
          {steps.map((step) => (
            <View
              key={step.id}
              style={[
                styles.progressSegment,
                step.id <= currentStep && styles.progressSegmentActive
              ]}
            />
          ))}
        </View>
      </View>

      {/* Step Title */}
      <View style={styles.stepHeader}>
        <Text style={styles.stepTitle}>{steps[currentStep - 1].title}</Text>
        <Text style={styles.stepSubtitle}>{steps[currentStep - 1].subtitle}</Text>
      </View>

      {/* Error Message */}
      {errorMessage && (
        <View style={styles.errorWrapper}>
          <Text style={styles.errorMessageText}>{errorMessage}</Text>
        </View>
      )}

      {/* Step Content */}
      <ScrollView
        style={styles.stepContent}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={false}
      >
        {renderStep()}
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.navigationWrapper}>
        {currentStep > 1 && (
          <TouchableOpacity
            style={[styles.navButton, styles.backButton]}
            onPress={goToPreviousStep}
            disabled={isSubmitting}
            testID="button-back"
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        )}

        {currentStep === 1 && onCancel && (
          <TouchableOpacity
            style={[styles.navButton, styles.backButton]}
            onPress={onCancel}
            testID="button-cancel"
          >
            <Text style={styles.backButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}

        <View style={{ flex: 1 }} />

        {!isLastStep() ? (
          <TouchableOpacity
            style={[
              styles.navButton,
              styles.nextButton,
              isNextButtonDisabled() && styles.disabledButton
            ]}
            onPress={goToNextStep}
            disabled={isSubmitting || isNextButtonDisabled()}
            testID="button-next"
          >
            <Text style={[
              styles.nextButtonText,
              isNextButtonDisabled() && styles.disabledButtonText
            ]}>
              Next →
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.navButton, styles.submitButton]}
            onPress={submitAddress}
            disabled={isSubmitting}
            testID="button-submit"
          >
            <Text style={styles.submitButtonText}>{isSubmitting ? 'Adding...' : 'Submit'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <QRScanner
          visible={showQRScanner}
          onClose={() => setShowQRScanner(false)}
          onScanSuccess={handleQRCodeScanned}
        />
      )}

      {/* Contact Picker Modal */}
      <ContactPickerModal
        visible={showContactPicker}
        onSelect={handleContactSelect}
        onCancel={handleContactPickerCancel}
      />

      {/* VASP Search Modal */}
      <VaspSearchModal
        visible={showVaspSearch}
        onSelect={handleVaspSelect}
        onCancel={handleVaspCancel}
        initialQuery={formData.exchangeName || ''}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  title: {
    fontSize: normaliseFont(24),
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
    marginTop: scaledHeight(20),
    marginBottom: scaledHeight(8),
  },
  subtitle: {
    fontSize: normaliseFont(16),
    color: colors.mediumGray,
    textAlign: 'center',
    marginBottom: scaledHeight(20),
  },
  progressWrapper: {
    paddingHorizontal: scaledWidth(20),
    marginBottom: scaledHeight(20),
  },
  progressText: {
    fontSize: normaliseFont(14),
    color: colors.mediumGray,
    textAlign: 'center',
    marginBottom: scaledHeight(8),
  },
  progressBar: {
    flexDirection: 'row',
    height: scaledHeight(4),
    backgroundColor: colors.lightGray,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressSegment: {
    flex: 1,
    backgroundColor: colors.lightGray,
    marginRight: scaledWidth(4),
  },
  progressSegmentActive: {
    backgroundColor: colors.primary,
  },
  stepHeader: {
    paddingHorizontal: scaledWidth(20),
    marginBottom: scaledHeight(16),
  },
  stepTitle: {
    fontSize: normaliseFont(20),
    fontWeight: '600',
    color: colors.darkGray,
    marginBottom: scaledHeight(4),
  },
  stepSubtitle: {
    fontSize: normaliseFont(14),
    color: colors.mediumGray,
  },
  errorWrapper: {
    backgroundColor: '#fee',
    padding: scaledWidth(12),
    marginHorizontal: scaledWidth(20),
    marginBottom: scaledHeight(16),
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
  },
  errorMessageText: {
    color: '#c33',
    fontSize: normaliseFont(14),
  },
  stepContent: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: scaledHeight(50),
  },
  stepContainer: {
    paddingHorizontal: scaledWidth(20),
    paddingBottom: scaledHeight(20),
  },
  stepQuestion: {
    fontSize: normaliseFont(16),
    color: colors.darkGray,
    marginBottom: scaledHeight(20),
    lineHeight: scaledHeight(24),
  },

  // Radio buttons
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scaledWidth(12),
    marginBottom: scaledHeight(8),
    backgroundColor: colors.lightBackground,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedRadioOption: {
    borderColor: colors.primary,
    backgroundColor: '#e8f4fd',
  },
  radioText: {
    fontSize: normaliseFont(16),
    color: colors.darkGray,
    marginLeft: scaledWidth(8),
  },
  selectedRadioText: {
    color: colors.primary,
    fontWeight: '600',
  },

  // Input fields
  inputGroup: {
    marginBottom: scaledHeight(16),
  },
  inputLabel: {
    fontSize: normaliseFont(14),
    fontWeight: '600',
    color: colors.darkGray,
    marginBottom: scaledHeight(8),
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: 8,
    padding: scaledWidth(12),
    fontSize: normaliseFont(16),
    color: colors.darkGray,
  },
  inputValueText: {
    flex: 1,
    fontSize: normaliseFont(16),
    color: '#212121',
  },
  inputPlaceholderText: {
    flex: 1,
    fontSize: normaliseFont(16),
    color: '#9E9E9E',
  },
  inputSearchIcon: {
    fontSize: normaliseFont(18),
    marginLeft: scaledWidth(8),
  },
  inputSelected: {
    borderColor: colors.success,
    borderWidth: 2,
    backgroundColor: '#f0fff4',
  },
  vaspSelectedHint: {
    fontSize: normaliseFont(12),
    color: colors.success,
    marginTop: scaledHeight(4),
    fontWeight: '600',
  },
  inputHint: {
    fontSize: normaliseFont(12),
    color: colors.mediumGray,
    marginTop: scaledHeight(4),
  },
  addressInput: {
    minHeight: scaledHeight(80),
    textAlignVertical: 'top',
    fontFamily: 'monospace',
  },

  // Asset grid
  assetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  searchContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  noResultsText: {
    textAlign: 'center',
    color: '#999999',
    marginTop: 24,
    fontSize: 16,
  },
  assetOption: {
    width: '48%',
    padding: scaledWidth(16),
    marginBottom: scaledHeight(12),
    backgroundColor: colors.lightBackground,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  selectedAssetOption: {
    borderColor: colors.primary,
    backgroundColor: '#e8f4fd',
  },
  assetText: {
    fontSize: normaliseFont(14),
    color: colors.darkGray,
    textAlign: 'center',
  },
  selectedAssetText: {
    color: colors.primary,
    fontWeight: '600',
  },

  // QR Button
  qrButton: {
    backgroundColor: colors.primary,
    padding: scaledWidth(12),
    borderRadius: 8,
    alignItems: 'center',
    marginTop: scaledHeight(12),
  },
  qrButtonText: {
    color: colors.white,
    fontSize: normaliseFont(16),
    fontWeight: '600',
  },

  // Summary
  summaryContainer: {
    backgroundColor: colors.lightBackground,
    borderRadius: 8,
    padding: scaledWidth(16),
    marginBottom: scaledHeight(16),
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: scaledHeight(12),
    paddingBottom: scaledHeight(12),
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  summaryLabel: {
    fontSize: normaliseFont(14),
    color: colors.darkGray,
    flex: 2,
  },
  summaryValue: {
    fontSize: normaliseFont(14),
    color: colors.darkGray,
    fontWeight: '600',
    flex: 3,
    textAlign: 'right',
  },
  addressText: {
    fontFamily: 'monospace',
    fontSize: normaliseFont(12),
    flexWrap: 'wrap',
  },

  // Warning card
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

  // Success/Error cards
  successCard: {
    backgroundColor: '#d4edda',
    padding: scaledWidth(12),
    borderRadius: 8,
    marginBottom: scaledHeight(12),
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  successText: {
    color: '#155724',
    fontSize: normaliseFont(14),
    textAlign: 'center',
  },
  errorCard: {
    backgroundColor: '#f8d7da',
    padding: scaledWidth(12),
    borderRadius: 8,
    marginBottom: scaledHeight(12),
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
  },
  errorText: {
    color: '#721c24',
    fontSize: normaliseFont(14),
    textAlign: 'center',
  },

  // Submit button
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

  // Navigation
  navigationWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scaledWidth(20),
    paddingVertical: scaledHeight(16),
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
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
  backButtonText: {
    color: colors.darkGray,
    fontSize: normaliseFont(16),
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: colors.primary,
  },
  nextButtonText: {
    color: colors.white,
    fontSize: normaliseFont(16),
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: colors.lightGray,
    opacity: 0.6,
  },
  disabledButtonText: {
    color: colors.mediumGray,
  },

  // Contact selection styles
  autoFilledInput: {
    backgroundColor: '#f0f8ff',
    borderColor: colors.primary,
    borderWidth: 1,
  },
  helperText: {
    fontSize: normaliseFont(12),
    color: colors.mediumGray,
    marginTop: scaledHeight(8),
    fontStyle: 'italic',
  },
  contactOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scaledWidth(16),
    marginBottom: scaledHeight(12),
    backgroundColor: colors.lightBackground,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.lightGray,
  },
  contactOptionIcon: {
    fontSize: normaliseFont(32),
    marginRight: scaledWidth(16),
  },
  contactOptionTextContainer: {
    flex: 1,
  },
  contactOptionTitle: {
    fontSize: normaliseFont(16),
    fontWeight: '600',
    color: colors.darkGray,
    marginBottom: scaledHeight(4),
  },
  contactOptionSubtitle: {
    fontSize: normaliseFont(13),
    color: colors.mediumGray,
  },
  orDivider: {
    fontSize: normaliseFont(14),
    color: colors.mediumGray,
    textAlign: 'center',
    marginVertical: scaledHeight(8),
    fontWeight: '600',
  },
  backToChoiceButton: {
    marginBottom: scaledHeight(16),
    padding: scaledWidth(8),
  },
  backToChoiceText: {
    fontSize: normaliseFont(14),
    color: colors.primary,
    fontWeight: '600',
  },
  lockedAssetContainer: {
    alignItems: 'center',
    paddingVertical: scaledHeight(20),
  },
  lockedAssetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaledWidth(20),
    paddingVertical: scaledHeight(12),
    backgroundColor: '#e3f2fd',
    borderRadius: scaledWidth(25),
    borderWidth: 2,
    borderColor: '#2196F3',
    marginBottom: scaledHeight(12),
  },
  lockedAssetIcon: {
    fontSize: normaliseFont(20),
    marginRight: scaledWidth(8),
  },
  lockedAssetText: {
    fontSize: normaliseFont(16),
    color: '#1565C0',
    fontWeight: '700',
  },
  lockedAssetHint: {
    fontSize: normaliseFont(13),
    color: colors.mediumGray,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default AddressBookForm;

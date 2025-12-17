import React, { useContext, useEffect, useState } from 'react';
import { View, Alert, TouchableOpacity, StyleSheet, Platform, Modal, ScrollView, Pressable } from 'react-native';
import { Text, Button, TextInput, Card, useTheme, Checkbox, RadioButton, Portal, Divider } from 'react-native-paper';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import DatePicker from 'react-native-date-picker';
import AppStateContext from 'src/application/data';
import { Title } from 'src/components/shared';
import misc from 'src/util/misc';
import _ from 'lodash';

const Register = () => {
  console.log('🚀 Register component starting to render');

  const appState = useContext(AppStateContext);
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    mobileNumber: '',
    address1: '',
    address2: '',
    address3: '',
    address4: '',
    city: '',
    postalCode: '',
    emailPreferences: {
      systemAnnouncements: true,
      newsAndFeatureUpdates: true,
      promotionsAndSpecialOffers: true,
    }
  });

  const [passwordVisible, setPasswordVisible] = useState(false);
  const [disableRegisterButton, setDisableRegisterButton] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');

  // Dropdown states
  const [gender, setGender] = useState('');
  const [citizenship, setCitizenship] = useState('');
  const [countryCode, setCountryCode] = useState('+44');

  // Modal states for pickers
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [showCitizenshipModal, setShowCitizenshipModal] = useState(false);
  const [showCountryCodeModal, setShowCountryCodeModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateOfBirthDate, setDateOfBirthDate] = useState(new Date(1990, 0, 1)); // Default: Jan 1, 1990

  // Address lookup state
  const [addressList, setAddressList] = useState([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [showManualAddress, setShowManualAddress] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);

  // Options lists
  const genderOptions = [
    { label: 'Male', value: 'Male' },
    { label: 'Female', value: 'Female' },
    { label: 'Other', value: 'Other' }
  ];

  const citizenshipOptions = [
    { label: 'United Kingdom', value: 'GB' },
    { label: 'United States', value: 'US' },
    { label: 'Canada', value: 'CA' },
    { label: 'Australia', value: 'AU' },
    { label: 'Germany', value: 'DE' },
    { label: 'France', value: 'FR' },
    { label: 'Spain', value: 'ES' },
    { label: 'Italy', value: 'IT' },
    { label: 'Netherlands', value: 'NL' },
    { label: 'Japan', value: 'JP' },
    { label: 'South Korea', value: 'KR' },
    { label: 'Singapore', value: 'SG' },
    { label: 'Hong Kong', value: 'HK' },
    { label: 'Switzerland', value: 'CH' },
    { label: 'Austria', value: 'AT' },
    { label: 'Belgium', value: 'BE' },
    { label: 'Denmark', value: 'DK' },
    { label: 'Finland', value: 'FI' },
    { label: 'Ireland', value: 'IE' },
    { label: 'Norway', value: 'NO' },
    { label: 'Sweden', value: 'SE' },
    { label: 'Poland', value: 'PL' },
    { label: 'Portugal', value: 'PT' },
    { label: 'Czech Republic', value: 'CZ' },
    { label: 'Greece', value: 'GR' }
  ];

  const countryCodeOptions = [
    { label: '🇬🇧 +44 (United Kingdom)', value: '+44' },
    { label: '🇺🇸 +1 (United States)', value: '+1' },
    { label: '🇨🇦 +1 (Canada)', value: '+1' },
    { label: '🇫🇷 +33 (France)', value: '+33' },
    { label: '🇩🇪 +49 (Germany)', value: '+49' },
    { label: '🇪🇸 +34 (Spain)', value: '+34' },
    { label: '🇮🇹 +39 (Italy)', value: '+39' },
    { label: '🇳🇱 +31 (Netherlands)', value: '+31' },
    { label: '🇦🇺 +61 (Australia)', value: '+61' },
    { label: '🇯🇵 +81 (Japan)', value: '+81' }
  ];

  const stateChangeID = appState.stateChangeID;
  const pageName = appState.pageName;
  const permittedPageNames = ['default'];

  misc.confirmItemInArray('permittedPageNames', permittedPageNames, pageName, 'Register');

  useEffect(() => {
    const setup = async () => {
      console.log('🔍 Register setup() called');
      try {
        if (appState.stateChangeIDHasChanged(stateChangeID)) {
          return;
        }
        setIsLoading(false);
        console.log('✅ Register setup() completed successfully');
      } catch (err) {
        console.error('❌ Register setup() error:', err);
      }
    };
    setup();
  }, []);

  // Dropdown handlers
  const showGenderPicker = () => {
    console.log('🔍 showGenderPicker called');
    setShowGenderModal(true);
  };

  const selectGender = (option) => {
    console.log('🔍 Gender selected:', option.value);
    setGender(option.value);
    setUserData({ ...userData, gender: option.value });
    setShowGenderModal(false);
  };

  const showCitizenshipPicker = () => {
    console.log('🔍 showCitizenshipPicker called');
    setShowCitizenshipModal(true);
  };

  const selectCitizenship = (option) => {
    console.log('🔍 Citizenship selected:', option.value, option.label);
    setCitizenship(option.value);
    setUserData({ ...userData, citizenship: option.value });
    setShowCitizenshipModal(false);
  };

  // Date picker handler
  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios'); // Keep open on iOS, close on Android

    if (selectedDate) {
      setDateOfBirthDate(selectedDate);

      // Format date as DD/MM/YYYY
      const day = selectedDate.getDate().toString().padStart(2, '0');
      const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
      const year = selectedDate.getFullYear();
      const formattedDate = `${day}/${month}/${year}`;

      setUserData({ ...userData, dateOfBirth: formattedDate });
    }
  };

  const showDatePickerModal = () => {
    console.log('📅 showDatePickerModal called');
    setShowDateModal(true);
  };

  const onDateConfirm = (selectedDate) => {
    setShowDateModal(false);
    setDateOfBirthDate(selectedDate);

    // Format date as DD/MM/YYYY
    const day = selectedDate.getDate().toString().padStart(2, '0');
    const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
    const year = selectedDate.getFullYear();
    const formattedDate = `${day}/${month}/${year}`;

    setUserData({ ...userData, dateOfBirth: formattedDate });
  };

  // Postcode lookup using completely free API
  const lookupPostcode = async (postcode) => {
    try {
      console.log('🔍 Looking up postcode:', postcode);

      // Clean the postcode (remove spaces)
      const cleanPostcode = postcode.replace(/\s/g, '').toUpperCase();

      if (cleanPostcode.length < 5) {
        Alert.alert('Invalid Postcode', 'Please enter a valid UK postcode');
        return;
      }

      setIsLoadingAddresses(true);

      // Using api.postcodes.io to validate and get area info first
      const validateResponse = await fetch(`https://api.postcodes.io/postcodes/${cleanPostcode}`);
      const validateData = await validateResponse.json();

      if (validateData.status !== 200 || !validateData.result) {
        setIsLoadingAddresses(false);
        Alert.alert(
          'Invalid Postcode',
          'This postcode was not found. Please check and try again.',
          [{ text: 'OK' }]
        );
        return;
      }

      const postcodeInfo = validateData.result;
      console.log('✅ Postcode validated:', postcodeInfo);

      // Now try to get real addresses using getAddress.io autocomplete (no API key needed for autocomplete)
      try {
        const autocompleteResponse = await fetch(
          `https://api.getaddress.io/autocomplete/${cleanPostcode}?all=true`
        );

        const autocompleteData = await autocompleteResponse.json();

        if (autocompleteData && autocompleteData.suggestions && autocompleteData.suggestions.length > 0) {
          console.log('✅ Found', autocompleteData.suggestions.length, 'addresses via autocomplete');

          // Parse autocomplete suggestions
          const addresses = autocompleteData.suggestions.slice(0, 10).map(suggestion => {
            // Suggestions come as full address strings, split them intelligently
            const parts = suggestion.address.split(',').map(p => p.trim());
            return {
              line1: parts[0] || '',
              line2: parts[1] || '',
              line3: parts[2] || '',
              line4: parts.length > 4 ? parts[3] : '',
              city: postcodeInfo.admin_district || postcodeInfo.parish || parts[parts.length - 2] || '',
              postcode: postcode,
              fullAddress: suggestion.address
            };
          });

          setAddressList(addresses);
          setIsLoadingAddresses(false);
          showAddressSelectionDialog(addresses);
          return;
        }
      } catch (autocompleteError) {
        console.log('Autocomplete failed, trying alternative method:', autocompleteError.message);
      }

      // Fallback: If autocomplete doesn't work, use Ideal Postcodes test API
      try {
        // Using Ideal Postcodes test key (limited to test postcodes only)
        // For production, sign up at https://ideal-postcodes.co.uk for free key
        const testApiKey = 'ak_test'; // This only works with test postcodes
        const idealResponse = await fetch(
          `https://api.ideal-postcodes.co.uk/v1/postcodes/${cleanPostcode}?api_key=${testApiKey}`
        );

        const idealData = await idealResponse.json();

        if (idealData && idealData.result && idealData.result.length > 0) {
          console.log('✅ Found', idealData.result.length, 'addresses via Ideal Postcodes');

          const addresses = idealData.result.map(addr => ({
            line1: addr.line_1 || '',
            line2: addr.line_2 || '',
            line3: addr.line_3 || '',
            line4: addr.line_4 || '',
            city: addr.post_town || postcodeInfo.admin_district || '',
            postcode: postcode,
            fullAddress: [addr.line_1, addr.line_2, addr.line_3, addr.post_town, postcode]
              .filter(Boolean)
              .join(', ')
          }));

          setAddressList(addresses);
          setIsLoadingAddresses(false);
          showAddressSelectionDialog(addresses);
          return;
        }
      } catch (idealError) {
        console.log('Ideal Postcodes failed:', idealError.message);
      }

      // If all APIs fail, create mock addresses based on the validated postcode
      console.log('⚠️ Using mock addresses - API lookups failed');
      const mockAddresses = [
        {
          line1: `Flat 1`,
          line2: `${postcodeInfo.admin_ward || 'Main'} Building`,
          line3: postcodeInfo.admin_ward || '',
          line4: '',
          city: postcodeInfo.admin_district || postcodeInfo.parish || '',
          postcode: postcode
        },
        {
          line1: `1 High Street`,
          line2: '',
          line3: postcodeInfo.admin_ward || '',
          line4: '',
          city: postcodeInfo.admin_district || postcodeInfo.parish || '',
          postcode: postcode
        },
        {
          line1: `2 Main Road`,
          line2: '',
          line3: postcodeInfo.admin_ward || '',
          line4: '',
          city: postcodeInfo.admin_district || postcodeInfo.parish || '',
          postcode: postcode
        }
      ];

      setAddressList(mockAddresses);
      setIsLoadingAddresses(false);

      Alert.alert(
        'Limited Results',
        'We could only generate sample addresses for this postcode. For real address lookup, please sign up for a free API key at getaddress.io or ideal-postcodes.co.uk',
        [
          {
            text: 'Use Sample Addresses',
            onPress: () => showAddressSelectionDialog(mockAddresses)
          },
          {
            text: 'Enter Manually',
            style: 'cancel'
          }
        ]
      );

    } catch (error) {
      setIsLoadingAddresses(false);
      console.error('❌ Postcode lookup error:', error);
      Alert.alert(
        'Lookup Failed',
        'Unable to validate this postcode. Please enter your address manually.',
        [{ text: 'OK' }]
      );
    }
  };

  // Show dialog with list of addresses to choose from
  const showAddressSelectionDialog = (addresses) => {
    setAddressList(addresses);
    setShowAddressModal(true);
  };

  // Fill in the address fields when user selects an address
  const selectAddress = (address) => {
    console.log('✅ Address selected:', address);

    setUserData({
      ...userData,
      address1: address.line1 || '',
      address2: address.line2 || '',
      address3: address.line3 || '',
      address4: address.line4 || '',
      city: address.city || '',
      postalCode: address.postcode || ''
    });

    // Show address fields after selection (so user can see what was filled)
    setShowManualAddress(true);
  };

  const showCountryCodePicker = () => {
    console.log('🔍 showCountryCodePicker called');
    setShowCountryCodeModal(true);
  };

  const selectCountryCode = (option) => {
    console.log('🔍 Country code selected:', option.value, option.label);
    setCountryCode(option.value);
    setUserData({ ...userData, countryCode: option.value });
    setShowCountryCodeModal(false);
  };

  const submitRegisterRequest = async () => {
    setDisableRegisterButton(true);
    setUploadMessage('Registering your details...');

    console.log('🎯 [UI] Registration form submitted');
    console.log('🎯 [UI] Registration data:', userData);

    try {
      // Prepare data for submission
      const userData2 = { ...userData };

      // Combine country code with mobile number for full international format
      if (userData2.mobileNumber && countryCode) {
        userData2.mobileNumber = countryCode + userData2.mobileNumber;
      }

      // Ensure gender and citizenship are included
      userData2.gender = gender || userData2.gender;
      userData2.citizenship = citizenship || userData2.citizenship;

      // Keep emailPreferences as object for API
      userData2.emailPreferences = userData.emailPreferences;

      console.log('🎯 [UI] Processed registration data:', userData2);

      // Call the actual register API
      console.log('📡 [UI] Calling appState.register() with real API');
      const result = await appState.register(userData2);

      console.log('📡 [UI] Registration API result:', result);

      if (result.result === "SUCCESS") {
        console.log('✅ [UI] Registration successful!');

        // Store registration data for verification process
        appState.registrationEmail = userData2.email;
        appState.registrationPhone = userData2.mobileNumber;
        appState.registrationSuccess = true;

        // Save some of the userData for use in RegisterConfirm
        appState.registerConfirmData = {
          email: userData.email,
          password: userData.password,
        };

        // Delete the temporarily stored registerData from the appState
        appState.registerData = appState.blankRegisterData;

        // Reset UI state
        setUploadMessage('');
        setDisableRegisterButton(false);

        // Redirect directly to registration completion page (no popup)
        appState.setMainPanelState({
          mainPanelState: 'RegistrationCompletion',
          pageName: 'default'
        });

      } else if (result.result === "VALIDATION_ERROR") {
        console.log('❌ [UI] Registration validation errors:', result.details);
        let errorMessages = [];
        Object.keys(result.details).forEach(field => {
          errorMessages.push(`${field}: ${result.details[field]}`);
        });

        Alert.alert(
          "Validation Error",
          errorMessages.join('\n'),
          [{ text: "OK" }]
        );

      } else {
        // Handle other errors
        console.log('❌ [UI] Registration failed:', result);

        // Show detailed error message to help user understand why registration failed
        const errorMessage = result.message 
          ? result.message 
          : result.error 
            ? (typeof result.error === 'string' ? result.error : JSON.stringify(result.error))
            : "An error occurred during registration. Please check your information and try again.";

        Alert.alert(
          "Registration Failed",
          errorMessage,
          [{ text: "OK" }]
        );
      }

    } catch (err) {
      console.error('❌ [UI] Registration error:', err);

      // Show actual error message to help user diagnose the issue
      const errorMessage = err.message || err.toString() || "An unexpected error occurred. Please try again.";

      Alert.alert(
        "Registration Error",
        errorMessage,
        [{ text: "OK" }]
      );
    } finally {
      setUploadMessage('');
      setDisableRegisterButton(false);
    }
  };

  const materialTheme = useTheme();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <>
      <KeyboardAwareScrollView style={{ flex: 1, backgroundColor: materialTheme.colors.background }}>
        <Title>Create Account</Title>

        <View style={{ padding: 16 }}>

          {/* Basic Information Card */}
          <Card style={{ marginBottom: 16, elevation: 2 }}>
            <Card.Content style={{ padding: 20 }}>
              <Text variant="titleMedium" style={{
                marginBottom: 20,
                color: materialTheme.colors.primary,
                textAlign: 'center',
                fontWeight: '600'
              }}>
                📝 Create Your Account
              </Text>

              {/* Email Field */}
              <TextInput
                mode="outlined"
                label="Email Address"
                value={userData.email}
                onChangeText={(value) => setUserData({ ...userData, email: value })}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                style={{ marginBottom: 16 }}
                left={<TextInput.Icon icon="email" />}
              />

              {/* Password Field */}
              <TextInput
                mode="outlined"
                label="Password"
                value={userData.password}
                onChangeText={(value) => setUserData({ ...userData, password: value })}
                secureTextEntry={!passwordVisible}
                autoCapitalize="none"
                style={{ marginBottom: 16 }}
                left={<TextInput.Icon icon="lock" />}
                right={
                  <TextInput.Icon
                    icon={passwordVisible ? "eye-off" : "eye"}
                    onPress={() => setPasswordVisible(!passwordVisible)}
                  />
                }
              />

              {/* First Name */}
              <TextInput
                mode="outlined"
                label="First Name"
                value={userData.firstName}
                onChangeText={(value) => setUserData({ ...userData, firstName: value })}
                style={{ marginBottom: 16 }}
                left={<TextInput.Icon icon="account" />}
              />

              {/* Last Name */}
              <TextInput
                mode="outlined"
                label="Last Name"
                value={userData.lastName}
                onChangeText={(value) => setUserData({ ...userData, lastName: value })}
                style={{ marginBottom: 16 }}
                left={<TextInput.Icon icon="account" />}
              />

              {/* Gender Selector */}
              <TouchableOpacity onPress={showGenderPicker} activeOpacity={0.7} testID="gender-input">
                <TextInput
                  mode="outlined"
                  label="Gender"
                  value={gender || 'Tap to select'}
                  editable={false}
                  pointerEvents="none"
                  style={{ marginBottom: 16 }}
                  left={<TextInput.Icon icon="human-male-female" />}
                  right={<TextInput.Icon icon="chevron-down" onPress={showGenderPicker} />}
                />
              </TouchableOpacity>

              {/* Date of Birth */}
              <TouchableOpacity onPress={showDatePickerModal} activeOpacity={0.7}>
                <TextInput
                  mode="outlined"
                  label="Date of Birth"
                  value={userData.dateOfBirth || 'Tap to select date'}
                  editable={false}
                  pointerEvents="none"
                  placeholder="DD/MM/YYYY"
                  style={{ marginBottom: 16 }}
                  left={<TextInput.Icon icon="calendar" />}
                  right={<TextInput.Icon icon="chevron-down" onPress={showDatePickerModal} />}
                />
              </TouchableOpacity>

              {/* Citizenship Selector */}
              <TouchableOpacity onPress={showCitizenshipPicker} activeOpacity={0.7}>
                <TextInput
                  mode="outlined"
                  label="Country of Citizenship"
                  value={citizenshipOptions.find(c => c.value === citizenship)?.label || citizenship || 'Tap to select country'}
                  editable={false}
                  pointerEvents="none"
                  style={{ marginBottom: 16 }}
                  left={<TextInput.Icon icon="flag" />}
                  right={<TextInput.Icon icon="chevron-down" onPress={showCitizenshipPicker} />}
                />
              </TouchableOpacity>

            </Card.Content>
          </Card>

          {/* Contact Information Card */}
          <Card style={{ marginBottom: 16, elevation: 2 }}>
            <Card.Content style={{ padding: 20 }}>
              <Text variant="titleMedium" style={{
                marginBottom: 20,
                color: materialTheme.colors.primary,
                fontWeight: '600'
              }}>
                📞 Contact Information
              </Text>

              {/* Phone Number */}
              <Text variant="bodyMedium" style={{ marginBottom: 8, color: materialTheme.colors.onSurfaceVariant }}>
                Mobile Number
              </Text>
              <View style={{ flexDirection: 'row', marginBottom: 16 }}>
                <TouchableOpacity onPress={showCountryCodePicker} style={{ flex: 0.35, marginRight: 8 }}>
                  <TextInput
                    mode="outlined"
                    label="Country"
                    value={countryCode || 'Tap to select'}
                    editable={false}
                    pointerEvents="none"
                    right={<TextInput.Icon icon="chevron-down" onPress={showCountryCodePicker} />}
                  />
                </TouchableOpacity>
                <TextInput
                  mode="outlined"
                  label="Phone Number"
                  value={userData.mobileNumber}
                  onChangeText={(value) => setUserData({ ...userData, mobileNumber: value })}
                  keyboardType="phone-pad"
                  style={{ flex: 0.65 }}
                />
              </View>

              {/* Postal Code - Moved to top */}
              <View style={{ flexDirection: 'row', marginBottom: 16, alignItems: 'flex-start' }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <TextInput
                    mode="outlined"
                    label="Postal Code"
                    value={userData.postalCode}
                    onChangeText={(value) => setUserData({ ...userData, postalCode: value })}
                    autoCapitalize="characters"
                    placeholder="SW1A 1AA"
                    left={<TextInput.Icon icon="map-marker" />}
                  />
                </View>
                <Button
                  mode="contained"
                  onPress={() => lookupPostcode(userData.postalCode)}
                  disabled={!userData.postalCode || userData.postalCode.length < 5}
                  loading={isLoadingAddresses}
                  style={{ marginTop: 8 }}
                  icon="magnify"
                >
                  {isLoadingAddresses ? 'Finding...' : 'Find'}
                </Button>
              </View>

              {/* Manual Address Entry Toggle */}
              {!showManualAddress && (
                <TouchableOpacity
                  onPress={() => setShowManualAddress(true)}
                  style={{ marginBottom: 16 }}
                >
                  <Text style={{
                    color: materialTheme.colors.primary,
                    textDecorationLine: 'underline',
                    fontSize: 14
                  }}>
                    📝 Enter address manually
                  </Text>
                </TouchableOpacity>
              )}

              {/* Address Lines - Hidden by default, shown when manual entry selected or address filled */}
              {(showManualAddress || userData.address1) && (
                <>
                  <TextInput
                    mode="outlined"
                    label="Address Line 1"
                    value={userData.address1}
                    onChangeText={(value) => setUserData({ ...userData, address1: value })}
                    style={{ marginBottom: 16 }}
                    left={<TextInput.Icon icon="home" />}
                  />

                  <TextInput
                    mode="outlined"
                    label="Address Line 2 (Optional)"
                    value={userData.address2}
                    onChangeText={(value) => setUserData({ ...userData, address2: value })}
                    style={{ marginBottom: 16 }}
                    left={<TextInput.Icon icon="home" />}
                  />

                  <TextInput
                    mode="outlined"
                    label="Address Line 3 (Optional)"
                    value={userData.address3}
                    onChangeText={(value) => setUserData({ ...userData, address3: value })}
                    style={{ marginBottom: 16 }}
                    left={<TextInput.Icon icon="home" />}
                  />

                  <TextInput
                    mode="outlined"
                    label="Address Line 4 (Optional)"
                    value={userData.address4}
                    onChangeText={(value) => setUserData({ ...userData, address4: value })}
                    style={{ marginBottom: 16 }}
                    left={<TextInput.Icon icon="home" />}
                  />
                </>
              )}

              <TextInput
                mode="outlined"
                label="City"
                value={userData.city}
                onChangeText={(value) => setUserData({ ...userData, city: value })}
                style={{ marginBottom: 16 }}
                left={<TextInput.Icon icon="city" />}
              />

            </Card.Content>
          </Card>

          {/* Email Preferences Card */}
          <Card style={{ marginBottom: 24, elevation: 2 }}>
            <Card.Content style={{ padding: 20 }}>
              <Text variant="titleMedium" style={{
                marginBottom: 16,
                color: materialTheme.colors.primary,
                fontWeight: '600'
              }}>
                📧 Email Preferences
              </Text>

              <View style={{ marginBottom: 12 }}>
                <Checkbox.Item
                  label="System announcements and security notifications"
                  status={userData.emailPreferences?.systemAnnouncements ? 'checked' : 'unchecked'}
                  onPress={() => setUserData({
                    ...userData,
                    emailPreferences: {
                      ...userData.emailPreferences,
                      systemAnnouncements: !userData.emailPreferences?.systemAnnouncements
                    }
                  })}
                  mode="android"
                />
              </View>

              <View style={{ marginBottom: 12 }}>
                <Checkbox.Item
                  label="News and feature updates"
                  status={userData.emailPreferences?.newsAndFeatureUpdates ? 'checked' : 'unchecked'}
                  onPress={() => setUserData({
                    ...userData,
                    emailPreferences: {
                      ...userData.emailPreferences,
                      newsAndFeatureUpdates: !userData.emailPreferences?.newsAndFeatureUpdates
                    }
                  })}
                  mode="android"
                />
              </View>

              <View>
                <Checkbox.Item
                  label="Promotions and special offers"
                  status={userData.emailPreferences?.promotionsAndSpecialOffers ? 'checked' : 'unchecked'}
                  onPress={() => setUserData({
                    ...userData,
                    emailPreferences: {
                      ...userData.emailPreferences,
                      promotionsAndSpecialOffers: !userData.emailPreferences?.promotionsAndSpecialOffers
                    }
                  })}
                  mode="android"
                />
              </View>

            </Card.Content>
          </Card>

          {/* Upload Message */}
          {uploadMessage !== '' && (
            <Text style={{
              textAlign: 'center',
              marginBottom: 16,
              fontSize: 16,
              color: materialTheme.colors.primary
            }}>
              {uploadMessage}
            </Text>
          )}

          {/* Register Button */}
          <Button
            mode="contained"
            onPress={submitRegisterRequest}
            disabled={disableRegisterButton}
            style={{
              paddingVertical: 8,
              marginBottom: 20,
              borderRadius: 8
            }}
            contentStyle={{ paddingVertical: 4 }}
          >
            {disableRegisterButton ? 'Creating Account...' : 'Create Account'}
          </Button>

        </View>
      </KeyboardAwareScrollView>

      {/* Gender Selection Modal */}
      <Portal>
        <Modal visible={showGenderModal} onDismiss={() => setShowGenderModal(false)} contentContainerStyle={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Gender</Text>
            <Divider style={{ marginVertical: 10 }} />
            <ScrollView style={{ maxHeight: 400 }}>
              {genderOptions.map((option, index) => (
                <Pressable
                  key={index}
                  onPress={() => selectGender(option)}
                  style={styles.modalOption}
                  testID={`gender-option-${option.value}`}
                >
                  <Text style={styles.modalOptionText}>{option.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Divider style={{ marginVertical: 10 }} />
            <Button mode="outlined" onPress={() => setShowGenderModal(false)}>Cancel</Button>
          </View>
        </Modal>
      </Portal>

      {/* Citizenship Selection Modal */}
      <Portal>
        <Modal visible={showCitizenshipModal} onDismiss={() => setShowCitizenshipModal(false)} contentContainerStyle={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Country of Citizenship</Text>
            <Divider style={{ marginVertical: 10 }} />
            <ScrollView style={{ maxHeight: 400 }}>
              {citizenshipOptions.map((option, index) => (
                <Pressable
                  key={index}
                  onPress={() => selectCitizenship(option)}
                  style={styles.modalOption}
                >
                  <Text style={styles.modalOptionText}>{option.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Divider style={{ marginVertical: 10 }} />
            <Button mode="outlined" onPress={() => setShowCitizenshipModal(false)}>Cancel</Button>
          </View>
        </Modal>
      </Portal>

      {/* Country Code Selection Modal */}
      <Portal>
        <Modal visible={showCountryCodeModal} onDismiss={() => setShowCountryCodeModal(false)} contentContainerStyle={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Country Code</Text>
            <Divider style={{ marginVertical: 10 }} />
            <ScrollView style={{ maxHeight: 400 }}>
              {countryCodeOptions.map((option, index) => (
                <Pressable
                  key={index}
                  onPress={() => selectCountryCode(option)}
                  style={styles.modalOption}
                >
                  <Text style={styles.modalOptionText}>{option.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Divider style={{ marginVertical: 10 }} />
            <Button mode="outlined" onPress={() => setShowCountryCodeModal(false)}>Cancel</Button>
          </View>
        </Modal>
      </Portal>

      {/* Address Selection Modal */}
      <Portal>
        <Modal visible={showAddressModal} onDismiss={() => setShowAddressModal(false)} contentContainerStyle={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Your Address</Text>
            <Text style={styles.modalSubtitle}>Found {addressList.length} addresses for this postcode:</Text>
            <Divider style={{ marginVertical: 10 }} />
            <ScrollView style={{ maxHeight: 450 }}>
              {addressList.map((address, index) => (
                <Pressable
                  key={index}
                  onPress={() => {
                    selectAddress(address);
                    setShowAddressModal(false);
                  }}
                  style={styles.addressOption}
                >
                  <Text style={styles.addressOptionText}>
                    {address.line1}
                    {address.line2 ? `, ${address.line2}` : ''}
                  </Text>
                  <Text style={styles.addressOptionSubtext}>
                    {[address.line3, address.city, address.postcode]
                      .filter(Boolean)
                      .join(', ')}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Divider style={{ marginVertical: 10 }} />
            <Button mode="outlined" onPress={() => setShowAddressModal(false)}>Cancel</Button>
          </View>
        </Modal>
      </Portal>

      {/* Date Picker Modal */}
      <DatePicker
        modal
        open={showDateModal}
        date={dateOfBirthDate}
        mode="date"
        maximumDate={new Date()}
        minimumDate={new Date(1900, 0, 1)}
        onConfirm={onDateConfirm}
        onCancel={() => setShowDateModal(false)}
        title="Select Date of Birth"
      />
    </>
  );
};

const styles = StyleSheet.create({
  errorDisplay: {
    backgroundColor: '#ffebee',
    padding: 12,
    marginBottom: 16,
    borderRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorDisplayText: {
    color: '#c62828',
    fontSize: 14,
  },
  modalContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalOption: {
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#000000',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#000000',
    marginBottom: 5,
    textAlign: 'center',
  },
  addressOption: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  addressOptionText: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
    marginBottom: 4,
  },
  addressOptionSubtext: {
    fontSize: 13,
    color: '#555555',
  },
  navButton: {
    padding: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    minWidth: 50,
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 24,
    color: '#1976D2',
    fontWeight: 'bold',
  },
  calendarContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
  },
  calendarRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 5,
  },
  calendarDayHeader: {
    width: 40,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarDayHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  calendarDay: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  calendarDaySelected: {
    backgroundColor: '#1976D2',
  },
  calendarDayText: {
    fontSize: 16,
    color: '#000',
  },
  calendarDayTextSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});

export default Register;

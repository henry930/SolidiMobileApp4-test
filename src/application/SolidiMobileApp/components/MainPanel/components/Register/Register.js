import React, { useContext, useEffect, useState } from 'react';
import { View, Alert, TouchableOpacity, StyleSheet } from 'react-native';
import { Text, Button, TextInput, Card, useTheme, Checkbox } from 'react-native-paper';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
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
    const buttons = genderOptions.map(option => ({
      text: option.label,
      onPress: () => {
        console.log('🔍 Gender selected:', option.value);
        setGender(option.value);
        setUserData({ ...userData, gender: option.value });
      }
    }));
    buttons.push({ text: 'Cancel', style: 'cancel' });
    
    Alert.alert('Select Gender', 'Choose your gender:', buttons);
  };

  const showCitizenshipPicker = () => {
    console.log('🔍 showCitizenshipPicker called');
    console.log('🔍 citizenshipOptions length:', citizenshipOptions.length);
    
    // Test with just 3 countries first to make sure Alert.alert works
    const testCountries = [
      { label: 'United Kingdom', value: 'GB' },
      { label: 'United States', value: 'US' },
      { label: 'Canada', value: 'CA' }
    ];
    
    const buttons = testCountries.map(option => ({
      text: option.label,
      onPress: () => {
        console.log('🔍 Citizenship selected:', option.value, option.label);
        setCitizenship(option.value);
        setUserData({ ...userData, citizenship: option.value });
      }
    }));
    
    // Add a "More Countries" option
    buttons.push({ 
      text: 'More Countries...', 
      onPress: () => showMoreCitizenshipOptions()
    });
    
    buttons.push({ text: 'Cancel', style: 'cancel' });
    
    console.log('🔍 About to show alert with buttons:', buttons.map(b => b.text));
    Alert.alert('Select Country', 'Choose your country of citizenship:', buttons);
  };

  const showMoreCitizenshipOptions = () => {
    console.log('🔍 showMoreCitizenshipOptions called');
    
    // Show a selection of the remaining countries from our full list
    const moreCountries = [
      { label: 'Australia', value: 'AU' },
      { label: 'Germany', value: 'DE' },
      { label: 'France', value: 'FR' },
      { label: 'Spain', value: 'ES' },
      { label: 'Italy', value: 'IT' },
      { label: 'Netherlands', value: 'NL' }
    ];
    
    const buttons = moreCountries.map(option => ({
      text: option.label,
      onPress: () => {
        console.log('🔍 Citizenship selected:', option.value, option.label);
        setCitizenship(option.value);
        setUserData({ ...userData, citizenship: option.value });
      }
    }));
    
    buttons.push({ 
      text: 'Even More...', 
      onPress: () => showEvenMoreCitizenshipOptions()
    });
    buttons.push({ 
      text: '← Back to Main Countries', 
      onPress: () => showCitizenshipPicker()
    });
    buttons.push({ text: 'Cancel', style: 'cancel' });
    
    Alert.alert('More Countries', 'Choose your country of citizenship:', buttons);
  };

  const showEvenMoreCitizenshipOptions = () => {
    console.log('🔍 showEvenMoreCitizenshipOptions called');
    
    // Show the rest of the countries
    const evenMoreCountries = [
      { label: 'Japan', value: 'JP' },
      { label: 'South Korea', value: 'KR' },
      { label: 'Singapore', value: 'SG' },
      { label: 'Hong Kong', value: 'HK' },
      { label: 'Switzerland', value: 'CH' },
      { label: 'Austria', value: 'AT' }
    ];
    
    const buttons = evenMoreCountries.map(option => ({
      text: option.label,
      onPress: () => {
        console.log('🔍 Citizenship selected:', option.value, option.label);
        setCitizenship(option.value);
        setUserData({ ...userData, citizenship: option.value });
      }
    }));
    
    buttons.push({ 
      text: '← Back to More Countries', 
      onPress: () => showMoreCitizenshipOptions()
    });
    buttons.push({ text: 'Cancel', style: 'cancel' });
    
    Alert.alert('Even More Countries', 'Choose your country of citizenship:', buttons);
  };

  const showCountryCodePicker = () => {
    console.log('🔍 showCountryCodePicker called');
    console.log('🔍 countryCodeOptions:', countryCodeOptions);
    
    // Show all country codes (there are only 10, so should fit)
    const buttons = countryCodeOptions.map(option => ({
      text: option.label,
      onPress: () => {
        console.log('🔍 Country code selected:', option.value, option.label);
        setCountryCode(option.value);
        setUserData({ ...userData, countryCode: option.value });
      }
    }));
    
    buttons.push({ text: 'Cancel', style: 'cancel' });
    
    console.log('🔍 About to show country code alert with buttons:', buttons.map(b => b.text));
    Alert.alert('Select Country Code', 'Choose your country code:', buttons);
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

        // Show success message and redirect to email verification
        Alert.alert(
          "Registration Successful!",
          result.message || "Please check your email for a verification code.",
          [
            {
              text: "Continue",
              onPress: () => {
                // Reset UI state
                setUploadMessage('');
                setDisableRegisterButton(false);
                
                // Redirect to registration completion page
                appState.setMainPanelState({
                  mainPanelState: 'RegistrationCompletion',
                  pageName: 'default'
                });
              }
            }
          ]
        );
        
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
        
        Alert.alert(
          "Registration Failed",
          result.message || "Please try again later.",
          [{ text: "OK" }]
        );
      }

    } catch (err) {
      console.error('❌ [UI] Registration error:', err);
      
      Alert.alert(
        "Registration Error",
        "An unexpected error occurred. Please try again.",
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
              onChangeText={(value) => setUserData({...userData, email: value})}
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
              onChangeText={(value) => setUserData({...userData, password: value})}
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
              onChangeText={(value) => setUserData({...userData, firstName: value})}
              style={{ marginBottom: 16 }}
              left={<TextInput.Icon icon="account" />}
            />

            {/* Last Name */}
            <TextInput
              mode="outlined"
              label="Last Name"
              value={userData.lastName}
              onChangeText={(value) => setUserData({...userData, lastName: value})}
              style={{ marginBottom: 16 }}
              left={<TextInput.Icon icon="account" />}
            />

            {/* Gender Selector */}
            <TouchableOpacity onPress={showGenderPicker}>
              <TextInput
                mode="outlined"
                label="Gender"
                value={gender || 'Tap to select'}
                editable={false}
                style={{ marginBottom: 16 }}
                left={<TextInput.Icon icon="human-male-female" />}
                right={<TextInput.Icon icon="chevron-down" />}
              />
            </TouchableOpacity>

            {/* Date of Birth */}
            <TextInput
              mode="outlined"
              label="Date of Birth (DD/MM/YYYY)"
              value={userData.dateOfBirth}
              onChangeText={(value) => setUserData({...userData, dateOfBirth: value})}
              placeholder="01/01/1990"
              style={{ marginBottom: 16 }}
              left={<TextInput.Icon icon="calendar" />}
            />

            {/* Citizenship Selector */}
            <TouchableOpacity onPress={showCitizenshipPicker}>
              <TextInput
                mode="outlined"
                label="Country of Citizenship"
                value={citizenshipOptions.find(c => c.value === citizenship)?.label || citizenship || 'Tap to select country'}
                editable={false}
                style={{ marginBottom: 16 }}
                left={<TextInput.Icon icon="flag" />}
                right={<TextInput.Icon icon="chevron-down" />}
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
                  right={<TextInput.Icon icon="chevron-down" />}
                />
              </TouchableOpacity>
              <TextInput
                mode="outlined"
                label="Phone Number"
                value={userData.mobileNumber}
                onChangeText={(value) => setUserData({...userData, mobileNumber: value})}
                keyboardType="phone-pad"
                style={{ flex: 0.65 }}
              />
            </View>

            {/* Address */}
            <TextInput
              mode="outlined"
              label="Address Line 1"
              value={userData.address1}
              onChangeText={(value) => setUserData({...userData, address1: value})}
              style={{ marginBottom: 16 }}
              left={<TextInput.Icon icon="home" />}
            />

            <TextInput
              mode="outlined"
              label="Address Line 2 (Optional)"
              value={userData.address2}
              onChangeText={(value) => setUserData({...userData, address2: value})}
              style={{ marginBottom: 16 }}
              left={<TextInput.Icon icon="home" />}
            />

            <View style={{ flexDirection: 'row', marginBottom: 16 }}>
              <TextInput
                mode="outlined"
                label="City"
                value={userData.city}
                onChangeText={(value) => setUserData({...userData, city: value})}
                style={{ flex: 1, marginRight: 8 }}
              />
              <TextInput
                mode="outlined"
                label="Postal Code"
                value={userData.postalCode}
                onChangeText={(value) => setUserData({...userData, postalCode: value})}
                style={{ flex: 0.6 }}
              />
            </View>

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
});

export default Register;

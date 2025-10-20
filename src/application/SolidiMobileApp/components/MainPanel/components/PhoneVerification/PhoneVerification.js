// React imports
import React, { useContext, useEffect, useRef, useState } from 'react';
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  Platform, 
  Alert 
} from 'react-native';

// Material Design imports
import {
  Card,
  Text,
  TextInput,
  Button,
  useTheme,
  Title,
} from 'react-native-paper';

// Other imports
import _ from 'lodash';

// Import logger functionality
import logger from 'src/util/logger';
let logger2 = logger.extend('PhoneVerification');
let { log, jd } = logger.getShortcuts(logger2);

// Import miscellaneous functionality
import misc from 'src/util/misc';

// Import app context
import AppStateContext from 'src/application/data';

export default function PhoneVerification({ onComplete }) {
  const appState = useContext(AppStateContext);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [uploadMessage, setUploadMessage] = useState('');
  const [userInitiatedVerification, setUserInitiatedVerification] = useState(false);

  const registrationPhone = appState.registrationPhone || '';

  useEffect(() => {
    log('Phone verification page mounted');
    // Auto-focus on verification code input
    setTimeout(() => {
      if (verificationInput.current) {
        verificationInput.current.focus();
      }
    }, 500);
  }, []);

  const verificationInput = useRef();

  const handleVerificationCodeChange = (code) => {
    setVerificationCode(code);
    
    // Auto-submit when 4 digits are entered (corrected from 6 to 4)
    if (code.length === 4) {
      setUserInitiatedVerification(true);
      handleVerifyPhone();
    }
  };

  // 🔐 BACKGROUND LOGIN FUNCTION AFTER MOBILE VERIFICATION
  const performBackgroundLogin = async () => {
    try {
      log('🔐 [Background Login] Starting automatic login after phone verification...');
      
      // Get stored email and password from registration data
      const storedCredentials = appState.registerConfirmData;
      if (!storedCredentials || !storedCredentials.email || !storedCredentials.password) {
        log('❌ [Background Login] No stored credentials found');
        console.log('❌ [Background Login] Missing stored credentials:', {
          hasRegisterConfirmData: !!appState.registerConfirmData,
          hasEmail: !!(appState.registerConfirmData?.email),
          hasPassword: !!(appState.registerConfirmData?.password)
        });
        return;
      }

      const { email, password } = storedCredentials;
      log(`🔐 [Background Login] Found stored credentials for: ${email}`);
      console.log('🔐 [Background Login] Attempting login with stored credentials');

      // Perform background login using the stored email/password
      const loginResult = await appState.login({
        email: email,
        password: password,
        tfa: '' // Empty string for accounts without 2FA
      });

      if (loginResult === 'SUCCESS') {
        log('✅ [Background Login] Automatic login successful!');
        console.log('✅ [Background Login] User is now authenticated with API credentials');
        
        // Verify user is now authenticated
        if (appState.user.isAuthenticated) {
          log('✅ [Background Login] User authentication confirmed');
          console.log('🔑 [Background Login] API credentials are now available for API calls');
        } else {
          log('⚠️ [Background Login] Login reported success but user not marked as authenticated');
        }
      } else if (loginResult === 'TFA_REQUIRED') {
        log('🔒 [Background Login] Two-factor authentication required');
        console.log('🔒 [Background Login] Account has 2FA enabled, manual login will be required');
      } else {
        log(`❌ [Background Login] Login failed with result: ${loginResult}`);
        console.log('❌ [Background Login] Automatic login failed, user will need to login manually');
      }

    } catch (error) {
      log(`❌ [Background Login] Error during automatic login: ${error.message}`);
      console.log('❌ [Background Login] Exception during login:', error);
    }
  };

  const handleVerifyPhone = async () => {
    if (!verificationCode) {
      Alert.alert('Invalid Code');
      return;
    }

    setIsVerifying(true);
    setUserInitiatedVerification(true);
    setUploadMessage('Verifying your phone number...');

    try {
      log(`Verifying phone with code: ${verificationCode}`);
      
      // Call phone verification API - using same pattern as RegisterConfirm
      const result = await appState.publicMethod({
        functionName: 'verifyPhone',
        apiRoute: `confirm_mobile/${appState.registrationEmail}/${verificationCode}`,
        params: {}
      });

      log('📱 [PhoneVerification] API response:', result);

      // Check if API call returned a display error
      if (result === 'DisplayedError') {
        setUploadMessage('');
        setIsVerifying(false);
        return;
      }

      // Check for success - look for "success" anywhere in the response
      const resultString = JSON.stringify(result).toLowerCase();
      const isSuccess = result && (
        result.success || 
        result.result === 'success' ||
        (result.error && typeof result.error === 'string' && result.error.toLowerCase().includes('success')) ||
        resultString.includes('success')
      );

      if (isSuccess) {
        log('✅ Phone verification successful - Registration complete!');
        setUploadMessage('Phone verified successfully!');
        
        // 🔐 AUTOMATIC BACKGROUND LOGIN AFTER MOBILE VERIFICATION
        log('🔐 Starting automatic background login after mobile verification...');
        await performBackgroundLogin();
        
        // Mark phone as verified for completion tracking
        appState.phoneVerified = true;
        
        // Auto-proceed to next step without popup
        if (onComplete) {
          onComplete({ phoneVerified: true });
        } else if (userInitiatedVerification) {
          // Only redirect to login if user actually initiated verification
          log('🔄 User-initiated verification successful, redirecting to login');
          
          // Clear registration data and go to login
          appState.registrationEmail = null;
          appState.registrationPhone = null;
          appState.registrationSuccess = false;
          
          // Redirect to login page for user to sign in
          appState.setMainPanelState({
            mainPanelState: 'Login',
            pageName: 'default'
          });
        } else {
          // If verification wasn't user-initiated (possibly automatic), just stay on current page
          log('🔒 Non-user-initiated verification detected, staying on current page to prevent Face ID redirect');
        }
      } else {
        log('❌ Phone verification failed - no success indicator found');
        setUploadMessage('');
        // Don't show alert here, let it fall through to catch if needed
      }
    } catch (error) {
      log(`❌ Phone verification error: ${error.message}`);
      setUploadMessage('');
      // Don't show alert for API errors since success might be in error field
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    setResendDisabled(true);
    setResendTimer(60);
    
    try {
      // Resend verification SMS
      const result = await appState.publicMethod({
        functionName: 'resendPhoneVerification',
        apiRoute: 'resend_phone_verification',
        params: {
          phoneNumber: registrationPhone
        }
      });

      // Check for success - look for "success" anywhere in the response
      const resultString = JSON.stringify(result).toLowerCase();
      const resendSuccess = result && (
        result.success || 
        result.result === 'success' ||
        (result.error && typeof result.error === 'string' && result.error.toLowerCase().includes('success')) ||
        resultString.includes('success')
      );

      if (resendSuccess) {
        Alert.alert('Code Sent', 'A new verification code has been sent to your phone');
      }
      // No error alert since success might be in error field
    } catch (error) {
      // No error alert since success might be in error field
    }

    // Start countdown timer
    const timer = setInterval(() => {
      setResendTimer(prevTimer => {
        const newTimer = prevTimer - 1;
        if (newTimer <= 0) {
          clearInterval(timer);
          setResendDisabled(false);
          return 0;
        }
        return newTimer;
      });
    }, 1000);
  };

  const materialTheme = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: materialTheme.colors.background, padding: 20 }}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.inputContainer}>
            <TextInput
              ref={verificationInput}
              mode="outlined"
              label="Verification Code"
              value={verificationCode}
              onChangeText={handleVerificationCodeChange}
              keyboardType="numeric"
              maxLength={6}
              autoCapitalize="none"
              autoCorrect={false}
              disabled={isVerifying}
              style={styles.input}
              dense={false}
              contentStyle={styles.inputContent}
              outlineStyle={styles.inputOutline}
              theme={{
                colors: {
                  primary: '#2196F3',
                  onSurfaceVariant: '#666',
                }
              }}
            />
            
            <Button
              mode="contained"
              onPress={handleVerifyPhone}
              disabled={isVerifying || verificationCode.length === 0}
              style={styles.verifyButton}
            >
              {isVerifying ? 'Verifying...' : 'Verify'}
            </Button>
          </View>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    flex: 1,
    height: 56, // Material Design standard height
  },
  inputContent: {
    textAlign: 'center',
    fontSize: 20,
    letterSpacing: 4,
    fontWeight: '600',
    color: '#333',
  },
  inputOutline: {
    borderWidth: 2,
    borderRadius: 8,
  },
  verifyButton: {
    minWidth: 120,
    height: 56, // Match input height
    justifyContent: 'center',
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
});
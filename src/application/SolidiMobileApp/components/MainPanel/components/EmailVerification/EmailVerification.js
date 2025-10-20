import React, { useContext, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Card, Text, TextInput, Button, useTheme, Title } from 'react-native-paper';
import _ from 'lodash';
import logger from 'src/util/logger';
let logger2 = logger.extend('EmailVerification');
let { log, jd } = logger.getShortcuts(logger2);
import misc from 'src/util/misc';
import AppStateContext from 'src/application/data';

export default function EmailVerification({ onComplete }) {
  const appState = useContext(AppStateContext);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [uploadMessage, setUploadMessage] = useState('');

  const registrationEmail = appState.registrationEmail || '';

  useEffect(() => {
    log('Email verification page mounted');
    setTimeout(() => {
      if (verificationInput.current) {
        verificationInput.current.focus();
      }
    }, 500);
  }, []);

  const verificationInput = useRef();

  const handleVerificationCodeChange = (code) => {
    setVerificationCode(code);
    if (code.length === 6) {
      setTimeout(() => {
        handleVerifyEmail();
      }, 500);
    }
  };

  const handleVerifyEmail = async () => {
    if (!verificationCode) {
      Alert.alert('Invalid Code', 'Please enter again');
      return;
    }

    setIsVerifying(true);
    setUploadMessage('Verifying your email...');

    try {
      log(`Verifying email with code: ${verificationCode}`);
      
      const result = await appState.publicMethod({
        functionName: 'verifyEmail',
        apiRoute: `confirm_email_and_send_mobile_code/${registrationEmail}/${verificationCode}`,
        params: {}
      });

      log('📧 [EmailVerification] API response:', result);

      if (result === 'DisplayedError') {
        setUploadMessage('');
        setIsVerifying(false);
        return;
      }

      // Check for success - same logic as PhoneVerification
      const resultString = JSON.stringify(result).toLowerCase();
      const isSuccess = result && (
        result.success || 
        result.result === 'success' ||
        (result.error && typeof result.error === 'string' && result.error.toLowerCase().includes('success')) ||
        resultString.includes('success')
      );

      if (isSuccess) {
        log('✅ Email verification successful');
        setUploadMessage('Email verified successfully!');
        appState.emailVerified = true;
        
        if (onComplete) {
          onComplete({ emailVerified: true });
        } else {
          appState.setMainPanelState({
            mainPanelState: 'PhoneVerification',
            pageName: 'default'
          });
        }
      } else {
        log('❌ Email verification failed - no success indicator found');
        setUploadMessage('');
      }
    } catch (error) {
      log(`❌ Email verification error: ${error.message}`);
      setUploadMessage('');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    setResendDisabled(true);
    setResendTimer(60);
    
    try {
      const result = await appState.publicMethod({
        functionName: 'resendEmailVerification',
        apiRoute: 'resend_email_verification',
        params: { email: registrationEmail }
      });

      // Use same success detection pattern as PhoneVerification
      const resultString = JSON.stringify(result).toLowerCase();
      const resendSuccess = result && (
        result.success || 
        result.result === 'success' ||
        (result.error && typeof result.error === 'string' && result.error.toLowerCase().includes('success')) ||
        resultString.includes('success')
      );

      if (resendSuccess) {
        Alert.alert('Code Sent', 'A new verification code has been sent to your email');
      }
    } catch (error) {
      // No error alert since success might be in error field
    }

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
    <ScrollView 
      style={{ flex: 1, backgroundColor: materialTheme.colors.background }}
      contentContainerStyle={styles.container}
    >
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>Verify Your Email</Title>
          <Text style={styles.description}>
            Enter the verification code sent to: {registrationEmail}
          </Text>
          
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
              onPress={handleVerifyEmail}
              disabled={isVerifying || verificationCode.length === 0}
              style={styles.verifyButton}
            >
              {isVerifying ? 'Verifying...' : 'Verify Email'}
            </Button>
          </View>

          {uploadMessage ? (
            <Text style={styles.statusMessage}>{uploadMessage}</Text>
          ) : null}

          <View style={styles.resendContainer}>
            <TouchableOpacity
              onPress={handleResendCode}
              disabled={resendDisabled}
              style={[styles.resendButton, resendDisabled && styles.disabledButton]}
            >
              <Text style={[styles.resendText, resendDisabled && styles.disabledText]}>
                {resendDisabled ? `Resend in ${resendTimer}s` : 'Resend Code'}
              </Text>
            </TouchableOpacity>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  card: {
    marginVertical: 10,
    elevation: 4,
  },
  title: {
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    height: 56,
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
    height: 56,
    justifyContent: 'center',
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusMessage: {
    textAlign: 'center',
    marginVertical: 10,
    color: '#2196F3',
    fontWeight: '500',
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  resendButton: {
    padding: 12,
  },
  resendText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '500',
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledText: {
    color: '#999',
  },
});
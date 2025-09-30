// React imports
import React, { useContext, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, ScrollView, Alert } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

// Material Design imports
import {
  Card,
  Text,
  TextInput,
  Button,
  useTheme,
  Surface,
  Avatar,
  Divider,
} from 'react-native-paper';

// Other imports
import _ from 'lodash';
import Big from 'big.js';

// Internal imports
import AppStateContext from 'src/application/data';
import { colors, sharedStyles, sharedColors, layoutStyles, cardStyles } from 'src/constants';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import misc from 'src/util/misc';

// Create local references for commonly used styles
const layout = layoutStyles;
const cards = cardStyles;

// Logger
import logger from 'src/util/logger';
import { out } from 'react-native/Libraries/Animated/Easing';
let logger2 = logger.extend('ResetPassword');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);


/* Notes


*/




let ResetPassword = () => {

  let appState = useContext(AppStateContext);
  let [renderCount, triggerRender] = useState(0);
  let firstRender = misc.useFirstRender();
  let stateChangeID = appState.stateChangeID;
  let theme = useTheme();

  let pageName = appState.pageName;
  let permittedPageNames = 'default'.split(' ');
  misc.confirmItemInArray('permittedPageNames', permittedPageNames, pageName, 'ResetPassword');

  let [errorMessage, setErrorMessage] = useState('');
  let [email, setEmail] = useState('');
  let [resultMessage, setResultMessage] = useState('');
  let [isLoading, setIsLoading] = useState(false);




  // Initial setup.
  useEffect( () => {
    setup();
  }, []); // Pass empty array so that this only runs once on mount.


  let setup = async () => {
    try {
      await appState.generalSetup();
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
      triggerRender(renderCount+1);
    } catch(err) {
      let msg = `ResetPassword.setup: Error = ${err}`;
      console.log(msg);
    }
  }


  return (
    <Surface style={[layout.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAwareScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={layout.scrollContainer}
        keyboardShouldPersistTaps='handled'
      >
        
        {/* Header */}
        <View style={styles.headerContainer}>
          <Avatar.Icon 
            size={60} 
            icon="lock-reset" 
            style={[styles.headerIcon, { backgroundColor: theme.colors.primary }]}
          />
          <Text variant="headlineMedium" style={styles.headerTitle}>
            Reset Password
          </Text>
          <Text variant="bodyMedium" style={[styles.headerSubtitle, { color: theme.colors.onSurfaceVariant }]}>
            Enter your email address to receive a password reset link
          </Text>
        </View>

        {/* Main Content Card */}
        <Card style={[cards.elevated, styles.mainCard]}>
          <Card.Content style={styles.cardContent}>
            
            {/* Email Input */}
            <TextInput
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.textInput}
              error={!_.isEmpty(errorMessage)}
              left={<TextInput.Icon icon="email" />}
            />

            {/* Error Message */}
            {!_.isEmpty(errorMessage) && (
              <Text variant="bodySmall" style={[styles.errorText, { color: theme.colors.error }]}>
                {errorMessage}
              </Text>
            )}

            {/* Success Message */}
            {!_.isEmpty(resultMessage) && (
              <Card style={[styles.resultCard, { backgroundColor: theme.colors.primaryContainer }]}>
                <Card.Content>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onPrimaryContainer }}>
                    {resultMessage}
                  </Text>
                </Card.Content>
              </Card>
            )}

            {/* Reset Button */}
            <Button
              mode="contained"
              onPress={async () => {
                if (_.isEmpty(email)) {
                  setErrorMessage('Please enter your email address.');
                } else {
                  setErrorMessage('');
                  setIsLoading(true);
                  
                  try {
                    let output = await appState.resetPassword({email});
                    if (_.has(output, 'result')) {
                      let result = output.result;
                      if (result == 'success') {
                        // Show success popup and redirect
                        Alert.alert(
                          'Password Reset Sent',
                          'An email containing a password reset link has been sent to your email address. After you have followed the link and reset your password on the main website, you\'ll be able to log in to this app.',
                          [
                            {
                              text: 'OK',
                              onPress: () => {
                                // Redirect to index page
                                appState.setMainPanelState('index');
                              }
                            }
                          ]
                        );
                      } else {
                        setErrorMessage('Failed to send reset email. Please try again.');
                      }
                    } else {
                      setErrorMessage('An error occurred. Please try again.');
                    }
                  } catch (error) {
                    setErrorMessage('Network error. Please check your connection and try again.');
                  } finally {
                    setIsLoading(false);
                  }
                }
              }}
              loading={isLoading}
              disabled={isLoading}
              style={styles.resetButton}
              icon="send"
            >
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </Button>

          </Card.Content>
        </Card>

      </KeyboardAwareScrollView>
    </Surface>
  )

}


let styles = StyleSheet.create({
  headerContainer: {
    alignItems: 'center',
    marginBottom: scaledHeight(30),
    paddingHorizontal: scaledWidth(20),
  },
  headerIcon: {
    marginBottom: scaledHeight(15),
  },
  headerTitle: {
    textAlign: 'center',
    marginBottom: scaledHeight(8),
    fontWeight: '600',
  },
  headerSubtitle: {
    textAlign: 'center',
    lineHeight: 20,
  },
  mainCard: {
    marginHorizontal: scaledWidth(20),
    marginBottom: scaledHeight(20),
  },
  cardContent: {
    paddingVertical: scaledHeight(20),
  },
  textInput: {
    marginBottom: scaledHeight(10),
  },
  errorText: {
    marginBottom: scaledHeight(15),
    marginLeft: scaledWidth(5),
  },
  resultCard: {
    marginVertical: scaledHeight(15),
  },
  resetButton: {
    marginTop: scaledHeight(20),
    paddingVertical: scaledHeight(5),
  },
});


export default ResetPassword;

// React imports
import React, { useContext, useEffect, useState } from 'react';
import { Text, StyleSheet, View, ScrollView, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Material Design imports
import {
  Avatar,
  Button,
  Card,
  Divider,
  List,
  Surface,
  useTheme,
  Icon,
  Chip,
  Switch,
} from 'react-native-paper';

// Other imports
import _ from 'lodash';
import Big from 'big.js';

// Internal imports
import AppStateContext from 'src/application/data';
import { colors } from 'src/constants';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import { FixedWidthButton, ImageButton } from 'src/components/atomic';
import misc from 'src/util/misc';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('Settings');
let { deb, dj, log, lj } = logger.getShortcuts(logger2);




let Settings = () => {

  let appState = useContext(AppStateContext);
  let [renderCount, triggerRender] = useState(0);
  let [biometricsEnabled, setBiometricsEnabled] = useState(true); // Default to enabled
  let firstRender = misc.useFirstRender();
  let stateChangeID = appState.stateChangeID;

  let pageName = appState.pageName;
  let permittedPageNames = 'default'.split(' ');
  misc.confirmItemInArray('permittedPageNames', permittedPageNames, pageName, 'Settings');




  // Initial setup.
  useEffect(() => {
    // Log user data immediately when component mounts
    console.log('⚡ Settings component mounted - immediate user data check:');
    console.log('   AppState available:', !!appState);
    console.log('   User authenticated:', appState?.isAuthenticated);
    console.log('   User email (direct):', appState?.userInfo?.email || appState?.getUserInfo?.('email'));
    console.log('   User name (direct):', `${appState?.userInfo?.firstName || ''} ${appState?.userInfo?.lastName || ''}`);

    setup();
    loadBiometricPreference();
  }, []); // Pass empty array so that this only runs once on mount.


  let setup = async () => {
    try {
      await appState.generalSetup({ caller: 'Settings' });
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;

      // Load user profile data in background (non-blocking)
      console.log('⚙️ [Settings] Loading user profile data in background...');
      // Don't await - let it load in background so cached data shows immediately
      appState.loadUserInfo().then(() => {
        console.log('✅ [Settings] User info reloaded in background');
        triggerRender(prev => prev + 1); // Force re-render with fresh data
      }).catch(error => {
        console.error('❌ [Settings] Background user info reload failed:', error);
      });

      appState.loadUserStatus().then(() => {
        console.log('✅ [Settings] User status reloaded in background');
      }).catch(error => {
        console.error('❌ [Settings] Failed to reload user status:', error);
      });

      // 🔍 LOG ALL USER RECORDS AFTER LOGIN
      console.log('👤 ========== USER RECORDS IN SETTINGS PAGE ==========');
      console.log('🌐 AppState Available:', !!appState);
      console.log('🔐 Authentication Status:', {
        isAuthenticated: appState.isAuthenticated || false,
        authToken: appState.authToken ? 'Present' : 'Missing',
        sessionActive: appState.sessionActive || false
      });

      // Log all user info methods
      console.log('👤 User Info via getUserInfo methods:');
      const userInfoFields = ['firstName', 'lastName', 'email', 'id', 'username', 'phone', 'address', 'dateOfBirth', 'accountType', 'status'];
      userInfoFields.forEach(field => {
        try {
          const value = appState.getUserInfo(field);
          console.log(`   ${field}: ${value}`);
        } catch (err) {
          console.log(`   ${field}: [Error getting value]`);
        }
      });

      // Log raw user data objects
      console.log('📋 Raw User Data Objects:');
      console.log('   appState.userInfo:', appState.userInfo);
      console.log('   appState.userData:', appState.userData);
      console.log('   appState.user:', appState.user);
      console.log('   appState.profile:', appState.profile);
      console.log('   appState.account:', appState.account);

      // Log session and state data
      console.log('🔧 Session & State Data:');
      console.log('   sessionId:', appState.sessionId);
      console.log('   sessionData:', appState.sessionData);
      console.log('   stateData:', appState.stateData);
      console.log('   currentState:', appState.currentState);

      // Log API and server info
      console.log('🌐 API & Server Info:');
      console.log('   apiUrl:', appState.apiUrl);
      console.log('   serverInfo:', appState.serverInfo);
      console.log('   connectionStatus:', appState.connectionStatus);

      // Log all appState properties (careful with this one)
      console.log('🔍 All AppState Properties:');
      const appStateKeys = Object.keys(appState || {});
      console.log('   Available properties:', appStateKeys.slice(0, 20)); // Limit to first 20 to avoid overflow

      console.log('👤 ================= END USER RECORDS =================');

      triggerRender(renderCount + 1);
    } catch (err) {
      let msg = `Settings.setup: Error = ${err}`;
      console.log(msg);
      console.error('❌ Error in Settings setup:', err);
    }
  }


  let getUserName = () => {
    // Debug: Log the entire user.info.user object with safe access
    console.log('🔍 [Settings getUserName] Full user.info.user object:', appState.state?.user?.info?.user);
    console.log('🔍 [Settings getUserName] Keys in user.info.user:', Object.keys(appState.state?.user?.info?.user || {}));

    let firstName = appState.getUserInfo('firstName');
    let lastName = appState.getUserInfo('lastName');

    console.log('🔍 [Settings getUserName] firstName result:', firstName);
    console.log('🔍 [Settings getUserName] lastName result:', lastName);

    if (firstName === '[loading]' || lastName === '[loading]') {
      // Show loading while fetching fresh data
      return 'Loading...';
    } else {
      return `${firstName} ${lastName}`;
    }
  }

  let getUserEmail = () => {
    let email = appState.getUserInfo('email');
    console.log('🔍 [Settings getUserEmail] email result:', email);

    if (email === '[loading]') {
      // Show loading while fetching fresh data
      return 'Loading...';
    }
    return email;
  }

  const loadBiometricPreference = async () => {
    try {
      const enabled = await AsyncStorage.getItem('biometricsEnabled');
      // Default to true (enabled) if no preference is saved
      setBiometricsEnabled(enabled === null ? true : enabled === 'true');
      console.log('📱 [Settings] Loaded biometric preference:', enabled);
    } catch (error) {
      console.error('❌ [Settings] Error loading biometric preference:', error);
    }
  };

  const toggleBiometrics = async (value) => {
    try {
      await AsyncStorage.setItem('biometricsEnabled', value.toString());
      setBiometricsEnabled(value);
      console.log('📱 [Settings] Biometric preference saved:', value);

      // Show feedback to user
      if (value) {
        console.log('✅ Biometric authentication enabled');
      } else {
        console.log('❌ Biometric authentication disabled');
      }
    } catch (error) {
      console.error('❌ [Settings] Error saving biometric preference:', error);
    }
  };

  const materialTheme = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: materialTheme.colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16 }}
      >
        {/* Profile Header Card */}
        <Card style={{ marginBottom: 16, elevation: 2 }}>
          <Card.Content style={{ padding: 24 }}>
            <View style={{ alignItems: 'center' }}>
              <Avatar.Icon
                size={80}
                icon="account"
                style={{
                  marginBottom: 16,
                  backgroundColor: materialTheme.colors.primaryContainer
                }}
                color={materialTheme.colors.onPrimaryContainer}
              />
              <Text
                variant="headlineSmall"
                style={{
                  fontWeight: 'bold',
                  color: materialTheme.colors.onSurface,
                  marginBottom: 4
                }}
              >
                {getUserName()}
              </Text>
              <Text
                variant="bodyMedium"
                style={{
                  color: materialTheme.colors.onSurfaceVariant,
                  marginBottom: 16
                }}
              >
                {getUserEmail()}
              </Text>

            </View>
          </Card.Content>
        </Card>

        {/* Wallet & Finance Section */}
        <Card style={{ marginBottom: 16, elevation: 1 }}>
          <Card.Content style={{ padding: 0 }}>
            <List.Section>
              <List.Subheader style={{
                color: materialTheme.colors.primary,
                fontWeight: 'bold'
              }}>
                Wallet & Finance
              </List.Subheader>

              <List.Item
                title="Wallet"
                description="Manage deposits, withdrawals, and balances"
                left={props => <List.Icon {...props} icon="wallet" />}
                right={props => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => { appState.changeState('Wallet'); }}
                style={{ paddingVertical: 4 }}
              />

              <Divider />

              <List.Item
                title="Assets"
                description="View your cryptocurrency and fiat balances"
                left={props => <List.Icon {...props} icon="chart-line" />}
                right={props => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => { appState.changeState('Assets'); }}
                style={{ paddingVertical: 4 }}
              />
            </List.Section>
          </Card.Content>
        </Card>

        {/* Account Settings Section */}
        <Card style={{ marginBottom: 16, elevation: 1 }}>
          <Card.Content style={{ padding: 0 }}>
            <List.Section>
              <List.Subheader style={{
                color: materialTheme.colors.primary,
                fontWeight: 'bold'
              }}>
                Account Settings
              </List.Subheader>

              <List.Item
                title="Personal Details"
                description="Manage your personal information"
                left={props => <List.Icon {...props} icon="account-edit" />}
                right={props => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => { appState.changeState('PersonalDetails'); }}
                style={{ paddingVertical: 4 }}
              />

              <Divider />

              <List.Item
                title="Biometric Authentication"
                description={biometricsEnabled ? "Enabled" : "Disabled"}
                left={props => <List.Icon {...props} icon="fingerprint" />}
                right={() => (
                  <Switch
                    value={biometricsEnabled}
                    onValueChange={toggleBiometrics}
                    color={materialTheme.colors.primary}
                  />
                )}
                style={{ paddingVertical: 4 }}
              />

              <Divider />

              <List.Item
                title="Identity Verification"
                description="Verify your identity for enhanced features"
                left={props => <List.Icon {...props} icon="shield-check" />}
                right={props => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => { appState.changeState('IdentityVerification'); }}
                style={{ paddingVertical: 4 }}
              />

              <Divider />

              <List.Item
                title="Bank Account"
                description="Manage your banking details"
                left={props => <List.Icon {...props} icon="bank" />}
                right={props => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => { appState.changeState('BankAccounts'); }}
                style={{ paddingVertical: 4 }}
              />

              <Divider />

              <List.Item
                title="Solidi Account"
                description="Terms & Conditions and Delete Account"
                left={props => <List.Icon {...props} icon="account-cog" />}
                right={props => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => { appState.changeState('SolidiAccount'); }}
                style={{ paddingVertical: 4 }}
              />


            </List.Section>
          </Card.Content>
        </Card>

        {/* Activity & Management Section */}
        <Card style={{ marginBottom: 16, elevation: 1 }}>
          <Card.Content style={{ padding: 0 }}>
            <List.Section>
              <List.Subheader style={{
                color: materialTheme.colors.primary,
                fontWeight: 'bold'
              }}>
                Activity & Management
              </List.Subheader>

              <List.Item
                title="Transaction History"
                description="View your trading and transaction history"
                right={props => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => { appState.changeState('History'); }}
                style={{ paddingVertical: 4 }}
              />

              <Divider />

              <List.Item
                title="Address Book"
                description="Manage your saved addresses and contacts"
                right={props => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => { appState.changeState('AddressBook'); }}
                style={{ paddingVertical: 4 }}
                testID="settings-address-book-item"
              />
            </List.Section>
          </Card.Content>
        </Card>

        {/* Logout Section */}
        <Card style={{ marginBottom: 16, elevation: 1 }}>
          <Card.Content style={{ padding: 16 }}>
            <Button
              mode="outlined"
              icon="logout"
              onPress={async () => {
                try {
                  // Always perform complete logout - clears all stored credentials  
                  await appState.signOutCompletely();
                } catch (error) {
                  console.error('Complete logout error:', error);
                }
              }}
              style={{
                borderColor: materialTheme.colors.error,
                borderWidth: 1,
              }}
              textColor={materialTheme.colors.error}
              contentStyle={{ paddingVertical: 8 }}
            >
              Logout
            </Button>
          </Card.Content>
        </Card>

      </ScrollView>


    </View>
  )

}

export default Settings;

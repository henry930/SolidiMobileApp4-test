// React imports
import React, { useContext, useEffect, useState } from 'react';
import { Text, StyleSheet, View, ScrollView, Image } from 'react-native';

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
  Dialog,
  Portal,
  Paragraph,
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
let {deb, dj, log, lj} = logger.getShortcuts(logger2);




let Settings = () => {

  let appState = useContext(AppStateContext);
  let [renderCount, triggerRender] = useState(0);
  let [showLogoutDialog, setShowLogoutDialog] = useState(false);
  let firstRender = misc.useFirstRender();
  let stateChangeID = appState.stateChangeID;

  let pageName = appState.pageName;
  let permittedPageNames = 'default'.split(' ');
  misc.confirmItemInArray('permittedPageNames', permittedPageNames, pageName, 'Settings');




  // Initial setup.
  useEffect( () => {
    setup();
  }, []); // Pass empty array so that this only runs once on mount.


  let setup = async () => {
    try {
      await appState.generalSetup({caller: 'Settings'});
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
      triggerRender(renderCount+1);
    } catch(err) {
      let msg = `Settings.setup: Error = ${err}`;
      console.log(msg);
    }
  }


  let generateWelcomeMessage = () => {
    let firstName = appState.getUserInfo('firstName');
    let lastName = appState.getUserInfo('lastName');
    let loading = firstName === '[loading]' || lastName === '[loading]';
    
    if (loading) {
      // Use dummy data instead of showing "Loading..."
      return "John Doe";
    } else {
      return `${firstName} ${lastName}`;
    }
  }

  let getUserEmail = () => {
    let email = appState.getUserInfo('email');
    if (email === '[loading]') {
      // Use dummy data instead of showing "Loading..."
      return 'john.doe@example.com';
    }
    return email;
  }

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
                {generateWelcomeMessage()}
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
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Chip 
                  icon="star" 
                  compact
                  style={{ backgroundColor: materialTheme.colors.tertiaryContainer }}
                >
                  Premium
                </Chip>
              </View>
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
                right={props => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => { appState.changeState('PersonalDetails'); }}
                style={{ paddingVertical: 4 }}
              />
              
              <Divider />
              
              <List.Item
                title="Identity Verification"
                description="Verify your identity for enhanced features"
                right={props => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => { appState.changeState('IdentityVerification'); }}
                style={{ paddingVertical: 4 }}
              />
              
              <Divider />
              
              <List.Item
                title="Bank Account"
                description="Manage your banking details"
                right={props => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => { appState.changeState('BankAccounts'); }}
                style={{ paddingVertical: 4 }}
              />
              
              <Divider />
              
              <List.Item
                title="Account Review"
                description="Complete enhanced due diligence form"
                right={props => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => { appState.changeState('Questionnaire'); }}
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
              onPress={() => setShowLogoutDialog(true)}
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

      {/* Logout Confirmation Dialog */}
      <Portal>
        <Dialog 
          visible={showLogoutDialog} 
          onDismiss={() => setShowLogoutDialog(false)}
          style={{ borderRadius: 8 }}
        >
          <Dialog.Title>Confirm Logout</Dialog.Title>
          <Dialog.Content>
            <Paragraph>Are you sure you want to logout? You will need to login again to access your account.</Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowLogoutDialog(false)}>Cancel</Button>
            <Button 
              onPress={async () => {
                setShowLogoutDialog(false);
                try {
                  await appState.logout();
                  // After logout, redirect to login page
                  appState.changeState('Login');
                } catch (error) {
                  console.error('Logout error:', error);
                }
              }}
              textColor={materialTheme.colors.error}
            >
              Logout
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  )

}

export default Settings;

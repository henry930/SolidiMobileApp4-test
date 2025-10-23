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
let logger2 = logger.extend('Profile');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);




let Profile = () => {

  let appState = useContext(AppStateContext);
  let [renderCount, triggerRender] = useState(0);
  let [showLogoutDialog, setShowLogoutDialog] = useState(false);
  let firstRender = misc.useFirstRender();
  let stateChangeID = appState.stateChangeID;

  let pageName = appState.pageName;
  let permittedPageNames = 'default'.split(' ');
  misc.confirmItemInArray('permittedPageNames', permittedPageNames, pageName, 'Profile');




  // Initial setup.
  useEffect( () => {
    setup();
  }, []); // Pass empty array so that this only runs once on mount.


  let setup = async () => {
    try {
      await appState.generalSetup({caller: 'Profile'});
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
      triggerRender(renderCount+1);
    } catch(err) {
      let msg = `Profile.setup: Error = ${err}`;
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
                  icon="account" 
                  compact
                  style={{ backgroundColor: materialTheme.colors.tertiaryContainer }}
                >
                  Normal
                </Chip>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Activity Section */}
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
                left={props => <List.Icon {...props} icon="history" />}
                right={props => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => { appState.changeState('History'); }}
                style={{ paddingVertical: 4 }}
              />
              
              <Divider />
              
              <List.Item
                title="Address Book"
                description="Manage your saved withdrawal addresses"
                left={props => <List.Icon {...props} icon="book" />}
                right={props => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => { appState.changeState('AddressBook'); }}
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
                Account Settings2
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
                title="Account Update"
                description="Update your account information and preferences"
                left={props => <List.Icon {...props} icon="account-edit" />}
                right={props => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => { 
                  console.log('🔥 [Profile] Account Update button pressed!');
                  appState.changeState('AccountUpdate'); 
                }}
                style={{ paddingVertical: 4 }}
              />
              
              <Divider />
              
              <List.Item
                title="Security"
                description="Password, PIN, and security settings"
                left={props => <List.Icon {...props} icon="security" />}
                right={props => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => { appState.changeState('Security'); }}
                style={{ paddingVertical: 4 }}
              />
            </List.Section>
          </Card.Content>
        </Card>

        {/* Support Section */}
        <Card style={{ marginBottom: 16, elevation: 1 }}>
          <Card.Content style={{ padding: 0 }}>
            <List.Section>
              <List.Subheader style={{ 
                color: materialTheme.colors.primary,
                fontWeight: 'bold'
              }}>
                Support & Information
              </List.Subheader>
              
              <List.Item
                title="Contact Us"
                description="Get help and support"
                left={props => <List.Icon {...props} icon="help-circle" />}
                right={props => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => { appState.changeState('ContactUs'); }}
                style={{ paddingVertical: 4 }}
              />
              
              <Divider />
              
              <List.Item
                title="Terms & Conditions"
                description="View our terms and conditions"
                left={props => <List.Icon {...props} icon="file-document-outline" />}
                right={props => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => { appState.changeState('Terms'); }}
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
        <Dialog visible={showLogoutDialog} onDismiss={() => setShowLogoutDialog(false)}>
          <Dialog.Title>Logout Options</Dialog.Title>
          <Dialog.Content>
            <Paragraph style={{ marginBottom: 12 }}>
              Choose your logout preference:
            </Paragraph>
            <Paragraph style={{ fontSize: 14, color: materialTheme.colors.onSurfaceVariant }}>
              • <Text style={{ fontWeight: 'bold' }}>Regular Logout:</Text> Stay logged in when you reopen the app
            </Paragraph>
            <Paragraph style={{ fontSize: 14, color: materialTheme.colors.onSurfaceVariant }}>
              • <Text style={{ fontWeight: 'bold' }}>Complete Sign Out:</Text> Require login when reopening the app
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowLogoutDialog(false)}>Cancel</Button>
            <Button 
              onPress={async () => {
                setShowLogoutDialog(false);
                try {
                  // Regular logout - preserves credentials for persistent login
                  await appState.logout(false);
                  appState.changeState('Login');
                } catch (error) {
                  console.error('Logout error:', error);
                }
              }}
            >
              Regular Logout
            </Button>
            <Button 
              onPress={async () => {
                setShowLogoutDialog(false);
                try {
                  // Complete logout - clears all stored credentials
                  await appState.signOutCompletely();
                } catch (error) {
                  console.error('Complete logout error:', error);
                }
              }}
              textColor={materialTheme.colors.error}
            >
              Complete Sign Out
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  )

}


export default Profile;
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
      return "Loading...";
    } else {
      return `${firstName} ${lastName}`;
    }
  }

  let getUserEmail = () => {
    let email = appState.getUserInfo('email');
    return email === '[loading]' ? 'Loading...' : email;
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
              <Avatar.Image
                size={80}
                source={require('src/assets/profile.png')}
                style={{ 
                  marginBottom: 16,
                  backgroundColor: materialTheme.colors.surfaceVariant 
                }}
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
                title="Security"
                description="Password, PIN, and security settings"
                right={props => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => { appState.changeState('Security'); }}
                style={{ paddingVertical: 4 }}
              />
            </List.Section>
          </Card.Content>
        </Card>



      </ScrollView>
    </View>
  )

}

export default Settings;

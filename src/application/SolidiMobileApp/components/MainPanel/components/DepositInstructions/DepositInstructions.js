// React imports
import React, { useContext } from 'react';
import { ScrollView, View, Alert, Linking, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Material Design imports
import {
  Card,
  Text,
  Button,
  List,
  Divider,
  useTheme,
  Surface,
} from 'react-native-paper';

// Other imports
import Clipboard from '@react-native-clipboard/clipboard';

// Internal imports
import AppStateContext from 'src/application/data';
import { colors, sharedStyles, layoutStyles, cardStyles } from 'src/constants';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import { Title } from 'src/components/shared';

// Create local references for commonly used styles
const layout = layoutStyles;
const cards = cardStyles;

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('DepositInstructions');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);

let DepositInstructions = () => {
  let appState = useContext(AppStateContext);
  let theme = useTheme();

  // Bank transfer details
  const bankDetails = {
    accountName: 'Solidi',
    sortCode: '04-05-11',
    accountNumber: '00012484',
    reference: 'SMAJILS'
  };

  // Popular UK banks with their app schemes
  const ukBanks = [
    {
      name: 'Barclays',
      icon: 'bank',
      color: '#00AEEF',
      scheme: 'barclaysuk://',
      fallbackUrl: 'https://www.barclays.co.uk/'
    },
    {
      name: 'HSBC',
      icon: 'bank',
      color: '#DB0011',
      scheme: 'hsbc://',
      fallbackUrl: 'https://www.hsbc.co.uk/'
    },
    {
      name: 'Lloyds Bank',
      icon: 'bank',
      color: '#006F40',
      scheme: 'lloydsbank://',
      fallbackUrl: 'https://www.lloydsbank.com/'
    },
    {
      name: 'NatWest',
      icon: 'bank',
      color: '#5A287D',
      scheme: 'natwest://',
      fallbackUrl: 'https://www.natwest.com/'
    },
    {
      name: 'Santander',
      icon: 'bank',
      color: '#EC0000',
      scheme: 'santander://',
      fallbackUrl: 'https://www.santander.co.uk/'
    },
    {
      name: 'Halifax',
      icon: 'bank',
      color: '#0079C1',
      scheme: 'halifax://',
      fallbackUrl: 'https://www.halifax.co.uk/'
    },
    {
      name: 'TSB',
      icon: 'bank',
      color: '#0047AB',
      scheme: 'tsb://',
      fallbackUrl: 'https://www.tsb.co.uk/'
    },
    {
      name: 'Monzo',
      icon: 'bank',
      color: '#FF1744',
      scheme: 'monzo://',
      fallbackUrl: 'https://monzo.com/'
    },
    {
      name: 'Starling Bank',
      icon: 'bank',
      color: '#6C2C91',
      scheme: 'starlingbank://',
      fallbackUrl: 'https://www.starlingbank.com/'
    },
    {
      name: 'Revolut',
      icon: 'bank',
      color: '#0075EB',
      scheme: 'revolut://',
      fallbackUrl: 'https://www.revolut.com/'
    }
  ];

  // Copy to clipboard function
  const copyToClipboard = (text, label) => {
    Clipboard.setString(text);
    Alert.alert('Copied!', `${label} has been copied to clipboard.`);
  };

  // Open bank app
  const openBankApp = async (bank) => {
    try {
      const canOpen = await Linking.canOpenURL(bank.scheme);
      if (canOpen) {
        await Linking.openURL(bank.scheme);
        log(`Opened ${bank.name} app`);
      } else {
        // Fallback to web browser
        await Linking.openURL(bank.fallbackUrl);
        log(`Opened ${bank.name} website as fallback`);
      }
    } catch (error) {
      log(`Error opening ${bank.name}:`, error);
      Alert.alert('Error', `Unable to open ${bank.name}. Please try opening the app manually.`);
    }
  };

  // Render bank item
  const renderBankItem = (bank) => (
    <List.Item
      key={bank.name}
      title={bank.name}
      description="Tap to open banking app"
      left={props => (
        <View style={{ 
          justifyContent: 'center', 
          alignItems: 'center',
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: bank.color,
          marginRight: 12
        }}>
          <Icon name={bank.icon} size={20} color="white" />
        </View>
      )}
      right={props => <List.Icon {...props} icon="chevron-right" />}
      onPress={() => openBankApp(bank)}
      style={{ paddingVertical: 4 }}
    />
  );

  return (
    <View style={layout.panelContainer}>
      <Title 
        title="Deposit Instructions" 
        showBackButton={true}
        onBackPress={() => appState.goToPreviousState()}
      />
      
      <ScrollView 
        style={layout.panelSubContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ 
          paddingBottom: 20, 
          paddingHorizontal: 16 
        }}
      >
        {/* Instructions Header */}
        <Card style={{ marginBottom: 20 }}>
          <Card.Content style={{ padding: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Icon name="bank-transfer" size={24} color={theme.colors.primary} />
              <Text variant="titleLarge" style={{ fontWeight: 'bold', marginLeft: 12 }}>
                Bank Transfer Deposit
              </Text>
            </View>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, lineHeight: 22 }}>
              Transfer money from your bank account to the account below. Your balance will be updated instantly.
            </Text>
          </Card.Content>
        </Card>

        {/* Bank Details Card */}
        <Card style={{ marginBottom: 20 }}>
          <Card.Content style={{ padding: 20 }}>
            <Text variant="titleMedium" style={{ fontWeight: 'bold', marginBottom: 16 }}>
              Transfer Details
            </Text>

            {/* Account Name */}
            <TouchableOpacity 
              onPress={() => copyToClipboard(bankDetails.accountName, 'Account Name')}
              style={{ marginBottom: 12 }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Account Name
                  </Text>
                  <Text variant="bodyLarge" style={{ fontWeight: '500', marginTop: 2 }}>
                    {bankDetails.accountName}
                  </Text>
                </View>
                <Icon name="content-copy" size={20} color={theme.colors.primary} />
              </View>
            </TouchableOpacity>

            <Divider style={{ marginVertical: 8 }} />

            {/* Sort Code */}
            <TouchableOpacity 
              onPress={() => copyToClipboard(bankDetails.sortCode, 'Sort Code')}
              style={{ marginBottom: 12 }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Sort Code
                  </Text>
                  <Text variant="bodyLarge" style={{ fontWeight: '500', marginTop: 2 }}>
                    {bankDetails.sortCode}
                  </Text>
                </View>
                <Icon name="content-copy" size={20} color={theme.colors.primary} />
              </View>
            </TouchableOpacity>

            <Divider style={{ marginVertical: 8 }} />

            {/* Account Number */}
            <TouchableOpacity 
              onPress={() => copyToClipboard(bankDetails.accountNumber, 'Account Number')}
              style={{ marginBottom: 12 }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Account Number
                  </Text>
                  <Text variant="bodyLarge" style={{ fontWeight: '500', marginTop: 2 }}>
                    {bankDetails.accountNumber}
                  </Text>
                </View>
                <Icon name="content-copy" size={20} color={theme.colors.primary} />
              </View>
            </TouchableOpacity>

            <Divider style={{ marginVertical: 8 }} />

            {/* Reference */}
            <TouchableOpacity 
              onPress={() => copyToClipboard(bankDetails.reference, 'Reference')}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Reference (Important!)
                  </Text>
                  <Text variant="bodyLarge" style={{ fontWeight: '500', marginTop: 2 }}>
                    {bankDetails.reference}
                  </Text>
                </View>
                <Icon name="content-copy" size={20} color={theme.colors.primary} />
              </View>
            </TouchableOpacity>
          </Card.Content>
        </Card>

        {/* Quick Access to Banking Apps */}
        <Card style={{ marginBottom: 20 }}>
          <Card.Content style={{ padding: 0 }}>
            <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 }}>
              <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
                Quick Access to Banking Apps
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                Tap your bank to open the mobile app
              </Text>
            </View>
            
            <Divider />
            
            {ukBanks.map(bank => renderBankItem(bank))}
          </Card.Content>
        </Card>

        {/* Important Notes */}
        <Surface style={{ 
          padding: 16, 
          borderRadius: 8,
          backgroundColor: theme.colors.errorContainer 
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <Icon name="alert-circle" size={20} color={theme.colors.error} style={{ marginTop: 2 }} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text variant="titleSmall" style={{ fontWeight: 'bold', color: theme.colors.error }}>
                Important Notes
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onErrorContainer, marginTop: 4, lineHeight: 18 }}>
                • Always include the reference code for instant processing{'\n'}
                • Double-check account details before transferring{'\n'}
                • Transfers usually appear within minutes{'\n'}
                • Contact support if your deposit doesn't appear within 24 hours
              </Text>
            </View>
          </View>
        </Surface>
      </ScrollView>
    </View>
  );
};

export default DepositInstructions;
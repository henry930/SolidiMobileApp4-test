import React, { useContext } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import AppStateContext from 'src/application/data';
import { colors } from 'src/constants';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';

// Material Design imports
import {
  Appbar,
  BottomNavigation,
  Card,
  Text,
  Button,
  useTheme,
  FAB,
  Chip,
} from 'react-native-paper';

let NavigationDebug = () => {
  let appState = useContext(AppStateContext);
  const theme = useTheme();

  // Main navigation groups
  const navigationGroups = [
    {
      title: 'Core Trading',
      icon: 'chart-line',
      color: theme.colors.primary,
      pages: [
        { name: 'Buy', icon: 'plus-circle', color: '#4CAF50' },
        { name: 'Sell', icon: 'minus-circle', color: '#FF5722' },
        { name: 'Trade', icon: 'swap-horizontal', color: '#607D8B' },
        { name: 'Assets', icon: 'wallet', color: '#2196F3' },
        { name: 'History', icon: 'history', color: '#9C27B0' },
        { name: 'Send', icon: 'send', color: '#FF9800' },
        { name: 'Receive', icon: 'download', color: '#00BCD4' },
      ]
    },
    {
      title: 'Payment Flow',
      icon: 'credit-card',
      color: theme.colors.secondary,
      pages: [
        { name: 'ChooseHowToPay', icon: 'credit-card-outline' },
        { name: 'MakePayment', icon: 'cash' },
        { name: 'MakePaymentOpenBanking', icon: 'bank' },
        { name: 'WaitingForPayment', icon: 'clock-outline' },
        { name: 'PaymentNotMade', icon: 'close-circle' },
        { name: 'PurchaseSuccessful', icon: 'check-circle' },
        { name: 'SaleSuccessful', icon: 'check-circle-outline' },
        { name: 'SendSuccessful', icon: 'send-check' },
        { name: 'ChooseHowToReceivePayment', icon: 'cash-plus' },
      ]
    },
    {
      title: 'Account & Auth',
      icon: 'account',
      color: theme.colors.tertiary,
      pages: [
        { name: 'Login', icon: 'login' },
        { name: 'Register', icon: 'account-plus' },
        { name: 'RegisterConfirm', icon: 'email-check' },
        { name: 'RegisterConfirm2', icon: 'account-check' },
        { name: 'PIN', icon: 'numeric' },
        { name: 'Authenticate', icon: 'shield-check' },
        { name: 'ResetPassword', icon: 'lock-reset' },
      ]
    },
    {
      title: 'Settings',
      icon: 'cog',
      color: '#607D8B',
      pages: [
        { name: 'Settings', icon: 'cog-outline' },
        { name: 'PersonalDetails', icon: 'account-edit' },
        { name: 'BankAccounts', icon: 'bank-outline' },
        { name: 'Security', icon: 'shield-outline' },
        { name: 'SolidiAccount', icon: 'account-circle' },
        { name: 'CloseSolidiAccount', icon: 'account-remove' },
        { name: 'AccountUpdate', icon: 'account-sync' },
        { name: 'AccountRestricted', icon: 'account-lock' },
      ]
    },
    {
      title: 'Support & Info',
      icon: 'help-circle',
      color: '#795548',
      pages: [
        { name: 'ContactUs', icon: 'phone' },
        { name: 'Terms', icon: 'file-document' },
        { name: 'AboutUs', icon: 'information' },
        { name: 'ReadArticle', icon: 'book-open' },
        { name: 'Notifications', icon: 'bell' },
        { name: 'IdentityVerification', icon: 'card-account-details' },
      ]
    },
    {
      title: 'System',
      icon: 'alert-circle',
      color: '#9E9E9E',
      pages: [
        { name: 'Error', icon: 'alert-circle-outline' },
        { name: 'RequestFailed', icon: 'wifi-off' },
        { name: 'RequestTimeout', icon: 'clock-alert' },
        { name: 'InsufficientBalance', icon: 'wallet-outline' },
        { name: 'LimitsExceeded', icon: 'speedometer' },
        { name: 'Maintenance', icon: 'wrench' },
        { name: 'UpdateApp', icon: 'update' },
        { name: 'Test', icon: 'test-tube' },
        { name: 'SupportTools', icon: 'tools' },
      ]
    }
  ];

  const navigateToPage = (pageName) => {
    console.log('Navigating to:', pageName);
    appState.changeState(pageName);
  };

  const renderNavigationGroup = (group) => (
    <Card key={group.title} style={{ marginBottom: 16 }}>
      <Card.Title
        title={group.title}
        subtitle={`${group.pages.length} pages`}
        left={(props) => (
          <FAB
            {...props}
            icon={group.icon}
            size="small"
            style={{ backgroundColor: group.color }}
          />
        )}
      />
      <Card.Content>
        <View style={{ 
          flexDirection: 'row', 
          flexWrap: 'wrap', 
          justifyContent: 'space-between',
          gap: 8 
        }}>
          {group.pages.map((page, index) => (
            <Button
              key={index}
              mode="outlined"
              onPress={() => navigateToPage(page.name)}
              icon={page.icon}
              style={{ 
                marginBottom: 8,
                minWidth: '48%',
                borderColor: page.color || group.color,
              }}
              contentStyle={{ 
                paddingVertical: 4,
                justifyContent: 'flex-start',
              }}
              labelStyle={{ 
                fontSize: 12,
                color: page.color || group.color,
              }}
            >
              {page.name}
            </Button>
          ))}
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ 
          alignItems: 'center', 
          paddingVertical: 16,
          marginBottom: 16 
        }}>
          <Text style={{ 
            fontSize: 20,
            fontWeight: 'bold', 
            color: theme.colors.primary,
            textAlign: 'center'
          }}>
            Solidi
          </Text>
          <Chip
            icon="apps"
            style={{ marginTop: 8 }}
            textStyle={{ fontWeight: '600', fontSize: 11 }}
            compact
          >
            {navigationGroups.reduce((sum, group) => sum + group.pages.length, 0)} Pages
          </Chip>
        </View>

        {navigationGroups.map(renderNavigationGroup)}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
};

let styles = StyleSheet.create({
  panelContainer: {
    paddingHorizontal: scaledWidth(15),
    paddingVertical: scaledHeight(5),
    width: '100%',
    height: '100%',
  },
  panelSubContainer: {
    paddingTop: scaledHeight(10),
    paddingHorizontal: scaledWidth(15),
    height: '100%',
  },
  heading: {
    alignItems: 'center',
  },
  heading1: {
    marginTop: scaledHeight(10),
    marginBottom: scaledHeight(20),
  },
  headingText: {
    fontSize: normaliseFont(24),
    fontWeight: 'bold',
    color: colors.primaryText,
  },
  section: {
    marginBottom: scaledHeight(25),
  },
  sectionTitle: {
    fontSize: normaliseFont(18),
    fontWeight: '600',
    color: colors.primaryText,
    marginBottom: scaledHeight(10),
    paddingLeft: scaledWidth(5),
  },
  buttonWrapper: {
    marginBottom: scaledHeight(8),
    alignItems: 'flex-start',
  },
});

export default NavigationDebug;
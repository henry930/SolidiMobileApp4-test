import React, { useContext } from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import AppStateContext from 'src/application/data';
import { colors } from 'src/constants';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import { StandardButton } from 'src/components/atomic';

let NavigationDebug = () => {

  let appState = useContext(AppStateContext);

  return (
    <View style={styles.panelContainer}>
      <View style={styles.panelSubContainer}>

        <View style={[styles.heading, styles.heading1]}>
          <Text style={styles.headingText}>Navigation Debug</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={{ flexGrow: 1 }}>

          {/* Core Trading Pages */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Core Trading Pages</Text>
            <View style={styles.buttonWrapper}>
              <StandardButton title='Buy' onPress={() => appState.changeState('Buy')} />
            </View>
            <View style={styles.buttonWrapper}>
              <StandardButton title='Sell' onPress={() => appState.changeState('Sell')} />
            </View>
            <View style={styles.buttonWrapper}>
              <StandardButton title='Assets' onPress={() => appState.changeState('Assets')} />
            </View>
            <View style={styles.buttonWrapper}>
              <StandardButton title='History' onPress={() => appState.changeState('History')} />
            </View>
            <View style={styles.buttonWrapper}>
              <StandardButton title='Send' onPress={() => appState.changeState('Send')} />
            </View>
            <View style={styles.buttonWrapper}>
              <StandardButton title='Receive' onPress={() => appState.changeState('Receive')} />
            </View>
          </View>

          {/* Payment Flow Pages */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Flow Pages</Text>
            <View style={styles.buttonWrapper}>
              <StandardButton title='ChooseHowToPay' onPress={() => appState.changeState('ChooseHowToPay')} />
            </View>
            <View style={styles.buttonWrapper}>
              <StandardButton title='MakePayment' onPress={() => appState.changeState('MakePayment')} />
            </View>
            <View style={styles.buttonWrapper}>
              <StandardButton title='MakePaymentOpenBanking' onPress={() => appState.changeState('MakePaymentOpenBanking')} />
            </View>
            <View style={styles.buttonWrapper}>
              <StandardButton title='WaitingForPayment' onPress={() => appState.changeState('WaitingForPayment')} />
            </View>
            <View style={styles.buttonWrapper}>
              <StandardButton title='PaymentNotMade' onPress={() => appState.changeState('PaymentNotMade')} />
            </View>
            <View style={styles.buttonWrapper}>
              <StandardButton title='PurchaseSuccessful' onPress={() => appState.changeState('PurchaseSuccessful')} />
            </View>
            <View style={styles.buttonWrapper}>
              <StandardButton title='SaleSuccessful' onPress={() => appState.changeState('SaleSuccessful')} />
            </View>
            <View style={styles.buttonWrapper}>
              <StandardButton title='SendSuccessful' onPress={() => appState.changeState('SendSuccessful')} />
            </View>
            <View style={styles.buttonWrapper}>
              <StandardButton title='ChooseHowToReceivePayment' onPress={() => appState.changeState('ChooseHowToReceivePayment')} />
            </View>
          </View>

          {/* Account & Auth Pages */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account & Auth Pages</Text>
            <View style={styles.buttonWrapper}>
              <StandardButton title='Login' onPress={() => appState.changeState('Login')} />
            </View>
            <View style={styles.buttonWrapper}>
              <StandardButton title='Register' onPress={() => appState.changeState('Register')} />
            </View>
            <View style={styles.buttonWrapper}>
              <StandardButton title='RegisterConfirm' onPress={() => appState.changeState('RegisterConfirm')} />
            </View>
            <View style={styles.buttonWrapper}>
              <StandardButton title='RegisterConfirm2' onPress={() => appState.changeState('RegisterConfirm2')} />
            </View>
            <View style={styles.buttonWrapper}>
              <StandardButton title='PIN' onPress={() => appState.changeState('PIN')} />
            </View>
            <View style={styles.buttonWrapper}>
              <StandardButton title='Authenticate' onPress={() => appState.changeState('Authenticate')} />
            </View>
            <View style={styles.buttonWrapper}>
              <StandardButton title='ResetPassword' onPress={() => appState.changeState('ResetPassword')} />
            </View>
          </View>

          {/* Settings & Profile Pages */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Settings & Profile Pages</Text>
            <View style={styles.buttonWrapper}>
              <StandardButton title='Settings' onPress={() => appState.changeState('Settings')} />
            </View>
            <View style={styles.buttonWrapper}>
              <StandardButton title='PersonalDetails' onPress={() => appState.changeState('PersonalDetails')} />
            </View>
            <View style={styles.buttonWrapper}>
              <StandardButton title='BankAccounts' onPress={() => appState.changeState('BankAccounts')} />
            </View>
            <View style={styles.buttonWrapper}>
              <StandardButton title='Security' onPress={() => appState.changeState('Security')} />
            </View>
            <View style={styles.buttonWrapper}>
              <StandardButton title='SolidiAccount' onPress={() => appState.changeState('SolidiAccount')} />
            </View>
            <View style={styles.buttonWrapper}>
              <StandardButton title='CloseSolidiAccount' onPress={() => appState.changeState('CloseSolidiAccount')} />
            </View>
            <View style={styles.buttonWrapper}>
              <StandardButton title='AccountUpdate' onPress={() => appState.changeState('AccountUpdate')} />
            </View>
            <View style={styles.buttonWrapper}>
              <StandardButton title='AccountRestricted' onPress={() => appState.changeState('AccountRestricted')} />
            </View>
          </View>

          {/* Support & Info Pages */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Support & Info Pages</Text>
            <View style={styles.buttonWrapper}>
              <StandardButton title='ContactUs' onPress={() => appState.changeState('ContactUs')} />
            </View>
            <View style={styles.buttonWrapper}>
              <StandardButton title='Terms' onPress={() => appState.changeState('Terms')} />
            </View>
            <View style={styles.buttonWrapper}>
              <StandardButton title='AboutUs' onPress={() => appState.changeState('AboutUs')} />
            </View>
            <View style={styles.buttonWrapper}>
              <StandardButton title='ReadArticle' onPress={() => appState.changeState('ReadArticle')} />
            </View>
            <View style={styles.buttonWrapper}>
              <StandardButton title='Notifications' onPress={() => appState.changeState('Notifications')} />
            </View>
            <View style={styles.buttonWrapper}>
              <StandardButton title='IdentityVerification' onPress={() => appState.changeState('IdentityVerification')} />
            </View>
          </View>

          {/* Error & Status Pages */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Error & Status Pages</Text>
            <View style={styles.buttonWrapper}>
              <StandardButton title='Error' onPress={() => appState.changeState('Error')} />
            </View>
            <View style={styles.buttonWrapper}>
              <StandardButton title='RequestFailed' onPress={() => appState.changeState('RequestFailed')} />
            </View>
            <View style={styles.buttonWrapper}>
              <StandardButton title='RequestTimeout' onPress={() => appState.changeState('RequestTimeout')} />
            </View>
            <View style={styles.buttonWrapper}>
              <StandardButton title='InsufficientBalance' onPress={() => appState.changeState('InsufficientBalance')} />
            </View>
            <View style={styles.buttonWrapper}>
              <StandardButton title='LimitsExceeded' onPress={() => appState.changeState('LimitsExceeded')} />
            </View>
            <View style={styles.buttonWrapper}>
              <StandardButton title='Maintenance' onPress={() => appState.changeState('Maintenance')} />
            </View>
            <View style={styles.buttonWrapper}>
              <StandardButton title='UpdateApp' onPress={() => appState.changeState('UpdateApp')} />
            </View>
          </View>

          {/* Development & Testing */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Development & Testing</Text>
            <View style={styles.buttonWrapper}>
              <StandardButton title='Test' onPress={() => appState.changeState('Test')} />
            </View>
            <View style={styles.buttonWrapper}>
              <StandardButton title='SupportTools' onPress={() => appState.changeState('SupportTools')} />
            </View>
          </View>

        </ScrollView>

      </View>
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
// React imports
import React, { useContext, useEffect, useState } from 'react';
import { ScrollView, View, StyleSheet, TouchableOpacity } from 'react-native';
import { 
  Card, 
  Text, 
  Button, 
  Surface, 
  ActivityIndicator,
  Chip,
  Icon,
  Divider
} from 'react-native-paper';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Icon2 from 'react-native-vector-icons/MaterialCommunityIcons';

// Other imports
import _ from 'lodash';
import Big from 'big.js';

// Internal imports
import AppStateContext from 'src/application/data';
import { colors } from 'src/constants';
import { StandardButton } from 'src/components/atomic';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import misc from 'src/util/misc';
import { sharedStyles as styles, layoutStyles as layout, textStyles as text, cardStyles as cards, buttonStyles as buttons, formStyles as forms } from 'src/styles';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('SaleSuccessful');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);




let SaleSuccessful = () => {

  let appState = useContext(AppStateContext);
  let [renderCount, triggerRender] = useState(0);
  let stateChangeID = appState.stateChangeID;
  let [isLoading, setIsLoading] = useState(true);

  let pageName = appState.pageName;
  if (pageName == 'default') pageName = 'balance';
  let permittedPageNames = 'solidi balance'.split(' ');
  misc.confirmItemInArray('permittedPageNames', permittedPageNames, pageName, 'SaleSuccessful');

  // State
  let [order, setOrder] = useState({});

  // Testing (for if we load this page directly).
  if (appState.appTier == 'dev' && appState.panels.sell.volumeQA == '0') {
    appState.panels.sell.orderID = 7177; // Need to adjust this to be the orderID of an actual order in the database.
    appState.changeStateParameters.orderID = appState.panels.sell.orderID;
  }

  let trustpilotURL = 'https://www.trustpilot.com/evaluate/solidi.co?stars=5';




  // Initial setup.
  useEffect( () => {
    setup();
  }, []); // Pass empty array so that this only runs once on mount.


  let setup = async () => {
    try {
      await appState.generalSetup();
      await appState.loadOrders();
      let orderID = appState.changeStateParameters.orderID;
      log(`Stored orderID: ${orderID}`);
      let order = appState.getOrder({orderID});
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
      setOrder(order);
      setIsLoading(false);
      triggerRender(renderCount+1);
    } catch(err) {
      let msg = `SaleSuccessful.setup: Error = ${err}`;
      console.log(msg);
    }
  }


  let getTotalQAStr = () => {
    /* We get the volumeQA value.
    - Future: Confirm whether or not the fee value has been subtracted within the API from this value.
    -- If so, the order info needs to change to include the fee value and the totalQA value, and we need to return the totalQA value from this function.
    */
    let s = '';
    let requiredKeys = 'market baseVolume quoteVolume'.split(' ');
    if (requiredKeys.every(k => k in order)) {
      let [assetBA, assetQA] = order.market.split('/');
      let assetInfo = appState.getAssetInfo(assetQA);
      let volumeQA = order.quoteVolume;
      s += appState.getFullDecimalValue({asset: assetQA, value: volumeQA, functionName: 'getTotalQAStr'});
      s += ' ' + assetInfo.displayString;
    } else {
      s = '[loading]';
    }
    return s;
  }


  let getVolumeBAStr = () => {
    let s = '';
    let requiredKeys = 'market baseVolume quoteVolume'.split(' ');
    if (requiredKeys.every(k => k in order)) {
      let [assetBA, assetQA] = order.market.split('/');
      let assetInfo = appState.getAssetInfo(assetBA);
      let volumeBA = order.baseVolume;
      s += appState.getFullDecimalValue({asset: assetBA, value: volumeBA, functionName: 'getTotalBAStr'});
      s += ' ' + assetInfo.displayString;
    } else {
      s = '[loading]';
    }
    return s;
  }


  let viewAssets = () => {
    let pageName = appState.getAssetInfo(assetBA).type; // 'crypto' or 'fiat'.
    appState.changeState('Assets', pageName);
  }


  let sellAgain = () => {
    appState.changeState('Sell');
  }


  let buyAgain = () => {
    appState.changeState('Trade');
  }


  return (
    <View style={modernStyles.panelContainer}>
      <Surface style={modernStyles.headerSurface} elevation={2}>
        <Icon2 name="check-circle" size={48} color="#4CAF50" style={modernStyles.successIcon} />
        <Text style={modernStyles.headerTitle}>Sale successful!</Text>
        <Text style={modernStyles.headerSubtitle}>Your transaction has been completed</Text>
      </Surface>

      <KeyboardAwareScrollView 
        style={modernStyles.scrollView}
        contentContainerStyle={modernStyles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        
        {/* Sale Summary Card */}
        <Card style={modernStyles.summaryCard}>
          <Card.Content>
            <View style={modernStyles.summaryHeader}>
              <Icon2 name="swap-horizontal" size={24} color="#333" />
              <Text style={modernStyles.summaryTitle}>Transaction summary</Text>
            </View>
            
            <View style={modernStyles.transactionDetails}>
              <View style={modernStyles.detailRow}>
                <Icon2 name="arrow-up-circle" size={20} color="#4CAF50" />
                <Text style={modernStyles.detailLabel}>You sold</Text>
                <Text style={modernStyles.detailValue}>{getVolumeBAStr()}</Text>
              </View>
              
              <View style={modernStyles.detailRow}>
                <Icon2 name="arrow-down-circle" size={20} color="#2196F3" />
                <Text style={modernStyles.detailLabel}>You received</Text>
                <Text style={modernStyles.detailValue}>{getTotalQAStr()}</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Payment Status Card */}
        <Card style={modernStyles.statusCard}>
          <Card.Content>
            <View style={modernStyles.statusHeader}>
              {pageName === 'balance' ? (
                <>
                  <Icon2 name="wallet" size={24} color="#4CAF50" />
                  <Text style={modernStyles.statusTitle}>Credited to balance</Text>
                  <Chip icon="check" style={modernStyles.instantChip}>INSTANT</Chip>
                </>
              ) : (
                <>
                  <Icon2 name="bank-transfer" size={24} color="#FF9800" />
                  <Text style={modernStyles.statusTitle}>Payment processing</Text>
                  <Chip icon="clock" style={modernStyles.processingChip}>8 HOURS</Chip>
                </>
              )}
            </View>
            
            <View style={modernStyles.statusDetails}>
              {pageName === 'balance' ? (
                <View style={modernStyles.statusRow}>
                  <Icon2 name="check-circle" size={16} color="#4CAF50" />
                  <Text style={modernStyles.statusText}>Your Solidi account has been credited with {getTotalQAStr()}</Text>
                </View>
              ) : (
                <View style={modernStyles.statusRow}>
                  <Icon2 name="clock-outline" size={16} color="#FF9800" />
                  <Text style={modernStyles.statusText}>Your payment of {getTotalQAStr()} should arrive within 8 hours</Text>
                </View>
              )}
            </View>
          </Card.Content>
        </Card>

        {/* Action Buttons */}
        <View style={modernStyles.actionsContainer}>
          <Button
            mode="contained"
            onPress={viewAssets}
            style={modernStyles.primaryButton}
            contentStyle={modernStyles.buttonContent}
            labelStyle={modernStyles.buttonText}
            icon="view-dashboard"
          >
            View your assets
          </Button>
          
          <Button
            mode="outlined"
            onPress={sellAgain}
            style={modernStyles.secondaryButton}
            contentStyle={modernStyles.buttonContent}
            labelStyle={modernStyles.secondaryButtonText}
            icon="repeat"
          >
            Sell another asset
          </Button>
          
          <Button
            mode="outlined"
            onPress={buyAgain}
            style={modernStyles.secondaryButton}
            contentStyle={modernStyles.buttonContent}
            labelStyle={modernStyles.secondaryButtonText}
            icon="plus-circle"
          >
            Buy an asset
          </Button>
        </View>

        {/* Trustpilot Review Card */}
        <Card style={modernStyles.reviewCard}>
          <Card.Content>
            <View style={modernStyles.reviewHeader}>
              <Icon2 name="star" size={24} color="#FFB300" />
              <Text style={modernStyles.reviewTitle}>Please review us on Trustpilot!</Text>
            </View>
            
            <Text style={modernStyles.reviewText}>
              Every review helps build trust with our new customers. Tap below to review us. Thanks!
            </Text>
            
            <Button
              mode="outlined"
              onPress={() => { 
                import('react-native').then(RN => {
                  RN.Linking.openURL('https://www.trustpilot.com/evaluate/solidi.co?stars=5');
                });
              }}
              style={modernStyles.trustpilotButton}
              contentStyle={modernStyles.buttonContent}
              labelStyle={modernStyles.trustpilotButtonText}
              icon="star-outline"
            >
              Review on Trustpilot
            </Button>
          </Card.Content>
        </Card>

      </KeyboardAwareScrollView>
    </View>
  )

}


let styleTrustpilotButton = StyleSheet.create({
  image: {
    width: '100%',
  },
  view: {
    width: scaledWidth(300),
    height: scaledHeight(120),

  },
});

// Modern styles matching ChooseHowToPay
let modernStyles = StyleSheet.create({
  panelContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerSurface: {
    backgroundColor: 'white',
    paddingHorizontal: scaledWidth(20),
    paddingVertical: scaledHeight(30),
    marginBottom: scaledHeight(10),
    alignItems: 'center',
  },
  successIcon: {
    marginBottom: scaledHeight(15),
  },
  headerTitle: {
    fontSize: normaliseFont(24),
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: scaledHeight(5),
  },
  headerSubtitle: {
    fontSize: normaliseFont(16),
    color: '#666',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scaledWidth(20),
    paddingBottom: scaledHeight(40),
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: scaledHeight(20),
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scaledHeight(20),
  },
  summaryTitle: {
    fontSize: normaliseFont(18),
    fontWeight: 'bold',
    color: '#333',
    marginLeft: scaledWidth(10),
  },
  transactionDetails: {
    marginTop: scaledHeight(10),
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scaledHeight(12),
    paddingHorizontal: scaledWidth(15),
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: scaledHeight(10),
  },
  detailLabel: {
    fontSize: normaliseFont(16),
    color: '#666',
    marginLeft: scaledWidth(10),
    flex: 1,
  },
  detailValue: {
    fontSize: normaliseFont(16),
    fontWeight: 'bold',
    color: '#333',
    fontVariant: ['tabular-nums'],
  },
  statusCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: scaledHeight(20),
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scaledHeight(15),
  },
  statusTitle: {
    fontSize: normaliseFont(18),
    fontWeight: 'bold',
    color: '#333',
    marginLeft: scaledWidth(10),
    flex: 1,
  },
  instantChip: {
    backgroundColor: '#E8F5E8',
  },
  processingChip: {
    backgroundColor: '#FFF3E0',
  },
  statusDetails: {
    marginTop: scaledHeight(10),
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scaledHeight(8),
  },
  statusText: {
    fontSize: normaliseFont(14),
    color: '#555',
    marginLeft: scaledWidth(8),
    flex: 1,
  },
  actionsContainer: {
    marginVertical: scaledHeight(20),
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 25,
    marginBottom: scaledHeight(15),
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  secondaryButton: {
    borderColor: '#007AFF',
    borderRadius: 25,
    marginBottom: scaledHeight(15),
  },
  buttonContent: {
    paddingVertical: scaledHeight(12),
  },
  buttonText: {
    fontSize: normaliseFont(16),
    fontWeight: 'bold',
    color: 'white',
  },
  secondaryButtonText: {
    fontSize: normaliseFont(16),
    fontWeight: 'bold',
    color: '#007AFF',
  },
  reviewCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginTop: scaledHeight(20),
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scaledHeight(15),
  },
  reviewTitle: {
    fontSize: normaliseFont(18),
    fontWeight: 'bold',
    color: '#333',
    marginLeft: scaledWidth(10),
  },
  reviewText: {
    fontSize: normaliseFont(14),
    color: '#666',
    lineHeight: 20,
    marginBottom: scaledHeight(20),
  },
  trustpilotButton: {
    borderColor: '#FFB300',
    borderRadius: 25,
  },
  trustpilotButtonText: {
    fontSize: normaliseFont(16),
    fontWeight: 'bold',
    color: '#FFB300',
  },
});


export default SaleSuccessful;

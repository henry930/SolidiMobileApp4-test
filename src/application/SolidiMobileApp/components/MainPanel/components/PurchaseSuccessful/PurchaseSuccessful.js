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

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('PurchaseSuccessful');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);




let PurchaseSuccessful = () => {

  let appState = useContext(AppStateContext);
  let [renderCount, triggerRender] = useState(0);
  let stateChangeID = appState.stateChangeID;
  let [isLoading, setIsLoading] = useState(true);

  // State
  let [order, setOrder] = useState({});

  // Testing
  if (appState.appTier == 'dev' && appState.panels.buy.volumeQA == '0') {
    log("TESTING");
    // Note: Need to adjust the orderID value to be the orderID of an actual order in the database.
    appState.changeStateParameters.orderID = 7179;
  }

  let trustpilotURL = 'https://www.trustpilot.com/evaluate/solidi.co?stars=5';




  // Initial setup.
  useEffect( () => {
    setup();
  }, []); // Pass empty array so that we only run once on mount.


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
      let msg = `PurchaseSuccessful.setup: Error = ${err}`;
      console.log(msg);
    }
  }


  let getTotalQAStr = () => {
    /* We get the volumeQA value.
    - Within Solidi, the fees are subtracted from this value, but this doesn't change the "total amount paid" from the user's point of view here.
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


  let buyAgain = () => {
    appState.changeState('Trade');
  }


  return (
    <View style={modernStyles.panelContainer}>
      <Surface style={modernStyles.headerSurface} elevation={2}>
        <Icon2 name="check-circle" size={48} color="#4CAF50" style={modernStyles.successIcon} />
        <Text style={modernStyles.headerTitle}>Purchase successful!</Text>
        <Text style={modernStyles.headerSubtitle}>Your transaction has been completed</Text>
      </Surface>

      <KeyboardAwareScrollView 
        style={modernStyles.scrollView}
        contentContainerStyle={modernStyles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        
        {/* Purchase Summary Card */}
        <Card style={modernStyles.summaryCard}>
          <Card.Content>
            <View style={modernStyles.summaryHeader}>
              <Icon2 name="swap-horizontal" size={24} color="#333" />
              <Text style={modernStyles.summaryTitle}>Transaction summary</Text>
            </View>
            
            <View style={modernStyles.transactionDetails}>
              <View style={modernStyles.detailRow}>
                <Icon2 name="arrow-down-circle" size={20} color="#F44336" />
                <Text style={modernStyles.detailLabel}>You paid</Text>
                <Text style={modernStyles.detailValue}>{getTotalQAStr()}</Text>
              </View>
              
              <View style={modernStyles.detailRow}>
                <Icon2 name="arrow-up-circle" size={20} color="#4CAF50" />
                <Text style={modernStyles.detailLabel}>You received</Text>
                <Text style={modernStyles.detailValue}>{getVolumeBAStr()}</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Purchase Status Card */}
        <Card style={modernStyles.statusCard}>
          <Card.Content>
            <View style={modernStyles.statusHeader}>
              <Icon2 name="wallet" size={24} color="#4CAF50" />
              <Text style={modernStyles.statusTitle}>Credited to balance</Text>
              <Chip icon="check" style={modernStyles.instantChip}>INSTANT</Chip>
            </View>
            
            <View style={modernStyles.statusDetails}>
              <View style={modernStyles.statusRow}>
                <Icon2 name="check-circle" size={16} color="#4CAF50" />
                <Text style={modernStyles.statusText}>Your Solidi account has been credited with {getVolumeBAStr()}</Text>
              </View>
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
            onPress={buyAgain}
            style={modernStyles.secondaryButton}
            contentStyle={modernStyles.buttonContent}
            labelStyle={modernStyles.secondaryButtonText}
            icon="plus-circle"
          >
            Buy another asset
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


let styles = StyleSheet.create({
  panelContainer: {
    paddingHorizontal: scaledWidth(15),
    paddingVertical: scaledHeight(5),
    width: '100%',
    height: '100%',
  },
  panelSubContainer: {
    paddingTop: scaledHeight(10),
    paddingHorizontal: scaledWidth(30),
    height: '100%',
    //borderWidth: 1, // testing
  },
  heading: {
    alignItems: 'center',
  },
  heading1: {
    marginTop: scaledHeight(10),
  },
  heading2: {
    marginTop: scaledHeight(40),
  },
  headingText: {
    fontSize: normaliseFont(20),
    fontWeight: 'bold',
  },
  infoSection: {
    paddingVertical: scaledHeight(20),
    alignItems: 'flex-start',
  },
  infoSection2: {
    paddingTop: scaledHeight(10),
    alignItems: 'flex-start',
  },
  infoItem: {
    marginBottom: scaledHeight(5),
  },
  basicText: {
    fontSize: normaliseFont(14),
  },
  bold: {
    fontWeight: 'bold',
  },
  button: {

  },
  button2: {
    marginTop: scaledHeight(20),
  },
  buttonWrapper: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
});


let styleTrustpilotButton = StyleSheet.create({
  image: {
    width: '100%',
  },
  view: {
    width: scaledWidth(300),
    height: scaledHeight(120),
  },
});

// Modern styles matching SaleSuccessful and ChooseHowToPay
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


export default PurchaseSuccessful;

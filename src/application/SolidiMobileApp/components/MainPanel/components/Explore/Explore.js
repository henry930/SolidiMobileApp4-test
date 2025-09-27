// React imports
import React, { useContext, useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Modal } from 'react-native';

// Material Design imports
import { Text, Card, Button } from 'react-native-paper';

// Internal imports
import AppStateContext from 'src/application/data';
import { colors, sharedStyles, sharedColors } from 'src/constants';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import { Title } from 'src/components/shared';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('Explore');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);

let Explore = () => {
  let appState = useContext(AppStateContext);
  
  // Available forms for dropdown
  const availableForms = {
    'account-purpose-questionnaire': 'Account Purpose Questionnaire',
    'business-account-application-form': 'Business Account Application',
    'business-account-application-review': 'Business Account Review',
    'cryptobasket-limits-form': 'Cryptobasket Limits Form',
    'enhanced-due-diligence-form': 'Enhanced Due Diligence',
    'enhanced-due-diligence-review-form': 'Enhanced Due Diligence Review',
    'finprom-categorisation': 'Financial Promotion Categorisation',
    'finprom-suitability': 'Financial Promotion Suitability',
    'finprom-suitability2': 'Financial Promotion Suitability 2',
    'professional-tier-application-form': 'Professional Tier Application',
    'professional-tier-application-review-form': 'Professional Tier Review',
    'transaction-monitor-withdraw-questions': 'Transaction Monitor Withdraw',
    'travel-rule-deposit-questions': 'Travel Rule Deposit',
    'travel-rule-withdraw-questions': 'Travel Rule Withdraw',
  };

  // Dropdown state
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedForm, setSelectedForm] = useState('');

  // Handle form selection
  const handleFormSelect = (formKey) => {
    setSelectedForm(formKey);
    setShowDropdown(false);
    
    // Set the selected form in app state and navigate
    appState.selectedQuestionnaireForm = formKey;
    appState.setMainPanelState({
      mainPanelState: 'Questionnaire',
      pageName: 'default'
    });
  };

  return (
    <View style={[sharedStyles.container, { backgroundColor: sharedColors.background }]}>
      
      <Title>
        Explore
      </Title>

      {/* Content */}
      <ScrollView style={{ flex: 1, padding: 16 }}>
        
        {/* Questionnaires Section */}
        <Card style={{ marginBottom: 16 }}>
          <Card.Content style={{ padding: 20 }}>
            <Text variant="titleMedium" style={{ marginBottom: 12, fontWeight: '600' }}>
              Questionnaires
            </Text>
            <Text variant="bodyMedium" style={{ color: '#666', lineHeight: 22, marginBottom: 16 }}>
              Select and complete any available questionnaire or form.
            </Text>
              
              {/* Dropdown Selector */}
              <TouchableOpacity 
                style={styles.dropdown}
                onPress={() => setShowDropdown(true)}
              >
                <Text style={styles.dropdownText}>
                  {selectedForm ? availableForms[selectedForm] : 'Select a form...'}
                </Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>

              {/* Dropdown Modal */}
              <Modal
                visible={showDropdown}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowDropdown(false)}
              >
                <TouchableOpacity 
                  style={styles.modalOverlay}
                  activeOpacity={1}
                  onPress={() => setShowDropdown(false)}
                >
                  <View style={styles.dropdownModal}>
                    <Text style={styles.modalTitle}>Select a Form</Text>
                    <ScrollView style={styles.formList}>
                      {Object.entries(availableForms).map(([key, label]) => (
                        <TouchableOpacity
                          key={key}
                          style={styles.formItem}
                          onPress={() => handleFormSelect(key)}
                        >
                          <Text style={styles.formItemText}>{label}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    <TouchableOpacity 
                      style={styles.cancelButton}
                      onPress={() => setShowDropdown(false)}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              </Modal>
          </Card.Content>
        </Card>

        {/* Authentication Debug Panel */}
        <Card style={{ marginBottom: 16, backgroundColor: appState.user.isAuthenticated ? '#e8f5e8' : '#fff3cd' }}>
          <Card.Content style={{ padding: 20 }}>
            <Text variant="titleMedium" style={{ marginBottom: 12, fontWeight: '600' }}>
              🔐 Authentication Status
            </Text>
            <Text variant="bodyMedium" style={{ marginBottom: 12 }}>
              Status: {appState.user.isAuthenticated ? '✅ Logged In' : '❌ Not Logged In'}
            </Text>
            {appState.user.isAuthenticated && (
              <Text variant="bodySmall" style={{ marginBottom: 16, color: '#666' }}>
                User: {appState.user.email || 'Mock User'}
              </Text>
            )}
            
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {!appState.user.isAuthenticated ? (
                <Button 
                  mode="contained" 
                  onPress={() => {
                    appState.setMainPanelState({
                      mainPanelState: 'Login',
                      pageName: 'default'
                    });
                  }}
                  icon="login"
                  compact
                >
                  Go to Login
                </Button>
              ) : (
                <>
                  <Button 
                    mode="outlined" 
                    onPress={() => {
                      appState.setMainPanelState({
                        mainPanelState: 'Assets',
                        pageName: 'default'
                      });
                    }}
                    icon="wallet"
                    compact
                  >
                    Assets
                  </Button>
                  <Button 
                    mode="outlined" 
                    onPress={() => {
                      appState.setMainPanelState({
                        mainPanelState: 'History',
                        pageName: 'default'
                      });
                    }}
                    icon="history"
                    compact
                  >
                    History
                  </Button>
                  <Button 
                    mode="outlined" 
                    onPress={() => {
                      appState.setMainPanelState({
                        mainPanelState: 'Settings',
                        pageName: 'default'
                      });
                    }}
                    icon="cog"
                    compact
                  >
                    Settings
                  </Button>
                  <Button 
                    mode="text" 
                    onPress={() => {
                      appState.logout();
                    }}
                    icon="logout"
                    compact
                    textColor="#d32f2f"
                  >
                    Logout
                  </Button>
                </>
              )}
            </View>

            {/* Protected Pages List */}
            {appState.user.isAuthenticated && (
              <>
                <Text variant="bodySmall" style={{ marginTop: 16, marginBottom: 8, fontWeight: '600' }}>
                  🔒 Protected Pages (Require Authentication):
                </Text>
                <Text variant="bodySmall" style={{ color: '#666', lineHeight: 18 }}>
                  Assets, History, Settings, Send, Receive, Trade (Buy/Sell), Bank Accounts, Personal Details, Security, Payments, Notifications
                </Text>
              </>
            )}
          </Card.Content>
        </Card>

        {/* Navigation Index */}
        <Card style={{ marginBottom: 16 }}>
          <Card.Content style={{ padding: 20 }}>
            <Text variant="titleMedium" style={{ marginBottom: 12, fontWeight: '600' }}>
              App Navigation Index
            </Text>
            <Text variant="bodyMedium" style={{ color: '#666', lineHeight: 22, marginBottom: 16 }}>
              Access all pages and features through the comprehensive navigation index.
            </Text>
            <Button 
              mode="contained" 
              onPress={() => {
                appState.setMainPanelState({
                  mainPanelState: 'NavigationDebug',
                  pageName: 'default'
                });
              }}
              style={{ marginTop: 16 }}
              contentStyle={{ paddingVertical: 4 }}
            >
              Open Navigation Index
            </Button>
          </Card.Content>
        </Card>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'white',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownModal: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    paddingVertical: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  formList: {
    maxHeight: 400,
  },
  formItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  formItemText: {
    fontSize: 16,
    color: '#333',
  },
  cancelButton: {
    marginTop: 16,
    marginHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
});

export default Explore;
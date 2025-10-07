// React imports
import React, { useState, useContext, useEffect } from 'react';
import { Text, StyleSheet, View, TouchableOpacity, Alert } from 'react-native';

// Internal imports
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import { colors } from 'src/constants';
import AppStateContext from 'src/application/data';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('AddressBookDebug');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);

const AddressBookDebug = () => {
  console.log('🧪 AddressBookDebug: Component starting...');
  
  // Get app state for API access
  let appState = useContext(AppStateContext);
  console.log('🧪 AddressBookDebug: AppState:', !!appState);
  console.log('🧪 AddressBookDebug: AppState type:', typeof appState);
  console.log('🧪 AddressBookDebug: AppState keys:', appState ? Object.keys(appState) : 'null');
  console.log('🧪 AddressBookDebug: AppState.state exists:', !!appState?.state);
  console.log('🧪 AddressBookDebug: API Client:', !!appState?.state?.apiClient);
  
  // Simple state
  const [status, setStatus] = useState('Initializing...');
  const [addresses, setAddresses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [debug, setDebug] = useState('Component loaded');
  const [testResult, setTestResult] = useState('');  // Add missing state

  // Test API call
    const testAPI = async () => {
    console.log('🧪 AddressBookDebug: Testing API...');
    setTestResult('Testing...');
    
    try {
      // Check if appState exists
      if (!appState) {
        const msg = 'AppState context not available';
        console.log('❌', msg);
        setTestResult(`Error: ${msg}`);
        return;
      }
      
      console.log('✅ AppState context available');
      
      // Check if appState.state exists
      if (!appState.state) {
        console.log('⚠️ appState.state not available, trying direct appState access...');
        
        // Try accessing apiClient directly from appState (not appState.state)
        const directApiClient = appState.apiClient;
        console.log('🔍 Direct appState.apiClient check:', !!directApiClient);
        
        if (!directApiClient) {
          const msg = 'No API client available via either access method';
          console.log('❌', msg);
          setTestResult(`Error: ${msg}`);
          return;
        }
        
        console.log('✅ API client found via direct appState access!');
        console.log('🔍 API client type:', typeof directApiClient);
        console.log('🔍 API client keys:', Object.keys(directApiClient));
        
        // Check credentials
        const { apiKey, apiSecret } = directApiClient;
        console.log('🔑 API Key available:', !!apiKey);
        console.log('🔑 API Secret available:', !!apiSecret);
        console.log('🔑 API Key length:', apiKey?.length || 0);
        console.log('🔑 API Secret length:', apiSecret?.length || 0);
        
        if (!apiKey || !apiSecret || apiKey.length === 0 || apiSecret.length === 0) {
          const msg = 'API client exists but no credentials available';
          console.log('⚠️', msg);
          setTestResult(`Warning: ${msg}`);
          return;
        }
        
        console.log('✅ API credentials available, testing API call...');
        
        // Test API call using direct API client
        const result = await directApiClient.privateMethod({
          httpMethod: 'POST',
          apiRoute: 'addressBook/BTC',
          params: {}
        });
        
        console.log('🎯 API result:', result);
        
        if (result && result.error === null) {
          setTestResult(`Success: ${result.data?.length || 0} addresses found`);
          setAddresses(result.data || []);
        } else {
          setTestResult(`API Error: ${result?.error || 'Unknown error'}`);
        }
        
        return;
      }
      
      console.log('✅ AppState.state available');
      console.log('🔍 AppState.state keys:', Object.keys(appState.state));
      
      // Check if API client exists - try direct access
      const directApiClient = appState.state.apiClient;
      console.log('🔍 Direct API client check:', !!directApiClient);
      
      if (!directApiClient) {
        const msg = 'No API client available via direct access';
        console.log('❌', msg);
        setTestResult(`Error: ${msg}`);
        return;
      }
      
      console.log('✅ API client available via direct access');
      console.log('🔍 API client type:', typeof directApiClient);
      console.log('🔍 API client keys:', Object.keys(directApiClient));
      
      // Check credentials
      const { apiKey, apiSecret } = directApiClient;
      console.log('🔑 API Key available:', !!apiKey);
      console.log('🔑 API Secret available:', !!apiSecret);
      console.log('🔑 API Key length:', apiKey?.length || 0);
      console.log('🔑 API Secret length:', apiSecret?.length || 0);
      
      if (!apiKey || !apiSecret || apiKey.length === 0 || apiSecret.length === 0) {
        const msg = 'API client exists but no credentials available';
        console.log('⚠️', msg);
        setTestResult(`Warning: ${msg}`);
        return;
      }
      
      console.log('✅ API credentials available, testing API call...');
      
      // Create abort controller for this request
      const abortController = appState.createAbortController({tag: 'addressBookDebug'});
      
      // Test API call using direct API client
      const result = await directApiClient.privateMethod({
        httpMethod: 'POST',
        apiRoute: 'addressBook/BTC',
        params: {},
        abortController
      });
      
      console.log('🎯 API result:', result);
      
      if (result && result.error === null) {
        setTestResult(`Success: ${result.data?.length || 0} addresses found`);
        setAddresses(result.data || []);
      } else {
        setTestResult(`API Error: ${result?.error || 'Unknown error'}`);
      }
      
    } catch (error) {
      console.log('❌ Test API error:', error);
      setTestResult(`Exception: ${error.message}`);
    }
  };

  // Auto test on mount
  useEffect(() => {
    console.log('🧪 AddressBookDebug: useEffect triggered');
    setDebug('useEffect triggered');
    
    // Try calling setup first
    setup();
  }, []);

  const setup = async () => {
    try {
      console.log('🔧 AddressBookDebug: Attempting to call appState.generalSetup...');
      
      if (!appState) {
        console.log('❌ AddressBookDebug: No appState available');
        setDebug('No appState available');
        return;
      }
      
      if (!appState.generalSetup) {
        console.log('❌ AddressBookDebug: appState.generalSetup method not available');
        setDebug('generalSetup method not available');
        return;
      }
      
      console.log('🔧 AddressBookDebug: Calling appState.generalSetup...');
      await appState.generalSetup({caller: 'AddressBookDebug'});
      console.log('✅ AddressBookDebug: generalSetup completed successfully');
      setDebug('generalSetup completed');
      
      // Force a re-check by accessing the API client directly
      console.log('🔍 AddressBookDebug: Checking API client after setup...');
      console.log('🔍 AddressBookDebug: appState.state exists:', !!appState.state);
      console.log('🔍 AddressBookDebug: appState.state.apiClient exists:', !!appState.state?.apiClient);
      
      if (appState.state?.apiClient) {
        console.log('🔍 AddressBookDebug: API client found! Keys:', Object.keys(appState.state.apiClient));
        console.log('🔍 AddressBookDebug: API client has credentials:', 
          !!(appState.state.apiClient.apiKey && appState.state.apiClient.apiSecret));
      }
      
      // Now test API
      setTimeout(() => testAPI(), 1000);
      
    } catch (err) {
      const msg = `AddressBookDebug.setup: Error = ${err}`;
      console.log('❌', msg);
      setDebug(`Setup error: ${err.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AddressBook Debug Test</Text>
      
      <View style={styles.section}>
        <Text style={styles.label}>Status:</Text>
        <Text style={styles.value}>{status}</Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.label}>AppState Available:</Text>
        <Text style={styles.value}>{appState ? 'YES' : 'NO'}</Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.label}>API Client Available:</Text>
        <Text style={styles.value}>{appState?.state?.apiClient ? 'YES' : 'NO'}</Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.label}>API Credentials Available:</Text>
        <Text style={styles.value}>
          {appState?.state?.apiClient?.apiKey && appState?.state?.apiClient?.apiSecret ? 'YES' : 'NO'}
        </Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.label}>API Key Status:</Text>
        <Text style={styles.value}>
          {appState?.state?.apiClient?.apiKey ? 
            (appState.state.apiClient.apiKey.length > 10 ? 'Set (masked)' : 'Empty or too short') : 
            'Not available'
          }
        </Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.label}>Loading:</Text>
        <Text style={styles.value}>{isLoading ? 'YES' : 'NO'}</Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.label}>Addresses Count:</Text>
        <Text style={styles.value}>{addresses.length}</Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.label}>Debug Info:</Text>
        <Text style={[styles.value, {fontSize: 10}]}>{debug}</Text>
      </View>
      
      <TouchableOpacity style={styles.button} onPress={testAPI} disabled={isLoading}>
        <Text style={styles.buttonText}>
          {isLoading ? 'Testing...' : 'Test API Again'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.button, {backgroundColor: colors.primary, marginTop: 10}]} 
        onPress={() => {
          console.log('🔧 Triggering AppState.generalSetup...');
          if (appState && appState.generalSetup) {
            appState.generalSetup({caller: 'AddressBookDebug'}).then(() => {
              console.log('✅ generalSetup completed');
            }).catch(err => {
              console.log('❌ generalSetup error:', err);
            });
          } else {
            console.log('❌ AppState.generalSetup not available');
          }
        }}
      >
        <Text style={styles.buttonText}>Initialize API Client</Text>
      </TouchableOpacity>
      
      {addresses.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.label}>Address List:</Text>
          {addresses.map((addr, index) => (
            <Text key={addr.uuid || index} style={styles.addressItem}>
              {index + 1}. {addr.name} ({addr.uuid})
            </Text>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: scaledWidth(20),
    backgroundColor: colors.white,
  },
  
  title: {
    fontSize: normaliseFont(18),
    fontWeight: 'bold',
    color: colors.darkGray,
    marginBottom: scaledHeight(20),
    textAlign: 'center',
  },
  
  section: {
    marginBottom: scaledHeight(15),
    padding: scaledWidth(10),
    backgroundColor: colors.lightGray,
    borderRadius: 8,
  },
  
  label: {
    fontSize: normaliseFont(14),
    fontWeight: 'bold',
    color: colors.darkGray,
    marginBottom: scaledHeight(5),
  },
  
  value: {
    fontSize: normaliseFont(12),
    color: colors.mediumGray,
    fontFamily: 'monospace',
  },
  
  button: {
    backgroundColor: colors.primary,
    paddingVertical: scaledHeight(12),
    paddingHorizontal: scaledWidth(20),
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: scaledHeight(10),
  },
  
  buttonText: {
    fontSize: normaliseFont(14),
    fontWeight: '600',
    color: colors.white,
  },
  
  addressItem: {
    fontSize: normaliseFont(11),
    color: colors.mediumGray,
    marginBottom: scaledHeight(2),
    fontFamily: 'monospace',
  },
});

export default AddressBookDebug;
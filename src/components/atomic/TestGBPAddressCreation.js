// Test script to verify GBP address creation with FIAT addressType
// This file can be deleted after testing

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { log } from '../util/util';

const TestGBPAddressCreation = ({ appState }) => {
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const testGBPAddress = async () => {
    setIsTestRunning(true);
    setTestResult(null);

    try {
      const testData = {
        asset: 'GBP',
        recipient: 'Test Recipient',
        accountName: 'Test Account Name',
        sortCode: '12-34-56',
        accountNumber: '12345678'
      };

      const addressType = 'FIAT';
      const sortCodeNoDashes = testData.sortCode.replace(/-/g, '');

      const apiPayload = {
        name: testData.recipient.trim(),
        asset: testData.asset.toUpperCase(),
        network: testData.asset.toUpperCase(),
        accountName: testData.accountName.trim(),
        sortCode: sortCodeNoDashes,
        accountNumber: testData.accountNumber.trim(),
        thirdparty: true
      };

      log('🧪 Testing GBP address creation');
      log('🧪 API route:', `addressBook/${testData.asset.toUpperCase()}/${addressType}`);
      log('🧪 API payload:', apiPayload);

      const abortController = appState.createAbortController({tag: 'testGBPAddress'});

      const result = await appState.apiClient.privateMethod({
        httpMethod: 'POST',
        apiRoute: `addressBook/${testData.asset.toUpperCase()}/${addressType}`,
        params: apiPayload,
        abortController
      });

      log('🧪 GBP address creation result:', result);
      
      if (result.success) {
        setTestResult('✅ SUCCESS: GBP address created successfully!');
        log('✅ GBP address test PASSED');
      } else {
        setTestResult(`❌ FAILED: ${result.message || 'Unknown error'}`);
        log('❌ GBP address test FAILED:', result);
      }

    } catch (error) {
      log('❌ GBP address test ERROR:', error);
      setTestResult(`❌ ERROR: ${error.message}`);
    } finally {
      setIsTestRunning(false);
    }
  };

  return (
    <View style={{ padding: 20, backgroundColor: '#f0f0f0', margin: 10 }}>
      <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>
        GBP Address Creation Test
      </Text>
      
      <TouchableOpacity 
        onPress={testGBPAddress}
        disabled={isTestRunning}
        style={{
          backgroundColor: isTestRunning ? '#ccc' : '#007AFF',
          padding: 15,
          borderRadius: 8,
          marginBottom: 10
        }}
      >
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
          {isTestRunning ? 'Testing...' : 'Test GBP Address Creation'}
        </Text>
      </TouchableOpacity>

      {testResult && (
        <Text style={{ 
          fontSize: 14, 
          color: testResult.includes('SUCCESS') ? 'green' : 'red',
          marginTop: 10
        }}>
          {testResult}
        </Text>
      )}
    </View>
  );
};

export default TestGBPAddressCreation;
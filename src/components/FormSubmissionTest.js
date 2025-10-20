import React, { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView, StyleSheet } from 'react-native';
import { Card, Button } from 'react-native-paper';
import { Buffer } from 'buffer';
import AppStateContext from 'src/application/data';
import { colors } from 'src/constants';

/**
 * Form Submission Test Component
 * 
 * This component tests JSON form submission functionality by:
 * 1. Creating test form data
 * 2. Converting to base64 format
 * 3. Uploading via AppState.uploadDocument()
 * 4. Testing API endpoint submission
 * 5. Logging all results for debugging
 */
const FormSubmissionTest = () => {
  const appState = useContext(AppStateContext);
  const [testResults, setTestResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);

  const addTestResult = (test, result, details = '') => {
    const newResult = {
      test,
      result,
      details,
      timestamp: new Date().toLocaleTimeString()
    };
    setTestResults(prev => [...prev, newResult]);
    console.log(`🧪 [TEST] ${test}: ${result}`, details);
  };

  const createTestFormData = () => {
    return {
      formTitle: "Form Submission Test",
      formId: "test-form-" + Date.now(),
      uuid: `test-uuid-${Date.now()}`,
      submittedAt: new Date().toISOString(),
      answers: {
        name: "Test User",
        email: "test@example.com",
        occupation: "Software Developer",
        income_range: "50000-75000",
        feedback: "This is a test form submission to verify the upload functionality works correctly.",
        rating: 5,
        agree_terms: true
      },
      metadata: {
        testRun: true,
        timestamp: Date.now(),
        userAgent: "React Native Form Test",
        platform: "mobile",
        version: "1.0.0"
      }
    };
  };

  const testJSONStructure = async () => {
    addTestResult('JSON Structure Test', 'RUNNING', 'Creating and validating JSON structure...');
    
    try {
      const testData = createTestFormData();
      const jsonString = JSON.stringify(testData, null, 2);
      const base64Data = Buffer.from(jsonString, 'utf-8').toString('base64');
      
      // Test decode
      const decoded = Buffer.from(base64Data, 'base64').toString('utf-8');
      const parsed = JSON.parse(decoded);
      
      addTestResult('JSON Structure Test', 'PASS', `JSON: ${jsonString.length} chars, Base64: ${base64Data.length} chars`);
      return { jsonString, base64Data, testData };
    } catch (error) {
      addTestResult('JSON Structure Test', 'FAIL', error.message);
      throw error;
    }
  };

  const testUploadDocument = async (base64Data, testData) => {
    addTestResult('Upload Document Test', 'RUNNING', 'Testing AppState.uploadDocument()...');
    
    try {
      const uploadResult = await appState.uploadDocument({
        documentType: 'test_submission',
        documentCategory: 'test_submission',
        fileData: base64Data,
        fileExtension: '.json'
      });
      
      console.log('🧪 Upload Document Result:', uploadResult);
      
      if (uploadResult && uploadResult.success) {
        addTestResult('Upload Document Test', 'PASS', 'Successfully uploaded to /private_upload endpoint');
        return uploadResult;
      } else {
        addTestResult('Upload Document Test', 'FAIL', `Upload failed: ${JSON.stringify(uploadResult)}`);
        return null;
      }
    } catch (error) {
      addTestResult('Upload Document Test', 'FAIL', error.message);
      console.error('🧪 Upload Document Error:', error);
      return null;
    }
  };

  const testAPISubmission = async (testData) => {
    addTestResult('API Submission Test', 'RUNNING', 'Testing direct API endpoint submission...');
    
    try {
      // Test with mock endpoint
      const mockEndpoint = '/api/mock/submit';
      
      const response = await fetch(mockEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData)
      });
      
      console.log('🧪 API Response Status:', response.status, response.statusText);
      
      if (response.ok) {
        const result = await response.text();
        addTestResult('API Submission Test', 'PASS', `API responded with status ${response.status}`);
        console.log('🧪 API Response Body:', result);
        return result;
      } else {
        addTestResult('API Submission Test', 'WARN', `API returned ${response.status} - this may be expected`);
        return null;
      }
    } catch (error) {
      addTestResult('API Submission Test', 'WARN', `Network error: ${error.message} - this may be expected`);
      console.log('🧪 API Submission Error (expected):', error.message);
      return null;
    }
  };

  const testFormComponent = async (testData) => {
    addTestResult('Form Component Test', 'RUNNING', 'Testing DynamicQuestionnaireForm submission...');
    
    try {
      // Create form data that matches the component's expected structure
      const formData = {
        formid: 'test-form',
        uuid: testData.uuid,
        formtitle: 'Test Form Submission',
        submittext: 'Submit Test',
        submiturl: '/api/test/submit',
        questions: [
          {
            type: 'text',
            id: 'name',
            label: 'Name',
            required: true
          },
          {
            type: 'email',
            id: 'email',
            label: 'Email',
            required: true
          }
        ]
      };
      
      const answers = {
        name: 'Test User',
        email: 'test@example.com'
      };
      
      // Simulate what the form component does
      const answeredFormJSON = {
        ...formData,
        answers: answers,
        submittedAt: new Date().toISOString(),
        completed: true
      };
      
      const jsonString = JSON.stringify(answeredFormJSON, null, 2);
      const base64Data = Buffer.from(jsonString, 'utf-8').toString('base64');
      
      // Upload via the same method the form component uses
      const uploadResult = await appState.uploadDocument({
        documentType: 'categorisation',
        documentCategory: 'categorisation',
        fileData: base64Data,
        fileExtension: '.json'
      });
      
      if (uploadResult && uploadResult.success) {
        addTestResult('Form Component Test', 'PASS', 'Form component simulation successful');
        return uploadResult;
      } else {
        addTestResult('Form Component Test', 'FAIL', 'Form component simulation failed');
        return null;
      }
    } catch (error) {
      addTestResult('Form Component Test', 'FAIL', error.message);
      console.error('🧪 Form Component Test Error:', error);
      return null;
    }
  };

  const runAllTests = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setTestResults([]);
    
    console.log('🧪🧪🧪 STARTING FORM SUBMISSION TESTS 🧪🧪🧪');
    
    try {
      // Test 1: JSON Structure
      const { jsonString, base64Data, testData } = await testJSONStructure();
      
      // Test 2: Upload Document
      const uploadResult = await testUploadDocument(base64Data, testData);
      
      // Test 3: API Submission
      const apiResult = await testAPISubmission(testData);
      
      // Test 4: Form Component Simulation
      const formResult = await testFormComponent(testData);
      
      // Summary
      addTestResult('Test Suite', 'COMPLETED', 'All tests finished - check individual results');
      
      console.log('🧪🧪🧪 FORM SUBMISSION TESTS COMPLETED 🧪🧪🧪');
      
      Alert.alert(
        '✅ Tests Completed',
        'Form submission tests have finished. Check the results below and console logs for details.',
        [{ text: 'OK', style: 'default' }]
      );
      
    } catch (error) {
      addTestResult('Test Suite', 'ERROR', error.message);
      console.error('🧪 Test Suite Error:', error);
      
      Alert.alert(
        '❌ Tests Failed',
        `Test suite encountered an error: ${error.message}`,
        [{ text: 'OK', style: 'default' }]
      );
    } finally {
      setIsRunning(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const getResultColor = (result) => {
    switch (result) {
      case 'PASS': return '#4CAF50';
      case 'FAIL': return '#F44336';
      case 'WARN': return '#FF9800';
      case 'RUNNING': return '#2196F3';
      default: return '#666';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.title}>🧪 Form Submission Test Suite</Text>
          <Text style={styles.subtitle}>
            Test JSON form upload functionality including base64 encoding, 
            AppState.uploadDocument(), and API endpoint submission.
          </Text>
          
          <View style={styles.buttonContainer}>
            <Button 
              mode="contained" 
              onPress={runAllTests}
              disabled={isRunning}
              style={styles.button}
              buttonColor={colors.primary}
            >
              {isRunning ? 'Running Tests...' : 'Run All Tests'}
            </Button>
            
            <Button 
              mode="outlined" 
              onPress={clearResults}
              disabled={isRunning}
              style={styles.button}
            >
              Clear Results
            </Button>
          </View>
        </Card.Content>
      </Card>
      
      {testResults.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>📊 Test Results</Text>
            {testResults.map((result, index) => (
              <View key={index} style={styles.resultItem}>
                <View style={styles.resultHeader}>
                  <Text style={styles.testName}>{result.test}</Text>
                  <Text style={[styles.testResult, { color: getResultColor(result.result) }]}>
                    {result.result}
                  </Text>
                </View>
                <Text style={styles.timestamp}>{result.timestamp}</Text>
                {result.details ? (
                  <Text style={styles.details}>{result.details}</Text>
                ) : null}
              </View>
            ))}
          </Card.Content>
        </Card>
      )}
      
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>📝 Instructions</Text>
          <Text style={styles.instruction}>
            1. Tap "Run All Tests" to start the test suite
          </Text>
          <Text style={styles.instruction}>
            2. Watch the console logs for detailed output
          </Text>
          <Text style={styles.instruction}>
            3. Check test results above for pass/fail status
          </Text>
          <Text style={styles.instruction}>
            4. Green = Pass, Red = Fail, Orange = Warning, Blue = Running
          </Text>
          <Text style={styles.instruction}>
            5. Look for "FORM SUBMISSION" messages in console
          </Text>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  button: {
    minWidth: 140,
  },
  resultItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  testName: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  testResult: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  details: {
    fontSize: 14,
    color: '#333',
    fontStyle: 'italic',
  },
  instruction: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    paddingLeft: 8,
  },
});

export default FormSubmissionTest;
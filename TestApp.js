import React, { useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';

// Import the form test components
import FormSubmissionTest from './src/components/FormSubmissionTest';
import FinpromCategorisationTest from './src/components/FinpromCategorisationTest';
import SimpleFormTest from './src/components/SimpleFormTest';
import FormGenerationTest from './src/components/FormGenerationTest';
import FinpromCategorisationFormTest from './src/components/FinpromCategorisationFormTest';
import AppStateContext from './src/application/data';

// Mock AppState for testing (minimal version)
const mockAppState = {
  uploadDocument: async (params) => {
    console.log('🧪 [MOCK] uploadDocument called with:', params);
    
    // Simulate a successful upload for testing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      success: true,
      message: 'Mock upload successful',
      data: {
        documentId: 'mock-doc-' + Date.now(),
        uploadedAt: new Date().toISOString()
      }
    };
  }
};

const TestApp = () => {
  const [showFormTest, setShowFormTest] = useState(false);
  const [showCategorisationTest, setShowCategorisationTest] = useState(false);
  const [showSimpleFormTest, setShowSimpleFormTest] = useState(false);
  const [showFormGenerationTest, setShowFormGenerationTest] = useState(false);
  const [showFinpromFormTest, setShowFinpromFormTest] = useState(false);

  const handlePress = () => {
    Alert.alert('Success!', 'The app is working and Metro connection is good!');
  };

  const toggleFormTest = () => {
    setShowFormTest(!showFormTest);
    setShowCategorisationTest(false);
  };

  const toggleCategorisationTest = () => {
    setShowCategorisationTest(!showCategorisationTest);
    setShowFormTest(false);
    setShowFormGenerationTest(false);
  };

  const toggleFormGenerationTest = () => {
    setShowFormGenerationTest(!showFormGenerationTest);
    setShowFormTest(false);
    setShowCategorisationTest(false);
    setShowFinpromFormTest(false);
  };

  const toggleFinpromFormTest = () => {
    setShowFinpromFormTest(!showFinpromFormTest);
    setShowFormTest(false);
    setShowCategorisationTest(false);
    setShowFormGenerationTest(false);
  };

  if (showFormTest) {
    return (
      <SafeAreaView style={styles.container}>
        <AppStateContext.Provider value={mockAppState}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={toggleFormTest}>
              <Text style={styles.backButtonText}>← Back to Main Test</Text>
            </TouchableOpacity>
          </View>
          <FormSubmissionTest />
        </AppStateContext.Provider>
      </SafeAreaView>
    );
  }

  if (showCategorisationTest) {
    return (
      <SafeAreaView style={styles.container}>
        <AppStateContext.Provider value={mockAppState}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={toggleCategorisationTest}>
              <Text style={styles.backButtonText}>← Back to Main Test</Text>
            </TouchableOpacity>
          </View>
          <FinpromCategorisationTest />
        </AppStateContext.Provider>
      </SafeAreaView>
    );
  }

  if (showFormGenerationTest) {
    return (
      <SafeAreaView style={styles.container}>
        <AppStateContext.Provider value={mockAppState}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={toggleFormGenerationTest}>
              <Text style={styles.backButtonText}>← Back to Main Test</Text>
            </TouchableOpacity>
          </View>
          <FormGenerationTest />
        </AppStateContext.Provider>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>🎉 SolidiMobileApp4 Connection Test</Text>
        <Text style={styles.subtitle}>React Native is working!</Text>
        <Text style={styles.text}>If you can see this text, the app is running correctly.</Text>
        
        <TouchableOpacity style={styles.button} onPress={handlePress}>
          <Text style={styles.buttonText}>Test Button - Tap Me!</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.formTestButton]} onPress={toggleFormTest}>
          <Text style={styles.buttonText}>🧪 Test Form Submission</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.categorisationTestButton]} onPress={toggleCategorisationTest}>
          <Text style={styles.buttonText}>📋 Test Categorisation Form</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.formGenerationTestButton]} onPress={toggleFormGenerationTest}>
          <Text style={styles.buttonText}>🎯 Test Form Generation</Text>
        </TouchableOpacity>
        
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>✅ Metro server connected</Text>
          <Text style={styles.statusText}>✅ JavaScript bundle loaded</Text>
          <Text style={styles.statusText}>✅ iPhone connection working</Text>
          <Text style={styles.statusText}>🧪 Form submission test available</Text>
          <Text style={styles.statusText}>📋 Local JSON form loading available</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f8ff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    color: '#333333',
    marginBottom: 10,
  },
  text: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  formTestButton: {
    backgroundColor: '#28A745',
  },
  categorisationTestButton: {
    backgroundColor: '#17A2B8',
  },
  formGenerationTestButton: {
    backgroundColor: '#FD7E14',
  },
  header: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  backButton: {
    backgroundColor: '#6C757D',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    color: '#4CAF50',
    marginBottom: 8,
    fontWeight: '500',
  },
});

export default TestApp;
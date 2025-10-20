import React, { Component } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { AuthScreen, BiometricAuthUtils } from 'src/components/BiometricAuth';

/**
 * BiometricTestPage - Test page for biometric authentication
 * 
 * This page can be used to test and demonstrate the biometric authentication functionality
 */
class BiometricTestPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      authStatus: 'Not Authenticated',
      availableMethods: {},
      testResults: [],
    };
  }

  async componentDidMount() {
    console.log('🔐 [BiometricTestPage] Mounted');
    await this.checkAuthMethods();
  }

  // Check available authentication methods
  checkAuthMethods = async () => {
    try {
      const methods = await BiometricAuthUtils.getAvailableMethods();
      console.log('🔐 [BiometricTestPage] Available methods:', methods);
      
      this.setState({ availableMethods: methods });
      this.addTestResult('Available Methods Check', 'Success', methods);
    } catch (error) {
      console.log('🔐 [BiometricTestPage] Error checking methods:', error);
      this.addTestResult('Available Methods Check', 'Error', error.message);
    }
  };

  // Add test result to display
  addTestResult = (test, status, details) => {
    const result = {
      test,
      status,
      details: typeof details === 'object' ? JSON.stringify(details, null, 2) : details,
      timestamp: new Date().toLocaleTimeString(),
    };
    
    this.setState(prevState => ({
      testResults: [result, ...prevState.testResults.slice(0, 9)] // Keep last 10 results
    }));
  };

  // Test quick authentication
  testQuickAuth = async () => {
    try {
      console.log('🔐 [BiometricTestPage] Testing quick auth...');
      const result = await BiometricAuthUtils.quickAuth();
      
      if (result.success) {
        this.setState({ authStatus: 'Authenticated via Quick Auth' });
        this.addTestResult('Quick Auth', 'Success', result);
      } else {
        this.addTestResult('Quick Auth', 'Failed', result);
      }
    } catch (error) {
      console.log('🔐 [BiometricTestPage] Quick auth error:', error);
      this.addTestResult('Quick Auth', 'Error', error.message);
    }
  };

  // Clear test results
  clearResults = () => {
    this.setState({ testResults: [] });
  };

  // Reset authentication status
  resetAuthStatus = () => {
    this.setState({ authStatus: 'Not Authenticated' });
  };

  render() {
    const { authStatus, availableMethods, testResults } = this.state;

    return (
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>🔐 Biometric Auth Test</Text>
          
          {/* Status Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Authentication Status</Text>
            <View style={styles.statusContainer}>
              <Text style={styles.statusText}>{authStatus}</Text>
              <TouchableOpacity 
                style={[styles.button, styles.resetButton]} 
                onPress={this.resetAuthStatus}
              >
                <Text style={styles.buttonText}>Reset Status</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Available Methods Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Available Methods</Text>
            <View style={styles.methodsContainer}>
              <Text style={styles.methodText}>
                Biometric: {availableMethods.biometric ? '✅' : '❌'}
              </Text>
              {availableMethods.biometric && (
                <Text style={styles.methodDetail}>
                  Type: {availableMethods.biometricType}
                </Text>
              )}
              <Text style={styles.methodText}>
                PIN Code: {availableMethods.pin ? '✅' : '❌'}
              </Text>
            </View>
          </View>

          {/* Test Buttons Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Tests</Text>
            
            <TouchableOpacity 
              style={[styles.button, styles.testButton]} 
              onPress={this.checkAuthMethods}
            >
              <Text style={styles.buttonText}>Check Available Methods</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.testButton]} 
              onPress={this.testQuickAuth}
            >
              <Text style={styles.buttonText}>Test Quick Auth</Text>
            </TouchableOpacity>
          </View>

          {/* Full Auth Screen Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Full Authentication Screen</Text>
            <View style={styles.authScreenContainer}>
              <AuthScreen
                onAuthSuccess={(result) => {
                  this.setState({ authStatus: `Authenticated via ${result.method}` });
                  this.addTestResult('Full Auth Screen', 'Success', result);
                }}
                onLogout={() => {
                  this.setState({ authStatus: 'Logged Out' });
                  this.addTestResult('Full Auth Screen', 'Logout', 'User logged out');
                }}
              />
            </View>
          </View>

          {/* Test Results Section */}
          <View style={styles.section}>
            <View style={styles.resultsHeader}>
              <Text style={styles.sectionTitle}>Test Results</Text>
              <TouchableOpacity 
                style={[styles.button, styles.clearButton]} 
                onPress={this.clearResults}
              >
                <Text style={styles.buttonText}>Clear</Text>
              </TouchableOpacity>
            </View>
            
            {testResults.length === 0 ? (
              <Text style={styles.noResultsText}>No test results yet</Text>
            ) : (
              testResults.map((result, index) => (
                <View key={index} style={styles.resultItem}>
                  <View style={styles.resultHeader}>
                    <Text style={styles.resultTest}>{result.test}</Text>
                    <Text style={[
                      styles.resultStatus,
                      result.status === 'Success' ? styles.successStatus :
                      result.status === 'Error' ? styles.errorStatus : styles.infoStatus
                    ]}>
                      {result.status}
                    </Text>
                    <Text style={styles.resultTime}>{result.timestamp}</Text>
                  </View>
                  <Text style={styles.resultDetails}>{result.details}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  section: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    flex: 1,
  },
  methodsContainer: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 5,
  },
  methodText: {
    fontSize: 16,
    marginBottom: 5,
  },
  methodDetail: {
    fontSize: 14,
    color: '#666',
    marginLeft: 20,
    marginBottom: 5,
  },
  authScreenContainer: {
    minHeight: 300,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  resultItem: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  resultTest: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  resultStatus: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  successStatus: {
    backgroundColor: '#d4edda',
    color: '#155724',
  },
  errorStatus: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
  },
  infoStatus: {
    backgroundColor: '#d1ecf1',
    color: '#0c5460',
  },
  resultTime: {
    fontSize: 12,
    color: '#666',
    marginLeft: 10,
  },
  resultDetails: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  noResultsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  button: {
    backgroundColor: '#2196F3',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginBottom: 10,
  },
  testButton: {
    backgroundColor: '#4CAF50',
  },
  resetButton: {
    backgroundColor: '#FF9800',
    marginLeft: 10,
  },
  clearButton: {
    backgroundColor: '#F44336',
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginBottom: 0,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default BiometricTestPage;
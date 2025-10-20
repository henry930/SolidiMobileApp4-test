import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    console.error('🚨 [ERROR BOUNDARY] Error caught:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🚨 [ERROR BOUNDARY] Component error:', error);
    console.error('🚨 [ERROR BOUNDARY] Error info:', errorInfo);
    
    this.setState({ 
      error, 
      errorInfo,
      errorCount: this.state.errorCount + 1
    });
    
    // Store crash details
    this.storeCrashDetails(error, errorInfo);
    
    // Call parent error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  storeCrashDetails = async (error, errorInfo) => {
    try {
      const crashDetails = {
        timestamp: new Date().toISOString(),
        error: error.message || String(error),
        stack: error.stack || 'No stack trace',
        componentStack: errorInfo.componentStack || 'No component stack',
        platform: Platform.OS,
        appVersion: '1.2.0',
        buildNumber: '33',
        context: 'React Error Boundary'
      };

      console.log('📤 [ERROR BOUNDARY] Storing crash details:', crashDetails);

      // Store locally
      const existingLogs = await AsyncStorage.getItem('error_boundary_logs') || '[]';
      const logs = JSON.parse(existingLogs);
      logs.push(crashDetails);
      await AsyncStorage.setItem('error_boundary_logs', JSON.stringify(logs));

      // Send to server
      await fetch('https://t2.solidi.co/api2/v1/error_boundary_report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(crashDetails),
        timeout: 5000
      });

      console.log('✅ [ERROR BOUNDARY] Crash details sent successfully');

    } catch (reportError) {
      console.error('❌ [ERROR BOUNDARY] Failed to store/send crash details:', reportError);
    }
  }

  handleRestart = () => {
    console.log('🔄 [ERROR BOUNDARY] User requested app restart');
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    });
  }

  handleDebugInfo = () => {
    const debugInfo = `
Error: ${this.state.error?.message}
Stack: ${this.state.error?.stack}
Component: ${this.state.errorInfo?.componentStack}
Count: ${this.state.errorCount}
Platform: ${Platform.OS}
Time: ${new Date().toISOString()}
    `;
    
    console.log('🔍 [ERROR BOUNDARY] Debug info:', debugInfo);
    
    Alert.alert(
      'Debug Information',
      debugInfo,
      [{ text: 'OK' }]
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>⚠️ Something went wrong</Text>
          
          <Text style={styles.subtitle}>
            The app encountered an error and couldn't continue.
          </Text>
          
          <Text style={styles.errorText}>
            Error: {this.state.error?.message || 'Unknown error'}
          </Text>
          
          <Text style={styles.countText}>
            Error #{this.state.errorCount}
          </Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.restartButton}
              onPress={this.handleRestart}
            >
              <Text style={styles.buttonText}>🔄 Try Again</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.debugButton}
              onPress={this.handleDebugInfo}
            >
              <Text style={styles.buttonText}>🔍 Debug Info</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.infoText}>
            Error details have been logged and sent for analysis.
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 20,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 10,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  countText: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  restartButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  debugButton: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  infoText: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default ErrorBoundary;
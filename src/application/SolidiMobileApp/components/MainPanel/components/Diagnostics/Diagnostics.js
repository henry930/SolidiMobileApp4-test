// React imports
import React, { useContext, useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Platform } from 'react-native';

// Internal imports
import AppStateContext from 'src/application/data';
import { colors } from 'src/constants';
import ImageLookup from 'src/images';

const DiagnosticPage = () => {
  const [diagnostics, setDiagnostics] = useState({
    platform: Platform.OS,
    authStatus: 'Testing...',
    authDetails: {},
    apiStatus: 'Testing...',
    imageStatus: 'Testing...',
    iconTests: {},
    keystoreTests: {},
    errors: []
  });

  const appState = useContext(AppStateContext);

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    const results = { ...diagnostics };

    // Test Platform Detection
    results.platform = Platform.OS;

    // Test Authentication Status
    try {
      if (appState) {
        results.authStatus = `AppState Available: ${!!appState}`;
        results.authDetails = {
          userObject: !!appState.user,
          isAuthenticated: appState.user?.isAuthenticated || false,
          email: appState.user?.email || 'Not set',
          apiCredentialsFound: appState.user?.apiCredentialsFound || false,
          hasApiClient: !!appState.apiClient,
          bypassAuthentication: appState.bypassAuthentication || false,
        };
        
        // Test if we can trigger authentication
        if (!appState.user?.isAuthenticated && appState.authenticateUser) {
          results.authDetails.canTriggerAuth = 'authenticateUser method available';
        }
      } else {
        results.authStatus = 'AppState not available';
      }
    } catch (error) {
      results.authStatus = 'Error: ' + error.message;
      results.errors.push('Auth test error: ' + error.message);
    }

    // Test Keychain/Storage on Web
    try {
      if (Platform.OS === 'web') {
        const testKey = 'test_storage_key';
        const testValue = 'test_value';
        
        // Test localStorage
        try {
          localStorage.setItem(testKey, testValue);
          const retrieved = localStorage.getItem(testKey);
          localStorage.removeItem(testKey);
          results.keystoreTests.localStorage = retrieved === testValue ? 'Working' : 'Failed';
        } catch (e) {
          results.keystoreTests.localStorage = 'Error: ' + e.message;
        }
        
        // Test if Keychain stub is working
        try {
          // Use mock Keychain to prevent NativeEventEmitter crashes
          const Keychain = {
            setInternetCredentials: async (key, username, password) => {
              console.log(`[MockKeychain] setInternetCredentials called for key: ${key}`);
              return Promise.resolve();
            },
            getInternetCredentials: async (key) => {
              console.log(`[MockKeychain] getInternetCredentials called for key: ${key}`);
              return Promise.resolve({ username: 'testUser', password: 'testPass' });
            }
          };
          
          if (Keychain) {
            results.keystoreTests.keychainStub = 'Available (Mock)';
            // Test keychain stub
            await Keychain.setInternetCredentials('test', 'testUser', 'testPass');
            const creds = await Keychain.getInternetCredentials('test');
            results.keystoreTests.keychainFunction = creds ? 'Working (Mock)' : 'Failed';
          }
        } catch (e) {
          results.keystoreTests.keychainStub = 'Error: ' + e.message;
        }
      }
    } catch (error) {
      results.keystoreTests.error = error.message;
      results.errors.push('Keystore test error: ' + error.message);
    }

    // Test Image Loading
    try {
      results.imageStatus = 'Images available in ImageLookup: ' + Object.keys(ImageLookup).join(', ');
      
      // Test individual icons
      const testIcons = ['BTC', 'ETH', 'GBP', 'trade', 'maintenance'];
      for (const icon of testIcons) {
        try {
          const iconSource = ImageLookup[icon];
          if (iconSource) {
            results.iconTests[icon] = {
              status: 'Available',
              type: typeof iconSource,
              isRequire: iconSource.hasOwnProperty && iconSource.hasOwnProperty('uri') ? 'URI object' : 'Require object',
              source: iconSource
            };
          } else {
            results.iconTests[icon] = { status: 'Missing', source: null };
          }
        } catch (error) {
          results.iconTests[icon] = { status: 'Error: ' + error.message, source: null };
        }
      }
    } catch (error) {
      results.imageStatus = 'Error: ' + error.message;
      results.errors.push('Image test error: ' + error.message);
    }

    // Test API Connectivity with better error handling
    try {
      if (appState && appState.publicMethod) {
        console.log('🔍 Testing API connectivity...');
        
        // Test a simple public endpoint
        try {
          const testResult = await Promise.race([
            appState.publicMethod({
              functionName: 'diagnosticTest',
              apiRoute: 'market', // Try a known public endpoint
              httpMethod: 'GET',
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout after 10 seconds')), 10000))
          ]);
          results.apiStatus = 'API working - Response type: ' + typeof testResult;
          if (testResult && testResult.error) {
            results.apiStatus += ' - Error: ' + JSON.stringify(testResult.error);
          }
        } catch (apiError) {
          results.apiStatus = 'API Error: ' + apiError.message;
          
          // Try to get more details about the API setup
          if (appState.apiClient) {
            results.apiStatus += ' - API Client available';
            results.apiStatus += ' - Domain: ' + (appState.apiClient.domain || 'not set');
          } else {
            results.apiStatus += ' - No API client found';
          }
        }
      } else {
        results.apiStatus = 'AppState not available or publicMethod missing';
      }
    } catch (error) {
      results.apiStatus = 'API Error: ' + error.message;
      results.errors.push('API test error: ' + error.message);
    }

    // Test Asset Icon Method
    try {
      if (appState && appState.getAssetIcon) {
        const btcIcon = appState.getAssetIcon('BTC');
        results.btcIconTest = {
          available: !!btcIcon,
          type: typeof btcIcon,
          details: btcIcon
        };
      } else {
        results.btcIconTest = { available: false, reason: 'getAssetIcon method not available' };
      }
    } catch (error) {
      results.btcIconTest = { available: false, error: error.message };
      results.errors.push('Asset icon test error: ' + error.message);
    }

    setDiagnostics(results);
  };

  const testLogin = async () => {
    try {
      if (appState && appState.login) {
        console.log('🔐 Testing login with demo credentials...');
        const result = await appState.login({
          email: 'johnqfish@foo.com',
          password: 'bigFish6'
        });
        alert('Login result: ' + result);
        runDiagnostics(); // Refresh diagnostics
      } else {
        alert('Login method not available');
      }
    } catch (error) {
      alert('Login error: ' + error.message);
    }
  };

  const triggerAuth = async () => {
    try {
      if (appState && appState.authenticateUser) {
        console.log('🔐 Triggering authentication...');
        await appState.authenticateUser();
        runDiagnostics(); // Refresh diagnostics
      } else {
        alert('authenticateUser method not available');
      }
    } catch (error) {
      alert('Auth trigger error: ' + error.message);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <View style={{ padding: 16, backgroundColor: colors.primary }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'white', textAlign: 'center' }}>
          API & Authentication Diagnostics
        </Text>
      </View>

      <ScrollView style={{ flex: 1, padding: 16 }}>
        
        <View style={cardStyle}>
          <Text style={headerStyle}>Platform Information</Text>
          <Text style={textStyle}>Platform: {diagnostics.platform}</Text>
        </View>

        <View style={cardStyle}>
          <Text style={headerStyle}>Authentication Status</Text>
          <Text style={textStyle}>{diagnostics.authStatus}</Text>
          {Object.keys(diagnostics.authDetails).map(key => (
            <Text key={key} style={textStyle}>
              {key}: {String(diagnostics.authDetails[key])}
            </Text>
          ))}
          
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <TouchableOpacity 
              style={buttonStyle}
              onPress={testLogin}
            >
              <Text style={buttonTextStyle}>Test Login</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[buttonStyle, { backgroundColor: '#e74c3c' }]}
              onPress={triggerAuth}
            >
              <Text style={buttonTextStyle}>Trigger Auth</Text>
            </TouchableOpacity>
          </View>
        </View>

        {Platform.OS === 'web' && (
          <View style={cardStyle}>
            <Text style={headerStyle}>Web Storage Tests</Text>
            {Object.keys(diagnostics.keystoreTests).map(key => (
              <Text key={key} style={textStyle}>
                {key}: {String(diagnostics.keystoreTests[key])}
              </Text>
            ))}
          </View>
        )}

        <View style={cardStyle}>
          <Text style={headerStyle}>API Status</Text>
          <Text style={textStyle}>{diagnostics.apiStatus}</Text>
        </View>

        <View style={cardStyle}>
          <Text style={headerStyle}>Image Loading</Text>
          <Text style={textStyle}>{diagnostics.imageStatus}</Text>
          {diagnostics.btcIconTest && (
            <View style={{ marginTop: 8 }}>
              <Text style={textStyle}>Asset Icon Test (BTC):</Text>
              <Text style={textStyle}>Available: {String(diagnostics.btcIconTest.available)}</Text>
              {diagnostics.btcIconTest.type && (
                <Text style={textStyle}>Type: {diagnostics.btcIconTest.type}</Text>
              )}
            </View>
          )}
        </View>

        <View style={cardStyle}>
          <Text style={headerStyle}>Icon Tests</Text>
          {Object.keys(diagnostics.iconTests).map(icon => (
            <View key={icon} style={{ marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={textStyle}>{icon}:</Text>
                <Text style={textStyle}>{diagnostics.iconTests[icon].status}</Text>
                {diagnostics.iconTests[icon].status === 'Available' && diagnostics.iconTests[icon].source && (
                  <Image 
                    source={diagnostics.iconTests[icon].source} 
                    style={{ width: 24, height: 24, marginLeft: 10 }}
                    onError={(e) => console.log(`Failed to load ${icon} icon:`, e.nativeEvent.error)}
                    onLoad={() => console.log(`Successfully loaded ${icon} icon`)}
                  />
                )}
              </View>
              {diagnostics.iconTests[icon].type && (
                <Text style={[textStyle, { fontSize: 12, color: '#888' }]}>
                  Type: {diagnostics.iconTests[icon].type}
                </Text>
              )}
            </View>
          ))}
        </View>

        {diagnostics.errors.length > 0 && (
          <View style={[cardStyle, { backgroundColor: '#ffebee' }]}>
            <Text style={[headerStyle, { color: '#c62828' }]}>Errors</Text>
            {diagnostics.errors.map((error, index) => (
              <Text key={index} style={[textStyle, { color: '#c62828' }]}>{error}</Text>
            ))}
          </View>
        )}

        <TouchableOpacity 
          style={[buttonStyle, { backgroundColor: colors.primary, marginTop: 16 }]}
          onPress={runDiagnostics}
        >
          <Text style={buttonTextStyle}>Run Diagnostics Again</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
};

const cardStyle = {
  backgroundColor: '#fff',
  borderRadius: 8,
  padding: 16,
  marginBottom: 16,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3
};

const headerStyle = {
  fontSize: 18,
  fontWeight: '600',
  marginBottom: 12,
  color: '#333'
};

const textStyle = {
  fontSize: 14,
  color: '#666',
  marginBottom: 4,
  lineHeight: 20
};

const buttonStyle = {
  backgroundColor: '#27ae60',
  padding: 8,
  borderRadius: 6,
  alignItems: 'center',
  flex: 1
};

const buttonTextStyle = {
  color: 'white',
  fontWeight: '600',
  fontSize: 12
};

export default DiagnosticPage;
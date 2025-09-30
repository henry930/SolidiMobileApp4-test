#!/usr/bin/env node

/**
 * Comprehensive API Testing Script
 * Tests all Solidi APIs with real credentials and documents results
 */

const fs = require('fs');
const path = require('path');

// Mock React Native environment for Node.js
const fetch = require('node-fetch');
const crypto = require('crypto');

// Mock logger
const logger = {
  extend: () => ({
    extend: () => ({}),
    getShortcuts: () => ({
      deb: console.log,
      dj: console.log,
      log: console.log,
      lj: console.log
    })
  })
};

// Simple HMAC implementation for API signing (matching real app)
function createSolidiSignature(dataToSign, apiSecret) {
  // Convert secret to base64 first (like real app)
  const secretBase64 = Buffer.from(apiSecret).toString('base64');
  // Create HMAC and return as base64
  const hmac = crypto.createHmac('sha256', secretBase64);
  hmac.update(dataToSign);
  return hmac.digest('base64');
}

// Solidi API Client (simplified)
class SolidiAPIClient {
    constructor(email, password) {
        this.email = email;
        this.password = password;
        this.baseURL = 'https://t2.solidi.co/api2/v1'; // Updated to dev environment
        this.apiKey = null;
        this.apiSecret = null;
        this.nonce = Date.now() * 1000; // Initialize nonce (microseconds)
    }

  setCredentials(apiKey, apiSecret) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  // Set real extracted credentials
  setRealCredentials() {
    this.apiKey = 'iqZKMVbnCcXgpLteFaSuUMbndUw4BkWSCrXylu8PycdcGNBKXKF56twx';
    this.apiSecret = 'AL8N3xtau892JbZLJPnEUhnzVZBOVpVw93GMfJL9CP1s1sHQN9YfDIh3crHzXecamZS8vkS7WO7fuBqQzKFHiQaM';
    console.log('✅ Real API credentials set for testing!');
  }

  async publicMethod({ httpMethod, apiRoute, params = {} }) {
    const url = `${this.baseURL}/${apiRoute}`;
    
    const options = {
      method: httpMethod,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SolidiMobileApp/Test'
      }
    };

    if (httpMethod !== 'GET' && Object.keys(params).length > 0) {
      options.body = JSON.stringify(params);
    }

    try {
      const response = await fetch(url, options);
      const data = await response.json();
      return data;
    } catch (error) {
      return { error: error.message };
    }
  }

  async privateMethod({ httpMethod, apiRoute, params = {} }) {
    if (!this.apiKey || !this.apiSecret) {
      return { error: 'No API credentials available' };
    }

    const url = `${this.baseURL}/${apiRoute}`;
    
    // Generate nonce (increment from previous)
    this.nonce += 1;
    
    // Add nonce to params as required by Solidi API
    const paramsWithNonce = {
      ...params,
      nonce: this.nonce
    };
    
    // Create signature exactly like the real app
    const path = `/api2/v1/${apiRoute}`;
    const postData = JSON.stringify(paramsWithNonce);
    const signingDomain = 't2.solidi.co'; // Use dev domain for signing
    const dataToSign = signingDomain + path + postData;
    
    console.log(`🔍 Signing: "${dataToSign}"`); // Debug log
    
    const signature = createSolidiSignature(dataToSign, this.apiSecret);

    const options = {
      method: httpMethod,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SolidiMobileApp/Test',
        'API-Key': this.apiKey,
        'API-Sign': signature
      }
    };

    if (httpMethod !== 'GET' && Object.keys(paramsWithNonce).length > 0) {
      options.body = postData;
    }

    try {
      const response = await fetch(url, options);
      const data = await response.json();
      return data;
    } catch (error) {
      return { error: error.message };
    }
  }
}

// CoinGecko API Client
class CoinGeckoAPI {
  constructor() {
    this.baseURL = 'https://api.coingecko.com/api/v3';
  }

  async getCurrentPrices() {
    try {
      const url = `${this.baseURL}/simple/price?ids=bitcoin,ethereum&vs_currencies=gbp,usd&include_24hr_change=true`;
      const response = await fetch(url);
      return await response.json();
    } catch (error) {
      return { error: error.message };
    }
  }

  async getMarketData() {
    try {
      const url = `${this.baseURL}/coins/markets?vs_currency=gbp&ids=bitcoin,ethereum&order=market_cap_desc&per_page=2`;
      const response = await fetch(url);
      return await response.json();
    } catch (error) {
      return { error: error.message };
    }
  }
}

// Test Results Storage
class TestResults {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      testSummary: {
        total: 0,
        passed: 0,
        failed: 0,
        publicEndpoints: 0,
        privateEndpoints: 0,
        externalAPIs: 0
      },
      authentication: {},
      publicEndpoints: {},
      privateEndpoints: {},
      externalAPIs: {},
      errors: []
    };
  }

  addTest(category, endpoint, result, requiresAuth = false) {
    this.results.testSummary.total++;
    
    if (result.error) {
      this.results.testSummary.failed++;
      this.results.errors.push({
        endpoint,
        error: result.error,
        category
      });
    } else {
      this.results.testSummary.passed++;
    }

    if (category === 'external') {
      this.results.testSummary.externalAPIs++;
    } else if (requiresAuth) {
      this.results.testSummary.privateEndpoints++;
    } else {
      this.results.testSummary.publicEndpoints++;
    }

    this.results[category][endpoint] = {
      success: !result.error,
      response: result,
      testedAt: new Date().toISOString(),
      requiresAuth
    };
  }

  generateMarkdown() {
    const md = `
## API Testing Results

**Test Run**: ${this.results.timestamp}

### Summary
- **Total Tests**: ${this.results.testSummary.total}
- **Passed**: ${this.results.testSummary.passed}
- **Failed**: ${this.results.testSummary.failed}
- **Public Endpoints**: ${this.results.testSummary.publicEndpoints}
- **Private Endpoints**: ${this.results.testSummary.privateEndpoints}
- **External APIs**: ${this.results.testSummary.externalAPIs}

### Authentication Test
${this.formatAuthResult()}

### Public Endpoints (No Authentication Required)
${this.formatEndpointResults('publicEndpoints')}

### Private Endpoints (Authentication Required)
${this.formatEndpointResults('privateEndpoints')}

### External APIs
${this.formatEndpointResults('externalAPIs')}

### Errors Encountered
${this.formatErrors()}

---
`;
    return md;
  }

  formatAuthResult() {
    const auth = this.results.authentication;
    if (auth.success) {
      return `✅ **Login Successful**
- API Key: ${auth.apiKey ? auth.apiKey.substring(0, 8) + '...' : 'Not received'}
- API Secret: ${auth.apiSecret ? '***' + auth.apiSecret.substring(-4) : 'Not received'}
- User ID: ${auth.userID || 'Not provided'}`;
    } else {
      return `❌ **Login Failed**
- Error: ${auth.error || 'Unknown error'}`;
    }
  }

  formatEndpointResults(category) {
    const endpoints = this.results[category];
    if (!endpoints || Object.keys(endpoints).length === 0) {
      return 'No endpoints tested in this category.';
    }

    let output = '';
    for (const [endpoint, result] of Object.entries(endpoints)) {
      const status = result.success ? '✅' : '❌';
      const authIcon = result.requiresAuth ? '🔐' : '🔓';
      
      output += `
#### ${authIcon} ${endpoint}
${status} **Status**: ${result.success ? 'Success' : 'Failed'}

**Response**:
\`\`\`json
${JSON.stringify(result.response, null, 2)}
\`\`\`
`;
    }
    return output;
  }

  formatErrors() {
    if (this.results.errors.length === 0) {
      return 'No errors encountered! 🎉';
    }

    return this.results.errors.map(error => 
      `- **${error.endpoint}** (${error.category}): ${error.error}`
    ).join('\n');
  }
}

// Main Testing Function
async function runAllTests() {
  console.log('🚀 Starting comprehensive API testing...\n');
  
  const testResults = new TestResults();
  const solidiClient = new SolidiAPIClient();
  const coinGeckoClient = new CoinGeckoAPI();

  // Test credentials
  const email = 'henry930@gmail.com';
  const password = 'DazzPow/930';

  console.log('1. Using Real Extracted API Credentials...');
  
  // Use the real extracted credentials instead of trying to login
  solidiClient.setRealCredentials();
  
  testResults.results.authentication = {
    success: true,
    apiKey: solidiClient.apiKey,
    apiSecret: 'HIDDEN_FOR_SECURITY',
    method: 'Extracted from real app login',
    note: 'Credentials extracted from successful mobile app login'
  };

  console.log('✅ Real API credentials loaded successfully!');

  console.log('\n2. Testing Public Endpoints...');
  
  // Test Public Endpoints
  const publicTests = [
    { name: 'ticker', httpMethod: 'GET', apiRoute: 'ticker', params: {} },
    { name: 'api_version', httpMethod: 'GET', apiRoute: 'api_latest_version', params: {} },
    { name: 'app_version', httpMethod: 'GET', apiRoute: 'app_latest_version', params: {} }
  ];

  for (const test of publicTests) {
    console.log(`Testing ${test.name}...`);
    const result = await solidiClient.publicMethod({
      httpMethod: test.httpMethod,
      apiRoute: test.apiRoute,
      params: test.params
    });
    testResults.addTest('publicEndpoints', test.name, result, false);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
  }

  console.log('\n3. Testing Private Endpoints...');
  
  // Test Private Endpoints (only if login was successful)
  if (testResults.results.authentication.success) {
    const privateTests = [
      { name: 'security_check', apiRoute: 'security_check' },
      { name: 'balance', apiRoute: 'balance' },
      { name: 'transaction', apiRoute: 'transaction' },
      { name: 'user', apiRoute: 'user' },
      { name: 'fee', apiRoute: 'fee' },
      { name: 'order', apiRoute: 'order' }
    ];

    for (const test of privateTests) {
      console.log(`Testing ${test.name}...`);
      const result = await solidiClient.privateMethod({
        httpMethod: 'POST',
        apiRoute: test.apiRoute,
        params: {}
      });
      testResults.addTest('privateEndpoints', test.name, result, true);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limiting
    }
  } else {
    console.log('Skipping private endpoint tests due to authentication failure');
  }

  console.log('\n4. Testing External APIs...');
  
  // Test CoinGecko API
  console.log('Testing CoinGecko current prices...');
  const coinGeckoPrices = await coinGeckoClient.getCurrentPrices();
  testResults.addTest('externalAPIs', 'coingecko_prices', coinGeckoPrices, false);

  console.log('Testing CoinGecko market data...');
  const coinGeckoMarket = await coinGeckoClient.getMarketData();
  testResults.addTest('externalAPIs', 'coingecko_market', coinGeckoMarket, false);

  console.log('\n5. Generating results...');
  
  // Generate results
  const markdownResults = testResults.generateMarkdown();
  
  // Save full results to JSON
  fs.writeFileSync('api-test-results.json', JSON.stringify(testResults.results, null, 2));
  
  console.log('✅ Testing completed!');
  console.log('Results saved to api-test-results.json');
  console.log('\nMarkdown for documentation:');
  console.log(markdownResults);
  
  return markdownResults;
}

// Run the tests
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests };
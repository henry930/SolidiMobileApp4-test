#!/usr/bin/env node

// Test script to verify the fee API is working
const https = require('https');
const crypto = require('crypto');

// Test credentials from API_DOCUMENTATION.md
const apiKey = 'your_api_key_here';
const apiSecret = 'your_api_secret_here';

// Create HMAC signature
function createSignature(path, postData, nonce) {
  const message = path + crypto.createHash('sha256').update(nonce + postData).digest();
  return crypto.createHmac('sha512', Buffer.from(apiSecret, 'base64')).update(message).digest('base64');
}

async function testFeeAPI() {
  console.log('🧪 Testing Fee API...');
  
  const nonce = Date.now() * 1000000; // Microsecond timestamp
  const path = '/api2/v1/fee';
  const postData = JSON.stringify({ nonce });
  
  const signature = createSignature(path, postData, nonce);
  
  const options = {
    hostname: 't2.solidi.co',
    port: 443,
    path: path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'API-Key': apiKey,
      'API-Sign': signature,
      'User-Agent': 'SolidiMobileApp4/1.2.0 (Build 33)',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('📡 Response Status:', res.statusCode);
        console.log('📡 Response Headers:', res.headers);
        console.log('📡 Raw Response:', data);
        
        try {
          const jsonResponse = JSON.parse(data);
          console.log('📊 Parsed Response:', JSON.stringify(jsonResponse, null, 2));
          resolve(jsonResponse);
        } catch (error) {
          console.log('❌ JSON Parse Error:', error.message);
          resolve({ error: 'Invalid JSON', raw: data });
        }
      });
    });

    req.on('error', (error) => {
      console.log('❌ Request Error:', error.message);
      reject(error);
    });

    console.log('📤 Sending request to:', `https://t2.solidi.co${path}`);
    console.log('📤 Request data:', postData);
    console.log('📤 Headers:', JSON.stringify(options.headers, null, 2));
    
    req.write(postData);
    req.end();
  });
}

// Test without credentials first (should get auth error)
async function testFeeAPIWithoutAuth() {
  console.log('🧪 Testing Fee API without authentication...');
  
  const postData = JSON.stringify({});
  
  const options = {
    hostname: 't2.solidi.co',
    port: 443,
    path: '/api2/v1/fee',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'SolidiMobileApp4/1.2.0 (Build 33)',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('📡 Status (no auth):', res.statusCode);
        console.log('📡 Response (no auth):', data);
        resolve(data);
      });
    });

    req.on('error', (error) => {
      console.log('❌ Request Error (no auth):', error.message);
      resolve(null);
    });

    req.write(postData);
    req.end();
  });
}

// Run tests
async function runTests() {
  console.log('=== FEE API TEST ===\n');
  
  // Test 1: Without authentication
  await testFeeAPIWithoutAuth();
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test 2: With authentication (if you have credentials)
  if (apiKey !== 'your_api_key_here' && apiSecret !== 'your_api_secret_here') {
    await testFeeAPI();
  } else {
    console.log('⚠️ Skipping authenticated test - please add real API credentials');
    console.log('⚠️ Update apiKey and apiSecret variables in this file');
  }
  
  console.log('\n=== TEST COMPLETE ===');
}

runTests().catch(console.error);
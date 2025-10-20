#!/usr/bin/env node
/**
 * JSON Form Upload Test Script
 * Tests the form submission API endpoints directly
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { Buffer } from 'buffer';

// Configuration
const API_BASE = process.env.API_BASE || 'https://api.solidi.app';
const API_TOKEN = process.env.API_TOKEN; // You'll need to provide this

console.log('🧪 Starting JSON Form Upload Test...');
console.log('📡 API Base URL:', API_BASE);

/**
 * Test 1: Test form submission via private_upload endpoint
 */
async function testFormUpload() {
  console.log('\n' + '='.repeat(60));
  console.log('📋 TEST 1: Form Upload via /private_upload');
  console.log('='.repeat(60));
  
  try {
    // Create test form data
    const testForm = {
      formTitle: "Test Form Submission",
      formId: "test-form-" + Date.now(),
      uuid: `test-uuid-${Date.now()}`,
      submittedAt: new Date().toISOString(),
      answers: {
        name: "Test User",
        email: "test@example.com",
        feedback: "This is a test submission"
      },
      debugInfo: {
        testRun: true,
        timestamp: Date.now(),
        userAgent: "Node.js Test Script"
      }
    };
    
    // Convert to base64 (same as mobile app)
    const jsonString = JSON.stringify(testForm, null, 2);
    const base64Data = Buffer.from(jsonString, 'utf-8').toString('base64');
    
    console.log('📄 Test form JSON length:', jsonString.length, 'characters');
    console.log('📦 Base64 encoded length:', base64Data.length, 'characters');
    console.log('📋 Form preview:', jsonString.substring(0, 200) + '...');
    
    // Prepare API request
    const apiUrl = `${API_BASE}/private_upload/document/categorisation`;
    const requestBody = {
      documentType: 'categorisation',
      documentCategory: 'categorisation', 
      fileData: base64Data,
      fileExtension: '.json'
    };
    
    console.log('\n📡 Making API request...');
    console.log('🔗 URL:', apiUrl);
    console.log('📋 Request body keys:', Object.keys(requestBody));
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(API_TOKEN ? { 'Authorization': `Bearer ${API_TOKEN}` } : {})
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('\n📊 Response received:');
    console.log('📡 Status:', response.status, response.statusText);
    console.log('📡 Headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('📄 Response body (first 500 chars):', responseText.substring(0, 500));
    
    if (response.ok) {
      try {
        const responseData = JSON.parse(responseText);
        console.log('✅ SUCCESS: Form uploaded successfully');
        console.log('📋 Server response:', JSON.stringify(responseData, null, 2));
        return { success: true, data: responseData };
      } catch (parseError) {
        console.log('✅ SUCCESS: Upload completed (response not JSON)');
        return { success: true, data: responseText };
      }
    } else {
      console.log('❌ FAILED: Upload request failed');
      return { success: false, error: responseText, status: response.status };
    }
    
  } catch (error) {
    console.error('❌ ERROR: Exception during upload test:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test 2: Test form submission via API endpoint (if form has submiturl)
 */
async function testAPISubmission() {
  console.log('\n' + '='.repeat(60));
  console.log('📋 TEST 2: Direct API Submission (submiturl)');
  console.log('='.repeat(60));
  
  try {
    const submissionData = {
      formId: "test-api-form",
      uuid: `api-test-${Date.now()}`,
      answers: {
        question1: "Test answer 1",
        question2: "Test answer 2",
        rating: 5
      },
      submittedAt: new Date().toISOString()
    };
    
    // Test different possible API endpoints
    const testEndpoints = [
      '/api/questionnaires/submit',
      '/api/forms/submit', 
      '/api/mock/submit',
      '/user/extra_information/submit'
    ];
    
    for (const endpoint of testEndpoints) {
      console.log(`\n🔗 Testing endpoint: ${endpoint}`);
      
      try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(API_TOKEN ? { 'Authorization': `Bearer ${API_TOKEN}` } : {})
          },
          body: JSON.stringify(submissionData)
        });
        
        console.log('📊 Status:', response.status, response.statusText);
        
        if (response.ok) {
          const result = await response.text();
          console.log('✅ Endpoint available:', endpoint);
          console.log('📄 Response:', result.substring(0, 200));
        } else {
          console.log('⚠️ Endpoint returned error:', response.status);
        }
        
      } catch (endpointError) {
        console.log('❌ Endpoint unavailable:', endpoint, '-', endpointError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ ERROR: Exception during API submission test:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test 3: Check existing form JSON files
 */
async function checkFormFiles() {
  console.log('\n' + '='.repeat(60));
  console.log('📋 TEST 3: Check Existing Form JSON Files');
  console.log('='.repeat(60));
  
  const jsonDir = '/Users/henry/Solidi/SolidiMobileApp4/json';
  
  try {
    const files = fs.readdirSync(jsonDir).filter(f => f.endsWith('.json'));
    console.log('📁 Found JSON files:', files.length);
    
    files.forEach(file => {
      const filePath = path.join(jsonDir, file);
      const stats = fs.statSync(filePath);
      console.log(`📄 ${file} (${stats.size} bytes)`);
      
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(content);
        console.log(`   - Valid JSON ✅`);
        console.log(`   - Keys: ${Object.keys(parsed).slice(0, 5).join(', ')}${Object.keys(parsed).length > 5 ? '...' : ''}`);
      } catch (parseError) {
        console.log(`   - Invalid JSON ❌: ${parseError.message}`);
      }
    });
    
    return { success: true, files: files };
    
  } catch (error) {
    console.error('❌ ERROR: Could not check form files:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Main test execution
 */
async function runTests() {
  console.log('🚀 JSON Form Submission Test Suite');
  console.log('📅 Started at:', new Date().toISOString());
  
  const results = {
    formUpload: await testFormUpload(),
    apiSubmission: await testAPISubmission(), 
    formFiles: await checkFormFiles()
  };
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(80));
  console.log('📋 Form Upload Test:', results.formUpload.success ? '✅ PASS' : '❌ FAIL');
  console.log('📋 API Submission Test:', results.apiSubmission.success ? '✅ PASS' : '❌ FAIL');
  console.log('📋 Form Files Check:', results.formFiles.success ? '✅ PASS' : '❌ FAIL');
  
  if (!results.formUpload.success) {
    console.log('❌ Form Upload Error:', results.formUpload.error);
  }
  if (!results.apiSubmission.success) {
    console.log('❌ API Submission Error:', results.apiSubmission.error);
  }
  if (!results.formFiles.success) {
    console.log('❌ Form Files Error:', results.formFiles.error);
  }
  
  console.log('\n📝 NOTES:');
  console.log('  - Form upload tests the /private_upload endpoint used by mobile app');
  console.log('  - API submission tests direct form submission endpoints');
  console.log('  - These tests require valid API credentials for full validation');
  console.log('  - Check server logs for detailed processing information');
  
  return results;
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests()
    .then(() => {
      console.log('\n✅ Test suite completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    });
}

export { testFormUpload, testAPISubmission, checkFormFiles, runTests };
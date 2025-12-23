#!/usr/bin/env node
/**
 * Script to check user profile and status via API
 * 
 * This script will retrieve and display the complete user profile for henry930+200@gmail.com
 * including cat (categorization) and appropriate (suitability) status
 * 
 * Usage:
 *   node check-user-status.js <api_key> <api_secret>
 * 
 * Or for interactive login:
 *   node check-user-status.js
 */

const https = require('https');

const email = 'henry930+200@gmail.com';
const apiKey = process.argv[2];
const apiSecret = process.argv[3];

console.log('=====================================');
console.log('USER PROFILE AND STATUS CHECK');
console.log('=====================================');
console.log('Email:', email);
console.log('\n');

if (!apiKey || !apiSecret) {
  console.log('❌ API credentials not provided');
  console.log('\n');
  console.log('OPTION 1: Login via App (EASIEST)');
  console.log('==================================');
  console.log('1. Build and run the app');
  console.log('2. Login with henry930+200@gmail.com');
  console.log('3. Open Chrome DevTools (cmd+d → Debug)');
  console.log('4. Watch the console for:');
  console.log('   "👤 ===== COMPLETE USER OBJECT AFTER LOGIN ====="');
  console.log('   "🏷️  CAT: ..."');
  console.log('   "✅ APPROPRIATE: ..."');
  console.log('   "🔍 COMPLETE USER DATA JSON: {...}"');
  console.log('\n');
  console.log('5. Also watch for checkUserStatusRedirect logs:');
  console.log('   "[REG-CHECK] ===== checkUserStatusRedirect CALLED ====="');
  console.log('   "🏷️  CAT: ..."');
  console.log('   "✅ APPROPRIATE: ..."');
  console.log('\n');
  console.log('WHAT TO LOOK FOR:');
  console.log('-----------------');
  console.log('✅ User needs evaluation if:');
  console.log('   - cat: null/undefined/0 (needs categorization)');
  console.log('   OR');
  console.log('   - appropriate: "TBD"/null/undefined (needs suitability)');
  console.log('   OR');
  console.log('   - appropriate: "FAILED1" (can retry)');
  console.log('   OR');
  console.log('   - appropriate: "FAILED2" (24hr cooldown)');
  console.log('\n');
  console.log('✅ User is complete if:');
  console.log('   - appropriate: "PASS" or "PASSED" or 1');
  console.log('   AND');
  console.log('   - cat: 1 (or appropriate is PASS/PASSED regardless of cat)');
  console.log('\n');
  console.log('EXPECTED BEHAVIOR:');
  console.log('------------------');
  console.log('If user needs evaluation:');
  console.log('  → Redirected to RegistrationCompletion');
  console.log('  → Footer hidden');
  console.log('  → Notification bell hidden');
  console.log('  → Back button hidden');
  console.log('  → User must complete evaluation before accessing app');
  console.log('\n');
  console.log('=====================================');
  console.log('\n');
  console.log('OPTION 2: Use API Directly');
  console.log('==========================');
  console.log('If you have API credentials, run:');
  console.log('  node check-user-status.js <api_key> <api_secret>');
  console.log('\n');
  console.log('Or use curl commands:');
  console.log('\n');
  console.log('# Get user info');
  console.log('curl -X GET "https://api.solidifx.com/v1/user" \\');
  console.log('  -H "X-API-Key: YOUR_KEY" \\');
  console.log('  -H "X-API-Secret: YOUR_SECRET" | jq \'.cat, .appropriate\'');
  console.log('\n');
  console.log('# Get user status');
  console.log('curl -X GET "https://api.solidifx.com/v1/user_status" \\');
  console.log('  -H "X-API-Key: YOUR_KEY" \\');
  console.log('  -H "X-API-Secret: YOUR_SECRET"');
  console.log('\n');
  console.log('=====================================');
  process.exit(0);
}

console.log('🔑 Using provided API credentials');
console.log('Fetching user info...\n');

// Fetch user info
const getUserInfo = () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.solidifx.com',
      port: 443,
      path: '/v1/user',
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
        'X-API-Secret': apiSecret
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
};

// Fetch user status
const getUserStatus = () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.solidifx.com',
      port: 443,
      path: '/v1/user_status',
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
        'X-API-Secret': apiSecret
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
};

// Main execution
(async () => {
  try {
    const [userInfo, userStatus] = await Promise.all([getUserInfo(), getUserStatus()]);

    console.log('📧 EMAIL:', userInfo.email);
    console.log('🆔 UUID:', userInfo.uuid);
    console.log('👤 NAME:', `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim());
    console.log('\n');
    console.log('🎯 REGISTRATION STATUS:');
    console.log('========================');
    console.log('🏷️  CAT (Categorization):', userInfo.cat, '(type:', typeof userInfo.cat + ')');
    console.log('✅ APPROPRIATE (Suitability):', userInfo.appropriate, '(type:', typeof userInfo.appropriate + ')');
    console.log('\n');

    // Determine status
    const cat = userInfo.cat;
    const appropriate = userInfo.appropriate;
    
    let needsEvaluation = false;
    let reason = [];

    if (cat === null || cat === undefined || cat === 0) {
      needsEvaluation = true;
      reason.push('Cat is null/undefined/0 - needs categorization');
    }

    if (appropriate !== 'PASS' && appropriate !== 'PASSED' && appropriate !== 1) {
      if (appropriate === 'TBD' || appropriate === null || appropriate === undefined) {
        needsEvaluation = true;
        reason.push('Appropriate is TBD/null/undefined - needs suitability assessment');
      } else if (appropriate === 'FAILED1') {
        needsEvaluation = true;
        reason.push('Appropriate is FAILED1 - can retry suitability test');
      } else if (appropriate === 'FAILED2') {
        needsEvaluation = true;
        reason.push('Appropriate is FAILED2 - must wait 24 hours');
        if (userInfo.coolend) {
          reason.push(`  Cooldown ends: ${new Date(userInfo.coolend * 1000).toLocaleString()}`);
        }
      }
    }

    console.log('🚦 STATUS:', needsEvaluation ? '❌ NEEDS EVALUATION' : '✅ COMPLETE');
    console.log('\n');

    if (needsEvaluation) {
      console.log('⚠️  REASONS:');
      reason.forEach(r => console.log('   -', r));
      console.log('\n');
      console.log('📱 EXPECTED APP BEHAVIOR:');
      console.log('   → User will be redirected to RegistrationCompletion');
      console.log('   → Footer will be hidden');
      console.log('   → Notification bell will be hidden');
      console.log('   → Back button will be hidden');
      console.log('   → User must complete evaluation before accessing app');
    } else {
      console.log('✅ User has completed all evaluations');
      console.log('✅ User can access the app normally');
    }

    console.log('\n');
    console.log('📊 USER STATUS FLAGS:');
    console.log('=====================');
    console.log(JSON.stringify(userStatus, null, 2));

    console.log('\n');
    console.log('📋 FULL USER PROFILE:');
    console.log('=====================');
    console.log(JSON.stringify(userInfo, null, 2));

    console.log('\n');
    console.log('=====================================');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\n');
    console.error('Try logging in via the app instead to see console logs.');
  }
})();

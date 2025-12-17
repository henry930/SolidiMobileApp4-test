/**
 * Test script to check /currency and /ticker API responses
 */

const crypto = require('crypto');

const API_KEY = 'VTGFhoDBmDFFqYzxGWJNWRCAObZmLTTVIQ7qoj1SjhGY4Eu8IQJQhP6k';
const API_SECRET = 'B9sG03V9kw3uOubT5yMjPC7yLMEBMBiyoRXumYrF7TTRlrYEUZOBxN0xyBLXKpzYmrN7qwWT5cnskcMmH6jOgFDk';
const DOMAIN = 't2.solidi.co';

function generateSignature(nonce, apiRoute, params) {
  const message = nonce + apiRoute + JSON.stringify(params);
  const hmac = crypto.createHmac('sha256', API_SECRET);
  hmac.update(message);
  return hmac.digest('base64');
}

async function callPrivateAPI(apiRoute) {
  const nonce = Date.now() * 1000000; // microseconds
  const params = {};
  const signature = generateSignature(nonce, apiRoute, params);
  
  const url = `https://${DOMAIN}/api2/v1/${apiRoute}`;
  const body = JSON.stringify({ nonce, ...params });
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🌐 Calling API: ${apiRoute}`);
  console.log(`📡 URL: ${url}`);
  console.log(`📦 Body: ${body}`);
  console.log(`🔐 Signature: ${signature}`);
  console.log('='.repeat(80));
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': 'Basic ZGV2OiA=',
        'API-Key': API_KEY,
        'API-Sign': signature,
        'User-Agent': 'Solidi Test Script'
      },
      body: body
    });
    
    console.log(`\n📊 Response Status: ${response.status} ${response.statusText}`);
    
    const data = await response.json();
    console.log(`\n📄 Response JSON:`);
    console.log(JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    console.error(`\n❌ Error calling ${apiRoute}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('\n\n');
  console.log('🔍'.repeat(40));
  console.log('     TESTING /currency AND /ticker APIs');
  console.log('🔍'.repeat(40));
  
  // Test /currency
  const currencyData = await callPrivateAPI('currency');
  
  // Test /ticker
  const tickerData = await callPrivateAPI('ticker');
  
  console.log('\n\n');
  console.log('📋'.repeat(40));
  console.log('                    SUMMARY');
  console.log('📋'.repeat(40));
  
  if (currencyData) {
    console.log('\n✅ /currency response:');
    console.log('   Error:', currencyData.error || 'null');
    console.log('   Data type:', Array.isArray(currencyData.data) ? 'Array' : typeof currencyData.data);
    if (Array.isArray(currencyData.data)) {
      console.log('   Number of currencies:', currencyData.data.length);
      console.log('   Currencies:', currencyData.data);
    } else {
      console.log('   Data:', currencyData.data);
    }
  } else {
    console.log('\n❌ /currency FAILED');
  }
  
  if (tickerData) {
    console.log('\n✅ /ticker response:');
    console.log('   Error:', tickerData.error || 'null');
    console.log('   Data type:', typeof tickerData.data);
    if (tickerData.data && typeof tickerData.data === 'object') {
      console.log('   Number of markets:', Object.keys(tickerData.data).length);
      console.log('   Markets:', Object.keys(tickerData.data));
      
      // Show details for each market
      Object.keys(tickerData.data).forEach(market => {
        const marketData = tickerData.data[market];
        console.log(`\n   ${market}:`);
        console.log(`     - bid: ${marketData.bid}`);
        console.log(`     - ask: ${marketData.ask}`);
        console.log(`     - price: ${marketData.price || '(not set)'}`);
        console.log(`     - error: ${marketData.error || '(none)'}`);
        if (marketData.bid && marketData.ask) {
          const avgPrice = ((parseFloat(marketData.bid) + parseFloat(marketData.ask)) / 2).toFixed(2);
          console.log(`     - calculated avg: £${avgPrice}`);
        }
      });
    } else {
      console.log('   Data:', tickerData.data);
    }
  } else {
    console.log('\n❌ /ticker FAILED');
  }
  
  console.log('\n' + '📋'.repeat(40) + '\n\n');
}

main();

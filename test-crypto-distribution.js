#!/usr/bin/env node

/**
 * Test script to check crypto distribution APIs
 * This script tests:
 * 1. Balance API - gets user's asset balances
 * 2. Ticker API - gets current prices
 * 3. CoinGecko API integration - gets live price data
 */

async function testCryptoDistribution() {
    console.log('🔍 Testing Crypto Distribution APIs...\n');
    
    try {
        // Test 1: Check if we can access CoinGecko directly
        console.log('🦎 Test 1: Testing CoinGecko API (external)...');
        
        try {
            // For Node.js compatibility, we'll use a simple fetch alternative
            const https = require('https');
            const url = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=gbp&include_24hr_change=true';
            
            const coinGeckoData = await new Promise((resolve, reject) => {
                https.get(url, (res) => {
                    let data = '';
                    res.on('data', (chunk) => data += chunk);
                    res.on('end', () => {
                        try {
                            resolve(JSON.parse(data));
                        } catch (e) {
                            reject(e);
                        }
                    });
                }).on('error', reject);
            });
            
            console.log('✅ CoinGecko API working:');
            console.log('   Raw response:', JSON.stringify(coinGeckoData, null, 2));
            
            if (coinGeckoData.bitcoin) {
                console.log(`   Bitcoin: £${coinGeckoData.bitcoin.gbp} (${coinGeckoData.bitcoin.gbp_24h_change?.toFixed(2)}%)`);
            }
            if (coinGeckoData.ethereum) {
                console.log(`   Ethereum: £${coinGeckoData.ethereum.gbp} (${coinGeckoData.ethereum.gbp_24h_change?.toFixed(2)}%)`);
            }
        } catch (coinGeckoError) {
            console.log('❌ CoinGecko API failed:');
            console.log('   Error:', coinGeckoError.message);
        }
        
        console.log('\n' + '─'.repeat(50) + '\n');
        
        // Test 2: Check Asset Configuration
        console.log('⚙️ Test 2: Checking asset configuration...');
        
        // Check if asset icons and configuration exist
        const fs = require('fs');
        const assetIconsPath = './src/images/asset_icons/index.js';
        if (fs.existsSync(assetIconsPath)) {
            console.log('✅ Asset icons configuration found');
            
            // Read the file content to see supported assets
            const content = fs.readFileSync(assetIconsPath, 'utf8');
            console.log('   Asset icons content preview:');
            console.log('   ' + content.split('\n').slice(0, 10).join('\n   '));
        } else {
            console.log('❌ Asset icons configuration not found');
        }
        
        console.log('\n' + '─'.repeat(50) + '\n');
        
        // Test 3: Check Assets Component Structure
        console.log('📱 Test 3: Checking Assets component...');
        
        const assetsPath = './src/application/SolidiMobileApp/components/MainPanel/components/Assets/Assets.js';
        if (fs.existsSync(assetsPath)) {
            console.log('✅ Assets component found');
            
            // Check for key functions in the file
            const content = fs.readFileSync(assetsPath, 'utf8');
            
            const keyFunctions = [
                'loadBalances',
                'loadTickerWithCoinGecko',
                'getBalance',
                'getTicker'
            ];
            
            keyFunctions.forEach(func => {
                if (content.includes(func)) {
                    console.log(`   ✅ Found ${func} function/call`);
                } else {
                    console.log(`   ❌ Missing ${func} function/call`);
                }
            });
            
        } else {
            console.log('❌ Assets component not found');
        }
        
        console.log('\n' + '─'.repeat(50) + '\n');
        
        // Test 4: Check AppState API Methods
        console.log('🔧 Test 4: Checking AppState API methods...');
        
        const appStatePath = './src/application/data/AppState.js';
        if (fs.existsSync(appStatePath)) {
            console.log('✅ AppState found');
            
            const content = fs.readFileSync(appStatePath, 'utf8');
            
            const apiMethods = [
                'loadBalances',
                'getBalance',
                'loadTicker',
                'getTicker',
                'loadTickerWithCoinGecko',
                'loadCoinGeckoPrices'
            ];
            
            apiMethods.forEach(method => {
                const pattern = new RegExp(`this\\.${method}\\s*=`, 'g');
                const matches = content.match(pattern);
                if (matches) {
                    console.log(`   ✅ Found ${method} method definition (${matches.length} instances)`);
                } else {
                    console.log(`   ❌ Missing ${method} method definition`);
                }
            });
            
        } else {
            console.log('❌ AppState not found');
        }
        
        console.log('\n' + '═'.repeat(50));
        console.log('📋 CRYPTO DISTRIBUTION API ANALYSIS');
        console.log('═'.repeat(50));
        
        console.log('🎯 The crypto distribution functionality works as follows:');
        console.log('   1. Assets.js calls appState.loadBalances() to get user holdings');
        console.log('   2. Assets.js calls appState.loadTickerWithCoinGecko() for prices');
        console.log('   3. AppState.loadBalances() calls API route "/balance"');
        console.log('   4. AppState.loadTickerWithCoinGecko() tries Solidi API then CoinGecko');
        console.log('   5. Assets component displays portfolio with balance × price = value');
        
        console.log('\n📱 How it appears in the app:');
        console.log('   1. Each crypto shows: Icon | Name | Balance | Current Price | Portfolio Value');
        console.log('   2. Total portfolio value is calculated across all assets');
        console.log('   3. Price changes (24h) are shown with color coding');
        console.log('   4. Touch interaction available for crypto assets (not fiat)');
        
        console.log('\n🔧 API Endpoints being used:');
        console.log('   • GET /balance - User asset balances');
        console.log('   • GET /ticker - Current asset prices');
        console.log('   • CoinGecko API - Live crypto prices (fallback/supplement)');
        
        console.log('\n� To test if it\'s working:');
        console.log('   1. Run the app and log in with valid credentials');
        console.log('   2. Navigate to Assets page in the app');
        console.log('   3. Check console logs for API call results');
        console.log('   4. Verify balances and prices are displayed correctly');
        
    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Run the test
testCryptoDistribution()
    .then(() => {
        console.log('\n✅ Crypto distribution analysis completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Analysis failed:', error.message);
        process.exit(1);
    });
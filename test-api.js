const https = require('https');
const http = require('http');

// Test both HTTP and HTTPS connections to t2.solidi.co
async function testAPI() {
  console.log('Testing t2.solidi.co API connection...\n');
  
  // Test HTTPS first
  console.log('1. Testing HTTPS connection...');
  try {
    const httpsOptions = {
      hostname: 't2.solidi.co',
      port: 443,
      path: '/api2/v1/hello',
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Node.js Test Client'
      },
      // Try with different SSL options
      secureProtocol: 'TLSv1_2_method',
      rejectUnauthorized: false // Allow self-signed certificates for testing
    };
    
    await new Promise((resolve, reject) => {
      const req = https.request(httpsOptions, (res) => {
        console.log(`HTTPS Status: ${res.statusCode}`);
        console.log(`HTTPS Headers:`, res.headers);
        
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          console.log('HTTPS Response:', data);
          resolve();
        });
      });
      
      req.on('error', (error) => {
        console.log('HTTPS Error:', error.message);
        resolve(); // Don't reject, continue to HTTP test
      });
      
      req.setTimeout(10000, () => {
        console.log('HTTPS request timed out');
        req.destroy();
        resolve();
      });
      
      req.end();
    });
  } catch (error) {
    console.log('HTTPS Test Error:', error.message);
  }
  
  console.log('\n2. Testing HTTP connection...');
  // Test HTTP as fallback
  try {
    const httpOptions = {
      hostname: 't2.solidi.co',
      port: 80,
      path: '/api2/v1/hello',
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Node.js Test Client'
      }
    };
    
    await new Promise((resolve, reject) => {
      const req = http.request(httpOptions, (res) => {
        console.log(`HTTP Status: ${res.statusCode}`);
        console.log(`HTTP Headers:`, res.headers);
        
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          console.log('HTTP Response:', data);
          resolve();
        });
      });
      
      req.on('error', (error) => {
        console.log('HTTP Error:', error.message);
        resolve();
      });
      
      req.setTimeout(10000, () => {
        console.log('HTTP request timed out');
        req.destroy();
        resolve();
      });
      
      req.end();
    });
  } catch (error) {
    console.log('HTTP Test Error:', error.message);
  }

  console.log('\n3. Testing login endpoint with HTTPS...');
  // Test login endpoint
  try {
    const loginData = JSON.stringify({
      password: 'testpassword',
      tfa: '',
      optionalParams: {
        origin: {
          clientType: 'mobile',
          os: 'ios',
          appVersion: '1.0.0',
          appBuildNumber: '1',
          appTier: 'dev'
        }
      },
      nonce: Date.now() * 1000
    });

    const loginOptions = {
      hostname: 't2.solidi.co',
      port: 443,
      path: '/api2/v1/login_mobile/test@example.com',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Content-Length': Buffer.byteLength(loginData),
        'User-Agent': 'Node.js Test Client'
      },
      secureProtocol: 'TLSv1_2_method',
      rejectUnauthorized: false
    };
    
    await new Promise((resolve, reject) => {
      const req = https.request(loginOptions, (res) => {
        console.log(`Login HTTPS Status: ${res.statusCode}`);
        
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          console.log('Login HTTPS Response:', data);
          resolve();
        });
      });
      
      req.on('error', (error) => {
        console.log('Login HTTPS Error:', error.message);
        resolve();
      });
      
      req.setTimeout(15000, () => {
        console.log('Login HTTPS request timed out');
        req.destroy();
        resolve();
      });
      
      req.write(loginData);
      req.end();
    });
  } catch (error) {
    console.log('Login Test Error:', error.message);
  }
}

testAPI().then(() => {
  console.log('\nAPI test complete');
}).catch(console.error);
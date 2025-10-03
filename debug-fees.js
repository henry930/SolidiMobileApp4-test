// Debug script to test fee API connectivity
async function debugFees() {
  console.log('=== FEE DEBUG TEST ===');
  
  try {
    // Test direct API call using fetch (same as the API)
    console.log('📡 Testing direct API call...');
    
    const response = await fetch('https://t2.solidi.co/v1/fee', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    console.log('✅ Raw API Response:', JSON.stringify(result, null, 2));
    
    if (result && result.data) {
      console.log('✅ Fee data structure:');
      Object.keys(result.data).forEach(asset => {
        if (result.data[asset].withdraw) {
          console.log(`  ${asset}:`, result.data[asset].withdraw);
        }
      });
    }
    
  } catch (error) {
    console.log('❌ API Error:', error.message);
  }
  
  console.log('=== DEBUG COMPLETE ===');
}

debugFees();
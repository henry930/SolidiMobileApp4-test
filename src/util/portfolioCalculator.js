/**
 * Portfolio Calculator - Pure function to calculate total portfolio value
 * 
 * This is a global utility function that calculates the total portfolio value
 * in GBP from fiat and crypto balances. It starts fresh each time (no caching)
 * to avoid accumulation errors.
 */

/**
 * Calculate total portfolio value in GBP
 * @param {Object} balanceData - Balance data structure { BTC: {total: X}, GBP: {total: Y}, ... }
 * @param {Object} appState - Application state with publicMethod for API calls
 * @returns {Promise<Object>} { total: number, fiatTotal: number, cryptoTotal: number, breakdown: Object }
 */
export const calculatePortfolioValue = async (balanceData, appState) => {
  console.log('📊 ===== PORTFOLIO CALCULATION START (PURE FUNCTION) =====');
  console.log('📊 Balance data received:', JSON.stringify(balanceData, null, 2));
  
  // Initialize fresh totals - IMPORTANT: Start from zero each time, no caching
  let freshFiatTotal = 0;
  let freshCryptoTotal = 0;
  const breakdown = {
    fiat: {},
    crypto: {}
  };
  
  try {
    // STEP 1: Calculate fiat balances (direct addition, no API needed)
    console.log('💷 Step 1: Calculating fiat balances...');
    const fiatCurrencies = ['GBP', 'EUR', 'USD'];
    
    for (let currency of fiatCurrencies) {
      if (balanceData[currency]) {
        let balance = parseFloat(balanceData[currency].total) || 0;
        console.log(`💷 ${currency}: raw balance = ${balance}`);
        
        if (balance > 0) {
          if (currency === 'GBP') {
            freshFiatTotal += balance;
            breakdown.fiat[currency] = balance;
            console.log(`💷 ${currency}: £${balance.toFixed(2)} ADDED to fiat total`);
            console.log(`💷 Running fiat total: £${freshFiatTotal.toFixed(2)}`);
          } else {
            // For other fiat currencies, we'd need exchange rates
            console.log(`💵 ${currency}: ${balance.toFixed(2)} (exchange rate needed - NOT ADDED)`);
            breakdown.fiat[currency] = 0; // Not converted yet
          }
        }
      }
    }
    
    console.log(`💷 ===== FIAT TOTAL: £${freshFiatTotal.toFixed(2)} =====`);
    
    // STEP 2: Calculate crypto values using best_volume_price API (parallel)
    console.log('₿ Step 2: Calculating crypto balances...');
    const cryptoCurrencies = ['BTC', 'ETH', 'LTC', 'XRP', 'BCH'];
    
    // Create promises for all crypto prices - fetch in parallel
    const cryptoPricePromises = cryptoCurrencies.map(async (currency) => {
      if (!balanceData[currency]) {
        console.log(`₿ ${currency}: No balance data, skipping`);
        return { currency, value: 0, balance: 0, price: 0 };
      }
      
      let balance = parseFloat(balanceData[currency].total) || 0;
      
      if (balance <= 0) {
        console.log(`₿ ${currency}: Zero balance, skipping`);
        return { currency, value: 0, balance: 0, price: 0 };
      }
      
      try {
        console.log(`₿ ${currency}: Fetching price (balance: ${balance})...`);
        
        // Use the same API as Assets page - get price for 100 GBP
        const response = await appState.publicMethod({
          httpMethod: 'GET',
          apiRoute: `best_volume_price/${currency}/GBP/BUY/quote/100`,
        });
        
        if (response && response.price) {
          const cryptoAmountReceived = parseFloat(response.price);
          if (cryptoAmountReceived > 0) {
            const pricePerUnit = 100 / cryptoAmountReceived;
            const gbpValue = balance * pricePerUnit;
            console.log(`₿ ${currency}: ${balance} × £${pricePerUnit.toFixed(2)} = £${gbpValue.toFixed(2)}`);
            return { currency, value: gbpValue, balance, price: pricePerUnit };
          } else {
            console.log(`⚠️ ${currency}: Invalid crypto amount received: ${cryptoAmountReceived}`);
            return { currency, value: 0, balance, price: 0 };
          }
        } else {
          console.log(`⚠️ ${currency}: No price data in response`);
          return { currency, value: 0, balance, price: 0 };
        }
      } catch (error) {
        console.log(`❌ ${currency}: Error fetching price:`, error);
        return { currency, value: 0, balance, price: 0 };
      }
    });
    
    // Wait for all crypto prices to be fetched
    const cryptoValues = await Promise.all(cryptoPricePromises);
    
    // Sum up crypto values - start fresh, no accumulation
    cryptoValues.forEach(({ currency, value, balance, price }) => {
      if (value > 0) {
        console.log(`₿ Adding ${currency}: £${value.toFixed(2)} to crypto total`);
        freshCryptoTotal += value;
        breakdown.crypto[currency] = {
          balance,
          pricePerUnit: price,
          gbpValue: value
        };
        console.log(`₿ Running crypto total: £${freshCryptoTotal.toFixed(2)}`);
      }
    });
    
    console.log(`₿ ===== CRYPTO TOTAL: £${freshCryptoTotal.toFixed(2)} =====`);
    
    // STEP 3: Calculate final total (fresh calculation, no accumulation)
    const finalTotal = freshFiatTotal + freshCryptoTotal;
    
    console.log(`💼 ===== FINAL PORTFOLIO CALCULATION =====`);
    console.log(`💼 Fiat (GBP): £${freshFiatTotal.toFixed(2)}`);
    console.log(`💼 Crypto (all): £${freshCryptoTotal.toFixed(2)}`);
    console.log(`💼 TOTAL: £${freshFiatTotal.toFixed(2)} + £${freshCryptoTotal.toFixed(2)} = £${finalTotal.toFixed(2)}`);
    console.log(`💼 Breakdown:`, breakdown);
    console.log(`💼 ===== END PORTFOLIO CALCULATION =====`);
    
    return {
      total: finalTotal,
      fiatTotal: freshFiatTotal,
      cryptoTotal: freshCryptoTotal,
      breakdown
    };
    
  } catch (error) {
    console.log('📊 Error calculating portfolio value:', error);
    return {
      total: 0,
      fiatTotal: 0,
      cryptoTotal: 0,
      breakdown,
      error: error.message
    };
  }
};

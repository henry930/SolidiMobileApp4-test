// CoinGecko API Service
// Free crypto data API - no API key required
// Documentation: https://www.coingecko.com/en/api/documentation

import logger from 'src/util/logger';
let logger2 = logger.extend('CoinGeckoAPI');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);

class CoinGeckoAPI {
  constructor() {
    this.baseURL = 'https://api.coingecko.com/api/v3';
    this.timeout = 10000; // 10 seconds timeout
  }

  // Helper method to make API calls with timeout
  async fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      log(`CoinGecko API error: ${error.message}`);
      throw error;
    }
  }

  // Get current prices for multiple cryptocurrencies
  async getCurrentPrices(coinIds = ['bitcoin', 'ethereum'], vsCurrencies = ['gbp', 'usd']) {
    try {
      const coinIdsStr = coinIds.join(',');
      const vsCurrenciesStr = vsCurrencies.join(',');
      const url = `${this.baseURL}/simple/price?ids=${coinIdsStr}&vs_currencies=${vsCurrenciesStr}&include_24hr_change=true&include_last_updated_at=true`;
      
      log(`Fetching prices for: ${coinIdsStr}`);
      const data = await this.fetchWithTimeout(url);
      
      return data;
    } catch (error) {
      log(`Error fetching current prices: ${error.message}`);
      return null;
    }
  }

  // Get market data with more details (price, market cap, volume, etc.)
  async getMarketData(vsCurrency = 'gbp', coinIds = ['bitcoin', 'ethereum'], limit = 10) {
    try {
      const coinIdsStr = coinIds.join(',');
      const url = `${this.baseURL}/coins/markets?vs_currency=${vsCurrency}&ids=${coinIdsStr}&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false&price_change_percentage=1h,24h,7d`;
      
      log(`Fetching market data for: ${coinIdsStr}`);
      const data = await this.fetchWithTimeout(url);
      
      return data;
    } catch (error) {
      log(`Error fetching market data: ${error.message}`);
      return null;
    }
  }

  // Get historical price data for charts
  async getHistoricalData(coinId = 'bitcoin', vsCurrency = 'gbp', days = 7) {
    try {
      const url = `${this.baseURL}/coins/${coinId}/market_chart?vs_currency=${vsCurrency}&days=${days}&interval=${days <= 1 ? 'hourly' : 'daily'}`;
      
      log(`Fetching historical data for: ${coinId} (${days} days)`);
      const data = await this.fetchWithTimeout(url);
      
      // Extract prices from the response
      if (data && data.prices) {
        return data.prices.map(([timestamp, price]) => ({
          timestamp,
          price,
          date: new Date(timestamp).toISOString(),
        }));
      }
      
      return null;
    } catch (error) {
      log(`Error fetching historical data: ${error.message}`);
      return null;
    }
  }

  // Get trending cryptocurrencies
  async getTrendingCoins() {
    try {
      const url = `${this.baseURL}/search/trending`;
      
      log('Fetching trending coins');
      const data = await this.fetchWithTimeout(url);
      
      return data.coins || [];
    } catch (error) {
      log(`Error fetching trending coins: ${error.message}`);
      return [];
    }
  }

  // Convert coin symbol to CoinGecko ID
  getCoinGeckoId(symbol) {
    const symbolMap = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'LTC': 'litecoin',
      'XRP': 'ripple',
      'ADA': 'cardano',
      'DOT': 'polkadot',
      'LINK': 'chainlink',
      'BCH': 'bitcoin-cash',
      'XLM': 'stellar',
      'USDT': 'tether',
      'USDC': 'usd-coin',
      'BNB': 'binancecoin',
      'SOL': 'solana',
      'MATIC': 'matic-network',
      'AVAX': 'avalanche-2',
    };
    
    return symbolMap[symbol.toUpperCase()] || symbol.toLowerCase();
  }

  // Get prices for your app's supported assets
  async getSolidiAssetPrices() {
    try {
      // Get prices for BTC, ETH, LTC, XRP (your app's supported assets)
      const coinIds = ['bitcoin', 'ethereum', 'litecoin', 'ripple'];
      const data = await this.getCurrentPrices(coinIds, ['gbp', 'usd', 'eur']);
      
      if (!data) return null;

      // Transform data to match your app's format
      const transformedData = {};
      
      // Map CoinGecko data to your app's market format
      if (data.bitcoin) {
        transformedData['BTC/GBP'] = { 
          price: data.bitcoin.gbp?.toString(),
          change_24h: data.bitcoin.gbp_24h_change,
          last_updated: data.bitcoin.last_updated_at
        };
        transformedData['BTC/USD'] = { 
          price: data.bitcoin.usd?.toString(),
          change_24h: data.bitcoin.usd_24h_change 
        };
        transformedData['BTC/EUR'] = { 
          price: data.bitcoin.eur?.toString(),
          change_24h: data.bitcoin.eur_24h_change 
        };
      }
      
      if (data.ethereum) {
        transformedData['ETH/GBP'] = { 
          price: data.ethereum.gbp?.toString(),
          change_24h: data.ethereum.gbp_24h_change,
          last_updated: data.ethereum.last_updated_at
        };
        transformedData['ETH/USD'] = { 
          price: data.ethereum.usd?.toString(),
          change_24h: data.ethereum.usd_24h_change 
        };
        transformedData['ETH/EUR'] = { 
          price: data.ethereum.eur?.toString(),
          change_24h: data.ethereum.eur_24h_change 
        };
      }
      
      if (data.litecoin) {
        transformedData['LTC/GBP'] = { 
          price: data.litecoin.gbp?.toString(),
          change_24h: data.litecoin.gbp_24h_change,
          last_updated: data.litecoin.last_updated_at
        };
      }
      
      if (data.ripple) {
        transformedData['XRP/GBP'] = { 
          price: data.ripple.gbp?.toString(),
          change_24h: data.ripple.gbp_24h_change,
          last_updated: data.ripple.last_updated_at
        };
      }
      
      log(`Successfully fetched prices for ${Object.keys(transformedData).length} markets`);
      return transformedData;
      
    } catch (error) {
      log(`Error fetching Solidi asset prices: ${error.message}`);
      return null;
    }
  }
}

export default CoinGeckoAPI;
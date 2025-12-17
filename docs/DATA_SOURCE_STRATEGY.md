# Data Source Strategy

**Last Updated:** December 12, 2025

This document defines which API endpoints should be used for asset lists and pricing across different pages in the Solidi Mobile App.

---

## Asset Lists (Available Assets)

### Use `/currency` API
**Pages:**
- **Address Book** - All address management features
- **Transfer** - Send/Receive page
- **Assets** - Portfolio assets page
- **Trade** - Buy/Sell pages

**Implementation:**
```javascript
// Use centralized method
const assets = appState.getAvailableAssets();
// Returns: ["BTC", "ETH", "GBP", "USD", ...]
```

**API Response Format:**
```javascript
[
  {
    "code": "BTC",
    "description": "Bitcoin",
    "decimalPlaces": 8,
    "withdrawEnabled": 1,
    "depositEnabled": 1
  },
  {
    "code": "ETH",
    "description": "Ethereum",
    // ...
  }
  // ... all supported currencies
]
```

### Use `/balance` API
**Pages:**
- **Wallet** - User's balance view

**Implementation:**
```javascript
const balances = appState.state.apiData.balance;
// Returns: { "BTC": "0.5", "ETH": "2.5", "GBP": "1000.00" }
// Only includes assets user has (including zero balances)
```

---

## Pricing Strategy

### 1. Wallet Page
**Use:** `/ticker` API - **Bid Price**

```javascript
const ticker = appState.state.apiData.ticker;
const btcPrice = ticker['BTC/GBP'].bid;
```

**Rationale:** Bid price represents what you can sell for (realistic value of holdings).

---

### 2. Transfer Page
**Use:** `/ticker` API - **Bid Price**

```javascript
const ticker = appState.state.apiData.ticker;
const ethPrice = ticker['ETH/GBP'].bid;
```

**Rationale:** When sending assets, bid price shows the market value you could realize.

---

### 3. Assets Page (Portfolio)
**Use:** `/ticker` API - **Mid Price** (Average of Ask and Bid)

```javascript
const ticker = appState.state.apiData.ticker;
const askPrice = parseFloat(ticker['BTC/GBP'].ask);
const bidPrice = parseFloat(ticker['BTC/GBP'].bid);
const midPrice = (askPrice + bidPrice) / 2;
```

**Rationale:** Mid-price provides a fair market value for portfolio valuation.

---

### 4. Trade Page (Buy/Sell)
**Use:** `/best_volume_price` API

**Endpoint:** `POST /api2/v1/best_volume_price/{market}`

```javascript
// Example request
{
  "side": "BUY", // or "SELL"
  "asset_type": "base", // or "quote"
  "volume": "1",
  "nonce": 1699900000000
}

// Response
{
  "price": "30000.00",
  "volume": "0.01"
}
```

**Rationale:** Provides accurate execution price based on current orderbook depth for the specific volume.

---

### 5. All Other Pages
**Use:** `/ticker` API - **Last Price**

```javascript
const ticker = appState.state.apiData.ticker;
const price = ticker['BTC/GBP'].price;
```

**Rationale:** General reference price for display purposes.

---

## API Response Formats

### `/currency` Response
```javascript
[
  {
    "code": "BTC",
    "description": "Bitcoin",
    "decimalPlaces": 8,
    "withdrawEnabled": 1,
    "depositEnabled": 1,
    "type": "crypto"
  }
  // ... all currencies (crypto + fiat)
]
```

### `/balance` Response
```javascript
{
  "BTC": {
    "available": "0.5",
    "reserved": "0.01",
    "total": "0.51"
  },
  "ETH": {
    "available": "2.5",
    "reserved": "0",
    "total": "2.5"
  },
  "GBP": {
    "available": "1000.00",
    "reserved": "0",
    "total": "1000.00"
  }
}
```

### `/ticker` Response
```javascript
{
  "BTC/GBP": {
    "bid": "29950.00",      // What you can sell for
    "ask": "30050.00",      // What you must pay to buy
    "price": "30000.00",    // Last traded price
    "volume": "150.5",
    "change_24h": "2.5"
  },
  "ETH/GBP": {
    "bid": "1950.00",
    "ask": "1955.00",
    "price": "1952.50",
    "volume": "5000.0",
    "change_24h": "1.2"
  }
}
```

### `/best_volume_price` Response
```javascript
{
  "price": "30000.00",
  "volume": "0.01"
}
```

---

## Implementation Map

| Page/Feature | Asset List Source | Price Source | Price Type |
|--------------|-------------------|--------------|------------|
| Address Book | `/currency` | N/A | N/A |
| Transfer (Send/Receive) | `/currency` | `/ticker` | Bid |
| Wallet | `/balance` | `/ticker` | Bid |
| Assets (Portfolio) | `/currency` | `/ticker` | Mid (Ask+Bid)/2 |
| Trade (Buy/Sell) | `/currency` | `/best_volume_price` | Volume-based |
| Other Pages | `/currency` | `/ticker` | Last |

---

## Code References

### AppState Methods
- `appState.getAvailableAssets()` - Returns assets from `/currency` API
- `appState.getOwnedAssets()` - Returns user's owned assets from `/balance` API
- `appState.state.apiData.ticker` - Ticker data with bid/ask/price
- `appState.state.apiData.balance` - User balance data
- `appState.state.apiData.currency` - Currency list data

### Loading Sequence (At Login)
1. `loadCurrency()` - Loads `/v1/currency` API (all supported assets)
2. `loadBalances()` - Loads `/v1/balance` API (user's balances)
3. `loadMarkets()` - Loads `/v1/market` API (trading pairs)
4. `loadTicker()` - Loads `/v1/ticker` API (live prices) - refreshed periodically

---

## Notes

1. **Currency API** (`/currency`) is the **authoritative source** for all available assets in the platform
2. **Balance API** (`/balance`) should only be used for Wallet page to show what user owns
3. **Bid price** is used for valuation (Wallet, Transfer) as it represents realizable value
4. **Mid price** is used for portfolio display (Assets) for fair market value
5. **Best Volume Price** is used for trading (Buy/Sell) for accurate execution prices
6. All asset codes are **case-insensitive** internally but stored as uppercase in APIs
7. Price data is cached and refreshed periodically in background
8. Currency and balance data are loaded once at login and cached

---

## Migration Notes

### Previous Approach (Deprecated)
- ❌ Used `/market` API to extract assets from trading pairs
- ❌ Required parsing "BTC/GBP" strings to extract asset codes
- ❌ Only included assets that had active trading pairs

### Current Approach (Recommended)
- ✅ Use `/currency` API directly for complete asset list
- ✅ No parsing needed - returns structured asset data
- ✅ Includes ALL supported assets (even without active trading pairs)
- ✅ Provides additional metadata (decimal places, enabled flags, etc.)

---

**Version:** 1.0  
**Status:** Active  
**Related Issues:** #79, #100

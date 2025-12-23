# API Verification Report - Detailed

**Date:** 2025-12-15
**Environment:** Development (`t2.solidi.co`)
**User:** `henry930@gmail.com`

This report contains the full, beautified responses from the API verification test.

## 1. Currency
*   **Route:** `/currency`
*   **Method:** `GET`
*   **URL:** `https://t2.solidi.co/api2/v1/currency`
*   **Status:** `200`

**Response Body:**
```json
{
  "error": null,
  "data": [
    {
      "code": "BTC",
      "description": "Bitcoin",
      "dp": 8,
      "shortname": "Bitcoin"
    },
    {
      "code": "ETH",
      "description": "Ethereum",
      "dp": 18,
      "shortname": "Ethereum"
    },
    {
      "code": "GBP",
      "description": "Great British Pound Sterling",
      "dp": 2,
      "shortname": "GBP"
    },
    {
      "code": "LINK",
      "description": "Chainlink (LINK)",
      "dp": 8,
      "shortname": "Chainlink"
    },
    {
      "code": "LTC",
      "description": "Litecoin",
      "dp": 8,
      "shortname": "Litecoin"
    },
    {
      "code": "XRP",
      "description": "Ripple",
      "dp": 6,
      "shortname": "Ripple"
    }
  ]
}
```

## 2. Market
*   **Route:** `/market`
*   **Method:** `GET`
*   **URL:** `https://t2.solidi.co/api2/v1/market`
*   **Status:** `200`

**Response Body:**
```json
{
  "error": null,
  "data": [
    "BTC/GBP",
    "LTC/GBP",
    "ETH/GBP",
    "XRP/GBP"
  ]
}
```

## 3. Ticker
*   **Route:** `/ticker`
*   **Method:** `GET`
*   **URL:** `https://t2.solidi.co/api2/v1/ticker`
*   **Status:** `200`

**Response Body:**
```json
{
  "error": null,
  "data": {
    "BTC/GBPX": {
      "ask": "69228.11",
      "bid": "65189.05",
      "max_ask": "1.97135829",
      "max_bid": "1.74788712",
      "min_ask": "0.00002889",
      "min_bid": "0.00003068"
    },
    "ETH/GBPX": {
      "ask": "2419.4",
      "bid": "2278.45",
      "max_ask": "9.93369162",
      "max_bid": "10",
      "min_ask": "0.00082665",
      "min_bid": "0.00087779"
    },
    "LTC/GBPX": {
      "ask": "64.39",
      "bid": "DOWN",
      "max_ask": "72",
      "max_bid": "DOWN",
      "min_ask": "0.03106077",
      "min_bid": "DOWN"
    },
    "XRP/GBPX": {
      "ask": "1.54",
      "bid": "1.45",
      "max_ask": "10200",
      "max_bid": "10000",
      "min_ask": "1.299836",
      "min_bid": "1.379998"
    }
  }
}
```

## 4. Best Volume Price
*   **Route:** `/best_volume_price`
*   **Path:** `best_volume_price/BTC/GBP/SELL/quote/1`
*   **Method:** `GET`
*   **URL:** `https://t2.solidi.co/api2/v1/best_volume_price/BTC/GBP/SELL/quote/1`
*   **Status:** `200`

**Response Body:**
```json
{
  "error": "ValidationError: QUOTE_VOLUME_IS_TOO_SMALL"
}
```

## 5. Balance
*   **Route:** `/balance`
*   **Method:** `POST`
*   **URL:** `https://t2.solidi.co/api2/v1/balance`
*   **Signing Domain:** `t2.solidi.co`
*   **Status:** `200`

**Response Body:**
```json
{
  "error": null,
  "data": {
    "BTC": "0.00164326",
    "ETH": "0.000000000000000000",
    "GBP": "152.96",
    "LINK": "0.00000000",
    "LTC": "0.00000000",
    "XRP": "0.000000"
  }
}
```

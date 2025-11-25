# Solidi API Documentation - COMPLETE

**Version:** 2.0  
**Base URL:** `https://t2.solidi.co` (development) / `https://www.solidi.co` (production)  
**API Path Prefix:** `/api2/v1`  
**Last Updated:** November 7, 2025

---

## Table of Contents

1. [Base Configuration](#base-configuration)
2. [Authentication](#authentication)
3. [HMAC Signature Generation](#hmac-signature-generation)
4. [Authentication & User Management](#authentication--user-management)
5. [Registration & Onboarding](#registration--onboarding)
6. [Trading & Orders](#trading--orders)
7. [Wallet & Balance Operations](#wallet--balance-operations)
8. [Market Data](#market-data)
9. [Deposits & Withdrawals](#deposits--withdrawals)
10. [Identity Verification & KYC](#identity-verification--kyc)
11. [Document Upload](#document-upload)
12. [Dynamic Forms & Questionnaires](#dynamic-forms--questionnaires)
13. [Account Management](#account-management)
14. [System Information](#system-information)
15. [Error Handling](#error-handling)
16. [Best Practices](#best-practices)
17. [Appendices](#appendices)

---

## Base Configuration

### Domains
- **Development:** `https://t2.solidi.co`
- **Production:** `https://www.solidi.co`
- **API Version:** `api2/v1`

### Common Headers
```javascript
{
  'User-Agent': 'SolidiMobileApp4/1.2.0 (Build 33)',
  'Content-Type': 'application/json'
}
```

---

## Authentication

### Public Endpoints
**No authentication required.** Only need basic HTTP headers.

**Examples:** `/api2/v1/ticker`, `/api2/v1/version`, `/api2/v1/login_mobile/{email}`

### Private Endpoints
**Require HMAC-SHA256 signature authentication.** Always use POST method.

**Required Headers:**
```javascript
{
  'API-Key': 'your_api_key',
  'API-Sign': 'hmac_sha256_signature',
  'Content-Type': 'application/json',
  'User-Agent': 'SolidiMobileApp4/1.2.0 (Build 33)'
}
```

**All private requests must include:**
- `nonce` in request body (Unix timestamp in microseconds, strictly increasing)
- HMAC signature in `API-Sign` header

---

## HMAC Signature Generation

### Algorithm

```javascript
// 1. Generate nonce (microseconds, must be greater than previous nonce)
const nonce = Date.now() * 1000;

// 2. Prepare POST data with nonce
const postData = JSON.stringify({
  ...params,
  nonce: nonce
});

// 3. Hash the nonce + postData
const hash = CryptoJS.SHA256(nonce + postData).toString();

// 4. Create message: API path + hash
const path = '/api2/v1/balance'; // example path
const message = path + hash;

// 5. Decode API secret from base64
const secretDecoded = CryptoJS.enc.Base64.parse(apiSecret);

// 6. Generate HMAC-SHA256 signature
const hmac = CryptoJS.HmacSHA256(message, secretDecoded);
const signature = CryptoJS.enc.Base64.stringify(hmac);

// 7. Use signature in API-Sign header
headers['API-Sign'] = signature;
```

### Example Implementation
```javascript
const generateSignature = (path, params, apiSecret) => {
  const nonce = Date.now() * 1000;
  const postData = JSON.stringify({ ...params, nonce });
  const hash = CryptoJS.SHA256(nonce + postData).toString();
  const message = path + hash;
  const secretDecoded = CryptoJS.enc.Base64.parse(apiSecret);
  const hmac = CryptoJS.HmacSHA256(message, secretDecoded);
  return CryptoJS.enc.Base64.stringify(hmac);
};
```

---

## Authentication & User Management

### 1. Login Mobile

**Endpoint:** `POST /api2/v1/login_mobile/{email}`

**Type:** Public (no HMAC signature required)

**Request:**
```javascript
{
  "password": "MyPassword123",
  "tfa": "", // Two-factor auth code (empty string if not enabled)
  "optionalParams": {
    "origin": {
      "clientType": "mobile",
      "os": "ios",
      "appVersion": "1.2.0",
      "buildNumber": 33,
      "deviceModel": "iPhone14,2",
      "osVersion": "17.0"
    }
  }
}
```

**Response (Success):**
```javascript
{
  "api_key": "abc123...",
  "api_secret": "xyz789...",
  "user_id": "user123",
  "email": "user@example.com",
  "verified": true,
  "tfa_enabled": false
}
```

**Response (2FA Required):**
```javascript
{
  "requires_tfa": true,
  "message": "Two-factor authentication required"
}
```

### 2. Logout

**Endpoint:** `POST /api2/v1/logout`

**Type:** Private (requires HMAC)

**Request:**
```javascript
{
  "nonce": 1699900000000
}
```

**Response:**
```javascript
{
  "success": true,
  "message": "Logged out successfully"
}
```

### 3. Get Credentials

**Endpoint:** `POST /api2/v1/credentials/{userID}`

**Type:** Private

**Request:**
```javascript
{
  "nonce": 1699900000000
}
```

**Response:**
```javascript
{
  "api_key": "abc123...",
  "api_secret": "xyz789..."
}
```

### 4. Change Password

**Endpoint:** `POST /api2/v1/change_password`

**Type:** Private

**Request:**
```javascript
{
  "current_password": "OldPassword123",
  "new_password": "NewPassword456",
  "nonce": 1699900000000
}
```

**Response:**
```javascript
{
  "success": true,
  "message": "Password changed successfully"
}
```

### 5. Request Password Reset

**Endpoint:** `GET /api2/v1/password_reset/{email}`

**Type:** Public

**Request:** None (URL parameter only)

**Response:**
```javascript
{
  "result": "success",
  "message": "Password reset email sent"
}
```

### 6. Reset Password

**Endpoint:** `POST /api2/v1/reset_password`

**Type:** Public

**Request:**
```javascript
{
  "token": "reset_token_from_email",
  "new_password": "NewSecurePassword789"
}
```

---

## Registration & Onboarding

### 1. Register New User

**Endpoint:** `POST /api2/v1/register_new_user/{email}`

**Type:** Public

**Request:**
```javascript
{
  "userData": {
    "email": "newuser@example.com",
    "password": "SecurePassword123",
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": "1990-01-15",
    "gender": "Male", // or "Female", "Other"
    "citizenship": "GB", // ISO country code
    "mobileNumber": "+447700900000",
    "emailPreferences": ["marketing", "updates"] // array of preference types
  },
  "optionalParams": {
    "origin": {
      "clientType": "mobile",
      "os": "ios",
      "appVersion": "1.2.0",
      "appBuildNumber": 33,
      "appTier": "dev", // or "prod"
      "timestamp": 1699900000000
    }
  }
}
```

**Response:**
```javascript
{
  "result": "success",
  "user_id": "user456",
  "message": "Registration successful. Please verify your email."
}
```

### 2. Complete Registration

After registration, users typically need to complete verification steps:
- Email verification (see Verification section)
- Phone verification (see Verification section)
- Extra information questionnaire (see Dynamic Forms section)

---

## Trading & Orders

### 1. Buy Order

**Endpoint:** `POST /api2/v1/buy`

**Type:** Private

**Request:**
```javascript
{
  "market": "BTC/GBP", // format: BASE/QUOTE
  "baseAssetVolume": "0.01", // Amount of BTC to buy
  "quoteAssetVolume": "300.00", // Amount of GBP to spend
  "orderType": "IMMEDIATE_OR_CANCEL", // See Order Types in Appendix
  "paymentMethod": "BALANCE", // or "CARD", "BANK_TRANSFER"
  "nonce": 1699900000000
}
```

**Response:**
```javascript
{
  "success": true,
  "order_id": "order123456",
  "market": "BTC/GBP",
  "executed_volume": "0.01",
  "executed_price": "30000.00",
  "status": "FILLED"
}
```

### 2. Sell Order

**Endpoint:** `POST /api2/v1/sell`

**Type:** Private

**Request:**
```javascript
{
  "market": "BTC/GBP",
  "baseAssetVolume": "0.01", // Amount of BTC to sell
  "quoteAssetVolume": "300.00", // Expected GBP received
  "orderType": "IMMEDIATE_OR_CANCEL",
  "paymentMethod": "BALANCE",
  "nonce": 1699900000000
}
```

**Response:** Same as Buy Order

### 3. Order Status

**Endpoint:** `POST /api2/v1/order_status/{orderID}`

**Type:** Private

**Request:**
```javascript
{
  "nonce": 1699900000000
}
```

**Response:**
```javascript
{
  "id": 7117,
  "order_id": "order123456",
  "market": "BTC/GBP",
  "side": "BUY",
  "status": "FILLED", // or "PARTIAL", "PENDING", "CANCELLED", "SETTLED"
  "created_at": "2023-11-13T10:30:00Z",
  "executed_volume": "0.01",
  "executed_price": "30000.00"
}
```

### 4. Mark Order as User Paid

**Endpoint:** `POST /api2/v1/order/{orderID}/user_has_paid`

**Type:** Private

**Request:**
```javascript
{
  "nonce": 1699900000000
}
```

**Response:**
```javascript
{
  "success": true,
  "message": "Order marked as paid"
}
```

### 5. Cancel Order

**Endpoint:** `POST /api2/v1/cancel_order/{orderID}`

**Type:** Private

**Request:**
```javascript
{
  "nonce": 1699900000000
}
```

### 6. Order History (Load Orders)

**Endpoint:** `POST /api2/v1/order`

**Type:** Private

**Request:**
```javascript
{
  "market": "BTC/GBP", // Optional: filter by market
  "limit": 50, // Optional: max 100
  "nonce": 1699900000000
}
```

**Response:**
```javascript
{
  "orders": [
    {
      "order_id": "order123",
      "market": "BTC/GBP",
      "side": "BUY",
      "status": "FILLED",
      "created_at": "2023-11-13T10:30:00Z"
    }
    // ... more orders
  ]
}
```

### 7. Volume Price Quote

**Endpoint:** `POST /api2/v1/volume_price/{market}`

**Type:** Private

**Request:**
```javascript
{
  "side": "BUY", // or "SELL"
  "volume": "0.01",
  "nonce": 1699900000000
}
```

**Response:**
```javascript
{
  "price": "30000.00",
  "volume": "0.01",
  "total": "300.00"
}
```

### 8. Best Volume Price

**Endpoint:** `POST /api2/v1/best_volume_price/{market}` or `GET /api2/v1/best_volume_price/{market}`

**Type:** Private (POST) or Public (GET)

**URL Parameters (if GET):**
```
/api2/v1/best_volume_price/BTC/GBP/SELL/quote/1
```

**Request (if POST):**
```javascript
{
  "side": "BUY", // or "SELL"
  "asset_type": "base", // or "quote"
  "volume": "1",
  "nonce": 1699900000000
}
```

**Response:**
```javascript
{
  "price": "30000.00",
  "volume": "0.01"
}
```

---

## Wallet & Balance Operations

### 1. Get Balance

**Endpoint:** `POST /api2/v1/balance`

**Type:** Private

**Request:**
```javascript
{
  "nonce": 1699900000000
}
```

**Response:**
```javascript
{
  "BTC": {
    "available": "0.5",
    "reserved": "0.01", // In open orders
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
  // ... all assets
}
```

### 2. Get Deposit Details

**Endpoint:** `POST /api2/v1/deposit_details/{asset}`

**Type:** Private

**Request:**
```javascript
{
  "nonce": 1699900000000
}
```

**Response:**
```javascript
{
  "asset": "BTC",
  "address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
  "network": "bitcoin",
  "min_deposit": "0.0001"
}
```

### 3. Get Default Account

**Endpoint:** `POST /api2/v1/default_account/{asset}`

**Type:** Private

**Request:**
```javascript
{
  "nonce": 1699900000000
}
```

**Response:**
```javascript
{
  "asset": "GBP",
  "account_id": "bank_account_123",
  "account_name": "My Bank Account",
  "sort_code": "12-34-56",
  "account_number": "12345678"
}
```

### 4. Update Default Account

**Endpoint:** `POST /api2/v1/default_account/{asset}/update`

**Type:** Private

**Request:**
```javascript
{
  "account_id": "bank_account_123",
  "nonce": 1699900000000
}
```

**Response:**
```javascript
{
  "success": true,
  "message": "Default account updated"
}
```

### 5. Get Transaction Fees

**Endpoint:** `POST /api2/v1/fee`

**Type:** Private

**Request:**
```javascript
{
  "asset": "BTC", // Optional
  "nonce": 1699900000000
}
```

**Response:**
```javascript
{
  "BTC": {
    "SLOW": "0.0001",
    "MEDIUM": "0.0002",
    "FAST": "0.0005"
  },
  "ETH": {
    "SLOW": "0.001",
    "MEDIUM": "0.002",
    "FAST": "0.005"
  },
  "trading_fee": {
    "maker": "0.001", // 0.1%
    "taker": "0.002"  // 0.2%
  }
}
```

### 6. Get Transaction History

**Endpoint:** `POST /api2/v1/transaction`

**Type:** Private

**Request:**
```javascript
{
  "asset": "BTC", // Optional
  "type": "DEPOSIT", // Optional: DEPOSIT, WITHDRAWAL, TRADE
  "limit": 50,
  "nonce": 1699900000000
}
```

**Response:**
```javascript
{
  "transactions": [
    {
      "id": "tx123",
      "type": "DEPOSIT",
      "asset": "BTC",
      "amount": "0.1",
      "status": "confirmed",
      "timestamp": "2023-11-13T10:30:00Z",
      "tx_hash": "abc123..."
    }
    // ... more transactions
  ]
}
```

### 7. Get Address Book (List All Addresses)

**Endpoint:** `POST /api2/v1/addressBook/{asset}` or `GET /api2/v1/addressBook/{asset}`

**Type:** Private

**Request (POST):**
```javascript
{
  "nonce": 1699900000000
}
```

**Request (GET):**
- No body required, only URL parameter

**Response:**
```javascript
{
  "data": [
    {
      "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "My Hardware Wallet",
      "assetType": "BTC",
      "type": "myself", // or "thirdparty"
      "address": "{\"address\":\"bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh\",\"firstname\":\"John\",\"lastname\":\"Doe\"}", // JSON string
      "created_at": "2023-10-01T12:00:00Z"
    },
    {
      "uuid": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "name": "Business Account",
      "assetType": "BTC",
      "type": "thirdparty",
      "address": "{\"address\":\"bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh\",\"business\":\"ABC Company Ltd\"}",
      "created_at": "2023-10-15T14:30:00Z"
    }
  ]
}
```

**Response Fields:**
- `uuid` - **IMPORTANT:** Use this UUID for withdrawal API calls, not the wallet address
- `name` - Friendly name for the address
- `assetType` - Asset/cryptocurrency type (BTC, ETH, GBP, etc.)
- `type` - Address type: "myself" or "thirdparty"
- `address` - JSON string containing address details (parse to get actual wallet address)
- `created_at` - Timestamp when address was added

**Note:** The `address` field is a JSON string that needs to be parsed. For crypto, it contains the wallet address. For fiat (GBP), it contains bank account details (accountName, sortCode, accountNumber).

### 8. Add Address to Address Book

**Endpoint:** `POST /api2/v1/addressBook/{asset}/{addressType}`

**Type:** Private

**Address Types:**
- `CRYPTO_UNHOSTED` - Personal/hardware wallets (self-custody)
- `CRYPTO_HOSTED` - Exchange/custodial wallets
- `BANK` - Bank accounts (for fiat like GBP)

**Request (Crypto - Unhosted Wallet):**
```javascript
{
  "name": "John Doe",
  "asset": "BTC",
  "network": "BTC", // Asset/network (uppercase)
  "address": {
    "firstname": "John",
    "lastname": "Doe",
    "business": null, // Set if recipient is a business
    "address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    "dtag": null, // Only for Ripple/XRP
    "vasp": null // Virtual Asset Service Provider info
  },
  "thirdparty": true, // true if sending to someone else, false if your own wallet
  "nonce": 1699900000000
}
```

**Request (Crypto - Exchange Wallet):**
```javascript
{
  "name": "My Binance Account",
  "asset": "BTC",
  "network": "BTC",
  "address": {
    "firstname": null,
    "lastname": null,
    "business": "Binance", // Exchange name
    "address": "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    "dtag": null,
    "vasp": null
  },
  "thirdparty": false,
  "nonce": 1699900000000
}
```

**Request (Fiat - Bank Account):**
```javascript
{
  "firstName": "John",
  "lastName": "Doe",
  "network": "GBP", // Fiat currency (uppercase)
  "address": {
    "accountName": "John Doe",
    "sortCode": "12-34-56",
    "accountNumber": "12345678"
  },
  "thirdparty": true, // true for thirdparty, false for myself
  "nonce": 1699900000000
}
```

**Response:**
```javascript
{
  "success": true,
  "data": {
    "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890", // Use this UUID for withdrawals
    "name": "John Doe",
    "address": "...",
    "type": "thirdparty",
    "assetType": "BTC"
  },
  "message": "Address added successfully"
}
```

**Important Notes:**
- The response includes a `uuid` field - **save this UUID** as it's required for withdrawal API calls
- The `address` parameter in withdrawal requests must be this `uuid`, not the actual wallet address
- After adding an address, reload the address book to get fresh data with proper UUIDs
- **"Invalid UNUSED address" error** means:
  - The wallet address already exists in your address book, OR
  - The address format is invalid for the specified network, OR
  - You must use the `uuid` from the address book API response, not the wallet address string
- Each wallet address can only be added once per account
- To use an address for withdrawals, you MUST first add it to the address book and use the returned `uuid`

---

## Market Data

### 1. Get Ticker (All Markets)

**Endpoint:** `GET /api2/v1/ticker`

**Type:** Public

**Request:** None

**Response:**
```javascript
{
  "BTC/GBP": {
    "bid": "29950.00",
    "ask": "30050.00",
    "price": "30000.00",
    "volume": "150.5",
    "change_24h": "2.5" // percentage
  },
  "ETH/GBP": {
    "bid": "1950.00",
    "ask": "1955.00",
    "price": "1952.50",
    "volume": "5000.0",
    "change_24h": "1.2"
  }
  // ... all markets
}
```

### 2. Get Asset Info

**Endpoint:** `GET /api2/v1/asset_info`

**Type:** Public

**Request:** None

**Response:**
```javascript
{
  "BTC": {
    "name": "Bitcoin",
    "type": "crypto",
    "decimals": 8,
    "min_withdrawal": "0.001",
    "withdrawal_fee": "0.0005"
  },
  "ETH": {
    "name": "Ethereum",
    "type": "crypto",
    "decimals": 18,
    "min_withdrawal": "0.01",
    "withdrawal_fee": "0.005"
  }
  // ... all assets
}
```

### 3. Get Markets

**Endpoint:** `GET /api2/v1/market`

**Type:** Public

**Response:**
```javascript
{
  "markets": [
    {
      "name": "BTC/GBP",
      "base": "BTC",
      "quote": "GBP",
      "min_order_size": "0.0001",
      "price_decimals": 2,
      "volume_decimals": 8
    }
    // ... all markets
  ]
}
```

### 4. Get Asset Icon

**Endpoint:** `GET /api2/v1/asset_icon`

**Type:** Public

**Response:**
```javascript
{
  "BTC": "https://domain.com/icons/btc.png",
  "ETH": "https://domain.com/icons/eth.png"
  // ... all asset icons
}
```

### 5. Get Historical Prices (CSV)

**Endpoint:** `GET /{market}-{period}.csv`

**Type:** Public

**Examples:**
- `GET /BTC-GBP-1H.csv`
- `GET /ETH-GBP-1D.csv`

**Markets:** BTC/GBP, ETH/GBP, LTC/GBP, XRP/GBP, BCH/GBP  
**Periods:** 1H, 2H, 1D, 1W, 1M, 3M, 1Y

**Response:** CSV format
```csv
timestamp,open,high,low,close,volume
2023-11-13T10:00:00Z,30000,30100,29900,30050,15.5
2023-11-13T11:00:00Z,30050,30150,30000,30100,18.2
```

---

## Deposits & Withdrawals

### 1. Withdraw Crypto (BTC, ETH, LTC, XRP, BCH)

**Endpoint:** `POST /api2/v1/withdraw/{asset}`

**Type:** Private

**IMPORTANT:** The `address` parameter must be a **UUID** from your address book, not the actual wallet address. First add the address to your address book using the `addressBook/{asset}/{addressType}` endpoint, then use the returned `uuid` for withdrawals.

**Request:**
```javascript
{
  "volume": "0.1",
  "address": "a1b2c3d4-e5f6-7890-abcd-ef1234567890", // UUID from address book, NOT the wallet address
  "priority": "MEDIUM", // SLOW, MEDIUM, FAST - REQUIRED for crypto withdrawals
  "nonce": 1699900000000
}
```

**Response:**
```javascript
{
  "success": true,
  "withdrawal_id": "withdrawal123",
  "asset": "BTC",
  "volume": "0.1",
  "fee": "0.0002",
  "status": "PENDING"
}
```

### 2. Withdraw Fiat (GBP, EUR, USD)

**Endpoint:** `POST /api2/v1/withdraw/{asset}` (e.g., `/api2/v1/withdraw/GBP`)

**Type:** Private

**IMPORTANT:** Fiat withdrawals use **UUID** from your address book. First add your bank account to the address book using `addressBook/{asset}/BANK` endpoint, then use the returned `uuid` for withdrawals.

**Request:**
```javascript
{
  "volume": "500.00",
  "address": "b2c3d4e5-f6a7-8901-bcde-f12345678901", // UUID from address book for bank account
  "priority": "MEDIUM", // SLOW, MEDIUM, FAST - REQUIRED for all withdrawals including fiat
  "nonce": 1699900000000
}
```

**Response:**
```javascript
{
  "success": true,
  "withdrawal_id": "withdrawal456",
  "asset": "GBP",
  "volume": "500.00",
  "fee": "0.00",
  "status": "PENDING"
}
```

---

## Identity Verification & KYC

### 1. Get Identity Verification Details

**Endpoint:** `POST /api2/v1/identity_verification_details`

**Type:** Private

**Request:**
```javascript
{
  "nonce": 1699900000000
}
```

**Response:**
```javascript
{
  "addressDocument": null, // or document ID if uploaded
  "addressDocumentType": null, // "utility_bill", "bank_statement", etc.
  "identityDocument": null, // or document ID if uploaded
  "identityDocumentType": null, // "passport", "driving_license", "id_card"
  "status": "pending" // or "verified", "rejected"
}
```

### 2. Check Extra Information Required

**Endpoint:** `POST /api2/v1/user/extra_information/check`

**Type:** Private

**Request:**
```javascript
{
  "nonce": 1699900000000
}
```

**Response:**
```javascript
{
  "required": true,
  "categories": [
    {
      "category": "source",
      "description": "Source of funds",
      "multiple_choice": true,
      "options": [
        {
          "id": 6,
          "option_name": "salary",
          "description": "Salary/Wages"
        },
        {
          "id": 7,
          "option_name": "pension",
          "description": "Pension"
        },
        {
          "id": 8,
          "option_name": "savings",
          "description": "Savings"
        }
      ]
    },
    {
      "category": "purpose",
      "description": "Purpose of account",
      "multiple_choice": false,
      "options": [
        {
          "id": 10,
          "option_name": "investment",
          "description": "Investment"
        },
        {
          "id": 11,
          "option_name": "trading",
          "description": "Trading"
        }
      ]
    }
  ]
}
```

### 3. Submit Extra Information

**Endpoint:** `POST /api2/v1/user/extra_information/submit`

**Type:** Private

**Request:**
```javascript
{
  "choices": [
    {
      "category": "source",
      "option_names": ["salary", "savings"]
    },
    {
      "category": "purpose",
      "option_names": ["investment"]
    }
  ],
  "nonce": 1699900000000
}
```

**Response:**
```javascript
{
  "success": true,
  "message": "Extra information submitted successfully"
}
```

### 4. Security Check

**Endpoint:** `POST /api2/v1/security_check`

**Type:** Private

**Request:**
```javascript
{
  "nonce": 1699900000000
}
```

**Response:**
```javascript
{
  "pepResult": false, // Politically Exposed Person check
  "sanctionsCheck": "passed",
  "riskScore": "low" // low, medium, high
}
```

---

## Document Upload

### Upload Document

**Endpoint:** `POST /api2/v1/private_upload/document/{documentType}`

**Type:** Private

**Document Types:**
- `categorisation` - FCA investor categorisation document
- `appropriateness` - FCA appropriateness assessment document
- `passport` - Passport for identity verification
- `driving_license` - Driving license for identity verification
- `id_card` - ID card for identity verification
- `utility_bill` - Utility bill for address verification
- `bank_statement` - Bank statement for address verification

**Content-Type:** `application/json` (file data is base64 encoded in JSON)

**Request:**
```javascript
{
  "documentCategory": "identity", // or "address", "compliance"
  "fileData": "base64_encoded_file_data...",
  "fileExtension": "pdf", // or "jpg", "png", "doc", "docx"
  "nonce": 1699900000000
}
```

**Response:**
```javascript
{
  "result": "success",
  "document_id": "doc123",
  "message": "Document uploaded successfully"
}
```

**Usage Notes:**
- Files should be base64 encoded before uploading
- Maximum file size: 10MB
- Accepted formats: PDF, JPG, PNG, DOC, DOCX, TXT
- Document type must match the upload category

---

## Dynamic Forms & Questionnaires

Dynamic forms are used for compliance questionnaires like FCA categorisation and appropriateness assessments. The form structure is retrieved from the API, displayed to the user, and then submitted with answers.

### 1. Get Form Configuration

Forms are typically hardcoded in the app or retrieved from server configuration. Two main forms:

**FCA Investor Categorisation Form:**
- `formId`: `"finprom-categorisation"`
- Purpose: Determine investor category (Restricted, High Net Worth, etc.)
- Submitted as: `documentType: "categorisation"`

**FCA Appropriateness Assessment:**
- `formId`: `"appropriateness-test"`
- Purpose: Assess knowledge and experience
- Submitted as: `documentType: "appropriateness"`

### 2. Submit Form

Forms are submitted using the Document Upload endpoint:

**Endpoint:** `POST /api2/v1/private_upload/document/{documentType}`

**documentType:** `categorisation` or `appropriateness`

**Request:**
```javascript
{
  "documentCategory": "compliance",
  "fileData": "base64_encoded_pdf_of_form_answers",
  "fileExtension": "pdf",
  "nonce": 1699900000000
}
```

**The app generates a PDF from the form answers before uploading.**

---

## Account Management

### 1. Get User Info

**Endpoint:** `POST /api2/v1/user`

**Type:** Private

**Request:**
```javascript
{
  "nonce": 1699900000000
}
```

**Response:**
```javascript
{
  "user_id": "user123",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-01-15",
  "citizenship": "GB",
  "mobileNumber": "+447700900000",
  "created_at": "2023-01-15T10:00:00Z"
}
```

### 2. Get User Status

**Endpoint:** `POST /api2/v1/user_status`

**Type:** Private

**Request:**
```javascript
{
  "nonce": 1699900000000
}
```

**Response:**
```javascript
{
  "active": true,
  "addressConfirmed": true,
  "addressVerificationRequested": false,
  "addressVerificationSent": false,
  "bankAccountConfirmed": false,
  "cryptoWithdrawDisabled": false,
  "deactivated": false,
  "identityChecked": true,
  "new": false,
  "phoneConfirmed": false,
  "seller": false,
  "withdrawDisabled": false,
  "email_verified": true,
  "kyc_status": "VERIFIED"
}
```

### 3. Update User Info

**Endpoint:** `POST /api2/v1/update_user_info`

**Type:** Private

**Request:**
```javascript
{
  "firstName": "John",
  "lastName": "Doe",
  "mobileNumber": "+447700900000",
  "nonce": 1699900000000
}
```

### 4. Request Account Deletion

**Endpoint:** `POST /api2/v1/request_account_deletion`

**Type:** Private

**Request:**
```javascript
{
  "nonce": 1699900000000
}
```

**Response:**
```javascript
{
  "success": true,
  "message": "Account deletion request submitted. You will be logged out."
}
```

**Note:** This endpoint automatically logs the user out after submission.

### 5. Get Personal Detail Options

**Endpoint:** `GET /api2/v1/personal_detail_option`

**Type:** Public

**Response:**
```javascript
{
  "genders": ["Male", "Female", "Other"],
  "citizenships": ["GB", "US", "FR", "DE", ...],
  "emailPreferences": [
    {
      "id": "marketing",
      "description": "Marketing and promotional emails"
    },
    {
      "id": "updates",
      "description": "Product updates and news"
    }
  ]
}
```

### 6. Get Countries

**Endpoint:** `GET /api2/v1/country`

**Type:** Public

**Response:**
```javascript
{
  "countries": [
    {
      "code": "GB",
      "name": "United Kingdom"
    },
    {
      "code": "US",
      "name": "United States"
    }
    // ... all countries
  ]
}
```

---

## System Information

### 1. Get API Version

**Endpoint:** `GET /api2/v1/api_latest_version`

**Type:** Public

**Response:**
```javascript
{
  "version": "2.1.0",
  "build": "20231113",
  "maintenance": false
}
```

### 2. Get App Version

**Endpoint:** `GET /api2/v1/app_latest_version`

**Type:** Public

**Response:**
```javascript
{
  "version": "1.2.0",
  "build": "33",
  "required_update": false,
  "update_url": "https://apps.apple.com/..."
}
```

---

## Error Handling

### Common Error Responses

**Invalid Signature:**
```javascript
{
  "error": "Invalid API signature",
  "code": "AUTH_INVALID_SIGNATURE"
}
```

**Nonce Too Low:**
```javascript
{
  "error": "Nonce must be greater than previous nonce",
  "code": "AUTH_NONCE_TOO_LOW",
  "last_nonce": 1699900000000
}
```

**Insufficient Balance:**
```javascript
{
  "error": "Insufficient balance",
  "code": "BALANCE_INSUFFICIENT",
  "available": "0.01",
  "required": "0.05"
}
```

**Invalid Parameters:**
```javascript
{
  "error": "Invalid parameters",
  "code": "VALIDATION_ERROR",
  "details": {
    "volume": "Must be greater than 0"
  }
}
```

**Missing Priority (Crypto Withdrawal):**
```javascript
{
  "error": "ValidationError: Missing param priority"
}
```

**Insufficient Orderbook Volume:**
```javascript
{
  "error": "ValidationError: INSUFFICIENT_ORDERBOOK_VOLUME"
}
```

### HTTP Status Codes

- `200` - Success
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (authentication failed)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (endpoint or resource not found)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error
- `503` - Service Unavailable

---

## Best Practices

### Nonce Management
1. **Always use strictly increasing nonces**: `Date.now() * 1000` (microseconds)
2. **Store last used nonce** in persistent storage
3. **Handle nonce errors**: If you get "nonce too low", sync with server time
4. **Multiple devices**: Each device should maintain separate API keys

### Security
1. **Never log API secrets** in plain text
2. **Store credentials securely**: Use Keychain (iOS) / KeyStore (Android)
3. **Validate SSL certificates** for all API calls
4. **Implement request timeouts** (30 seconds recommended)

### Performance
1. **Cache market data**: Ticker updates every 1-5 seconds
2. **Batch balance requests**: Don't poll balance on every screen
3. **Use WebSockets** for real-time price updates (if available)
4. **Implement exponential backoff** for failed requests

### Testing
1. **Use test environment**: `https://t2.solidi.co` (development)
2. **Test with small amounts** before production
3. **Verify withdrawal addresses** thoroughly
4. **Test all error scenarios**: insufficient balance, invalid addresses, etc.

### Document Upload Best Practices
1. **Validate file size**: Maximum 10MB
2. **Validate file type**: PDF, JPG, PNG, DOC, DOCX, TXT only
3. **Encode files properly**: Base64 encoding required
4. **Match document type**: Ensure documentType matches upload category

---

## Appendices

### A. Supported Cryptocurrencies
- **BTC** - Bitcoin
- **ETH** - Ethereum
- **XRP** - Ripple
- **LTC** - Litecoin
- **BCH** - Bitcoin Cash

### B. Supported Fiat Currencies
- **GBP** - British Pound
- **EUR** - Euro
- **USD** - US Dollar
- **CAD** - Canadian Dollar
- **AUD** - Australian Dollar
- **CHF** - Swiss Franc
- **JPY** - Japanese Yen
- **NZD** - New Zealand Dollar

### C. Trading Pairs
All cryptocurrencies can be traded against all fiat currencies.

**Examples:**
- BTC/GBP, BTC/EUR, BTC/USD
- ETH/GBP, ETH/EUR, ETH/USD
- XRP/GBP, LTC/EUR, BCH/USD

### D. Payment Methods
- **BALANCE** - Use existing account balance
- **CARD** - Debit/Credit card (instant)
- **BANK_TRANSFER** - Bank transfer (1-3 days)

### E. Order Types
- **IMMEDIATE_OR_CANCEL** - Fill immediately or cancel (default for mobile app)
- **LIMIT** - Limit order at specified price
- **MARKET** - Execute at current market price

### F. Withdrawal Priorities
- **SLOW** - Low fee, 30-60 minutes
- **MEDIUM** - Medium fee, 10-30 minutes (default)
- **FAST** - High fee, 5-10 minutes

### G. Document Types for Upload
**Identity Documents:**
- `passport` - Passport
- `driving_license` - Driving License
- `id_card` - National ID Card

**Address Verification:**
- `utility_bill` - Utility Bill
- `bank_statement` - Bank Statement

**Compliance Documents:**
- `categorisation` - FCA Investor Categorisation
- `appropriateness` - FCA Appropriateness Assessment

---

## Complete API Endpoint List

### Public Endpoints (No Authentication)
1. `GET /api2/v1/api_latest_version` - Get API version
2. `GET /api2/v1/app_latest_version` - Get app version
3. `GET /api2/v1/ticker` - Get all market prices
4. `GET /api2/v1/asset_info` - Get asset information
5. `GET /api2/v1/market` - Get trading pairs
6. `GET /api2/v1/asset_icon` - Get asset icons
7. `GET /api2/v1/personal_detail_option` - Get personal detail options
8. `GET /api2/v1/country` - Get country list
9. `POST /api2/v1/login_mobile/{email}` - User login
10. `POST /api2/v1/register_new_user/{email}` - User registration
11. `GET /api2/v1/password_reset/{email}` - Request password reset
12. `GET /{market}-{period}.csv` - Historical prices (CSV)

### Private Endpoints (Require HMAC Authentication)
1. `POST /api2/v1/balance` - Get account balances
2. `POST /api2/v1/user` - Get user information
3. `POST /api2/v1/user_status` - Get user account status
4. `POST /api2/v1/credentials/{userID}` - Get API credentials
5. `POST /api2/v1/buy` - Place buy order
6. `POST /api2/v1/sell` - Place sell order
7. `POST /api2/v1/order` - Get order history
8. `POST /api2/v1/order_status/{orderID}` - Get order status
9. `POST /api2/v1/order/{orderID}/user_has_paid` - Mark order as paid
10. `POST /api2/v1/volume_price/{market}` - Get volume price quote
11. `POST /api2/v1/best_volume_price/{market}` - Get best price
12. `POST /api2/v1/withdraw/{asset}` - Withdraw cryptocurrency or fiat
13. `POST /api2/v1/transaction` - Get transaction history
14. `POST /api2/v1/fee` - Get transaction fees
15. `POST /api2/v1/deposit_details/{asset}` - Get deposit address/details
16. `POST /api2/v1/default_account/{asset}` - Get default account
17. `POST /api2/v1/default_account/{asset}/update` - Update default account
18. `POST /api2/v1/addressBook/{asset}` - Get saved addresses
19. `POST /api2/v1/addressBook/{asset}/{addressType}` - Add address to address book
20. `POST /api2/v1/identity_verification_details` - Get KYC status
21. `POST /api2/v1/user/extra_information/check` - Check required info
22. `POST /api2/v1/user/extra_information/submit` - Submit extra info
23. `POST /api2/v1/security_check` - Run security checks
24. `POST /api2/v1/private_upload/document/{documentType}` - Upload documents
25. `POST /api2/v1/request_account_deletion` - Delete account
26. `POST /api2/v1/logout` - Logout user

---

## Notes

1. **All timestamps** are in ISO 8601 format (UTC)
2. **All volumes and prices** are strings to avoid floating-point precision issues
3. **Asset codes** are case-sensitive (BTC, not btc)
4. **Market format** is always `BASE/QUOTE` (e.g., BTC/GBP)
5. **All withdrawals (both crypto and fiat)** require `address` (UUID from address book) and `priority` (SLOW, MEDIUM, FAST)
6. **Deprecated:** Old API used `account_id` for fiat - now unified to use `address` UUID for all asset types
7. **Document uploads** require base64 encoded fileData
8. **Form submissions** are uploaded as PDF documents via document upload endpoint

---

**Last Updated:** November 11, 2025  
**Generated from:** Comprehensive codebase scan of SolidiMobileApp4  
**Total Endpoints Documented:** 38 unique API routes  
**Missing from Previous Documentation:**
- Registration endpoint (`register_new_user/{email}`)
- Extra information check and submit
- Security check
- Document upload (`private_upload/document/{documentType}`)
- User status
- Default account management
- Address book
- Volume/price quotes
- Mark order as paid
- Personal detail options
- Countries list

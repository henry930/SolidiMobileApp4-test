# Open Banking Payment Implementation Summary

## Overview
Your Solidi mobile app has an **Open Banking payment integration** for buying cryptocurrency using direct bank transfers through a mobile banking app. This allows users to pay for crypto purchases instantly via their banking app instead of manual bank transfers.

---

## Key Components

### 1. **Payment Provider: Tink**
- **Provider:** Tink (https://link.tink.com)
- **Integration Type:** Payment Initiation Service (PIS)
- **Market:** UK (Great Britain)
- **Purpose:** Instant bank transfers for cryptocurrency purchases

**Example Tink Payment URL:**
```
https://link.tink.com/1.0/pay/direct?client_id=c831beab1dcb48e3a44f769dfd402939
  &redirect_uri=https://t3.solidi.co/tinkhook
  &market=GB
  &locale=en_GB
  &payment_request_id=adf5cd304d9011ed9d58a70f033bb3df
```

---

### 2. **API Endpoints**

#### Get Payment URL
- **Endpoint:** `POST /api2/v1/settlement/{settlementID}/open_banking_payment_url`
- **Purpose:** Retrieve Tink payment URL to embed in WebView
- **Returns:** Full Tink payment link

#### Check Payment Status
- **Endpoint:** `POST /api2/v1/settlement/{settlementID}/open_banking_payment_status`
- **Purpose:** Poll for payment completion
- **Possible Status Values:**
  - `NOTFOUND` - Payment not initiated
  - `CANCELLED` - User cancelled payment
  - `SENT` - Payment sent but not received
  - `SETTLED` - Payment completed successfully ✅
  - `UNKNOWN` - Status unclear

**Implementation in AppState.js:**
```javascript
// Lines 5532-5552
this.getOpenBankingPaymentStatusFromSettlement = async (params) => {
  let {settlementID} = params;
  let url = `settlement/${settlementID}/open_banking_payment_status`;
  let data = await this.state.privateMethod({
    httpMethod: 'POST',
    apiRoute: url,
    params: {},
    functionName: 'getOpenBankingPaymentStatusFromSettlement',
  });
  return data;
}

// Lines 5554-5568
this.getOpenBankingPaymentURLFromSettlement = async (params) => {
  let {settlementID} = params;
  let url = `settlement/${settlementID}/open_banking_payment_url`;
  let data = await this.state.privateMethod({
    httpMethod: 'POST',
    apiRoute: url,
    params: {},
    functionName: 'getOpenBankingPaymentURLFromSettlement',
  });
  return data; // Returns Tink payment URL
}
```

---

### 3. **User Flow**

#### Step 1: Choose Payment Method
**File:** `ChooseHowToPay.js` (Lines 270-280)

User selects from three payment options:
1. **Solidi** - Manual bank transfer (requires user to manually transfer)
2. **OpenBank** - Open Banking payment (integrated mobile banking app) ⭐
3. **Balance** - Pay with existing Solidi balance

```javascript
// Payment choice selection state
let [paymentChoice, setPaymentChoice] = useState(pageName);
// Options: 'solidi', 'openbank', 'balance'
```

#### Step 2: Send Buy Order
**File:** `ChooseHowToPay.js` (Lines 281-315)

```javascript
let payDirectly = async ({buyOrder, selectedPaymentChoice}) => {
  console.log('📤 CONSOLE: About to call appState.sendBuyOrder...');
  console.log('📤 CONSOLE: buyOrder:', buyOrder);
  console.log('📤 CONSOLE: selectedPaymentChoice:', selectedPaymentChoice);
  
  let output = await appState.sendBuyOrder(buyOrder);
  
  // Response contains:
  // - orderID: The order identifier
  // - settlements: Array with settlementID
  
  console.log('📨 CONSOLE: Raw sendBuyOrder response:', output);
  
  appState.panels.buy.output = output;
  
  if (output.settlements) {
    let settlementID = output.settlements[0].settlementID;
    appState.panels.buy.settlementID = settlementID;
  }
}
```

#### Step 3: Open Banking Payment Screen
**File:** `MakePaymentOpenBanking.js` (232 lines)

This is the core open banking payment component.

**Key Features:**
- Embeds Tink payment URL in a WebView
- Polls payment status every 2-60 seconds (smart intervals)
- 30-minute maximum wait time
- Auto-redirects on success or timeout

**Payment Flow:**
```javascript
// Lines 18-150 (simplified)
let MakePaymentOpenBanking = () => {
  let [url, setURL] = useState('');
  let settlementID = appState.changeStateParameters.settlementID;
  
  // Smart polling intervals:
  // - 2 seconds × 5 times (10 seconds)
  // - 5 seconds × 10 times (1 minute)
  // - 30 seconds × 18 times (10 minutes)
  // - 60 seconds × 20 times (30 minutes)
  
  let setup = async () => {
    await checkIfPaymentReceived();
    let urlOpenBanking = await appState.getOpenBankingPaymentURLFromSettlement({settlementID});
    setURL(urlOpenBanking);
    
    // Start polling timer
    let timerID = setInterval(incrementTimeElapsed, 2000);
    appState.panels.makePaymentOpenBanking.timerID = timerID;
  }
  
  let checkIfPaymentReceived = async () => {
    let paymentStatus = await appState.getOpenBankingPaymentStatusFromSettlement({settlementID});
    
    if (paymentStatus == "SETTLED") {
      clearInterval(appState.panels.makePaymentOpenBanking.timerID);
      appState.changeState('PurchaseSuccessful');
    } else if (paymentStatus == "CANCELLED") {
      clearInterval(appState.panels.makePaymentOpenBanking.timerID);
      appState.changeState('PaymentNotMade', 'openBankingPaymentNotReceived');
    }
  }
  
  return (
    <View>
      <Text>Pay by mobile banking app</Text>
      
      <WebView
        source={{ uri: url }}
        startInLoadingState={true}
        onMessage={(event) => {
          // Handle messages from Tink iframe
        }}
      />
    </View>
  )
}
```

---

### 4. **Price Fetching for Different Payment Methods**

**File:** `ChooseHowToPay.js` (Lines 120-160)

The API returns different prices/fees for each payment method:

```javascript
let fetchPaymentChoiceDetails = async () => {
  let market = assetBA + '/' + assetQA;  // e.g., "BTC/GBP"
  let side = 'BUY';
  let baseOrQuoteAsset = 'quote';
  
  let params = {
    market,
    side,
    baseOrQuoteAsset,
    quoteAssetVolume: volumeQA
  };
  
  let output = await appState.fetchPricesForASpecificVolume(params);
  
  /* Example output:
  {
    "balance": {
      "baseAssetVolume": "0.00040586",
      "feeVolume": "0.00",
      "paymentMethod": "balance"
    },
    "openbank": {
      "baseAssetVolume": "0.00056688",
      "feeVolume": "0.00",
      "paymentMethod": "openbank"
    },
    "solidi": {
      "baseAssetVolume": "0.00040586",
      "feeVolume": "0.00",
      "paymentMethod": "solidi"
    }
  }
  */
  
  return output;
}
```

**Note:** OpenBank may have different exchange rates or fees compared to balance payments.

---

### 5. **Bank App Quick Access**

**File:** `DepositInstructions.js` (Lines 47-170)

A bonus feature that helps users quickly open their banking apps using deep links:

```javascript
const ukBanks = [
  {
    name: 'Barclays',
    scheme: 'barclaysuk://',
    fallbackUrl: 'https://www.barclays.co.uk/'
  },
  {
    name: 'HSBC',
    scheme: 'hsbc://',
    fallbackUrl: 'https://www.hsbc.co.uk/'
  },
  {
    name: 'Lloyds Bank',
    scheme: 'lloydsbank://',
  },
  {
    name: 'Monzo',
    scheme: 'monzo://',
  },
  {
    name: 'Revolut',
    scheme: 'revolut://',
  },
  // ... 10+ UK banks supported
];

const openBankApp = async (bank) => {
  const canOpen = await Linking.canOpenURL(bank.scheme);
  if (canOpen) {
    await Linking.openURL(bank.scheme);
  } else {
    await Linking.openURL(bank.fallbackUrl);
  }
};
```

---

## Technical Architecture

### State Management
**Location:** `AppState.js`

```javascript
panels: {
  buy: {
    activeOrder: false,
    orderID: null,
    settlementID: null,  // ← Key for Open Banking
    volumeQA: '0',
    symbolQA: '',
    volumeBA: '0',
    symbolBA: '',
  },
  makePaymentOpenBanking: {
    timerID: null  // Polling interval timer
  }
}
```

### WebView Integration
**Component:** React Native WebView
```jsx
<WebView
  source={{ uri: urlOpenBanking }}
  startInLoadingState={true}
  renderLoading={() => <Spinner/>}
  onMessage={(event) => {
    let data = event.nativeEvent.data;
    log(`Received event from Tink: ${data}`);
  }}
/>
```

---

## Payment Status Polling Strategy

### Smart Interval Timing
```
Initial:  2 seconds × 5 = 10 seconds (fast polling for quick payments)
Then:     5 seconds × 10 = 50 seconds (moderate polling)
Then:     30 seconds × 18 = 540 seconds (9 minutes)
Finally:  60 seconds × 20 = 1200 seconds (20 minutes)
Total:    30 minutes maximum
```

**Implementation:**
```javascript
let intervalSeconds = 2;
let count = 0;
let maxTimeAllowedSeconds = 30 * 60;

let incrementTimeElapsed = async () => {
  count += 1;
  timeElapsedSeconds += intervalSeconds;
  
  // Adjust interval based on elapsed time
  if (intervalSeconds == 2 && count >= 5) {
    intervalSeconds = 5;
  }
  if (intervalSeconds == 5 && count >= 10) {
    intervalSeconds = 30;
  }
  if (intervalSeconds == 30 && count >= 18) {
    intervalSeconds = 60;
  }
  
  if (timeElapsedSeconds >= maxTimeAllowedSeconds) {
    appState.changeState('PaymentNotMade');
  }
  
  await checkIfPaymentReceived();
}
```

---

## Advantages of Open Banking Approach

### For Users:
✅ **Instant payment** - No waiting for manual bank transfer confirmation  
✅ **Secure** - Payment happens within their trusted banking app  
✅ **Convenient** - No need to manually enter bank details  
✅ **Real-time** - Immediate order fulfillment once payment confirmed

### For Your Business:
✅ **Faster settlement** - Immediate payment confirmation  
✅ **Reduced fraud** - Strong Customer Authentication (SCA) via bank  
✅ **Better UX** - Seamless payment flow  
✅ **Lower costs** - Typically cheaper than card payments

---

## Integration Points Summary

### Frontend Components:
1. **ChooseHowToPay.js** - Payment method selection
2. **MakePaymentOpenBanking.js** - WebView payment screen
3. **DepositInstructions.js** - Bank app quick access

### Backend API:
1. `POST /api2/v1/settlement/{settlementID}/open_banking_payment_url`
2. `POST /api2/v1/settlement/{settlementID}/open_banking_payment_status`

### Payment Provider:
- **Tink** - Payment Initiation Service
- Handles bank authentication and payment execution
- Returns payment status to your backend via webhook

---

## Potential Improvements

### 1. **Add Payment Timeout Visual Feedback**
Show countdown timer to user: "Payment expires in 29:45"

### 2. **Add Bank Selection**
Pre-select user's bank before redirecting to Tink

### 3. **Save Preferred Payment Method**
Remember user's choice (openbank vs solidi vs balance)

### 4. **Add Payment History**
Track open banking payment attempts and success rates

### 5. **Handle Network Interruptions**
Better error handling if user loses internet during payment

### 6. **Add Payment Retry**
Allow user to retry failed payment with same order

---

## Security Considerations

✅ **HTTPS Only** - All API calls use HTTPS  
✅ **HMAC Authentication** - Private endpoints require signatures  
✅ **WebView Isolation** - Tink runs in sandboxed WebView  
✅ **No PII Storage** - No banking credentials stored in app  
✅ **Settlement ID** - Unique identifier prevents replay attacks

---

## Testing Recommendations

### Test Scenarios:
1. ✅ Successful payment (SETTLED status)
2. ❌ Cancelled payment (user cancels in bank app)
3. ⏱️ Timeout (30 minutes exceeded)
4. 🔌 Network interruption (reconnect handling)
5. 🔄 Multiple payments (prevent duplicate orders)
6. 📱 Background/foreground transitions

### Test Banks:
- Monzo (fast approval)
- Revolut (instant)
- Traditional banks (slower processing)

---

## Current Status

### ✅ Implemented:
- Tink integration
- WebView payment screen
- Status polling (smart intervals)
- Success/failure handling
- Timeout management
- Bank app quick access

### 🔄 Areas to Monitor:
- Payment success rate
- Average payment time
- Timeout frequency
- User drop-off points

---

## Related Files

### Core Implementation:
- `src/application/SolidiMobileApp/components/MainPanel/components/MakePaymentOpenBanking/MakePaymentOpenBanking.js`
- `src/application/SolidiMobileApp/components/MainPanel/components/ChooseHowToPay/ChooseHowToPay.js`
- `src/application/data/AppState.js` (lines 5532-5568)

### Supporting Features:
- `src/application/SolidiMobileApp/components/MainPanel/components/DepositInstructions/DepositInstructions.js`

### API Documentation:
- `API_DOCUMENTATION.md` (sections on settlements and payments)

---

## Questions to Consider

1. **Analytics:** Are you tracking open banking payment conversion rates?
2. **Fees:** What's the fee structure for open banking vs other methods?
3. **Limits:** Are there minimum/maximum payment limits?
4. **Availability:** Which countries/banks are supported?
5. **Fallback:** What happens if Tink service is down?

---

**Last Updated:** November 12, 2025  
**Summary Generated For:** Solidi Mobile App v4 - Open Banking Payment Study

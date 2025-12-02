# App Rebuild Required for Ticker API & Address Book Fixes

## Fixes Included
1. **Address Book Validation (Issue #78)**
   - Next button disabled when no asset selected on Step 3.
   - Visual feedback added.

2. **Ticker API Price Fix (New)**
   - ✅ **Fixed API Domain:** Removed hardcoded `www.solidi.co` to respect app environment (uses `t2.solidi.co` in staging).
   - ✅ **Fixed Price Display:** Added fallback to `bid` price when API returns data without `price` field.

## Why It's Not Working Yet
**JavaScript changes require the app to reload the bundle.** The TestFlight or development build you're testing is still running the old JavaScript code.

## How to See the Fix

### Option 1: Reload JavaScript Bundle (Fastest - Development Only)
If you're running in development mode:
1. Shake the device/simulator
2. Tap "Reload"

OR

Press `Cmd+R` in the simulator

### Option 2: Rebuild the App (Required for TestFlight)
```bash
# For iOS
cd /Users/henry/Solidi/SolidiMobileApp4
npm run ios

# Or for a clean build
npm run ios -- --reset-cache
```

## Verification Steps (After Reload/Rebuild)

### Verify Address Book (Issue #78)
1. Open Address Book -> Add New Address
2. On Step 3 (Asset), **DO NOT** select any asset
3. **Expected:** Next button should be grayed out and disabled

### Verify Prices (Ticker API)
1. Go to Dashboard or Wallet
2. **Expected:** Prices should now load correctly (using `bid` price from `t2.solidi.co`)
3. **Expected:** No "API cannot get price" errors

## Code Changes Confirmed
```bash
git diff src/application/data/AppState.js
```
Shows the domain removal and price fallback logic.

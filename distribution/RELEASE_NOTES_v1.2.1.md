# Solidi Mobile App - Release Notes v1.2.1

**Version:** 1.2.1  
**Version Code:** 38  
**Build Date:** November 22, 2025  
**File:** `SolidiMobileApp-v1.2.1-versionCode38-20251122.aab`

## What's New in v1.2.1

### Balance API Integration
- ✅ **Dynamic Asset Lists**: Asset lists now populated from `/balance` API instead of hardcoded values
- ✅ **Two-tier Asset System**:
  - **Available Assets** (all tradeable): Used in Trade, Assets, AddressBook pages
  - **Owned Assets** (balance > 0): Used in Send, Withdraw, Wallet pages
- ✅ **Real-time Balance Data**: All balance information loaded during authentication

### Wallet Improvements
- ✅ **Unified Send/Withdraw**: Withdraw button now opens Transfer Send component in modal
- ✅ **Dynamic Asset Selection**: Send/Withdraw shows only assets you own (BTC, GBP, etc.)
- ✅ **Improved UX**: Consistent interface for all send/withdraw operations

### Transaction History Enhancement
- ✅ **Infinite Scroll Pagination**: Load 20 transactions at a time as you scroll down
- ✅ **Increased Limit**: Now fetches up to 1000 transactions from API (previously limited to 10)
- ✅ **Performance Optimized**: Client-side pagination for smooth scrolling
- ✅ **Pull-to-Refresh**: Swipe down to reload latest transactions

### Transfer Component
- ✅ **Modal Mode Support**: Can be opened in modal with initial tab selection
- ✅ **Dynamic Asset Lists**: Shows owned assets (crypto + fiat) in Send tab

## Technical Details

### API Changes
- `/balance` API now called during authentication (Step 10)
- Transaction history API now requests `limit: 1000` parameter
- All asset lists dynamically generated from API responses

### Code Improvements
- Added `getOwnedAssets()` function to filter assets with balance > 0
- Added `getAvailableAssets()` function for all tradeable assets
- Fixed Transfer component to accept `initialMode` prop
- Enhanced History component with scroll-based pagination

## Testing Notes

### Features to Test
1. **Balance Loading**:
   - Check that all owned assets appear in Wallet
   - Verify Send/Withdraw shows only owned assets
   - Confirm Trade/Assets shows all available assets

2. **Transaction History**:
   - Navigate to History → Transactions tab
   - Scroll down to trigger infinite scroll
   - Verify 20 items load at a time
   - Check "No more transactions" message at end

3. **Send/Withdraw**:
   - Click Withdraw button in Wallet
   - Verify modal opens with Transfer Send component
   - Check asset dropdown shows only BTC and GBP (owned assets)
   - Test sending both crypto and fiat

## Known Issues
None reported in this build.

## Upgrade Notes
- Clean install recommended for best experience
- Existing data will be preserved
- First launch may take slightly longer due to balance API call

## File Information
- **Format:** Android App Bundle (.aab)
- **Size:** ~27 MB
- **Target:** Internal Testing
- **Min SDK:** API 23 (Android 6.0)
- **Target SDK:** API 35 (Android 15)

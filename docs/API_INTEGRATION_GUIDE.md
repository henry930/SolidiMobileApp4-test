# Solidi API Integration Guide - Mobile & Web

## Overview
This document explains how the Solidi REST API client works across both mobile and web platforms, ensuring consistent authentication and API communication.

## Architecture

### API Client Library
**Location:** `/src/api/SolidiRestAPIClientLibrary.js`

The `SolidiRestAPIClientLibrary` is a unified API client that works for both mobile and web platforms. It handles:
- Authentication (API key/secret signing)
- Request/response handling
- Error handling
- Credential validation

### Key Components

#### 1. Mobile AppState
**Location:** `/src/application/data/AppState.js`

The mobile app uses a comprehensive AppState that:
- Manages user authentication state
- Stores API credentials using AsyncStorage (with Keychain mock)
- Initializes the API client with proper domain and user agent
- Handles login/logout flows

#### 2. Web AppState
**Location:** `/web/src/context/AppState.web.js`

The web app uses a simplified AppState that:
- Manages user authentication state for web
- Uses the same API client library as mobile
- Stores credentials in AsyncStorage (browser localStorage)
- Provides React Context for components

## How Login Works

### Common Flow (Mobile & Web)

1. **Create Public API Client**
   ```javascript
   const apiClient = new SolidiRestAPIClientLibrary({
     userAgent: 'Your-User-Agent',
     apiKey: '',
     apiSecret: '',
     domain: 't2.solidi.co',
     appStateRef: { current: this }
   });
   ```

2. **Call Login API**
   ```javascript
   const apiRoute = `login_mobile/${email}`;
   const params = { 
     password, 
     tfa, 
     optionalParams: {
       origin: {
         clientType: 'web' or 'mobile',
         os: Platform.OS or 'web',
         appVersion: '1.2.0',
         appBuildNumber: '20251112',
         appTier: 'prod',
       }
     }
   };
   
   const data = await apiClient.publicMethod({
     httpMethod: 'POST',
     apiRoute,
     params,
     abortController: new AbortController()
   });
   ```

3. **Handle Response**
   ```javascript
   // Check for TFA requirement
   if (data.error && data.error.details?.tfa_required) {
     return 'TFA_REQUIRED';
   }
   
   // Extract credentials
   const { apiKey, apiSecret } = data;
   ```

4. **Create Authenticated Client**
   ```javascript
   const authenticatedClient = new SolidiRestAPIClientLibrary({
     userAgent,
     apiKey,
     apiSecret,
     domain: 't2.solidi.co',
     appStateRef: { current: this }
   });
   ```

5. **Store Credentials**
   ```javascript
   // For future auto-login
   await Keychain.setInternetCredentials('SolidiApp', email, password);
   await Keychain.setInternetCredentials('SolidiApp_API', apiKey, apiSecret);
   ```

## Key Differences: Mobile vs Web

### Mobile
- Uses `Platform.OS` for operating system detection
- Uses mocked Keychain backed by AsyncStorage
- Has more comprehensive state management
- Supports auto-login on app startup
- Has additional features like pin code, biometrics

### Web
- Uses `'web'` as platform identifier
- Uses browser's `localStorage` via AsyncStorage
- Simplified state management via React Context
- Focuses on core authentication features
- No native device features

## Configuration

### API Domain
Both platforms use: `t2.solidi.co`

### User Agent
- **Mobile:** Derived from `Platform.OS` and device info
- **Web:** Uses `window.navigator.userAgent`

### App Version
Both platforms should use the same version/build numbers from `package.json`:
- `version`: "1.2.0"
- `buildNumber`: "20251112"

## Authentication Flow Diagram

```
┌─────────────────┐
│   User enters   │
│ email/password  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Create Public   │
│   API Client    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Call login_    │
│  mobile API     │
└────────┬────────┘
         │
         ├─────────┐
         │         ▼
         │    ┌─────────────────┐
         │    │  TFA Required?  │
         │    │  Return to UI   │
         │    └─────────────────┘
         │
         ▼
┌─────────────────┐
│ Receive apiKey  │
│  & apiSecret    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│Create Authenticated│
│   API Client    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│Store Credentials│
│ (for auto-login)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Navigate to   │
│    Dashboard    │
└─────────────────┘
```

## Making API Calls

### Public Endpoints (No Authentication)
```javascript
const result = await apiClient.publicMethod({
  httpMethod: 'GET' or 'POST',
  apiRoute: 'endpoint_name',
  params: { /* optional parameters */ },
  abortController: new AbortController()
});
```

### Private Endpoints (Requires Authentication)
```javascript
const result = await apiClient.privateMethod({
  httpMethod: 'GET' or 'POST',
  apiRoute: 'endpoint_name',
  params: { /* parameters */ },
  abortController: new AbortController()
});
```

## Error Handling

### Common Errors
1. **Invalid Credentials**
   - Response: `{ error: { message: 'Invalid username or password' } }`
   - Action: Show error to user

2. **TFA Required**
   - Response: `{ error: { code: 400, details: { tfa_required: true } } }`
   - Action: Show TFA input field

3. **Network Error**
   - Caught in try/catch
   - Action: Show "Connection failed" message

4. **Expired Credentials**
   - Detected when API calls fail with 401
   - Action: Redirect to login, clear stored credentials

## Testing

### Web Testing
1. Navigate to `http://localhost:3000`
2. Enter valid credentials
3. Check browser console for API logs
4. Verify localStorage has stored credentials

### Mobile Testing
1. Build and run on device/simulator
2. Enter valid credentials  
3. Check console logs for API communication
4. Verify AsyncStorage has stored credentials

## Troubleshooting

### Login Fails on Web
1. Check browser console for API errors
2. Verify network tab shows API call to `t2.solidi.co`
3. Check CORS headers in response
4. Verify API client initialization parameters

### Auto-Login Not Working
1. Check if credentials are stored: `localStorage.getItem('keychain_SolidiApp')`
2. Verify API credentials: `localStorage.getItem('keychain_SolidiApp_API')`
3. Check AppState initialization logs
4. Verify auto-login logic is enabled

### API Calls Failing
1. Check if authenticated client has valid apiKey/apiSecret
2. Verify domain is set correctly (`t2.solidi.co`)
3. Check request signing (crypto-js dependencies)
4. Verify AbortController is provided

## Security Considerations

### Credential Storage
- **Mobile:** AsyncStorage (not secure, mocked Keychain)
- **Web:** localStorage (not secure, accessible via JavaScript)
- **Future:** Implement proper encryption for both platforms

### API Communication
- All API calls use HTTPS
- Request signing with HMAC-SHA256
- Nonce-based replay protection
- Credentials never sent in plain text after initial login

### Best Practices
1. Never log API keys/secrets in production
2. Clear credentials on logout
3. Handle expired sessions gracefully
4. Validate all user inputs before API calls
5. Use AbortController for request cancellation

## Future Enhancements

1. **Secure Storage**
   - Mobile: Use real Keychain/Keystore
   - Web: Implement secure token storage

2. **Session Management**
   - Implement token refresh
   - Add session timeout handling
   - Support multiple concurrent sessions

3. **Offline Support**
   - Cache API responses
   - Queue requests when offline
   - Sync when connection restored

4. **Analytics**
   - Track API call success/failure rates
   - Monitor response times
   - Log authentication events

## References

- API Client: `/src/api/SolidiRestAPIClientLibrary.js`
- Mobile AppState: `/src/application/data/AppState.js`
- Web AppState: `/web/src/context/AppState.web.js`
- Mobile Login: `/src/application/SolidiMobileApp/components/MainPanel/components/Login/Login.js`
- Web Login: `/web/src/components/Login.web.js`

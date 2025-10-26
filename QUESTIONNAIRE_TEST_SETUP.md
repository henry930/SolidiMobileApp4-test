## ✅ **Questionnaire Setup Complete**

I've configured the app to directly load the `finprom-categorisation` form in the Questionnaire component:

### 🔧 **Configuration Changes**

1. **Initial State**: Set `initialMainPanelState = 'Questionnaire'`
2. **Form Selection**: Set `initialPageName = 'finprom-categorisation'`  
3. **Form Loading**: Enabled form loading using pageName parameter
4. **Component Ready**: Removed disabled state message

### 🎯 **What Will Happen Now**

When you **restart the app**, it will:

1. **Load Questionnaire Component** directly on startup
2. **Load finprom-categorisation.json** form automatically
3. **Show Dynamic Variables**: `${firstname} ${lastname}` → user names, `${todaysdate}` → "24/10/2025"
4. **Enable Validation**: HNW and restricted investor validation rules active
5. **Number Inputs**: Proper numeric keyboard for percentage/amount fields

### 📋 **Features to Test**

- **Variable Substitution**: Check signature and date fields for populated values
- **Restricted Validation**: Enter >10% and click "Next" → error message
- **HNW Validation**: Enter <£100k income AND <£250k assets → error message  
- **Form Navigation**: Multi-page form with proper page flow
- **Number Fields**: Numeric keyboard for amount inputs

### 🔄 **To Return to Normal**

When done testing, revert these lines in `AppState.js`:
```javascript
let initialMainPanelState = 'Login'; // Default fallback
let initialPageName = 'default';
```

**Restart your app now to test the finprom-categorisation form!** 🚀
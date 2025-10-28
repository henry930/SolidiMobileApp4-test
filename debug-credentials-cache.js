/**
 * Debug Script: Check Credentials Cache
 * 
 * This script helps debug the credentials cache system.
 * Run this in the React Native debugger console or add it to a debug screen.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export const debugCredentialsCache = async () => {
  console.log('🔍 ========== CREDENTIALS CACHE DEBUG ==========');
  
  try {
    // Check cache file
    const cacheData = await AsyncStorage.getItem('solidi_credentials_cache');
    
    if (cacheData) {
      console.log('✅ Cache file EXISTS');
      const parsed = JSON.parse(cacheData);
      console.log('📄 Cache contents:', {
        email: parsed.email,
        hasApiKey: !!parsed.apiKey,
        hasApiSecret: !!parsed.apiSecret,
        apiKeyLength: parsed.apiKey?.length,
        apiSecretLength: parsed.apiSecret?.length,
        timestamp: new Date(parsed.timestamp).toLocaleString(),
        ageInMinutes: Math.floor((Date.now() - parsed.timestamp) / 60000)
      });
    } else {
      console.log('❌ Cache file DOES NOT EXIST');
    }
    
    // Check auth state
    const authState = await AsyncStorage.getItem('user_authenticated');
    const userEmail = await AsyncStorage.getItem('user_email');
    
    console.log('🔐 Auth state:', authState);
    console.log('📧 Stored email:', userEmail);
    
    // List all AsyncStorage keys
    const allKeys = await AsyncStorage.getAllKeys();
    console.log('🗂️ All AsyncStorage keys:', allKeys);
    
    // Get all credentials-related data
    const credKeys = allKeys.filter(key => 
      key.includes('credentials') || 
      key.includes('auth') || 
      key.includes('solidi') ||
      key.includes('user') ||
      key.includes('keychain')
    );
    
    console.log('🔑 Credentials-related keys:', credKeys);
    
    for (const key of credKeys) {
      const value = await AsyncStorage.getItem(key);
      console.log(`  - ${key}:`, value?.substring(0, 50) + (value?.length > 50 ? '...' : ''));
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
  
  console.log('🔍 ========== END DEBUG ==========');
};

// Function to clear all credentials (for testing)
export const clearAllCredentials = async () => {
  console.log('🗑️ Clearing all credentials...');
  try {
    await AsyncStorage.removeItem('solidi_credentials_cache');
    await AsyncStorage.removeItem('user_authenticated');
    await AsyncStorage.removeItem('user_email');
    console.log('✅ All credentials cleared');
  } catch (error) {
    console.error('❌ Clear error:', error);
  }
};

// Function to manually set test credentials (for testing)
export const setTestCredentials = async () => {
  console.log('🧪 Setting test credentials...');
  try {
    const testData = {
      apiKey: 'TEST_API_KEY_1234567890',
      apiSecret: 'TEST_API_SECRET_1234567890',
      email: 'test@example.com',
      timestamp: Date.now()
    };
    await AsyncStorage.setItem('solidi_credentials_cache', JSON.stringify(testData));
    console.log('✅ Test credentials set');
    await debugCredentialsCache();
  } catch (error) {
    console.error('❌ Set test credentials error:', error);
  }
};

export default {
  debugCredentialsCache,
  clearAllCredentials,
  setTestCredentials
};

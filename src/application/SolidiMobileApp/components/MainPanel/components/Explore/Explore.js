// React imports
import React, { useContext, useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Modal, Text } from 'react-native';

// Internal imports
import AppStateContext from 'src/application/data';
import { colors, sharedStyles, sharedColors } from 'src/constants';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('Explore');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);

let Explore = () => {
  // console.log('🔍 Explore component rendering...');
  let appState = useContext(AppStateContext);
  
  return (
    <View style={[sharedStyles.container, { backgroundColor: sharedColors.background }]}>
      
      <View style={{ padding: 16, backgroundColor: colors.primary }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: 'white', textAlign: 'center' }}>
          Explore - Debug Version
        </Text>
      </View>

      <ScrollView style={{ flex: 1, padding: 16 }}>
        <View style={{ 
          backgroundColor: '#fff',
          borderRadius: 8,
          padding: 16,
          marginVertical: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3
        }}>
          <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12 }}>
            📋 Finprom Categorisation Form
          </Text>
          <Text style={{ color: '#666', lineHeight: 22, marginBottom: 16 }}>
            Complete the finprom categorisation form using local JSON data from src/assets/json/finprom-categorisation.json
          </Text>
          <TouchableOpacity 
            style={{
              backgroundColor: '#17a2b8',
              padding: 12,
              borderRadius: 6,
              alignItems: 'center'
            }}
            onPress={() => {
              console.log('🎯 Navigating to AccountReview...');
              appState.setMainPanelState({
                mainPanelState: 'AccountReview',
                pageName: 'default'
              });
            }}
          >
            <Text style={{ color: 'white', fontWeight: '600' }}>
              Open Categorisation Form
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={{ 
          backgroundColor: '#fff',
          borderRadius: 8,
          padding: 16,
          marginVertical: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3
        }}>
          <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12 }}>
            Crypto Content
          </Text>
          <Text style={{ color: '#666', lineHeight: 22, marginBottom: 16 }}>
            Browse crypto-related content and articles.
          </Text>
          <TouchableOpacity 
            style={{
              backgroundColor: colors.primary,
              padding: 12,
              borderRadius: 6,
              alignItems: 'center'
            }}
            onPress={() => {
              appState.setMainPanelState({
                mainPanelState: 'CryptoContent',
                pageName: 'default'
              });
            }}
          >
            <Text style={{ color: 'white', fontWeight: '600' }}>
              Browse Content
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ 
          backgroundColor: '#fff',
          borderRadius: 8,
          padding: 16,
          marginVertical: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3
        }}>
          <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12 }}>
            🎨 Universal Theme System
          </Text>
          <Text style={{ color: '#666', lineHeight: 22, marginBottom: 16 }}>
            Test the new universal theme system that works across mobile and web platforms.
          </Text>
          <TouchableOpacity 
            style={{
              backgroundColor: '#9c27b0',
              padding: 12,
              borderRadius: 6,
              alignItems: 'center'
            }}
            onPress={() => {
              appState.setMainPanelState({
                mainPanelState: 'ThemeDemo',
                pageName: 'default'
              });
            }}
          >
            <Text style={{ color: 'white', fontWeight: '600' }}>
              Try Theme Demo
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ 
          backgroundColor: '#fff',
          borderRadius: 8,
          padding: 16,
          marginVertical: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3
        }}>
          <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12 }}>
            API & Icon Diagnostics
          </Text>
          <Text style={{ color: '#666', lineHeight: 22, marginBottom: 16 }}>
            Test API connectivity and icon loading to troubleshoot issues.
          </Text>
          <TouchableOpacity 
            style={{
              backgroundColor: '#e74c3c',
              padding: 12,
              borderRadius: 6,
              alignItems: 'center'
            }}
            onPress={() => {
              appState.setMainPanelState({
                mainPanelState: 'Diagnostics',
                pageName: 'default'
              });
            }}
          >
            <Text style={{ color: 'white', fontWeight: '600' }}>
              Run Diagnostics
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});

export default Explore;

// React imports
import React, { useContext, useEffect, useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import SplashScreen from 'react-native-splash-screen';
import { PaperProvider } from 'react-native-paper';

// Internal imports
import { AppStateProvider } from '../data';
import { theme } from '../../constants';

// Logger
import logger from '../../util/logger';
let logger2 = logger.extend('App');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);

let App = () => {
  log('========== start: helloWorld ==========');

  const initialFunction = () => {
    try {
      //log('Start: App.initialFunction')
      return;
    } catch (error) {
      console.error(error);
    } finally {
      //setLoading(false);
    }
  }

  useEffect(() => {
    initialFunction();
    // Hide splash screen immediately for debugging
    try {
      SplashScreen.hide();
    } catch (error) {
      console.log('SplashScreen error:', error);
    }
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.text}>Loading app state...</Text>
      <PaperProvider theme={theme}>
        <AppStateProvider />
      </PaperProvider>
    </SafeAreaView>
  )
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 18,
    color: '#333',
    marginBottom: 20,
  },
});

export default App;

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
    // Wait 0.5 seconds to hide the splash screen, so that we avoid any blank page issues just between the splash screen disappearing and the app screen loading.
    setTimeout(SplashScreen.hide, 500);
  }, []);

  return (
    <PaperProvider theme={theme}>
      <AppStateProvider />
    </PaperProvider>
  )
};




export default App;

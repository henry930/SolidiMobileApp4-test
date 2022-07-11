// React imports
import React, { useContext, useEffect, useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import SplashScreen from 'react-native-splash-screen';

// Internal imports
import { Header, MainPanel, Footer } from './components';
import { AppStateProvider } from 'src/application/data';
import { mainPanelStates, colors } from 'src/constants';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';

// Logger
import logger from 'src/util/logger';
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
    setTimeout(SplashScreen.hide, 500);
  }, []);


  return (
    <AppStateProvider>
      <SafeAreaView style={styles.container}>
        <Header style={styles.header} />
        <MainPanel style={styles.mainPanel} />
        <Footer style={styles.footer} />
      </SafeAreaView>
    </AppStateProvider>
  )
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.defaultBackground,
  },
  header: {
    height: '10%',
  },
  mainPanel: {
    height: '78%',
  },
  footer: {
    height: '12%',
    paddingTop: scaledHeight(5),
  },
})


export default App;

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
import { colors } from 'src/constants';
import { Header, MainPanel, Footer } from './components';
import { AppStateProvider } from 'src/application/data';
import { mainPanelStates } from 'src/constants';

// Misc
log = console.log;
let lj = (x) => console.log(JSON.stringify(x));




let App = () => {


  const helloWorld = async () => {
    try {
      log('========== start: helloWorld')
      return;
    } catch (error) {
      console.error(error);
    } finally {
      //setLoading(false);
    }
  }


  useEffect(() => {
    helloWorld();
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
    width: '100%',
  },
  mainPanel: {
    height: '80%',
  },
  footer: {
    height: '10%',
  },
})


export default App;

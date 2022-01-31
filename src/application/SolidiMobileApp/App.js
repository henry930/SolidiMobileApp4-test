// React imports
import React, { useContext, useEffect, useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

// Internal imports
import { colours } from 'src/constants';
import { Header, Main, Footer } from './components';
import { AppStateProvider } from 'src/application/data';

// Misc
log = console.log;
let lj = (x) => console.log(JSON.stringify(x));




const App = () => {


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
  }, []);


  return (
    <AppStateProvider>
      <SafeAreaView style={styles.container}>
        <Header style={styles.header} />
        <Main style={styles.main} />
        <Footer style={styles.footer} />
      </SafeAreaView>
    </AppStateProvider>
  )
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colours.defaultBackground,
  },
  header: {
    height: '10%',
    width: '100%',
  },
  main: {
    height: '80%',
  },
  footer: {
    height: '10%',
  },
})


export default App;

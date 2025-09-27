// React imports
import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { PaperProvider } from 'react-native-paper';

// Internal imports
import { theme } from '../../constants';

let AppTest = () => {
  return (
    <PaperProvider theme={theme}>
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.text}>Test App - Hello World!</Text>
        </View>
      </SafeAreaView>
    </PaperProvider>
  )
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
});

export default AppTest;
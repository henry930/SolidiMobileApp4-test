import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const TestApp = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>SolidiMobileApp4 Test</Text>
        <Text style={styles.subtitle}>React Native is working!</Text>
        <Text style={styles.text}>If you can see this text, the app is running correctly.</Text>
      </View>
    </SafeAreaView>
  );
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
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    color: '#333333',
    marginBottom: 10,
  },
  text: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
});

export default TestApp;
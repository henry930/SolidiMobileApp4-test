// React imports
import React from 'react';
import { StyleSheet, View } from 'react-native';

// Internal imports
import { SolidiLoadingScreen } from 'src/components/shared';

/**
 * Spinner - Legacy wrapper component that now uses SolidiLoadingScreen
 * This maintains backward compatibility with existing code while
 * providing the new branded loading experience
 */
let Spinner = () => {
  return (
    <View style={styles.container}>
      <SolidiLoadingScreen 
        fullScreen={false}
        size="medium"
        message=""
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: '80%',
    justifyContent: 'center',
  }
});

export default Spinner;
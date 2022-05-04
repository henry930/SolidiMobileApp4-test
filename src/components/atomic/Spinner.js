// React imports
import React, { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, StyleSheet, View } from 'react-native';


let Spinner = () => {
  return (
    <View style={StyleSheet.create({
      height: '80%',
      //borderWidth: 1, //testing
      justifyContent: 'center',
    })}>
      <ActivityIndicator color={'blue'} size={'large'} />
    </View>
  );
}


export default Spinner;
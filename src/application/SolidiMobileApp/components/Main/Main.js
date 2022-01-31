
import React, { Fragment, useState } from 'react';

import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colours } from 'src/constants';

import { MainPanel } from './components';

const Main = (props) => {

  let {style:styleArg} = props;

  return (
    <View style={[styleArg, styles.main]}>
      <MainPanel />
    </View>
  );
};

const styles = StyleSheet.create({
  main: {
    alignItems: 'center',
    backgroundColor: colours.mainPanelBackground,
  },
})

export default Main;

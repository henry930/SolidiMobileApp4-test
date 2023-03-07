// React imports
import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';

// Other imports
import _ from 'lodash';

// Internal imports
import Button from './Button/Button';
import { colors } from 'src/constants';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('FixedWidthButton');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);




let FixedWidthButton = ({styles, ...props}) => {
  //log('Inside FixedWidthButton constructor');
  let styleText = defaultStyle.text;
  let styleView = defaultStyle.view;
  if (! _.isNil(styles)) {
    if (styles.view) {
      styleView = StyleSheet.flatten([styleView, styles.view]);
    }
    if (styles.text) {
      styleText = StyleSheet.flatten([styleText, styles.text]);
    }
  }
  let finalStyles = {view: styleView, text: styleText};
  let x = (
    <View style={[]}>
      <Button styles={finalStyles} {...props} />
    </View>
  );
  return x;
};


let defaultStyle = StyleSheet.create({
  view: {
    height: scaledHeight(45),
    paddingHorizontal: scaledWidth(20),
    borderRadius: scaledWidth(8),
    backgroundColor: colors.standardButton,
    minWidth: '100%',
  },
  text: {
    color: colors.standardButtonText,
    fontWeight: 'bold',
    fontSize: normaliseFont(16),
  },
});


export default FixedWidthButton;

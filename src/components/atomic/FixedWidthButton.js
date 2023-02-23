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
  let y = (
      <Button styles={finalStyles} {...props} />
  );
  let z = (
                <TouchableOpacity activeOpacity={0.95} style={finalStyles.view} {...props}  >
                    <Text style={finalStyles.text}>{props['title']}</Text>
                </TouchableOpacity>
  );
  let x = (
    <View style={styleButtonWrapper}>
      <Button styles={finalStyles} {...props} />
    </View>
  );
  return z;
};


let defaultStyle = StyleSheet.create({
  view: {
    height: scaledHeight(45),
    paddingHorizontal: scaledWidth(20),
    borderRadius: scaledWidth(8),
    backgroundColor: colors.standardButton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  view2: {
    height: scaledHeight(45),
    alignSelf: 'flex-start',
    paddingHorizontal: scaledWidth(20),
    borderRadius: scaledWidth(8),
    backgroundColor: colors.standardButton,
  },
  text: {
    color: colors.standardButtonText,
    fontWeight: 'bold',
    fontSize: normaliseFont(16),
  },
});


// This wrapper view prevents the button expanding to fill the width of the parent view.
let styleButtonWrapper = StyleSheet.create({
  alignSelf: 'flex-start',
});


export default FixedWidthButton;

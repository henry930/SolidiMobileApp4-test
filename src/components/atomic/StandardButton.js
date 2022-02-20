import React from 'react';
import { StyleSheet, View } from 'react-native';
import Button from './Button/Button';
import { colors } from 'src/constants';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';

let StandardButton = (props) => {
  return (
    <View style={styleButtonWrapper}>
      <Button {...props} styles={styles} />
    </View>
  )
};

let styles = StyleSheet.create({
  view: {
    height: scaledHeight(40),
    alignSelf: 'flex-start',
    height: 40,
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

export default StandardButton;

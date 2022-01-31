
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import PropTypes from 'prop-types';

const { style } = StyleSheet.create({
  style: {
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {},
      android: {
        elevation: 4,
        backgroundColor: '#2196F3',
        borderRadius: 2,
      },
    }),
  },
});

const StyledView = ({ disabled, styles, ...rest }) => {
  const combinedStyles = StyleSheet.flatten([style, styles]);

  return <View style={combinedStyles} {...rest} />;
};

StyledView.defaultProps = {
  styles: {},
};

StyledView.propTypes = {
  disabled: PropTypes.bool.isRequired,
  styles: PropTypes.object,
};

export default StyledView;

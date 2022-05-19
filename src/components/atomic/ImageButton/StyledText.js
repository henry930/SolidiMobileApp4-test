
import React from 'react';
import { Platform, StyleSheet, Text } from 'react-native';
import PropTypes from 'prop-types';

const { style } = StyleSheet.create({
  style: {
    textAlign: 'center',
    margin: 4,
    padding: 0,
    ...Platform.select({
      ios: {
        color: '#007AFF',
        fontSize: 16,
      },
      android: {
        color: 'white',
        fontWeight: '500',
      },
    }),
  },
});

const StyledText = ({ disabled, styles, ...rest }) => {
  const combinedStyles = StyleSheet.flatten([style, styles]);

  return (
    <Text style={combinedStyles} {...rest} />
  );
};

StyledText.defaultProps = {
  styles: {},
};

StyledText.propTypes = {
  disabled: PropTypes.bool.isRequired,
  styles: PropTypes.object,
};

export default StyledText;

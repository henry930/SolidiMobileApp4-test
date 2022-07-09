// React imports
import React from 'react';
import { Platform, StyleSheet, Text } from 'react-native';
import PropTypes from 'prop-types';

// Other imports
import _ from 'lodash';

// Internal imports
import { colors } from 'src/constants';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('Button');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);




let { style } = StyleSheet.create({
  style: {
    textAlign: 'center',
    margin: 4,
    padding: 4,
    //borderWidth: 1, //testing
    color: colors.buttonText,
    ...Platform.select({
      ios: {
        fontSize: normaliseFont(12),
      },
      android: {
        //fontSize: normaliseFont(14), // maybe need this in future
        fontWeight: '500',
      },
    }),
  },
});


let StyledText = ({ disabled, styles, ...rest }) => {
  let combinedStyles = StyleSheet.flatten([style, styles]);

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

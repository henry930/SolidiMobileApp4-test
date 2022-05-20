/* Notes:
- We use a TouchableHighlight (instead of TouchableOpacity), so that we get a background color change on press but not afterwards.
-- Future: On Android, does the TouchableNativeFeedback need to changed to something else ?
- The image is required.
- The text title is optional.
- This module has been expanded to also handle FontAwesome icons.
*/


// React imports
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import PropTypes from 'prop-types';
import { Platform, TouchableHighlight, TouchableNativeFeedback } from 'react-native';

// Other imports
import _ from 'lodash';
import Icon from 'react-native-vector-icons/FontAwesome';

// Internal imports
import StyledView from './StyledView';
import StyledImage from './StyledImage';
import StyledText from './StyledText';
import { colors } from 'src/constants';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('ImageButton');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);




let ImageButton = ({
  title,
  disabled,
  styles,
  imageName,
  imageType,
  ...rest
}) => {
  let Touchable = Platform.select({
    ios: TouchableHighlight,
    android: TouchableNativeFeedback,
  });

  let titleExists = !!title;

  // Defaults:
  let iconSize = 30;
  let iconColor = colors.greyedOutIcon;

  // Check for arguments:
  if (! _.isUndefined(styles.image) && ! _.isUndefined(styles.image.iconSize))
    iconSize = styles.image.iconSize;
  if (! _.isUndefined(styles.image) && ! _.isUndefined(styles.image.iconColor))
    iconColor = styles.image.iconColor;

  // Add some default styling to the View.
  let styleView = defaultStyle.view;
  if (! _.isNil(styles)) {
    if (styles.view) {
      styleView = StyleSheet.flatten([styleView, styles.view]);
    }
  }


  return (
    <Touchable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      style={styles.touchable}
      activeOpacity={0.8}
      underlayColor="#DDDDDD"
      {...rest}
    >
      <View>
        <StyledView disabled={disabled} styles={styleView}>
          { imageType === 'image' &&
            <StyledImage imageName={imageName} disabled={disabled} styles={styles.image} />
          }
          { imageType === 'icon' &&
            <Icon name={imageName} size={iconSize} color={iconColor} />
          }
          { titleExists &&
            <StyledText disabled={disabled} styles={styles.text}>
              {title}
            </StyledText>
          }
        </StyledView>
      </View>
    </Touchable>
  );
};


let defaultStyle = {
  view: {
    // Elevation is set to 0 to avoid a slight drop-shadow on the ImageButton's internal View on Android.
    elevation: 0,
    backgroundColor: colors.defaultBackground,
  }
}


ImageButton.defaultProps = {
  disabled: false,
  imageType: 'image',
  styles: {
    touchable: {},
    view: {},
    image: {},
    text: {},
  },
};


ImageButton.propTypes = {
  imageName: PropTypes.string.isRequired,
  imageType: PropTypes.string,
  title: PropTypes.string,
  disabled: PropTypes.bool,
  styles: PropTypes.shape({
    touchable: PropTypes.object,
    image: PropTypes.object,
    view: PropTypes.object,
    text: PropTypes.object,
  }),
};


export default ImageButton;

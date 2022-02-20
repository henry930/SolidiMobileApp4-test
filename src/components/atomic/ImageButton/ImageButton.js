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
import { colours } from 'src/constants';
import StyledView from './StyledView';
import StyledImage from './StyledImage';
import StyledText from './StyledText';


const ImageButton = ({
  title,
  disabled,
  styles,
  imageName,
  imageType,
  ...rest
}) => {
  const Touchable = Platform.select({
    ios: TouchableHighlight,
    android: TouchableNativeFeedback,
  });

  let titleExists = !!title;

  // Defaults:
  let iconSize = 30;
  let iconColor = colours.greyedOutIcon;

  // Check for arguments:
  if (! _.isUndefined(styles.image) && ! _.isUndefined(styles.image.iconSize))
    iconSize = styles.image.iconSize;
  if (! _.isUndefined(styles.image) && ! _.isUndefined(styles.image.iconColor))
    iconColor = styles.image.iconColor;


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
        <StyledView disabled={disabled} styles={styles.view}>
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

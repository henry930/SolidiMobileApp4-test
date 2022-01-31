import { Dimensions, Platform, PixelRatio } from 'react-native';

let {
  width: screenWidth,
  height: screenHeight,
} = Dimensions.get('window');

// Base values are based on the iPhone 13 (iOS 15) simulator.
let baseScreenWidth = 390;
let baseScreenHeight= 844;
let horizontalScale = screenWidth / baseScreenWidth;
let verticalScale = screenHeight / baseScreenHeight;
let scaledWidth = (x) => { return x * horizontalScale };
let scaledHeight = (x) => { return x * verticalScale };
let normaliseFont = (fontSize) => {
  let newFontSize = fontSize * horizontalScale;
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newFontSize))
  } else {
    return Math.round(PixelRatio.roundToNearestPixel(newFontSize)) - 2
  }
}

export {
  screenWidth,
  screenHeight,
  baseScreenWidth,
  baseScreenHeight,
  horizontalScale,
  verticalScale,
  scaledWidth,
  scaledHeight,
  normaliseFont,
}

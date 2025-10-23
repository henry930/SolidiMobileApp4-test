// CRITICAL: Apply NativeEventEmitter fixes FIRST
import './src/fixes/NativeEventEmitterFix';

import {AppRegistry} from 'react-native';
import ApplicationRoot from './src/application';
import {name as appName} from './app.json';

// Disable React Native Inspector to prevent FlatList getItem errors
if (__DEV__) {
  // Simple console disabling
  console.disableYellowBox = true;
  
  // Disable LogBox and NativeEventEmitter warnings
  try {
    const {LogBox} = require('react-native');
    if (LogBox) {
      LogBox.ignoreAllLogs(true);
      // Specifically ignore all common warnings
      LogBox.ignoreLogs([
        'new NativeEventEmitter',
        'Invariant Violation: "new NativeEventEmitter()" requires a non-null argument',
        'NativeEventEmitter was called with a non-null argument',
        'ColorPropType will be removed from React Native',
        'EdgeInsetsPropType will be removed from React Native',
        'PointPropType will be removed from React Native', 
        'ViewPropTypes will be removed from React Native',
        'ProgressBarAndroid has been extracted from react-native core',
        'Clipboard has been extracted from react-native core',
        'PushNotificationIOS has been extracted from react-native core',
        'AppState.removeEventListener is not a function',
        'removeEventListener',
        'addEventListener',
        'BVLinearGradient',
        'requireNativeComponent',
        'LinearGradient'
      ]);
    }
  } catch (e) {
    // LogBox not available
  }
}

AppRegistry.registerComponent(appName, () => ApplicationRoot);

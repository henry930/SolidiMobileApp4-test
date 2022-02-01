// React imports
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  StyleSheet,
  Dimensions,
  Text,
  View
} from 'react-native';
//import PINCode from '@haskkor/react-native-pincode'


// Other imports
import _ from 'lodash';

// Internal imports
import { screenWidth, screenHeight } from 'src/util/dimensions';

import Icon from 'react-native-vector-icons/FontAwesome';


import * as Keychain from 'react-native-keychain';

let x = async () => {
  const username = 'zuck';
  const password = 'poniesRgr8';

  console.log('=====')

  // Store the credentials
  await Keychain.setGenericPassword(username, password);

  try {
    // Retrieve the credentials
    const credentials = await Keychain.getGenericPassword();
    if (credentials) {
      console.log(
        'Credentials successfully loaded for user ' + credentials.username
      );
    } else {
      console.log('No credentials stored');
    }
  } catch (error) {
    console.log("Keychain couldn't be accessed!", error);
  }
  await Keychain.resetGenericPassword();
};

x();

console.log('foo')



let PIN = () => {

  let [displayPIN, setDisplayPIN] = useState(false);

  return (
    <View>
    <Text>foo</Text>
    <Icon name="rocket" size={30} color="#900" />
    </View>
  )

}


let styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF'
  },
});


export default PIN;

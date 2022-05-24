// React imports
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Text, TextInput, StyleSheet, View, ScrollView } from 'react-native';

// Other imports
import _ from 'lodash';
import Big from 'big.js';

// Internal imports
import AppStateContext from 'src/application/data';
import { mainPanelStates, colors } from 'src/constants';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import { Button, StandardButton, ImageButton, Spinner } from 'src/components/atomic';
import misc from 'src/util/misc';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('Security');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);


/* Notes


*/




let Security = () => {

  let appState = useContext(AppStateContext);
  let [renderCount, triggerRender] = useState(0);
  let firstRender = misc.useFirstRender();
  let stateChangeID = appState.stateChangeID;

  let pageName = appState.pageName;
  let permittedPageNames = 'default'.split(' ');
  misc.confirmItemInArray('permittedPageNames', permittedPageNames, pageName, 'Security');

  let [passwordVisible, setPasswordVisible] = useState(false);
  let [pinVisible, setPINVisible] = useState(false);


  // Initial setup.
  useEffect( () => {
    setup();
  }, []); // Pass empty array so that this only runs once on mount.


  let setup = async () => {
    try {
      await appState.loadInitialStuffAboutUser();
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
      triggerRender(renderCount+1);
    } catch(err) {
      let msg = `Security.setup: Error = ${err}`;
      console.log(msg);
    }
  }


  let getPasswordButtonTitle = () => {
    let title = passwordVisible ? 'Hide password' : 'Show password';
    return title;
  }


  let getPINButtonTitle = () => {
    let title = pinVisible ? 'Hide PIN' : 'Show PIN';
    return title;
  }


  return (
    <View style={styles.panelContainer}>
    <View style={styles.panelSubContainer}>

      <View style={[styles.heading, styles.heading1]}>
        <Text style={styles.headingText}>Security</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={true} style={styles.mainScrollView}>

      <View style={styles.detail}>
        <View style={styles.detailName}>
          <Text style={styles.detailNameText}>{`\u2022  `}Password</Text>
        </View>
        <View>
          <TextInput
            name='password'
            value={appState.user.password}
            style={[styles.detailValue, styles.secretTextInput]}
            onEndEditing = {event => {
              let value = event.nativeEvent.text;
              //updateUserData({detail:'password', value});
            }}
            autoCapitalize='none'
            autoCorrect={false}
            textContentType='newPassword'
            secureTextEntry={! passwordVisible}
            editable={false}
          />
        </View>
      </View>

      <View style={styles.buttonWrapper}>
        <StandardButton title={getPasswordButtonTitle()}
          onPress={ () => { setPasswordVisible(! passwordVisible) } }
        />
      </View>

      <View style={styles.detail}>
        <View style={styles.detailName}>
          <Text style={styles.detailNameText}>{`\u2022  `}PIN</Text>
        </View>
        <View>
          <TextInput
            name='pin'
            value={appState.user.pin}
            style={[styles.detailValue, styles.secretTextInput]}
            textContentType='newPassword'
            secureTextEntry={! pinVisible}
            editable={false}
          />
        </View>
      </View>

      <View style={styles.buttonWrapper}>
        <StandardButton title={getPINButtonTitle()}
          onPress={ () => { setPINVisible(! pinVisible) } }
        />
      </View>

      <View style={styles.buttonWrapper}>
        <StandardButton title='Change PIN' onPress={ () => {
          appState.stashCurrentState()
          appState.choosePIN();
        } } />
      </View>

      </ScrollView>

    </View>
    </View>
  )

}


let styles = StyleSheet.create({
  panelContainer: {
    paddingHorizontal: scaledWidth(15),
    paddingVertical: scaledHeight(5),
    width: '100%',
    height: '100%',
    //borderWidth: 1, // testing
  },
  panelSubContainer: {
    //paddingTop: scaledHeight(10),
    //paddingHorizontal: scaledWidth(30),
    height: '100%',
    //borderWidth: 1, // testing
  },
  heading: {
    alignItems: 'center',
  },
  heading1: {
    marginTop: scaledHeight(10),
    marginBottom: scaledHeight(20),
  },
  headingText: {
    fontSize: normaliseFont(20),
    fontWeight: 'bold',
  },
  bold: {
    fontWeight: 'bold',
  },
  detail: {
    //borderWidth: 1, // testing
    marginTop: scaledHeight(20),
    flexDirection: 'row',
    flexWrap: 'wrap', // Allows long detail value to move onto the next line.
    alignItems: 'center',
  },
  detailName: {
    paddingRight: scaledWidth(10),
    paddingVertical: scaledHeight(10),
    minWidth: '35%', // Expands with length of detail name.
    //borderWidth: 1, // testing
  },
  detailNameText: {
    fontSize: normaliseFont(16),
    fontWeight: 'bold',
  },
  detailValue: {
    paddingLeft: scaledWidth(10),
    paddingVertical: scaledHeight(10),
    minWidth: '65%',
    //borderWidth: 1, // testing
  },
  detailValueText: {
    fontSize: normaliseFont(16),
    //borderWidth: 1, // testing
  },
  secretTextInput: {
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#d7d7d7',
  },
  buttonWrapper: {
    //borderWidth: 1,
    paddingRight: scaledWidth(40),
    marginTop: scaledHeight(10),
    width: '100%',
  },
});


export default Security;

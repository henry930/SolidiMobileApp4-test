// React imports
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Linking, Text, StyleSheet, View, ScrollView, Image } from 'react-native';

// Other imports
import _ from 'lodash';
import Big from 'big.js';

// Internal imports
import AppStateContext from 'src/application/data';
import { mainPanelStates, colors } from 'src/constants';
import { scaledWidth, scaledHeight, baseScreenWidth, baseScreenHeight, normaliseFont } from 'src/util/dimensions';
import { Button, StandardButton, FixedWidthButton, ImageButton, Spinner } from 'src/components/atomic';
import misc from 'src/util/misc';
import ImageLookup from 'src/images';
import { Dimensions, Platform, PixelRatio } from 'react-native';


// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('UpdateApp');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);


/* Notes


*/




let UpdateApp = () => {

  let appState = useContext(AppStateContext);
  let [renderCount, triggerRender] = useState(0);
  let firstRender = misc.useFirstRender();
  let stateChangeID = appState.stateChangeID;

  let pageName = appState.pageName;
  let permittedPageNames = 'default'.split(' ');
  misc.confirmItemInArray('permittedPageNames', permittedPageNames, pageName, 'UpdateApp');


  let androidLink = "https://play.google.com/store/apps/details?id=com.solidimobileapp4";
  let iosLink = "itms-apps://apps.apple.com/us/app/solidi/id1616714706";

  let updateLink = androidLink;
  if(Platform.OS==='ios') {
    updateLink = iosLink;
  }

  // Initial setup.
  useEffect( () => {
    setup();
  }, []); // Pass empty array so that this only runs once on mount.


  let setup = async () => {
    try {
      await appState.generalSetup();
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
      triggerRender(renderCount+1);
    } catch(err) {
      let msg = `Error.setup: Error = ${err}`;
      console.log(msg);
    }
  }

  let logoImageName = 'updaterequired';

  let r1 = (
    <View style={styles.panelContainer}>
    <View style={styles.panelSubContainer}>



      <View style={[styles.heading, styles.heading1]}>
        <Image source={ImageLookup[logoImageName]} resizeMode='contain' style={updateImage.image} />

        <Text style={styles.headingText}>Its time to update!</Text>
        <Text></Text>
        <Text style={styles.basicText}>We've got some great new features for you in the latest version of the app.</Text>
        <Text></Text>
        <Text style={styles.basicText}>Click below to visit your App Store and update.</Text>
        <Text></Text>
 
        <View style={styles.buttonWrapper}>
          <FixedWidthButton styles={styleButton} title='Update App'
              onPress={ () => {
                //Linking.openURL(updateLink)
                console.log("opening "+updateLink);
                Linking.canOpenURL(updateLink).then(supported => {
                  console.log("Opening....");
                  supported && Linking.openURL(updateLink);
                }, (err) => console.log(err));
              } }
          />
        </View>   

      </View>

    </View>

    <View style={styles.footerlink}>
      <Text style={[styles.basicText, styles.bold]}>{appState.domain}</Text>
    </View>


    </View>
  )


  return r1;

}


let styles = StyleSheet.create({
  panelContainer: {
    width: '100%',
    height: '100%',
//    backgroundColor: "red"
  },
  panelSubContainer: {
    paddingHorizontal: scaledWidth(15),
    paddingVertical: scaledHeight(5),
    paddingTop: scaledHeight(10),
    paddingHorizontal: scaledWidth(30),
    height: '100%',
    //borderWidth: 1, // testing
  },
  heading: {
    alignItems: 'center',
  },
  heading1: {
    marginTop: scaledHeight(10),
    alignItems: 'center',
    top: '25%',
    width:'100%',

  },
  headingText: {
    fontSize: normaliseFont(28),
    fontWeight: 'bold',
    textAlign: 'center',
  },
  basicText: {
    fontSize: normaliseFont(20),
    textAlign: 'center',
  },
  bold: {
    fontWeight: 'bold',
  },
  footerlink: {
    width: '100%',
    position: 'absolute',
    bottom: 0,
    textAlign: 'center',
  },
  expandToParent: {
    height: '100%',
    width: '100%',
  },  
});


let styleButton = StyleSheet.create({
  view: {
    width: '70%',

  },
});

const {width, height} = Image.resolveAssetSource(ImageLookup['updaterequired']);
let nheight = baseScreenWidth * (height/width);

let updateImage = StyleSheet.create({
  image: {
    width: baseScreenWidth*0.3,
    height: nheight*0.3,
  }

});

export default UpdateApp;

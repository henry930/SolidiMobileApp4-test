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
let logger2 = logger.extend('Maintenance');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);


/* Notes


*/




let Maintenance = () => {

  let appState = useContext(AppStateContext);
  let [renderCount, triggerRender] = useState(0);
  let firstRender = misc.useFirstRender();
  let stateChangeID = appState.stateChangeID;

  let pageName = appState.pageName;
  let permittedPageNames = 'default'.split(' ');
  misc.confirmItemInArray('permittedPageNames', permittedPageNames, pageName, 'Maintenance');


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

  let logoImageName = 'maintenance';

  let blogposts = [
    {"id":1,
     "title":"Solidi receives FCA CryptoAssets license",
     "url":"https://blog.solidi.co/2021/08/11/solidi-gains-full-fca-cryptoassets-registration/"},
    {"id":2,
     "title":"Securely storing your crypto",
     "url":"https://blog.solidi.co/2020/07/14/securely-storing-your-crypto/"},
    {"id":3,
     "title":"How we keep your funds safe",
     "url":"https://blog.solidi.co/2022/10/13/how-we-keep-your-funds-safe/"},

     
  ];

  return (
    <View style={styles.panelContainer}>
    <View style={styles.panelSubContainer}>

      <View style={[styles.heading, styles.heading1]}>
        <Text style={styles.headingText}>We're upgrading Solidi!</Text>
      </View>

      <Text style={[styles.bold, styles.basicText]}>{'\n'}Sometimes, upgrades require a little downtime!</Text>
      <Text style={[             styles.basicText]}>{'\n'}Rest assured out engineers are working hard to get new features to you.</Text>
      <Text style={[             styles.basicText]}>{'\n'}Site upgrades should take less than an hour.</Text>
 
      <View style={styles.infoSection}>
          <Text style={styles.basicText}>While you are waiting, why not check out some of our amazing blog posts to learn more about the exciting wolrd of crypto investing.{'\n'}</Text>

        {blogposts.map((prop, key) => {
          return (<View style={styles.bloglink}><Button title={prop['title']}
            onPress={ () => { Linking.openURL(prop['url']) } }
            styles={styleContactUsButton}
          /></View> )
        })}

      </View>

      <Text></Text>
      <Text></Text>
      <Text></Text>
      <Text></Text>
      <Text style={[styles.bold, styles.basicText]}>Click below to retry Solidi</Text>
      <Text></Text>
       <View style={styles.buttonWrapper}>
        <FixedWidthButton styles={styleButton} title='Retry'
          onPress={ async () => { 
            log(`MM=${appState.maintenanceMode}`);
            let res = await appState.checkMaintenanceMode();
            if(res) {
              log('still updating');
            }
          } }
        />
      </View>   

       <Image source={ImageLookup[logoImageName]} resizeMode='contain' style={craneImage.image} />

        <View style={styles.footerlink}>
          <Text style={[styles.basicText, styles.bold]}>{appState.domain}</Text>
        </View>

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
    backgroundColor: undefined
  },
  panelSubContainer: {
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
  },
  headingText: {
    fontSize: normaliseFont(20),
    fontWeight: 'bold',
  },
  basicText: {
    fontSize: normaliseFont(14),
  },
  bold: {
    fontWeight: 'bold',
  },
  infoSection: {
    paddingTop: scaledHeight(20),
    alignItems: 'flex-start',
  },
  infoItem: {
    marginBottom: scaledHeight(5),
  },
  logo: {
    flex: 1,
    width: '100%',
    height: null,
    resizeMode: 'contain',
    //borderWidth: 1, //testing
  },
  bloglink: {
    marginTop: 20.
  }
  ,
  footerlink: {
        position: 'absolute',
    bottom: 0.
  }
});


let styleContactUsButton = StyleSheet.create({
  text: {
    margin: 0,
    padding: 0,
  },
});

let styleButton = StyleSheet.create({
  view: {
    width: '70%',

  },
});

const {width, height} = Image.resolveAssetSource(ImageLookup['maintenance']);
let nheight = baseScreenWidth * (height/width);

let craneImage = StyleSheet.create({
  image: {
    position: 'absolute',
    width: baseScreenWidth*1.2,
    height: nheight*1.2,
    bottom: -40,
    left: 30,

    // Move image behind button
    zIndex: -3, // works on ios
    elevation: -3, // works on android

  }

});

export default Maintenance;

// React imports
import React, { useContext, useEffect, useState } from 'react';
import { Text, ScrollView, StyleSheet, View } from 'react-native';

// Other imports
import _ from 'lodash';
import Big from 'big.js';

// Internal imports
import AppStateContext from 'src/application/data';
import { assetsInfo, mainPanelStates, colors } from 'src/constants';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import { Button, StandardButton, ImageButton } from 'src/components/atomic';
import misc from 'src/util/misc';




let Settings = () => {

  let appState = useContext(AppStateContext);

  let d = appState.user.info.user; // 'd' == 'data'

  return (
    <View style={styles.panelContainer}>
    <View style={styles.panelSubContainer}>

      <View style={[styles.heading, styles.heading1]}>
        <Text style={styles.headingText}>Settings</Text>
      </View>

      <ScrollView style={styles.scrollView}>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionHeadingText}>Personal Details</Text>
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingName}>
            <Text style={styles.settingNameText}>{`\u2022  `}First Name</Text>
          </View>
          <View style={styles.settingValue}>
            <Text style={styles.settingValueText}>{d.firstname}</Text>
          </View>
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingName}>
            <Text style={styles.settingNameText}>{`\u2022  `}Last Name</Text>
          </View>
          <View style={styles.settingValue}>
            <Text style={styles.settingValueText}>{d.lastname}</Text>
          </View>
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingName}>
            <Text style={styles.settingNameText}>{`\u2022  `}Country of Citizenship</Text>
          </View>
          <View style={styles.settingValue}>
            <Text style={styles.settingValueText}></Text>
          </View>
        </View>

        <View style={styles.horizontalRule} />

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionHeadingText}>Contact Details</Text>
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingName}>
            <Text style={styles.settingNameText}>{`\u2022  `}Email</Text>
          </View>
          <View style={styles.settingValue}>
            <Text style={styles.settingValueText}>{d.email}</Text>
          </View>
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingName}>
            <Text style={styles.settingNameText}>{`\u2022  `}Mobile Phone</Text>
          </View>
          <View style={styles.settingValue}>
            <Text style={styles.settingValueText}>{d.mobile}</Text>
          </View>
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingName}>
            <Text style={styles.settingNameText}>{`\u2022  `}Landline Phone</Text>
          </View>
          <View style={styles.settingValue}>
            <Text style={styles.settingValueText}>{d.landline}</Text>
          </View>
        </View>

        <View style={styles.horizontalRule} />

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionHeadingText}>Address Details</Text>
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingName}>
            <Text style={styles.settingNameText}>{`\u2022  `}Address</Text>
          </View>
          <View style={styles.settingValue}>
            <Text style={styles.settingValueText}>{d.address_1}</Text>
          </View>
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingName}>
            <Text style={styles.settingNameText}></Text>
          </View>
          <View style={styles.settingValue}>
            <Text style={styles.settingValueText}>{d.address_2}</Text>
          </View>
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingName}>
            <Text style={styles.settingNameText}></Text>
          </View>
          <View style={styles.settingValue}>
            <Text style={styles.settingValueText}>{d.address_3}</Text>
          </View>
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingName}>
            <Text style={styles.settingNameText}></Text>
          </View>
          <View style={styles.settingValue}>
            <Text style={styles.settingValueText}>{d.address_4}</Text>
          </View>
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingName}>
            <Text style={styles.settingNameText}>Postcode</Text>
          </View>
          <View style={styles.settingValue}>
            <Text style={styles.settingValueText}>{d.postcode}</Text>
          </View>
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingName}>
            <Text style={styles.settingNameText}>Country</Text>
          </View>
          <View style={styles.settingValue}>
            <Text style={styles.settingValueText}>{d.country}</Text>
          </View>
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
  },
  panelSubContainer: {
    //paddingTop: scaledHeight(10),
    //paddingHorizontal: scaledWidth(30),
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
  scrollView: {
    //borderWidth: 1, // testing
    height: '90%',
  },
  bold: {
    fontWeight: 'bold',
  },
  sectionHeading: {
    marginTop: scaledHeight(20),
    marginBottom: scaledHeight(20),
  },
  sectionHeadingText: {
    fontSize: normaliseFont(16),
    fontWeight: 'bold',
  },
  settingItem: {
    //borderWidth: 1, // testing
    marginBottom: scaledHeight(10),
    flexDirection: 'row',
    flexWrap: 'wrap', // Allows long setting value to move onto the next line.
  },
  settingName: {
    paddingRight: scaledWidth(10),
    paddingVertical: scaledHeight(10),
    //borderWidth: 1, // testing
    minWidth: '40%', // Expands with length of setting name.
  },
  settingNameText: {
    fontSize: normaliseFont(16),
    fontWeight: 'bold',
  },
  settingValue: {
    paddingLeft: scaledWidth(10),
    paddingVertical: scaledHeight(10),
    borderWidth: 1,
    borderRadius: 16,
    borderColor: colors.greyedOutIcon,
    minWidth: '50%',
  },
  settingValueText: {
    fontSize: normaliseFont(16),
  },
  horizontalRule: {
    borderWidth: 1,
    borderBottomColor: 'black',
    borderBottomWidth: 1,
    marginTop: scaledWidth(20),
    marginHorizontal: scaledWidth(20),
  },
});


export default Settings;

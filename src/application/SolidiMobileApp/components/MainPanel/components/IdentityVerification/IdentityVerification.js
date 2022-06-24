// React imports
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Text, StyleSheet, View, ScrollView } from 'react-native';

// Other imports
import _ from 'lodash';
import Big from 'big.js';
import DropDownPicker from 'react-native-dropdown-picker';
import {launchCamera} from 'react-native-image-picker';
import RNFS from 'react-native-fs';

// Internal imports
import AppStateContext from 'src/application/data';
import { mainPanelStates, colors } from 'src/constants';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import { Button, StandardButton, ImageButton, Spinner } from 'src/components/atomic';
import misc from 'src/util/misc';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('IdentityVerification');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);


/* Notes

After the user has uploaded:
- identity document
- proof of address document
it's possible that: we will reject one of them but not both. So: One is accepted, but we ask the user to upload another document for the other requirement.

We therefore design the page so that we can ask the user to only upload one of the documents again.

Future: If the documents have already been uploaded, show the types of uploaded documents.

Future: If a specific document has already been used for identity, and been accepted, it should then be rejected if the user tries to submit it as proof of address.

*/




let IdentityVerification = () => {

  let appState = useContext(AppStateContext);
  let [renderCount, triggerRender] = useState(0);
  let firstRender = misc.useFirstRender();
  let stateChangeID = appState.stateChangeID;
  let [isLoading, setIsLoading] = useState(true);

  let pageName = appState.pageName;
  let permittedPageNames = 'default'.split(' ');
  misc.confirmItemInArray('permittedPageNames', permittedPageNames, pageName, 'IdentityVerification');

  // State
  let [identityVerificationDetails, SetIdentityVerificationDetails] = useState({identityDocument: null, proofOfAddress: null});

  // Future: Load this from the API ?
  let identityDocumentTypes = {
    passportUK: 'UK Passport',
    passportInternational: 'International Passport',
    photocardDriversLicenceUK: `UK Driver's Licence photocard`,
  }
  let addressDocumentTypes = {
    photocardDriversLicenceUK: `UK Driver's Licence photocard`,
    councilTaxBill: 'Council Tax Bill (max 3 months old)',
    utilityBill: 'Utility Bill (excluding mobile phone / TV licence) (max 3 months old)',
    bankStatement: 'Bank / Building Society statement (max 3 months old)',
    mortgageStatement: 'Mortgage statement (max 12 months old)',
    taxNotification: 'HMRC Tax Notification (excluding P60) (max 12 months old)',
  }
  let identityDocumentNames = _.keys(identityDocumentTypes).sort();
  let addressDocumentNames = _.keys(addressDocumentTypes).sort();

  // Function that derives dropdown properties from a document list.
  let deriveDropdownItems = (documentNames, documentCategory) => {
    return documentNames.map(documentName => {
      let lookup = documentCategory == 'identity' ? identityDocumentTypes : addressDocumentTypes;
      let description = lookup[documentName];
      let dropdownItem = {
        label: description,
        value: documentName,
      }
      return dropdownItem;
    });
  }
  let generateIdentityDropdownItems = () => { return deriveDropdownItems(identityDocumentNames, 'identity') }
  let generateAddressDropdownItems = () => { return deriveDropdownItems(addressDocumentNames, 'address') }


  // Dropdown state: Select identity document type
  // ID = IdentityDocument
  let selectedIDType = 'passportUK'; // initial state
  let [openIDType, setOpenIDType] = useState(false);
  let [idType, setIDType] = useState(selectedIDType);
  let [itemsIDType, setItemsIDType] = useState(generateIdentityDropdownItems());


  // Dropdown state: Select address document type
  // AD = AddressDocument
  let selectedADType = 'photocardDriversLicenceUK'; // initial state
  let [openADType, setOpenADType] = useState(false);
  let [adType, setADType] = useState(selectedADType);
  let [itemsADType, setItemsADType] = useState(generateAddressDropdownItems());


  // Message state
  let [uploadPhoto1Message, setUploadPhoto1Message] = useState('');
  let [uploadPhoto2Message, setUploadPhoto2Message] = useState('');
  let [errorMessage, setErrorMessage] = useState('');


  // Button state
  let [disablePhoto1Buttons, setDisablePhoto1Buttons] = useState(false);
  let [disablePhoto2Buttons, setDisablePhoto2Buttons] = useState(false);




  // Initial setup.
  useEffect( () => {
    setup();
  }, []); // Pass empty array so that this only runs once on mount.


  let setup = async () => {
    try {
      await appState.generalSetup();
      let xDetails = await appState.fetchIdentityVerificationDetails();
      lj({xDetails})
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
      setIsLoading(false);
      SetIdentityVerificationDetails(xDetails);
      triggerRender(renderCount+1);
    } catch(err) {
      let msg = `IdentityVerification.setup: Error = ${err}`;
      console.log(msg);
    }
  }


  // We look up the status of an existing document on the server.
  let getDocumentStatus = (documentCategory) => {
    let x = documentCategory == 'identity' ? 'identityDocument' : 'addressDocument';
    if (_.has(identityVerificationDetails, x)) {
      if (! _.isNil(identityVerificationDetails[x])) {
        return identityVerificationDetails[x];
      }
    }
    return false;
  }


  let identityDocumentStatus = () => {
    return getDocumentStatus('identity')
  }


  let addressDocumentStatus = () => { return getDocumentStatus('address') }


  // We look up the document type of an existing document on the server.
  let getDocumentType = (documentCategory) => {
    let x = documentCategory == 'identity' ? 'identityDocumentType' : 'addressDocumentType';
    if (_.has(identityVerificationDetails, x)) {
      if (! _.isNil(identityVerificationDetails[x])) {
        return identityVerificationDetails[x];
      }
    }
    return false;
  }


  let generateTaskDescriptionString = () => {
    // Output for 'both are not uploaded' case:
    // 'Please upload two documents to verify your identity and your address. You must use a different document for each choice.'
    let iStatus = identityDocumentStatus();
    let aStatus = addressDocumentStatus();
    let s = 'Please upload';
    if (! iStatus && ! aStatus) {
      s += ' two documents';
    } else {
      s += ' one document';
    }
    s += ' to verify';
    if (! iStatus && ! aStatus) {
      s += ' your identity and your address.';
    } else if (! iStatus) {
      s += ' your identity.';
    } else if (! aStatus) {
      s += ' your address.';
    }
    if (! iStatus && ! aStatus) {
      s += ' You must use a different document for each choice.'
    }
    return s;
  }


  let generateDocumentStatusString = (documentCategory) => {
    let dStatus = getDocumentStatus(documentCategory);
    let dType = getDocumentType(documentCategory);
    let s;
    let description = '';
    let description2 = '';
    if (dType) {
      description = identityDocumentTypes[dType];
      description2 = `(${description}) `;
    }
    if (dStatus == 'processing') {
      s = `\u2022  Your ${documentCategory} document ${description2}is in our task queue. We'll send you an email notification when it's been processed.\n\n`;
    } else if (dStatus == 'verified') {
      s = `\u2022  Your ${documentCategory} document ${description2}has been processed and accepted. Thank you.\n\n`;
    }
    return s;
  }


  let takePhotoOfDocument = async (documentCategory) => {
    log('Taking photo...');
    let options = {
      mediaType: 'photo',
      cameraType: 'back',
    }
    let result = await launchCamera(options);
    // Future: Handle the case where the user clicks "Cancel" after going into the Camera app.
    if (appState.stateChangeIDHasChanged(stateChangeID)) return;
    //lj({result});
    // Note from docs: Image/video captured via camera will be stored in temporary folder so will be deleted any time, so don't expect it to persist.
    // Example results:
    /*
    iOS
{"assets":[{"fileSize":5169332,"height":4032,"uri":"file:///var/mobile/Containers/Data/Application/6B354087-5CA1-4560-A7E3-237CB8504DA4/tmp/EC710A32-F187-40EF-ACDD-A49CCF64E6B5.jpg","type":"image/jpg","fileName":"EC710A32-F187-40EF-ACDD-A49CCF64E6B5.jpg","width":3024}]}

    Android:
{"assets":[{"height":4160,"width":3120,"type":"image/jpeg","fileName":"rn_image_picker_lib_temp_1505c1a0-e458-455e-a038-7959e521cc95.jpg","fileSize":3564018,"uri":"file:///data/user/0/com.solidimobileapp4/cache/rn_image_picker_lib_temp_1505c1a0-e458-455e-a038-7959e521cc95.jpg"}]}
    */
    // If user cancels out of Camera app: result = {"didCancel":true}}
    if (_.has(result, 'didCancel') && result.didCancel) return;
    // Future: Check for any more errors.
    let image = result.assets[0];
    //lj({image});
    // Save result in app state (more resilient than page state).
    if (documentCategory == 'identity') {
      appState.panels.identityVerification.photo1 = image;
      setUploadPhoto1Message('');
    } else if (documentCategory == 'address') {
      appState.panels.identityVerification.photo2 = image;
      setUploadPhoto2Message('');
    }
    triggerRender(renderCount+1); // Ensure re-render.
  }


  let generateTakePhoto1Message = () => {
    let msg = '';
    if (! _.isNil(appState.panels.identityVerification.photo1)) {
      log('Photo 1: ' + JSON.stringify(appState.panels.identityVerification.photo1))
      msg = 'Photo ready.';
    }
    return msg;
  }


  let generateTakePhoto2Message = () => {
    let msg = '';
    if (! _.isNil(appState.panels.identityVerification.photo2)) {
      log('Photo 2: ' + JSON.stringify(appState.panels.identityVerification.photo2))
      msg = 'Photo ready.';
    }
    return msg;
  }


  let uploadPhoto = async (documentCategory) => {
    let panel = appState.panels.identityVerification;
    let photo;
    let documentType;
    if (documentCategory == 'identity') {
      setUploadPhoto1Message('Uploading...');
      documentType = idType; // E.g. 'passportUK'
      let otherDocumentType = getDocumentType('address');
      if (documentType == otherDocumentType) {
        // The user has already uploaded this specific document type (e.g. 'photocardDriversLicenceUK') for the other document requirement.
        let msg = `For documentCategory ${documentCategory}, user has chosen to upload a ${documentType}, but this documentType has already been uploaded previously for the documentCategory 'address'.`;
        log(msg);
        let description = identityDocumentTypes[documentType];
        let msg2 = `Error: This document (${description}) has already been uploaded as the identity document. Please choose a different identity document.`;
        setUploadPhoto1Message('');
        setErrorMessage(msg2);
        return;
      }
      photo = panel.photo1;
      // testing:
      //photo = {"fileSize":5169332,"height":4032,"uri":"file:///var/mobile/Containers/Data/Application/6B354087-5CA1-4560-A7E3-237CB8504DA4/tmp/EC710A32-F187-40EF-ACDD-A49CCF64E6B5.jpg","type":"image/jpg","fileName":"EC710A32-F187-40EF-ACDD-A49CCF64E6B5.jpg","width":3024}
    } else if (documentCategory == 'address') {
      setUploadPhoto2Message('Uploading...');
      documentType = adType; // E.g. 'bankStatement'
      let otherDocumentType = getDocumentType('identity');
      if (documentType == otherDocumentType) {
        // The user has already uploaded this specific document type (e.g. 'photocardDriversLicenceUK') for the other document requirement.
        let msg = `For documentCategory ${documentCategory}, user has chosen to upload a ${documentType}, but this documentType has already been uploaded previously for the documentCategory 'identity'.`;
        log(msg);
        let description = addressDocumentTypes[documentType];
        let msg2 = `Error: This document (${description}) has already been uploaded as the identity document. Please choose a different address document.`;
        setUploadPhoto2Message('');
        setErrorMessage(msg2);
        return;
      }
      photo = panel.photo2;
    } else {
      let msg = `Unrecognised document type: ${documentCategory}`;
      logger.error(msg);
      return;
    }
    if (_.isNil(photo)) {
      let msg = `Photo not taken.`;
      if (documentCategory == 'identity') {
        setUploadPhoto1Message(msg);
      } else if (documentCategory == 'address') {
        setUploadPhoto2Message(msg);
      }
      return;
    }
    lj({photo})
    let fileExtension = ''; // An empty fileExtension will trigger an error on the server.
    let jpgTypes = 'image/jpg image/jpeg'.split(' ');
    if (_.has(photo, 'type') && jpgTypes.includes(photo.type)) fileExtension = '.jpg';
    // Load the file data from the photo object's uri.
    let fileURI = photo.uri;
    // Example fileURI:
    // "file:///var/mobile/Containers/Data/Application/F0223DE7-9A3A-4B58-B180-AE77018AAD30/tmp/25A9EAC6-64CC-43C5-ACF9-3B2CC42F7439.jpg"
    //lj({fileURI})
    let fileData = await RNFS.readFile(fileURI, 'base64');
    await appState.uploadDocument({documentType, documentCategory, fileData, fileExtension});
    if (appState.stateChangeIDHasChanged(stateChangeID)) return;
    if (documentCategory == 'identity') {
      setUploadPhoto1Message('Upload finished.');
      setDisablePhoto1Buttons(true);
    } else if (documentCategory == 'address') {
      setUploadPhoto2Message('Upload finished.');
      setDisablePhoto2Buttons(true);
    }
    triggerRender(renderCount+1); // Ensure a reload, so that the identityVerificationDetails are refreshed.
  }


  return (
    <View style={styles.panelContainer}>
    <View style={styles.panelSubContainer}>

      <View style={[styles.heading, styles.heading1]}>
        <Text style={styles.headingText}>Identity Verification</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={{ flexGrow: 1 }} >


      { isLoading && <Spinner/> }


      { ! isLoading && ! _.isEmpty(errorMessage) &&
        <View style={styles.errorMessage}>
          <Text style={styles.errorMessageText}>{errorMessage}</Text>
        </View>
      }


      { ! isLoading && (identityDocumentStatus()) &&
        <View>
          <Text style={styles.bold}>{generateDocumentStatusString('identity')}</Text>
        </View>
      }


      { ! isLoading && (addressDocumentStatus()) &&
        <View>
          <Text style={styles.bold}>{generateDocumentStatusString('address')}</Text>
        </View>
      }


      { ! isLoading && (! identityDocumentStatus() || ! addressDocumentStatus()) &&

        <View>

        <Text style={styles.bold}>{generateTaskDescriptionString()}</Text>


        <View style={[styles.horizontalRule, styles.horizontalRule1]}/>

        </View>

      }


      {/* If an identity document has not been uploaded, we make an upload pathway available. */}
      { ! isLoading && ! identityDocumentStatus() &&

        <View>

        <Text style={styles.bold}>{`\u2022  `} Identity Document:</Text>

        <View style={styles.idTypeDropdownWrapper}>
          <DropDownPicker
            listMode="MODAL"
            //style={styles.idTypeDropdown}
            //containerStyle={styles.idTypeDropdownContainer}
            open={openIDType}
            value={idType}
            items={itemsIDType}
            setOpen={setOpenIDType}
            setValue={setIDType}
            setItems={setItemsIDType}
            searchable={true}
          />
        </View>

        <View style={styles.takePhotoButtonWrapper}>
          <StandardButton title="Take photo"
            onPress={ () => { takePhotoOfDocument('identity') } }
            disabled={disablePhoto1Buttons}
          />
          <View style={styles.photoMessage}>
            <Text style={styles.photoMessageText}>{generateTakePhoto1Message()}</Text>
          </View>
        </View>

        <View style={styles.uploadPhotoButtonWrapper}>
          <StandardButton title="Upload photo"
            onPress={ () => { uploadPhoto('identity') } }
            disabled={disablePhoto1Buttons}
          />
          <View style={styles.photoMessage}>
            <Text style={styles.photoMessageText}>{uploadPhoto1Message}</Text>
          </View>
        </View>

        <View style={[styles.horizontalRule, styles.horizontalRule1]}/>

        </View>

      }


      {/* If an address document has not been uploaded, we make an upload pathway available. */}
      { ! isLoading && ! addressDocumentStatus() &&

        <View>

        <Text style={styles.bold}>{`\u2022  `} Proof of Address:</Text>

        <View style={styles.adTypeDropdownWrapper}>
          <DropDownPicker
            listMode="MODAL"
            //style={styles.adTypeDropdown}
            //containerStyle={styles.adTypeDropdownContainer}
            open={openADType}
            value={adType}
            items={itemsADType}
            setOpen={setOpenADType}
            setValue={setADType}
            setItems={setItemsADType}
            searchable={true}
          />
        </View>

        <View style={styles.takePhotoButtonWrapper}>
          <StandardButton title="Take photo"
            onPress={ () => { takePhotoOfDocument('address') } }
            disabled={disablePhoto2Buttons}
          />
          <View style={styles.photoMessage}>
            <Text style={styles.photoMessageText}>{generateTakePhoto2Message()}</Text>
          </View>
        </View>

        <View style={styles.uploadPhotoButtonWrapper}>
          <StandardButton title="Upload photo"
            onPress={ () => { uploadPhoto('address') } }
            disabled={disablePhoto2Buttons}
          />
          <View style={styles.photoMessage}>
            <Text style={styles.photoMessageText}>{uploadPhoto2Message}</Text>
          </View>
        </View>

        <View style={[styles.horizontalRule, styles.horizontalRule1]}/>

        </View>

      }


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
    marginBottom: scaledHeight(40),
  },
  headingText: {
    fontSize: normaliseFont(20),
    fontWeight: 'bold',
  },
  bold: {
    fontWeight: 'bold',
  },
  errorMessage: {
    //borderWidth: 1, //testing
    marginBottom: scaledHeight(20),
    //paddingHorizontal: scaledWidth(30),
  },
  errorMessageText: {
    color: 'red',
  },
  horizontalRule: {
    borderBottomColor: 'black',
    borderBottomWidth: 1,
    paddingHorizontal: scaledWidth(30),
  },
  horizontalRule1: {
    marginVertical: scaledHeight(20),
  },
  idTypeDropdownWrapper: {
    paddingTop: scaledHeight(20),
  },
  adTypeDropdownWrapper: {
    paddingTop: scaledHeight(20),
  },
  buttonWrapper: {
    marginTop: scaledHeight(20),
  },
  takePhotoButtonWrapper: {
    //borderWidth: 1, //testing
    marginTop: scaledHeight(20),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  photoMessage: {

  },
  photoMessageText: {
    color: 'red',
  },
  uploadPhotoButtonWrapper: {
    //borderWidth: 1, //testing
    marginTop: scaledHeight(20),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});


export default IdentityVerification;

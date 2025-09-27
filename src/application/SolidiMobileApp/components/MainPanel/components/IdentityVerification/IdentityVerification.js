// React imports
import React, { useContext, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import { 
  Text, 
  Card, 
  Button as PaperButton, 
  TouchableRipple, 
  TextInput,
  HelperText,
  Surface,
  useTheme,
  RadioButton,
  List,
  IconButton
} from 'react-native-paper';
import {launchCamera} from 'react-native-image-picker';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

// Other imports
import _ from 'lodash';
import Big from 'big.js';

// Internal imports
import AppStateContext from 'src/application/data';
import { colors, sharedColors, sharedStyles } from 'src/constants';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import { Button, StandardButton, ImageButton, Spinner } from 'src/components/atomic';
import { Title } from 'src/components/shared';
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
  const materialTheme = useTheme();
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


  // Accordion states
  let [identityAccordionExpanded, setIdentityAccordionExpanded] = useState(false);
  let [addressAccordionExpanded, setAddressAccordionExpanded] = useState(false);

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
      // Disabled API calls for design testing
      // await appState.generalSetup({caller: 'IdentityVerification'});
      // let xDetails = await appState.fetchIdentityVerificationDetails();
      // lj({xDetails})
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
      setIsLoading(false);
      // SetIdentityVerificationDetails(xDetails);
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
    try {
      log('Taking photo...');
      let options = {
        mediaType: 'photo',
        cameraType: 'back',
        quality: 0.8, // Add quality setting
      }
      
      let result = await launchCamera(options);
      
      // Check if component is still mounted
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
      
      // Log result for debugging
      log('Camera result:', JSON.stringify(result));
      
      // Handle user cancellation
      if (result.didCancel) {
        log('User cancelled camera');
        return;
      }
      
      // Handle errors
      if (result.errorMessage) {
        console.error('Camera error:', result.errorMessage);
        let message = `Camera error: ${result.errorMessage}`;
        if (documentCategory === 'identity') {
          setUploadPhoto1Message(message);
        } else if (documentCategory === 'address') {
          setUploadPhoto2Message(message);
        }
        return;
      }
      
      // Check if we have assets
      if (!result.assets || result.assets.length === 0) {
        let message = 'No photo was captured. Please try again.';
        if (documentCategory === 'identity') {
          setUploadPhoto1Message(message);
        } else if (documentCategory === 'address') {
          setUploadPhoto2Message(message);
        }
        return;
      }
      
      let image = result.assets[0];
      log('Image captured:', image);
      
      // Save result in app state (more resilient than page state)
      if (documentCategory === 'identity') {
        appState.panels.identityVerification.photo1 = image;
        setUploadPhoto1Message('');
      } else if (documentCategory === 'address') {
        appState.panels.identityVerification.photo2 = image;
        setUploadPhoto2Message('');
      }
      
      triggerRender(renderCount + 1); // Ensure re-render
      
    } catch (error) {
      console.error('Camera function error:', error);
      let message = 'Camera unavailable. Please try uploading a photo instead.';
      if (documentCategory === 'identity') {
        setUploadPhoto1Message(message);
      } else if (documentCategory === 'address') {
        setUploadPhoto2Message(message);
      }
    }
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


  let selectPhotoFromLibrary = async (documentCategory) => {
    try {
      log('Selecting photo from library...');
      
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.images],
        allowMultiSelection: false,
      });

      if (result && result[0]) {
        const file = result[0];
        log('File selected:', file);
        
        // Convert the selected file to the same format as camera photos
        const photoData = {
          uri: file.uri,
          type: file.type,
          fileName: file.name,
          fileSize: file.size,
        };

        // Save result in app state (same as camera photos)
        if (documentCategory == 'identity') {
          appState.panels.identityVerification.photo1 = photoData;
          setUploadPhoto1Message('');
        } else if (documentCategory == 'address') {
          appState.panels.identityVerification.photo2 = photoData;
          setUploadPhoto2Message('');
        }
        
        triggerRender(renderCount + 1); // Ensure re-render
      }
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        log('File selection cancelled');
      } else {
        console.error('File picker error:', err);
        let message = 'Error selecting file. Please try again.';
        if (documentCategory == 'identity') {
          setUploadPhoto1Message(message);
        } else if (documentCategory == 'address') {
          setUploadPhoto2Message(message);
        }
      }
    }
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
    <View style={{ flex: 1, backgroundColor: materialTheme.colors.background }}>
      
      <Title>
        Identity Verification
      </Title>

      <KeyboardAwareScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16 }}
        keyboardShouldPersistTaps='handled'
        enableResetScrollToCoords={false}
      >


      { isLoading && <Spinner/> }

      { ! isLoading && ! _.isEmpty(errorMessage) &&
        <HelperText type="error" visible={true} style={{ marginBottom: 16 }}>
          {errorMessage}
        </HelperText>
      }





      { ! isLoading && (! identityDocumentStatus() || ! addressDocumentStatus()) &&
        <Card style={{ 
          marginBottom: 16, 
          elevation: 3,
          backgroundColor: '#E8F4FD',
          borderLeftWidth: 4,
          borderLeftColor: materialTheme.colors.primary,
          borderRadius: 8
        }}>
          <Card.Content style={{ 
            padding: 16,
            flexDirection: 'row',
            alignItems: 'flex-start'
          }}>
            <IconButton 
              icon="information" 
              iconColor={materialTheme.colors.primary} 
              size={24}
              style={{ marginTop: -8, marginLeft: -8, marginRight: 8 }}
            />
            <View style={{ flex: 1 }}>
              <Text variant="titleSmall" style={{ 
                fontWeight: '600',
                color: materialTheme.colors.primary,
                marginBottom: 4
              }}>
                Document Upload Required
              </Text>
              <Text variant="bodyMedium" style={{ 
                color: '#1565C0',
                lineHeight: 20
              }}>
                {generateTaskDescriptionString()}
              </Text>
            </View>
          </Card.Content>
        </Card>
      }


      {/* Identity Document Accordion */}
      { ! isLoading &&
        <Card style={{ marginBottom: 16, elevation: 2 }}>
          <List.Accordion
            title="Identity Document"
            expanded={identityAccordionExpanded}
            onPress={() => setIdentityAccordionExpanded(!identityAccordionExpanded)}
            left={(props) => <List.Icon {...props} icon="account-box" />}
            right={(props) => (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {!identityDocumentStatus() && (
                  <IconButton icon="close-circle" iconColor={materialTheme.colors.error} size={20} />
                )}
                {identityDocumentStatus() && (
                  <IconButton icon="check-circle" iconColor={materialTheme.colors.primary} size={20} />
                )}
                <IconButton {...props} icon={identityAccordionExpanded ? "chevron-up" : "chevron-down"} />
              </View>
            )}
            titleStyle={{ 
              fontWeight: '600',
              color: materialTheme.colors.primary 
            }}
          >
            {identityDocumentStatus() ? (
              <Card.Content style={{ padding: 20 }}>
                <Text variant="bodyLarge" style={{ fontWeight: '600', color: materialTheme.colors.primary }}>
                  {generateDocumentStatusString('identity')}
                </Text>
              </Card.Content>
            ) : (
              <Card.Content style={{ padding: 20 }}>
                {/* Document Type Selection with Radio Buttons */}
                <Text variant="titleSmall" style={{ marginBottom: 16, fontWeight: '600' }}>
                  Select Document Type:
                </Text>
                
                <RadioButton.Group 
                  onValueChange={value => setIDType(value)} 
                  value={idType}
                >
                  {generateIdentityDropdownItems().map((option, index) => (
                    <View key={index} style={{ 
                      flexDirection: 'row', 
                      alignItems: 'center', 
                      marginBottom: 8 
                    }}>
                      <RadioButton value={option.value} />
                      <Text 
                        variant="bodyMedium" 
                        style={{ flex: 1, marginLeft: 8 }}
                        onPress={() => setIDType(option.value)}
                      >
                        {option.label}
                      </Text>
                    </View>
                  ))}
                </RadioButton.Group>

                {/* Action Buttons */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
                  <PaperButton
                    mode="outlined"
                    onPress={() => takePhotoOfDocument('identity')}
                    disabled={disablePhoto1Buttons}
                    style={{ flex: 0.48 }}
                    icon="camera"
                  >
                    Take Photo
                  </PaperButton>
                  <PaperButton
                    mode="contained"
                    onPress={() => selectPhotoFromLibrary('identity')}
                    disabled={disablePhoto1Buttons}
                    style={{ flex: 0.48 }}
                    icon="upload"
                  >
                    Upload Photo
                  </PaperButton>
                </View>

                {/* Messages and Upload Button */}
                {(generateTakePhoto1Message() || uploadPhoto1Message) && (
                  <View style={{ marginTop: 10 }}>
                    <HelperText type="info" visible={true}>
                      {generateTakePhoto1Message() || uploadPhoto1Message}
                    </HelperText>
                    {generateTakePhoto1Message() && (
                      <PaperButton
                        mode="contained"
                        onPress={() => uploadPhoto('identity')}
                        style={{ marginTop: 8 }}
                        icon="cloud-upload"
                      >
                        Upload to Server
                      </PaperButton>
                    )}
                  </View>
                )}
              </Card.Content>
            )}
          </List.Accordion>
        </Card>
      }

      {/* Proof of Address Accordion */}
      { ! isLoading &&
        <Card style={{ marginBottom: 16, elevation: 2 }}>
          <List.Accordion
            title="Proof of Address"
            expanded={addressAccordionExpanded}
            onPress={() => setAddressAccordionExpanded(!addressAccordionExpanded)}
            left={(props) => <List.Icon {...props} icon="home-account" />}
            right={(props) => (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {!addressDocumentStatus() && (
                  <IconButton icon="close-circle" iconColor={materialTheme.colors.error} size={20} />
                )}
                {addressDocumentStatus() && (
                  <IconButton icon="check-circle" iconColor={materialTheme.colors.primary} size={20} />
                )}
                <IconButton {...props} icon={addressAccordionExpanded ? "chevron-up" : "chevron-down"} />
              </View>
            )}
            titleStyle={{ 
              fontWeight: '600',
              color: materialTheme.colors.primary 
            }}
          >
            {addressDocumentStatus() ? (
              <Card.Content style={{ padding: 20 }}>
                <Text variant="bodyLarge" style={{ fontWeight: '600', color: materialTheme.colors.primary }}>
                  {generateDocumentStatusString('address')}
                </Text>
              </Card.Content>
            ) : (
              <Card.Content style={{ padding: 20 }}>
                {/* Document Type Selection with Radio Buttons */}
                <Text variant="titleSmall" style={{ marginBottom: 16, fontWeight: '600' }}>
                  Select Document Type:
                </Text>
                
                <RadioButton.Group 
                  onValueChange={value => setADType(value)} 
                  value={adType}
                >
                  {generateAddressDropdownItems().map((option, index) => (
                    <View key={index} style={{ 
                      flexDirection: 'row', 
                      alignItems: 'center', 
                      marginBottom: 8 
                    }}>
                      <RadioButton value={option.value} />
                      <Text 
                        variant="bodyMedium" 
                        style={{ flex: 1, marginLeft: 8 }}
                        onPress={() => setADType(option.value)}
                      >
                        {option.label}
                      </Text>
                    </View>
                  ))}
                </RadioButton.Group>

                {/* Action Buttons */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
                  <PaperButton
                    mode="outlined"
                    onPress={() => takePhotoOfDocument('address')}
                    disabled={disablePhoto2Buttons}
                    style={{ flex: 0.48 }}
                    icon="camera"
                  >
                    Take Photo
                  </PaperButton>
                  <PaperButton
                    mode="contained"
                    onPress={() => selectPhotoFromLibrary('address')}
                    disabled={disablePhoto2Buttons}
                    style={{ flex: 0.48 }}
                    icon="upload"
                  >
                    Upload Photo
                  </PaperButton>
                </View>

                {/* Messages and Upload Button */}
                {(generateTakePhoto2Message() || uploadPhoto2Message) && (
                  <View style={{ marginTop: 10 }}>
                    <HelperText type="info" visible={true}>
                      {generateTakePhoto2Message() || uploadPhoto2Message}
                    </HelperText>
                    {generateTakePhoto2Message() && (
                      <PaperButton
                        mode="contained"
                        onPress={() => uploadPhoto('address')}
                        style={{ marginTop: 8 }}
                        icon="cloud-upload"
                      >
                        Upload to Server
                      </PaperButton>
                    )}
                  </View>
                )}
              </Card.Content>
            )}
          </List.Accordion>
        </Card>
      }


      </KeyboardAwareScrollView>

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
  basicText: {
    fontSize: normaliseFont(14),
  },
  dropdownText: {
    fontSize: normaliseFont(14),
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
    fontSize: normaliseFont(14),
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
    fontSize: normaliseFont(14),
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

// React imports
import React, { useContext, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, ScrollView, Platform, Alert } from 'react-native';
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
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import {check, request, PERMISSIONS, RESULTS} from 'react-native-permissions';

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

  // Upload success state - track when documents have been successfully uploaded
  let [identityUploadedSuccessfully, setIdentityUploadedSuccessfully] = useState(false);
  let [addressUploadedSuccessfully, setAddressUploadedSuccessfully] = useState(false);

  // Upload progress state - track upload in progress and completion
  let [identityUploadInProgress, setIdentityUploadInProgress] = useState(false);
  let [addressUploadInProgress, setAddressUploadInProgress] = useState(false);
  let [identityUploadCompleted, setIdentityUploadCompleted] = useState(false);
  let [addressUploadCompleted, setAddressUploadCompleted] = useState(false);

  // Photo state for new camera implementation
  let [takePhoto1FileURI, setTakePhoto1FileURI] = useState('');
  let [takePhoto1FileExtension, setTakePhoto1FileExtension] = useState('');
  let [takePhoto2FileURI, setTakePhoto2FileURI] = useState('');
  let [takePhoto2FileExtension, setTakePhoto2FileExtension] = useState('');




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
    // Check user status to see if identity documents have been verified by the system
    const identityChecked = appState.getUserStatus('identityChecked');
    
    // Return true if identity has been checked and verified by the system
    if (identityChecked === true) {
      return true;
    }
    
    // Otherwise show that it's not verified (even if locally uploaded)
    return false;
  }


  let addressDocumentStatus = () => { 
    // Check user status to see if address documents have been verified by the system
    const addressConfirmed = appState.getUserStatus('addressConfirmed');
    
    // Return true if address has been confirmed and verified by the system
    if (addressConfirmed === true) {
      return true;
    }
    
    // Otherwise show that it's not verified (even if locally uploaded)
    return false;
  }


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

  // Camera permission check function
  let checkCameraPermission = async () => {
    try {
      const permission = Platform.OS === 'ios' ? PERMISSIONS.IOS.CAMERA : PERMISSIONS.ANDROID.CAMERA;
      
      const result = await check(permission);
      
      if (result === RESULTS.GRANTED) {
        return true;
      } else if (result === RESULTS.DENIED) {
        // Request permission
        const requestResult = await request(permission);
        return requestResult === RESULTS.GRANTED;
      } else if (result === RESULTS.BLOCKED) {
        Alert.alert(
          'Camera Permission Required',
          'Camera access is blocked. Please enable it in your device settings to take photos.',
          [{ text: 'OK' }]
        );
        return false;
      }
      
      return false;
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  };

  let takePhotoOfDocument = async (documentCategory) => {
    try {
      log('Taking photo for document category:', documentCategory);
      console.log('🎥 Take Photo button pressed for:', documentCategory);
      
      // Check camera permission first
      log('Checking camera permission...');
      const hasPermission = await checkCameraPermission();
      log('Camera permission result:', hasPermission);
      
      if (!hasPermission) {
        let message = 'Camera permission is required to take photos. Please enable it in settings.';
        log('Permission denied, setting message:', message);
        if (documentCategory === 'identity') {
          setUploadPhoto1Message(message);
        } else if (documentCategory === 'address') {
          setUploadPhoto2Message(message);
        }
        return;
      }
      
      // Show loading message to indicate button press was detected
      log('Preparing to launch camera...');
      if (documentCategory === 'identity') {
        setUploadPhoto1Message('Opening camera...');
      } else if (documentCategory === 'address') {
        setUploadPhoto2Message('Opening camera...');
      }
      
      let options = {
        mediaType: 'photo',
        cameraType: 'back',
        quality: 0.8, // Add quality setting
        includeBase64: true, // Include base64 for processing
      }
      
      log('Camera options:', options);
      let result = await launchCamera(options);
      log('Camera launch result received');
      
      // Check if user is still logged in
      if (!appState.user.isAuthenticated) {
        console.log('[WARNING] User logged out during camera operation');
        return;
      }
      
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
        
        // Check if this is a simulator-related error
        if (result.errorMessage.includes('simulator') || result.errorMessage.includes('device')) {
          message = 'Camera not available in simulator. Please use "Upload Photo" to select an image from the photo library instead.';
        }
        
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
      
      // Save result in local state
      if (documentCategory === 'identity') {
        setTakePhoto1FileURI(image.uri);
        setTakePhoto1FileExtension('.jpg');
        setUploadPhoto1Message('');
        console.log('[DEBUG] Identity photo captured, URI:', image.uri);
      } else if (documentCategory === 'address') {
        setTakePhoto2FileURI(image.uri);
        setTakePhoto2FileExtension('.jpg');
        setUploadPhoto2Message('');
        console.log('[DEBUG] Address photo captured, URI:', image.uri);
      }
      
      // Also save in app state for backward compatibility
      if (documentCategory === 'identity') {
        appState.panels.identityVerification.photo1 = image;
      } else if (documentCategory === 'address') {
        appState.panels.identityVerification.photo2 = image;
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
    console.log('🔍 [PHOTO CHECK] generateTakePhoto1Message called - takePhoto1FileURI:', takePhoto1FileURI);
    let msg = '';
    if (takePhoto1FileURI && takePhoto1FileURI.length > 0) {
      console.log('[DEBUG] Photo 1 ready, URI length:', takePhoto1FileURI.length);
      msg = 'Photo ready.';
    } else {
      console.log('🔍 [PHOTO CHECK] No photo ready - takePhoto1FileURI is empty or null');
    }
    console.log('🔍 [PHOTO CHECK] Returning message:', msg);
    return msg;
  }


  let generateTakePhoto2Message = () => {
    console.log('🔍 [PHOTO CHECK] generateTakePhoto2Message called - takePhoto2FileURI:', takePhoto2FileURI);
    let msg = '';
    if (takePhoto2FileURI && takePhoto2FileURI.length > 0) {
      console.log('[DEBUG] Photo 2 ready, URI length:', takePhoto2FileURI.length);
      msg = 'Photo ready.';
    } else {
      console.log('🔍 [PHOTO CHECK] No photo ready - takePhoto2FileURI is empty or null');
    }
    console.log('🔍 [PHOTO CHECK] Returning message:', msg);
    return msg;
  }


  let selectPhotoFromLibrary = async (documentCategory) => {
    try {
      log('Selecting photo from iPhone photo gallery...');
      console.log('📱 [PHOTO GALLERY] Opening photo gallery for:', documentCategory);
      
      // Show loading message to indicate button press was detected
      if (documentCategory === 'identity') {
        setUploadPhoto1Message('Opening photo gallery...');
      } else if (documentCategory === 'address') {
        setUploadPhoto2Message('Opening photo gallery...');
      }
      
      let options = {
        mediaType: 'photo',
        quality: 0.8,
        includeBase64: true,
      }
      
      log('Photo gallery options:', options);
      let result = await launchImageLibrary(options);
      log('Photo gallery result received');
      
      // Check if user is still logged in
      if (!appState.user.isAuthenticated) {
        console.log('[WARNING] User logged out during photo gallery operation');
        return;
      }
      
      // Log result for debugging
      log('Photo gallery result:', JSON.stringify(result));
      
      // Handle user cancellation
      if (result.didCancel) {
        log('Photo selection cancelled by user');
        if (documentCategory === 'identity') {
          setUploadPhoto1Message('');
        } else if (documentCategory === 'address') {
          setUploadPhoto2Message('');
        }
        return;
      }
      
      // Handle errors
      if (result.errorMessage) {
        let errorMsg = `Error accessing photo gallery: ${result.errorMessage}`;
        log(errorMsg);
        if (documentCategory === 'identity') {
          setUploadPhoto1Message(errorMsg);
        } else if (documentCategory === 'address') {
          setUploadPhoto2Message(errorMsg);
        }
        return;
      }
      
      let image = result.assets[0];
      log('Image selected from gallery:', image);
      
      // Save result in local state
      if (documentCategory === 'identity') {
        setTakePhoto1FileURI(image.uri);
        setTakePhoto1FileExtension('.jpg');
        setUploadPhoto1Message('');
        console.log('[DEBUG] Identity photo selected from gallery, URI:', image.uri);
      } else if (documentCategory === 'address') {
        setTakePhoto2FileURI(image.uri);
        setTakePhoto2FileExtension('.jpg');
        setUploadPhoto2Message('');
        console.log('[DEBUG] Address photo selected from gallery, URI:', image.uri);
      }
      
      // Also save in app state for backward compatibility
      if (documentCategory === 'identity') {
        appState.panels.identityVerification.photo1 = image;
      } else if (documentCategory === 'address') {
        appState.panels.identityVerification.photo2 = image;
      }
      
      triggerRender(renderCount + 1); // Ensure re-render
    } catch (err) {
      console.error('Photo gallery error:', err);
      let message = 'Error selecting photo from gallery. Please try again.';
      if (documentCategory == 'identity') {
        setUploadPhoto1Message(message);
      } else if (documentCategory == 'address') {
        setUploadPhoto2Message(message);
      }
    }
  }


  let uploadPhoto = async (documentCategory) => {
    console.log('[DEBUG] uploadPhoto called with documentCategory:', documentCategory);
    
    try {
      let documentType;
      let fileURI;
      let fileExtension;
      
      if (documentCategory == 'identity') {
        console.log('[DEBUG] Processing identity document upload');
        setUploadPhoto1Message('Uploading...');
        setIdentityUploadInProgress(true); // Start progress indicator
        setIdentityUploadCompleted(false); // Reset completion state
        documentType = idType; // E.g. 'passportUK'
        
        // Check for duplicate document types
        let otherDocumentType = getDocumentType('address');
        if (documentType == otherDocumentType) {
          let msg = `For documentCategory ${documentCategory}, user has chosen to upload a ${documentType}, but this documentType has already been uploaded previously for the documentCategory 'address'.`;
          log(msg);
          let description = identityDocumentTypes[documentType];
          let msg2 = `Error: This document (${description}) has already been uploaded as the address document. Please choose a different identity document.`;
          setUploadPhoto1Message('');
          setErrorMessage(msg2);
          return;
        }
        
        // Use new local state variables instead of panel state
        fileURI = takePhoto1FileURI;
        fileExtension = takePhoto1FileExtension;
        
      } else if (documentCategory == 'address') {
        console.log('[DEBUG] Processing address document upload');
        setUploadPhoto2Message('Uploading...');
        setAddressUploadInProgress(true); // Start progress indicator
        setAddressUploadCompleted(false); // Reset completion state
        documentType = adType; // E.g. 'bankStatement'
        
        // Check for duplicate document types
        let otherDocumentType = getDocumentType('identity');
        if (documentType == otherDocumentType) {
          let msg = `For documentCategory ${documentCategory}, user has chosen to upload a ${documentType}, but this documentType has already been uploaded previously for the documentCategory 'identity'.`;
          log(msg);
          let description = addressDocumentTypes[documentType];
          let msg2 = `Error: This document (${description}) has already been uploaded as the identity document. Please choose a different address document.`;
          setUploadPhoto2Message('');
          setErrorMessage(msg2);
          return;
        }
        
        // Use new local state variables instead of panel state
        fileURI = takePhoto2FileURI;
        fileExtension = takePhoto2FileExtension;
        
      } else {
        let msg = `Unrecognised document type: ${documentCategory}`;
        console.error('[ERROR]', msg);
        return;
      }
      
      console.log('[DEBUG] Upload parameters - documentType:', documentType, 'fileURI:', fileURI, 'fileExtension:', fileExtension);
      
      // Validation
      if (!documentType) {
        let msg = `Please select a document type first.`;
        console.log('[ERROR]', msg);
        if (documentCategory == 'identity') {
          setUploadPhoto1Message(msg);
        } else if (documentCategory == 'address') {
          setUploadPhoto2Message(msg);
        }
        return;
      }
      
      if (!fileURI) {
        let msg = `Photo not taken. Please take a photo or select one from library first.`;
        console.log('[ERROR]', msg);
        if (documentCategory == 'identity') {
          setUploadPhoto1Message(msg);
        } else if (documentCategory == 'address') {
          setUploadPhoto2Message(msg);
        }
        return;
      }
      
      if (!fileExtension) {
        let msg = `Invalid file format. Please use a JPEG image.`;
        console.log('[ERROR]', msg);
        if (documentCategory == 'identity') {
          setUploadPhoto1Message(msg);
        } else if (documentCategory == 'address') {
          setUploadPhoto2Message(msg);
        }
        return;
      }
      
      console.log('[DEBUG] Validation passed, reading file data');
      
      // Load the file data from the fileURI
      let fileData = await RNFS.readFile(fileURI, 'base64');
      console.log('[DEBUG] File data loaded, length:', fileData ? fileData.length : 'null');
      
      // Start progress indicator
      let progressCounter = 0;
      const progressInterval = setInterval(() => {
        progressCounter++;
        let dots = '.'.repeat((progressCounter % 4) + 1);
        if (documentCategory == 'identity') {
          setUploadPhoto1Message(`Uploading${dots} (${progressCounter * 2}s)`);
        } else if (documentCategory == 'address') {
          setUploadPhoto2Message(`Uploading${dots} (${progressCounter * 2}s)`);
        }
      }, 2000);
      
      console.log('[DEBUG] About to call appState.uploadDocument with params:', {documentType, documentCategory, fileDataLength: fileData ? fileData.length : 'null', fileExtension});
      console.log('[DEBUG] Current app state - mainPanelState:', appState.mainPanelState);
      console.log('[DEBUG] Current app state - apiClient exists:', !!appState.apiClient);
      console.log('[DEBUG] Current app state - user logged in:', !!appState.user);
      
      // Ensure user is still authenticated before upload
      if (!appState.user.isAuthenticated) {
        throw new Error('User must be logged in to upload documents');
      }
      
      // Add timeout wrapper to detect stuck uploads
      const uploadWithTimeout = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Upload timeout after 30 seconds'));
        }, 30000);
        
        appState.uploadDocument({documentType, documentCategory, fileData, fileExtension})
          .then(result => {
            clearTimeout(timeout);
            resolve(result);
          })
          .catch(error => {
            clearTimeout(timeout);
            reject(error);
          });
      });
      
      let uploadResult = await uploadWithTimeout;
      
      // Clear progress indicator
      clearInterval(progressInterval);
      
      console.log('[DEBUG] Upload completed successfully, result:', uploadResult);
      console.log('🔐 [AUTH CHECK] Authentication status after API call:', {
        isAuthenticated: !!appState.user.isAuthenticated,
        apiCredentialsFound: !!appState.user.apiCredentialsFound,
        mainPanelState: appState.mainPanelState
      });
      
      // Check if upload result contains any logout triggers
      if (uploadResult && uploadResult.error) {
        console.log('⚠️ [UPLOAD RESULT] Upload result contains error:', uploadResult.error);
      }
      
      // Success
      console.log('🎉 [UPLOAD SUCCESS] Upload completed successfully, setting success messages');
      console.log('🔐 [AUTH CHECK] User authenticated after upload:', !!appState.user.isAuthenticated);
      
      if (documentCategory == 'identity') {
        setUploadPhoto1Message('✅ Upload finished successfully! Awaiting verification.');
        setIdentityUploadInProgress(false); // Stop progress indicator
        setIdentityUploadCompleted(true); // Mark as completed
        setDisablePhoto1Buttons(false); // Re-enable buttons for additional uploads
      } else if (documentCategory == 'address') {
        setUploadPhoto2Message('✅ Upload finished successfully! Awaiting verification.');
        setAddressUploadInProgress(false); // Stop progress indicator
        setAddressUploadCompleted(true); // Mark as completed
        setDisablePhoto2Buttons(false); // Re-enable buttons for additional uploads
      }
      
      console.log('🔄 [RENDER] About to trigger render - auth status:', !!appState.user.isAuthenticated);
      triggerRender(renderCount+1); // Ensure a reload, so that the identityVerificationDetails are refreshed.
      
      // Also refresh user status to check if documents have been verified
      try {
        await appState.loadUserStatus();
        console.log('🔄 [USER STATUS] User status refreshed after upload');
      } catch (error) {
        console.log('⚠️ [USER STATUS] Failed to refresh user status:', error);
      }
      
      console.log('🔄 [RENDER] Render triggered - auth status:', !!appState.user.isAuthenticated);
      

      
    } catch (error) {
      // Clear progress indicator on error
      clearInterval(progressInterval);
      
      console.log('[ERROR] uploadPhoto failed:', error);
      let errorMsg = '❌ Upload failed: ' + (error.message || 'Unknown error');
      
      if (documentCategory == 'identity') {
        setUploadPhoto1Message(errorMsg);
        setIdentityUploadInProgress(false); // Stop progress indicator
        setIdentityUploadCompleted(false); // Reset completion state
      } else if (documentCategory == 'address') {
        setUploadPhoto2Message(errorMsg);
        setAddressUploadInProgress(false); // Stop progress indicator
        setAddressUploadCompleted(false); // Reset completion state
      }
      

    }
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
                {/* Show upload progress indicator */}
                {identityUploadInProgress && (
                  <IconButton icon="loading" iconColor={materialTheme.colors.primary} size={20} />
                )}
                {/* Show upload completed (but not yet verified) */}
                {!identityUploadInProgress && identityUploadCompleted && !identityDocumentStatus() && (
                  <IconButton icon="clock" iconColor="#FF9800" size={20} />
                )}
                {/* Show verification status */}
                {!identityDocumentStatus() && !identityUploadInProgress && !identityUploadCompleted && (
                  <IconButton icon="close-circle" iconColor={materialTheme.colors.error} size={20} />
                )}
                {identityDocumentStatus() && (
                  <IconButton icon="check-circle" iconColor="#4CAF50" size={20} />
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
                    onPress={() => {
                      console.log('📸 [TAKE PHOTO] Button pressed for identity');
                      takePhotoOfDocument('identity');
                    }}
                    disabled={disablePhoto1Buttons}
                    style={{ flex: 0.48 }}
                    icon="camera"
                  >
                    Take Photo
                  </PaperButton>
                  <PaperButton
                    mode="contained"
                    onPress={() => {
                      console.log('📁 [UPLOAD PHOTO] Button pressed for identity');
                      selectPhotoFromLibrary('identity');
                    }}
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
onPress={async () => {
                          try {
                            console.log('🔴 [BUTTON PRESS] Identity Upload button pressed at:', new Date().toISOString());
                            console.log('🔴 [BUTTON STATE] Current panel.photo1:', appState.panels.identityVerification.photo1);
                            console.log('🔴 [BUTTON STATE] Current takePhoto1FileURI:', takePhoto1FileURI);
                            console.log('🔴 [BUTTON STATE] Current takePhoto1FileExtension:', takePhoto1FileExtension);
                            console.log('🔴 [BUTTON STATE] Current idType:', idType);
                            console.log('🔴 [BUTTON STATE] Button disabled state:', disablePhoto1Buttons);
                            
                            // Add immediate feedback
                            setUploadPhoto1Message('🚀 Button pressed, starting upload...');
                            
                            await uploadPhoto('identity');
                            
                            console.log('🟢 [BUTTON SUCCESS] Upload function completed');
                          } catch (error) {
                            console.error('🔴 [BUTTON ERROR] Upload button handler failed:', error);
                            setUploadPhoto1Message('❌ Upload button error: ' + error.message);
                          }
                        }}
                        style={{ marginTop: 8 }}
                        icon={identityUploadInProgress ? "loading" : (identityUploadCompleted ? "check-circle" : "cloud-upload")}
                        disabled={identityUploadInProgress}
                      >
                        {identityUploadInProgress ? "Uploading..." : (identityUploadCompleted ? "Uploaded" : "Upload to Server")}
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
                {/* Show upload progress indicator */}
                {addressUploadInProgress && (
                  <IconButton icon="loading" iconColor={materialTheme.colors.primary} size={20} />
                )}
                {/* Show upload completed (but not yet verified) */}
                {!addressUploadInProgress && addressUploadCompleted && !addressDocumentStatus() && (
                  <IconButton icon="clock" iconColor="#FF9800" size={20} />
                )}
                {/* Show verification status */}
                {!addressDocumentStatus() && !addressUploadInProgress && !addressUploadCompleted && (
                  <IconButton icon="close-circle" iconColor={materialTheme.colors.error} size={20} />
                )}
                {addressDocumentStatus() && (
                  <IconButton icon="check-circle" iconColor="#4CAF50" size={20} />
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
onPress={async () => {
                          try {
                            console.log('🔴 [BUTTON PRESS] Address Upload button pressed at:', new Date().toISOString());
                            console.log('🔴 [BUTTON STATE] Current panel.photo2:', appState.panels.identityVerification.photo2);
                            console.log('🔴 [BUTTON STATE] Current takePhoto2FileURI:', takePhoto2FileURI);
                            console.log('🔴 [BUTTON STATE] Current takePhoto2FileExtension:', takePhoto2FileExtension);
                            console.log('🔴 [BUTTON STATE] Current adType:', adType);
                            console.log('🔴 [BUTTON STATE] Button disabled state:', disablePhoto2Buttons);
                            
                            // Add immediate feedback
                            setUploadPhoto2Message('🚀 Button pressed, starting upload...');
                            
                            await uploadPhoto('address');
                            
                            console.log('🟢 [BUTTON SUCCESS] Upload function completed');
                          } catch (error) {
                            console.error('🔴 [BUTTON ERROR] Upload button handler failed:', error);
                            setUploadPhoto2Message('❌ Upload button error: ' + error.message);
                          }
                        }}
                        style={{ marginTop: 8 }}
                        icon={addressUploadInProgress ? "loading" : (addressUploadCompleted ? "check-circle" : "cloud-upload")}
                        disabled={addressUploadInProgress}
                      >
                        {addressUploadInProgress ? "Uploading..." : (addressUploadCompleted ? "Uploaded" : "Upload to Server")}
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

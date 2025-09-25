// React imports
import React, { useContext, useEffect, useState } from 'react';
import { Text, TextInput, StyleSheet, View, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { RadioButton, Checkbox, Title } from 'react-native-paper';

// Other imports
import _ from 'lodash';
// import DocumentPicker from 'react-native-document-picker';

// Internal imports
import AppStateContext from 'src/application/data';
import { Button, StandardButton } from 'src/components/atomic';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import { colors } from 'src/constants';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('Questionnaire');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);

// Import the questionnaire data
import questionnaireData from '../../../../../../../json/4a056019-026e-4e5e-8ddd-ebda93fd2064.json';

let Questionnaire = () => {

  let appState = useContext(AppStateContext);
  let [renderCount, triggerRender] = useState(0);
  let stateChangeID = appState.stateChangeID;

  // Form state
  let [answers, setAnswers] = useState({});
  let [uploadedFiles, setUploadedFiles] = useState({});
  let [errorMessage, setErrorMessage] = useState('');
  let [uploadMessage, setUploadMessage] = useState('');
  let [disableSubmitButton, setDisableSubmitButton] = useState(false);

  // Initial setup
  useEffect(() => {
    setup();
  }, []);

  let setup = async () => {
    try {
      await appState.generalSetup();
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
      
      // Initialize answers with empty values
      let initialAnswers = {};
      questionnaireData.questions.forEach(question => {
        initialAnswers[question.id] = question.answer || '';
      });
      setAnswers(initialAnswers);
      
      triggerRender(renderCount + 1);
    } catch (err) {
      let msg = `Questionnaire.setup: Error = ${err}`;
      console.log(msg);
    }
  };

  // Handle text input changes
  let handleInputChange = (questionId, value) => {
    setAnswers(prevAnswers => ({
      ...prevAnswers,
      [questionId]: value
    }));
  };

  // Handle radio button selection
  let handleRadioChange = (questionId, value) => {
    setAnswers(prevAnswers => ({
      ...prevAnswers,
      [questionId]: value
    }));
  };

  // Handle file upload (simplified for offline mode)
  let handleFileUpload = async (questionId) => {
    // Simulate file upload in offline mode
    const mockFileName = `mock_document_${questionId}.pdf`;
    
    setUploadedFiles(prevFiles => ({
      ...prevFiles,
      [questionId]: { name: mockFileName, uri: 'mock://file', type: 'application/pdf' }
    }));
    
    // Store file reference in answers
    setAnswers(prevAnswers => ({
      ...prevAnswers,
      [questionId]: mockFileName
    }));
    
    setUploadMessage(`File "${mockFileName}" uploaded successfully (offline mode)`);
    setTimeout(() => setUploadMessage(''), 3000);
  };

  // Validate form
  let validateForm = () => {
    let missingFields = [];
    
    questionnaireData.questions.forEach(question => {
      if (!answers[question.id] || answers[question.id].trim() === '') {
        missingFields.push(question.label);
      }
    });
    
    if (missingFields.length > 0) {
      setErrorMessage(`Please fill in the following required fields: ${missingFields.join(', ')}`);
      return false;
    }
    
    return true;
  };

  // Submit form
  let submitQuestionnaire = async () => {
    setDisableSubmitButton(true);
    setErrorMessage('');
    
    if (!validateForm()) {
      setDisableSubmitButton(false);
      return;
    }
    
    try {
      setUploadMessage('Submitting questionnaire...');
      
      // Prepare submission data
      let submissionData = {
        formId: questionnaireData.formid,
        uuid: questionnaireData.uuid,
        answers: answers,
        uploadedFiles: Object.keys(uploadedFiles).map(key => ({
          questionId: key,
          fileName: uploadedFiles[key].name,
          fileUri: uploadedFiles[key].uri,
          fileType: uploadedFiles[key].type
        }))
      };
      
      // In offline mode, just simulate success
      if (true) { // OFFLINE_MODE is true
        log('[OFFLINE MODE] Simulating questionnaire submission');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API delay
        
        Alert.alert(
          'Success',
          'Your questionnaire has been submitted successfully!',
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate back or to success page
                appState.changeState('Settings');
              }
            }
          ]
        );
        return;
      }
      
      // TODO: Real API submission would go here
      // let result = await appState.privateMethod({
      //   functionName: 'submitQuestionnaire',
      //   apiRoute: questionnaireData.submiturl,
      //   params: submissionData
      // });
      
    } catch (err) {
      logger.error(err);
      setErrorMessage('Failed to submit questionnaire. Please try again.');
      setUploadMessage('');
      setDisableSubmitButton(false);
    }
  };

  // Render different question types
  let renderQuestion = (question, index) => {
    switch (question.type) {
      case 'text':
        return (
          <View key={question.id} style={styles.questionWrapper}>
            <Text style={styles.questionLabel}>{question.label}</Text>
            {question.guidance ? (
              <Text style={styles.guidanceText}>{question.guidance}</Text>
            ) : null}
            <TextInput
              style={styles.textInput}
              placeholder={question.placeholder}
              value={answers[question.id] || ''}
              onChangeText={(value) => handleInputChange(question.id, value)}
              autoCapitalize="sentences"
            />
          </View>
        );
        
      case 'textarea':
        return (
          <View key={question.id} style={styles.questionWrapper}>
            <Text style={styles.questionLabel}>{question.label}</Text>
            {question.guidance ? (
              <Text style={styles.guidanceText}>{question.guidance}</Text>
            ) : null}
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder={question.placeholder}
              value={answers[question.id] || ''}
              onChangeText={(value) => handleInputChange(question.id, value)}
              multiline
              numberOfLines={4}
              autoCapitalize="sentences"
            />
          </View>
        );
        
      case 'radio':
        return (
          <View key={question.id} style={styles.questionWrapper}>
            <Text style={styles.questionLabel}>{question.label}</Text>
            {question.guidance ? (
              <Text style={styles.guidanceText}>{question.guidance}</Text>
            ) : null}
            <RadioButton.Group
              onValueChange={(value) => handleRadioChange(question.id, value)}
              value={answers[question.id] || ''}
            >
              {question.values.map((option) => (
                <View key={option.id} style={styles.radioOption}>
                  <RadioButton value={option.id} />
                  <Text style={styles.radioText}>{option.text}</Text>
                </View>
              ))}
            </RadioButton.Group>
          </View>
        );
        
      case 'upload':
        return (
          <View key={question.id} style={styles.questionWrapper}>
            <Text style={styles.questionLabel}>{question.label}</Text>
            {question.guidance ? (
              <Text style={styles.guidanceText}>{question.guidance}</Text>
            ) : null}
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={() => handleFileUpload(question.id)}
            >
              <Text style={styles.uploadButtonText}>
                {uploadedFiles[question.id] ? uploadedFiles[question.id].name : 'Choose File'}
              </Text>
            </TouchableOpacity>
            {uploadedFiles[question.id] ? (
              <Text style={styles.fileSelectedText}>
                ✓ File selected: {uploadedFiles[question.id].name}
              </Text>
            ) : null}
          </View>
        );
        
      default:
        return null;
    }
  };

  return (
    <View style={styles.panelContainer}>
      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        enableOnAndroid={true}
        keyboardShouldPersistTaps="handled"
      >
        <Title style={styles.title}>{questionnaireData.formtitle}</Title>
        
        {questionnaireData.formintro ? (
          <View style={styles.introWrapper}>
            <Text style={styles.introText}>{questionnaireData.formintro}</Text>
          </View>
        ) : null}

        {!_.isEmpty(errorMessage) && (
          <View style={styles.errorWrapper}>
            <Text style={styles.errorText}>
              <Text style={styles.errorTextBold}>Error: </Text>
              <Text>{errorMessage}</Text>
            </Text>
          </View>
        )}

        {!_.isEmpty(uploadMessage) && (
          <View style={styles.uploadMessageWrapper}>
            <Text style={styles.uploadMessageText}>{uploadMessage}</Text>
          </View>
        )}

        {/* Render all questions */}
        {questionnaireData.questions.map((question, index) => renderQuestion(question, index))}

        {/* Submit button */}
        <View style={styles.submitButtonWrapper}>
          <StandardButton
            title={questionnaireData.submittext}
            onPress={submitQuestionnaire}
            disabled={disableSubmitButton}
          />
        </View>

        <View style={styles.bottomSpacer} />
      </KeyboardAwareScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  panelContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  title: {
    fontSize: normaliseFont(24),
    fontWeight: 'bold',
    color: colors.black,
    textAlign: 'center',
    marginVertical: scaledHeight(20),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  introWrapper: {
    marginHorizontal: scaledWidth(20),
    marginBottom: scaledHeight(20),
    padding: scaledWidth(15),
    backgroundColor: colors.lightGray,
    borderRadius: 8,
  },
  introText: {
    fontSize: normaliseFont(14),
    color: colors.darkGray,
    lineHeight: normaliseFont(20),
  },
  questionWrapper: {
    marginHorizontal: scaledWidth(20),
    marginBottom: scaledHeight(25),
  },
  questionLabel: {
    fontSize: normaliseFont(16),
    fontWeight: '600',
    color: colors.black,
    marginBottom: scaledHeight(8),
  },
  guidanceText: {
    fontSize: normaliseFont(13),
    color: colors.mediumGray,
    marginBottom: scaledHeight(10),
    fontStyle: 'italic',
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: 8,
    paddingHorizontal: scaledWidth(12),
    paddingVertical: scaledHeight(12),
    fontSize: normaliseFont(14),
    backgroundColor: colors.white,
  },
  textArea: {
    height: scaledHeight(100),
    textAlignVertical: 'top',
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scaledHeight(8),
  },
  radioText: {
    fontSize: normaliseFont(14),
    color: colors.black,
    marginLeft: scaledWidth(8),
  },
  uploadButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: scaledWidth(15),
    paddingVertical: scaledHeight(12),
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  uploadButtonText: {
    fontSize: normaliseFont(14),
    color: colors.primary,
    fontWeight: '500',
  },
  fileSelectedText: {
    fontSize: normaliseFont(12),
    color: colors.success,
    marginTop: scaledHeight(5),
    fontWeight: '500',
  },
  errorWrapper: {
    marginHorizontal: scaledWidth(20),
    marginBottom: scaledHeight(15),
    padding: scaledWidth(15),
    backgroundColor: colors.errorBackground,
    borderRadius: 8,
  },
  errorText: {
    fontSize: normaliseFont(14),
    color: colors.error,
  },
  errorTextBold: {
    fontWeight: 'bold',
  },
  uploadMessageWrapper: {
    marginHorizontal: scaledWidth(20),
    marginBottom: scaledHeight(15),
    padding: scaledWidth(15),
    backgroundColor: colors.successBackground,
    borderRadius: 8,
  },
  uploadMessageText: {
    fontSize: normaliseFont(14),
    color: colors.success,
  },
  submitButtonWrapper: {
    marginHorizontal: scaledWidth(20),
    marginTop: scaledHeight(30),
  },
  bottomSpacer: {
    height: scaledHeight(50),
  },
});

export default Questionnaire;
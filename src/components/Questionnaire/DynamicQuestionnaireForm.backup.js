// Enhanced Dynamic QuestionnaireForm
// This shows how to enhance your existing component for API-driven forms

import React, { useState, useEffect, useContext } from 'react';
import { StyleSheet, View, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, Card, Button, TextInput, RadioButton, ActivityIndicator } from 'react-native-paper';
import Icon from 'react-native-vector-icons/FontAwesome';
import { Buffer } from 'buffer';

// Internal imports
import { colors, sharedStyles, sharedColors } from 'src/constants';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import AppStateContext from 'src/application/data';

const DynamicQuestionnaireForm = ({ 
  // NEW: Either provide formData directly OR an API endpoint
  formData = null,           // Static form data (your current approach)
  apiEndpoint = null,        // Dynamic API endpoint
  formId = null,             // Form ID to fetch from API
  onSubmit, 
  onBack 
}) => {
  const appState = useContext(AppStateContext);
  const [answers, setAnswers] = useState({});
  const [currentPage, setCurrentPage] = useState(0);
  
  // NEW: State for dynamic loading
  const [dynamicFormData, setDynamicFormData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formDataInitialized, setFormDataInitialized] = useState(false);

  // NEW: Effect to load form data from API if needed
  useEffect(() => {
    if (apiEndpoint || formId) {
      loadFormFromAPI();
    } else if (formData && !formDataInitialized) {
      setDynamicFormData(formData);
      setFormDataInitialized(true);
    }
  }, [apiEndpoint, formId, formDataInitialized]); // Removed formData from dependencies to prevent infinite loop

  // Separate effect to handle formData prop changes without causing infinite loop
  useEffect(() => {
    if (formData && formDataInitialized) {
      setDynamicFormData(formData);
    }
  }, [formData]); // Only depend on formData, not formDataInitialized

  // NEW: Function to load form definition from API
  const loadFormFromAPI = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Construct URL based on what's provided
      let url;
      if (apiEndpoint) {
        url = apiEndpoint;
      } else if (formId) {
        url = `/api/questionnaires/${formId}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch form: ${response.status}`);
      }

      const formDefinition = await response.json();
      setDynamicFormData(formDefinition);
      
    } catch (err) {
      console.error('Error loading form:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // NEW: Function to load next form after submission
  const loadNextFormFromAPI = async (uuid) => {
    console.log('📋 Loading next form with UUID:', uuid);
    setIsLoading(true);
    setError(null);
    
    try {
      // Use AppState to load the form data
      const response = await appState.privateMethod({
        apiRoute: `questionnaire/${uuid}`,
        functionName: 'loadNextQuestionnaire',
        httpMethod: 'GET'
      });

      if (response && response.data) {
        console.log('✅ Next form loaded successfully');
        console.log('📄 Form data:', response.data);
        
        // Reset form state for new form
        setAnswers({});
        setCurrentPage(0);
        setDynamicFormData(response.data);
        
        return response.data;
      } else {
        throw new Error('No form data received from API');
      }
      
    } catch (err) {
      console.error('❌ Error loading next form:', err);
      setError(`Failed to load next form: ${err.message}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to get active form data consistently
  const getActiveFormData = () => {
    // Use dynamicFormData if available, fallback to static formData
    return dynamicFormData || formData;
  };

  // Get active form data
  const activeFormData = getActiveFormData();

  // Handle answer changes
  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  // Get current questions (for single page forms or multi-page forms)
  const getCurrentQuestions = () => {
    if (!activeFormData) return [];
    
    if (activeFormData.pages) {
      return activeFormData.pages[currentPage]?.questions || [];
    } else {
      return activeFormData.questions || [];
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    const activeFormData = getActiveFormData();
    const submissionData = {
      formId: activeFormData.formid,
      uuid: activeFormData.uuid,
      answers: answers
    };

    // Create the answered form JSON
    console.log('✅ IMPORTANT: We ARE using the original JSON from API!');
    console.log('✅ Original form structure from API:', activeFormData);
    console.log('✅ User answers to be merged:', answers);
    console.log('✅ CREATING ANSWERED FORM JSON...');
    const answeredFormJSON = createAnsweredFormJSON();

    // Print the revised JSON to console
    console.log('='.repeat(80));
    console.log('📋 FORM SUBMISSION - REVISED JSON');
    console.log('='.repeat(80));
    console.log(JSON.stringify(answeredFormJSON, null, 2));
    console.log('='.repeat(80));

    // Upload the revised JSON to /private_upload/ using AppState
    let uploadSuccess = false;
    try {
      console.log('📤 Uploading revised JSON as file to /private_upload/...');
      
      // All questionnaire submissions use the categorisation document endpoint
      const formType = activeFormData.formid || 'customer-categorisation';
      const documentType = 'categorisation';
      const apiRoute = `private_upload/document/${documentType}`;
      
      console.log('🎯 Using categorisation document endpoint for all questionnaire submissions');
      console.log('🎯 API route determined:', apiRoute);
      console.log('📋 Document type:', documentType);
      console.log('📝 Form type:', formType);
      
      // Convert the answered JSON file to base64 for upload using Buffer
      const fileDataString = JSON.stringify(answeredFormJSON, null, 2);
      const fileData = Buffer.from(fileDataString).toString('base64');
      const fileExtension = '.json';
      const documentCategory = 'categorisation';
      
      console.log('📄 JSON file data string length:', fileDataString.length);
      console.log('📄 JSON file data base64 length:', fileData.length);
      
      // Test that our encoding can be decoded back to valid JSON
      try {
        const testDecoded = Buffer.from(fileData, 'base64').toString('utf8');
        const testParsed = JSON.parse(testDecoded);
        console.log('✅ Buffer encoding test PASSED - can decode back to valid JSON');
        console.log('🔍 Decoded length:', testDecoded.length);
        console.log('🔍 Parsed keys:', Object.keys(testParsed || {}));
      } catch (testError) {
        console.error('❌ Buffer encoding test FAILED:', testError.message);
        console.error('❌ This means our base64 encoding is corrupted');
      }
      
      console.log('🔍 JSON structure check - answeredFormJSON keys:', Object.keys(answeredFormJSON || {}));
      console.log('🔍 Questions array exists:', !!answeredFormJSON?.questions);
      console.log('🔍 Questions array length:', answeredFormJSON?.questions?.length || 'N/A');
      console.log('🔍 Pages array exists:', !!answeredFormJSON?.pages);
      console.log('🔍 Pages array length:', answeredFormJSON?.pages?.length || 'N/A');
      console.log('🔍 Original form data (activeFormData):', activeFormData);
      console.log('🔍 User answers object:', answers);
      console.log('🔍 Final answered form structure:', answeredFormJSON);
      console.log('📂 File extension:', fileExtension);
      console.log('🏷️ Document category:', documentCategory);
      
      // Use AppState privateMethod for proper API authentication and routing
      console.log('🔒 Using AppState.privateMethod for file upload...');
      const uploadResult = await appState.privateMethod({
        apiRoute: apiRoute,
        params: {
          documentCategory,
          fileData,
          fileExtension,
          fileType: 'binary', // Indicate this is a binary file upload
          contentType: 'application/json', // Specify content type
          fileName: `questionnaire_${activeFormData.formid || 'form'}_${Date.now()}.json`, // Add filename
          uploadType: 'file' // Explicitly mark as file upload, not form processing
        },
        functionName: 'uploadDocument',
        httpMethod: 'POST'
      });

      console.log('✅ Successfully uploaded revised JSON to /private_upload/');
      
      // 🚀 COMPREHENSIVE SERVER RESPONSE LOGGING 🚀
      console.log('='.repeat(80));
      console.log('� SERVER RESPONSE ANALYSIS 📡');
      console.log('='.repeat(80));
      console.log('�📥 Full Upload Response Body:');
      console.log(JSON.stringify(uploadResult, null, 2));
      console.log('📊 Response Metadata:');
      console.log('  - Response Type:', typeof uploadResult);
      console.log('  - Response Keys:', uploadResult ? Object.keys(uploadResult) : 'null/undefined');
      console.log('  - Response Length:', uploadResult ? JSON.stringify(uploadResult).length : 0, 'chars');
      console.log('='.repeat(80));
      
      // Enhanced upload success validation
      console.log('🔍 Analyzing upload response for success indicators...');
      
      if (uploadResult) {
        // Check multiple success indicators
        const hasSuccessResult = uploadResult.result === 'success';
        const hasSuccessFlag = uploadResult.success === true;
        const hasNoError = uploadResult.error === null || uploadResult.error === undefined;
        const hasOkStatus = uploadResult.status === 'ok' || uploadResult.status === 'success';
        
        console.log('🔍 Success indicators:');
        console.log('  - result === "success":', hasSuccessResult);
        console.log('  - success === true:', hasSuccessFlag);
        console.log('  - error is null/undefined:', hasNoError);
        console.log('  - status is ok/success:', hasOkStatus);
        
        if (hasSuccessResult || hasSuccessFlag || (hasNoError && hasOkStatus)) {
          uploadSuccess = true;
          console.log('🎉 UPLOAD TEST PASSED: Server confirmed successful submission');
          
          // 🎉 SUCCESS ALERT FOR USER 🎉
          Alert.alert(
            '✅ Form Submitted Successfully!',
            'Your questionnaire has been submitted and processed by the server. Thank you for completing the form.',
            [{ text: 'OK', style: 'default' }]
          );
          
        } else {
          uploadSuccess = false;
          console.log('⚠️ UPLOAD TEST WARNING: No clear success indicators found');
          console.log('⚠️ Response content:', uploadResult);
          
          // Show warning to user about uncertain status
          Alert.alert(
            '⚠️ Submission Status Unclear',
            'The form was sent to the server, but we couldn\'t confirm if it was processed successfully. Please contact support if needed.',
            [{ text: 'OK', style: 'default' }]
          );
        }
      } else {
        uploadSuccess = false;
        console.log('❌ UPLOAD TEST FAILED: No response received from server');
      }

    } catch (uploadError) {
      console.error('❌ UPLOAD TEST FAILED:', uploadError.message);
      
      // 🚨 COMPREHENSIVE ERROR LOGGING 🚨
      console.log('='.repeat(80));
      console.log('🚨 UPLOAD ERROR ANALYSIS 🚨');
      console.log('='.repeat(80));
      console.error('📋 Full error details:', uploadError);
      console.error('🔍 Error name:', uploadError.name);
      console.error('🔍 Error message:', uploadError.message);
      console.error('🔍 Error stack:', uploadError.stack);
      
      // Try to extract server response from error if available
      if (uploadError.response) {
        console.log('📡 Server Error Response:');
        console.log('  - Status:', uploadError.response.status);
        console.log('  - StatusText:', uploadError.response.statusText);
        console.log('  - Data:', JSON.stringify(uploadError.response.data, null, 2));
      }
      console.log('='.repeat(80));
      
      // Detailed error analysis for different error types
      if (uploadError.message.includes('network') || uploadError.message.includes('timeout')) {
        console.error('🌐 NETWORK ERROR: Connection or timeout issue detected');
      } else if (uploadError.message.includes('auth') || uploadError.message.includes('401') || uploadError.message.includes('403')) {
        console.error('🔐 AUTHENTICATION ERROR: User may need to re-login');
      } else if (uploadError.message.includes('400') || uploadError.message.includes('validation')) {
        console.error('📋 VALIDATION ERROR: Form data may be invalid');
      } else {
        console.error('❓ UNKNOWN ERROR: Unexpected error type');
      }
      
      uploadSuccess = false;
      
      // Enhanced user-friendly error message
      Alert.alert(
        '❌ Form Submission Failed',
        `Failed to submit form: ${uploadError.message}. Please check your connection and try again. If the problem persists, contact support.`,
        [{ text: 'OK', style: 'destructive' }]
      );
    }

    // Log final upload test result
    console.log('='.repeat(50));
    console.log(`🔍 UPLOAD TEST RESULT: ${uploadSuccess ? 'SUCCESS ✅' : 'FAILED ❌'}`);
    console.log('='.repeat(50));

    // NEW: If form has a submiturl, post to API
    if (activeFormData.submiturl) {
      try {
        console.log('='.repeat(80));
        console.log('📤 SENDING FORM TO API ENDPOINT 📤');
        console.log('='.repeat(80));
        console.log('🔗 Submit URL:', activeFormData.submiturl);
        console.log('📋 Submission Data:', JSON.stringify(submissionData, null, 2));
        console.log('='.repeat(80));
        
        const response = await fetch(activeFormData.submiturl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submissionData)
        });

        console.log('📡 API Response Status:', response.status);
        console.log('📡 API Response OK:', response.ok);
        console.log('📡 API Response Headers:', JSON.stringify([...response.headers.entries()], null, 2));

        if (!response.ok) {
          throw new Error(`Failed to submit form: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        
        // 🚀 COMPREHENSIVE API RESPONSE LOGGING 🚀
        console.log('='.repeat(80));
        console.log('📡 API ENDPOINT RESPONSE ANALYSIS 📡');
        console.log('='.repeat(80));
        console.log('✅ Form submitted successfully to API endpoint');
        console.log('📥 API Response Body:');
        console.log(JSON.stringify(result, null, 2));
        console.log('📊 API Response Metadata:');
        console.log('  - Response Type:', typeof result);
        console.log('  - Response Keys:', result ? Object.keys(result) : 'null/undefined');
        console.log('  - Response Length:', result ? JSON.stringify(result).length : 0, 'chars');
        console.log('='.repeat(80));
        
        // 🎉 SUCCESS ALERT FOR API SUBMISSION 🎉
        Alert.alert(
          '✅ Form Submitted to API!',
          'Your questionnaire has been submitted to the API endpoint and processed successfully.',
          [{ text: 'OK', style: 'default' }]
        );
        
        if (onSubmit) {
          onSubmit({ 
            ...submissionData, 
            serverResponse: result, 
            filledFormJSON: answeredFormJSON,
            uploadSuccess: uploadSuccess
          });
        }
      } catch (err) {
        console.log('='.repeat(80));
        console.log('🚨 API SUBMISSION ERROR 🚨');
        console.log('='.repeat(80));
        console.error('❌ Failed to submit form to API:', err.message);
        console.error('📋 Full API error details:', err);
        console.error('🔍 Error name:', err.name);
        console.error('🔍 Error stack:', err.stack);
        console.log('='.repeat(80));
        
        // 🚨 ERROR ALERT FOR API SUBMISSION 🚨
        Alert.alert(
          '❌ API Submission Failed',
          `Failed to submit form to API: ${err.message}. Please check your connection and try again.`,
          [{ text: 'OK', style: 'destructive' }]
        );
      }
    } else {
      console.log('✅ Form completed (no submit URL provided)');
      
      // Check if this is the first form and we need to load the next one
      const isFirstForm = activeFormData.formid === 'customer-categorisation';
      const nextFormUUID = 'f47fa99b-728c-4305-a6f9-3fece7f6c80d'; // Crypto suitability assessment
      
      if (isFirstForm && uploadSuccess) {
        console.log('🔄 First form completed successfully, loading crypto suitability assessment...');
        
        try {
          // Load the crypto suitability assessment form
          const nextFormData = await loadNextFormFromAPI(nextFormUUID);
          
          console.log('✅ Next form loaded successfully, staying on same component');
          console.log('📋 New form title:', nextFormData.formtitle);
          console.log('📋 New form ID:', nextFormData.formid);
          
          // Don't call onSubmit yet - let user complete the second form
          return;
          
        } catch (error) {
          console.error('❌ Failed to load next form:', error);
          Alert.alert(
            'Error Loading Next Form',
            'The first form was submitted successfully, but we could not load the crypto suitability assessment. Please try again.',
            [{ text: 'OK' }]
          );
        }
      }
      
      // For the second form or if first form fails to load next, complete normally
      console.log('✅ Form questionnaire process completed');
      console.log('📋 Final submission data prepared');
      
      // 🎉 COMPLETION ALERT FOR USER 🎉
      const isSecondForm = activeFormData.formid === 'crypto-appropriateness-assessment';
      Alert.alert(
        '🎉 Questionnaire Complete!',
        isSecondForm 
          ? 'You have successfully completed both questionnaires. Thank you!'
          : 'Your questionnaire has been completed and saved. Thank you!',
        [{ text: 'OK', style: 'default' }]
      );
      
      if (onSubmit) {
        onSubmit({ 
          ...submissionData, 
          filledFormJSON: answeredFormJSON,
          uploadSuccess: uploadSuccess,
          isSecondForm: isSecondForm
        });
      }
    }
  };

  // NEW: Render loading state
  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading questionnaire...</Text>
      </View>
    );
  }

  // NEW: Render error state
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error loading form: {error}</Text>
        <Button mode="outlined" onPress={loadFormFromAPI} style={styles.retryButton}>
          Retry
        </Button>
      </View>
    );
  }

  // Show message if no form data available or if we're in an initializing state
  if (!activeFormData || (!formDataInitialized && !isLoading && !apiEndpoint && !formId)) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>No form data available</Text>
      </View>
    );
  }

  // Helper functions (must be defined before JSX)
  const renderQuestion = (question, index, allQuestions) => {
    const questionKey = `${currentPage}_${question.id}`;
    const currentAnswer = answers[question.id] || question.answer || '';

    switch (question.type) {
      case 'legend':
        return (
          <View key={questionKey} style={styles.questionContainer}>
            <Text style={styles.legendText}>{question.label}</Text>
            {question.guidance ? (
              <Text style={styles.questionGuidance}>{question.guidance}</Text>
            ) : null}
          </View>
        );

      case 'text':
      case 'email':
      case 'password':
        return (
          <View key={questionKey} style={styles.questionContainer}>
            <Text style={styles.questionLabel}>{question.label}</Text>
            {question.guidance ? (
              <Text style={styles.questionGuidance}>{question.guidance}</Text>
            ) : null}
            <TextInput
              style={styles.textInput}
              value={currentAnswer}
              placeholder={question.placeholder || ''}
              secureTextEntry={question.type === 'password'}
              keyboardType={question.type === 'email' ? 'email-address' : 'default'}
              onChangeText={(text) => updateAnswer(question.id, text)}
              mode="outlined"
            />
          </View>
        );

      case 'textarea':
        return (
          <View key={questionKey} style={styles.questionContainer}>
            <Text style={styles.questionLabel}>{question.label}</Text>
            {question.guidance ? (
              <Text style={styles.questionGuidance}>{question.guidance}</Text>
            ) : null}
            <TextInput
              style={styles.textInput}
              value={currentAnswer}
              placeholder={question.placeholder || ''}
              onChangeText={(text) => updateAnswer(question.id, text)}
              mode="outlined"
              multiline
              numberOfLines={4}
            />
          </View>
        );

      case 'radio':
        return (
          <View key={questionKey} style={styles.questionContainer}>
            <Text style={styles.questionLabel}>{question.label}</Text>
            {question.guidance ? (
              <Text style={styles.questionGuidance}>{question.guidance}</Text>
            ) : null}
            <View style={styles.radioGroupContainer}>
              {question.values?.map((option, optionIndex) => (
                <TouchableOpacity 
                  key={`${questionKey}_${option.id}`}
                  style={[
                    styles.radioOptionContainer,
                    currentAnswer === option.id && styles.radioOptionSelected
                  ]}
                  onPress={() => updateAnswer(question.id, option.id)}
                  activeOpacity={0.7}
                >
                  <RadioButton
                    value={option.id}
                    status={currentAnswer === option.id ? 'checked' : 'unchecked'}
                    onPress={() => updateAnswer(question.id, option.id)}
                    color="#1976D2"
                    uncheckedColor="#757575"
                  />
                  <Text style={[
                    styles.radioLabel,
                    currentAnswer === option.id && styles.radioLabelSelected
                  ]}>
                    {option.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      default:
        console.warn('Unknown question type:', question.type);
        return (
          <View key={questionKey} style={styles.questionContainer}>
            <Text style={styles.questionLabel}>
              Unsupported question type: {question.type}
            </Text>
          </View>
        );
    }
  };

  const updateAnswer = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  // Function to create a copy of the form JSON with filled answers
  const createAnsweredFormJSON = () => {
    const activeFormData = getActiveFormData();
    if (!activeFormData) return null;

    // Create a deep copy of the form data
    const answeredForm = JSON.parse(JSON.stringify(activeFormData));

    // Helper function to recursively fill answers in questions
    const fillAnswersInQuestions = (questions) => {
      if (!Array.isArray(questions)) return;
      
      questions.forEach(question => {
        if (question.id && answers[question.id] !== undefined) {
          question.answer = answers[question.id];
        }
      });
    };

    // Fill answers in top-level questions
    if (answeredForm.questions) {
      fillAnswersInQuestions(answeredForm.questions);
    }

    // Fill answers in page-based questions
    if (answeredForm.pages) {
      answeredForm.pages.forEach(page => {
        if (page.questions) {
          fillAnswersInQuestions(page.questions);
        }
      });
    }

    // Add additional structure that the server might expect for appropriateness documents
    answeredForm.responses = answeredForm.responses || [];
    answeredForm.results = answeredForm.results || {};
    answeredForm.metadata = answeredForm.metadata || {
      submissionDate: new Date().toISOString(),
      formVersion: answeredForm.formid || 'unknown',
      documentType: 'appropriateness'
    };

    // Ensure critical arrays exist even if empty
    if (!answeredForm.questions) {
      answeredForm.questions = [];
    }
    if (!answeredForm.pages) {
      answeredForm.pages = [];
    }

    return answeredForm;
  };

  const isLastPage = () => {
    const activeFormData = getActiveFormData();
    if (activeFormData?.pages) {
      return currentPage >= activeFormData.pages.length - 1;
    }
    return true;
  };

  const handleNext = () => {
    const activeFormData = getActiveFormData();
    if (activeFormData?.pages && currentPage < activeFormData.pages.length - 1) {
      setCurrentPage(currentPage + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Your existing rendering logic remains the same!
  const currentQuestions = getCurrentQuestions();

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <Text variant="headlineSmall" style={styles.formTitle}>
              {activeFormData.formtitle}
            </Text>
            
            {activeFormData.formintro && (
              <Text variant="bodyMedium" style={styles.formIntro}>
                {activeFormData.formintro}
              </Text>
            )}

            {/* Page indicator for multi-page forms */}
            {activeFormData.pages && activeFormData.pages.length > 1 && (
              <Text variant="bodySmall" style={styles.pageIndicator}>
                Page {currentPage + 1} of {activeFormData.pages.length}
              </Text>
            )}

            {/* Render questions */}
            {currentQuestions.map((question, index) => 
              renderQuestion(question, index, currentQuestions)
            )}
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Navigation buttons */}
      <View style={styles.navigationContainer}>
        {currentPage > 0 && (
          <Button 
            mode="outlined" 
            onPress={handlePrevious}
            style={styles.navButton}
            icon="arrow-left"
          >
            Previous
          </Button>
        )}
        
        <Button 
          mode="contained" 
          onPress={handleNext}
          style={styles.navButton}
          icon={isLastPage() ? "check" : "arrow-right"}
          contentStyle={{ flexDirection: 'row-reverse' }}
        >
          {isLastPage() ? (activeFormData.submittext || 'Submit') : 'Next'}
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    marginTop: 16,
  },
  contentContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  card: {
    margin: 16,
    elevation: 4,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1976D2',
  },
  pageIndicator: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  navButton: {
    minWidth: 100,
  },
  questionContainer: {
    marginBottom: 20,
  },
  questionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  questionGuidance: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  textInput: {
    marginBottom: 8,
  },
  radioGroupContainer: {
    marginTop: 8,
  },
  radioOptionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#ffffff',
  },
  radioOptionSelected: {
    borderColor: '#1976D2',
    backgroundColor: '#f3f8ff',
  },
  radioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  radioLabel: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  radioLabelSelected: {
    color: '#1976D2',
    fontWeight: '500',
  },
  legendText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
});

export default DynamicQuestionnaireForm;
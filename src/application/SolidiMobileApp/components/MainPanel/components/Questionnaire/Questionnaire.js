// React imports
import React, { useContext, useEffect, useState } from 'react';
import { Text, TextInput, StyleSheet, View, ScrollView, Alert, TouchableOpacity, useWindowDimensions } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { RadioButton, Checkbox, Title } from 'react-native-paper';
// import RenderHtml from 'react-native-render-html'; // Temporarily commented out to fix bundling issue

// Other imports
import _ from 'lodash';
import DocumentPicker from 'react-native-document-picker';

// Internal imports
import AppStateContext from 'src/application/data';
import { StandardButton } from 'src/components/atomic';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import { colors } from 'src/constants';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('Questionnaire');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);

// Variable substitution function for dynamic form generation
const substituteVariables = (text, appState) => {
  if (!text || typeof text !== 'string') return text;
  
  // Get user information
  const firstName = appState.getUserInfo('firstName') || '';
  const lastName = appState.getUserInfo('lastName') || '';
  const todaysdate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric'
  });

  return text
    .replace(/\$\{firstname\}/g, firstName)
    .replace(/\$\{lastname\}/g, lastName)
    .replace(/\$\{todaysdate\}/g, todaysdate);
};

// Simple HTML renderer for basic tags
const renderHtmlText = (htmlString) => {
  if (!htmlString) return '';
  
  // Split by HTML tags and render accordingly
  const parts = htmlString.split(/(<[^>]*>)/);
  let result = [];
  let key = 0;
  
  const processText = (text, style = {}) => {
    // Handle <br> tags by splitting on them
    if (text.includes('<br>')) {
      return text.split('<br>').map((part, index) => (
        <React.Fragment key={`br-${key++}`}>
          {index > 0 && '\n'}
          {part}
        </React.Fragment>
      ));
    }
    return text;
  };
  
  let currentStyle = {};
  let skipNext = false;
  
  for (let i = 0; i < parts.length; i++) {
    if (skipNext) {
      skipNext = false;
      continue;
    }
    
    const part = parts[i];
    
    if (part.startsWith('<') && part.endsWith('>')) {
      const tag = part.toLowerCase();
      if (tag === '<h5>') {
        currentStyle = { fontWeight: 'bold', fontSize: 16 };
      } else if (tag === '</h5>') {
        currentStyle = {};
      } else if (tag === '<h2>') {
        currentStyle = { fontWeight: 'bold', fontSize: 20 };
      } else if (tag === '</h2>') {
        currentStyle = {};
      } else if (tag === '<b>') {
        currentStyle = { ...currentStyle, fontWeight: 'bold' };
      } else if (tag === '</b>') {
        currentStyle = { ...currentStyle, fontWeight: 'normal' };
      } else if (tag.startsWith('<a ')) {
        currentStyle = { ...currentStyle, color: 'blue', textDecorationLine: 'underline' };
      } else if (tag === '</a>') {
        currentStyle = { ...currentStyle, color: 'black', textDecorationLine: 'none' };
      }
    } else if (part.trim()) {
      result.push(
        <Text key={key++} style={currentStyle}>
          {processText(part, currentStyle)}
        </Text>
      );
    }
  }
  
  return result.length > 0 ? result : htmlString;
};

// Available forms - add new forms here as needed
const availableForms = {
  'account-purpose-questionnaire': () => require('../../../../../../assets/json/account-purpose-questionnaire.json'),
  'business-account-application-form': () => require('../../../../../../assets/json/business-account-application-form.json'),
  'business-account-application-review': () => require('../../../../../../../src/assets/json/business-account-application-review.json'),
  'cryptobasket-limits-form': () => require('../../../../../../../src/assets/json/cryptobasket-limits-form.json'),
  'enhanced-due-diligence-form': () => require('../../../../../../../src/assets/json/enhanced-due-diligence-form.json'),
  'enhanced-due-diligence-review-form': () => require('../../../../../../../src/assets/json/enhanced-due-diligence-review-form.json'),
  'finprom-categorisation': () => require('../../../../../../../src/assets/json/finprom-categorisation.json'),
  'finprom-suitability': () => require('../../../../../../../src/assets/json/finprom-suitability.json'),
  'finprom-suitability2': () => require('../../../../../../../src/assets/json/finprom-suitability2.json'),
  'professional-tier-application-form': () => require('../../../../../../../src/assets/json/professional-tier-application-form.json'),
  'professional-tier-application-review-form': () => require('../../../../../../../src/assets/json/professional-tier-application-review-form.json'),
  'transaction-monitor-withdraw-questions': () => require('../../../../../../../src/assets/json/transaction-monitor-withdraw-questions.json'),
  'travel-rule-deposit-questions': () => require('../../../../../../../src/assets/json/travel-rule-deposit-questions.json'),
  'travel-rule-withdraw-questions': () => require('../../../../../../assets/json/travel-rule-withdraw-questions.json'),
};

let Questionnaire = () => {

  let appState = useContext(AppStateContext);
  let [renderCount, triggerRender] = useState(0);
  let stateChangeID = appState.stateChangeID;
  const { width } = useWindowDimensions();

  // Form selection state - use pageName to determine form
  const pageName = appState.pageName;
  let selectedForm = pageName || 'finprom-categorisation'; // Default to finprom-categorisation for testing
  let [questionnaireData, setQuestionnaireData] = useState(null);

  // Form state
  let [answers, setAnswers] = useState({});
  let [uploadedFiles, setUploadedFiles] = useState({});
  let [errorMessage, setErrorMessage] = useState('');
  let [uploadMessage, setUploadMessage] = useState('');
  let [disableSubmitButton, setDisableSubmitButton] = useState(false);

  // Navigation state - supports both question-based and page-based navigation
  let [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  let [currentPageIndex, setCurrentPageIndex] = useState(0);
  let [currentPageQuestionIndex, setCurrentPageQuestionIndex] = useState(0);
  let [isPageBasedForm, setIsPageBasedForm] = useState(false);

  // Load form data on component mount
  useEffect(() => {
    loadFormData();
    // Initialize state
    setAnswers({});
    setErrorMessage('');
    setUploadMessage('');
    setCurrentQuestionIndex(0);
    setCurrentPageIndex(0);
    setCurrentPageQuestionIndex(0);
  }, []);

  // Initial setup
  useEffect(() => {
    setup();
  }, [questionnaireData]);

  // Reset navigation when form changes
  useEffect(() => {
    setCurrentQuestionIndex(0);
    setCurrentPageIndex(0);
    setCurrentPageQuestionIndex(0);
    setAnswers({});
    setErrorMessage('');
    loadFormData();
  }, [selectedForm]);

  let loadFormData = () => {
    try {
      console.log(`Loading form: ${selectedForm}`);
      const formLoader = availableForms[selectedForm];
      if (formLoader) {
        const data = formLoader();
        console.log(`Loaded form data:`, {
          formtitle: data.formtitle,
          hasPages: !!data.pages,
          hasQuestions: !!data.questions,
          questionsCount: data.questions ? data.questions.length : 0,
          pagesCount: data.pages ? data.pages.length : 0
        });
        
        // Handle different JSON structures
        let processedData = { ...data };
        
        // Apply variable substitution to form data
        const processFormWithVariables = (formData) => {
          if (formData.pages && Array.isArray(formData.pages)) {
            formData.pages = formData.pages.map(page => ({
              ...page,
              questions: page.questions ? page.questions.map(question => ({
                ...question,
                label: substituteVariables(question.label, appState),
                guidance: substituteVariables(question.guidance, appState),
                placeholder: substituteVariables(question.placeholder, appState),
                value: substituteVariables(question.value, appState),
                values: question.values ? question.values.map(value => ({
                  ...value,
                  text: substituteVariables(value.text, appState),
                  value: substituteVariables(value.value, appState)
                })) : question.values
              })) : page.questions
            }));
          }
          
          if (formData.questions && Array.isArray(formData.questions)) {
            formData.questions = formData.questions.map(question => ({
              ...question,
              label: substituteVariables(question.label, appState),
              guidance: substituteVariables(question.guidance, appState),
              placeholder: substituteVariables(question.placeholder, appState),
              value: substituteVariables(question.value, appState),
              values: question.values ? question.values.map(value => ({
                ...value,
                text: substituteVariables(value.text, appState),
                value: substituteVariables(value.value, appState)
              })) : question.values
            }));
          }
          
          return formData;
        };
        
        processedData = processFormWithVariables(processedData);
        
        // Check if this is a page-based form
        if (data.pages && Array.isArray(data.pages) && data.pages.length > 0) {
          console.log('Detected page-based form');
          setIsPageBasedForm(true);
          // Keep the pages structure intact for page-based navigation
          
          // Also create a flattened questions array for compatibility
          let allQuestions = [];
          processedData.pages.forEach(page => {
            if (page.questions && Array.isArray(page.questions)) {
              allQuestions = allQuestions.concat(page.questions);
            }
          });
          processedData.questions = allQuestions;
          console.log(`Flattened ${allQuestions.length} questions from ${data.pages.length} pages`);
        } else {
          console.log('Detected traditional question-based form');
          setIsPageBasedForm(false);
          // Traditional question-based form
          if (!processedData.questions) {
            processedData.questions = [];
          }
          console.log(`Form has ${processedData.questions.length} questions`);
        }
        
        setQuestionnaireData(processedData);
      } else {
        console.log(`No form loader found for: ${selectedForm}`);
      }
    } catch (err) {
      console.log(`Error loading form ${selectedForm}:`, err);
      // Set empty structure to prevent crashes
      setQuestionnaireData({
        formtitle: 'Error Loading Form',
        formintro: 'There was an error loading this form.',
        questions: [],
        pages: []
      });
      setIsPageBasedForm(false);
    }
  };

  let setup = async () => {
    try {
      if (!questionnaireData) return;
      
      await appState.generalSetup();
      if (appState.stateChangeIDHasChanged(stateChangeID)) return;
      
      // Initialize answers with empty values or pre-filled values with variable substitution
      let initialAnswers = {};
      
      if (isPageBasedForm && questionnaireData.pages) {
        // Initialize from page-based structure
        questionnaireData.pages.forEach(page => {
          if (page.questions && Array.isArray(page.questions)) {
            page.questions.forEach(question => {
              if (question.id) {
                // Use pre-filled value if available, otherwise empty string
                initialAnswers[question.id] = question.value || question.answer || '';
                console.log(`Initialized ${question.id} with value: "${initialAnswers[question.id]}"`);
              }
            });
          }
        });
      } else if (questionnaireData.questions && Array.isArray(questionnaireData.questions)) {
        // Initialize from traditional question structure
        questionnaireData.questions.forEach(question => {
          if (question.id) {
            // Use pre-filled value if available, otherwise empty string
            initialAnswers[question.id] = question.value || question.answer || '';
            console.log(`Initialized ${question.id} with value: "${initialAnswers[question.id]}"`);
          }
        });
      }
      
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

  // Function to group legend questions with the next non-legend question
  let getQuestionGroup = (questions, questionIndex) => {
    if (!questions || !Array.isArray(questions) || questionIndex >= questions.length) {
      return { legends: [], mainQuestion: null, nextIndex: questionIndex };
    }

    let legends = [];
    let currentIndex = questionIndex;
    let mainQuestion = null;

    // Collect all legend questions starting from the current index
    while (currentIndex < questions.length) {
      const currentQuestion = questions[currentIndex];
      
      if (currentQuestion.type === 'legend' || currentQuestion.type === 'header') {
        legends.push(currentQuestion);
        currentIndex++;
      } else {
        // Found the first non-legend question
        mainQuestion = currentQuestion;
        break;
      }
    }

    // If we only found legends and no main question, treat the last legend as standalone
    if (legends.length > 0 && !mainQuestion) {
      mainQuestion = legends.pop(); // Take the last legend as the main question
    }

    return {
      legends: legends,
      mainQuestion: mainQuestion,
      nextIndex: currentIndex + 1
    };
  };

  // Function to count total question groups (for progress display)
  let countQuestionGroups = (questions) => {
    if (!questions || !Array.isArray(questions)) return 0;
    
    let groupCount = 0;
    let index = 0;
    
    while (index < questions.length) {
      const group = getQuestionGroup(questions, index);
      if (group.mainQuestion || group.legends.length > 0) {
        groupCount++;
      }
      index = group.nextIndex;
    }
    
    return groupCount;
  };

  // Function to get current question group index (for progress display)
  let getCurrentQuestionGroupIndex = (questions, currentIndex) => {
    if (!questions || !Array.isArray(questions)) return 0;
    
    let groupIndex = 0;
    let index = 0;
    
    while (index < questions.length && index <= currentIndex) {
      const group = getQuestionGroup(questions, index);
      if (index === currentIndex) {
        return groupIndex;
      }
      if (group.mainQuestion || group.legends.length > 0) {
        groupIndex++;
      }
      index = group.nextIndex;
    }
    
    return groupIndex;
  };

  // Handle radio button selection
  let handleRadioChange = (questionId, value) => {
    setAnswers(prevAnswers => ({
      ...prevAnswers,
      [questionId]: value
    }));
  };

  // Handle checkbox selection (multiple values)
  let handleCheckboxChange = (questionId, optionId) => {
    setAnswers(prevAnswers => {
      const currentValues = prevAnswers[questionId] || [];
      let newValues;
      
      if (currentValues.includes(optionId)) {
        // Remove the option if it's already selected
        newValues = currentValues.filter(id => id !== optionId);
      } else {
        // Add the option if it's not selected
        newValues = [...currentValues, optionId];
      }
      
      return {
        ...prevAnswers,
        [questionId]: newValues
      };
    });
  };

  // Handle file upload with proper document picker
  let handleFileUpload = async (questionId) => {
    try {
      setUploadMessage('Opening file picker...');
      
      const result = await DocumentPicker.pick({
        type: [
          DocumentPicker.types.pdf,
          DocumentPicker.types.images,
          DocumentPicker.types.doc,
          DocumentPicker.types.docx,
          DocumentPicker.types.plainText,
        ],
        allowMultiSelection: false,
      });

      if (result && result[0]) {
        const file = result[0];
        
        setUploadedFiles(prevFiles => ({
          ...prevFiles,
          [questionId]: {
            name: file.name,
            uri: file.uri,
            type: file.type,
            size: file.size,
          }
        }));
        
        // Store file reference in answers
        setAnswers(prevAnswers => ({
          ...prevAnswers,
          [questionId]: file.name
        }));
        
        setUploadMessage(`File "${file.name}" uploaded successfully`);
        setTimeout(() => setUploadMessage(''), 3000);
      }
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        setUploadMessage('File selection cancelled');
        setTimeout(() => setUploadMessage(''), 2000);
      } else {
        console.error('Document picker error:', err);
        setUploadMessage('Error selecting file. Please try again.');
        setTimeout(() => setUploadMessage(''), 3000);
      }
    }
  };

  // Validate form
  let validateForm = () => {
    let missingFields = [];
    let invalidFields = [];
    
    // Get all questions from either questions array or pages array
    let allQuestions = [];
    if (isPageBasedForm && questionnaireData.pages) {
      questionnaireData.pages.forEach(page => {
        if (page.questions) {
          allQuestions.push(...page.questions);
        }
      });
    } else if (questionnaireData.questions) {
      allQuestions = questionnaireData.questions;
    }
    
    allQuestions.forEach(question => {
      // Skip validation for display-only question types
      if (question.type === 'legend' || question.type === 'header' || !question.id) {
        return;
      }
      
      const answer = answers[question.id];
      
      // Check if answer exists and is not empty
      if (!answer || (typeof answer === 'string' && answer.trim() === '')) {
        missingFields.push(question.label?.replace(/<[^>]*>/g, '') || question.id); // Strip HTML tags
        return;
      }
      
      // For number fields, validate constraints
      if (question.type === 'number') {
        const numValue = parseFloat(answer);
        if (isNaN(numValue)) {
          invalidFields.push(`${question.label?.replace(/<[^>]*>/g, '') || question.id} (must be a valid number)`);
        } else {
          if (question.min !== undefined && numValue < question.min) {
            invalidFields.push(`${question.label?.replace(/<[^>]*>/g, '') || question.id} (minimum value: ${question.min})`);
          }
          if (question.max !== undefined && numValue > question.max) {
            invalidFields.push(`${question.label?.replace(/<[^>]*>/g, '') || question.id} (maximum value: ${question.max})`);
          }
        }
      }
    });

    // Special validation for finprom-categorisation form
    if (questionnaireData.formid === 'customer-categorisation' || selectedForm === 'finprom-categorisation') {
      const accountPurpose = answers['accountpurpose'];
      
      if (accountPurpose === 'hnw') {
        // High-Net-Worth investor validation
        const hnwIncome = answers['hnwincome'];
        const hnwAssets = answers['hnwassets'];
        const hnwIncomeAmount = parseFloat(answers['hnwincomeamount'] || 0);
        const hnwAssetsAmount = parseFloat(answers['hwnassetsamount'] || 0);
        
        // Must select Yes for one of the hnwincome and hnwassets questions
        // AND meet the minimum thresholds
        const hasValidIncome = hnwIncome === 'yes' && hnwIncomeAmount >= 100000;
        const hasValidAssets = hnwAssets === 'yes' && hnwAssetsAmount >= 250000;
        
        if (!hasValidIncome && !hasValidAssets) {
          invalidFields.push('Your income should be 100,000 or more, and your assets should be 250000 or more');
        }
      }
      
      if (accountPurpose === 'restricted') {
        // Restricted investor validation
        const prev12months = answers['prev12months'];
        const next12months = answers['next12months'];
        const prevAmount = parseFloat(answers['prevamount'] || 0);
        const nextAmount = parseFloat(answers['nextamount'] || 0);
        
        // Must select Yes for both prev12months and next12months
        if (prev12months !== 'yes' || next12months !== 'yes') {
          invalidFields.push('For Restricted investors: You must select "Yes" for both previous and next 12 months questions');
        }
        
        // Must enter up to 10 for both prevamount and nextamount
        if (prevAmount > 10 || nextAmount > 10) {
          invalidFields.push('Invalid. Your amount should less than 10 if you are a restricted investor');
        }
      }
    }
    
    if (missingFields.length > 0) {
      setErrorMessage(`Please fill in the following required fields: ${missingFields.join(', ')}`);
      return false;
    }
    
    if (invalidFields.length > 0) {
      setErrorMessage(`Please correct the following:\n\n${invalidFields.join('\n\n')}`);
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

  // Navigation functions
  let goToNextQuestion = () => {
    if (isPageBasedForm) {
      return goToNextInPage();
    }
    
    if (!validateCurrentQuestion()) {
      setErrorMessage('Please answer this question before continuing.');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    if (questionnaireData && 
        questionnaireData.questions && 
        Array.isArray(questionnaireData.questions) && 
        currentQuestionIndex < questionnaireData.questions.length - 1) {
      
      setErrorMessage(''); // Clear any existing error
      
      // Find the next question group to skip over legend-only questions
      const currentGroup = getQuestionGroup(questionnaireData.questions, currentQuestionIndex);
      const nextIndex = currentGroup.nextIndex;
      
      if (nextIndex < questionnaireData.questions.length) {
        setCurrentQuestionIndex(nextIndex);
      }
    }
  };

  let goToPreviousQuestion = () => {
    if (isPageBasedForm) {
      return goToPreviousInPage();
    }
    
    if (currentQuestionIndex > 0) {
      // Find the previous non-legend question
      let prevIndex = currentQuestionIndex - 1;
      
      // Skip backwards over any legend questions to find the previous actual question
      while (prevIndex >= 0 && 
             questionnaireData.questions[prevIndex] && 
             (questionnaireData.questions[prevIndex].type === 'legend' || 
              questionnaireData.questions[prevIndex].type === 'header')) {
        prevIndex--;
      }
      
      if (prevIndex >= 0) {
        setCurrentQuestionIndex(prevIndex);
      }
    }
  };

  // Page-based navigation functions (question by question within pages)
  let goToNextInPage = () => {
    if (!validateCurrentPageQuestion()) {
      setErrorMessage('Please answer the current question before continuing.');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    if (questionnaireData && questionnaireData.pages && questionnaireData.pages[currentPageIndex]) {
      const currentPage = questionnaireData.pages[currentPageIndex];
      
      // Find the next question group to skip over legend-only questions
      const currentGroup = getQuestionGroup(currentPage.questions, currentPageQuestionIndex);
      const nextIndex = currentGroup.nextIndex;
      
      // Move to next question in current page
      if (nextIndex < currentPage.questions.length) {
        setCurrentPageQuestionIndex(nextIndex);
        setErrorMessage(''); // Clear any existing error
      } 
      // Move to next page if at end of current page questions
      else if (currentPageIndex < questionnaireData.pages.length - 1) {
        setCurrentPageIndex(currentPageIndex + 1);
        setCurrentPageQuestionIndex(0);
        setErrorMessage(''); // Clear any existing error
      }
    }
  };

  let goToPreviousInPage = () => {
    // Move to previous question in current page
    if (currentPageQuestionIndex > 0) {
      // Find the previous non-legend question in current page
      const currentPage = questionnaireData.pages[currentPageIndex];
      let prevIndex = currentPageQuestionIndex - 1;
      
      // Skip backwards over any legend questions to find the previous actual question
      while (prevIndex >= 0 && 
             currentPage.questions[prevIndex] && 
             (currentPage.questions[prevIndex].type === 'legend' || 
              currentPage.questions[prevIndex].type === 'header')) {
        prevIndex--;
      }
      
      if (prevIndex >= 0) {
        setCurrentPageQuestionIndex(prevIndex);
      }
      setErrorMessage(''); // Clear any existing error
    }
    // Move to previous page if at beginning of current page questions
    else if (currentPageIndex > 0) {
      const previousPageIndex = currentPageIndex - 1;
      setCurrentPageIndex(previousPageIndex);
      
      // Set to last question of previous page
      if (questionnaireData && questionnaireData.pages && questionnaireData.pages[previousPageIndex]) {
        const previousPage = questionnaireData.pages[previousPageIndex];
        setCurrentPageQuestionIndex(Math.max(0, previousPage.questions.length - 1));
      }
      setErrorMessage(''); // Clear any existing error
    }
  };

  let isFirstQuestion = () => {
    if (isPageBasedForm) {
      return currentPageIndex === 0 && currentPageQuestionIndex === 0;
    } else {
      return currentQuestionIndex === 0;
    }
  };
  
  let isLastQuestion = () => {
    if (isPageBasedForm) {
      if (!questionnaireData || !questionnaireData.pages || !Array.isArray(questionnaireData.pages)) {
        return false;
      }
      // Check if we're on the last page and last question of that page
      const isLastPage = currentPageIndex === questionnaireData.pages.length - 1;
      if (!isLastPage) return false;
      
      const lastPage = questionnaireData.pages[currentPageIndex];
      if (!lastPage || !lastPage.questions) return false;
      
      return currentPageQuestionIndex === lastPage.questions.length - 1;
    } else {
      if (!questionnaireData || !questionnaireData.questions || !Array.isArray(questionnaireData.questions)) {
        return false;
      }
      return currentQuestionIndex === questionnaireData.questions.length - 1;
    }
  };

  // Validate current question
  let validateCurrentQuestion = () => {
    if (!questionnaireData || !questionnaireData.questions[currentQuestionIndex]) {
      return false;
    }

    const currentQuestion = questionnaireData.questions[currentQuestionIndex];
    
    // Skip validation for display-only question types
    if (currentQuestion.type === 'legend' || currentQuestion.type === 'header' || !currentQuestion.id) {
      return true;
    }
    
    const answer = answers[currentQuestion.id];

    // Check if answer exists and is not empty
    if (!answer) {
      return false;
    }

    // For text fields, check if not just whitespace
    if (typeof answer === 'string' && answer.trim() === '') {
      return false;
    }

    // For checkbox arrays, check if at least one is selected
    if (Array.isArray(answer) && answer.length === 0) {
      return false;
    }

    // For number fields, validate numeric constraints
    if (currentQuestion.type === 'number') {
      const numValue = parseFloat(answer);
      if (isNaN(numValue)) {
        return false;
      }
      
      // Check min/max constraints if provided
      if (currentQuestion.min !== undefined && numValue < currentQuestion.min) {
        return false;
      }
      if (currentQuestion.max !== undefined && numValue > currentQuestion.max) {
        return false;
      }
    }

    return true;
  };

  // Validate current question in page (for page-based forms)
  let validateCurrentPageQuestion = () => {
    if (!questionnaireData || !questionnaireData.pages || !questionnaireData.pages[currentPageIndex]) {
      return false;
    }

    const currentPage = questionnaireData.pages[currentPageIndex];
    if (!currentPage.questions || !Array.isArray(currentPage.questions) || currentPageQuestionIndex >= currentPage.questions.length) {
      return true; // No question to validate
    }

    const question = currentPage.questions[currentPageQuestionIndex];
    if (!question.id) return true; // Skip questions without IDs (like legend type)

    // Skip validation for display-only question types
    if (question.type === 'legend' || question.type === 'header') {
      return true;
    }

    const answer = answers[question.id];

    // Check if answer exists and is not empty
    if (!answer) {
      return false;
    }

    // For text fields, check if not just whitespace
    if (typeof answer === 'string' && answer.trim() === '') {
      return false;
    }

    // For checkbox arrays, check if at least one is selected
    if (Array.isArray(answer) && answer.length === 0) {
      return false;
    }

    // For number fields, validate numeric constraints
    if (question.type === 'number') {
      const numValue = parseFloat(answer);
      if (isNaN(numValue)) {
        return false;
      }
      
      // Check min/max constraints if provided
      if (question.min !== undefined && numValue < question.min) {
        return false;
      }
      if (question.max !== undefined && numValue > question.max) {
        return false;
      }
    }

    return true;
  };

  // Validate current page (for page-based forms) - all questions
  let validateCurrentPage = () => {
    if (!questionnaireData || !questionnaireData.pages || !questionnaireData.pages[currentPageIndex]) {
      return false;
    }

    const currentPage = questionnaireData.pages[currentPageIndex];
    if (!currentPage.questions || !Array.isArray(currentPage.questions)) {
      return true; // No questions to validate
    }

    // Validate all questions on the current page
    for (let question of currentPage.questions) {
      if (!question.id) continue; // Skip questions without IDs (like legend type)
      
      const answer = answers[question.id];

      // Skip validation for display-only question types
      if (question.type === 'legend' || question.type === 'header') {
        continue;
      }

      // Check if answer exists and is not empty
      if (!answer) {
        return false;
      }

      // For text fields, check if not just whitespace
      if (typeof answer === 'string' && answer.trim() === '') {
        return false;
      }

      // For checkbox arrays, check if at least one is selected
      if (Array.isArray(answer) && answer.length === 0) {
        return false;
      }
    }

    return true;
  };

  let canGoToNext = () => {
    return isPageBasedForm ? validateCurrentPageQuestion() : validateCurrentQuestion();
  };

  // Helper function to render guidance text as HTML
  let renderGuidance = (guidance) => {
    if (!guidance) return null;
    
    // Check if the guidance contains HTML tags
    if (guidance.includes('<') && guidance.includes('>')) {
      return (
        <Text style={styles.guidanceText}>
          {renderHtmlText(guidance)}
        </Text>
      );
    } else {
      return <Text style={styles.guidanceText}>{guidance}</Text>;
    }
  };

  // Render different question types
  let renderQuestion = (question, index) => {
    switch (question.type) {
      case 'legend':
      case 'header':
        return (
          <View key={question.id || `legend-${index}`} style={styles.legendWrapper}>
            {question.label && question.label.includes('<') && question.label.includes('>') ? (
              <Text style={styles.legendText}>
                {renderHtmlText(question.label)}
              </Text>
            ) : (
              <Text style={styles.legendText}>{question.label}</Text>
            )}
            {renderGuidance(question.guidance)}
          </View>
        );

      case 'text':
        return (
          <View key={question.id} style={styles.questionWrapper}>
            <Text style={styles.questionLabel}>{question.label}</Text>
            {renderGuidance(question.guidance)}
            <TextInput
              style={styles.textInput}
              placeholder={question.placeholder || "Enter text here..."}
              value={answers[question.id] || ''}
              onChangeText={(value) => handleInputChange(question.id, value)}
              autoCapitalize="sentences"
              autoFocus={currentQuestionIndex === index}
              blurOnSubmit={false}
              returnKeyType="next"
            />
          </View>
        );
        
      case 'textarea':
        return (
          <View key={question.id} style={styles.questionWrapper}>
            <Text style={styles.questionLabel}>{question.label}</Text>
            {renderGuidance(question.guidance)}
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder={question.placeholder || "Enter detailed text here..."}
              value={answers[question.id] || ''}
              onChangeText={(value) => handleInputChange(question.id, value)}
              multiline
              numberOfLines={4}
              autoCapitalize="sentences"
              autoFocus={currentQuestionIndex === index}
              blurOnSubmit={false}
            />
          </View>
        );

      case 'number':
        return (
          <View key={question.id} style={styles.questionWrapper}>
            {question.label && question.label.includes('<') && question.label.includes('>') ? (
              <Text style={styles.questionLabel}>
                {renderHtmlText(question.label)}
              </Text>
            ) : (
              <Text style={styles.questionLabel}>{question.label}</Text>
            )}
            {renderGuidance(question.guidance)}
            <TextInput
              style={styles.textInput}
              placeholder={question.placeholder || "Enter number..."}
              value={answers[question.id] || ''}
              onChangeText={(value) => {
                // Basic number validation
                const numericValue = value.replace(/[^0-9.-]/g, '');
                handleInputChange(question.id, numericValue);
              }}
              keyboardType="numeric"
              autoFocus={currentQuestionIndex === index}
              blurOnSubmit={false}
              returnKeyType="next"
            />
            {question.min !== undefined && question.max !== undefined && (
              <Text style={styles.validationHintText}>
                Please enter a value between {question.min} and {question.max}
              </Text>
            )}
          </View>
        );
        
      case 'radio':
        return (
          <View key={question.id} style={styles.questionWrapper}>
            <Text style={styles.questionLabel}>{question.label}</Text>
            {renderGuidance(question.guidance)}
            <RadioButton.Group
              onValueChange={(value) => handleRadioChange(question.id, value)}
              value={answers[question.id] || ''}
            >
              {question.values.map((option) => (
                <TouchableOpacity 
                  key={option.id} 
                  style={[
                    styles.radioOption,
                    answers[question.id] === option.id && styles.selectedRadioOption
                  ]}
                  onPress={() => handleRadioChange(question.id, option.id)}
                >
                  <RadioButton value={option.id} />
                  {option.text && option.text.includes('<') && option.text.includes('>') ? (
                    <Text style={[
                      styles.radioText,
                      answers[question.id] === option.id && styles.selectedRadioText
                    ]}>
                      {renderHtmlText(option.text)}
                    </Text>
                  ) : (
                    <Text style={[
                      styles.radioText,
                      answers[question.id] === option.id && styles.selectedRadioText
                    ]}>
                      {option.text}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </RadioButton.Group>
          </View>
        );

      case 'checkbox':
        return (
          <View key={question.id} style={styles.questionWrapper}>
            <Text style={styles.questionLabel}>{question.label}</Text>
            {renderGuidance(question.guidance)}
            {question.values.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.checkboxOption,
                  answers[question.id] && answers[question.id].includes(option.id) && styles.selectedCheckboxOption
                ]}
                onPress={() => handleCheckboxChange(question.id, option.id)}
              >
                <Checkbox
                  status={
                    answers[question.id] && answers[question.id].includes(option.id)
                      ? 'checked'
                      : 'unchecked'
                  }
                  onPress={() => handleCheckboxChange(question.id, option.id)}
                />
                {option.text && option.text.includes('<') && option.text.includes('>') ? (
                  <Text style={[
                    styles.checkboxText,
                    answers[question.id] && answers[question.id].includes(option.id) && styles.selectedCheckboxText
                  ]}>
                    {renderHtmlText(option.text)}
                  </Text>
                ) : (
                  <Text style={[
                    styles.checkboxText,
                    answers[question.id] && answers[question.id].includes(option.id) && styles.selectedCheckboxText
                  ]}>
                    {option.text}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        );
        
      case 'upload':
        return (
          <View key={question.id} style={styles.questionWrapper}>
            <Text style={styles.questionLabel}>{question.label}</Text>
            {renderGuidance(question.guidance)}
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

  // EMERGENCY: Disable all debug logs and return early to stop infinite loop
  console.log('🚨 [EMERGENCY] Questionnaire.js render called - returning null to stop infinite loop');
  return (
    <View style={styles.panelContainer}>
      <Text style={{fontSize: 20, textAlign: 'center', margin: 20, color: 'red'}}>
        ⚠️ Questionnaire temporarily disabled to fix infinite loop
      </Text>
    </View>
  );

  // DISABLED DEBUG LOGS FOR CATEGORISATION TESTING
  // console.log('=== MAIN RENDER DEBUG ===');
  // console.log('questionnaireData exists:', questionnaireData ? 'yes' : 'no');
  // console.log('questionnaireData.questions exists:', questionnaireData?.questions ? 'yes' : 'no');
  // console.log('questionnaireData.questions is array:', Array.isArray(questionnaireData?.questions));
  // console.log('questionnaireData.pages exists:', questionnaireData?.pages ? 'yes' : 'no');
  // console.log('questionnaireData.pages is array:', Array.isArray(questionnaireData?.pages));
  // console.log('isPageBasedForm:', isPageBasedForm);
  // console.log('========================');

  return (
    <View style={styles.panelContainer}>
      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        enableOnAndroid={true}
        keyboardShouldPersistTaps="handled"
      >
        {questionnaireData && questionnaireData.questions && Array.isArray(questionnaireData.questions) ? (
          <>
            <Title style={styles.title}>{questionnaireData.formtitle}</Title>
            
            {questionnaireData.formintro ? (
              <View style={styles.introWrapper}>
                {questionnaireData.formintro.includes('<') && questionnaireData.formintro.includes('>') ? (
                  <Text style={styles.introText}>
                    {renderHtmlText(questionnaireData.formintro)}
                  </Text>
                ) : (
                  <Text style={styles.introText}>{questionnaireData.formintro}</Text>
                )}
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

            {/* Progress indicator */}
            {isPageBasedForm ? (
              questionnaireData.pages && Array.isArray(questionnaireData.pages) && (
                <View style={styles.progressWrapper}>
                  <Text style={styles.progressText}>
                    Page {currentPageIndex + 1} of {questionnaireData.pages.length}
                    {questionnaireData.pages[currentPageIndex] && questionnaireData.pages[currentPageIndex].questions && (
                      (() => {
                        const pageQuestions = questionnaireData.pages[currentPageIndex].questions;
                        const totalGroups = countQuestionGroups(pageQuestions);
                        const currentGroupIndex = getCurrentQuestionGroupIndex(pageQuestions, currentPageQuestionIndex);
                        return ` - Question ${currentGroupIndex + 1} of ${totalGroups}`;
                      })()
                    )}
                  </Text>
                </View>
              )
            ) : (
              questionnaireData.questions && Array.isArray(questionnaireData.questions) && (
                <View style={styles.progressWrapper}>
                  <Text style={styles.progressText}>
                    Question {getCurrentQuestionGroupIndex(questionnaireData.questions, currentQuestionIndex) + 1} of {countQuestionGroups(questionnaireData.questions)}
                  </Text>
                </View>
              )
            )}

            {/* Render current content */}
            {isPageBasedForm ? (
              // Render current question from current page
              questionnaireData.pages && 
              questionnaireData.pages[currentPageIndex] && 
              questionnaireData.pages[currentPageIndex].questions &&
              questionnaireData.pages[currentPageIndex].questions[currentPageQuestionIndex] ? (
                (() => {
                  const pageQuestions = questionnaireData.pages[currentPageIndex].questions;
                  const questionGroup = getQuestionGroup(pageQuestions, currentPageQuestionIndex);
                  console.log(`Rendering page ${currentPageIndex} question group:`, questionGroup.legends.length, 'legends +', questionGroup.mainQuestion?.type);
                  
                  return (
                    <View>
                      {/* Render all legend questions first */}
                      {questionGroup.legends.map((legend, index) => 
                        renderQuestion(legend, currentPageQuestionIndex + index)
                      )}
                      {/* Render the main question */}
                      {questionGroup.mainQuestion && renderQuestion(questionGroup.mainQuestion, currentPageQuestionIndex + questionGroup.legends.length)}
                    </View>
                  );
                })()
              ) : (
                <Text style={styles.loadingText}>No question found at page {currentPageIndex}, question {currentPageQuestionIndex}</Text>
              )
            ) : (
              // Render single current question with any preceding legends
              questionnaireData.questions && questionnaireData.questions[currentQuestionIndex] ? (
                (() => {
                  const questionGroup = getQuestionGroup(questionnaireData.questions, currentQuestionIndex);
                  // console.log(`Rendering question group:`, questionGroup.legends.length, 'legends +', questionGroup.mainQuestion?.type);
                  
                  return (
                    <View>
                      {/* Render all legend questions first */}
                      {questionGroup.legends.map((legend, index) => 
                        renderQuestion(legend, currentQuestionIndex + index)
                      )}
                      {/* Render the main question */}
                      {questionGroup.mainQuestion && renderQuestion(questionGroup.mainQuestion, currentQuestionIndex + questionGroup.legends.length)}
                    </View>
                  );
                })()
              ) : (
                <Text style={styles.loadingText}>No question found at index {currentQuestionIndex}</Text>
              )
            )}

            {/* Navigation buttons */}
            <View style={styles.navigationWrapper}>
              <TouchableOpacity 
                style={[styles.navButton, styles.backButton, isFirstQuestion() && styles.disabledButton]}
                onPress={goToPreviousQuestion}
                disabled={isFirstQuestion()}
              >
                <Text style={[styles.backButtonText, isFirstQuestion() && styles.disabledButtonText]}>
                  {isPageBasedForm && questionnaireData.pages && questionnaireData.pages[currentPageIndex] && questionnaireData.pages[currentPageIndex].prevbutton 
                    ? questionnaireData.pages[currentPageIndex].prevbutton 
                    : '← Back'}
                </Text>
              </TouchableOpacity>

              {isLastQuestion() ? (
                <TouchableOpacity 
                  style={[styles.navButton, styles.submitButton]}
                  onPress={submitQuestionnaire}
                  disabled={disableSubmitButton}
                >
                  <Text style={styles.submitButtonText}>
                    {questionnaireData.submittext || 'Submit'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={[
                    styles.navButton, 
                    styles.nextButton, 
                    !canGoToNext() && styles.disabledNextButton
                  ]}
                  onPress={goToNextQuestion}
                >
                  <Text style={[
                    styles.navButtonText,
                    !canGoToNext() && styles.disabledNextButtonText
                  ]}>
                    {isPageBasedForm && questionnaireData.pages && questionnaireData.pages[currentPageIndex] && questionnaireData.pages[currentPageIndex].nextbutton 
                      ? questionnaireData.pages[currentPageIndex].nextbutton + ' →' 
                      : 'Next →'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        ) : (
          <Text style={styles.loadingText}>Loading form...</Text>
        )}

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
  loadingText: {
    fontSize: normaliseFont(16),
    color: colors.gray,
    textAlign: 'center',
    marginTop: scaledHeight(50),
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
    alignItems: 'flex-start',
    marginBottom: scaledHeight(12),
    paddingHorizontal: scaledWidth(16),
    paddingVertical: scaledHeight(14),
    borderWidth: 2,
    borderColor: colors.lightGray,
    borderRadius: 12,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    minHeight: scaledHeight(50),
  },
  selectedRadioOption: {
    borderColor: colors.primary,
    backgroundColor: '#f0f7ff',
    shadowOpacity: 0.15,
  },
  radioText: {
    fontSize: normaliseFont(15),
    color: colors.darkGray,
    marginLeft: scaledWidth(12),
    flex: 1,
    lineHeight: normaliseFont(22),
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  selectedRadioText: {
    color: colors.primary,
    fontWeight: '600',
  },
  checkboxOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: scaledHeight(12),
    paddingHorizontal: scaledWidth(16),
    paddingVertical: scaledHeight(14),
    borderWidth: 2,
    borderColor: colors.lightGray,
    borderRadius: 12,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    minHeight: scaledHeight(50),
  },
  selectedCheckboxOption: {
    borderColor: colors.success,
    backgroundColor: '#f0fff4',
    shadowOpacity: 0.15,
  },
  checkboxText: {
    fontSize: normaliseFont(15),
    color: colors.darkGray,
    marginLeft: scaledWidth(12),
    flex: 1,
    lineHeight: normaliseFont(22),
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  selectedCheckboxText: {
    color: colors.success,
    fontWeight: '600',
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
  validationHintText: {
    fontSize: normaliseFont(12),
    color: colors.darkGray,
    marginTop: scaledHeight(5),
    fontStyle: 'italic',
  },
  submitButtonWrapper: {
    marginHorizontal: scaledWidth(20),
    marginTop: scaledHeight(30),
  },
  bottomSpacer: {
    height: scaledHeight(50),
  },
  // Navigation styles
  progressWrapper: {
    marginHorizontal: scaledWidth(20),
    marginBottom: scaledHeight(20),
    alignItems: 'center',
  },
  progressText: {
    fontSize: normaliseFont(16),
    fontWeight: '600',
    color: colors.primary,
    backgroundColor: colors.lightBlue,
    paddingHorizontal: scaledWidth(15),
    paddingVertical: scaledHeight(8),
    borderRadius: 20,
  },
  navigationWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: scaledWidth(20),
    marginTop: scaledHeight(30),
    marginBottom: scaledHeight(20),
  },
  navButton: {
    paddingHorizontal: scaledWidth(24),
    paddingVertical: scaledHeight(14),
    borderRadius: 8,
    minWidth: scaledWidth(100),
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    backgroundColor: colors.lightGray,
    borderWidth: 1,
    borderColor: colors.gray,
  },
  nextButton: {
    backgroundColor: colors.primary,
  },
  submitButton: {
    backgroundColor: colors.success,
  },
  disabledButton: {
    backgroundColor: colors.lightGray,
    borderColor: colors.lightGray,
  },
  disabledNextButton: {
    backgroundColor: colors.lightGray,
    opacity: 0.6,
  },
  navButtonText: {
    fontSize: normaliseFont(16),
    fontWeight: '600',
    color: colors.white,
  },
  backButtonText: {
    fontSize: normaliseFont(16),
    fontWeight: '600',
    color: colors.darkGray,
  },
  submitButtonText: {
    fontSize: normaliseFont(16),
    fontWeight: '600',
    color: colors.white,
  },
  disabledButtonText: {
    color: colors.gray,
  },
  disabledNextButtonText: {
    color: colors.gray,
  },
  legendWrapper: {
    marginHorizontal: scaledWidth(20),
    marginBottom: scaledHeight(20),
  },
  legendText: {
    fontSize: normaliseFont(16),
    fontWeight: '600',
    color: colors.black,
    marginBottom: scaledHeight(8),
    lineHeight: normaliseFont(24),
  },
});

export default Questionnaire;
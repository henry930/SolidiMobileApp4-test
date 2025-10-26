// Enhanced Dynamic QuestionnaireForm
// This shows how to enhance your existing component for API-driven forms

import React, { useState, useEffect, useContext } from 'react';
import { StyleSheet, View, ScrollView, Alert, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Text, Card, Button, TextInput, RadioButton, ActivityIndicator } from 'react-native-paper';
import { Buffer } from 'buffer';

// Internal imports
import { colors, sharedStyles, sharedColors } from '../../constants';
import { scaledWidth, scaledHeight, normaliseFont } from '../../util/dimensions';
import AppStateContext from '../../application/data';
import localFormService from '../../api/LocalFormService';

// Variable substitution function for dynamic form generation
const substituteVariables = (text, appState) => {
  console.log('🔄 [VARIABLE SUBSTITUTION] Running substituteVariables for text:', text?.substring(0, 50));
  
  if (!text || typeof text !== 'string') return text;
  
  // Get user information - try multiple sources
  let firstName = '';
  let lastName = '';
  
  try {
    // Try different ways to get user info
    firstName = appState?.getUserInfo?.('firstName') || 
                appState?.userInfo?.firstName || 
                appState?.user?.info?.user?.firstName || 
                'John'; // Fallback for testing
                
    lastName = appState?.getUserInfo?.('lastName') || 
               appState?.userInfo?.lastName || 
               appState?.user?.info?.user?.lastName || 
               'Doe'; // Fallback for testing
  } catch (error) {
    console.log('⚠️ [VARIABLE SUBSTITUTION] Error getting user info, using fallbacks:', error);
    firstName = 'John';
    lastName = 'Doe';
  }
  
  const todaysdate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric'
  });

  console.log('👤 [VARIABLE SUBSTITUTION] User data:', { firstName, lastName, todaysdate });
  console.log('👤 [VARIABLE SUBSTITUTION] AppState keys:', Object.keys(appState || {}));

  const result = text
    .replace(/\$\{firstname\}/g, firstName)
    .replace(/\$\{lastname\}/g, lastName)
    .replace(/\$\{todaysdate\}/g, todaysdate);
    
  console.log('✅ [VARIABLE SUBSTITUTION] Original:', text?.substring(0, 100));
  console.log('✅ [VARIABLE SUBSTITUTION] Result:', result?.substring(0, 100));
  return result;
};

// Simple and reliable HTML renderer for React Native
const renderHtmlText = (htmlString, baseStyle = {}, width = 350, appState = null) => {
  // Handle null, undefined, or empty string cases
  if (!htmlString || htmlString === '' || htmlString === null || htmlString === undefined) {
    return <Text style={baseStyle}></Text>;
  }
  
  // Ensure htmlString is a string
  const stringContent = String(htmlString);
  
  // Apply variable substitution if appState is provided
  let processedString = stringContent;
  if (appState) {
    processedString = substituteVariables(stringContent, appState);
  }
  
  // Normalize baseStyle - handle both objects and arrays
  const normalizedBaseStyle = Array.isArray(baseStyle) 
    ? baseStyle.filter(style => style && typeof style === 'object').reduce((acc, style) => ({ ...acc, ...style }), {})
    : (baseStyle && typeof baseStyle === 'object' ? baseStyle : {});
  
  // console.log('🎨 Rendering HTML:', processedString.substring(0, 100) + (processedString.length > 100 ? '...' : ''));
  
  // If no HTML tags, return simple text
  if (!processedString.includes('<')) {
    return <Text style={normalizedBaseStyle}>{processedString}</Text>;
  }

  // Parse simple HTML tags and render them properly
  const parseAndRenderHtml = (html) => {
    // Handle line breaks first
    const parts = html.split(/<br\s*\/?>/i);
    const elements = [];
    
    parts.forEach((part, partIndex) => {
      if (part.trim()) {
        // Check for heading tags
        if (part.match(/<h([1-6])[^>]*>(.*?)<\/h[1-6]>/i)) {
          const match = part.match(/<h([1-6])[^>]*>(.*?)<\/h[1-6]>/i);
          const level = parseInt(match[1]);
          const content = match[2].replace(/<[^>]*>/g, ''); // Remove any other tags
          
          let headingStyle = { ...normalizedBaseStyle };
          switch (level) {
            case 1:
              headingStyle = { 
                ...normalizedBaseStyle, 
                fontSize: 20, 
                fontWeight: 'normal', 
                marginVertical: 6, 
                color: '#333333',
                lineHeight: 26,
                textAlign: 'justify'
              };
              break;
            case 2:
              headingStyle = { 
                ...normalizedBaseStyle, 
                fontSize: 18, 
                fontWeight: 'normal', 
                marginVertical: 5, 
                color: '#333333',
                lineHeight: 24,
                textAlign: 'justify'
              };
              break;
            case 3:
              headingStyle = { 
                ...normalizedBaseStyle, 
                fontSize: 16, 
                fontWeight: 'normal', 
                marginVertical: 4, 
                color: '#333333',
                lineHeight: 22,
                textAlign: 'justify'
              };
              break;
            case 4:
              headingStyle = { 
                ...normalizedBaseStyle, 
                fontSize: 16, 
                fontWeight: 'normal', 
                marginVertical: 4, 
                color: '#333333',
                lineHeight: 22,
                textAlign: 'justify'
              };
              break;
            case 5:
              headingStyle = { 
                ...normalizedBaseStyle, 
                fontSize: 16, 
                fontWeight: 'normal', 
                marginVertical: 4, 
                color: '#333333',
                lineHeight: 22,
                textAlign: 'justify'
              };
              break;
            case 6:
              headingStyle = { 
                ...normalizedBaseStyle, 
                fontSize: 14, 
                fontWeight: 'normal', 
                marginVertical: 3, 
                color: '#333333',
                lineHeight: 20,
                textAlign: 'justify'
              };
              break;
          }
          
          elements.push(
            <Text key={`heading-${partIndex}`} style={headingStyle}>
              {content || ''}
            </Text>
          );
        } else {
          // Handle other formatting tags
          let processedText = part;
          const textElements = [];
          
          // Split by bold tags
          const boldParts = processedText.split(/(<b[^>]*>.*?<\/b>|<strong[^>]*>.*?<\/strong>)/i);
          
          boldParts.forEach((boldPart, boldIndex) => {
            if (boldPart.match(/<(b|strong)[^>]*>(.*?)<\/(b|strong)>/i)) {
              const boldMatch = boldPart.match(/<(b|strong)[^>]*>(.*?)<\/(b|strong)>/i);
              const boldContent = boldMatch[2] || '';
              if (boldContent.trim()) {
                textElements.push(
                  <Text key={`bold-${partIndex}-${boldIndex}`} style={{ 
                    ...normalizedBaseStyle, 
                    fontWeight: 'bold', 
                    color: '#333333',
                    textAlign: 'justify'
                  }}>
                    {boldContent}
                  </Text>
                );
              }
            } else if (boldPart.trim()) {
              // Clean up any remaining HTML tags and entities
              const cleanText = boldPart
                .replace(/<[^>]*>/g, '') // Remove HTML tags
                .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
                .replace(/&amp;/g, '&') // Replace &amp; with &
                .replace(/&lt;/g, '<') // Replace &lt; with <
                .replace(/&gt;/g, '>'); // Replace &gt; with >
              
              if (cleanText.trim()) {
                textElements.push(
                  <Text key={`text-${partIndex}-${boldIndex}`} style={{
                    ...normalizedBaseStyle,
                    color: '#333333',
                    lineHeight: 22,
                    textAlign: 'justify'
                  }}>
                    {cleanText}
                  </Text>
                );
              }
            }
          });
          
          if (textElements.length > 0) {
            elements.push(
              <Text key={`paragraph-${partIndex}`} style={normalizedBaseStyle}>
                {textElements}
              </Text>
            );
          }
        }
      }
      
      // Add smaller line break if not the last part
      if (partIndex < parts.length - 1) {
        elements.push(
          <View key={`br-${partIndex}`} style={{ height: 4 }} />
        );
      }
    });
    
    // Ensure we always return an array, even if empty
    return elements.length > 0 ? elements : [<Text key="empty" style={normalizedBaseStyle}></Text>];
  };

  try {
    const renderedElements = parseAndRenderHtml(processedString);
    console.log('✅ HTML parsed successfully, elements:', renderedElements?.length || 0);
    
    // Ensure we always return a valid component
    if (!renderedElements || renderedElements.length === 0) {
      return <Text style={normalizedBaseStyle}>{processedString}</Text>;
    }
    
    return (
      <View>
        {renderedElements}
      </View>
    );
  } catch (error) {
    console.error('❌ HTML parsing error:', error);
    // Fallback to simple text without HTML tags
    const cleanText = processedString
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
    
    return <Text style={normalizedBaseStyle}>{cleanText || ''}</Text>;
  }
};

const DynamicQuestionnaireForm = ({ 
  formId = null,             // Form ID to load from local JSON files (e.g., 'finprom-categorisation')
  onSubmit, 
  onBack 
}) => {
  console.log('🚀🚀🚀 [DynamicQuestionnaireForm] *** COMPONENT IS DEFINITELY LOADING *** formId:', formId);
  console.log('🚀🚀🚀 [DynamicQuestionnaireForm] *** COMPONENT IS DEFINITELY LOADING *** formId:', formId);
  console.log('🚀🚀🚀 [DynamicQuestionnaireForm] *** COMPONENT IS DEFINITELY LOADING *** formId:', formId);
  
  const { width } = useWindowDimensions();
  const appState = useContext(AppStateContext);
  const [answers, setAnswers] = useState({});
  const [currentPage, setCurrentPage] = useState(0);
  const [navigationHistory, setNavigationHistory] = useState([]); // Track conditional navigation history
  
  // State for dynamic loading
  const [activeFormData, setActiveFormData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load form data from local JSON files
  useEffect(() => {
    if (formId) {
      console.log('🔄 [DynamicQuestionnaireForm] Loading form:', formId);
      // Reset form state when formId changes
      setAnswers({});
      setCurrentPage(0);
      setNavigationHistory([]);
      setActiveFormData(null);
      setError(null);
      
      loadFormFromLocal();
    }
  }, [formId]);

  // Load form definition from local JSON files
  const loadFormFromLocal = async () => {
    console.log('🔄 [DynamicQuestionnaireForm] loadFormFromLocal called for:', formId);
    setIsLoading(true);
    setError(null);
    
    try {
      const formDefinition = await localFormService.getFormById(formId);
      console.log('✅ [DynamicQuestionnaireForm] Form loaded successfully:', formDefinition?.formtitle || formId);
      setActiveFormData(formDefinition);
    } catch (err) {
      console.error('❌ [DynamicQuestionnaireForm] Error loading local form:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle answer changes
  const handleAnswerChange = (questionId, value) => {
    console.log('📝 [ANSWER CHANGE] Question:', questionId, 'New Value:', value, 'Type:', typeof value);
    
    // Special logging for validation-critical fields
    if (questionId === 'prevamount') {
      console.log('🎯 [ANSWER CHANGE] PREVAMOUNT updated:', value, 'Parsed as number:', parseFloat(value));
    }
    if (questionId === 'hnwincomeamount') {
      console.log('🎯 [ANSWER CHANGE] HNW INCOME updated:', value, 'Parsed as number:', parseFloat(value));
    }
    if (questionId === 'hwnassetsamount') {
      console.log('🎯 [ANSWER CHANGE] HNW ASSETS updated:', value, 'Parsed as number:', parseFloat(value));
    }
    
    setAnswers(prev => {
      const newAnswers = {
        ...prev,
        [questionId]: value
      };
      console.log('📝 [ANSWER CHANGE] Updated answers:', newAnswers);
      return newAnswers;
    });
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

  // Check if a page has any renderable questions
  const checkPageHasRenderableQuestions = (pageIndex) => {
    if (!activeFormData?.pages || pageIndex >= activeFormData.pages.length) {
      return false;
    }
    
    const pageQuestions = activeFormData.pages[pageIndex]?.questions || [];
    const renderableQuestions = pageQuestions.filter(q => 
      q.type !== 'legend' && q.type !== undefined
    );
    
    return renderableQuestions.length > 0;
  };

  // Enhanced validation function for finprom-categorisation form
  const validateForm = (pageSpecific = false) => {
    console.log('🔍 [VALIDATION] ====== STARTING FORM VALIDATION ======');
    console.log('🔍 [VALIDATION] Page-specific validation:', pageSpecific);
    console.log('🔍 [VALIDATION] Current page:', currentPage);
    console.log('🔍 [VALIDATION] Current answers:', JSON.stringify(answers, null, 2));
    
    if (!activeFormData || !activeFormData.pages) {
      console.log('❌ [VALIDATION] No form data available for validation');
      return { isValid: false, errors: ['Form data not loaded'] };
    }

    const invalidFields = [];
    const formId = activeFormData.formid;
    console.log('🔍 [VALIDATION] Form ID:', formId);
    
    // Get questions to validate based on mode
    let questionsToValidate = [];
    
    if (pageSpecific) {
      // Only validate current page questions
      const currentPageData = activeFormData.pages[currentPage];
      questionsToValidate = currentPageData?.questions || [];
      console.log('🔍 [VALIDATION] Page-specific: validating', questionsToValidate.length, 'questions from current page');
    } else {
      // Validate all questions (for final submission)
      activeFormData.pages.forEach(page => {
        if (page.questions) {
          questionsToValidate.push(...page.questions);
        }
      });
      console.log('🔍 [VALIDATION] Full form: validating', questionsToValidate.length, 'questions from all pages');
    }

    // Validate each question
    questionsToValidate.forEach(question => {
      const answer = answers[question.id];
      console.log(`🔍 [VALIDATION] Question "${question.id}": type="${question.type}", answer="${answer}"`);
      
      // Skip legend/info questions
      if (question.type === 'legend') return;
      
      // For number fields, validate constraints
      if (question.type === 'number') {
        if (answer && isNaN(Number(answer))) {
          invalidFields.push(`${question.label?.replace(/<[^>]*>/g, '') || question.id} (must be a valid number)`);
        }
      }
    });

    // Special validation for finprom-categorisation form
    if (formId === 'customer-categorisation' || formId === 'finprom-categorisation') {
      console.log('🎯 [VALIDATION] ====== APPLYING FINPROM-CATEGORISATION VALIDATION RULES ======');
      
      // Get key answers
      const accountPurpose = answers['accountpurpose']; // Main investor type selection
      const prev12months = answers['prev12months']; // Previous investment
      const prevAmount = answers['prevamount']; // Previous investment percentage
      const next12months = answers['next12months']; // Future investment plans
      const hnwIncome = answers['hnwincome']; // HNW income status
      const hnwAssets = answers['hnwassets']; // HNW assets status
      const hnwIncomeAmount = answers['hnwincomeamount']; // HNW income amount
      const hnwAssetsAmount = answers['hwnassetsamount']; // HNW assets amount (note: typo in JSON)

      console.log('📊 [VALIDATION] Key answers for validation:', {
        accountPurpose, prev12months, prevAmount, next12months, 
        hnwIncome, hnwAssets, hnwIncomeAmount, hnwAssetsAmount
      });

      // Only apply business rules if we're on the relevant pages or doing full validation
      if (!pageSpecific || accountPurpose) {
        
        // Restricted investor validation - only if they've entered a prevAmount
        if (accountPurpose === 'restricted' && prevAmount !== null && prevAmount !== undefined && prevAmount !== '') {
          console.log('🎯 [VALIDATION] Restricted investor detected - checking prevAmount');
          console.log('🎯 [VALIDATION] prevAmount value:', prevAmount, 'type:', typeof prevAmount);
          
          const percentageValue = parseFloat(prevAmount);
          console.log('🎯 [VALIDATION] Parsed percentage value:', percentageValue);
          
          if (!isNaN(percentageValue) && percentageValue > 10) {
            console.log('❌ [VALIDATION] Restricted investor validation FAILED - percentage too high:', percentageValue);
            invalidFields.push('Invalid. Your amount should less than 10 if you are a restricted investor');
          } else if (isNaN(percentageValue)) {
            console.log('❌ [VALIDATION] Restricted investor validation FAILED - invalid number:', prevAmount);
            invalidFields.push('Please enter a valid percentage for your investment amount');
          } else {
            console.log('✅ [VALIDATION] Restricted investor validation PASSED - percentage OK:', percentageValue);
          }
        }

        // HNW investor validation - comprehensive check
        if (accountPurpose === 'hnw') {
          console.log('🎯 [VALIDATION] HNW investor detected - checking comprehensive validation');
          
          const hasIncomeYes = hnwIncome === 'yes';
          const hasAssetsYes = hnwAssets === 'yes';
          const hasIncomeNo = hnwIncome === 'no';
          const hasAssetsNo = hnwAssets === 'no';
          const income = parseFloat(hnwIncomeAmount) || 0;
          const assets = parseFloat(hnwAssetsAmount) || 0;
          
          console.log('🎯 [VALIDATION] HNW Status:', {
            hnwIncome, hasIncomeYes, hasIncomeNo,
            hnwAssets, hasAssetsYes, hasAssetsNo,
            hnwIncomeAmount, income,
            hnwAssetsAmount, assets
          });
          
          // CRITICAL: Check if they answered "no" to both income and assets - this disqualifies them
          if (hasIncomeNo && hasAssetsNo) {
            console.log('❌ [VALIDATION] HNW investor validation FAILED - answered NO to both income AND assets');
            invalidFields.push('To qualify as a High-Net-Worth investor, you must have either £100,000+ annual income OR £250,000+ net assets. You cannot answer "No" to both questions.');
          } else {
            // Check income qualification if they answered "yes"
            if (hasIncomeYes) {
              if (!hnwIncomeAmount || hnwIncomeAmount === '') {
                console.log('❌ [VALIDATION] HNW investor validation FAILED - said yes to income but no amount provided');
                invalidFields.push('Please specify your income amount since you answered "Yes" to having £100k+ income');
              } else if (income < 100000) {
                console.log('❌ [VALIDATION] HNW investor validation FAILED - insufficient income amount');
                console.log(`❌ [VALIDATION] Income amount: ${income} < 100000`);
                invalidFields.push('Your income must be £100,000 or more to qualify via income');
              }
            }
            
            // Check assets qualification if they answered "yes"
            if (hasAssetsYes) {
              if (!hnwAssetsAmount || hnwAssetsAmount === '') {
                console.log('❌ [VALIDATION] HNW investor validation FAILED - said yes to assets but no amount provided');
                invalidFields.push('Please specify your assets amount since you answered "Yes" to having £250k+ assets');
              } else if (assets < 250000) {
                console.log('❌ [VALIDATION] HNW investor validation FAILED - insufficient assets amount');
                console.log(`❌ [VALIDATION] Assets amount: ${assets} < 250000`);
                invalidFields.push('Your assets must be £250,000 or more to qualify via assets');
              }
            }
            
            // Final validation: if they said yes to either, they must meet at least one threshold
            if ((hasIncomeYes || hasAssetsYes) && hnwIncomeAmount && hnwAssetsAmount) {
              const qualifiedByIncome = hasIncomeYes && income >= 100000;
              const qualifiedByAssets = hasAssetsYes && assets >= 250000;
              
              if (qualifiedByIncome || qualifiedByAssets) {
                console.log('✅ [VALIDATION] HNW investor validation PASSED');
                if (qualifiedByIncome) {
                  console.log(`✅ [VALIDATION] Qualified by income: ${income} >= 100000`);
                }
                if (qualifiedByAssets) {
                  console.log(`✅ [VALIDATION] Qualified by assets: ${assets} >= 250000`);
                }
              }
            }
          }
        }
      }
      
      console.log('🎯 [VALIDATION] ====== END FINPROM-CATEGORISATION VALIDATION ======');
    }

    const isValid = invalidFields.length === 0;
    console.log(`🔍 [VALIDATION] ====== VALIDATION RESULT ======`);
    console.log(`🔍 [VALIDATION] Valid: ${isValid}`);
    console.log(`🔍 [VALIDATION] Errors: ${JSON.stringify(invalidFields)}`);
    console.log(`🔍 [VALIDATION] ====== END VALIDATION ======`);
    
    return { isValid, errors: invalidFields };
  };

  // Handle form submission
  const handleSubmit = async () => {
    console.log('📤 [SUBMIT] Starting form submission');
    
    // Final validation before submission (full form validation)
    const validation = validateForm(false); // false = full form validation
    if (!validation.isValid) {
      console.log('❌ [SUBMIT] Final validation failed');
      Alert.alert('Validation Error', validation.errors.join('\n\n'));
      return;
    }

    try {
      // 1. Create a deep copy of the form structure
      const submissionData = JSON.parse(JSON.stringify(activeFormData));
      
      // 2. Get documentType based on formId
      const documentType = formId === 'finprom-categorisation' ? 'categorisation' : 'appropriateness';
      
      // 3. Fill answers into form structure
      Object.keys(answers).forEach(answerKey => {
        const answerValue = answers[answerKey];
        
        if (submissionData.pages) {
          for (let pageIndex = 0; pageIndex < submissionData.pages.length; pageIndex++) {
            const page = submissionData.pages[pageIndex];
            
            if (page.questions) {
              for (let questionIndex = 0; questionIndex < page.questions.length; questionIndex++) {
                const question = page.questions[questionIndex];
                
                if (question.id === answerKey) {
                  submissionData.pages[pageIndex].questions[questionIndex].answer = answerValue;
                  break;
                }
              }
            }
          }
        }
      });

      // 4. Convert to base64
      const jsonString = JSON.stringify(submissionData, null, 2);
      const base64Data = Buffer.from(jsonString, 'utf-8').toString('base64');
      
      // 5. Upload and get response
      console.log('📤 [SUBMIT] Uploading document:', documentType);
      const uploadResult = await appState.uploadDocument({
        documentType: documentType,
        documentCategory: documentType,
        fileData: base64Data,
        fileExtension: '.json'
      });

      console.log('📤 [SUBMIT] Upload result:', uploadResult);

      // 6. BACKGROUND LOGIN AND REGISTRATION STATUS CHECK
      console.log('� [SUBMIT] Performing background login regardless of response...');
      
      try {
        // Always perform background login/authentication
        await appState.authenticateUser();
        console.log('✅ [SUBMIT] Background authentication successful');
        
        // Always reload user status to get latest registration state
        if (appState?.loadUserInfo) {
          await appState.loadUserInfo();
        }
        if (appState?.loadUserStatus) {
          await appState.loadUserStatus();
        }
        console.log('✅ [SUBMIT] User status reloaded');
        
        // CRITICAL: Trigger the registration status check to redirect appropriately
        console.log('🔍 [SUBMIT] Checking if user needs to be redirected based on registration status...');
        const redirectTarget = await appState.checkUserStatusRedirect();
        console.log('🎯 [SUBMIT] Redirect target determined:', redirectTarget);
        
        if (redirectTarget === 'RegistrationCompletion') {
          console.log('📋 [SUBMIT] User needs to go to RegistrationCompletion - updating state');
          // Set the main panel state to RegistrationCompletion
          appState.setMainPanelState({
            mainPanelState: 'RegistrationCompletion',
            pageName: 'default'
          });
        }
        
      } catch (authError) {
        console.error('⚠️ [SUBMIT] Background authentication error (continuing anyway):', authError);
      }

      // 7. Silent success handling - no user prompts
      console.log('✅ [SUBMIT] Form submission completed successfully, proceeding silently');
      
      // Directly trigger the completion callback without showing alert
      if (onSubmit) {
        onSubmit({ 
          uploadResult, 
          uploadSuccess: true,
          shouldCheckRegistration: true // Signal to check registration status
        });
      }

    } catch (error) {
      console.error('❌ [SUBMIT] Submission error:', error);
      
      // Even on error, try background login and continue
      console.log('🔄 [SUBMIT] Form submission failed, but attempting background login anyway...');
      
      try {
        await appState.authenticateUser();
        if (appState?.loadUserInfo) {
          await appState.loadUserInfo();
        }
        if (appState?.loadUserStatus) {
          await appState.loadUserStatus();
        }
        console.log('✅ [SUBMIT] Background authentication successful despite submission error');
        
        // CRITICAL: Even on submission error, check registration status for redirect
        console.log('🔍 [SUBMIT] Checking registration status after error...');
        const redirectTarget = await appState.checkUserStatusRedirect();
        console.log('🎯 [SUBMIT] Redirect target determined after error:', redirectTarget);
        
        if (redirectTarget === 'RegistrationCompletion') {
          console.log('📋 [SUBMIT] User needs to go to RegistrationCompletion - updating state');
          appState.setMainPanelState({
            mainPanelState: 'RegistrationCompletion',
            pageName: 'default'
          });
        }
        
      } catch (authError) {
        console.error('❌ [SUBMIT] Background authentication also failed:', authError);
      }
      
      // Silent error handling - no user prompts
      console.log('⚠️ [SUBMIT] Form submission had errors, but proceeding silently');
      
      // Directly trigger the completion callback without showing alert
      if (onSubmit) {
        onSubmit({ 
          uploadResult: error,
          uploadSuccess: false,
          shouldCheckRegistration: true // Still check registration status
        });
      }
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading questionnaire...</Text>
      </View>
    );
  }

  // Render error state
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error loading form: {error}</Text>
        <Button mode="outlined" onPress={loadFormFromLocal} style={styles.retryButton}>
          Retry
        </Button>
      </View>
    );
  }

  // Show message if no form data available
  if (!activeFormData) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>No form data available</Text>
      </View>
    );
  }

  // Helper functions
  const renderQuestion = (question, index, allQuestions) => {
    const questionKey = `form_page_${currentPage}_q_${question.id || 'unknown'}_idx_${index}`;
    const currentAnswer = answers[question.id] || question.answer || '';

    const updateAnswer = (value) => {
      setAnswers(prev => ({
        ...prev,
        [question.id]: value
      }));
    };

    switch (question.type) {
      case 'legend':
        return (
          <View key={questionKey} style={styles.questionContainer}>
            {renderHtmlText(question.label, styles.legendText, width, appState)}
            {question.guidance ? (
              <View style={{ marginTop: 8 }}>
                {renderHtmlText(question.guidance, styles.questionGuidance, width, appState)}
              </View>
            ) : null}
          </View>
        );

      case 'text':
      case 'email':
      case 'password':
      case 'number':
        // Apply variable substitution to the value field if it exists
        let defaultValue = currentAnswer;
        if (!defaultValue && question.value) {
          defaultValue = substituteVariables(question.value, appState);
          console.log('🔄 [VARIABLE SUBSTITUTION] Applied to input value:', question.value, '→', defaultValue);
          // Set the substituted value as the current answer if it's not already set
          if (!currentAnswer) {
            updateAnswer(defaultValue);
          }
        }
        
        return (
          <View key={questionKey} style={styles.questionContainer}>
            {renderHtmlText(question.label, styles.questionLabel, width, appState)}
            {question.guidance ? (
              <View style={{ marginTop: 8 }}>
                {renderHtmlText(question.guidance, styles.questionGuidance, width, appState)}
              </View>
            ) : null}
            <TextInput
              style={styles.textInput}
              value={defaultValue || ''}
              placeholder={question.placeholder || ''}
              secureTextEntry={question.type === 'password'}
              keyboardType={
                question.type === 'email' ? 'email-address' : 
                question.type === 'number' ? 'numeric' : 'default'
              }
              onChangeText={updateAnswer}
              mode="outlined"
            />
          </View>
        );

      case 'textarea':
        return (
          <View key={questionKey} style={styles.questionContainer}>
            {renderHtmlText(question.label, styles.questionLabel, width, appState)}
            {question.guidance ? (
              <View style={{ marginTop: 8 }}>
                {renderHtmlText(question.guidance, styles.questionGuidance, width, appState)}
              </View>
            ) : null}
            <TextInput
              style={styles.textInput}
              value={currentAnswer}
              placeholder={question.placeholder || ''}
              onChangeText={updateAnswer}
              mode="outlined"
              multiline
              numberOfLines={4}
            />
          </View>
        );

      case 'radio':
        return (
          <View key={questionKey} style={styles.questionContainer}>
            {renderHtmlText(question.label, styles.questionLabel, width, appState)}
            {question.guidance ? (
              <View style={{ marginTop: 8 }}>
                {renderHtmlText(question.guidance, styles.questionGuidance, width, appState)}
              </View>
            ) : null}
            <View style={styles.radioGroupContainer}>
              {question.values?.map((option, optionIndex) => (
                <TouchableOpacity 
                  key={`${questionKey}_option_${optionIndex}`}
                  style={[
                    styles.radioOptionContainer,
                    currentAnswer === option.id && styles.radioOptionSelected
                  ]}
                  onPress={() => updateAnswer(option.id)}
                  activeOpacity={0.7}
                >
                  <RadioButton
                    value={option.id}
                    status={currentAnswer === option.id ? 'checked' : 'unchecked'}
                    onPress={() => updateAnswer(option.id)}
                    color="#1976D2"
                    uncheckedColor="#757575"
                  />
                  <View style={{ flex: 1 }}>
                    {renderHtmlText(option.text, {
                      ...styles.radioLabel,
                      ...(currentAnswer === option.id ? styles.radioLabelSelected : {})
                    }, width - 60, appState)}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      default:
        return (
          <View key={questionKey} style={styles.questionContainer}>
            <Text style={styles.questionLabel}>
              Unsupported question type: {question.type}
            </Text>
          </View>
        );
    }
  };

  const isLastPage = () => {
    if (activeFormData?.pages) {
      return currentPage >= activeFormData.pages.length - 1;
    }
    return true;
  };

  const handleNext = () => {
    console.log('🔄 [NEXT BUTTON] Next button clicked - running page-specific validation');
    
    // Validate current page only (not the entire form)
    const validation = validateForm(true); // true = page-specific validation
    if (!validation.isValid) {
      console.log('❌ [NEXT BUTTON] Page validation failed, showing errors');
      Alert.alert('Validation Error', validation.errors.join('\n\n'));
      return;
    }
    
    console.log('✅ [NEXT BUTTON] Page validation passed, proceeding with navigation');
    
    if (activeFormData?.pages && currentPage < activeFormData.pages.length - 1) {
      // Check if current page has accountpurpose question and handle conditional navigation
      const currentPageData = activeFormData.pages[currentPage];
      const accountPurposeQuestion = currentPageData?.questions?.find(q => q.id === 'accountpurpose');
      
      if (accountPurposeQuestion && answers.accountpurpose) {
        // Find the page that matches the selected radio value
        const selectedValue = answers.accountpurpose;
        const targetPageIndex = activeFormData.pages.findIndex(page => page.pageid === selectedValue);
        
        if (targetPageIndex !== -1 && targetPageIndex !== currentPage) {
          console.log(`🎯 Conditional navigation: accountpurpose="${selectedValue}" → page "${activeFormData.pages[targetPageIndex].pageid}"`);
          
          // Record this conditional navigation in history
          setNavigationHistory(prev => [...prev, {
            from: currentPage,
            to: targetPageIndex,
            type: 'conditional',
            trigger: 'accountpurpose'
          }]);
          
          setCurrentPage(targetPageIndex);
          return;
        } else if (targetPageIndex === -1) {
          // No matching pageid found, automatically submit
          console.log('📝 [AUTO SUBMIT] No additional questions found for selection, auto-submitting form');
          handleSubmit();
          return;
        }
      }

      // Check if current page's nextpage is "submitToServer" - meaning end of pageid flow
      if (currentPageData?.nextpage === 'submitToServer') {
        console.log('📝 [AUTO SUBMIT] Reached end of pageid flow, auto-submitting form');
        handleSubmit();
        return;
      }
      
      // Default navigation: go to next page
      setNavigationHistory(prev => [...prev, {
        from: currentPage,
        to: currentPage + 1,
        type: 'sequential'
      }]);
      setCurrentPage(currentPage + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (navigationHistory.length > 0) {
      // Find the most recent navigation entry that brought us to the current page
      const lastNavigation = navigationHistory
        .slice()
        .reverse()
        .find(nav => nav.to === currentPage);
      
      if (lastNavigation) {
        // Go back to where we came from
        console.log(`🔙 Going back: page ${currentPage} → page ${lastNavigation.from} (${lastNavigation.type} navigation)`);
        
        // Remove this navigation from history since we're undoing it
        setNavigationHistory(prev => {
          const newHistory = [...prev];
          const index = newHistory.lastIndexOf(lastNavigation);
          if (index > -1) {
            newHistory.splice(index, 1);
          }
          return newHistory;
        });
        
        setCurrentPage(lastNavigation.from);
      } else if (currentPage > 0) {
        // Fallback to sequential previous page if no history found
        setCurrentPage(currentPage - 1);
      }
    } else if (currentPage > 0) {
      // No navigation history, use sequential navigation
      setCurrentPage(currentPage - 1);
    }
  };

  const currentQuestions = getCurrentQuestions();

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            {renderHtmlText(activeFormData.formtitle, { ...styles.formTitle, fontSize: 20 }, width)}
            
            {activeFormData.formintro && (
              <View style={{ marginTop: 8 }}>
                {renderHtmlText(activeFormData.formintro, styles.formIntro, width, appState)}
              </View>
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
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8fafc',
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollViewContent: {
    paddingBottom: 20,
  },
  card: {
    margin: 0,
    elevation: 0,
    backgroundColor: 'white',
    borderRadius: 0,
  },
  cardContent: {
    padding: 20,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#333333',
    lineHeight: 30,
  },
  formIntro: {
    fontSize: 16,
    marginBottom: 20,
    lineHeight: 22,
    color: '#333333',
    textAlign: 'justify',
  },
  pageIndicator: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 20,
  },
  questionContainer: {
    marginBottom: 25,
    backgroundColor: '#ffffff',
  },
  questionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333333',
    lineHeight: 22,
    textAlign: 'justify',
  },
  legendText: {
    fontSize: 16,
    fontWeight: 'normal',
    marginBottom: 10,
    color: '#333333',
    lineHeight: 22,
    textAlign: 'justify',
  },
  questionGuidance: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
    lineHeight: 18,
    fontStyle: 'italic',
    backgroundColor: '#f9fafb',
    padding: 8,
    borderRadius: 6,
    borderLeftWidth: 2,
    borderLeftColor: '#9ca3af',
  },
  textInput: {
    marginTop: 8,
    backgroundColor: '#ffffff',
    borderRadius: 8,
  },
  radioGroupContainer: {
    marginTop: 8,
  },
  radioOptionContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 12,
    marginVertical: 3,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    minHeight: 50,
    overflow: 'hidden',
    flexWrap: 'wrap',
  },
  radioOptionSelected: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
    borderWidth: 1,
  },
  radioLabel: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
    color: '#333333',
    lineHeight: 20,
    textAlign: 'left',
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  radioLabelSelected: {
    fontWeight: 'normal',
    color: '#333333',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  navButton: {
    flex: 1,
    marginHorizontal: 6,
    borderRadius: 12,
    elevation: 2,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
  },
  retryButton: {
    marginTop: 16,
    borderRadius: 12,
  },
});

export default DynamicQuestionnaireForm;
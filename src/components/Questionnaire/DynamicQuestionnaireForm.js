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

// Simple and reliable HTML renderer for React Native
const renderHtmlText = (htmlString, baseStyle = {}, width = 350) => {
  if (!htmlString) return null;
  
  // console.log('🎨 Rendering HTML:', htmlString.substring(0, 100) + (htmlString.length > 100 ? '...' : ''));
  
  // If no HTML tags, return simple text
  if (!htmlString.includes('<')) {
    return <Text style={baseStyle}>{htmlString}</Text>;
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
          
          let headingStyle = { ...baseStyle };
          switch (level) {
            case 1:
              headingStyle = { 
                ...baseStyle, 
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
                ...baseStyle, 
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
                ...baseStyle, 
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
                ...baseStyle, 
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
                ...baseStyle, 
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
                ...baseStyle, 
                fontSize: 14, 
                fontWeight: 'normal', 
                marginVertical: 3, 
                color: '#333333',
                lineHeight: 20,
                textAlign: 'justify'
              };
              break;
              break;
            case 2:
              headingStyle = { 
                ...baseStyle, 
                fontSize: 17, 
                fontWeight: '400', 
                marginVertical: 3, 
                color: '#334155',
                lineHeight: 19
              };
              break;
            case 3:
              headingStyle = { 
                ...baseStyle, 
                fontSize: 16, 
                fontWeight: 'normal', 
                marginVertical: 2, 
                color: '#374151',
                lineHeight: 18,
                textAlign: 'justify'
              };
              break;
            case 4:
              headingStyle = { 
                ...baseStyle, 
                fontSize: 15, 
                fontWeight: 'normal', 
                marginVertical: 2, 
                color: '#475569',
                lineHeight: 17,
                textAlign: 'justify'
              };
              break;
            case 5:
              headingStyle = { 
                ...baseStyle, 
                fontSize: 14, 
                fontWeight: 'normal', 
                marginVertical: 2, 
                color: '#64748b',
                lineHeight: 16,
                textAlign: 'justify'
              };
              break;
            case 6:
              headingStyle = { 
                ...baseStyle, 
                fontSize: 13, 
                fontWeight: 'normal', 
                marginVertical: 1, 
                color: '#6b7280',
                lineHeight: 15,
                textAlign: 'justify'
              };
              break;
          }
          
          elements.push(
            <Text key={`heading-${partIndex}`} style={headingStyle}>
              {content}
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
              const boldContent = boldMatch[2];
              textElements.push(
                <Text key={`bold-${partIndex}-${boldIndex}`} style={{ 
                  ...baseStyle, 
                  fontWeight: 'normal', 
                  color: '#333333',
                  textAlign: 'justify'
                }}>
                  {boldContent}
                </Text>
              );
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
                    ...baseStyle,
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
              <View key={`paragraph-${partIndex}`} style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {textElements}
              </View>
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
    
    return elements;
  };

  try {
    const renderedElements = parseAndRenderHtml(htmlString);
    console.log('✅ HTML parsed successfully, elements:', renderedElements.length);
    
    return (
      <View>
        {renderedElements}
      </View>
    );
  } catch (error) {
    console.error('❌ HTML parsing error:', error);
    // Fallback to simple text without HTML tags
    const cleanText = htmlString
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
    
    return <Text style={baseStyle}>{cleanText}</Text>;
  }
};

const DynamicQuestionnaireForm = ({ 
  formId = null,             // Form ID to load from local JSON files (e.g., 'finprom-categorisation')
  onSubmit, 
  onBack 
}) => {
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

  // Handle form submission
  const handleSubmit = async () => {
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
      
      // 5. Upload
      const uploadResult = await appState.uploadDocument({
        documentType: documentType,
        documentCategory: documentType,
        fileData: base64Data,
        fileExtension: '.json'
      });

      // 6. Show success and call callback
      Alert.alert(
        'Thank you!', 
        `Thank you for your evaluation. You may login after 15 mins. You can use the app if you pass.`,
        [
          {
            text: 'OK',
            onPress: async () => {
              if (onSubmit) {
                onSubmit({ uploadResult, uploadSuccess: true });
              }
              
              // Logout automatically and redirect to login page
              try {
                console.log('🚪 Automatically logging out user after form submission');
                await appState.logout(false); // Regular logout - preserves credentials for re-login
                appState.changeState('Login');
                console.log('✅ Successfully logged out and redirected to login');
              } catch (error) {
                console.error('❌ Error during automatic logout:', error);
                // Even if logout fails, still try to go to login
                appState.changeState('Login');
              }
            }
          }
        ]
      );

    } catch (error) {
      Alert.alert(
        'Submission Error', 
        `Failed to submit form: ${error.message}`,
        [
          {
            text: 'Retry',
            onPress: () => handleSubmit()
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
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
            {renderHtmlText(question.label, styles.legendText, width)}
            {question.guidance ? (
              <View style={{ marginTop: 8 }}>
                {renderHtmlText(question.guidance, styles.questionGuidance, width)}
              </View>
            ) : null}
          </View>
        );

      case 'text':
      case 'email':
      case 'password':
      case 'number':
        return (
          <View key={questionKey} style={styles.questionContainer}>
            {renderHtmlText(question.label, styles.questionLabel, width)}
            {question.guidance ? (
              <View style={{ marginTop: 8 }}>
                {renderHtmlText(question.guidance, styles.questionGuidance, width)}
              </View>
            ) : null}
            <TextInput
              style={styles.textInput}
              value={currentAnswer}
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
            {renderHtmlText(question.label, styles.questionLabel, width)}
            {question.guidance ? (
              <View style={{ marginTop: 8 }}>
                {renderHtmlText(question.guidance, styles.questionGuidance, width)}
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
            {renderHtmlText(question.label, styles.questionLabel, width)}
            {question.guidance ? (
              <View style={{ marginTop: 8 }}>
                {renderHtmlText(question.guidance, styles.questionGuidance, width)}
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
                  {renderHtmlText(option.text, [
                    styles.radioLabel,
                    currentAnswer === option.id && styles.radioLabelSelected
                  ], width)}
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
          // No matching pageid found, prompt user to submit
          Alert.alert(
            'Submit Form',
            'No additional questions found for your selection. Would you like to submit the form now?',
            [
              {
                text: 'Cancel',
                style: 'cancel',
              },
              {
                text: 'Submit',
                onPress: handleSubmit,
              },
            ]
          );
          return;
        }
      }

      // Check if current page's nextpage is "submitToServer" - meaning end of pageid flow
      if (currentPageData?.nextpage === 'submitToServer') {
        console.log('📝 Reached end of pageid flow, checking for general questions...');
        
        // Look for any pages that aren't part of specific pageid flows
        // For this form, all pages have pageids, so we submit when reaching submitToServer
        Alert.alert(
          'Complete Form',
          'You have completed all questions for your selection. Would you like to submit the form now?',
          [
            {
              text: 'Go Back',
              style: 'cancel',
              onPress: () => handlePrevious()
            },
            {
              text: 'Submit',
              onPress: handleSubmit,
            },
          ]
        );
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
            {renderHtmlText(activeFormData.formtitle, [styles.formTitle, { fontSize: 20 }], width)}
            
            {activeFormData.formintro && (
              <View style={{ marginTop: 8 }}>
                {renderHtmlText(activeFormData.formintro, styles.formIntro, width)}
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
    maxWidth: '72%',
    width: '72%',
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
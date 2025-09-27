// Enhanced Dynamic QuestionnaireForm
// This shows how to enhance your existing component for API-driven forms

import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, Card, Button, TextInput, RadioButton, ActivityIndicator } from 'react-native-paper';
import Icon from 'react-native-vector-icons/FontAwesome';

// Internal imports
import { colors, sharedStyles, sharedColors } from 'src/constants';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';

const DynamicQuestionnaireForm = ({ 
  // NEW: Either provide formData directly OR an API endpoint
  formData = null,           // Static form data (your current approach)
  apiEndpoint = null,        // Dynamic API endpoint
  formId = null,             // Form ID to fetch from API
  onSubmit, 
  onBack 
}) => {
  const [answers, setAnswers] = useState({});
  const [currentPage, setCurrentPage] = useState(0);
  
  // NEW: State for dynamic loading
  const [dynamicFormData, setDynamicFormData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // NEW: Effect to load form data from API if needed
  useEffect(() => {
    if (apiEndpoint || formId) {
      loadFormFromAPI();
    } else if (formData) {
      setDynamicFormData(formData);
    }
  }, [apiEndpoint, formId]);

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

  // Use dynamicFormData if available, fallback to static formData
  const activeFormData = dynamicFormData || formData;

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
    const submissionData = {
      formId: activeFormData.formid,
      uuid: activeFormData.uuid,
      answers: answers
    };

    // NEW: If form has a submiturl, post to API
    if (activeFormData.submiturl) {
      try {
        const response = await fetch(activeFormData.submiturl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submissionData)
        });

        if (!response.ok) {
          throw new Error('Failed to submit form');
        }

        const result = await response.json();
        Alert.alert('Success', 'Form submitted successfully!');
        
        if (onSubmit) {
          onSubmit({ ...submissionData, serverResponse: result });
        }
      } catch (err) {
        Alert.alert('Error', `Failed to submit form: ${err.message}`);
      }
    } else if (onSubmit) {
      onSubmit(submissionData);
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

  // Show message if no form data available
  if (!activeFormData) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>No form data available</Text>
      </View>
    );
  }

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

  // ... rest of your existing methods (renderQuestion, handleNext, etc.)
};

export default DynamicQuestionnaireForm;
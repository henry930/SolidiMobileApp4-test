import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Button, ActivityIndicator } from 'react-native-paper';
import DynamicQuestionnaireForm from './Questionnaire/DynamicQuestionnaireForm';
import { colors } from '../constants';

/**
 * Simple Finprom Categorisation Form Test
 * Tests the specific finprom-categorisation.json form
 */
const FinpromCategorisationFormTest = () => {
  const [showForm, setShowForm] = useState(false);
  const [formResult, setFormResult] = useState(null);

  const handleLoadForm = () => {
    console.log('📋 Loading finprom categorisation form...');
    setShowForm(true);
    setFormResult(null);
  };

  const handleFormSubmit = (result) => {
    console.log('📋 Finprom Categorisation Form submitted:', result);
    setFormResult(result);
    Alert.alert(
      '✅ Form Submitted',
      `Finprom Categorisation form completed successfully!\n\nAnswers: ${Object.keys(result.answers || {}).length} questions answered`,
      [
        { 
          text: 'View Console', 
          onPress: () => console.log('Full result:', result) 
        },
        { text: 'OK' }
      ]
    );
  };

  const handleBackToTest = () => {
    setShowForm(false);
    setFormResult(null);
  };

  if (showForm) {
    return (
      <View style={styles.container}>
        <Card style={styles.headerCard}>
          <Card.Content>
            <Text style={styles.title}>📋 Finprom Categorisation Form</Text>
            <Button mode="outlined" onPress={handleBackToTest} style={styles.backButton}>
              ← Back to Test Menu
            </Button>
          </Card.Content>
        </Card>
        
        <DynamicQuestionnaireForm 
          formId="customer-categorisation"
          onSubmit={handleFormSubmit}
          onBack={handleBackToTest}
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.headerCard}>
        <Card.Content>
          <Text style={styles.title}>🎯 Finprom Categorisation Test</Text>
          <Text style={styles.subtitle}>
            Test loading and displaying finprom-categorisation.json form
          </Text>
          
          <View style={styles.infoContainer}>
            <Text style={styles.infoTitle}>Test Information:</Text>
            <Text style={styles.infoText}>• Form ID: customer-categorisation</Text>
            <Text style={styles.infoText}>• File: finprom-categorisation.json</Text>
            <Text style={styles.infoText}>• Source: src/assets/json/</Text>
            <Text style={styles.infoText}>• Loading: LocalFormService</Text>
          </View>

          <Button 
            mode="contained" 
            onPress={handleLoadForm}
            style={styles.testButton}
            icon="form-select"
          >
            Load Finprom Categorisation Form
          </Button>
        </Card.Content>
      </Card>

      {formResult && (
        <Card style={styles.resultCard}>
          <Card.Content>
            <Text style={styles.resultTitle}>✅ Last Submission Result</Text>
            <Text style={styles.resultText}>
              Form: {formResult.formTitle || 'N/A'}
            </Text>
            <Text style={styles.resultText}>
              Questions Answered: {Object.keys(formResult.answers || {}).length}
            </Text>
            <Text style={styles.resultText}>
              Submission Time: {formResult.submissionTime || 'N/A'}
            </Text>
            
            <Button 
              mode="outlined" 
              onPress={() => console.log('Full result:', formResult)}
              style={styles.viewButton}
              compact
            >
              View Full Result in Console
            </Button>
          </Card.Content>
        </Card>
      )}

      <Card style={styles.instructionsCard}>
        <Card.Content>
          <Text style={styles.instructionsTitle}>📖 Test Instructions</Text>
          <Text style={styles.instructionsText}>
            1. Click "Load Finprom Categorisation Form"
          </Text>
          <Text style={styles.instructionsText}>
            2. The form should load from src/assets/json/finprom-categorisation.json
          </Text>
          <Text style={styles.instructionsText}>
            3. Navigate through the form pages and answer questions
          </Text>
          <Text style={styles.instructionsText}>
            4. Submit the form to test the submission flow
          </Text>
          <Text style={styles.instructionsText}>
            5. Check console logs for detailed debugging information
          </Text>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerCard: {
    margin: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  infoContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  testButton: {
    marginTop: 8,
  },
  backButton: {
    marginBottom: 16,
    alignSelf: 'center',
  },
  resultCard: {
    margin: 16,
    marginTop: 0,
    backgroundColor: '#e8f5e8',
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
  },
  resultText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  viewButton: {
    marginTop: 8,
    alignSelf: 'center',
  },
  instructionsCard: {
    margin: 16,
    marginTop: 0,
    backgroundColor: '#fff3cd',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 4,
  },
});

export default FinpromCategorisationFormTest;
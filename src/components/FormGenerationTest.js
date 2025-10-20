import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Button, ActivityIndicator } from 'react-native-paper';
import DynamicQuestionnaireForm from './Questionnaire/DynamicQuestionnaireForm';
import localFormService from '../api/LocalFormService';
import { colors } from '../constants';

/**
 * Form Generation Test Component
 * Tests loading and displaying forms from src/assets/json/
 */
const FormGenerationTest = () => {
  const [formData, setFormData] = useState(null);
  const [availableForms, setAvailableForms] = useState([]);
  const [selectedFormId, setSelectedFormId] = useState('customer-categorisation');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAvailableForms();
    loadSelectedForm();
  }, []);

  const loadAvailableForms = () => {
    try {
      const forms = localFormService.getAvailableForms();
      setAvailableForms(forms);
      console.log('📋 Available forms loaded:', forms);
    } catch (err) {
      console.error('❌ Error loading available forms:', err);
      setError(err.message);
    }
  };

  const loadSelectedForm = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('📋 Loading form:', selectedFormId);
      const form = await localFormService.getFormById(selectedFormId);
      setFormData(form);
      console.log('✅ Form loaded successfully:', form.formtitle);
      console.log('📄 Form structure:', {
        formid: form.formid,
        formtitle: form.formtitle,
        pages: form.pages ? form.pages.length : 0,
        questions: form.questions ? form.questions.length : 0
      });
    } catch (err) {
      console.error('❌ Error loading form:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (result) => {
    console.log('📋 Form submitted:', result);
    Alert.alert(
      '✅ Form Submitted',
      'Form submission completed. Check console for details.',
      [{ text: 'OK' }]
    );
  };

  const handleFormSelect = (formId) => {
    setSelectedFormId(formId);
    setFormData(null);
    // Auto-load the selected form
    setTimeout(() => {
      loadFormWithId(formId);
    }, 100);
  };

  const loadFormWithId = async (formId) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('📋 Loading form:', formId);
      const form = await localFormService.getFormById(formId);
      setFormData(form);
      console.log('✅ Form loaded:', form.formtitle);
    } catch (err) {
      console.error('❌ Error loading form:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.headerCard}>
        <Card.Content>
          <Text style={styles.title}>📋 Form Generation Test</Text>
          <Text style={styles.subtitle}>
            Testing form loading from src/assets/json/
          </Text>
          
          {availableForms.length > 0 && (
            <View style={styles.formSelector}>
              <Text style={styles.selectorTitle}>Available Forms:</Text>
              {availableForms.slice(0, 5).map((form) => (
                <Button
                  key={form.id}
                  mode={selectedFormId === form.id ? 'contained' : 'outlined'}
                  onPress={() => handleFormSelect(form.id)}
                  style={styles.formButton}
                  compact
                >
                  {form.title}
                </Button>
              ))}
              <Text style={styles.formCount}>
                Total: {availableForms.length} forms available
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {error && (
        <Card style={styles.errorCard}>
          <Card.Content>
            <Text style={styles.errorTitle}>❌ Error</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Button mode="outlined" onPress={loadSelectedForm} style={styles.retryButton}>
              Retry
            </Button>
          </Card.Content>
        </Card>
      )}

      {loading && (
        <Card style={styles.loadingCard}>
          <Card.Content style={styles.loadingContent}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading form...</Text>
          </Card.Content>
        </Card>
      )}

      {formData && !loading && (
        <Card style={styles.formCard}>
          <Card.Content>
            <Text style={styles.formTitle}>📄 {formData.formtitle}</Text>
            <Text style={styles.formInfo}>
              Form ID: {formData.formid} | UUID: {formData.uuid}
            </Text>
            {formData.formintro && (
              <Text style={styles.formIntro}>{formData.formintro}</Text>
            )}
            
            <View style={styles.formStats}>
              <Text style={styles.statText}>
                Pages: {formData.pages ? formData.pages.length : 0}
              </Text>
              <Text style={styles.statText}>
                Questions: {formData.questions ? formData.questions.length : 'N/A'}
              </Text>
            </View>
          </Card.Content>
        </Card>
      )}

      {formData && !loading && !error && (
        <DynamicQuestionnaireForm 
          formData={formData}
          onSubmit={handleFormSubmit}
        />
      )}
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
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  formSelector: {
    marginTop: 16,
  },
  selectorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: colors.primary,
  },
  formButton: {
    marginBottom: 4,
    marginHorizontal: 2,
  },
  formCount: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  errorCard: {
    margin: 16,
    backgroundColor: '#ffebee',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#c62828',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#c62828',
    marginBottom: 12,
  },
  retryButton: {
    alignSelf: 'center',
  },
  loadingCard: {
    margin: 16,
  },
  loadingContent: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.primary,
  },
  formCard: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: '#e8f5e8',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
  },
  formInfo: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  formIntro: {
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  formStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: 'bold',
  },
});

export default FormGenerationTest;
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card } from 'react-native-paper';
import DynamicQuestionnaireForm from './DynamicQuestionnaireForm';
import { colors } from 'src/constants';

/**
 * Test component for finprom-categorisation form
 * Uses local JSON import instead of API calls
 */
const FinpromCategorisationTest = () => {

  const handleSubmit = (result) => {
    console.log('🧪 Form submitted with result:', result);
  };

  const handleBack = () => {
    console.log('🧪 Form back button pressed');
  };

  return (
    <View style={styles.container}>
      <Card style={styles.headerCard}>
        <Card.Content>
          <Text style={styles.title}>🧪 Finprom Categorisation Test</Text>
          <Text style={styles.subtitle}>Testing local JSON form loading</Text>
        </Card.Content>
      </Card>
      
      <DynamicQuestionnaireForm 
        formId="customer-categorisation"  // This will load finprom-categorisation.json
        onSubmit={handleSubmit}
        onBack={handleBack}
      />
    </View>
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
  },
});

export default FinpromCategorisationTest;
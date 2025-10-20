// Test component for DynamicQuestionnaireForm with HTML rendering
import React from 'react';
import { View, SafeAreaView } from 'react-native';
import { Text } from 'react-native-paper';
import DynamicQuestionnaireForm from './src/components/Questionnaire/DynamicQuestionnaireForm';

const TestDynamicForm = () => {
  const handleSubmit = (data) => {
    console.log('📋 Form submitted:', data);
    alert('Form submitted! Check console for data.');
  };

  const handleBack = () => {
    console.log('🔙 Back pressed');
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ padding: 20, fontSize: 18, fontWeight: 'bold' }}>
          Dynamic Questionnaire Form Test
        </Text>
        
        <DynamicQuestionnaireForm
          formId="customer-categorisation"  // This should load finprom-categorisation.json
          onSubmit={handleSubmit}
          onBack={handleBack}
        />
      </View>
    </SafeAreaView>
  );
};

export default TestDynamicForm;
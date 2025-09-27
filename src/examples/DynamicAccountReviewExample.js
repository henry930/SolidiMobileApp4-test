// Example: Dynamic AccountReview - API-driven approach
import React, { useContext } from 'react';
import { View } from 'react-native';
import AppStateContext from 'src/application/data';
import { DynamicQuestionnaireForm } from 'src/components/Questionnaire';
import { Title } from 'src/components/shared';

const DynamicAccountReview = () => {
  const appState = useContext(AppStateContext);

  const handleFormSubmit = (submissionData) => {
    console.log('Account review submitted:', submissionData);
    // Handle the submission
    appState.changeState('Explore');
  };

  const handleBack = () => {
    appState.changeState('Explore');
  };

  return (
    <View style={{ flex: 1 }}>
      <Title>Account Review</Title>
      
      {/* 🎯 THREE DIFFERENT WAYS TO USE DYNAMIC FORMS: */}
      
      {/* Option 1: Load by form ID */}
      <DynamicQuestionnaireForm
        formId="enhanced-due-diligence-form"
        onSubmit={handleFormSubmit}
        onBack={handleBack}
      />
      
      {/* Option 2: Load from specific API endpoint */}
      {/* 
      <DynamicQuestionnaireForm
        apiEndpoint="/api/forms/account-review"
        onSubmit={handleFormSubmit}
        onBack={handleBack}
      />
      */}
      
      {/* Option 3: Use static data (your current approach) */}
      {/*
      <DynamicQuestionnaireForm
        formData={staticFormData}
        onSubmit={handleFormSubmit}
        onBack={handleBack}
      />
      */}
    </View>
  );
};

export default DynamicAccountReview;

/**
 * Example API Endpoints and Responses:
 */

// GET /api/questionnaires/enhanced-due-diligence-form
const exampleAPIResponse = {
  "formtitle": "Enhanced Due Diligence",
  "formintro": "Please complete this form for compliance verification",
  "formid": "enhanced-due-diligence-form",
  "uuid": "generated-uuid-here",
  "submittext": "Submit for Review",
  "submiturl": "/api/questionnaires/submit",
  "version": "2.1",
  "lastUpdated": "2025-09-26T10:00:00Z",
  "questions": [
    {
      "type": "text",
      "id": "occupation",
      "label": "Current Occupation",
      "required": true,
      "validation": {
        "minLength": 2,
        "maxLength": 100
      }
    },
    {
      "type": "radio",
      "id": "income_source",
      "label": "Primary Source of Income",
      "required": true,
      "options": [
        { "value": "employment", "label": "Employment/Salary" },
        { "value": "business", "label": "Business/Self-employed" },
        { "value": "investments", "label": "Investments" },
        { "value": "other", "label": "Other" }
      ]
    },
    {
      "type": "conditional",
      "id": "income_details",
      "label": "Please provide details about your income source",
      "showIf": {
        "field": "income_source",
        "value": "other"
      },
      "validation": {
        "required": true
      }
    }
  ]
};

/**
 * Benefits of API-Driven Approach:
 * 
 * ✅ Update forms without app store releases
 * ✅ A/B test different form versions
 * ✅ Personalized forms based on user data
 * ✅ Real-time compliance updates
 * ✅ Analytics on form completion rates
 * ✅ Conditional logic based on previous answers
 */
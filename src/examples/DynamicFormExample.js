// Dynamic Form Generation Example - How it Works in React Native

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';

/**
 * PRINCIPLE 1: Pre-compiled Components + Dynamic Configuration
 * 
 * The app bundle contains all possible component types.
 * JSON data from API tells us WHICH components to render and HOW.
 */

const DynamicFormExample = ({ apiEndpoint }) => {
  const [formConfig, setFormConfig] = useState(null);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    // Fetch form configuration from API
    fetchFormConfig();
  }, []);

  const fetchFormConfig = async () => {
    try {
      // This could be from your API
      const response = await fetch(apiEndpoint);
      const config = await response.json();
      
      // Example API response:
      const exampleConfig = {
        "formTitle": "User Registration",
        "fields": [
          {
            "id": "firstName",
            "type": "text",
            "label": "First Name",
            "required": true,
            "validation": "minLength:2"
          },
          {
            "id": "email",
            "type": "email",
            "label": "Email Address",
            "required": true,
            "validation": "email"
          },
          {
            "id": "userType",
            "type": "radio",
            "label": "Account Type",
            "options": [
              { "value": "personal", "label": "Personal" },
              { "value": "business", "label": "Business" }
            ]
          }
        ]
      };
      
      setFormConfig(config || exampleConfig);
    } catch (error) {
      console.error('Failed to fetch form config:', error);
    }
  };

  /**
   * PRINCIPLE 2: Component Factory Pattern
   * 
   * We have a fixed set of component types, but we choose which ones
   * to render based on the JSON configuration.
   */
  const renderField = (fieldConfig) => {
    const { id, type, label, options, required } = fieldConfig;
    const value = formData[id] || '';

    switch (type) {
      case 'text':
      case 'email':
        return (
          <View key={id} style={{ marginBottom: 16 }}>
            <Text>{label} {required && '*'}</Text>
            <TextInput
              value={value}
              onChangeText={(text) => setFormData(prev => ({ ...prev, [id]: text }))}
              keyboardType={type === 'email' ? 'email-address' : 'default'}
              style={{
                borderWidth: 1,
                borderColor: '#ccc',
                padding: 8,
                borderRadius: 4
              }}
            />
          </View>
        );

      case 'radio':
        return (
          <View key={id} style={{ marginBottom: 16 }}>
            <Text>{label} {required && '*'}</Text>
            {options.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => setFormData(prev => ({ ...prev, [id]: option.value }))}
                style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}
              >
                <View style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  borderWidth: 2,
                  borderColor: value === option.value ? '#007AFF' : '#ccc',
                  backgroundColor: value === option.value ? '#007AFF' : 'transparent',
                  marginRight: 8
                }} />
                <Text>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      default:
        return null;
    }
  };

  /**
   * PRINCIPLE 3: Dynamic Structure, Static Components
   * 
   * The form structure changes based on API data,
   * but we're still using the same compiled React Native components.
   */
  if (!formConfig) {
    return <Text>Loading form...</Text>;
  }

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        {formConfig.formTitle}
      </Text>
      
      {/* 🎯 THIS IS THE KEY: Dynamic iteration over API-defined fields */}
      {formConfig.fields.map(renderField)}
      
      <TouchableOpacity
        style={{
          backgroundColor: '#007AFF',
          padding: 12,
          borderRadius: 8,
          alignItems: 'center',
          marginTop: 20
        }}
        onPress={() => console.log('Form submitted:', formData)}
      >
        <Text style={{ color: 'white', fontWeight: 'bold' }}>Submit</Text>
      </TouchableOpacity>
    </View>
  );
};

/**
 * PRINCIPLE 4: What's Dynamic vs Static
 * 
 * ✅ DYNAMIC (from API):
 * - Number of fields
 * - Field types and labels
 * - Validation rules
 * - Form structure and flow
 * - Submit actions
 * 
 * 🔒 STATIC (compiled in app):
 * - Component types (TextInput, TouchableOpacity, etc.)
 * - Rendering logic (switch statements, map functions)
 * - Styling system
 * - Core functionality
 */

export default DynamicFormExample;

/**
 * Example API Responses for Different Form Types:
 */

// Example 1: Simple Contact Form
const contactFormConfig = {
  "formId": "contact-form",
  "formTitle": "Contact Us",
  "submitUrl": "/api/contact",
  "fields": [
    { "id": "name", "type": "text", "label": "Your Name", "required": true },
    { "id": "email", "type": "email", "label": "Email", "required": true },
    { "id": "message", "type": "textarea", "label": "Message", "required": true }
  ]
};

// Example 2: Complex KYC Form
const kycFormConfig = {
  "formId": "kyc-verification",
  "formTitle": "Know Your Customer",
  "submitUrl": "/api/kyc/submit",
  "pages": [
    {
      "pageTitle": "Personal Information",
      "fields": [
        { "id": "firstName", "type": "text", "label": "First Name", "required": true },
        { "id": "lastName", "type": "text", "label": "Last Name", "required": true },
        { "id": "dateOfBirth", "type": "date", "label": "Date of Birth", "required": true }
      ]
    },
    {
      "pageTitle": "Address Details",
      "fields": [
        { "id": "street", "type": "text", "label": "Street Address", "required": true },
        { "id": "city", "type": "text", "label": "City", "required": true },
        { "id": "country", "type": "dropdown", "label": "Country", "options": [
          { "value": "US", "label": "United States" },
          { "value": "UK", "label": "United Kingdom" },
          { "value": "CA", "label": "Canada" }
        ] }
      ]
    }
  ]
};
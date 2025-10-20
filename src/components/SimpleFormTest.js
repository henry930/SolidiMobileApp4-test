import React, { useState, useContext } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Button } from 'react-native-paper';
import DynamicQuestionnaireForm from './Questionnaire/DynamicQuestionnaireForm';
import AppStateContext from 'src/application/data';
import { colors } from 'src/constants';

// Import the finprom-categorisation form data directly from src/assets/json/
import finpromCategorisationForm from 'src/assets/json/finprom-categorisation.json';

/*
// If you prefer to use the LocalFormService instead:
import localFormService from 'src/api/LocalFormService';

// Then in the component:
const [formData, setFormData] = useState(null);
useEffect(() => {
  localFormService.getFormById('customer-categorisation')
    .then(setFormData)
    .catch(console.error);
}, []);
*/

// Backup form data structure (not needed now since we import directly)
const backupFormData = {
  "formtitle": "Self Categorisation",
  "formintro": "",
  "formid": "customer-categorisation",
  "uuid": "12312cc5-a949-49ed-977e-c81fecc2476f",
  "js": "finprom-categorisation.js",
  "submittext": "Submit",
  "submiturl": "/submitquestions",
  "startpage": "intro",
  "pages": [
    {
      "pageid": "intro",
      "nextbutton": "Continue",
      "prevbutton": null,
      "nextpage": "investortype",
      "questions": [
        {
          "type": "legend",
          "id": "entitydetails2",
          "label": "<h5>The UK Financial Conduct Authority (FCA) requires that we ask you some additional questions to better understand your financial circumstances and serve you.<br><br>The FCA prescribes three investor categories. Most customers will fit into the Restricted Investor category - please don't let the name put you off - this category is sufficient for most customers.<br><br>The questions are about your current circumstances so you can disregard anything you have told us previously.<br><br>This categorisation is entirely self declared - Solidi will not be asking for proof / documentation of these statements.</h5>",
          "prepend-icon": "",
          "placeholder": "",
          "guidance": "",
          "answer": ""
        }
      ]
    },
    {
      "pageid": "investortype",
      "nextbutton": "Continue",
      "nextpage": "accountpurpose",
      "questions": [
        {
          "type": "legend",
          "id": "entitydetails",
          "label": "<h2>Which type of investor are you?</h2>",
          "prepend-icon": "",
          "placeholder": "",
          "guidance": "Please choose the investor type which best describes you.",
          "answer": ""
        },
        {
          "type": "legend",
          "id": "entitydetails2",
          "label": "<h5>The UK Financial Conduct Authority (FCA) divide investors into three categories. Please choose the investor type which best describes you.</h5>",
          "prepend-icon": "",
          "placeholder": "",
          "guidance": "",
          "answer": ""
        },
        {
          "type": "radio",
          "id": "accountpurpose",
          "label": "",
          "values": [
            {
              "id": "restricted",
              "text": "<b>Restricted investor</b><br>You've invested less than 10% of your net worth in high risk assets (such as Crypto) over the last 12 months, <b>and</b> you intend to limit such investments to less than 10% in the year ahead.<br>&nbsp;"
            },
            {
              "id": "hnw",
              "text": "<b>High-Net-Worth investor</b><br>You've an annual income of at least £100,000 <b>or</b> assets of at least £250,000.<br>&nbsp;"
            },
            {
              "id": "certified",
              "text": "<b>Certified-Sophisticated investor</b><br>You're received a certificate in the last three years from an authorised firm confirming that you understand the risks of crypto investing.<br>&nbsp;"
            },
            {
              "id": "none",
              "text": "<b>None of the above</b><br>If none of the above apply then unfortunately the FCA will not allow us to provide you with an account."
            }
          ],
          "answer": ""
        }
      ]
    }
  ]
};

/**
 * Simple form test using the finprom-categorisation JSON directly
 */
const SimpleFormTest = () => {
  const appState = useContext(AppStateContext);
  const [formSubmitted, setFormSubmitted] = useState(false);

  const handleSubmit = (result) => {
    console.log('📋 Form submitted with result:', result);
    setFormSubmitted(true);
    
    Alert.alert(
      '✅ Form Submitted!',
      'The finprom-categorisation form has been submitted successfully. Check the console for details.',
      [{ text: 'OK', style: 'default' }]
    );
  };

  const handleBack = () => {
    console.log('📋 Form back button pressed');
  };

  const resetForm = () => {
    setFormSubmitted(false);
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.headerCard}>
        <Card.Content>
          <Text style={styles.title}>📋 Finprom Categorisation Form</Text>
          <Text style={styles.subtitle}>
            Direct JSON loading test - no API calls needed
          </Text>
          {formSubmitted && (
            <View style={styles.successBanner}>
              <Text style={styles.successText}>✅ Form submitted successfully!</Text>
              <Button mode="outlined" onPress={resetForm} style={styles.resetButton}>
                Reset Form
              </Button>
            </View>
          )}
        </Card.Content>
      </Card>
      
      {!formSubmitted ? (
        <DynamicQuestionnaireForm 
          formData={finpromCategorisationForm}
          onSubmit={handleSubmit}
          onBack={handleBack}
        />
      ) : (
        <Card style={styles.completedCard}>
          <Card.Content>
            <Text style={styles.completedTitle}>Form Completed</Text>
            <Text style={styles.completedText}>
              The form has been processed and uploaded. 
              Check the console logs for detailed submission information.
            </Text>
          </Card.Content>
        </Card>
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
  },
  successBanner: {
    backgroundColor: '#d4edda',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  successText: {
    color: '#155724',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  resetButton: {
    marginTop: 4,
  },
  completedCard: {
    margin: 16,
    backgroundColor: '#d4edda',
  },
  completedTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#155724',
    textAlign: 'center',
    marginBottom: 8,
  },
  completedText: {
    fontSize: 14,
    color: '#155724',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default SimpleFormTest;
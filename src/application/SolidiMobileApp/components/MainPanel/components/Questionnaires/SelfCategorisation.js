// React imports
import React, { useContext, useState } from 'react';
import { StyleSheet, View, Alert } from 'react-native';

// Internal imports
import AppStateContext from 'src/application/data';
import { QuestionnaireForm } from 'src/components/Questionnaire';
import { Title } from 'src/components/shared';
import { sharedStyles, sharedColors } from 'src/constants';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('SelfCategorisation');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);

// Self Categorisation Form Data - Simplified key pages
const selfCategorisationFormData = {
  "formtitle": "Self Categorisation",
  "formintro": "",
  "formid": "customer-categorisation",
  "uuid": "12312cc5-a949-49ed-977e-c81fecc2476f",
  "submittext": "Submit",
  "submiturl": "/submitquestions",
  "pages": [
    {
      "pageid": "intro",
      "nextbutton": "Continue",
      "prevbutton": null,
      "nextpage": "investortype",
      "questions": [
        {
          "type": "legend",
          "id": "intro_text",
          "label": "The UK Financial Conduct Authority (FCA) requires that we ask you some additional questions to better understand your financial circumstances and serve you.\n\nThe FCA prescribes three investor categories. Most customers will fit into the Restricted Investor category - please don't let the name put you off - this category is sufficient for most customers.\n\nThe questions are about your current circumstances so you can disregard anything you have told us previously.\n\nThis categorisation is entirely self declared - Solidi will not be asking for proof / documentation of these statements.",
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
      "nextpage": "complete",
      "questions": [
        {
          "type": "legend",
          "id": "investor_title",
          "label": "Which type of investor are you?",
          "prepend-icon": "",
          "placeholder": "",
          "guidance": "Please choose the investor type which best describes you.",
          "answer": ""
        },
        {
          "type": "legend",
          "id": "investor_subtitle",
          "label": "The UK Financial Conduct Authority (FCA) divide investors into three categories. Please choose the investor type which best describes you.",
          "prepend-icon": "",
          "placeholder": "",
          "guidance": "",
          "answer": ""
        },
        {
          "type": "radio",
          "id": "investor_category",
          "label": "",
          "values": [
            {
              "id": "restricted",
              "text": "Restricted investor - You've invested less than 10% of your net worth in high risk assets (such as Crypto) over the last 12 months, and you intend to limit such investments to less than 10% in the year ahead."
            },
            {
              "id": "hnw",
              "text": "High-Net-Worth investor - You've an annual income of at least £100,000 or assets of at least £250,000."
            },
            {
              "id": "certified",
              "text": "Certified-Sophisticated investor - You're received a certificate in the last three years from an authorised firm confirming that you understand the risks of crypto investing."
            },
            {
              "id": "none",
              "text": "None of the above - If none of the above apply then unfortunately the FCA will not allow us to provide you with an account."
            }
          ],
          "answer": ""
        }
      ]
    },
    {
      "pageid": "complete",
      "nextbutton": "Submit Categorisation",
      "nextpage": null,
      "questions": [
        {
          "type": "legend",
          "id": "complete_title",
          "label": "Categorisation Complete",
          "prepend-icon": "",
          "placeholder": "",
          "guidance": "",
          "answer": ""
        },
        {
          "type": "legend",
          "id": "complete_text",
          "label": "Thank you for completing the self-categorisation questionnaire. Please review your selections and click Submit to finalize your investor categorisation.\n\nThis information helps us ensure we provide appropriate investment services in compliance with FCA regulations.",
          "prepend-icon": "",
          "placeholder": "",
          "guidance": "",
          "answer": ""
        },
        {
          "type": "textarea",
          "id": "additional_comments",
          "label": "Additional Comments (Optional)",
          "prepend-icon": "",
          "placeholder": "Any additional information you'd like to provide...",
          "guidance": "Please provide any additional comments or information that may be relevant to your investor categorisation.",
          "answer": ""
        }
      ]
    }
  ]
};

const SelfCategorisation = () => {
  const appState = useContext(AppStateContext);

  const handleSubmit = (formData) => {
    log('Self Categorisation form submitted:', formData);
    
    const investorCategory = formData.answers.investor_category;
    let message = 'Your investor categorisation has been submitted successfully.';
    
    if (investorCategory === 'none') {
      message = 'Based on your responses, we are unable to provide an account at this time due to FCA regulations. Please contact us if you have any questions.';
    } else if (investorCategory) {
      const categoryNames = {
        'restricted': 'Restricted Investor',
        'hnw': 'High-Net-Worth Investor',
        'certified': 'Certified-Sophisticated Investor'
      };
      message = `You have been categorised as a ${categoryNames[investorCategory]}. We will update your account accordingly.`;
    }
    
    Alert.alert(
      'Categorisation Submitted',
      message,
      [
        {
          text: 'OK',
          onPress: () => {
            // Navigate back to Explore
            appState.setMainPanelState({
              mainPanelState: 'Explore',
              pageName: 'default'
            });
          }
        }
      ]
    );
  };

  const handleBack = () => {
    appState.setMainPanelState({
      mainPanelState: 'Explore',
      pageName: 'default'
    });
  };

  return (
    <View style={[sharedStyles.container, { backgroundColor: sharedColors.background }]}>
      <Title>
        Self Categorisation
      </Title>
      
      <QuestionnaireForm 
        formData={selfCategorisationFormData}
        onSubmit={handleSubmit}
        onBack={handleBack}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default SelfCategorisation;
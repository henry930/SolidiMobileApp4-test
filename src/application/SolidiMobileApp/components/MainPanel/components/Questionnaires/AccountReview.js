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
let logger2 = logger.extend('AccountReview');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);

// Account Review Form Data
const accountReviewFormData = {
  "formtitle": "Account Review",
  "formintro": "Please fill out the form below to assist with our account review process",
  "formid": "enhanced-due-diligence-form",
  "uuid": "4a056019-026e-4e5e-8ddd-ebda93fd2064",
  "submittext": "Submit Application",
  "submiturl": "/submitquestions",
  "questions": [
    {
      "type": "text",
      "id": "occupation",
      "label": "Current Occupation",
      "prepend-icon": "",
      "placeholder": "",
      "guidance": "Please provide your current occupation or alternatively retired, home maker, benefits or otherwise.",
      "answer": ""
    },
    {
      "type": "textarea",
      "id": "sof",
      "label": "Source of funds",
      "prepend-icon": "fa-map",
      "placeholder": "",
      "guidance": "Where are you sending money from to fund your account / purchases. E.g. a bank account, savings account, previous crypto purchase etc.",
      "answer": ""
    },
    {
      "type": "upload",
      "id": "sofupload",
      "label": "Supporting Documents",
      "guidance": "Please provide a document to support your source of funds, eg. a bank / savings account statement",
      "answer": ""
    },
    {
      "type": "textarea",
      "id": "sow",
      "label": "Source of wealth",
      "prepend-icon": "fa-map",
      "placeholder": "",
      "guidance": "How have you come by your overall wealth? This could be via salary, inheritance, previous successful investments, sale of a houses or business etc.",
      "answer": ""
    },
    {
      "type": "upload",
      "id": "sowupload",
      "label": "Supporting Documents",
      "guidance": "Please provide a document to support your source of wealth, eg. a payslip, inheritance details, deed of sale etc.",
      "answer": ""
    },
    {
      "type": "text",
      "id": "investamount",
      "label": "Expected monthly / one off buys(invest)",
      "prepend-icon": "fa-gbp",
      "placeholder": "",
      "guidance": "Please indicate the amount you expect in buy/invest.",
      "answer": ""
    },
    {
      "type": "radio",
      "id": "investfreq",
      "label": "Invest(Buy) Frequency",
      "values": [
        {
          "id": "oneoff",
          "text": "One off investment"
        },
        {
          "id": "daily",
          "text": "Daily"
        },
        {
          "id": "weekly",
          "text": "Weekly"
        },
        {
          "id": "monthly",
          "text": "Monthly"
        },
        {
          "id": "adhoc",
          "text": "Adhoc"
        }
      ],
      "guidance": "",
      "answer": ""
    },
    {
      "type": "text",
      "id": "divestamount",
      "label": "Expected monthly / one off sales(divest)",
      "prepend-icon": "fa-gbp",
      "placeholder": "",
      "guidance": "Please indicate the amount you expect in sell/divest.",
      "answer": ""
    },
    {
      "type": "radio",
      "id": "divestfreq",
      "label": "Divest(sell) Frequency",
      "values": [
        {
          "id": "oneoff",
          "text": "One off investment"
        },
        {
          "id": "daily",
          "text": "Daily"
        },
        {
          "id": "weekly",
          "text": "Weekly"
        },
        {
          "id": "monthly",
          "text": "Monthly"
        },
        {
          "id": "adhoc",
          "text": "Adhoc"
        }
      ],
      "guidance": "",
      "answer": ""
    },
    {
      "type": "textarea",
      "id": "use",
      "label": "Use of crypto",
      "prepend-icon": "fa-map",
      "placeholder": "",
      "guidance": "Please provide details of what you are using the crypto for or how you came to acquire any crypto currency you are selling.",
      "answer": ""
    },
    {
      "type": "upload",
      "id": "supportingdocs",
      "label": "Additional Supporting Documents",
      "guidance": "Please provide any additional documents which may be relevant - e.g. for selling crypto then please provide documents showing purchase of crypto / crypto statements etc.",
      "answer": ""
    }
  ]
};

const AccountReview = () => {
  const appState = useContext(AppStateContext);

  const handleSubmit = (formData) => {
    log('Account Review form submitted:', formData);
    
    Alert.alert(
      'Form Submitted',
      'Your account review application has been submitted successfully. We will review your information and contact you shortly.',
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
        Account Review
      </Title>
      
      <QuestionnaireForm 
        formData={accountReviewFormData}
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

export default AccountReview;
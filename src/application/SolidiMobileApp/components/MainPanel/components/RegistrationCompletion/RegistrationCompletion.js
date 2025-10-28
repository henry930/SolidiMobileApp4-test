// React imports
import React, { useContext, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, useTheme, ProgressBar, Button, IconButton } from 'react-native-paper';

// Internal imports
import AppStateContext from 'src/application/data';
import misc from 'src/util/misc';

// Import individual step components
import EmailVerification from '../EmailVerification/EmailVerification';
import PhoneVerification from '../PhoneVerification/PhoneVerification';
import AccountUpdateComponent from 'src/components/AccountUpdate/AccountUpdate';
import AccountReview from '../Questionnaires/AccountReview';

// Logger
import logger from 'src/util/logger';
let logger2 = logger.extend('RegistrationCompletion');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);

/**
 * RegistrationCompletion - Sequential tab-based registration completion workflow
 * 
 * Tabs:
 * 1. Email Verification - Verify email address with code
 * 2. Phone Verification - Verify phone number with SMS code  
 * 3. Extra Information - Complete account preferences (AccountUpdate)
 * 4. Evaluation - Complete suitability assessment (AccountReview)
 * 
 * Each tab can only be accessed sequentially after completing the previous one.
 */
const RegistrationCompletion = () => {
  console.log('🚀🚀🚀 [RegistrationCompletion] *** COMPONENT IS DEFINITELY LOADING ***');
  console.log('🚀🚀🚀 [RegistrationCompletion] *** COMPONENT IS DEFINITELY LOADING ***');
  console.log('🚀🚀🚀 [RegistrationCompletion] *** COMPONENT IS DEFINITELY LOADING ***');
  
  const appState = useContext(AppStateContext);
  const materialTheme = useTheme();
  const [currentStep, setCurrentStep] = useState(0); // Start at first step - will be updated by determineUserStep
  const [completedSteps, setCompletedSteps] = useState(new Set()); // Will be populated by determineUserStep
  const [isLoading, setIsLoading] = useState(true); // Loading while determining step
  
  const stateChangeID = appState.stateChangeID;
  const pageName = appState.pageName;
  const permittedPageNames = ['default'];
  
  misc.confirmItemInArray('permittedPageNames', permittedPageNames, pageName, 'RegistrationCompletion');

  // Define the sequential steps
  const steps = [
    {
      id: 'email',
      title: 'Email Verification',
      component: 'EmailVerification'
    },
    {
      id: 'phone', 
      title: 'Phone Verification',
      component: 'PhoneVerification'
    },
    {
      id: 'extra',
      title: 'Extra Information',
      component: 'AccountUpdate'
    },
    {
      id: 'evaluation',
      title: 'Evaluation',
      component: 'AccountReview'
    }
  ];

  useEffect(() => {
    const setup = async () => {
      log('RegistrationCompletion setup called');
      try {
        setIsLoading(true);
        
        // Determine the appropriate starting step based on user status and data
        const detectedStep = await determineUserStep();
        
        log('✅ RegistrationCompletion setup completed');
        setIsLoading(false);
      } catch (err) {
        console.error('❌ RegistrationCompletion setup error:', err);
        setIsLoading(false);
      }
    };
    
    setup();
  }, []);

  // Determine which step the user should be on based on their current status
  const determineUserStep = async () => {
    try {
      console.log('🔍 Determining appropriate step for user...');
      console.log('🔍 appState.emailVerified:', appState.emailVerified);
      console.log('🔍 appState.user?.emailVerified:', appState.user?.emailVerified);
      console.log('🔍 appState.phoneVerified:', appState.phoneVerified);
      console.log('🔍 appState.user?.phoneVerified:', appState.user?.phoneVerified);
      console.log('🔍 appState.registrationSuccess:', appState.registrationSuccess);
      console.log('🔍 appState.registrationEmail:', appState.registrationEmail);
      
      // For new registrations, email and phone are NOT verified yet
      // Check if this is a fresh registration
      const isNewRegistration = appState.registrationSuccess || appState.registrationEmail;
      
      if (isNewRegistration) {
        console.log('🆕 Fresh registration detected - email and phone NOT verified');
        // For new registrations, start from email verification
        setCurrentStep(0);
        setCompletedSteps(new Set());
        return 0;
      }
      
      // For returning users, check verification status FIRST (before checking credentials)
      const emailVerified = appState.emailVerified || appState.user?.emailVerified || false;
      const phoneVerified = appState.phoneVerified || appState.user?.phoneVerified || false;
      
      console.log('� Email verified:', emailVerified);
      console.log('� Phone verified:', phoneVerified);
      
      // If email not verified, start from step 1 (Email Verification)
      if (!emailVerified) {
        console.log('� Email not verified - starting from step 1 (Email Verification)');
        setCurrentStep(0);
        setCompletedSteps(new Set());
        return 0;
      }
      
      // If email verified but phone not verified, go to step 2 (Phone Verification)
      if (emailVerified && !phoneVerified) {
        console.log('� Phone not verified - starting from step 2 (Phone Verification)');
        setCurrentStep(1);
        setCompletedSteps(new Set(['email']));
        return 1;
      }
      
      // Both email and phone verified - now check if user has credentials
      const userUuid = appState.user?.uuid || appState.user?.info?.user?.uuid;
      const isAuthenticated = appState.user?.isAuthenticated;
      const hasCredentials = userUuid && isAuthenticated;
      
      console.log('� User UUID:', userUuid);
      console.log('🔐 Is authenticated:', isAuthenticated);
      console.log('� Has credentials:', hasCredentials);
      console.log('🔐 Full user object keys:', appState.user ? Object.keys(appState.user) : 'No user object');
      
      // If user has credentials and both verifications complete, check extra information
      if (hasCredentials) {
        console.log('🔐 User has credentials - checking extra information requirements...');
        
        try {
          // Always check extra_information/check when user has credentials
          const extraInfoData = await appState.privateMethod({
            functionName: 'checkExtraInformation',
            apiRoute: 'user/extra_information/check',
            params: {}
          });
          
          console.log('📊 Extra information check result:', extraInfoData);
          
          // If extra_information/check has no options loaded -> step 4 (AccountReview)
          // If extra_information/check has options -> step 3 (Extra Information)
          if (!extraInfoData || !Array.isArray(extraInfoData) || extraInfoData.length === 0) {
            console.log('📋 No extra information options - jumping to step 4 (AccountReview)');
            setCurrentStep(3); // AccountReview step
            setCompletedSteps(new Set(['email', 'phone', 'extra']));
            return 3;
          } else {
            console.log('📋 Extra information options found - starting step 3 (Extra Information)');
            setCurrentStep(2); // Extra Information step
            setCompletedSteps(new Set(['email', 'phone']));
            return 2;
          }
          
        } catch (error) {
          console.log('⚠️ Error checking extra information:', error.message);
          // If API fails but user has credentials and is verified, default to step 3
          console.log('📋 API failed but user verified - defaulting to step 3 (Extra Information)');
          setCurrentStep(2);
          setCompletedSteps(new Set(['email', 'phone']));
          return 2;
        }
      }
      
      // For users without credentials but both verifications complete
      console.log('✅ Both email and phone verified, checking extra information...');
        
      try {
        // Check if extra_information/check has options loaded
        const extraInfoData = await appState.privateMethod({
          functionName: 'checkExtraInformation',
          apiRoute: 'user/extra_information/check',
          params: {}
        });
        
        console.log('📊 Extra information check result:', extraInfoData);
        
        // If extra_information/check has no options loaded -> step 4 (AccountReview)
        // If extra_information/check has options -> step 3 (Extra Information)
        if (!extraInfoData || !Array.isArray(extraInfoData) || extraInfoData.length === 0) {
          console.log('📋 No extra information options - jumping to step 4 (AccountReview)');
          setCurrentStep(3); // AccountReview step
          setCompletedSteps(new Set(['email', 'phone', 'extra']));
          return 3;
        } else {
          console.log('📋 Extra information options found - starting step 3 (Extra Information)');
          setCurrentStep(2); // Extra Information step
          setCompletedSteps(new Set(['email', 'phone']));
          return 2;
        }
        
      } catch (error) {
        console.log('⚠️ Error checking extra information:', error.message);
        // Default to Extra Information step for safety
        console.log('📋 Defaulting to step 3 (Extra Information)');
        setCurrentStep(2);
        setCompletedSteps(new Set(['email', 'phone']));
        return 2;
      }
      
    } catch (error) {
      console.error('❌ Error determining user step:', error);
      // Fallback to first step
      setCurrentStep(0);
      setCompletedSteps(new Set());
      return 0;
    }
  };

  // Handle step completion
    const handleStepComplete = (stepId, data) => {
    log(`✅ Step ${stepId} completed with data:`, data);
    console.log('📊 Current step before advance:', currentStep);
    console.log('📊 Total steps:', steps.length);
    console.log('📊 Can advance?', currentStep < steps.length - 1);
    
    const newCompletedSteps = new Set([...completedSteps, stepId]);
    setCompletedSteps(newCompletedSteps);
    
    // Automatically advance to next step if not at the end
    if (currentStep < steps.length - 1) {
      const nextStep = currentStep + 1;
      log(`🚀 Advancing from step ${currentStep} to step ${nextStep}`);
      console.log('🚀 Next step will be:', steps[nextStep].title, '(', steps[nextStep].component, ')');
      setCurrentStep(nextStep);
    } else {
      console.log('🎉 Final step completed - calling handleAllStepsComplete');
      // Last step completed - show completion dialog
      handleAllStepsComplete();
    }
    
    if (onComplete) {
      onComplete({ stepId, data, completedSteps: [...newCompletedSteps] });
    }
  };

  // Handle completion of all steps
  const handleAllStepsComplete = () => {
    log('All registration steps completed');
    
    Alert.alert(
      'Registration Complete!',
      'You have successfully completed all registration requirements. Welcome to SolidiFX!',
      [
        {
          text: 'Continue to App',
          onPress: () => {
            // Clear registration state
            appState.registrationEmail = null;
            appState.registrationPhone = null;
            appState.registrationSuccess = false;
            
            // Redirect to Home page
            appState.setMainPanelState({
              mainPanelState: 'Home',
              pageName: 'default'
            });
          }
        }
      ]
    );
  };

  // Check if a step can be accessed (allow all steps for development)
  const canAccessStep = (stepIndex) => {
    // For development: allow access to all steps
    return true;
  };

  // Step navigation through completion only

  // Render progress bar with navigation controls
  const renderProgressBar = () => {
    const progress = (currentStep + 1) / steps.length;
    
    return (
      <Card style={styles.progressCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.progressTitle}>
            Registration Progress (Dev Mode)
          </Text>
          
          {/* Navigation Controls */}
          <View style={styles.navigationControls}>
            <Button 
              mode="outlined" 
              onPress={goToPreviousStep}
              disabled={currentStep === 0}
              style={styles.navButton}
            >
              Previous
            </Button>
            
            <Button 
              mode="contained" 
              onPress={goToNextStep}
              disabled={currentStep === steps.length - 1}
              style={styles.navButton}
            >
              Next
            </Button>
          </View>
          
          <ProgressBar 
            progress={progress} 
            color={materialTheme.colors.primary}
            style={styles.progressBar}
          />
          
          <Text variant="bodySmall" style={styles.progressText}>
            Step {currentStep + 1} of {steps.length}: {steps[currentStep]?.title}
          </Text>
          
          {/* Tab Navigation for Quick Access */}
          <View style={styles.quickNavigation}>
            {steps.map((step, index) => (
              <TouchableOpacity
                key={step.id}
                onPress={() => setCurrentStep(index)}
                style={[
                  styles.quickNavTab,
                  index === currentStep && styles.activeQuickNavTab
                ]}
              >
                <Text style={[
                  styles.quickNavText,
                  index === currentStep && styles.activeQuickNavText
                ]}>
                  {index + 1}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card.Content>
      </Card>
    );
  };

  // Render the current step content
  const renderStepContent = () => {
    const currentStepData = steps[currentStep];
    if (!currentStepData) return null;

    switch (currentStepData.component) {
      case 'EmailVerification':
        return (
          <EmailVerificationWrapper 
            onComplete={(data) => handleStepComplete('email', data)}
          />
        );
      
      case 'PhoneVerification':
        return (
          <PhoneVerificationWrapper 
            onComplete={(data) => handleStepComplete('phone', data)}
          />
        );
      
      case 'AccountUpdate':
        return (
          <AccountUpdateWrapper 
            onComplete={(data) => handleStepComplete('extra', data)}
          />
        );
      
      case 'AccountReview':
        return (
          <AccountReviewWrapper 
            onComplete={(data) => handleStepComplete('evaluation', data)}
          />
        );
      
      default:
        return (
          <Text>Component not implemented: {currentStepData.component}</Text>
        );
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading registration completion...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: materialTheme.colors.surface }]}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.unifiedSection}>
            <Text variant="titleMedium" style={styles.progressTitle}>
              Complete Your Registration
            </Text>
            
            <ProgressBar 
              progress={(currentStep + 1) / steps.length} 
              color={materialTheme.colors.primary}
              style={styles.progressBar}
            />
            
            <Text variant="bodySmall" style={styles.progressText}>
              Step {currentStep + 1} of {steps.length}: {steps[currentStep]?.title}
            </Text>
            
            {/* Sequential Step Indicators */}
            <View style={styles.stepIndicators}>
              {steps.map((step, index) => (
                <View
                  key={step.id}
                  style={[
                    styles.stepIndicator,
                    index < currentStep && styles.completedStepIndicator,
                    index === currentStep && styles.activeStepIndicator,
                    index > currentStep && styles.lockedStepIndicator
                  ]}
                >
                  <Text style={[
                    styles.stepIndicatorText,
                    index < currentStep && styles.completedStepText,
                    index === currentStep && styles.activeStepText,
                    index > currentStep && styles.lockedStepText
                  ]}>
                    {index < currentStep ? '✓' : index + 1}
                  </Text>
                </View>
              ))}
            </View>
            
            {/* Step Content */}
            <View style={styles.stepContent}>
              {renderStepContent()}
            </View>
        </View>
      </ScrollView>
    </View>
  );
};

// Wrapper components for each step to handle completion callbacks
const EmailVerificationWrapper = ({ onComplete }) => {
  const appState = useContext(AppStateContext);
  
  useEffect(() => {
    log('EmailVerificationWrapper mounted');
  }, []);
  
  return <EmailVerification onComplete={onComplete} />;
};

const PhoneVerificationWrapper = ({ onComplete }) => {
  const appState = useContext(AppStateContext);
  
  useEffect(() => {
    log('PhoneVerificationWrapper mounted');
  }, []);
  
  return <PhoneVerification onComplete={onComplete} />;
};

const AccountUpdateWrapper = ({ onComplete = null }) => {
  const appState = useContext(AppStateContext);
  
  useEffect(() => {
    log('AccountUpdateWrapper mounted');
  }, []);
  
  return (
    <AccountUpdateComponent 
      appState={appState} 
      onComplete={onComplete || (() => {
        console.log('📋 [RegistrationCompletion] No onComplete callback provided');
      })} 
    />
  );
};

const AccountReviewWrapper = ({ onComplete }) => {
  const appState = useContext(AppStateContext);
  
  useEffect(() => {
    log('AccountReviewWrapper mounted');
  }, []);
  
  // Create a mock navigation object for AccountReview
  const mockNavigation = {
    goBack: () => {
      log('AccountReview back button pressed');
      // In the tab flow, going back might not be relevant
      // or we could implement going to previous tab
    }
  };
  
  return (
    <AccountReview 
      navigation={mockNavigation}
      onComplete={onComplete} 
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    flex: 1,
  },
  unifiedSection: {
    width: '100%',
    padding: 16,
    backgroundColor: 'transparent',
  },
  progressTitle: {
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  progressText: {
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 16,
  },
  stepIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  stepIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 2,
  },
  completedStepIndicator: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  activeStepIndicator: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  lockedStepIndicator: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderColor: 'rgba(0,0,0,0.2)',
  },
  stepIndicatorText: {
    fontSize: 12,
    fontWeight: '600',
  },
  completedStepText: {
    color: 'white',
  },
  activeStepText: {
    color: 'white',
  },
  lockedStepText: {
    color: '#999',
  },
  stepContent: {
    flex: 1,
  },
});

export default RegistrationCompletion;
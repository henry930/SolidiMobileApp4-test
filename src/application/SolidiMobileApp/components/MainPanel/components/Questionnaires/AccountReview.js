import React, { useContext, useState, useEffect } from 'react';
import { View, StyleSheet, Alert, Text } from 'react-native';
import _ from 'lodash';
import AppStateContext from 'src/application/data';
import { DynamicQuestionnaireForm } from 'src/components/Questionnaire';

const AccountReview = ({ navigation, onComplete }) => {
  console.log('🚀🚀🚀 [AccountReview] *** COMPONENT IS DEFINITELY LOADING ***');
  console.log('🚀🚀🚀 [AccountReview] *** COMPONENT IS DEFINITELY LOADING ***');
  console.log('🚀🚀🚀 [AccountReview] *** COMPONENT IS DEFINITELY LOADING ***');
  
  const appState = useContext(AppStateContext);
  const [formId, setFormId] = useState(null);
  const [shouldBlock, setShouldBlock] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Determine which form to load based on user status
  const getFormIdForUser = () => {
    console.log('🎯 [AccountReview] getFormIdForUser called - checking user status');
    
    // Try multiple sources for user data
    const userInfo = appState?.userInfo || appState?.user?.info?.user;
    
    // First check if userInfo exists at all
    if (!userInfo) {
      console.log('=== AccountReview: userInfo not available yet ===');
      console.log('Available appState properties:', Object.keys(appState || {}));
      return null; // Still loading
    }
    
    const cat = userInfo?.cat;
    const appropriate = userInfo?.appropriate;
    const lastcat = userInfo?.lastcat;
    
    console.log('=== AccountReview Component - Dynamic Form Selection ===');
    console.log('User cat:', cat, '(type:', typeof cat, ')');
    console.log('User appropriate:', appropriate, '(type:', typeof appropriate, ')');
    console.log('User lastcat:', lastcat, '(type:', typeof lastcat, ')');
    console.log('Full userInfo:', JSON.stringify(userInfo, null, 2));
    
    // ===== REGISTRATION COMPLETE CHECKING =====
    // Check appropriate status first
    if (appropriate === 'PASS' || appropriate === 'PASSED') {
      console.log('🎉 [AccountReview] User already passed - no forms needed');
      setTimeout(() => {
        Alert.alert(
          'Registration Complete!',
          'You have completed the registration successfully. Welcome to SolidiFX!',
          [
            {
              text: 'Continue to App',
              onPress: () => {
                if (navigation && navigation.goBack) {
                  navigation.goBack();
                } else {
                  // Redirect to main app
                  appState.setMainPanelState({
                    mainPanelState: 'Assets',
                    pageName: 'default'
                  });
                }
              }
            }
          ]
        );
      }, 100);
      return null; // No form needed
    }
    
    // ===== FORM LOADING LOGIC =====
    // 1. If cat is null, load finprom-categorisation
    if (cat === null || cat === undefined) {
      console.log('✅ [AccountReview] Cat is null - loading finprom-categorisation');
      return 'finprom-categorisation';
    }
    
    // 2. If cat is not null, check appropriate value
    if (appropriate === 'TBD') {
      console.log('✅ [AccountReview] Appropriate is TBD - loading finprom-suitability');
      return 'finprom-suitability';
    }
    
    if (appropriate === 'FAILED1') {
      console.log('✅ [AccountReview] Appropriate is FAILED1 - loading finprom-suitability2');
      return 'finprom-suitability2';
    }
    
    if (appropriate === 'FAILED2') {
      console.log('⚠️ [AccountReview] Appropriate is FAILED2 - checking coolEnd time for 24-hour wait');
      
      const coolEnd = userInfo?.coolend;
      console.log('User coolEnd:', coolEnd, '(type:', typeof coolEnd, ')');
      
      if (coolEnd) {
        const coolEndTime = new Date(coolEnd);
        const currentTime = new Date();
        console.log('CoolEnd time:', coolEndTime.toISOString());
        console.log('Current time:', currentTime.toISOString());
        
        if (currentTime < coolEndTime) {
          const waitTimeMs = coolEndTime.getTime() - currentTime.getTime();
          const waitHours = Math.ceil(waitTimeMs / (1000 * 60 * 60));
          console.log(`⏰ Still in cooling period. Wait ${waitHours} more hours`);
          
          Alert.alert(
            '24 Hour Wait Required',
            `You need to wait until ${coolEndTime.toLocaleString()} before you can take the test again. (${waitHours} hours remaining)`,
            [{ text: 'OK', style: 'default' }]
          );
          return null; // Don't proceed with questionnaire
        } else {
          console.log('✅ Cooling period has ended - loading crypto-appropriateness-assessment2');
          return 'crypto-appropriateness-assessment2';
        }
      } else {
        console.log('⚠️ No coolEnd time found - loading crypto-appropriateness-assessment2');
        return 'crypto-appropriateness-assessment2';
      }
    }
    
    // If we reach here, it's an unexpected state - default to suitability form
    console.log('⚠️ [AccountReview] Unexpected state - cat:', cat, 'appropriate:', appropriate, '- defaulting to finprom-suitability');
    return 'finprom-suitability';
  };

  useEffect(() => {
    console.log('🔄 [AccountReview] useEffect triggered - determining form based on user status');
    
    const setupAndDetermineForm = async () => {
      try {
        console.log('🔄 [AccountReview] Inside setupAndDetermineForm function');
        
        // Ensure user data is loaded
        const userInfo = appState?.userInfo || appState?.user?.info?.user;
        console.log('🔄 [AccountReview] Current userInfo:', userInfo ? 'EXISTS' : 'NULL');
        
        if (!userInfo) {
          console.log('[AccountReview] User data not loaded, triggering load...');
          if (appState?.loadUserInfo) {
            await appState.loadUserInfo();
          }
          if (appState?.loadUserStatus) {
            await appState.loadUserStatus();
          }
        }
        
        console.log('🔄 [AccountReview] About to call getFormIdForUser()');
        const determinedFormId = getFormIdForUser();
        console.log('🔄 [AccountReview] getFormIdForUser() returned:', determinedFormId);
        
        if (determinedFormId) {
          console.log('🔄 [AccountReview] Setting formId to:', determinedFormId);
          setFormId(determinedFormId);
          setIsLoading(false);
          console.log('🔄 [AccountReview] State updated - formId set and loading false');
        } else if (determinedFormId === null) {
          // Still loading user data or showing completion message
          console.log('[AccountReview] User data still loading or completion message shown...');
          setIsLoading(true);
        } else {
          // Block access (e.g., waiting period)
          console.log('[AccountReview] Blocking access');
          setShouldBlock(true);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('[AccountReview] setup error:', error);
        setIsLoading(false);
      }
    };

    setupAndDetermineForm();
  }, []); // Empty dependency array


  // Handle form submission with registration status checking
  const handleFormSubmission = async (result) => {
    console.log('[AccountReview] Form submission result:', result);
    
    if (result.shouldCheckRegistration) {
      setIsLoading(true);
      
      // Check which form was just submitted
      const currentFormId = formId;
      console.log('[AccountReview] Submitted form:', currentFormId);
      
      // After form submission, check the API response
      try {
        // Reload user status to get the latest categorisation status
        if (appState?.loadUserInfo) {
          await appState.loadUserInfo();
        }
        if (appState?.loadUserStatus) {
          await appState.loadUserStatus();
        }
        
        // Get updated status
        const userInfo = appState?.userInfo || appState?.user?.info?.user;
        const cat = userInfo?.cat;
        const appropriate = userInfo?.appropriate;
        
        console.log('[AccountReview] Updated status - cat:', cat, 'appropriate:', appropriate);
        
        // Handle finprom-suitability (first attempt) submission
        if (currentFormId === 'finprom-suitability') {
          if (cat === 1 && appropriate === 1) {
            // PASSED - complete registration
            console.log('[AccountReview] First attempt PASSED - completing registration');
            setIsLoading(false);
            if (onComplete) {
              onComplete({ evaluationComplete: true, passed: true });
            }
            return;
          } else {
            // FAILED - load second attempt form
            console.log('[AccountReview] First attempt FAILED - loading crypto-appropriateness-assessment2');
            setFormId('crypto-appropriateness-assessment2');
            setIsLoading(false);
            return;
          }
        }
        
        // Handle crypto-appropriateness-assessment2 (second attempt) submission
        if (currentFormId === 'crypto-appropriateness-assessment2') {
          if (cat === 1 && appropriate === 1) {
            // PASSED on second attempt - complete registration
            console.log('[AccountReview] Second attempt PASSED - completing registration');
            setIsLoading(false);
            if (onComplete) {
              onComplete({ evaluationComplete: true, passed: true });
            }
            return;
          } else {
            // FAILED both attempts - show 24 hour wait message
            console.log('[AccountReview] Second attempt FAILED - showing 24 hour wait message');
            setIsLoading(false);
            
            Alert.alert(
              'Assessment Not Passed',
              'Sorry. You failed the evaluation. You can come back 24 hours later for another try.',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    // Redirect to Home page
                    appState.setMainPanelState({
                      mainPanelState: 'Home',
                      pageName: 'default'
                    });
                  }
                }
              ]
            );
            return;
          }
        }
        
      } catch (error) {
        console.error('[AccountReview] Error checking submission result:', error);
        setIsLoading(false);
      }
    } else {
      // Handle other completion scenarios (if any)
      if (onComplete) {
        onComplete(result);
      }
    }
  };

  // Debug formId changes
  useEffect(() => {
    console.log('🔄 [AccountReview] FormID changed to:', formId);
    if (formId === 'finprom-suitability') {
      console.log('✅ [AccountReview] Successfully changed to finprom-suitability form!');
    }
  }, [formId]);
  
  // Show loading state
  if (isLoading) {
    console.log('AccountReview: Rendering loading state');
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          {/* You can add a loading spinner here */}
        </View>
      </View>
    );
  }
  
  // Don't render anything if access is blocked
  if (shouldBlock) {
    return null;
  }

  // Don't render until formId is determined
  if (!formId) {
    console.log('❌ [AccountReview] formId is null/undefined, not rendering form');
    console.log('❌ [AccountReview] Current state:', { formId, isLoading, shouldBlock });
    
    // ADD TEMPORARY DEBUG VIEW TO MAKE SURE COMPONENT IS RENDERING
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: 'yellow', padding: 20 }]}>
        <View style={{ backgroundColor: 'red', padding: 20, borderRadius: 10 }}>
          <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold', textAlign: 'center' }}>
            🚨 DEBUG: AccountReview Component Loaded!
          </Text>
          <Text style={{ color: 'white', fontSize: 16, textAlign: 'center', marginTop: 10 }}>
            FormID is: {formId || 'NULL'}
          </Text>
          <Text style={{ color: 'white', fontSize: 16, textAlign: 'center' }}>
            isLoading: {isLoading ? 'TRUE' : 'FALSE'}
          </Text>
          <Text style={{ color: 'white', fontSize: 16, textAlign: 'center' }}>
            shouldBlock: {shouldBlock ? 'TRUE' : 'FALSE'}
          </Text>
        </View>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <DynamicQuestionnaireForm
        key={formId} // Force remount when formId changes
        formId={formId}
        onBack={() => navigation.goBack()}
        onSubmit={handleFormSubmission}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryText: {
    fontSize: 16,
    color: '#1976D2',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});

export default AccountReview;

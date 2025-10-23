import React, { useContext, useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import _ from 'lodash';
import AppStateContext from 'src/application/data';
import { DynamicQuestionnaireForm } from 'src/components/Questionnaire';

const AccountReview = ({ navigation, onComplete }) => {
  const appState = useContext(AppStateContext);
  const [formId, setFormId] = useState(null);
  const [shouldBlock, setShouldBlock] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Determine which form to load based on user status
  const getFormIdForUser = () => {
    // Try multiple sources for user data
    const userInfo = appState?.userInfo || appState?.user?.info?.user;
    
    // First check if userInfo exists at all
    if (!userInfo) {
      console.log('=== AccountReview: userInfo not available yet ===');
      console.log('Available appState properties:', Object.keys(appState || {}));
      console.log('appState.userInfo:', appState?.userInfo);
      console.log('appState.user:', appState?.user);
      console.log('appState.user.info:', appState?.user?.info);
      console.log('appState.user.info.user:', appState?.user?.info?.user);
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
    
    // ===== DYNAMIC FORM LOADING BASED ON CAT AND APPROPRIATE VALUES =====
    
    // 1. If cat = null, load finprom-categorisation.json
    if (cat === null || cat === undefined) {
      console.log('✅ Cat is null/undefined - loading finprom-categorisation');
      return 'finprom-categorisation';
    }
    
    // 2. If cat is not null, check appropriate value
    if (appropriate === 'TBD') {
      console.log('✅ Appropriate is TBD - loading finprom-suitability');
      return 'finprom-suitability';
    }
    
    if (appropriate === 'FAILED1') {
      console.log('✅ Appropriate is FAILED1 - loading finprom-suitability2');
      return 'finprom-suitability2';
    }
    
    if (appropriate === 'FAILED2') {
      console.log('⚠️ Appropriate is FAILED2 - checking coolEnd time for 24-hour wait');
      
      // Check coolEnd time instead of lastCat time
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
          console.log(`⏰ Still in cooling period. Wait ${waitHours} more hours until ${coolEndTime.toISOString()}`);
          
          Alert.alert(
            '24 Hour Wait Required',
            `You need to wait until ${coolEndTime.toLocaleString()} before you can take the test again. (${waitHours} hours remaining)`,
            [{ text: 'OK', style: 'default' }]
          );
          return null; // Don't proceed with questionnaire
        } else {
          console.log('✅ Cooling period has ended - allowing retry');
          return 'finprom-suitability';
        }
      } else {
        console.log('⚠️ No coolEnd time found - allowing retry');
        return 'finprom-suitability';
      }
    }
    
    if (appropriate === 'PASS' || appropriate === 'PASSED') {
      console.log('🎉 Appropriate is PASS/PASSED - user has completed assessment successfully');
      console.log('✅ Showing registration completion message');
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
      
      return null; // Don't render form while showing completion
    }
    
    // If we reach here, it's an unexpected state - default to suitability form
    console.log('⚠️ Unexpected state - cat:', cat, 'appropriate:', appropriate, '- defaulting to finprom-suitability');
    return 'finprom-suitability';
  };

  useEffect(() => {
    const setupAndDetermineForm = async () => {
      try {
        // Ensure user data is loaded
        const userInfo = appState?.userInfo || appState?.user?.info?.user;
        if (!userInfo) {
          console.log('AccountReview: User data not loaded, triggering load...');
          if (appState?.loadUserInfo) {
            await appState.loadUserInfo();
          }
          if (appState?.loadUserStatus) {
            await appState.loadUserStatus();
          }
        }
        
        const determinedFormId = getFormIdForUser();
        if (determinedFormId) {
          console.log('AccountReview: Setting formId to:', determinedFormId);
          setFormId(determinedFormId);
          setIsLoading(false);
        } else if (determinedFormId === null) {
          // Still loading user data
          console.log('AccountReview: User data still loading...');
          setIsLoading(true);
        } else {
          // Block access (e.g., waiting period)
          console.log('AccountReview: Blocking access');
          setShouldBlock(true);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('AccountReview setup error:', error);
        setIsLoading(false);
      }
    };

    setupAndDetermineForm();
  }, [appState?.userInfo, appState?.user?.info?.user]);

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
    return null;
  }
  
  return (
    <View style={styles.container}>
      <DynamicQuestionnaireForm
        key={formId} // Force remount when formId changes
        formId={formId}
        onBack={() => navigation.goBack()}
        onSubmit={(result) => {
          console.log('📋 [AccountReview] Form submission result:', { formId, result });
          
          // Check for success - either uploadSuccess OR error.message contains 'success'
          const isSuccess = result && (
            result.uploadSuccess === true ||
            (result.uploadResult && result.uploadResult.error && result.uploadResult.error.message && 
             (result.uploadResult.error.message.toLowerCase().includes('success') || 
              result.uploadResult.error.message.toLowerCase().includes('successful')))
          );

          // Check if this was finprom-categorisation form and if it was successful
          if (formId === 'finprom-categorisation' && isSuccess) {
            console.log('✅ [AccountReview] finprom-categorisation completed successfully - auto-loading finprom-suitability');
            console.log('🔄 [AccountReview] Current formId:', formId);
            console.log('🔄 [AccountReview] Result object:', JSON.stringify(result, null, 2));
            
            // Automatically load finprom-suitability form
            console.log('🔄 [AccountReview] About to change formId to finprom-suitability...');
            console.log('🔄 [AccountReview] Current state before change:', { 
              currentFormId: formId, 
              isLoading, 
              shouldBlock 
            });
            
            setTimeout(() => {
              console.log('🔄 [AccountReview] Executing formId change to finprom-suitability');
              setFormId('finprom-suitability');
              setIsLoading(false);
              console.log('🔄 [AccountReview] State change completed');
            }, 100); // Reduced delay for faster transition
            
            return; // Don't call onComplete yet
          }
          
          // Check if this was finprom-suitability form and if it was successful
          if (formId === 'finprom-suitability' && isSuccess) {
            console.log('✅ [AccountReview] finprom-suitability completed successfully - showing completion message');
            
            // Show completion message and redirect to login
            Alert.alert(
              'Registration Process Completed',
              'Your registration process has been completed successfully. You can login after 15 minutes.',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    console.log('🚪 [AccountReview] Redirecting to login page');
                    appState.setMainPanelState({
                      mainPanelState: 'Login',
                      pageName: 'default'
                    });
                  }
                }
              ]
            );
            return;
          }
          
          // Default behavior for other forms or completion callback
          if (onComplete) {
            onComplete({ accountReviewCompleted: true, formId, result });
          }
        }}
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

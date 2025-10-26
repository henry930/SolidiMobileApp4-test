import React, { Component } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import _ from 'lodash';
import { colors } from 'src/constants';
import { scaledWidth, scaledHeight, normaliseFont } from 'src/util/dimensions';
import logger from 'src/util/logger';

// Import individual tab components
import AccountUseTab from './tabs/AccountUseTab';
import FundingTab from './tabs/FundingTab';
import IncomeTab from './tabs/IncomeTab';
import SavingsTab from './tabs/SavingsTab';

let logger2 = logger.extend('AccountUpdate');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);

class AccountUpdate extends Component {
  constructor(props) {
    super(props);
    
    console.log('🎯 [AccountUpdate] CONSTRUCTOR CALLED!');
    console.log('🚨🚨🚨 [AccountUpdate] COMPONENT IS LOADING! 🚨🚨🚨');
    console.log('🎯 [AccountUpdate] Props received:', Object.keys(props || {}));
    
    this.state = {
      activeTab: 0,
      formData: {
        accountUse: {},
        funding: {},
        income: {},
        savings: {},
      },
      isLoading: true,
      hasUnsavedChanges: false,
      optionsLoaded: false,
      
      // New dynamic state for API-driven tabs
      availableCategories: [],
      tabs: [],
      allCategoriesSubmitted: false,
      tabLoadingStates: {}, // Track which tabs have loaded their options
    };
    
    // Create abort controller for API calls
    this.controller = null;
  }

  componentDidMount() {
    console.log('🎯 [AccountUpdate] Component mounted, initializing...');
    console.log('🎯 [AccountUpdate] Props check:', {
      appState: !!this.props.appState,
      privateMethod: !!(this.props.appState && this.props.appState.privateMethod)
    });
    
    if (!this.props.appState || !this.props.appState.privateMethod) {
      console.log('🎯 [AccountUpdate] ERROR: Missing appState or privateMethod');
      console.log('🎯 [AccountUpdate] Loading default categories as fallback');
      this.loadDefaultCategoriesForNewRegistration();
      return;
    }
    
    this.initializePageWithCredentialCheck();
  }

  componentWillUnmount() {
    // Clean up abort controller
    if (this.controller) {
      this.controller.abort();
    }
  }

  // Create abort controller for API calls
  createAbortController = () => {
    if (this.controller) {
      this.controller.abort();
    }
    this.controller = new AbortController();
    
    // Add timeout - increased to 60 seconds to prevent premature abort
    setTimeout(() => {
      if (this.controller && !this.controller.signal.aborted) {
        console.log('🎯 [AccountUpdate] Request timeout, aborting...');
        this.controller.abort();
      }
    }, 60000); // 60 second timeout
    
    return this.controller;
  }

  // Initialize with credential check and background login if needed
  initializePageWithCredentialCheck = async () => {
    try {
      console.log('🎯 [AccountUpdate] Initializing with credential check...');
      this.setState({ isLoading: true });
      
      // Check if user is authenticated
      if (!this.props.appState.user?.isAuthenticated) {
        console.log('🎯 [AccountUpdate] User not authenticated, checking for stored credentials...');
        
        // Try to get background authentication
        const hasCredentials = await this.attemptBackgroundLogin();
        
        if (!hasCredentials) {
          console.log('🎯 [AccountUpdate] No valid credentials found, loading default categories');
          this.loadDefaultCategoriesForNewRegistration();
          return;
        }
        
        console.log('🎯 [AccountUpdate] Background authentication successful, proceeding...');
      }
      
      // Proceed with normal initialization
      await this.loadExistingData();
    } catch (error) {
      console.log('🎯 [AccountUpdate] Error during credential check and initialization:', error.message);
      
      // Fall back to default categories
      console.log('🎯 [AccountUpdate] Falling back to default categories');
      this.loadDefaultCategoriesForNewRegistration();
    }
  }

  // Attempt background login with stored credentials
  attemptBackgroundLogin = async () => {
    try {
      console.log('🔐 [AccountUpdate] Attempting background login...');
      
      // Check if user is already authenticated
      if (this.props.appState.user?.isAuthenticated) {
        console.log('✅ [AccountUpdate] User already authenticated');
        return true;
      }
      
      // Direct credential check even if auto-login is disabled globally
      if (this.props.appState.autoLoginWithStoredCredentials) {
        console.log('🔐 [AccountUpdate] Calling auto-login function...');
        const loginResult = await this.props.appState.autoLoginWithStoredCredentials();
        
        if (loginResult === true) {
          console.log('✅ [AccountUpdate] Background login successful!');
          // Force state update to reflect authentication
          this.forceUpdate();
          return true;
        } else {
          console.log('❌ [AccountUpdate] Background login failed or no credentials found');
          return false;
        }
      } else {
        console.log('⚠️ [AccountUpdate] Auto-login method not available, checking credentials manually...');
        
        // Try to check credentials manually
        const hasCredentials = await this.checkStoredCredentialsManually();
        return hasCredentials;
      }
    } catch (error) {
      console.log('❌ [AccountUpdate] Background login error:', error.message);
      return false;
    }
  }

  // Manual credential check for when auto-login is disabled
  checkStoredCredentialsManually = async () => {
    try {
      // Use mock Keychain to prevent NativeEventEmitter crashes
      const Keychain = {
        getInternetCredentials: async (key) => {
          console.log(`[MockKeychain] getInternetCredentials called for key: ${key}`);
          return Promise.resolve({ username: false, password: false });
        }
      };
      const apiCredentialsStorageKey = this.props.appState.apiCredentialsStorageKey;
      
      console.log('🔐 [AccountUpdate] Checking stored credentials manually...');
      console.log('🔐 [AccountUpdate] Storage key:', apiCredentialsStorageKey);
      
      const credentials = await Keychain.getInternetCredentials(apiCredentialsStorageKey);
      
      if (credentials && credentials.username && credentials.password) {
        console.log('🔐 [AccountUpdate] Found stored credentials, attempting login...');
        const apiKey = credentials.username;
        const apiSecret = credentials.password;
        
        // Validate credentials format
        if (!apiKey || !apiSecret || apiKey.length < 10 || apiSecret.length < 10) {
          console.log('🔐 [AccountUpdate] Invalid credential format');
          return false;
        }
        
        // Try to login with these credentials
        await this.props.appState.loginWithAPIKeyAndSecret({apiKey, apiSecret});
        
        if (this.props.appState.user?.isAuthenticated) {
          console.log('✅ [AccountUpdate] Manual credential login successful!');
          return true;
        } else {
          console.log('❌ [AccountUpdate] Manual credential login failed');
          return false;
        }
      } else {
        console.log('ℹ️ [AccountUpdate] No stored credentials found');
        return false;
      }
    } catch (error) {
      console.log('❌ [AccountUpdate] Manual credential check error:', error.message);
      return false;
    }
  }

  // Initialize the page by loading API data
  initializePage = async () => {
    try {
      console.log('🎯 [AccountUpdate] Initializing page...');
      this.setState({ isLoading: true });
      
      await this.loadExistingData();
    } catch (error) {
      console.log('🎯 [AccountUpdate] Error during initialization:', error.message);
      
      // On initialization error, try to load default categories
      console.log('🎯 [AccountUpdate] Initialization error, loading default categories');
      this.loadDefaultCategoriesForNewRegistration();
    }
  }

  // Method to load existing data from API
  loadExistingData = async () => {
    try {
      console.log('🎯 [AccountUpdate] Loading existing account preferences...');
      this.setState({ isLoading: true });

      console.log('🎯 [AccountUpdate] About to call privateMethod...');
      console.log('🎯 [AccountUpdate] appState available:', !!this.props.appState);
      console.log('🎯 [AccountUpdate] privateMethod available:', !!(this.props.appState && this.props.appState.privateMethod));
      
      console.log('🌐 [AccountUpdate] Making API call to user/extra_information/check...');
      const controller = this.createAbortController();
      const extraInfoData = await this.props.appState.privateMethod({
        functionName: 'loadExistingData',
        apiRoute: 'user/extra_information/check',
        params: {}
      });
      console.log('✅ [AccountUpdate] API call completed!');

      console.log('🎯 [AccountUpdate] Raw API response received:', extraInfoData);
      console.log('🎯 [AccountUpdate] Response type:', typeof extraInfoData);
      console.log('🎯 [AccountUpdate] Is array:', Array.isArray(extraInfoData));
      console.log('🎯 [AccountUpdate] Response length:', extraInfoData?.length);

      if (extraInfoData && Array.isArray(extraInfoData) && extraInfoData.length > 0) {
        console.log('🎯 [AccountUpdate] Processing', extraInfoData.length, 'categories from API');
        this.processAccountPreferences(extraInfoData);
      } else {
        // Empty response - this is normal for new registrations
        // Load default categories for new registration
        console.log('🎯 [AccountUpdate] No existing data found, loading default categories for new registration');
        this.loadDefaultCategoriesForNewRegistration();
      }
    } catch (error) {
      console.log('🎯 [AccountUpdate] Error loading preferences:', error.message);
      console.log('🎯 [AccountUpdate] Full error:', error);
      
      // On error, try to load default categories for new registration
      console.log('🎯 [AccountUpdate] API error, falling back to default categories');
      this.loadDefaultCategoriesForNewRegistration();
    }
  }

  // Load default categories for new registration
  loadDefaultCategoriesForNewRegistration = () => {
    console.log('🎯 [AccountUpdate] Loading default categories for new registration');
    
    // Default categories that new registrations should complete
    const defaultCategories = [
      { 
        category: 'account_use', 
        question: 'What will you primarily use your account for?',
        required: true 
      },
      { 
        category: 'funding', 
        question: 'How will you fund your account?',
        required: true 
      },
      { 
        category: 'income', 
        question: 'What is your annual income range?',
        required: true 
      },
      { 
        category: 'savings', 
        question: 'What are your savings goals?',
        required: true 
      }
    ];
    
    console.log('🎯 [AccountUpdate] Setting up default categories:', defaultCategories);
    this.processAccountPreferences(defaultCategories);
  }

  // Process API response and create dynamic tabs
  processAccountPreferences = (categories) => {
    console.log('🎯 [AccountUpdate] Processing categories:', categories);
    
    // Map categories to tab configuration
    const categoryMapping = {
      'account_use': { label: 'Account Use', icon: '🏦', id: 'accountUse' },
      'purpose': { label: 'Account Use', icon: '🏦', id: 'accountUse' },
      'funding': { label: 'Funding', icon: '💰', id: 'funding' },
      'source': { label: 'Funding', icon: '💰', id: 'funding' },
      'income': { label: 'Income', icon: '💼', id: 'income' },
      'savings': { label: 'Savings', icon: '💎', id: 'savings' }
    };

    const availableTabs = categories.map((category, index) => {
      const mapping = categoryMapping[category.category] || {
        label: category.category,
        icon: '📋',
        id: category.category
      };
      
      return {
        ...mapping,
        category: category.category,
        apiData: category,
        index
      };
    });

    console.log('🎯 [AccountUpdate] Created tabs:', availableTabs);

    // Initially, only load the first tab's options
    const initialTabLoadingStates = {};
    availableTabs.forEach((tab, index) => {
      initialTabLoadingStates[tab.id] = index === 0; // Only first tab is loaded
    });

    this.setState({
      availableCategories: categories,
      tabs: availableTabs,
      activeTab: 0,
      isLoading: false,
      optionsLoaded: true,
      allCategoriesSubmitted: false, // We have categories to show, so not all submitted
      tabLoadingStates: initialTabLoadingStates
    });
  }

  handleTabPress = (tabIndex) => {
    console.log('🎯 [AccountUpdate] Tab pressed:', tabIndex);
    this.setState({ activeTab: tabIndex });
  }

  // Navigation methods
  handleNext = async () => {
    const { activeTab, tabs } = this.state;
    console.log('🎯 [AccountUpdate] Next button pressed, current tab:', activeTab);
    
    if (activeTab < tabs.length - 1) {
      const nextTabIndex = activeTab + 1;
      const nextTab = tabs[nextTabIndex];
      console.log('🎯 [AccountUpdate] Moving to next tab:', nextTabIndex, nextTab.id);
      
      // Load the next tab's options if not already loaded
      await this.loadTabOptions(nextTab.id, nextTabIndex);
      
      this.setState({ activeTab: nextTabIndex });
    } else {
      console.log('🎯 [AccountUpdate] At last tab, submitting data...');
      this.handleSubmit();
    }
  }

  handleBack = () => {
    const { activeTab } = this.state;
    console.log('🎯 [AccountUpdate] Back button pressed, current tab:', activeTab);
    
    if (activeTab > 0) {
      const prevTab = activeTab - 1;
      console.log('🎯 [AccountUpdate] Moving to previous tab:', prevTab);
      this.setState({ activeTab: prevTab });
    }
  }

  // Load options for a specific tab
  loadTabOptions = async (tabId, tabIndex) => {
    const { tabLoadingStates, tabs } = this.state;
    
    // Check if tab is already loaded
    if (tabLoadingStates[tabId]) {
      console.log('🎯 [AccountUpdate] Tab', tabId, 'already loaded');
      return;
    }

    console.log('🎯 [AccountUpdate] Loading options for tab:', tabId);
    
    // Mark tab as loading and update state
    this.setState(prevState => ({
      tabLoadingStates: {
        ...prevState.tabLoadingStates,
        [tabId]: true
      }
    }));

    try {
      // The tab data is already loaded from the initial API call
      // We just need to mark it as loaded
      console.log('🎯 [AccountUpdate] Tab', tabId, 'options loaded successfully');
    } catch (error) {
      console.log('🎯 [AccountUpdate] Error loading tab options:', error);
      // Reset loading state on error
      this.setState(prevState => ({
        tabLoadingStates: {
          ...prevState.tabLoadingStates,
          [tabId]: false
        }
      }));
    }
  }

  handleSubmit = async () => {
    console.log('🎯 [AccountUpdate] Submitting form data:', this.state.formData);
    
    try {
      this.setState({ isLoading: true });
      
      // Transform formData for submission
      const formattedData = this.formatDataForSubmission();
      console.log('🎯 [AccountUpdate] Formatted data for submission:', formattedData);
      
      // Call the save API
      console.log('🌐 [AccountUpdate] Making API call to save account preferences...');
      const saveResult = await this.props.appState.privateMethod({
        functionName: 'submitExtraInformation',
        apiRoute: 'user/extra_information/submit',
        params: formattedData
      });
      
      console.log('🎯 [AccountUpdate] Save response:', saveResult);
      
      // Check if API call returned a display error
      if (saveResult === 'DisplayedError') {
        this.setState({ isLoading: false });
        return;
      }
      
      // Check for success - look for "success" anywhere in the response
      const resultString = JSON.stringify(saveResult).toLowerCase();
      const isSuccess = saveResult && (
        saveResult.success || 
        saveResult.result === 'success' ||
        (saveResult.error && typeof saveResult.error === 'string' && saveResult.error.toLowerCase().includes('success')) ||
        resultString.includes('success')
      );

      if (isSuccess) {
        console.log('✅ [AccountUpdate] Form submitted successfully');
        this.setState({ 
          isLoading: false,
          hasUnsavedChanges: false
        });
        
        // Call onComplete callback to notify parent (RegistrationCompletion) that step is done
        if (this.props.onComplete && typeof this.props.onComplete === 'function') {
          console.log('🚀 [AccountUpdate] Calling onComplete callback to advance to next step');
          this.props.onComplete({ extraInformationSubmitted: true });
        } else {
          console.log('📋 [AccountUpdate] No onComplete callback provided or not a function');
        }
        
        Alert.alert('Success', 'Account preferences saved successfully');
      } else {
        let errorMessage = 'Error saving account preferences. Please try again.';
        if (saveResult && saveResult.error && saveResult.error.message) {
          errorMessage = saveResult.error.message;
        }
        
        console.error('❌ [AccountUpdate] Error saving form:', errorMessage);
        this.setState({ isLoading: false });
        // Alert.alert('Error', errorMessage);
      }
      
    } catch (error) {
      console.error('❌ [AccountUpdate] Exception during form submission:', error);
      this.setState({ isLoading: false });
      Alert.alert('Error', 'Error saving account preferences. Please try again.');
    }
  }
  
  formatDataForSubmission = () => {
    const { formData, tabs } = this.state;
    const choices = [];
    
    // Transform each category's selected options for the API
    Object.keys(formData).forEach(categoryKey => {
      const categoryData = formData[categoryKey];
      if (categoryData && categoryData.selectedOptions && categoryData.selectedOptions.length > 0) {
        // Find the tab to get the category info
        const tab = tabs.find(t => t.id === categoryKey);
        if (tab && tab.apiData && tab.apiData.category) {
          choices.push({
            category: tab.apiData.category,
            option_names: categoryData.selectedOptions
          });
        }
      }
    });
    
    const formatted = { choices };
    
    console.log('🎯 [AccountUpdate] Original formData:', formData);
    console.log('🎯 [AccountUpdate] Formatted for API:', formatted);
    
    return formatted;
  }

  // Validation methods
  isCurrentTabValid = () => {
    const { activeTab, tabs, formData } = this.state;
    const currentTab = tabs[activeTab];
    
    if (!currentTab) return false;
    
    // Check if current tab has selections
    const tabFormData = formData[currentTab.id] || {};
    const selections = tabFormData.selectedOptions || [];
    
    console.log('🎯 [AccountUpdate] Validating tab:', currentTab.id, 'selections:', selections);
    return selections.length > 0;
  }

  hasNextTab = () => {
    const { activeTab, tabs } = this.state;
    return activeTab < tabs.length - 1;
  }

  hasPrevTab = () => {
    const { activeTab } = this.state;
    return activeTab > 0;
  }

  updateFormData = (tabKey, data) => {
    console.log('🎯 [AccountUpdate] updateFormData:', tabKey, data);
    
    this.setState(prevState => ({
      formData: {
        ...prevState.formData,
        [tabKey]: {
          ...prevState.formData[tabKey],
          ...data
        }
      },
      hasUnsavedChanges: true
    }), () => {
      // Force re-render of navigation buttons after state update
      console.log('🎯 [AccountUpdate] Form data updated, current selections:', this.state.formData[tabKey]);
    });
  }

  handleValidationChange = (tabKey, isValid) => {
    console.log('🎯 [AccountUpdate] handleValidationChange:', tabKey, isValid);
    
    // Force a re-render to update navigation button states
    this.forceUpdate();
  }

  renderTabContent = () => {
    const { activeTab, tabs, formData } = this.state;
    
    if (!tabs[activeTab]) {
      return <Text>No content available</Text>;
    }

    const currentTab = tabs[activeTab];
    const commonProps = {
      appState: this.props.appState,
      onDataChange: this.updateFormData,
      isLoading: this.state.isLoading,
    };

    console.log('🎯 [AccountUpdate] Rendering tab content for:', currentTab.id);
    console.log('🎯 [AccountUpdate] Tab API data:', currentTab.apiData);
    console.log('🎯 [AccountUpdate] Form data for tab:', formData[currentTab.id]);

    // Merge API data with form data to provide both options and user selections
    const mergeApiAndFormData = (apiData, formData) => {
      return {
        ...apiData,
        ...formData,
        // Keep both API options and user selections
        selectedOptions: formData.selectedOptions || []
      };
    };

    // For now, show the first available tab component based on the tab ID
    switch (currentTab.id) {
      case 'accountUse':
        return (
          <AccountUseTab
            {...commonProps}
            data={mergeApiAndFormData(currentTab.apiData || {}, formData.accountUse || {})}
            onDataChange={(data) => this.updateFormData('accountUse', data)}
            onValidationChange={(isValid) => this.handleValidationChange('accountUse', isValid)}
          />
        );
      case 'funding':
        return (
          <FundingTab
            {...commonProps}
            data={mergeApiAndFormData(currentTab.apiData || {}, formData.funding || {})}
            onDataChange={(data) => this.updateFormData('funding', data)}
            onValidationChange={(isValid) => this.handleValidationChange('funding', isValid)}
          />
        );
      case 'income':
        return (
          <IncomeTab
            {...commonProps}
            data={mergeApiAndFormData(currentTab.apiData || {}, formData.income || {})}
            onDataChange={(data) => this.updateFormData('income', data)}
            onValidationChange={(isValid) => this.handleValidationChange('income', isValid)}
          />
        );
      case 'savings':
        return (
          <SavingsTab
            {...commonProps}
            data={mergeApiAndFormData(currentTab.apiData || {}, formData.savings || {})}
            onDataChange={(data) => this.updateFormData('savings', data)}
            onValidationChange={(isValid) => this.handleValidationChange('savings', isValid)}
          />
        );
      default:
        return (
          <View style={styles.contentContainer}>
            <Text>Tab content for: {currentTab.label}</Text>
            <Text>Category: {currentTab.category}</Text>
          </View>
        );
    }
  }

  render() {
    const { isLoading, allCategoriesSubmitted, tabs, activeTab } = this.state;

    console.log('🎯 [AccountUpdate] Render - isLoading:', isLoading, 'allSubmitted:', allCategoriesSubmitted, 'tabs:', tabs.length);
    console.log('🚨🚨🚨 [AccountUpdate] RENDER METHOD CALLED! 🚨🚨🚨');

    // Show loading state
    if (isLoading) {
      return (
        <View style={styles.container}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading account preferences...</Text>
          </View>
        </View>
      );
    }

    // Show completion message if all categories submitted
    if (allCategoriesSubmitted || tabs.length === 0) {
      return (
        <View style={styles.container}>
          <View style={styles.completionContainer}>
            <Text style={styles.completionTitle}>✅ All Options Submitted</Text>
            <Text style={styles.completionText}>
              You have completed all required account preference categories.
            </Text>
          </View>
        </View>
      );
    }

    // Render tabbed interface
    return (
      <View style={styles.container}>
        {/* Tab Headers */}
        {this.renderTabNavigation()}
        
        {/* Tab Content */}
        <ScrollView style={styles.tabContentContainer} showsVerticalScrollIndicator={false}>
          {this.renderTabContent()}
        </ScrollView>

        {/* Navigation Buttons */}
        {this.renderNavigationButtons()}
        
        {this.state.hasUnsavedChanges && (
          <View style={styles.unsavedIndicator}>
            <Text style={styles.unsavedText}>You have unsaved changes</Text>
          </View>
        )}
      </View>
    );
  }

  // Render each section in a single screen layout
  renderSingleScreenSection = (tab, index) => {
    const { formData } = this.state;
    
    return (
      <View key={tab.id} style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{tab.label}</Text>
          <Text style={styles.sectionNumber}>{index + 1}</Text>
        </View>
        
        <View style={styles.sectionContent}>
          {this.renderSectionContent(tab)}
        </View>
      </View>
    );
  }

  // Render content for each section (without tab navigation)
  renderSectionContent = (currentTab) => {
    const { formData } = this.state;
    
    const commonProps = {
      isLoading: false, // Individual sections don't need loading state
      onComplete: () => {}, // Handle completion at form level
    };

    const mergeApiAndFormData = (apiData, formData) => {
      return {
        ...apiData,
        ...formData,
        selectedOptions: formData?.selectedOptions || []
      };
    };

    // Render based on tab type
    switch (currentTab.id) {
      case 'accountUse':
        return (
          <AccountUseTab
            {...commonProps}
            data={mergeApiAndFormData(currentTab.apiData || {}, formData.accountUse || {})}
            onDataChange={(data) => this.updateFormData('accountUse', data)}
            onValidationChange={(isValid) => this.handleValidationChange('accountUse', isValid)}
          />
        );
      case 'funding':
        return (
          <FundingTab
            {...commonProps}
            data={mergeApiAndFormData(currentTab.apiData || {}, formData.funding || {})}
            onDataChange={(data) => this.updateFormData('funding', data)}
            onValidationChange={(isValid) => this.handleValidationChange('funding', isValid)}
          />
        );
      case 'income':
        return (
          <IncomeTab
            {...commonProps}
            data={mergeApiAndFormData(currentTab.apiData || {}, formData.income || {})}
            onDataChange={(data) => this.updateFormData('income', data)}
            onValidationChange={(isValid) => this.handleValidationChange('income', isValid)}
          />
        );
      case 'savings':
        return (
          <SavingsTab
            {...commonProps}
            data={mergeApiAndFormData(currentTab.apiData || {}, formData.savings || {})}
            onDataChange={(data) => this.updateFormData('savings', data)}
            onValidationChange={(isValid) => this.handleValidationChange('savings', isValid)}
          />
        );
      default:
        return (
          <View style={styles.contentContainer}>
            <Text>Section content for: {currentTab.label}</Text>
            <Text>Category: {currentTab.category}</Text>
          </View>
        );
    }
  }

  // Render submit button for single screen layout
  renderSingleScreenSubmitButton = () => {
    const { isLoading } = this.state;
    const allSectionsValid = this.areAllSectionsValid();

    return (
      <View style={styles.submitButtonContainer}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            !allSectionsValid && styles.disabledButton
          ]}
          onPress={this.handleSubmit}
          disabled={!allSectionsValid || isLoading}
        >
          <Text style={[
            styles.submitButtonText,
            !allSectionsValid && styles.disabledButtonText
          ]}>
            {isLoading ? 'Saving...' : 'Save All Preferences'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Check if all sections are valid
  areAllSectionsValid = () => {
    const { tabs, formData } = this.state;
    
    return tabs.every(tab => {
      const tabFormData = formData[tab.id] || {};
      const selections = tabFormData.selectedOptions || [];
      return selections.length > 0;
    });
  }

  renderTabNavigation = () => {
    const { tabs, activeTab, tabLoadingStates } = this.state;
    
    return (
      <View style={styles.tabContainer}>
        <View style={[styles.tabScrollContainer, { flexDirection: 'row' }]}>
          {tabs.map((tab, index) => {
            const isTabLoaded = tabLoadingStates[tab.id] || false;
            const isTabDisabled = !isTabLoaded && index !== activeTab;
            
            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tab,
                  activeTab === index && styles.activeTab,
                  isTabDisabled && styles.disabledTab
                ]}
                onPress={() => this.handleTabPress(index)}
                disabled={isTabDisabled}
              >
                <Text style={[
                  styles.tabLabel,
                  activeTab === index && styles.activeTabLabel,
                  isTabDisabled && styles.disabledTabText
                ]}>
                  {tab.label}
                  {!isTabLoaded && index !== activeTab && ' 🔒'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {this.renderProgressBar()}
      </View>
    );
  }

  renderProgressBar = () => {
    const { tabs, activeTab } = this.state;
    const progress = tabs.length > 0 ? ((activeTab + 1) / tabs.length) * 100 : 0;
    
    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {activeTab + 1} of {tabs.length}
        </Text>
      </View>
    );
  }

  renderNavigationButtons = () => {
    const { isLoading } = this.state;
    const isTabValid = this.isCurrentTabValid();
    const hasNext = this.hasNextTab();
    const hasPrev = this.hasPrevTab();
    const isLastTab = !hasNext;
    const isSubmitting = isLoading && isLastTab;

    console.log('🎯 [AccountUpdate] Navigation state:', {
      isTabValid,
      hasNext,
      hasPrev,
      isLastTab,
      isSubmitting
    });

    return (
      <View style={styles.navigationContainer}>
        <TouchableOpacity
          style={[
            styles.navButton,
            styles.backButton,
            (!hasPrev || isLoading) && styles.disabledButton
          ]}
          onPress={this.handleBack}
          disabled={!hasPrev || isLoading}
        >
          <Text style={[
            styles.navButtonText,
            (!hasPrev || isLoading) && styles.disabledButtonText
          ]}>
            Back
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navButton,
            styles.nextButton,
            (!isTabValid || isLoading) && styles.disabledButton
          ]}
          onPress={this.handleNext}
          disabled={!isTabValid || isLoading}
        >
          <Text style={[
            styles.navButtonText,
            styles.nextButtonText,
            (!isTabValid || isLoading) && styles.disabledButtonText
          ]}>
            {isSubmitting ? 'Saving...' : (isLastTab ? 'Submit' : 'Next')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: scaledWidth(20),
  },
  loadingText: {
    fontSize: normaliseFont(16),
    color: colors.gray,
    textAlign: 'center',
  },
  completionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: scaledWidth(20),
  },
  completionTitle: {
    fontSize: normaliseFont(24),
    fontWeight: 'bold',
    color: colors.success || colors.primary,
    marginBottom: scaledHeight(10),
    textAlign: 'center',
  },
  completionText: {
    fontSize: normaliseFont(16),
    color: colors.gray,
    textAlign: 'center',
    lineHeight: normaliseFont(22),
  },
  tabContainer: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  tabScrollContainer: {
    paddingHorizontal: scaledWidth(10),
    flexGrow: 1,
  },
  tab: {
    paddingHorizontal: scaledWidth(8),
    paddingVertical: scaledHeight(15),
    alignItems: 'center',
    flex: 1,
    minWidth: scaledWidth(60),
    maxWidth: scaledWidth(120),
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: colors.primary,
  },
  tabIcon: {
    fontSize: normaliseFont(20),
    marginBottom: scaledHeight(5),
  },
  tabLabel: {
    fontSize: normaliseFont(12),
    color: colors.gray,
    fontWeight: '500',
    textAlign: 'center',
  },
  activeTabLabel: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  disabledTab: {
    opacity: 0.5,
    backgroundColor: colors.lightGray,
  },
  disabledTabText: {
    color: colors.gray,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaledWidth(20),
    paddingVertical: scaledHeight(10),
    backgroundColor: colors.white,
  },
  progressBar: {
    flex: 1,
    height: scaledHeight(4),
    backgroundColor: colors.lightGray,
    borderRadius: scaledHeight(2),
    marginRight: scaledWidth(10),
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: scaledHeight(2),
  },
  progressText: {
    fontSize: normaliseFont(12),
    color: colors.gray,
    fontWeight: '500',
  },
  contentContainer: {
    flex: 1,
    padding: scaledWidth(20),
    backgroundColor: colors.background,
  },
  unsavedIndicator: {
    position: 'absolute',
    bottom: scaledHeight(80), // Moved up to make room for navigation buttons
    right: scaledWidth(20),
    backgroundColor: colors.warning || colors.orange,
    paddingHorizontal: scaledWidth(12),
    paddingVertical: scaledHeight(6),
    borderRadius: scaledHeight(15),
  },
  unsavedText: {
    fontSize: normaliseFont(12),
    color: colors.white,
    fontWeight: '500',
  },
  // Navigation button styles
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: scaledWidth(20),
    paddingVertical: scaledHeight(16),
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
  },
  navButton: {
    paddingHorizontal: scaledWidth(24),
    paddingVertical: scaledHeight(12),
    borderRadius: scaledHeight(8),
    minWidth: scaledWidth(80),
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    backgroundColor: colors.lightGray,
    borderWidth: 1,
    borderColor: colors.gray,
  },
  nextButton: {
    backgroundColor: colors.primary,
  },
  disabledButton: {
    backgroundColor: colors.lightGray,
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: normaliseFont(16),
    fontWeight: '600',
    color: colors.darkText,
  },
  nextButtonText: {
    color: colors.white,
  },
  disabledButtonText: {
    color: colors.gray,
  },
  
  // Tab content container
  tabContentContainer: {
    flex: 1,
    paddingHorizontal: scaledWidth(20),
    paddingTop: scaledHeight(10),
  },
  
  // Single screen layout styles
  scrollContainer: {
    flex: 1,
  },
  singleScreenContainer: {
    padding: scaledWidth(20),
  },
  headerTitle: {
    fontSize: normaliseFont(24),
    fontWeight: 'bold',
    color: colors.darkText,
    textAlign: 'center',
    marginBottom: scaledHeight(8),
  },
  headerSubtitle: {
    fontSize: normaliseFont(16),
    color: colors.mediumText,
    textAlign: 'center',
    marginBottom: scaledHeight(24),
  },
  sectionContainer: {
    backgroundColor: colors.white,
    borderRadius: scaledHeight(12),
    marginBottom: scaledHeight(20),
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.lightBackground,
    paddingHorizontal: scaledWidth(16),
    paddingVertical: scaledHeight(12),
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  sectionTitle: {
    fontSize: normaliseFont(18),
    fontWeight: '600',
    color: colors.darkText,
  },
  sectionNumber: {
    fontSize: normaliseFont(16),
    fontWeight: 'bold',
    color: colors.primary,
    backgroundColor: colors.lightPrimary,
    paddingHorizontal: scaledWidth(8),
    paddingVertical: scaledHeight(4),
    borderRadius: scaledHeight(12),
    minWidth: scaledWidth(24),
    textAlign: 'center',
  },
  sectionContent: {
    padding: scaledWidth(16),
  },
  submitButtonContainer: {
    backgroundColor: colors.white,
    paddingHorizontal: scaledWidth(20),
    paddingVertical: scaledHeight(16),
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: scaledHeight(16),
    borderRadius: scaledHeight(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    fontSize: normaliseFont(18),
    fontWeight: '600',
    color: colors.white,
  },
});

export default AccountUpdate;
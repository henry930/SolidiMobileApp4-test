// Local Form Service - Simple JSON file imports
import logger from '../util/logger';

// Direct JSON imports from src/assets/json/
import finpromCategorisation from '../assets/json/finprom-categorisation.json';
import enhancedDueDiligenceForm from '../assets/json/enhanced-due-diligence-form.json';
import businessAccountApplicationForm from '../assets/json/business-account-application-form.json';
import businessAccountApplicationReview from '../assets/json/business-account-application-review.json';
import cryptobasketLimitsForm from '../assets/json/cryptobasket-limits-form.json';
import enhancedDueDiligenceReviewForm from '../assets/json/enhanced-due-diligence-review-form.json';
import finpromSuitability from '../assets/json/finprom-suitability.json';
import finpromSuitability2 from '../assets/json/finprom-suitability2.json';
import professionalTierApplicationForm from '../assets/json/professional-tier-application-form.json';
import professionalTierApplicationReviewForm from '../assets/json/professional-tier-application-review-form.json';
import transactionMonitorWithdrawQuestions from '../assets/json/transaction-monitor-withdraw-questions.json';
import travelRuleDepositQuestions from '../assets/json/travel-rule-deposit-questions.json';
import travelRuleWithdrawQuestions from '../assets/json/travel-rule-withdraw-questions.json';

let logger2 = logger.extend('LocalFormService');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);

class LocalFormService {
  constructor() {
    // Map form IDs to imported JSON data
    this.forms = {
      'customer-categorisation': finpromCategorisation,
      'finprom-categorisation': finpromCategorisation,
      'enhanced-due-diligence-form': enhancedDueDiligenceForm,
      'business-account-application-form': businessAccountApplicationForm,
      'business-account-application-review': businessAccountApplicationReview,
      'cryptobasket-limits-form': cryptobasketLimitsForm,
      'enhanced-due-diligence-review-form': enhancedDueDiligenceReviewForm,
      'finprom-suitability': finpromSuitability,
      'finprom-suitability2': finpromSuitability2,
      'professional-tier-application-form': professionalTierApplicationForm,
      'professional-tier-application-review-form': professionalTierApplicationReviewForm,
      'transaction-monitor-withdraw-questions': transactionMonitorWithdrawQuestions,
      'travel-rule-deposit-questions': travelRuleDepositQuestions,
      'travel-rule-withdraw-questions': travelRuleWithdrawQuestions
    };
  }

  /**
   * Get form by ID - now just returns the imported JSON data
   */
  async getFormById(formId) {
    log(`Loading local form: ${formId}`);
    
    const formData = this.forms[formId];
    
    if (!formData) {
      const availableForms = Object.keys(this.forms);
      throw new Error(`Form '${formId}' not found. Available forms: ${availableForms.join(', ')}`);
    }

    // Validate form structure
    this.validateFormStructure(formData);
    
    log(`Successfully loaded form: ${formId}`);
    return JSON.parse(JSON.stringify(formData)); // Deep clone to prevent mutations
  }



  /**
   * Get form by filename (e.g., 'finprom-categorisation.json')
   */
  async getFormByFilename(filename) {
    // Remove .json extension if present
    const formId = filename.replace(/\.json$/, '');
    return this.getFormById(formId);
  }

  /**
   * Get all available forms
   */
  getAvailableForms() {
    return Object.keys(this.forms).map(formId => ({
      id: formId,
      title: this.forms[formId].formtitle || formId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: this.forms[formId].formintro || ''
    }));
  }

  /**
   * Validate form structure to ensure it has required fields
   */
  validateFormStructure(formData) {
    if (!formData || typeof formData !== 'object') {
      throw new Error('Invalid form data: must be an object');
    }

    // Check for required fields
    const requiredFields = ['formid', 'formtitle'];
    for (const field of requiredFields) {
      if (!formData[field]) {
        log(`Warning: Form missing required field '${field}'`);
      }
    }

    // Check for questions or pages
    if (!formData.questions && !formData.pages) {
      log('Warning: Form has no questions or pages defined');
    }

    return true;
  }

  /**
   * Submit form data (mock implementation for local testing)
   */
  async submitForm(formData, answers) {
    log(`Mock form submission for form: ${formData.formid}`);
    
    const submissionData = {
      formId: formData.formid,
      uuid: formData.uuid,
      answers: answers,
      submittedAt: new Date().toISOString(),
      status: 'submitted'
    };

    log('Form submission data:', submissionData);
    
    // Return mock success response
    return {
      success: true,
      submissionId: `submission-${Date.now()}`,
      message: 'Form submitted successfully (local mock)',
      data: submissionData
    };
  }

  /**
   * Get the default categorisation form (finprom-categorisation)
   */
  async getDefaultCategorisationForm() {
    return this.getFormById('customer-categorisation');
  }
}

// Create singleton instance
const localFormService = new LocalFormService();

export default localFormService;

// Export specific methods for easier imports
export const {
  getFormById,
  getFormByFilename,
  getAvailableForms,
  submitForm,
  getDefaultCategorisationForm
} = localFormService;
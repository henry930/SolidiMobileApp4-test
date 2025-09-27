// Form API Service - Handles all form-related API calls
import logger from 'src/util/logger';

let logger2 = logger.extend('FormAPIService');
let {deb, dj, log, lj} = logger.getShortcuts(logger2);

class FormAPIService {
  constructor(baseURL = '/api') {
    this.baseURL = baseURL;
    this.cache = new Map(); // Simple in-memory cache
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Fetch form definition by ID
   */
  async getFormById(formId) {
    const cacheKey = `form_${formId}`;
    
    // Check cache first
    const cached = this.getCachedForm(cacheKey);
    if (cached) {
      log(`Using cached form: ${formId}`);
      return cached;
    }

    try {
      const url = `${this.baseURL}/questionnaires/${formId}`;
      log(`Fetching form from API: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Add authentication headers if needed
          // 'Authorization': `Bearer ${token}`,
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const formData = await response.json();
      
      // Validate form structure
      this.validateFormStructure(formData);
      
      // Cache the result
      this.setCachedForm(cacheKey, formData);
      
      log(`Successfully fetched form: ${formId}`);
      return formData;
      
    } catch (error) {
      log(`Error fetching form ${formId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fetch form from custom endpoint
   */
  async getFormFromEndpoint(endpoint) {
    const cacheKey = `endpoint_${endpoint}`;
    
    const cached = this.getCachedForm(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const formData = await response.json();
      this.validateFormStructure(formData);
      this.setCachedForm(cacheKey, formData);
      
      return formData;
    } catch (error) {
      log(`Error fetching form from ${endpoint}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Submit form data
   */
  async submitForm(formData, answers) {
    try {
      const submitUrl = formData.submiturl || `${this.baseURL}/questionnaires/submit`;
      
      const payload = {
        formId: formData.formid,
        uuid: formData.uuid,
        answers: answers,
        submittedAt: new Date().toISOString(),
        version: formData.version || '1.0'
      };

      log(`Submitting form to: ${submitUrl}`, payload);

      const response = await fetch(submitUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add authentication if needed
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Submission failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      log(`Form submitted successfully:`, result);
      
      return result;
    } catch (error) {
      log(`Form submission error:`, error);
      throw error;
    }
  }

  /**
   * Get list of available forms
   */
  async getAvailableForms() {
    try {
      const response = await fetch(`${this.baseURL}/questionnaires`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch forms list: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      log(`Error fetching forms list:`, error);
      throw error;
    }
  }

  /**
   * Cache management
   */
  getCachedForm(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const { data, timestamp } = cached;
    const now = Date.now();

    if (now - timestamp > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }

    return data;
  }

  setCachedForm(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clearCache() {
    this.cache.clear();
  }

  /**
   * Validate form structure to ensure it has required fields
   */
  validateFormStructure(formData) {
    const required = ['formid', 'formtitle'];
    const missing = required.filter(field => !formData[field]);
    
    if (missing.length > 0) {
      throw new Error(`Invalid form structure. Missing fields: ${missing.join(', ')}`);
    }

    // Validate questions array
    if (formData.questions && !Array.isArray(formData.questions)) {
      throw new Error('Form questions must be an array');
    }

    if (formData.pages) {
      if (!Array.isArray(formData.pages)) {
        throw new Error('Form pages must be an array');
      }
      
      formData.pages.forEach((page, index) => {
        if (!page.questions || !Array.isArray(page.questions)) {
          throw new Error(`Page ${index} must have questions array`);
        }
      });
    }
  }

  /**
   * Mock data for development/testing
   */
  getMockForm(formId) {
    const mockForms = {
      'enhanced-due-diligence-form': {
        "formtitle": "Enhanced Due Diligence (API)",
        "formintro": "This form is loaded dynamically from API",
        "formid": "enhanced-due-diligence-form",
        "uuid": `mock-${Date.now()}`,
        "submittext": "Submit for Review",
        "submiturl": "/api/mock/submit",
        "version": "2.0",
        "questions": [
          {
            "type": "text",
            "id": "occupation",
            "label": "What is your current occupation?",
            "required": true,
            "placeholder": "e.g., Software Engineer, Teacher, etc."
          },
          {
            "type": "radio",
            "id": "income_range",
            "label": "What is your annual income range?",
            "required": true,
            "options": [
              { "value": "under_50k", "label": "Under £50,000" },
              { "value": "50k_100k", "label": "£50,000 - £100,000" },
              { "value": "100k_250k", "label": "£100,000 - £250,000" },
              { "value": "over_250k", "label": "Over £250,000" }
            ]
          }
        ]
      }
    };

    return mockForms[formId] || null;
  }
}

// Create singleton instance
const formAPIService = new FormAPIService();

export default formAPIService;

// Export specific methods for easier imports
export const {
  getFormById,
  getFormFromEndpoint,
  submitForm,
  getAvailableForms,
  clearCache
} = formAPIService;
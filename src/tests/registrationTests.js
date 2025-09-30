// Test script for registration API functionality
// This can be run in the React Native app console or web browser console

// Test registration data validation
const testValidation = () => {
  console.log('=== Testing Registration Validation ===');
  
  const validData = {
    firstName: "John",
    lastName: "Doe",
    email: "test@example.com",
    password: "Password123!",
    mobileNumber: "+447123456789",
    dateOfBirth: "01/01/1990",
    gender: "Male",
    citizenship: "GB",
    emailPreferences: {
      systemAnnouncements: true,
      newsAndFeatureUpdates: true,
      promotionsAndSpecialOffers: true
    }
  };
  
  const invalidData = {
    firstName: "",
    lastName: "Doe",
    email: "invalid-email",
    password: "123", // Too short
    mobileNumber: "invalid-phone",
    dateOfBirth: "invalid-date",
    gender: "Invalid",
    citizenship: "INVALID"
  };
  
  console.log('Valid data test:');
  // AppState validation would be called here
  console.log('Should return null (no errors)');
  
  console.log('Invalid data test:');
  // AppState validation would be called here  
  console.log('Should return validation errors object');
};

// Test registration API calls
const testRegistrationAPI = () => {
  console.log('=== Testing Registration API ===');
  
  // Test cases for different scenarios
  const testCases = [
    {
      name: 'Valid Registration',
      data: {
        firstName: "Test",
        lastName: "User",
        email: `test${Date.now()}@example.com`,
        password: "SecurePassword123!",
        mobileNumber: "+447123456789",
        dateOfBirth: "01/01/1990",
        gender: "Male",
        citizenship: "GB",
        emailPreferences: {
          systemAnnouncements: true,
          newsAndFeatureUpdates: true,
          promotionsAndSpecialOffers: true
        }
      },
      expectedResult: 'SUCCESS'
    },
    {
      name: 'Existing Email',
      data: {
        firstName: "Test",
        lastName: "User", 
        email: "existing@example.com",
        password: "SecurePassword123!",
        mobileNumber: "+447123456789",
        dateOfBirth: "01/01/1990",
        gender: "Male",
        citizenship: "GB",
        emailPreferences: {
          systemAnnouncements: true,
          newsAndFeatureUpdates: true,
          promotionsAndSpecialOffers: true
        }
      },
      expectedResult: 'EMAIL_EXISTS'
    },
    {
      name: 'Invalid Email Format',
      data: {
        firstName: "Test",
        lastName: "User",
        email: "invalid@test",
        password: "SecurePassword123!",
        mobileNumber: "+447123456789",
        dateOfBirth: "01/01/1990",
        gender: "Male",
        citizenship: "GB",
        emailPreferences: {
          systemAnnouncements: true,
          newsAndFeatureUpdates: true,
          promotionsAndSpecialOffers: true
        }
      },
      expectedResult: 'VALIDATION_ERROR'
    }
  ];
  
  testCases.forEach(testCase => {
    console.log(`\nTesting: ${testCase.name}`);
    console.log('Data:', JSON.stringify(testCase.data, null, 2));
    console.log(`Expected result: ${testCase.expectedResult}`);
    // AppState.register() would be called here
  });
};

// Test email confirmation
const testEmailConfirmation = () => {
  console.log('=== Testing Email Confirmation ===');
  
  const confirmationTests = [
    {
      name: 'Valid Confirmation Code',
      data: {
        email: 'test@example.com',
        confirmationCode: '123456'
      },
      expectedResult: 'SUCCESS'
    },
    {
      name: 'Invalid Confirmation Code',
      data: {
        email: 'test@example.com',
        confirmationCode: 'invalid'
      },
      expectedResult: 'INVALID_CODE'
    }
  ];
  
  confirmationTests.forEach(test => {
    console.log(`\nTesting: ${test.name}`);
    console.log('Data:', JSON.stringify(test.data, null, 2));
    console.log(`Expected result: ${test.expectedResult}`);
    // AppState.confirmRegistration() would be called here
  });
};

// Export test functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testValidation,
    testRegistrationAPI,
    testEmailConfirmation
  };
} else {
  // Browser environment
  window.registrationTests = {
    testValidation,
    testRegistrationAPI,
    testEmailConfirmation
  };
}

console.log('Registration test functions loaded. Call:');
console.log('- testValidation()');
console.log('- testRegistrationAPI()');  
console.log('- testEmailConfirmation()');
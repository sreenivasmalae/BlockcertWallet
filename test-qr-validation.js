/**
 * Simple test for QR validation logic
 * Run this in Node.js to test the validation function
 */

// Extracted validation function for testing
const validateQRData = (data) => {
  // Check if it has either introductionURL or proofValue
  const hasIntroductionURL = data.introductionURL && typeof data.introductionURL === 'string';
  const hasProofValue = data.proofValue !== undefined;

  if (!hasIntroductionURL && !hasProofValue) {
    return {
      isValid: false,
      errorMessage: 'Invalid QR code: Must contain either introductionURL or proofValue'
    };
  }

  // If introductionURL is present, validate it has at most one parameter
  if (hasIntroductionURL) {
    try {
      const url = new URL(data.introductionURL);
      const paramCount = Array.from(url.searchParams.keys()).length;
      
      if (paramCount > 1) {
        return {
          isValid: false,
          errorMessage: 'Invalid QR code: introductionURL must have at most one parameter'
        };
      }
    } catch (urlError) {
      return {
        isValid: false,
        errorMessage: 'Invalid QR code: introductionURL is not a valid URL'
      };
    }
  }

  return { isValid: true };
};

// Test cases
const testCases = [
  {
    name: "Valid issuer with no parameters",
    data: {
      name: "University One",
      introductionURL: "https://example.com/verify",
      publicKey: "ecdsa-koblitz-pubkey:0x123..."
    },
    expected: true
  },
  {
    name: "Valid issuer with one parameter",
    data: {
      name: "University One",
      introductionURL: "https://example.com/verify?version=1",
      publicKey: "ecdsa-koblitz-pubkey:0x123..."
    },
    expected: true
  },
  {
    name: "Valid credential with proofValue",
    data: {
      proofValue: "some_proof_value",
      issuer: "...",
      credentialSubject: "..."
    },
    expected: true
  },
  {
    name: "Invalid - missing both introductionURL and proofValue",
    data: {
      name: "University One",
      publicKey: "ecdsa-koblitz-pubkey:0x123..."
    },
    expected: false
  },
  {
    name: "Invalid - introductionURL with too many parameters",
    data: {
      name: "University One",
      introductionURL: "https://example.com/verify?param1=value1&param2=value2",
      publicKey: "ecdsa-koblitz-pubkey:0x123..."
    },
    expected: false
  },
  {
    name: "Invalid - malformed introductionURL",
    data: {
      name: "University One",
      introductionURL: "not-a-valid-url",
      publicKey: "ecdsa-koblitz-pubkey:0x123..."
    },
    expected: false
  }
];

// Run tests
console.log("🧪 Testing QR Validation Logic\n");

testCases.forEach((testCase, index) => {
  const result = validateQRData(testCase.data);
  const passed = result.isValid === testCase.expected;
  
  console.log(`${index + 1}. ${testCase.name}`);
  console.log(`   Expected: ${testCase.expected ? 'Valid' : 'Invalid'}`);
  console.log(`   Result: ${result.isValid ? 'Valid' : 'Invalid'}`);
  if (!result.isValid) {
    console.log(`   Error: ${result.errorMessage}`);
  }
  console.log(`   Status: ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
});

console.log("🎯 Test Summary:");
const passedTests = testCases.filter((testCase, index) => {
  const result = validateQRData(testCase.data);
  return result.isValid === testCase.expected;
});

console.log(`   Passed: ${passedTests.length}/${testCases.length}`);
console.log(`   Success Rate: ${Math.round((passedTests.length / testCases.length) * 100)}%`);

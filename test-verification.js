/**
 * Blockcerts Verification Test Script
 * 
 * This script demonstrates the correct usage of @blockcerts/cert-verifier-js
 * and can be used to test certificate verification outside of the React Native app.
 */

const { Certificate } = require('@blockcerts/cert-verifier-js');

async function testCertificateVerification(certificateJson) {
  try {
    console.log('=== Blockcerts Verification Test ===');
    console.log('Initializing certificate...');
    
    // Parse certificate if it's a string
    const jsonData = typeof certificateJson === 'string' 
      ? JSON.parse(certificateJson) 
      : certificateJson;
    
    // Create and initialize certificate
    const certificate = new Certificate(jsonData);
    await certificate.init();
    
    console.log('Certificate initialized successfully');
    console.log('Format valid:', certificate.isFormatValid);
    console.log('Certificate name:', certificate.name);
    console.log('Issuer:', certificate.issuer?.name || 'Unknown');
    console.log('Recipient:', certificate.recipientFullName);
    console.log('Issued on:', certificate.issuedOn);
    
    if (!certificate.isFormatValid) {
      throw new Error('Invalid Blockcerts certificate format');
    }
    
    console.log('\n=== Starting Verification Process ===');
    
    // Track verification steps
    const verificationSteps = [];
    let currentStep = 0;
    
    // Verify with callback
    const verificationResult = await certificate.verify(({code, label, status, errorMessage}) => {
      const stepInfo = {
        step: currentStep++,
        code,
        label,
        status,
        errorMessage,
        timestamp: new Date().toISOString()
      };
      
      verificationSteps.push(stepInfo);
      
      console.log(`Step ${stepInfo.step}: [${status.toUpperCase()}] ${code} - ${label || code}`);
      if (errorMessage) {
        console.log(`  Error: ${errorMessage}`);
      }
      
      // Small delay to simulate UI updates
      return new Promise(resolve => setTimeout(resolve, 100));
    });
    
    console.log('\n=== Verification Complete ===');
    console.log('Final Status:', verificationResult.status);
    console.log('Message:', verificationResult.message);
    
    if (verificationResult.status === 'failure') {
      console.log('❌ Certificate verification FAILED');
    } else {
      console.log('✅ Certificate verification SUCCEEDED');
    }
    
    console.log('\n=== Verification Steps Summary ===');
    verificationSteps.forEach((step, index) => {
      const icon = step.status === 'success' ? '✅' : step.status === 'failure' ? '❌' : '⏳';
      console.log(`${icon} Step ${index}: ${step.code} (${step.status})`);
    });
    
    return {
      success: verificationResult.status === 'success',
      result: verificationResult,
      steps: verificationSteps,
      certificate: {
        name: certificate.name,
        isFormatValid: certificate.isFormatValid,
        issuer: certificate.issuer,
        recipient: certificate.recipientFullName,
        issuedOn: certificate.issuedOn
      }
    };
    
  } catch (error) {
    console.error('\n❌ Verification Error:', error.message);
    console.error('Stack:', error.stack);
    
    return {
      success: false,
      error: error.message,
      steps: []
    };
  }
}

// Example usage with a sample certificate
async function runTest() {
  // You can replace this with actual certificate JSON
  const sampleCertificate = {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://www.blockcerts.org/schema/3.0/context.json"
    ],
    "type": ["VerifiableCredential", "BlockcertsCredential"],
    "issuer": "https://www.example.org/issuer",
    "issuanceDate": "2023-01-01T00:00:00Z",
    // Add your actual certificate data here
  };
  
  // Uncomment to test with sample certificate
  // const result = await testCertificateVerification(sampleCertificate);
  // console.log('\nTest completed:', result.success ? 'PASSED' : 'FAILED');
}

// Export for use in other files
module.exports = {
  testCertificateVerification,
  runTest
};

// Run test if script is executed directly
if (require.main === module) {
  runTest().catch(console.error);
}

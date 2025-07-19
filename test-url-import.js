#!/usr/bin/env node
/**
 * Test script to debug URL import functionality
 * Run this with: node test-url-import.js [URL]
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

async function testUrlImport(testUrl) {
  console.log('Testing URL import for:', testUrl);
  
  try {
    // Validate URL format
    try {
      const parsedUrl = new URL(testUrl);
      console.log('✓ URL is valid:', parsedUrl.href);
      console.log('  Protocol:', parsedUrl.protocol);
      console.log('  Host:', parsedUrl.host);
      console.log('  Path:', parsedUrl.pathname);
    } catch (urlError) {
      throw new Error('Invalid URL format: ' + urlError.message);
    }
    
    // Test fetch with timeout
    console.log('\nTesting fetch...');
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'BlockcertsWallet/1.0',
      },
    });
    
    console.log('✓ Response received:');
    console.log('  Status:', response.status, response.statusText);
    console.log('  Headers:');
    for (const [key, value] of response.headers) {
      console.log(`    ${key}: ${value}`);
    }
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    // Read response content
    const content = await response.text();
    console.log('✓ Content received:', content.length, 'bytes');
    console.log('  First 200 chars:', content.substring(0, 200) + '...');
    
    // Try to parse as JSON
    try {
      const jsonData = JSON.parse(content);
      console.log('✓ JSON parsed successfully');
      console.log('  Top-level keys:', Object.keys(jsonData));
      
      // Check for required fields
      if (jsonData.proof) {
        console.log('✓ Proof field found');
      } else {
        console.log('⚠️  No proof field found');
      }
      
      if (jsonData.issuer) {
        console.log('✓ Issuer field found:', 
          typeof jsonData.issuer === 'string' ? jsonData.issuer : jsonData.issuer.id || jsonData.issuer.name);
      } else {
        console.log('⚠️  No issuer field found');
      }
      
      if (jsonData.credentialSubject) {
        console.log('✓ CredentialSubject field found');
      } else {
        console.log('⚠️  No credentialSubject field found');
      }
      
    } catch (parseError) {
      console.log('❌ JSON parse error:', parseError.message);
      throw new Error('Content is not valid JSON');
    }
    
    console.log('\n✅ URL import test passed!');
    
  } catch (error) {
    console.error('\n❌ URL import test failed:', error.message);
    
    // Categorize error
    if (error.name === 'AbortError') {
      console.log('  Category: Network timeout');
    } else if (error.message.includes('HTTP')) {
      console.log('  Category: HTTP error');
    } else if (error.message.includes('Invalid URL')) {
      console.log('  Category: URL format error');
    } else if (error.message.includes('JSON')) {
      console.log('  Category: JSON parse error');
    } else if (error.message.includes('network') || error.message.includes('ENOTFOUND')) {
      console.log('  Category: Network/DNS error');
    } else {
      console.log('  Category: Unknown error');
    }
    
    return false;
  }
  
  return true;
}

// Test with provided URL or default test URLs
const testUrl = process.argv[2] || 'https://www.blockcerts.org/samples/2.0/2017-05-01/json/2017-05-01-mit-diploma.json';

console.log('Blockcerts URL Import Test');
console.log('========================\n');

testUrlImport(testUrl).then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});

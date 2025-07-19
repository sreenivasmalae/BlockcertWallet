#!/usr/bin/env node

// Simple test script to validate our base64 validation logic
// This can be run directly with Node.js

const TEST_VALID_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const TEST_CORRUPTED_BASE64 = 'uZf{/f{ݙYHLZYHM[H˝˛ܙ̌ݙȏXYHLZYHM[HٙOHYLMK]YHHςXHLOHLYHLZYH[H͘';
const TEST_INVALID_CHARS = 'ABC123!@#$%^&*()_+-=[]{}|;:,.<>?';

// Base64 validation function (copied from our PdfUtils)
function isValidBase64(str) {
  try {
    // Check if the string matches base64 pattern
    const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Pattern.test(str)) {
      return false;
    }
    
    // Additional check: try to decode (Node.js version)
    const decoded = Buffer.from(str, 'base64').toString('binary');
    return decoded.length > 0;
  } catch (error) {
    return false;
  }
}

// Check for non-ASCII characters
function hasNonAsciiCharacters(str) {
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    if (charCode > 127) {
      return true;
    }
  }
  return false;
}

// SVG generation test
function generateSvgFallback(pdfUrl) {
  const filename = pdfUrl.split('/').pop() || 'document.pdf';
  const pdfInfo = filename.replace('.pdf', '').replace(/_/g, ' ');
  
  const svgContent = `
    <svg width="200" height="150" viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#ff6b6b;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#4ecdc4;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="200" height="150" fill="url(#grad1)" rx="10" ry="10"/>
      <rect x="20" y="20" width="160" height="110" fill="white" rx="5" ry="5" opacity="0.9"/>
      <text x="100" y="50" text-anchor="middle" font-family="Arial" font-size="14" font-weight="bold" fill="#333">📄 PDF</text>
      <text x="100" y="70" text-anchor="middle" font-family="Arial" font-size="10" fill="#666">Certificate</text>
      <text x="100" y="90" text-anchor="middle" font-family="Arial" font-size="8" fill="#999">${pdfInfo}</text>
      <text x="100" y="110" text-anchor="middle" font-family="Arial" font-size="8" fill="#999">Tap to view</text>
    </svg>
  `;
  
  return Buffer.from(svgContent).toString('base64');
}

console.log('🧪 Testing Base64 Validation Logic\n');

// Test 1: Valid base64
console.log('Test 1: Valid base64');
console.log('Input:', TEST_VALID_BASE64.substring(0, 50) + '...');
console.log('Valid base64 pattern:', /^[A-Za-z0-9+/]*={0,2}$/.test(TEST_VALID_BASE64));
console.log('Has non-ASCII chars:', hasNonAsciiCharacters(TEST_VALID_BASE64));
console.log('Overall valid:', isValidBase64(TEST_VALID_BASE64));
console.log();

// Test 2: Corrupted base64 (user's issue)
console.log('Test 2: Corrupted base64 (user reported issue)');
console.log('Input:', TEST_CORRUPTED_BASE64);
console.log('Valid base64 pattern:', /^[A-Za-z0-9+/]*={0,2}$/.test(TEST_CORRUPTED_BASE64));
console.log('Has non-ASCII chars:', hasNonAsciiCharacters(TEST_CORRUPTED_BASE64));
console.log('Overall valid:', isValidBase64(TEST_CORRUPTED_BASE64));
console.log();

// Test 3: Invalid characters
console.log('Test 3: Invalid characters');
console.log('Input:', TEST_INVALID_CHARS);
console.log('Valid base64 pattern:', /^[A-Za-z0-9+/]*={0,2}$/.test(TEST_INVALID_CHARS));
console.log('Has non-ASCII chars:', hasNonAsciiCharacters(TEST_INVALID_CHARS));
console.log('Overall valid:', isValidBase64(TEST_INVALID_CHARS));
console.log();

// Test 4: SVG fallback generation
console.log('Test 4: SVG fallback generation');
const testPdfUrl = 'https://example.com/my_certificate.pdf';
const svgBase64 = generateSvgFallback(testPdfUrl);
console.log('Generated SVG base64 length:', svgBase64.length);
console.log('Generated SVG base64 valid:', isValidBase64(svgBase64));
console.log('SVG preview:', svgBase64.substring(0, 100) + '...');
console.log();

// Test 5: Character code analysis
console.log('Test 5: Character code analysis of corrupted data');
const corruptedChars = TEST_CORRUPTED_BASE64.split('').map(char => ({
  char,
  code: char.charCodeAt(0),
  isAscii: char.charCodeAt(0) <= 127
}));
console.log('First 10 characters analysis:');
corruptedChars.slice(0, 10).forEach((item, index) => {
  console.log(`${index + 1}. '${item.char}' (code: ${item.code}) - ${item.isAscii ? 'ASCII' : 'NON-ASCII'}`);
});

console.log('\n✅ Test complete! This validates our base64 corruption detection logic.');

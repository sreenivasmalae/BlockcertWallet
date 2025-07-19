#!/usr/bin/env node

// Simple test script to verify PDF URL handling logic
const testUrl = 'https://arweave.net/hnF0_tz4ekiiRDlJkXDqbFrbNNpqb6BeCU5ZqyF_bbs';

console.log('Testing PDF URL handling logic...');
console.log('Test URL:', testUrl);
console.log('');

// Test Arweave detection
const isArweave = testUrl.includes('arweave.net') || testUrl.includes('arweave.dev') || 
                  testUrl.includes('ar-io.dev') || testUrl.includes('g8way.io');

console.log('Arweave detection:', isArweave);

if (isArweave) {
  console.log('✓ Would use WebView fallback mode');
  console.log('✓ PDF.js viewer URL:', `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(testUrl)}`);
} else {
  console.log('✓ Would use native PDF viewer');
}

console.log('');
console.log('Open in browser URL:', testUrl);

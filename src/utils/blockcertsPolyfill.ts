/**
 * Polyfills for Blockcerts cert-verifier-js library in React Native
 * 
 * The library expects browser APIs that are not available in React Native.
 * This file provides minimal polyfills to make the library work.
 */

// Create location object
const locationObject = {
  host: 'localhost',
  hostname: 'localhost',
  href: 'https://localhost',
  origin: 'https://localhost',
  pathname: '/',
  port: '',
  protocol: 'https:',
  search: '',
  hash: ''
};

// Create document object (comprehensive)
const documentObject = {
  createElement: (tagName: string) => ({
    tagName,
    style: {},
    setAttribute: () => {},
    getAttribute: () => null,
    removeAttribute: () => {},
    appendChild: () => {},
    removeChild: () => {},
    innerHTML: '',
    textContent: '',
    addEventListener: () => {},
    removeEventListener: () => {},
  }),
  getElementById: (id: string) => {
    console.log(`document.getElementById called with id: ${id}`);
    return null; // Return null as if element not found
  },
  getElementsByTagName: (_tagName: string) => [],
  getElementsByClassName: (_className: string) => [],
  querySelector: (_selector: string) => null,
  querySelectorAll: (_selector: string) => [],
  createTextNode: (text: string) => ({ textContent: text }),
  documentElement: {
    style: {},
    appendChild: () => {},
    removeChild: () => {}
  },
  head: {
    appendChild: () => {},
    removeChild: () => {}
  },
  body: {
    appendChild: () => {},
    removeChild: () => {}
  },
  addEventListener: () => {},
  removeEventListener: () => {},
  cookie: ''
};

// Create navigator object
const navigatorObject = {
  userAgent: 'React Native',
  platform: 'React Native'
};

// Apply polyfills to global object and its possible aliases
const globalRefs = [global, (global as any).global, (global as any).globalThis];

// Add window reference if it exists
if (typeof (global as any).window !== 'undefined') {
  globalRefs.push((global as any).window);
}

// Apply polyfills to all global references
globalRefs.forEach(globalRef => {
  if (globalRef && typeof globalRef === 'object') {
    // Polyfill location
    if (!globalRef.location) {
      globalRef.location = locationObject;
    }
    
    // Polyfill document
    if (!globalRef.document) {
      globalRef.document = documentObject;
    }
    
    // Polyfill navigator
    if (!globalRef.navigator) {
      globalRef.navigator = navigatorObject;
    }
  }
});

// Ensure window points to global
if (typeof (global as any).window === 'undefined') {
  (global as any).window = global;
}

// Also apply to window if it was just created
if ((global as any).window && typeof (global as any).window === 'object') {
  if (!(global as any).window.location) {
    (global as any).window.location = locationObject;
  }
  if (!(global as any).window.document) {
    (global as any).window.document = documentObject;
  }
  if (!(global as any).window.navigator) {
    (global as any).window.navigator = navigatorObject;
  }
}

// Handle potential bundler global variable references
// Some bundlers might create variables like global$1, global$2, etc.
const globalVariableNames = ['global', 'global$1', 'global$2', 'global$3'];
globalVariableNames.forEach(varName => {
  if (typeof (global as any)[varName] === 'object' && (global as any)[varName]) {
    const globalVar = (global as any)[varName];
    if (!globalVar.location) {
      globalVar.location = locationObject;
    }
    if (!globalVar.document) {
      globalVar.document = documentObject;
    }
    if (!globalVar.navigator) {
      globalVar.navigator = navigatorObject;
    }
  }
});

// Ensure XMLHttpRequest is available
if (typeof (global as any).XMLHttpRequest === 'undefined') {
  try {
    // React Native should have XMLHttpRequest available globally
    if (typeof XMLHttpRequest !== 'undefined') {
      (global as any).XMLHttpRequest = XMLHttpRequest;
    } else {
      console.warn('XMLHttpRequest not available in React Native environment');
    }
  } catch (error) {
    console.warn('Error setting up XMLHttpRequest polyfill:', error);
  }
}

// Polyfill fetch if needed (React Native should have this)
if (typeof (global as any).fetch === 'undefined') {
  try {
    if (typeof fetch !== 'undefined') {
      (global as any).fetch = fetch;
    }
  } catch (error) {
    console.warn('Error setting up fetch polyfill:', error);
  }
}

// Additional safety: Set up a proxy to catch any undefined property access
try {
  const handler = {
    get: function(target: any, prop: string) {
      if (prop === 'location' && !target[prop]) {
        return locationObject;
      }
      if (prop === 'document' && !target[prop]) {
        return documentObject;
      }
      if (prop === 'navigator' && !target[prop]) {
        return navigatorObject;
      }
      return target[prop];
    }
  };
  
  // Only apply proxy if it's supported
  if (typeof Proxy !== 'undefined') {
    Object.setPrototypeOf(global, new Proxy(Object.getPrototypeOf(global) || {}, handler));
  }
} catch (error) {
  // Proxy approach failed, continue with direct assignment
  console.warn('Proxy polyfill approach failed:', error);
}

console.log('Blockcerts polyfills initialized for React Native');
console.log('Available globals:', {
  location: !!(global as any).location,
  document: !!(global as any).document,
  navigator: !!(global as any).navigator,
  XMLHttpRequest: !!(global as any).XMLHttpRequest,
  fetch: !!(global as any).fetch
});

export {}; // Make this a module

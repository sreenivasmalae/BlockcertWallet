/**
 * Pre-load polyfill to handle bundler global variable references
 * This must be loaded very early, before any bundled code executes
 */

// Create a comprehensive location object
const locationObj = {
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

// Create document object
const documentObj = {
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
const navigatorObj = {
  userAgent: 'React Native',
  platform: 'React Native'
};

// Helper function to apply polyfills to an object
const applyPolyfills = (obj: any) => {
  if (!obj || typeof obj !== 'object') return;
  
  if (!obj.location) obj.location = locationObj;
  if (!obj.document) obj.document = documentObj;
  if (!obj.navigator) obj.navigator = navigatorObj;
};

// Apply to the main global object
applyPolyfills(global);

// Apply to window if it exists or create it
if (!(global as any).window) {
  (global as any).window = global;
}
applyPolyfills((global as any).window);

// Apply to globalThis if available
if (typeof globalThis !== 'undefined') {
  applyPolyfills(globalThis);
}

// Override global property getters to ensure location is always available
const createGlobalProxy = (targetObj: any) => {
  return new Proxy(targetObj, {
    get(target, prop) {
      const value = target[prop];
      
      // If someone accesses a global$ variable, ensure it has our polyfills
      if (typeof prop === 'string' && prop.startsWith('global') && value && typeof value === 'object') {
        applyPolyfills(value);
      }
      
      return value;
    },
    
    set(target, prop, value) {
      // If someone sets a global$ variable, apply polyfills to it
      if (typeof prop === 'string' && prop.startsWith('global') && value && typeof value === 'object') {
        applyPolyfills(value);
      }
      
      target[prop] = value;
      return true;
    }
  });
};

// Apply proxy if Proxy is available
if (typeof Proxy !== 'undefined') {
  try {
    // We can't replace global itself, but we can intercept access to its properties
    createGlobalProxy(global);
    
    // Replace common global references with our proxied version
    ['global', 'window', 'globalThis'].forEach(name => {
      if ((global as any)[name]) {
        (global as any)[name] = createGlobalProxy((global as any)[name]);
      }
    });
    
  } catch (error) {
    console.warn('Could not apply Proxy polyfill:', error);
  }
}

// Set up a periodic check to ensure global variables have our polyfills
const periodicCheck = () => {
  // Check for numbered global variables
  for (let i = 1; i <= 10; i++) {
    const varName = `global$${i}`;
    if ((global as any)[varName] && typeof (global as any)[varName] === 'object') {
      applyPolyfills((global as any)[varName]);
    }
  }
  
  // Also check common global patterns
  ['global', 'window', 'globalThis'].forEach(name => {
    if ((global as any)[name]) {
      applyPolyfills((global as any)[name]);
    }
  });
};

// Run the check immediately and set up a timer
periodicCheck();

// Set up a timer to run the check periodically (every 100ms for first 5 seconds)
let checkCount = 0;
const maxChecks = 50; // 5 seconds worth of checks
const checkInterval = setInterval(() => {
  periodicCheck();
  checkCount++;
  
  if (checkCount >= maxChecks) {
    clearInterval(checkInterval);
  }
}, 100);

console.log('Pre-load polyfill initialized with Proxy and periodic checks');

export {};

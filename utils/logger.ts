/**
 * Logger utility - All logs disabled for security
 */

const isDevelopment = false; // Force disable all logs

export const logger = {
  log: (...args: any[]) => {
    // Disabled
  },
  
  error: (...args: any[]) => {
    // Disabled
  },
  
  warn: (...args: any[]) => {
    // Disabled
  },
  
  info: (...args: any[]) => {
    // Disabled
  },
};

// Suppress all console logs globally
console.log = () => {};
console.error = () => {};
console.warn = () => {};
console.info = () => {};
console.debug = () => {};


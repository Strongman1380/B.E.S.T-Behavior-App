/**
 * Format phone number for display
 * @param {string} phoneNumber - Raw phone number
 * @returns {string} Formatted phone number
 */
export const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return '';
  
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Handle different country codes
  if (cleaned.startsWith('1') && cleaned.length === 11) {
    // US/Canada number
    const match = cleaned.match(/^1(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `+1 (${match[1]}) ${match[2]}-${match[3]}`;
    }
  } else if (cleaned.length === 10) {
    // US number without country code
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `+1 (${match[1]}) ${match[2]}-${match[3]}`;
    }
  }
  
  // For other international numbers, just add + if not present
  return phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
};

/**
 * Validate phone number format
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean} Whether the phone number is valid
 */
export const isValidPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return false;
  
  // Basic validation - should start with + and have at least 10 digits
  const cleaned = phoneNumber.replace(/\D/g, '');
  return phoneNumber.startsWith('+') && cleaned.length >= 10 && cleaned.length <= 15;
};

/**
 * Format phone number input as user types
 * @param {string} value - Current input value
 * @returns {string} Formatted value
 */
export const formatPhoneInput = (value) => {
  // Remove all non-digit characters except +
  let cleaned = value.replace(/[^\d+]/g, '');
  
  // Ensure it starts with +
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  
  // Limit length
  if (cleaned.length > 16) {
    cleaned = cleaned.slice(0, 16);
  }
  
  return cleaned;
};
// Placeholder Supabase storage implementation
// This file exists for compatibility but is not actively used in the current configuration

export const SupabaseStorage = {
  // Placeholder methods to prevent import errors
  initialize: () => Promise.resolve(false),
  isAvailable: () => false,
  getStorageType: () => 'unavailable'
};

export default SupabaseStorage;
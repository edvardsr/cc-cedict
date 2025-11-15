import Cedict from '@/cedict.js';

// Create a single instance of Cedict
const cedictInstance = new Cedict();

// Freeze the instance to ensure immutability
Object.freeze(cedictInstance);

// Export the frozen singleton instance
export default cedictInstance;

// Re-export types for convenience
export type {
  SearchConfig,
  DictionaryEntry,
  VariantReference,
  Classifier,
  SearchResults,
  SearchResultsObject,
  SearchResultsArray,
} from '@/types.js';


/**
 * Type definitions for CC-CEDICT data files
 * 
 * These files are generated during the postinstall script from the CC-CEDICT dictionary.
 */

/**
 * Optimized raw dictionary entry tuple
 * [traditional, simplified, pinyin, meanings (string or string[]), variant_of indices, classifier indices]
 */
type RawDictionaryEntry = [
  string,
  string,
  string,
  string | string[], // Optimized: string for single meaning, array for multiple
  number[],          // Optimized: indices into variantLookup table
  number[]           // Optimized: indices into classifierLookup table
];

/**
 * Character index: Maps characters to pinyin, then pinyin to [[baseIndices], [variantIndices]]
 */
type CharIndexType = Record<string, Record<string, [number[], number[]]>>;

/**
 * Optimized data structure with lookup tables
 */
interface AllDataStructure {
  /** All dictionary entries as a flat array */
  all: RawDictionaryEntry[];
  /** Lookup table for variant references */
  variantLookup: Array<[string, string, string]>;
  /** Lookup table for classifiers */
  classifierLookup: Array<[string, string, string]>;
}

/**
 * All dictionary entries with lookup tables
 */
declare module '../data/all.js' {
  const allData: AllDataStructure;
  export default allData;
}

/**
 * Traditional Chinese index structure
 */
declare module '../data/traditional.js' {
  const traditionalData: CharIndexType;
  export default traditionalData;
}

/**
 * Simplified Chinese index structure
 */
declare module '../data/simplified.js' {
  const simplifiedData: CharIndexType;
  export default simplifiedData;
}


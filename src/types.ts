/**
 * Configuration options for dictionary searches
 */
export interface SearchConfig {
  /**
   * Whether pinyin search is case-sensitive
   * @default true
   */
  caseSensitiveSearch?: boolean;

  /**
   * Merge pinyin cases in results by converting them to lowercase
   * @default false
   */
  mergeCases?: boolean;

  /**
   * Return results as an object (pinyin -> definitions) instead of an array
   * @default true
   */
  asObject?: boolean;

  /**
   * Include word variants in the results
   * @default true
   */
  allowVariants?: boolean;
}

/**
 * Represents a reference to a variant word
 */
export interface VariantReference {
  traditional: string;
  simplified: string;
  pinyin: string;
}

/**
 * Classifier tuple: [traditional, simplified, pinyin]
 */
export type Classifier = [string, string, string];

/**
 * Dictionary entry for a Chinese word
 */
export interface DictionaryEntry {
  /** Traditional Chinese characters */
  traditional: string;

  /** Simplified Chinese characters */
  simplified: string;

  /** Pinyin with tone numbers */
  pinyin: string;

  /** English definitions */
  english: string[];

  /** Measure word classifiers */
  classifiers: Classifier[];

  /** References to words this is a variant of */
  variant_of: VariantReference[];

  /** Whether this entry is a variant of another word */
  is_variant: boolean;
}

/**
 * Search results grouped by pinyin
 */
export type SearchResultsObject = Record<string, DictionaryEntry[]>;

/**
 * Search results as a flat array
 */
export type SearchResultsArray = DictionaryEntry[];

/**
 * Possible return types for search operations
 */
export type SearchResults = SearchResultsObject | SearchResultsArray | null;

/**
 * Raw dictionary entry tuple from parsed data
 * This is the internal storage format in the all.js data file
 * Optimized: variant_of and classifiers now store indices instead of full data
 * meanings can be string (single) or string[] (multiple) for memory efficiency
 */
export type RawEntry = [
  string,           // [0] traditional
  string,           // [1] simplified
  string,           // [2] pinyin
  string | string[], // [3] meanings (string for single, array for multiple)
  number[],         // [4] variant_of indices (points to variant lookup table)
  number[]          // [5] classifier indices (points to classifier lookup table)
];

/**
 * Index entry structure: [baseEntryIndices, variantEntryIndices]
 * - baseEntryIndices: Array of indices pointing to main entries in the 'all' array
 * - variantEntryIndices: Array of indices pointing to variant entries in the 'all' array
 * Note: Stored as regular arrays in data files, converted to Uint32Array at runtime for memory efficiency
 */
export type IndexEntry = [number[], number[]];

/**
 * Runtime index entry with typed arrays for memory efficiency
 */
export type RuntimeIndexEntry = [Uint32Array, Uint32Array];

/**
 * Pinyin index: Maps pinyin strings to their index entries
 * Example: { "ni3 hao3": [[0, 5], [10, 15]] }
 */
export type PinyinIndex = Record<string, IndexEntry>;

/**
 * Runtime pinyin index with typed arrays
 */
export type RuntimePinyinIndex = Record<string, RuntimeIndexEntry>;

/**
 * Character index: Maps Chinese characters to their pinyin indices
 * Example: { "你好": { "ni3 hao3": [[0], [5]] } }
 */
export type CharacterIndex = Record<string, PinyinIndex>;

/**
 * Runtime character index with typed arrays
 */
export type RuntimeCharacterIndex = Record<string, RuntimePinyinIndex>;

/**
 * Internal data structure for dictionary storage (runtime with typed arrays)
 */
export interface DictionaryData {
  /** All dictionary entries as a flat array */
  all: RawEntry[];
  /** Traditional Chinese character index (runtime uses Uint32Array) */
  traditional: RuntimeCharacterIndex;
  /** Simplified Chinese character index (runtime uses Uint32Array) */
  simplified: RuntimeCharacterIndex;
  /** Lookup table for variant references (traditional, simplified, pinyin tuples) */
  variantLookup: Array<[string, string, string]>;
  /** Lookup table for classifiers (traditional, simplified, pinyin tuples) */
  classifierLookup: Array<[string, string, string]>;
}

/**
 * Internal structure for tracking results during processing
 */
export interface ProcessedResults {
  /** Maps pinyin to array of entry indices */
  resultsMap: Record<string, number[]>;
  /** Maps entry index to whether it's a variant */
  variantMap: Record<number, boolean>;
}

/**
 * Parsed meanings structure from build script
 */
export interface ParsedMeanings {
  meanings: string[];
  variant_of: VariantTuple[];
  classifiers: VariantTuple[];
}

/**
 * Variant tuple: [simplified/traditional, traditional, pinyin]
 * Used during parsing before conversion to VariantReference
 */
export type VariantTuple = [string, string, string | null];

/**
 * Line parsing result from build script
 */
export type ParsedLine = [
  string,           // traditional
  string,           // simplified
  string,           // pinyin
  string[],         // meanings
  VariantTuple[],   // variant_of (raw tuples)
  VariantTuple[]    // classifiers (raw tuples)
] | null;

/**
 * Optimized entry used in build output (after lookup table conversion)
 */
export type OptimizedEntry = [
  string,             // traditional
  string,             // simplified
  string,             // pinyin
  string | string[],  // meanings (optimized: string for single, array for multiple)
  number[],           // variant_of indices
  number[]            // classifier indices
];


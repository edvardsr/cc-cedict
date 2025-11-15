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
 */
export type RawEntry = [
  string,             // [0] traditional
  string,             // [1] simplified
  string,             // [2] pinyin
  string[],           // [3] meanings
  VariantReference[], // [4] variant_of
  Classifier[]        // [5] classifiers
];

/**
 * Index entry structure: [baseEntryIndices, variantEntryIndices]
 * - baseEntryIndices: Array of indices pointing to main entries in the 'all' array
 * - variantEntryIndices: Array of indices pointing to variant entries in the 'all' array
 */
export type IndexEntry = [number[], number[]];

/**
 * Pinyin index: Maps pinyin strings to their index entries
 * Example: { "ni3 hao3": [[0, 5], [10, 15]] }
 */
export type PinyinIndex = Record<string, IndexEntry>;

/**
 * Character index: Maps Chinese characters to their pinyin indices
 * Example: { "你好": { "ni3 hao3": [[0], [5]] } }
 */
export type CharacterIndex = Record<string, PinyinIndex>;

/**
 * Internal data structure for dictionary storage
 */
export interface DictionaryData {
  /** All dictionary entries as a flat array */
  all: RawEntry[];
  /** Traditional Chinese character index */
  traditional: CharacterIndex;
  /** Simplified Chinese character index */
  simplified: CharacterIndex;
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


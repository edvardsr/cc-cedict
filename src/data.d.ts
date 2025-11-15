/**
 * Type definitions for CC-CEDICT data files
 * 
 * These files are generated during the postinstall script from the CC-CEDICT dictionary.
 */

/**
 * Raw dictionary entry tuple: [traditional, simplified, pinyin, meanings[], variant_of[], classifiers[]]
 */
type RawDictionaryEntry = [
  string,
  string,
  string,
  string[],
  Array<{ traditional: string; simplified: string; pinyin: string }>,
  Array<[string, string, string]>
];

/**
 * Character index: Maps characters to pinyin, then pinyin to [[baseIndices], [variantIndices]]
 */
type CharIndexType = Record<string, Record<string, [number[], number[]]>>;

/**
 * All dictionary entries as a flat array
 */
declare module '../data/all.js' {
  const allData: RawDictionaryEntry[];
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


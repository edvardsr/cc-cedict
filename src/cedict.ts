/// <reference path="./data.d.ts" />

// @ts-expect-error - Generated data files, types defined in data.d.ts
import allData from '../data/all.js';
// @ts-expect-error - Generated data files, types defined in data.d.ts
import traditionalData from '../data/traditional.js';
// @ts-expect-error - Generated data files, types defined in data.d.ts
import simplifiedData from '../data/simplified.js';
import type {
  SearchConfig,
  DictionaryEntry,
  SearchResults,
  SearchResultsObject,
  SearchResultsArray,
  DictionaryData,
  RawEntry,
  VariantReference,
  Classifier,
  RuntimePinyinIndex,
  RuntimeCharacterIndex,
  ProcessedResults,
  RuntimeIndexEntry,
} from '@/types.js';

export default class Cedict {
  private static instance: Cedict;
  public readonly data!: DictionaryData;
  public readonly defaultConfig!: Required<SearchConfig>;

  /**
   * Convert index arrays to Uint32Array for better memory efficiency
   * Optimized: Typed arrays use less memory and provide faster access
   */
  private convertToTypedArrays(index: any): RuntimeCharacterIndex {
    const converted: RuntimeCharacterIndex = {};
    for (const [char, pinyinIndex] of Object.entries(index)) {
      converted[char] = {};
      for (const [pinyin, indexEntry] of Object.entries(pinyinIndex as Record<string, [number[], number[]]>)) {
        const [baseIndices, variantIndices] = indexEntry;
        converted[char][pinyin] = [
          new Uint32Array(baseIndices),
          new Uint32Array(variantIndices)
        ];
      }
    }
    return converted;
  }

  constructor() {
    if (Cedict.instance) {
      return Cedict.instance;
    }

    // Initialize properties
    // Optimized: allData now contains the complete data structure with lookup tables
    const traditional = allData.traditional || traditionalData;
    const simplified = allData.simplified || simplifiedData;

    (this as { data: DictionaryData }).data = {
      all: allData.all || allData, // Backwards compatibility
      // Optimized: Convert to Uint32Array for better memory efficiency
      traditional: this.convertToTypedArrays(traditional),
      simplified: this.convertToTypedArrays(simplified),
      variantLookup: allData.variantLookup || [],
      classifierLookup: allData.classifierLookup || [],
    };

    (this as { defaultConfig: Required<SearchConfig> }).defaultConfig = {
      caseSensitiveSearch: true,
      mergeCases: false,
      asObject: true,
      allowVariants: true,
    };

    Cedict.instance = this;
  }

  /**
   * Expand a raw data value into a detailed object.
   * Optimized: Handles new data structure with lookup tables and string/array meanings
   */
  expandValue(val: RawEntry, isVariant: boolean): DictionaryEntry {
    // Optimized: meanings can be string (single) or array (multiple)
    const english = typeof val[3] === 'string' ? [val[3]] : val[3];
    
    // Optimized: Convert variant indices to full references using lookup table
    const variantOf: VariantReference[] = val[4]?.map((idx: number) => {
      const lookup = this.data.variantLookup[idx];
      return {
        traditional: lookup[0],
        simplified: lookup[1],
        pinyin: lookup[2],
      };
    }) || [];

    // Optimized: Convert classifier indices to full tuples using lookup table
    const classifiers: Classifier[] = val[5]?.map((idx: number) => {
      const lookup = this.data.classifierLookup[idx];
      return [lookup[0], lookup[1], lookup[2]];
    }) || [];

    return {
      traditional: val[0],
      simplified: val[1],
      pinyin: val[2],
      english,
      classifiers,
      variant_of: variantOf,
      is_variant: isVariant,
    };
  }

  /**
   * Filter and sort results based on the provided criteria.
   * Optimized: Removed redundant array spreading, uses Uint32Array for better performance
   */
  processResults(
    wordSource: RuntimePinyinIndex,
    keysToCheck: string[],
    allowVariants: boolean,
    mergeCases: boolean
  ): ProcessedResults {
    const resultsMap: Record<string, number[]> = {};
    const variantMap: Record<number, boolean> = {};

    for (const key of keysToCheck) {
      const indexEntry: RuntimeIndexEntry = wordSource[key];
      const [baseItems, variantItems] = indexEntry;
      
      // Optimized: Only create combined array when variants exist and are allowed
      const items = allowVariants && variantItems.length > 0
        ? [...baseItems, ...variantItems]
        : baseItems;

      // Optimized: Mark variants directly in map (Set would be better but keeping object for compatibility)
      if (variantItems.length > 0) {
        for (let i = 0; i < variantItems.length; i++) {
          variantMap[variantItems[i]] = true;
        }
      }

      const convertedKey = mergeCases ? key.toLowerCase() : key;
      resultsMap[convertedKey] ??= [];
      resultsMap[convertedKey].push(...items);
    }

    return { resultsMap, variantMap };
  }

  /**
   * Organize and return search results.
   * Optimized: Single-pass iteration, lazy expansion, faster sorting
   */
  formatResults(
    resultsMap: Record<string, number[]>,
    variantMap: Record<number, boolean>,
    allowVariants: boolean,
    asObject: boolean,
    mergeCases: boolean
  ): SearchResultsObject | SearchResultsArray {
    const results: SearchResultsObject | SearchResultsArray = asObject ? {} : [];

    for (const [pinyinKey, indices] of Object.entries(resultsMap)) {
      // Optimized: Single-pass processing with deduplication map
      const itemMap: Record<string, DictionaryEntry> = {};
      
      for (let i = 0; i < indices.length; i++) {
        const idx = indices[i];
        const isVariant = variantMap[idx] ?? false;
        
        // Optimized: Skip variants early without expanding
        if (!allowVariants && isVariant) continue;
        
        // Optimized: Lazy expansion - only expand needed entries
        const item = this.expandValue(this.data.all[idx], isVariant);
        
        // Optimized: Normalize pinyin when merging cases
        if (mergeCases) {
          item.pinyin = item.pinyin.toLowerCase();
        }
        
        const dedupKey = `${item.traditional}_${item.pinyin}`;
        
        if (itemMap[dedupKey]) {
          // Merge english definitions
          itemMap[dedupKey].english = [...itemMap[dedupKey].english, ...item.english];
        } else {
          itemMap[dedupKey] = item;
        }
      }

      // Optimized: Convert to array and sort only once with faster comparison
      const itemsArray = Object.values(itemMap);
      if (itemsArray.length > 1) {
        // Optimized: Simple string comparison instead of localeCompare
        itemsArray.sort((a, b) => a.pinyin < b.pinyin ? -1 : a.pinyin > b.pinyin ? 1 : 0);
      }

      if (asObject) {
        (results as SearchResultsObject)[pinyinKey] = itemsArray;
      } else {
        (results as SearchResultsArray).push(...itemsArray);
      }
    }

    return results;
  }

  /**
   * Retrieve words by type (simplified or traditional).
   * Optimized: Better case-insensitive search, faster sorting
   */
  getByWord(
    isSimplified: boolean,
    word: string,
    pinyin: string | null = null,
    configOverrides: SearchConfig = {}
  ): SearchResults {
    const config = { ...this.defaultConfig, ...configOverrides };
    const { allowVariants, asObject, caseSensitiveSearch, mergeCases } = config;
    const dataSource = this.data[isSimplified ? 'simplified' : 'traditional'];
    const wordSource = dataSource[word];
    if (!wordSource) return null;

    // Optimized: Normalize pinyin once before filtering
    let keysToCheck: string[];
    if (pinyin) {
      if (caseSensitiveSearch) {
        // Fast path: direct check
        keysToCheck = wordSource[pinyin] ? [pinyin] : [];
      } else {
        // Optimized: Normalize search term once
        const normalizedPinyin = pinyin.toLowerCase();
        keysToCheck = Object.keys(wordSource).filter((key) => key.toLowerCase() === normalizedPinyin);
      }
    } else {
      keysToCheck = Object.keys(wordSource);
    }
    
    // Optimized: Simple string comparison instead of localeCompare
    if (keysToCheck.length > 1) {
      keysToCheck.sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
    }

    const { resultsMap, variantMap } = this.processResults(wordSource, keysToCheck, allowVariants, mergeCases);
    const formattedResults = this.formatResults(resultsMap, variantMap, allowVariants, asObject, mergeCases);

    return (Array.isArray(formattedResults) ? formattedResults.length : Object.keys(formattedResults).length)
      ? formattedResults
      : null;
  }

  /**
   * Shortcut to retrieve words by their simplified form.
   */
  getBySimplified(word: string, pinyin: string | null = null, configOverrides: SearchConfig = {}): SearchResults {
    return this.getByWord(true, word, pinyin, configOverrides);
  }

  /**
   * Shortcut to retrieve words by their traditional form.
   */
  getByTraditional(word: string, pinyin: string | null = null, configOverrides: SearchConfig = {}): SearchResults {
    return this.getByWord(false, word, pinyin, configOverrides);
  }
}


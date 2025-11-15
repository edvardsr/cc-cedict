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
  PinyinIndex,
  ProcessedResults,
  IndexEntry,
} from '@/types.js';

export default class Cedict {
  private static instance: Cedict;
  public readonly data!: DictionaryData;
  public readonly defaultConfig!: Required<SearchConfig>;

  constructor() {
    if (Cedict.instance) {
      return Cedict.instance;
    }

    // Initialize properties
    (this as { data: DictionaryData }).data = {
      all: allData,
      traditional: traditionalData,
      simplified: simplifiedData,
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
   */
  expandValue(val: RawEntry, isVariant: boolean): DictionaryEntry {
    // Convert variant tuples [trad, simp, pinyin] to objects
    const variantOf: VariantReference[] = val[4]?.map((variant: any) => ({
      traditional: variant[0] as string,
      simplified: variant[1] as string,
      pinyin: variant[2] as string,
    })) || [];

    return {
      traditional: val[0],
      simplified: val[1],
      pinyin: val[2],
      english: val[3],
      classifiers: val[5],
      variant_of: variantOf,
      is_variant: isVariant,
    };
  }

  /**
   * Filter and sort results based on the provided criteria.
   */
  processResults(
    wordSource: PinyinIndex,
    keysToCheck: string[],
    allowVariants: boolean,
    mergeCases: boolean
  ): ProcessedResults {
    const resultsMap: Record<string, number[]> = {};
    const variantMap: Record<number, boolean> = {};

    for (const key of keysToCheck) {
      const indexEntry: IndexEntry = wordSource[key];
      const [baseItems, variantItems] = indexEntry;
      const items = allowVariants ? [...baseItems, ...variantItems] : baseItems;

      variantItems.forEach((idx) => {
        variantMap[idx] = true;
      });

      const convertedKey = mergeCases ? key.toLowerCase() : key;
      resultsMap[convertedKey] ??= [];
      resultsMap[convertedKey].push(...items);
    }

    return { resultsMap, variantMap };
  }

  /**
   * Organize and return search results.
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
      const items = indices
        .map((idx) => this.expandValue(this.data.all[idx], variantMap[idx] ?? false))
        .filter((val) => (allowVariants ? true : val.is_variant === false))
        .sort((a, b) => a.pinyin.localeCompare(b.pinyin));

      const itemMap = items.reduce<Record<string, DictionaryEntry>>((acc, item) => {
        const key = `${item.traditional}_${mergeCases ? item.pinyin.toLowerCase() : item.pinyin}`;
        if (acc[key]) {
          acc[key].english = [...acc[key].english, ...item.english];
        } else {
          acc[key] = item;
        }
        return acc;
      }, {});

      if (asObject) {
        (results as SearchResultsObject)[pinyinKey] = Object.values(itemMap);
      } else {
        (results as SearchResultsArray).push(...Object.values(itemMap));
      }
    }

    return results;
  }

  /**
   * Retrieve words by type (simplified or traditional).
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

    const keysToCheck = pinyin
      ? Object.keys(wordSource).filter((key) =>
          caseSensitiveSearch ? key === pinyin : key.toLowerCase() === pinyin.toLowerCase()
        )
      : Object.keys(wordSource);
    keysToCheck.sort((a, b) => a.localeCompare(b));

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


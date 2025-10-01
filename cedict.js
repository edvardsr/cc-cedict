import allData from './data/all.js';
import traditionalData from './data/traditional.js';
import simplifiedData from './data/simplified.js';

export default class Cedict {
    constructor() {
        if (Cedict.instance) {
            return Cedict.instance;
        }

        this.data = {
            all: allData,
            traditional: traditionalData,
            simplified: simplifiedData
        };
        this.defaultConfig = {
            caseSensitiveSearch: true,
            mergeCases: false,
            asObject: true,
            allowVariants: true
        }; // Default configuration

        Cedict.instance = this; // Singleton instance
    }

    /**
     * Expand a raw data value into a detailed object.
     * @param {array} val - The value to expand.
     * @param {boolean} isVariant - Whether the entry is a variant.
     * @returns {object} - Expanded value object.
     */
    expandValue(val, isVariant) {
        const variantOf = val[4]?.map((variant) => ({
            traditional: variant[0],
            simplified: variant[1],
            pinyin: variant[2],
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
     * @param {object} wordSource - Source data for the word.
     * @param {array} keysToCheck - Filtered keys based on pinyin and case-sensitivity.
     * @param {boolean} allowVariants - Whether to include variants in the results.
     * @param {boolean} mergeCases - Whether pinyin cases should be merged in results, with definitions from lowercase ones going first.
     * @returns {object} - Filtered and organized results.
     */
    processResults(wordSource, keysToCheck, allowVariants, mergeCases) {
        const resultsMap = {};
        const variantMap = {};

        for (const key of keysToCheck) {
            const [baseItems, variantItems] = wordSource[key];
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
     * @param {object} resultsMap - Filtered results mapped by pinyin.
     * @param {object} variantMap - Map of variant indices.
     * @param {boolean} allowVariants - Whether to include variants in the results.
     * @param {boolean} asObject - Whether to return results as an object.
     * @param {boolean} mergeCases - Whether pinyin cases should be merged in results, with definitions from lowercase ones going first.
     * @returns {object|array} - Processed results.
     */
    formatResults(resultsMap, variantMap, allowVariants, asObject, mergeCases) {
        const results = asObject ? {} : [];

        for (const [pinyinKey, indices] of Object.entries(resultsMap)) {
            const items = indices
                .map((idx) => this.expandValue(this.data.all[idx], variantMap[idx] ?? false))
                .filter((val) => allowVariants ? true : val.is_variant === false)
                .sort((a, b) => a.pinyin.localeCompare(b.pinyin));

            const itemMap = items.reduce((acc, item) => {
                const key = `${item.traditional}_${mergeCases ? item.pinyin.toLowerCase() : item.pinyin}`;
                if (acc[key]) {
                    acc[key].english = [...acc[key].english, ...item.english];
                } else {
                    acc[key] = item;
                }
                return acc;
            }, {});

            if (asObject) {
                results[pinyinKey] = Object.values(itemMap);
            } else {
                results.push(...Object.values(itemMap));
            }
        }

        return results;
    }

    /**
     * Retrieve words by type (simplified or traditional).
     * @param {boolean} isSimplified - Whether to use the simplified data source.
     * @param {string} word - The word to search for.
     * @param {string|null} [pinyin=null] - Optional pinyin to filter results.
     * @param {object} [configOverrides={}] - Configuration overrides
     * @returns {object|array|null} - Search results or null if not found.
     */
    getByWord(isSimplified, word, pinyin = null, configOverrides = {}) {
        const config = { ...this.defaultConfig, ...configOverrides }
        const { allowVariants, asObject, caseSensitiveSearch, mergeCases } = config;
        const dataSource = this.data[isSimplified ? 'simplified' : 'traditional'];
        const wordSource = dataSource[word];
        if (!wordSource) return null;

        const keysToCheck = pinyin
            ? Object.keys(wordSource).filter((key) =>
                caseSensitiveSearch ? key === pinyin : key.toLowerCase() === pinyin.toLowerCase()
            )
            : Object.keys(wordSource);
        keysToCheck.sort((a, b) => a.localeCompare(b))

        const { resultsMap, variantMap } = this.processResults(wordSource, keysToCheck, allowVariants, mergeCases);
        const formattedResults = this.formatResults(resultsMap, variantMap, allowVariants, asObject, mergeCases);

        return formattedResults.length || Object.keys(formattedResults).length ? formattedResults : null;
    }

    /**
     * Shortcut to retrieve words by their simplified form.
     * @param {string} word - The word to search for in simplified Chinese.
     * @param {string|null} [pinyin=null] - Optional pinyin to filter results.
     * @param {object} [configOverrides={}] - Configuration overrides
     * @returns {object|array|null} - Search results or null if not found.
     */
    getBySimplified(word, pinyin = null, configOverrides = {}) {
        return this.getByWord(true, word, pinyin, configOverrides);
    }

    /**
     * Shortcut to retrieve words by their traditional form.
     * @param {string} word - The word to search for in traditional Chinese.
     * @param {string|null} [pinyin=null] - Optional pinyin to filter results.
     * @param {object} [configOverrides={}] - Configuration overrides
     * @returns {object|array|null} - Search results or null if not found.
     */
    getByTraditional(word, pinyin = null, configOverrides = {}) {
        return this.getByWord(false, word, pinyin, configOverrides);
    }
}

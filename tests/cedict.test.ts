import { describe, it, expect } from 'vitest';
import cedict, { 
  type DictionaryEntry, 
  type SearchResultsObject, 
  type SearchResultsArray,
  type SearchResults 
} from '../src/index.js';

describe('Cedict', () => {
  describe('Basic Search', () => {
    it('should retrieve word by simplified Chinese (中国)', () => {
      const result = cedict.getBySimplified('中国') as SearchResultsObject;
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('Zhong1 guo2');
      
      const entry: DictionaryEntry = result['Zhong1 guo2'][0];
      expect(entry.traditional).toBe('中國');
      expect(entry.simplified).toBe('中国');
      expect(entry.pinyin).toBe('Zhong1 guo2');
      expect(entry.english).toContain('China');
      expect(entry.is_variant).toBe(false);
    });

    it('should retrieve word by traditional Chinese (中國)', () => {
      const result = cedict.getByTraditional('中國') as SearchResultsObject;
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('Zhong1 guo2');
      
      // Should return same data as simplified lookup
      const simplified = cedict.getBySimplified('中国') as SearchResultsObject;
      expect(Object.keys(result)).toEqual(Object.keys(simplified));
    });

    it('should return null for non-existent words', () => {
      const result = cedict.getBySimplified('这个词不存在的啦');
      expect(result).toBeNull();
    });

    it('should return results with correct structure', () => {
      const result = cedict.getBySimplified('中国') as SearchResultsObject;
      const entry: DictionaryEntry = result['Zhong1 guo2'][0];
      
      // Verify all required fields exist
      expect(entry).toHaveProperty('traditional');
      expect(entry).toHaveProperty('simplified');
      expect(entry).toHaveProperty('pinyin');
      expect(entry).toHaveProperty('english');
      expect(entry).toHaveProperty('classifiers');
      expect(entry).toHaveProperty('variant_of');
      expect(entry).toHaveProperty('is_variant');
      
      // Verify correct types
      expect(typeof entry.traditional).toBe('string');
      expect(typeof entry.simplified).toBe('string');
      expect(typeof entry.pinyin).toBe('string');
      expect(Array.isArray(entry.english)).toBe(true);
      expect(Array.isArray(entry.classifiers)).toBe(true);
      expect(Array.isArray(entry.variant_of)).toBe(true);
      expect(typeof entry.is_variant).toBe('boolean');
    });
  });

  describe('Pinyin Filtering', () => {
    it('should filter by exact pinyin (前邊 with qian2 bian5)', () => {
      const result = cedict.getByTraditional('前邊', 'qian2 bian5') as SearchResultsObject;
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('qian2 bian5');
      
      const entries: DictionaryEntry[] = result['qian2 bian5'];
      const mainEntry = entries.find(e => e.traditional === '前邊');
      expect(mainEntry).toBeDefined();
      expect(mainEntry!.english).toContain('front');
    });

    it('should filter case-insensitively when caseSensitiveSearch=false', () => {
      const result = cedict.getByTraditional('前邊', 'QIAN2 bian5', { caseSensitiveSearch: false }) as SearchResultsObject;
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('qian2 bian5');
      
      // Should include both main entry and erhua variant
      const entries: DictionaryEntry[] = result['qian2 bian5'];
      expect(entries.length).toBeGreaterThan(1);
      
      const mainEntry = entries.find(e => e.traditional === '前邊');
      const erhuaEntry = entries.find(e => e.traditional === '前邊兒');
      expect(mainEntry).toBeDefined();
      expect(erhuaEntry).toBeDefined();
      expect(erhuaEntry!.is_variant).toBe(true);
    });

    it('should distinguish between case-sensitive pinyin (zhang1 vs Zhang1)', () => {
      const lowerResult = cedict.getBySimplified('张', 'zhang1');
      const upperResult = cedict.getBySimplified('张', 'Zhang1');
      
      expect(lowerResult).toHaveProperty('zhang1');
      expect(lowerResult).not.toHaveProperty('Zhang1');
      
      expect(upperResult).toHaveProperty('Zhang1');
      expect(upperResult).not.toHaveProperty('zhang1');
    });

    it('should return null when pinyin does not match', () => {
      const result = cedict.getBySimplified('中国', 'nonexistent1');
      expect(result).toBeNull();
    });
  });

  describe('Config: mergeCases', () => {
    it('should keep separate entries for different cases by default (張)', () => {
      const result = cedict.getByTraditional('張');
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('zhang1');
      expect(result).toHaveProperty('Zhang1');
      
      // Should have different definitions
      const lowerCase = result!['zhang1'];
      const upperCase = result!['Zhang1'];
      expect(lowerCase).not.toEqual(upperCase);
    });

    it('should merge cases when mergeCases=true (張)', () => {
      const result = cedict.getByTraditional('張', null, { mergeCases: true });
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('zhang1');
      expect(result).not.toHaveProperty('Zhang1');
      
      // Should have merged surname and common word meanings
      const entries = result!['zhang1'];
      const allEnglish = entries.flatMap((e: any) => e.english);
      expect(allEnglish.some((e: string) => e.includes('surname'))).toBe(true);
      expect(allEnglish.some((e: string) => e.includes('open up') || e.includes('spread'))).toBe(true);
    });
  });

  describe('Config: asObject', () => {
    it('should return results as object by default', () => {
      const result = cedict.getBySimplified('中国');
      expect(result).not.toBeNull();
      expect(typeof result).toBe('object');
      expect(Array.isArray(result)).toBe(false);
      expect(result).toHaveProperty('Zhong1 guo2');
    });

    it('should return array when asObject=false (只)', () => {
      const result = cedict.getBySimplified('只', null, { asObject: false }) as SearchResultsArray;
      expect(result).not.toBeNull();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      // Should have multiple entries with different pinyin
      const pinyinValues = result.map((e: DictionaryEntry) => e.pinyin);
      expect(new Set(pinyinValues).size).toBeGreaterThan(1);
    });
  });

  describe('Config: allowVariants', () => {
    it('should include variants by default (家具)', () => {
      const result = cedict.getBySimplified('家具') as SearchResultsObject;
      expect(result).not.toBeNull();
      
      const entries: DictionaryEntry[] = result['jia1 ju4'];
      expect(entries.length).toBeGreaterThan(1);
      
      // Should have main entry
      const mainEntry = entries.find(e => e.traditional === '家具' && e.is_variant === false);
      expect(mainEntry).toBeDefined();
      expect(mainEntry!.classifiers.length).toBe(2);
      
      // Should have variants (傢俱, 傢具, 家俱)
      const variantEntries = entries.filter(e => e.is_variant === true);
      expect(variantEntries.length).toBeGreaterThan(0);
      
      // Verify variant structure
      variantEntries.forEach((variant: DictionaryEntry) => {
        expect(variant.variant_of).toBeDefined();
        expect(variant.variant_of.length).toBeGreaterThan(0);
        expect(variant.variant_of[0].traditional).toBe('家具');
        expect(variant.variant_of[0].simplified).toBe('家具');
        expect(variant.variant_of[0].pinyin).toBe('jia1 ju4');
      });
    });

    it('should exclude variants when allowVariants=false (家具)', () => {
      const result = cedict.getBySimplified('家具', null, { allowVariants: false }) as SearchResultsObject;
      expect(result).not.toBeNull();
      
      const entries: DictionaryEntry[] = result['jia1 ju4'];
      expect(entries.length).toBe(1);
      expect(entries[0].traditional).toBe('家具');
      expect(entries[0].simplified).toBe('家具');
      expect(entries[0].english).toContain('furniture');
      expect(entries[0].is_variant).toBe(false);
      expect(entries[0].classifiers.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single character words (人)', () => {
      const result = cedict.getBySimplified('人');
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('ren2');
    });

    it('should handle multi-character words (中华人民共和国)', () => {
      const result = cedict.getBySimplified('中华人民共和国');
      expect(result).not.toBeNull();
    });

    it('should return null for empty string', () => {
      const result = cedict.getBySimplified('');
      expect(result).toBeNull();
    });

    it('should handle classifiers (家具)', () => {
      const result = cedict.getBySimplified('家具') as SearchResultsObject;
      const entries: DictionaryEntry[] = result['jia1 ju4'];
      const mainEntry = entries.find(e => e.is_variant === false);
      
      expect(mainEntry!.classifiers).toBeDefined();
      expect(Array.isArray(mainEntry!.classifiers)).toBe(true);
      expect(mainEntry!.classifiers.length).toBe(2);
      // Verify classifier structure [traditional, simplified, pinyin]
      expect(mainEntry!.classifiers[0]).toHaveLength(3);
    });
  });

  describe('Combined Configs', () => {
    it('should combine asObject=false and allowVariants=false (家具)', () => {
      const result = cedict.getBySimplified('家具', null, { 
        asObject: false, 
        allowVariants: false 
      }) as SearchResultsArray;
      
      expect(result).not.toBeNull();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
      expect(result[0].is_variant).toBe(false);
      expect(result[0].traditional).toBe('家具');
    });

    it('should combine mergeCases=true and asObject=false (張)', () => {
      const result = cedict.getBySimplified('张', null, { 
        mergeCases: true, 
        asObject: false 
      }) as SearchResultsArray;
      
      expect(result).not.toBeNull();
      expect(Array.isArray(result)).toBe(true);
      
      // All entries should have lowercase pinyin
      result.forEach((entry: DictionaryEntry) => {
        expect(entry.pinyin.toLowerCase()).toBe(entry.pinyin);
      });
    });
  });

  describe('Architecture', () => {
    it('should be a singleton instance', () => {
      const cedict1 = cedict;
      const cedict2 = cedict;
      expect(cedict1).toBe(cedict2);
    });

    it('should be immutable (frozen)', () => {
      expect(Object.isFrozen(cedict)).toBe(true);
    });

    it('should have loaded all data sources', () => {
      // @ts-ignore - accessing internal data for testing
      expect(cedict.data).toBeDefined();
      // @ts-ignore
      expect(cedict.data.all).toBeDefined();
      // @ts-ignore
      expect(cedict.data.traditional).toBeDefined();
      // @ts-ignore
      expect(cedict.data.simplified).toBeDefined();
      
      // @ts-ignore
      expect(Array.isArray(cedict.data.all)).toBe(true);
      // @ts-ignore
      expect(cedict.data.all.length).toBeGreaterThan(0);
    });
  });
});


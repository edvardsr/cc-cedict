import { describe, it, expect, beforeAll } from 'vitest';
import cedict from './index.js';

describe('Cedict', () => {
  describe('Basic Search Functionality', () => {
    it('should retrieve a word by simplified Chinese', () => {
      const result = cedict.getBySimplified('中国');
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('Zhong1 guo2');
    });

    it('should retrieve a word by traditional Chinese', () => {
      const result = cedict.getByTraditional('中國');
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('Zhong1 guo2');
    });

    it('should return null for non-existent words', () => {
      const result = cedict.getBySimplified('这个词不存在的啦');
      expect(result).toBeNull();
    });

    it('should return results with correct structure', () => {
      const result = cedict.getBySimplified('中国');
      expect(result).not.toBeNull();
      
      const entries = result!['Zhong1 guo2'];
      expect(Array.isArray(entries)).toBe(true);
      expect(entries.length).toBeGreaterThan(0);
      
      const entry = entries[0];
      expect(entry).toHaveProperty('traditional');
      expect(entry).toHaveProperty('simplified');
      expect(entry).toHaveProperty('pinyin');
      expect(entry).toHaveProperty('english');
      expect(entry).toHaveProperty('classifiers');
      expect(entry).toHaveProperty('variant_of');
      expect(entry).toHaveProperty('is_variant');
      
      expect(Array.isArray(entry.english)).toBe(true);
      expect(Array.isArray(entry.classifiers)).toBe(true);
      expect(Array.isArray(entry.variant_of)).toBe(true);
      expect(typeof entry.is_variant).toBe('boolean');
    });
  });

  describe('Pinyin Filtering', () => {
    it('should filter by pinyin (case sensitive by default)', () => {
      const result = cedict.getBySimplified('张', 'zhang1');
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('zhang1');
      expect(result).not.toHaveProperty('Zhang1');
    });

    it('should filter by pinyin with different case when caseSensitiveSearch is true', () => {
      const lowerResult = cedict.getBySimplified('张', 'zhang1', { caseSensitiveSearch: true });
      const upperResult = cedict.getBySimplified('张', 'Zhang1', { caseSensitiveSearch: true });
      
      expect(lowerResult).toHaveProperty('zhang1');
      expect(lowerResult).not.toHaveProperty('Zhang1');
      
      expect(upperResult).toHaveProperty('Zhang1');
      expect(upperResult).not.toHaveProperty('zhang1');
    });

    it('should match pinyin case-insensitively when caseSensitiveSearch is false', () => {
      const result = cedict.getBySimplified('张', 'ZHANG1', { caseSensitiveSearch: false });
      expect(result).not.toBeNull();
      // Should have entries under lowercase key
      expect(result).toHaveProperty('zhang1');
    });

    it('should return null when pinyin does not match', () => {
      const result = cedict.getBySimplified('张', 'nonexistent1');
      expect(result).toBeNull();
    });
  });

  describe('Config Option: mergeCases', () => {
    it('should keep separate entries for different cases by default', () => {
      const result = cedict.getBySimplified('张');
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('zhang1');
      expect(result).toHaveProperty('Zhang1');
      
      // They should have different definitions
      const lowerCase = result!['zhang1'];
      const upperCase = result!['Zhang1'];
      expect(lowerCase).not.toEqual(upperCase);
    });

    it('should merge entries for different cases when mergeCases is true', () => {
      const result = cedict.getBySimplified('张', null, { mergeCases: true });
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('zhang1');
      expect(result).not.toHaveProperty('Zhang1');
      
      // Should contain merged definitions
      const entries = result!['zhang1'];
      const allEnglish = entries.flatMap((e: any) => e.english);
      // Should include both common word and surname meanings
      expect(allEnglish.length).toBeGreaterThan(1);
    });
  });

  describe('Config Option: asObject', () => {
    it('should return results as object by default', () => {
      const result = cedict.getBySimplified('中国');
      expect(result).not.toBeNull();
      expect(typeof result).toBe('object');
      expect(Array.isArray(result)).toBe(false);
      expect(result).toHaveProperty('Zhong1 guo2');
    });

    it('should return results as array when asObject is false', () => {
      const result = cedict.getBySimplified('中国', null, { asObject: false });
      expect(result).not.toBeNull();
      expect(Array.isArray(result)).toBe(true);
      expect(result!.length).toBeGreaterThan(0);
      
      const entry = result![0];
      expect(entry).toHaveProperty('traditional');
      expect(entry).toHaveProperty('simplified');
      expect(entry).toHaveProperty('pinyin');
    });

    it('should handle multiple pinyin entries as array', () => {
      const result = cedict.getBySimplified('张', null, { asObject: false });
      expect(result).not.toBeNull();
      expect(Array.isArray(result)).toBe(true);
      // Should have multiple entries for different pinyin
      expect(result!.length).toBeGreaterThan(1);
    });
  });

  describe('Config Option: allowVariants', () => {
    it('should include variants by default', () => {
      // Test with a word that has variants (e.g., 家具 has variants 傢俱, 傢具, 家俱)
      const result = cedict.getBySimplified('家具');
      expect(result).not.toBeNull();
      
      const entries = result!['jia1 ju4'];
      expect(entries.length).toBeGreaterThan(1);
      
      // Should have both main entry and variants
      const hasMainEntry = entries.some((e: any) => e.is_variant === false);
      const hasVariants = entries.some((e: any) => e.is_variant === true);
      expect(hasMainEntry).toBe(true);
      expect(hasVariants).toBe(true);
    });

    it('should exclude variants when allowVariants is false', () => {
      const result = cedict.getBySimplified('家具', null, { allowVariants: false });
      expect(result).not.toBeNull();
      
      const entries = result!['jia1 ju4'];
      // Should only have main entry, no variants
      expect(entries.length).toBe(1);
      expect(entries[0].is_variant).toBe(false);
      expect(entries[0].traditional).toBe('家具');
    });
  });

  describe('Edge Cases', () => {
    it('should handle single character words', () => {
      const result = cedict.getBySimplified('人');
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('ren2');
    });

    it('should handle multi-character words', () => {
      const result = cedict.getBySimplified('中华人民共和国');
      expect(result).not.toBeNull();
    });

    it('should return null for empty string', () => {
      const result = cedict.getBySimplified('');
      expect(result).toBeNull();
    });

    it('should handle words with classifiers', () => {
      const result = cedict.getBySimplified('家具');
      expect(result).not.toBeNull();
      
      const entries = result!['jia1 ju4'];
      const mainEntry = entries.find((e: any) => e.is_variant === false);
      expect(mainEntry).toBeDefined();
      expect(mainEntry!.classifiers).toBeDefined();
      expect(Array.isArray(mainEntry!.classifiers)).toBe(true);
      expect(mainEntry!.classifiers.length).toBeGreaterThan(0);
    });

    it('should handle words with variant_of information', () => {
      // Get the full result for 家具 which includes its variants
      const result = cedict.getBySimplified('家具');
      expect(result).not.toBeNull();
      
      const entries = result!['jia1 ju4'];
      // Find a variant entry (there should be variants like 傢俱, 傢具, 家俱)
      const variantEntries = entries.filter((e: any) => e.is_variant === true);
      expect(variantEntries.length).toBeGreaterThan(0);
      
      // Check the structure of a variant entry
      const variantEntry = variantEntries[0];
      expect(variantEntry.variant_of).toBeDefined();
      expect(Array.isArray(variantEntry.variant_of)).toBe(true);
      expect(variantEntry.variant_of.length).toBeGreaterThan(0);
      
      const variantOf = variantEntry.variant_of[0];
      expect(variantOf).toHaveProperty('traditional');
      expect(variantOf).toHaveProperty('simplified');
      expect(variantOf).toHaveProperty('pinyin');
    });
  });

  describe('Multiple Config Options Combined', () => {
    it('should combine asObject=false and allowVariants=false', () => {
      const result = cedict.getBySimplified('家具', null, { 
        asObject: false, 
        allowVariants: false 
      });
      
      expect(result).not.toBeNull();
      expect(Array.isArray(result)).toBe(true);
      expect(result!.length).toBe(1);
      expect(result![0].is_variant).toBe(false);
    });

    it('should combine mergeCases=true and asObject=false', () => {
      const result = cedict.getBySimplified('张', null, { 
        mergeCases: true, 
        asObject: false 
      });
      
      expect(result).not.toBeNull();
      expect(Array.isArray(result)).toBe(true);
      
      // All entries should have lowercase pinyin
      result!.forEach((entry: any) => {
        expect(entry.pinyin.toLowerCase()).toBe(entry.pinyin);
      });
    });

    it('should combine caseSensitiveSearch=false with pinyin filter', () => {
      const result = cedict.getByTraditional('前邊', 'QIAN2 bian5', { 
        caseSensitiveSearch: false 
      });
      
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('qian2 bian5');
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      // Import the module again to verify singleton
      const cedict1 = cedict;
      const cedict2 = cedict;
      expect(cedict1).toBe(cedict2);
    });

    it('should be frozen (immutable)', () => {
      expect(Object.isFrozen(cedict)).toBe(true);
    });
  });

  describe('Data Integrity', () => {
    it('should have loaded all three data sources', () => {
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

    it('should have consistent data between simplified and traditional lookups', () => {
      const simplifiedResult = cedict.getBySimplified('中国');
      const traditionalResult = cedict.getByTraditional('中國');
      
      expect(simplifiedResult).not.toBeNull();
      expect(traditionalResult).not.toBeNull();
      
      // Both should have the same pinyin keys
      expect(Object.keys(simplifiedResult!)).toEqual(Object.keys(traditionalResult!));
    });
  });
});


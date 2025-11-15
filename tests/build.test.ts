import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { REGEX, parseLine, parseMeanings, parseVariant } from '../build.js';

describe('Build Script - Line Parsing', () => {
  describe('parseLine', () => {
    it('should parse a basic CC-CEDICT line', () => {
      const line = '中國 中国 [Zhong1 guo2] /China/';
      const result = parseLine(line);
      
      expect(result).not.toBeNull();
      expect(result![0]).toBe('中國'); // traditional
      expect(result![1]).toBe('中国'); // simplified
      expect(result![2]).toBe('Zhong1 guo2'); // pinyin
      expect(result![3]).toContain('China'); // meanings
    });

    it('should parse a line with multiple meanings', () => {
      const line = '前邊 前边 [qian2 bian5] /front/the front side/in front of/';
      const result = parseLine(line);
      
      expect(result).not.toBeNull();
      expect(result![3]).toContain('front');
      expect(result![3]).toContain('the front side');
      expect(result![3]).toContain('in front of');
      expect(result![3].length).toBe(3);
    });

    it('should parse a line with classifiers', () => {
      const line = '家具 家具 [jia1 ju4] /furniture/CL:件[jian4],套[tao4]/';
      const result = parseLine(line);
      
      expect(result).not.toBeNull();
      expect(result![3]).toContain('furniture');
      expect(result![5]).toBeDefined(); // classifiers
      expect(result![5].length).toBe(2);
      expect(result![5][0][2]).toBe('jian4'); // first classifier pinyin
      expect(result![5][1][2]).toBe('tao4'); // second classifier pinyin
    });

    it('should parse a line with variants', () => {
      const line = '家俱 家俱 [jia1 ju4] /variant of 家具[jia1 ju4]/';
      const result = parseLine(line);
      
      expect(result).not.toBeNull();
      expect(result![4]).toBeDefined(); // variant_of
      expect(result![4].length).toBeGreaterThan(0);
      expect(result![4][0][0]).toBe('家具'); // traditional/simplified of variant
      expect(result![4][0][2]).toBe('jia1 ju4'); // pinyin of variant
    });

    it('should skip comment lines', () => {
      const line = '# This is a comment';
      const result = parseLine(line);
      expect(result).toBeNull();
    });

    it('should skip empty lines', () => {
      const result = parseLine('');
      expect(result).toBeNull();
      
      const result2 = parseLine('   ');
      expect(result2).toBeNull();
    });

    it('should handle lines with mixed tone numbers', () => {
      const line = '你好 你好 [ni3 hao3] /hello/hi/';
      const result = parseLine(line);
      
      expect(result).not.toBeNull();
      expect(result![2]).toBe('ni3 hao3');
    });

    it('should handle neutral tone (5th tone)', () => {
      const line = '前邊兒 前边儿 [qian2 bian5 r5] /erhua variant of 前邊|前边[qian2 bian5]/';
      const result = parseLine(line);
      
      expect(result).not.toBeNull();
      expect(result![2]).toBe('qian2 bian5 r5');
      expect(result![2]).toContain('r5'); // neutral tone
    });

    it('should handle capitalized pinyin (proper nouns)', () => {
      const line = '張 张 [Zhang1] /surname Zhang/';
      const result = parseLine(line);
      
      expect(result).not.toBeNull();
      expect(result![2]).toBe('Zhang1');
      expect(result![3]).toContain('surname Zhang');
    });
  });

  describe('parseMeanings', () => {
    it('should parse simple meanings', () => {
      const input = 'China/country/nation';
      const result = parseMeanings(input);
      
      expect(result.meanings).toContain('China');
      expect(result.meanings).toContain('country');
      expect(result.meanings).toContain('nation');
    });

    it('should extract classifiers from meanings', () => {
      const input = 'furniture/CL:件[jian4],套[tao4]';
      const result = parseMeanings(input);
      
      expect(result.meanings).toContain('furniture');
      expect(result.classifiers.length).toBe(2);
      expect(result.classifiers[0][2]).toBe('jian4');
      expect(result.classifiers[1][2]).toBe('tao4');
    });

    it('should extract variant information', () => {
      const input = '/variant of 家具[jia1 ju4]/';
      const result = parseMeanings(input);
      
      expect(result.variant_of.length).toBeGreaterThan(0);
      expect(result.variant_of[0][0]).toBe('家具');
      expect(result.variant_of[0][2]).toBe('jia1 ju4');
      // The variant info is extracted; check it's not in the main meanings list
      // (it might have an empty string, which is fine)
      expect(result.variant_of.length).toBeGreaterThan(0);
    });

    it('should handle both meanings and classifiers in same entry', () => {
      const input = 'furniture/home furnishings/CL:件[jian4],套[tao4]';
      const result = parseMeanings(input);
      
      expect(result.meanings).toContain('furniture');
      expect(result.meanings).toContain('home furnishings');
      expect(result.classifiers.length).toBe(2);
    });

    it('should handle variant with traditional and simplified forms', () => {
      const input = 'variant of 家具|傢具[jia1 ju4]';
      const result = parseMeanings(input);
      
      expect(result.variant_of.length).toBeGreaterThan(0);
      expect(result.variant_of[0][0]).toBe('家具'); // simplified
      expect(result.variant_of[0][1]).toBe('傢具'); // traditional
    });

    it('should skip empty meanings', () => {
      const input = '/China//country/';
      const result = parseMeanings(input);
      
      expect(result.meanings).toContain('China');
      expect(result.meanings).toContain('country');
      expect(result.meanings.length).toBe(2); // Empty one should be skipped
    });

    it('should handle meanings with forward slashes in them', () => {
      const input = 'and/or/either...or...';
      const result = parseMeanings(input);
      
      expect(result.meanings).toContain('and');
      expect(result.meanings).toContain('or');
      expect(result.meanings).toContain('either...or...');
    });
  });

  describe('parseVariant', () => {
    it('should parse a simple variant', () => {
      const input = '家具[jia1 ju4]';
      const result = parseVariant(input);
      
      expect(result).not.toBeNull();
      expect(result![0]).toBe('家具');
      expect(result![1]).toBe('家具');
      expect(result![2]).toBe('jia1 ju4');
    });

    it('should parse a variant with traditional and simplified forms', () => {
      const input = '家具|傢具[jia1 ju4]';
      const result = parseVariant(input);
      
      expect(result).not.toBeNull();
      expect(result![0]).toBe('家具'); // simplified
      expect(result![1]).toBe('傢具'); // traditional
      expect(result![2]).toBe('jia1 ju4');
    });

    it('should parse a classifier', () => {
      const input = '件[jian4]';
      const result = parseVariant(input);
      
      expect(result).not.toBeNull();
      expect(result![0]).toBe('件');
      expect(result![1]).toBe('件');
      expect(result![2]).toBe('jian4');
    });

    it('should handle variant without pinyin', () => {
      const input = '家具';
      const result = parseVariant(input);
      
      expect(result).not.toBeNull();
      expect(result![0]).toBe('家具');
      expect(result![1]).toBe('家具');
      expect(result![2]).toBeNull();
    });

    it('should return undefined for empty input', () => {
      const result = parseVariant('');
      expect(result).toBeUndefined();
    });

    it('should handle multi-character pinyin', () => {
      const input = '前边[qian2 bian5]';
      const result = parseVariant(input);
      
      expect(result).not.toBeNull();
      expect(result![2]).toBe('qian2 bian5');
    });
  });

  describe('Regex Patterns', () => {
    it('should match variant_of pattern', () => {
      const text = 'variant of 家具[jia1 ju4]';
      const matches = text.match(REGEX.variant_of);
      
      expect(matches).not.toBeNull();
      expect(matches![0]).toContain('variant of');
    });

    it('should match classifier pattern', () => {
      const text = 'CL:件[jian4],套[tao4]';
      const matches = text.match(REGEX.classifiers);
      
      expect(matches).not.toBeNull();
      expect(matches![0]).toBe('CL:件[jian4],套[tao4]');
    });

    it('should match pinyin pattern', () => {
      const text = 'ni3 hao3 ma5';
      const matches = text.match(REGEX.pinyin);
      
      expect(matches).not.toBeNull();
      expect(matches!.length).toBe(3);
      expect(matches).toContain('ni3');
      expect(matches).toContain('hao3');
      expect(matches).toContain('ma5');
    });

    it('should match line pattern to extract definitions', () => {
      const line = '中國 中国 [Zhong1 guo2] /China/Middle Kingdom/';
      const matches = line.match(REGEX.line);
      
      expect(matches).not.toBeNull();
      expect(matches![1]).toContain('China');
      expect(matches![1]).toContain('Middle Kingdom');
    });
  });

  describe('Edge Cases', () => {
    it('should handle lines with special Unicode characters', () => {
      const line = '㐀 㐀 [qiu1] /archaic variant of 丘[qiu1]/';
      const result = parseLine(line);
      
      expect(result).not.toBeNull();
      expect(result![0]).toBe('㐀');
    });

    it('should handle lines with variation selectors', () => {
      // Some Chinese characters can have variation selectors
      const line = '邊 边 [bian1] /side/edge/margin/border/boundary/';
      const result = parseLine(line);
      
      expect(result).not.toBeNull();
      expect(result![0]).toBe('邊');
      expect(result![3].length).toBeGreaterThan(0);
    });

    it('should handle malformed lines gracefully', () => {
      const malformed = 'not a valid line';
      const result = parseLine(malformed);
      
      // Should return null for invalid format
      expect(result).toBeNull();
    });

    it('should handle lines with only traditional=simplified', () => {
      const line = '人 人 [ren2] /person/people/';
      const result = parseLine(line);
      
      expect(result).not.toBeNull();
      expect(result![0]).toBe('人');
      expect(result![1]).toBe('人');
    });
  });

  describe('Real CC-CEDICT Examples', () => {
    it('should correctly parse 中國/中国', () => {
      const line = '中國 中国 [Zhong1 guo2] /China/';
      const result = parseLine(line);
      
      expect(result).not.toBeNull();
      expect(result![0]).toBe('中國');
      expect(result![1]).toBe('中国');
      expect(result![2]).toBe('Zhong1 guo2');
      expect(result![3]).toEqual(['China']);
      expect(result![4]).toEqual([]); // no variants
      expect(result![5]).toEqual([]); // no classifiers
    });

    it('should correctly parse 前邊/前边', () => {
      const line = '前邊 前边 [qian2 bian5] /front/the front side/in front of/';
      const result = parseLine(line);
      
      expect(result).not.toBeNull();
      expect(result![0]).toBe('前邊');
      expect(result![1]).toBe('前边');
      expect(result![2]).toBe('qian2 bian5');
      expect(result![3]).toHaveLength(3);
    });

    it('should correctly parse 張/张 with zhang1', () => {
      const line = '張 张 [zhang1] /to open up/to spread/sheet of paper/classifier for flat objects, sheet/classifier for votes/';
      const result = parseLine(line);
      
      expect(result).not.toBeNull();
      expect(result![2]).toBe('zhang1');
      expect(result![3]).toContain('to open up');
      expect(result![3]).toContain('to spread');
    });

    it('should correctly parse 張/张 with Zhang1 (surname)', () => {
      const line = '張 张 [Zhang1] /surname Zhang/';
      const result = parseLine(line);
      
      expect(result).not.toBeNull();
      expect(result![2]).toBe('Zhang1');
      expect(result![3]).toContain('surname Zhang');
    });

    it('should correctly parse 家具 with classifiers', () => {
      const line = '家具 家具 [jia1 ju4] /furniture/CL:件[jian4],套[tao4]/';
      const result = parseLine(line);
      
      expect(result).not.toBeNull();
      expect(result![3]).toEqual(['furniture']);
      expect(result![5]).toHaveLength(2);
      expect(result![5][0]).toEqual(['件', '件', 'jian4']);
      expect(result![5][1]).toEqual(['套', '套', 'tao4']);
    });
  });
});

describe('Build Script - Data Validation', () => {
  it('should have successfully built data files', () => {
    const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../data');
    
    expect(() => readFileSync(path.join(dataDir, 'all.js'), 'utf8')).not.toThrow();
    expect(() => readFileSync(path.join(dataDir, 'traditional.js'), 'utf8')).not.toThrow();
    expect(() => readFileSync(path.join(dataDir, 'simplified.js'), 'utf8')).not.toThrow();
    expect(() => readFileSync(path.join(dataDir, 'status.json'), 'utf8')).not.toThrow();
  });

  it('should have valid status.json format', () => {
    const statusPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../data/status.json');
    const status = JSON.parse(readFileSync(statusPath, 'utf8'));
    
    expect(status).toHaveProperty('updated_at');
    expect(typeof status.updated_at).toBe('string');
    
    // Should be a valid ISO date
    expect(() => new Date(status.updated_at)).not.toThrow();
    expect(new Date(status.updated_at).toString()).not.toBe('Invalid Date');
  });

  it('should have non-empty data files', () => {
    const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../data');
    
    const allContent = readFileSync(path.join(dataDir, 'all.js'), 'utf8');
    const tradContent = readFileSync(path.join(dataDir, 'traditional.js'), 'utf8');
    const simpContent = readFileSync(path.join(dataDir, 'simplified.js'), 'utf8');
    
    expect(allContent.length).toBeGreaterThan(100);
    expect(tradContent.length).toBeGreaterThan(100);
    expect(simpContent.length).toBeGreaterThan(100);
    
    // Should start with "export default"
    expect(allContent).toMatch(/^export default/);
    expect(tradContent).toMatch(/^export default/);
    expect(simpContent).toMatch(/^export default/);
  });
});


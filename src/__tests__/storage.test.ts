import { describe, it, expect, beforeEach } from 'vitest';
import { safeParse, safeStringify, clearAll } from '../storage';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    clear: () => { store = {}; },
    removeItem: (key: string) => { delete store[key]; },
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('storage.ts', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('safeParse', () => {
    it('首次读取返回默认值', () => {
      const result = safeParse('nonExistent', [1, 2, 3]);
      expect(result).toEqual([1, 2, 3]);
    });

    it('读取 safeStringify 写入的数据', () => {
      const data = [{ id: 'step1', text: 'hello' }];
      safeStringify('testKey', data);
      const result = safeParse('testKey', []);
      expect(result).toEqual(data);
    });

    it('JSON 损坏时回退到默认值', () => {
      localStorage.setItem('broken', '{invalid json!!!');
      const result = safeParse('broken', 'fallback');
      expect(result).toBe('fallback');
    });

    it('兼容无版本包装的旧数据', () => {
      // 模拟旧版本直接保存的数据（没有 version 包装）
      localStorage.setItem('oldData', JSON.stringify([1, 2, 3]));
      const result = safeParse('oldData', []);
      expect(result).toEqual([1, 2, 3]);
    });

    it('版本不匹配时回退到默认值', () => {
      localStorage.setItem('versionMismatch', JSON.stringify({ version: 999, data: 'old' }));
      const result = safeParse('versionMismatch', 'default');
      expect(result).toBe('default');
    });
  });

  describe('safeStringify', () => {
    it('写入带版本号的包装数据', () => {
      safeStringify('testKey', { hello: 'world' });
      const stored = JSON.parse(localStorage.getItem('testKey')!);
      expect(stored.version).toBe(1);
      expect(stored.data).toEqual({ hello: 'world' });
    });
  });

  describe('clearAll', () => {
    it('清空所有 localStorage 数据', () => {
      safeStringify('key1', 'value1');
      safeStringify('key2', 'value2');
      clearAll();
      expect(localStorage.getItem('key1')).toBeNull();
      expect(localStorage.getItem('key2')).toBeNull();
    });
  });
});

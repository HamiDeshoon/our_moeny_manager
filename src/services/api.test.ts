import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSavedCustomApiKey, saveCustomApiKey } from './api';

describe('saveCustomApiKey & getSavedCustomApiKey', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('saveCustomApiKey', () => {
    it('saves custom API key to localStorage when non-empty string is provided', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      saveCustomApiKey('test-key-123');

      expect(setItemSpy).toHaveBeenCalledWith('duospend_gemini_key', 'test-key-123');
      expect(localStorage.getItem('duospend_gemini_key')).toBe('test-key-123');
    });

    it('removes custom API key from localStorage when empty string is provided', () => {
      localStorage.setItem('duospend_gemini_key', 'existing-key');
      const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem');

      saveCustomApiKey('');

      expect(removeItemSpy).toHaveBeenCalledWith('duospend_gemini_key');
      expect(localStorage.getItem('duospend_gemini_key')).toBeNull();
    });

    it('catches error and logs console.error if localStorage operations throw', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      expect(() => saveCustomApiKey('some-key')).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to save custom API key in localStorage:',
        expect.any(Error)
      );
    });
  });

  describe('getSavedCustomApiKey', () => {
    it('returns custom key from localStorage if set', () => {
      localStorage.setItem('duospend_gemini_key', 'my-saved-key');
      expect(getSavedCustomApiKey()).toBe('my-saved-key');
    });

    it('returns empty string or env key fallback if localStorage key is not set', () => {
      const savedKey = getSavedCustomApiKey();
      const expectedEnvKey = import.meta.env.VITE_GEMINI_API_KEY || '';
      expect(savedKey).toBe(expectedEnvKey);
    });

    it('handles localStorage errors gracefully in getSavedCustomApiKey', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError');
      });

      const expectedEnvKey = import.meta.env.VITE_GEMINI_API_KEY || '';
      expect(() => getSavedCustomApiKey()).not.toThrow();
      expect(getSavedCustomApiKey()).toBe(expectedEnvKey);
    });
  });
});

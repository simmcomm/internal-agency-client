import { describe, expect, it } from 'vitest';
import { createInMemoryFridStore } from '../src';

describe('Frid store', () => {
  describe('InMemoryFridStore', () => {

    it('should have functional get-set', () => {
      const fridStore = createInMemoryFridStore();
      fridStore.setFrid('test');
      const retrievedFrid = fridStore.getFrid();
      expect(retrievedFrid).toBe('test');
    });

    it('should not leak frid', () => {
      const fridStore1 = createInMemoryFridStore();
      fridStore1.setFrid('test');

      const fridStore2 = createInMemoryFridStore();
      const retrievedFrid = fridStore2.getFrid();
      expect(retrievedFrid).toBeUndefined();
    });

  });

});

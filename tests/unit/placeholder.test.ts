import { expect, test } from 'vitest';
import { VERSION } from '../../src/index.js';

test('placeholder check', () => {
  expect(VERSION).toBe('0.1.0');
});

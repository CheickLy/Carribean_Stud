import { describe, expect, it } from 'vitest';
import { app } from '../src/app.js';

describe('app scaffold', () => {
  it('exports an Express application', () => {
    expect(typeof app).toBe('function');
  });
});

import { describe, it, expect } from 'vitest';
import { matchPath } from './router';

describe('matchPath', () => {
  it('exact static routes', () => {
    expect(matchPath('/', '/')).toEqual({});
    expect(matchPath('/history', '/history')).toEqual({});
    expect(matchPath('/history', '/settings')).toBe(null);
  });

  it('extracts a single param', () => {
    expect(matchPath('/routines/:id', '/routines/42')).toEqual({ id: '42' });
    expect(matchPath('/history/:id', '/history/abc')).toEqual({ id: 'abc' });
  });

  it('rejects on segment-count mismatch', () => {
    expect(matchPath('/routines/:id', '/routines')).toBe(null);
    expect(matchPath('/routines/:id', '/routines/1/extra')).toBe(null);
    expect(matchPath('/workout', '/workout/5')).toBe(null);
  });

  it('multiple params + a static tail', () => {
    expect(matchPath('/a/:x/b/:y', '/a/1/b/2')).toEqual({ x: '1', y: '2' });
    expect(matchPath('/a/:x/b/:y', '/a/1/c/2')).toBe(null);
  });

  it('decodes URI-encoded param values', () => {
    expect(matchPath('/r/:name', '/r/leg%20day')).toEqual({ name: 'leg day' });
  });
});

import { describe, expect, it } from 'vitest';
import { DEMO, demoRing } from '../../src/lib/rings/demo';

describe('the one-time ring demo', () => {
  it('singles out design, engineering and automation in turn, then stops', () => {
    expect(demoRing(0)).toBe('design');
    expect(demoRing(DEMO.step - 0.01)).toBe('design');
    expect(demoRing(DEMO.step)).toBe('engineering');
    expect(demoRing(2 * DEMO.step + 0.5)).toBe('automation');
    expect(demoRing(3 * DEMO.step)).toBeNull();
    expect(demoRing(-1)).toBeNull();
  });

  it('waits for the reader to rest before it starts', () => {
    expect(DEMO.wait).toBeGreaterThanOrEqual(1);
  });
});

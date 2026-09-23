import { describe, expect, it } from 'vitest';
import { formatOffset, formatTime, msUntilNextMinute } from '../../src/lib/time';

describe('formatTime', () => {
  it('shows Sarajevo winter time (UTC+1) as 24h', () => {
    expect(formatTime(new Date('2026-01-15T16:59:30Z'), 'en')).toBe('17:59');
  });

  it('shows Sarajevo summer time (UTC+2)', () => {
    expect(formatTime(new Date('2026-07-15T15:59:00Z'), 'en')).toBe('17:59');
  });

  it('pads hours for Bosnian', () => {
    expect(formatTime(new Date('2026-07-15T06:05:00Z'), 'bs')).toBe('08:05');
  });
});

describe('formatOffset', () => {
  it('is UTC+1 in winter', () => {
    expect(formatOffset(new Date('2026-01-15T12:00:00Z'))).toBe('UTC+1');
  });

  it('is UTC+2 in summer', () => {
    expect(formatOffset(new Date('2026-07-15T12:00:00Z'))).toBe('UTC+2');
  });
});

describe('msUntilNextMinute', () => {
  it('counts what is left of the current minute', () => {
    expect(msUntilNextMinute(new Date('2026-01-15T16:59:30.250Z'))).toBe(29_750);
  });

  it('returns a full minute on the boundary', () => {
    expect(msUntilNextMinute(new Date('2026-01-15T17:00:00.000Z'))).toBe(60_000);
  });
});

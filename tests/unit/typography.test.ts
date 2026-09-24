import { describe, expect, it } from 'vitest';
import { noWidow, widowTail } from '../../src/lib/typography';

const NBSP = '\u00a0';

describe('noWidow', () => {
  it('joins the last two words with a no-break space', () => {
    expect(noWidow('Start a project')).toBe(`Start a${NBSP}project`);
    expect(noWidow('Take one away and the other two come apart.')).toBe(`Take one away and the other two come${NBSP}apart.`);
  });

  it('leaves one- and two-word texts alone, where a lone word is unavoidable', () => {
    expect(noWidow('Services')).toBe('Services');
    expect(noWidow('Započnimo projekat')).toBe('Započnimo projekat');
  });

  it('ignores trailing whitespace and keeps the rest of the spacing', () => {
    expect(noWidow('B2B ordering portal  ')).toBe(`B2B ordering${NBSP}portal`);
    expect(noWidow('a  b c')).toBe(`a  b${NBSP}c`);
  });
});

describe('widowTail', () => {
  it('splits off the last two words, to be kept on one line', () => {
    expect(widowTail('Before you hire us')).toEqual(['Before you ', 'hire us']);
    expect(widowTail('Start a project')).toEqual(['Start ', 'a project']);
  });

  it('holds only the last word of a two-word text, which may not fit one line', () => {
    expect(widowTail('Selected work')).toEqual(['Selected ', 'work']);
    expect(widowTail('Services')).toEqual(['', 'Services']);
  });
});

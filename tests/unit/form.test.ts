import { describe, expect, it } from 'vitest';
import { buildMailto, toPayload, validateContact, type ContactValues } from '../../src/lib/form';

const messages = { required: 'REQ', email: 'EMAIL', messageShort: 'SHORT' };
const valid: ContactValues = {
  name: 'Ana',
  email: 'ana@firma.ba',
  company: '',
  message: 'Treba nam portal za narudžbe.',
  needs: ['Website'],
};

describe('validateContact', () => {
  it('accepts a complete inquiry', () => {
    expect(validateContact(valid, messages)).toEqual({});
  });

  it('requires name, email and message', () => {
    expect(validateContact({ ...valid, name: '  ', email: '', message: '' }, messages)).toEqual({
      name: 'REQ',
      email: 'REQ',
      message: 'REQ',
    });
  });

  it('rejects a malformed email', () => {
    expect(validateContact({ ...valid, email: 'ana@firma' }, messages)).toEqual({ email: 'EMAIL' });
  });

  it('asks for at least ten characters of message', () => {
    expect(validateContact({ ...valid, message: 'Hi there' }, messages)).toEqual({ message: 'SHORT' });
  });
});

describe('buildMailto', () => {
  it('prefills subject and a signed body', () => {
    const body = 'Treba nam portal za narudžbe.\n\n— Ana · ana@firma.ba\n\nWebsite';
    expect(buildMailto('hello@x.com', 'New inquiry', valid)).toBe(
      `mailto:hello@x.com?subject=${encodeURIComponent('New inquiry')}&body=${encodeURIComponent(body)}`,
    );
  });
});

describe('toPayload', () => {
  it('trims fields, joins needs and keeps meta fields', () => {
    expect(toPayload({ ...valid, name: ' Ana ', needs: ['Website', 'App'] }, { access_key: 'k' })).toEqual({
      access_key: 'k',
      name: 'Ana',
      email: 'ana@firma.ba',
      company: '',
      message: 'Treba nam portal za narudžbe.',
      needs: 'Website, App',
    });
  });
});

export type FieldName = 'name' | 'email' | 'message';

export interface ContactValues {
  name: string;
  email: string;
  company: string;
  message: string;
  needs: string[];
}

export interface ValidationMessages {
  required: string;
  email: string;
  messageShort: string;
}

export type FieldErrors = Partial<Record<FieldName, string>>;

export const MIN_MESSAGE_LENGTH = 10;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateContact(values: ContactValues, messages: ValidationMessages): FieldErrors {
  const errors: FieldErrors = {};
  const name = values.name.trim();
  const email = values.email.trim();
  const message = values.message.trim();

  if (!name) errors.name = messages.required;
  if (!email) errors.email = messages.required;
  else if (!EMAIL.test(email)) errors.email = messages.email;
  if (!message) errors.message = messages.required;
  else if (message.length < MIN_MESSAGE_LENGTH) errors.message = messages.messageShort;

  return errors;
}

export function buildMailto(to: string, subject: string, values: ContactValues): string {
  const signature = [values.name, values.company, values.email]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' · ');
  const needs = values.needs.length > 0 ? `\n\n${values.needs.join(', ')}` : '';
  const body = `${values.message.trim()}\n\n— ${signature}${needs}`;
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function toPayload(values: ContactValues, meta: Record<string, string>): Record<string, string> {
  return {
    ...meta,
    name: values.name.trim(),
    email: values.email.trim(),
    company: values.company.trim(),
    message: values.message.trim(),
    needs: values.needs.join(', '),
  };
}

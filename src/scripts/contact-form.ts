import {
  buildMailto,
  toPayload,
  validateContact,
  type ContactValues,
  type FieldErrors,
  type FieldName,
} from '../lib/form';

const ENDPOINT = 'https://api.web3forms.com/submit';
const FIELDS: FieldName[] = ['name', 'email', 'message'];

type FormState = 'idle' | 'sending' | 'success' | 'error';

export function initContactForm(): void {
  const form = document.querySelector<HTMLFormElement>('form[data-contact-form]');
  if (!form) return;

  const d = form.dataset;
  const status = form.querySelector<HTMLElement>('[data-form-status]');
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const submitLabel = submit?.querySelector<HTMLElement>('.btn-label');
  const idleLabel = submitLabel?.textContent ?? '';
  const messages = { required: d.msgRequired ?? '', email: d.msgEmail ?? '', messageShort: d.msgShort ?? '' };
  let attempted = false;

  const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null;

  const read = (): ContactValues => {
    const data = new FormData(form);
    const str = (key: string) => String(data.get(key) ?? '');
    return {
      name: str('name'),
      email: str('email'),
      company: str('company'),
      message: str('message'),
      needs: data.getAll('needs').map(String),
    };
  };

  const showErrors = (errors: FieldErrors): void => {
    for (const name of FIELDS) {
      const message = errors[name];
      field(name)?.setAttribute('aria-invalid', message ? 'true' : 'false');
      const slot = form.querySelector<HTMLElement>(`[data-error-for="${name}"]`);
      if (slot) {
        slot.textContent = message ?? '';
        slot.hidden = !message;
      }
    }
  };

  const setState = (state: FormState): void => {
    form.dataset.state = state;
    if (submit) submit.disabled = state === 'sending';
    if (!submitLabel) return;
    if (state === 'sending') submitLabel.textContent = d.msgSending ?? idleLabel;
    else if (state === 'success') submitLabel.textContent = d.msgSent ?? idleLabel;
    else submitLabel.textContent = idleLabel;
  };

  const showStatus = (message: string, mailto?: string): void => {
    if (!status) return;
    status.replaceChildren(document.createTextNode(message));
    if (mailto) {
      const link = document.createElement('a');
      link.href = mailto;
      link.textContent = d.mailTo ?? '';
      status.append(' ', link);
    }
  };

  form.addEventListener('focusout', () => {
    if (attempted) showErrors(validateContact(read(), messages));
  });

  form.addEventListener('input', () => {
    if (form.dataset.state === 'success' || form.dataset.state === 'error') setState('idle');
    // After a failed attempt a message goes as soon as its field is fixed (new ones still wait for blur or submit).
    // Clearing on blur instead shifts the form under the pointer on its way to Send, and that click is lost.
    if (!attempted) return;
    const errors = validateContact(read(), messages);
    for (const name of FIELDS) {
      const slot = form.querySelector<HTMLElement>(`[data-error-for="${name}"]`);
      if (errors[name] || !slot || slot.hidden) continue;
      slot.hidden = true;
      slot.textContent = '';
      field(name)?.setAttribute('aria-invalid', 'false');
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    attempted = true;
    const values = read();
    const errors = validateContact(values, messages);
    showErrors(errors);
    const firstInvalid = FIELDS.find((name) => errors[name]);
    if (firstInvalid) {
      field(firstInvalid)?.focus();
      return;
    }
    if ((field('botcheck') as HTMLInputElement | null)?.checked) return;

    const subject = d.subject ?? '';
    const mailto = buildMailto(d.mailTo ?? '', subject, values);
    const key = field('access_key')?.value ?? '';
    if (!key) {
      if (import.meta.env.DEV) console.warn('PUBLIC_WEB3FORMS_KEY is not set — the contact form falls back to mailto:.');
      window.location.href = mailto;
      return;
    }

    setState('sending');
    showStatus('');
    try {
      const meta = { access_key: key, subject, from_name: d.fromName ?? '', locale: document.documentElement.lang };
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(toPayload(values, meta)),
      });
      const result = (await response.json()) as { success?: boolean };
      if (!response.ok || !result.success) throw new Error('Submission rejected');
      form.reset();
      attempted = false;
      showErrors({});
      setState('success');
      showStatus(d.msgSuccess ?? '');
    } catch {
      setState('error');
      showStatus(d.msgError ?? '', mailto);
    }
  });
}

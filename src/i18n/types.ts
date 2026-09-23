export type RingKey = 'design' | 'engineering' | 'automation';
export type MarkKey = 'take' | 'fall';
export type RichSegment = string | { text: string; ring: RingKey } | { text: string; mark: MarkKey };
export type RichText = readonly RichSegment[];

export interface ServiceItem {
  id: 'web' | 'apps' | 'systems';
  title: string;
  tagline: string;
  body: string;
  bring: string;
  includes: readonly string[];
}

export interface ProjectItem {
  id: 'portal' | 'shop';
  name: string;
  summary: string;
  client: string;
  scope: string;
  status: string;
  cta: string;
  cardLabel: string;
  cursor: string;
}

export interface Dictionary {
  meta: { title: string; description: string };
  a11y: {
    skip: string;
    mainNav: string;
    footerNav: string;
    menu: string;
    close: string;
    language: string;
    home: string;
    newTab: string;
  };
  nav: { work: string; services: string; process: string; studio: string };
  cta: { start: string };
  clockCity: string;
  hero: {
    studio: string;
    location: string;
    booking: string;
    title: string;
    lead: string;
    fig: string;
    caption: string;
    ringsAlt: string;
  };
  approach: {
    label: string;
    lead: RichText;
    body: string;
    fig: string;
    caption: string;
    diagramAlt: string;
    rings: Record<RingKey, string>;
  };
  services: {
    title: string;
    intro: string;
    bring: string;
    includes: string;
    items: readonly ServiceItem[];
    flow: { shop: string; inbox: string; accounting: string; warehouse: string; invoice: string };
  };
  work: {
    title: string;
    intro: string;
    client: string;
    scope: string;
    status: string;
    projects: readonly ProjectItem[];
    next: { title: string; body: string; start: string };
  };
  process: {
    title: string;
    intro: string;
    stage: string;
    out: string;
    axis: { kickoff: string; golive: string; ongoing: string };
    stages: ReadonlyArray<{ title: string; body: string; out: string }>;
    fig: string;
    captionBefore: string;
    pillAlt: string;
    captionAfter: string;
  };
  principles: {
    title: string;
    intro: string;
    photo: string;
    items: ReadonlyArray<{ lead: string; body: string }>;
  };
  contact: {
    label: string;
    title: string;
    lead: string;
    needs: { legend: string; web: string; app: string; sys: string; unsure: string };
    fields: {
      name: string;
      namePh: string;
      email: string;
      emailPh: string;
      company: string;
      companyPh: string;
      message: string;
      messagePh: string;
    };
    note: string;
    submit: string;
    sending: string;
    sent: string;
    success: string;
    error: string;
    subject: string;
    errors: { required: string; email: string; messageShort: string };
    info: { phone: string; studio: string; hours: string; call: string };
  };
}

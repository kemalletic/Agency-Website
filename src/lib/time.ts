export type ClockLocale = 'en' | 'bs';

const TIME_ZONE = 'Europe/Sarajevo';
const INTL_LOCALE: Record<ClockLocale, string> = { en: 'en-GB', bs: 'bs-BA' };

export function formatTime(date: Date, locale: ClockLocale): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    timeZone: TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function formatOffset(date: Date): string {
  const part = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, timeZoneName: 'shortOffset' })
    .formatToParts(date)
    .find((p) => p.type === 'timeZoneName');
  return part ? part.value.replace('GMT', 'UTC') : 'CET';
}

export function msUntilNextMinute(date: Date): number {
  return 60_000 - (date.getTime() % 60_000);
}

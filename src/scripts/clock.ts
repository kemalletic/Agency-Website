import { formatOffset, formatTime, msUntilNextMinute, type ClockLocale } from '../lib/time';

export function initClocks(): void {
  const clocks = Array.from(document.querySelectorAll<HTMLTimeElement>('time[data-clock]'));
  if (clocks.length === 0) return;

  const tick = (): void => {
    const now = new Date();
    for (const el of clocks) {
      const locale: ClockLocale = el.dataset.locale === 'bs' ? 'bs' : 'en';
      const time = formatTime(now, locale);
      el.textContent = el.dataset.withOffset ? `${time} ${formatOffset(now)}` : time;
      el.dateTime = now.toISOString();
    }
    window.setTimeout(tick, msUntilNextMinute(now) + 50);
  };

  tick();
}

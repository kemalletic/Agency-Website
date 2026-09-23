import { gsap } from 'gsap';
import { PROCESS_BARS, barSchedule } from '../../lib/process';

const OPEN = 'inset(0% 0% 0% 0% round 16px)';
const SHUT = 'inset(0% 100% 0% 0% round 16px)';

export function initProcess(): () => void {
  const figure = document.querySelector<HTMLElement>('figure.proc');
  if (!figure) return () => {};
  const rows = Array.from(figure.querySelectorAll<HTMLElement>('.proc-row'));
  const bars = rows.map((row) => row.querySelector<HTMLElement>('.proc-bar'));
  const mm = gsap.matchMedia();

  // Phones and tablets: each mini bar grows once as its stage comes into view.
  mm.add('(max-width: 63.99rem)', () => {
    rows.forEach((row, i) => {
      const bar = bars[i];
      if (!bar) return;
      gsap.fromTo(bar, { clipPath: SHUT }, { clipPath: OPEN, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: row, start: 'top 85%', once: true } });
    });
  });

  // Desktop: a time cursor sweeps the chart; pinned when the whole figure fits the viewport.
  mm.add({ tall: '(min-width: 64rem) and (min-height: 51.25rem)', short: '(min-width: 64rem) and (max-height: 51.24rem)' }, (context) => {
    const { tall } = context.conditions as { tall: boolean; short: boolean };
    const lane = figure.querySelector<HTMLElement>('.proc-overlay-lane');
    const cursor = figure.querySelector<HTMLElement>('.proc-cursor');
    const golive = figure.querySelector<HTMLElement>('.proc-golive-solid');
    if (!lane || !cursor || !golive) return;

    // While the chart is pinned the header stays out of the way (see header.ts), even on scroll-up.
    const root = document.documentElement;
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: tall
        ? {
            trigger: figure,
            start: 'center center',
            end: () => `+=${Math.round(window.innerHeight * 1.4)}`,
            pin: true,
            scrub: 0.6,
            invalidateOnRefresh: true,
            onToggle: (self) => root.classList.toggle('is-pinned', self.isActive),
          }
        : { trigger: figure, start: 'top 70%', end: 'bottom 45%', scrub: 0.6, invalidateOnRefresh: true },
    });

    tl.fromTo(cursor, { x: 0, autoAlpha: 1 }, { x: () => lane.offsetWidth, duration: 1 }, 0);

    rows.forEach((row, i) => {
      const geometry = PROCESS_BARS[i];
      const bar = bars[i];
      if (!geometry || !bar) return;
      const { at, duration } = barSchedule(geometry);
      tl.fromTo(bar, { clipPath: SHUT }, { clipPath: OPEN, duration }, at);
      const info = row.querySelector('.proc-info');
      if (info) tl.fromTo(info, { opacity: 0.28 }, { opacity: 1, duration: 0.04 }, Math.max(at - 0.02, 0));
      const out = row.querySelector('.proc-out');
      if (out) tl.fromTo(out, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.04 }, Math.min(at + duration, 0.96));
      const dots = row.querySelectorAll('.proc-demo');
      (geometry.demos ?? []).forEach((x, d) => {
        const dot = dots[d];
        if (dot) tl.fromTo(dot, { scale: 0 }, { scale: 1, duration: 0.03, ease: 'back.out(3)' }, x / 100);
      });
    });

    tl.fromTo(golive, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.02 }, 0.857);
    tl.to(cursor, { autoAlpha: 0, duration: 0.03 }, 0.97);
    return () => root.classList.remove('is-pinned');
  });

  return () => mm.revert();
}

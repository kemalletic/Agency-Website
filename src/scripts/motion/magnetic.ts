import { gsap } from 'gsap';
import { magneticOffset } from '../../lib/motion';

export function initMagnetic(): () => void {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return () => {};
  const detach: Array<() => void> = [];

  for (const el of document.querySelectorAll<HTMLElement>('[data-magnetic]')) {
    const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });

    const move = (event: PointerEvent): void => {
      // Measure the resting box: subtract the pull already applied.
      const rect = el.getBoundingClientRect();
      const box = {
        left: rect.left - Number(gsap.getProperty(el, 'x')),
        top: rect.top - Number(gsap.getProperty(el, 'y')),
        width: rect.width,
        height: rect.height,
      };
      const { x, y } = magneticOffset(event.clientX, event.clientY, box);
      xTo(x);
      yTo(y);
    };
    const leave = (): void => {
      gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.45)' });
    };

    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    detach.push(() => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
      gsap.set(el, { clearProps: 'transform' });
    });
  }

  return () => {
    for (const off of detach) off();
  };
}

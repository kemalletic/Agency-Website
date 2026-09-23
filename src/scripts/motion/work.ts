import { gsap } from 'gsap';

const OFFSET = 18;

export function initWork(): () => void {
  const cards = Array.from(document.querySelectorAll<HTMLElement>('.pj-card'));

  // The mockup drifts a little slower than the card as it passes through the viewport.
  for (const card of cards) {
    const layer = card.querySelector('.pj-parallax');
    if (!layer) continue;
    gsap.fromTo(layer, { y: 70 }, { y: -30, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true } });
  }

  const pill = document.querySelector<HTMLElement>('.cursor-pill');
  const label = pill?.querySelector<HTMLElement>('.cursor-pill-label');
  if (!pill || !label || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return () => {};

  const xTo = gsap.quickTo(pill, 'x', { duration: 0.45, ease: 'power3' });
  const yTo = gsap.quickTo(pill, 'y', { duration: 0.45, ease: 'power3' });
  gsap.set(pill, { autoAlpha: 0, scale: 0.6 });

  const enter = (event: PointerEvent): void => {
    const card = event.currentTarget as HTMLElement;
    label.textContent = card.dataset.cursor ?? '';
    pill.dataset.icon = card.dataset.cursorIcon ?? 'arrow';
    gsap.set(pill, { x: event.clientX + OFFSET, y: event.clientY + OFFSET });
    gsap.to(pill, { autoAlpha: 1, scale: 1, duration: 0.35, ease: 'back.out(2)' });
  };
  const move = (event: PointerEvent): void => {
    xTo(event.clientX + OFFSET);
    yTo(event.clientY + OFFSET);
  };
  const leave = (): void => {
    gsap.to(pill, { autoAlpha: 0, scale: 0.6, duration: 0.25, ease: 'power2.in' });
  };

  for (const card of cards) {
    card.addEventListener('pointerenter', enter);
    card.addEventListener('pointermove', move);
    card.addEventListener('pointerleave', leave);
  }
  return () => {
    for (const card of cards) {
      card.removeEventListener('pointerenter', enter);
      card.removeEventListener('pointermove', move);
      card.removeEventListener('pointerleave', leave);
    }
  };
}

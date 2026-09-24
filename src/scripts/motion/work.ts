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

  let pointer: { x: number; y: number } | null = null;

  const enter = (event: PointerEvent): void => {
    const card = event.currentTarget as HTMLElement;
    pointer = { x: event.clientX, y: event.clientY };
    label.textContent = card.dataset.cursor ?? '';
    pill.dataset.icon = card.dataset.cursorIcon ?? 'arrow';
    // Jump to the pointer (start and end), so a follow still running from the last card does not drag the pill back.
    xTo(event.clientX + OFFSET, event.clientX + OFFSET);
    yTo(event.clientY + OFFSET, event.clientY + OFFSET);
    // Show and hide overwrite each other: a pointer that only brushes a card starts the hide while the show still runs.
    gsap.to(pill, { autoAlpha: 1, scale: 1, duration: 0.35, ease: 'back.out(2)', overwrite: 'auto' });
  };
  const move = (event: PointerEvent): void => {
    pointer = { x: event.clientX, y: event.clientY };
    xTo(event.clientX + OFFSET);
    yTo(event.clientY + OFFSET);
  };
  const leave = (): void => {
    pointer = null;
    gsap.to(pill, { autoAlpha: 0, scale: 0.6, duration: 0.25, ease: 'power2.in', overwrite: 'auto' });
  };
  // Scrolling moves the card from under a resting pointer without a pointerleave; hide the pill then too.
  const onScroll = (): void => {
    if (pointer && !document.elementFromPoint(pointer.x, pointer.y)?.closest('.pj-card')) leave();
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  for (const card of cards) {
    card.addEventListener('pointerenter', enter);
    card.addEventListener('pointermove', move);
    card.addEventListener('pointerleave', leave);
  }
  return () => {
    window.removeEventListener('scroll', onScroll);
    for (const card of cards) {
      card.removeEventListener('pointerenter', enter);
      card.removeEventListener('pointermove', move);
      card.removeEventListener('pointerleave', leave);
    }
  };
}

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const DURATION = 0.75;
const EASE = 'expo.inOut';

function playArt(row: HTMLDetailsElement): void {
  const art = row.querySelector<SVGSVGElement>('.svc-art svg');
  if (!art) return;
  const service = row.dataset.service;

  if (service === 'web') {
    const cursor = art.querySelector('.art-cursor');
    const cta = art.querySelector('.art-cta');
    if (!cursor || !cta) return;
    gsap
      .timeline({ delay: 0.25 })
      .fromTo(cursor, { x: 120, y: 70, opacity: 0 }, { x: 0, y: 0, opacity: 1, duration: 1.1, ease: 'power3.out' })
      .to(cursor, { scale: 0.86, transformOrigin: '0% 0%', duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.inOut' })
      .fromTo(cta, { opacity: 1 }, { opacity: 0.55, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.inOut' }, '<');
  } else if (service === 'apps') {
    gsap
      .timeline({ delay: 0.2 })
      .from(art.querySelectorAll('.app-row'), { opacity: 0, x: -10, duration: 0.6, stagger: 0.08, ease: 'power3.out' })
      .from(art.querySelector('.app-toast'), { opacity: 0, x: -24, duration: 0.7, ease: 'expo.out' }, 0.15)
      .from(art.querySelectorAll('.app-bar'), { scaleY: 0, transformOrigin: '50% 100%', duration: 0.8, stagger: 0.07, ease: 'expo.out' }, 0.25);
  } else if (service === 'systems') {
    gsap.from(art.querySelectorAll('.node'), {
      opacity: 0,
      scale: 0.92,
      transformOrigin: '50% 50%',
      duration: 0.6,
      stagger: 0.09,
      ease: 'back.out(1.6)',
      delay: 0.2,
    });
  }
}

export function initServices({ animated }: { animated: boolean }): () => void {
  const rows = Array.from(document.querySelectorAll<HTMLDetailsElement>('details.svc'));
  if (rows.length === 0) return () => {};
  // The script keeps rows exclusive itself: the native `name` group would snap the old row shut before it can animate.
  for (const row of rows) row.removeAttribute('name');

  const boxOf = (row: HTMLDetailsElement) => row.querySelector<HTMLElement>('.svc-collapse');

  const close = (row: HTMLDetailsElement): void => {
    const box = boxOf(row);
    if (!animated || !box) {
      row.open = false;
      ScrollTrigger.refresh();
      return;
    }
    gsap.fromTo(
      box,
      { height: box.offsetHeight },
      {
        height: 0,
        duration: DURATION,
        ease: EASE,
        onComplete: () => {
          row.open = false;
          gsap.set(box, { clearProps: 'height' });
          ScrollTrigger.refresh();
        },
      },
    );
  };

  const open = (row: HTMLDetailsElement): void => {
    row.open = true;
    const box = boxOf(row);
    if (!animated || !box) {
      ScrollTrigger.refresh();
      return;
    }
    gsap.fromTo(
      box,
      { height: 0 },
      {
        height: box.scrollHeight,
        duration: DURATION,
        ease: EASE,
        onComplete: () => {
          gsap.set(box, { clearProps: 'height' });
          ScrollTrigger.refresh();
        },
      },
    );
    playArt(row);
  };

  const onClick = (event: Event): void => {
    const summary = (event.target as Element | null)?.closest('summary');
    const row = summary?.parentElement;
    if (!(row instanceof HTMLDetailsElement) || !rows.includes(row)) return;
    event.preventDefault();
    const box = boxOf(row);
    if (box && gsap.isTweening(box)) return;
    if (row.open) {
      close(row);
      return;
    }
    for (const other of rows) if (other !== row && other.open) close(other);
    open(row);
  };
  document.addEventListener('click', onClick);

  const intros = animated
    ? rows.filter((row) => row.open).map((row) => ScrollTrigger.create({ trigger: row, start: 'top 75%', once: true, onEnter: () => playArt(row) }))
    : [];

  return () => {
    document.removeEventListener('click', onClick);
    for (const intro of intros) intro.kill();
  };
}

import { gsap } from 'gsap';

/** The dark contact section rises like a sheet (rounded top, slightly inset) while the page behind it dims. */
export function initContact(): () => void {
  const section = document.getElementById('contact');
  if (!section) return () => {};
  const dim = document.querySelector<HTMLElement>('.page-dim');

  const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: section, start: 'top bottom', end: 'top 20%', scrub: true } });
  tl.fromTo(
    section,
    { clipPath: 'inset(0% 3% 0% 3% round 32px 32px 0px 0px)' },
    { clipPath: 'inset(0% 0% 0% 0% round 0px 0px 0px 0px)' },
    0,
  );
  if (dim) tl.fromTo(dim, { autoAlpha: 0 }, { autoAlpha: 0.4 }, 0);

  return () => {
    tl.scrollTrigger?.kill();
    tl.kill();
  };
}

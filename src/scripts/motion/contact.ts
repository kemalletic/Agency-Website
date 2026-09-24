import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { pageDim } from '../../lib/motion';

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

  // Dims with the rising sheet, then on to night by the end of the page (measured after the pins above have their length).
  const fade = dim
    ? ScrollTrigger.create({
        trigger: section,
        start: 'top bottom',
        end: () => ScrollTrigger.maxScroll(window),
        refreshPriority: -1,
        onRefresh: (self) => gsap.set(dim, { autoAlpha: pageDim(self.scroll(), self.start, self.end, window.innerHeight) }),
        onUpdate: (self) => gsap.set(dim, { autoAlpha: pageDim(self.scroll(), self.start, self.end, window.innerHeight) }),
      })
    : null;

  return () => {
    fade?.kill();
    if (dim) gsap.set(dim, { clearProps: 'opacity,visibility' });
    tl.scrollTrigger?.kill();
    tl.kill();
  };
}

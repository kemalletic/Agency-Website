import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { parseReveal } from '../../lib/motion';
import { whenNear } from './near';

const EASE = 'expo.out';

export function initReveals(): () => void {
  const splits: SplitText[] = [];

  const setup = (el: HTMLElement): void => {
    const options = parseReveal(el.dataset);
    if (!options) return;
    const { delay } = options;
    const scrollTrigger = { trigger: el, start: 'top 88%', once: true };

    switch (options.type) {
      case 'lines':
        splits.push(
          SplitText.create(el, {
            type: 'lines',
            mask: 'lines',
            tag: 'span',
            linesClass: 'split-line',
            aria: 'none',
            autoSplit: true,
            onSplit: (self) =>
              gsap.fromTo(self.lines, { yPercent: 110 }, { yPercent: 0, duration: 1.1, ease: EASE, stagger: 0.08, delay, scrollTrigger }),
          }),
        );
        break;
      case 'chars':
        splits.push(
          SplitText.create(el, {
            type: 'words,chars',
            mask: 'chars',
            tag: 'span',
            wordsClass: 'split-word',
            charsClass: 'split-char',
            aria: 'auto',
            autoSplit: true,
            onSplit: (self) =>
              gsap.fromTo(self.chars, { yPercent: 110 }, { yPercent: 0, duration: 1, ease: EASE, stagger: 0.022, delay, scrollTrigger }),
          }),
        );
        break;
      case 'fade-up':
        gsap.fromTo(el, { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 1, ease: EASE, delay, scrollTrigger });
        break;
      case 'fade':
        gsap.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.2, ease: 'power2.out', delay, scrollTrigger });
        break;
      case 'figure':
        gsap.fromTo(el, { autoAlpha: 0, scale: 0.96 }, { autoAlpha: 1, scale: 1, duration: 1.6, ease: EASE, delay, scrollTrigger });
        break;
      case 'rule':
        gsap.fromTo(el, { scaleX: 0 }, { scaleX: 1, transformOrigin: '0% 50%', duration: 1.4, ease: EASE, delay, scrollTrigger });
        break;
      case 'clip':
        gsap.fromTo(
          el,
          { clipPath: 'inset(100% 0% 0% 0% round 12px)' },
          { clipPath: 'inset(0% 0% 0% 0% round 12px)', duration: 1.4, ease: EASE, delay, scrollTrigger },
        );
        break;
    }
  };

  // Elements further down are prepared a viewport before they arrive; until then they are off-screen anyway.
  const release = whenNear(document.querySelectorAll<HTMLElement>('[data-reveal]'), setup);
  return () => {
    release();
    for (const split of splits) split.revert();
  };
}

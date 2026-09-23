import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';

export function initPrinciples(): () => void {
  const styles = getComputedStyle(document.documentElement);
  const from = styles.getPropertyValue('--label').trim();
  const to = styles.getPropertyValue('--ink').trim();

  const splits = Array.from(document.querySelectorAll<HTMLElement>('.pr-text')).map((text) =>
    SplitText.create(text, {
      type: 'words',
      tag: 'span',
      aria: 'none',
      autoSplit: true,
      onSplit: (self) => {
        const words = self.words.filter((word) => !word.closest('.pr-lead'));
        return gsap.fromTo(
          words,
          { color: from },
          { color: to, ease: 'none', stagger: 0.08, scrollTrigger: { trigger: text, start: 'top 82%', end: 'bottom 52%', scrub: true } },
        );
      },
    }),
  );

  // Only a real photo drifts; the drawn placeholder stays put.
  const photo = document.querySelector<HTMLElement>('.pr-frame--photo');
  const image = photo?.querySelector('.pr-img');
  const drift =
    photo && image
      ? gsap.fromTo(image, { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: photo, start: 'top bottom', end: 'bottom top', scrub: true } })
      : null;

  return () => {
    drift?.scrollTrigger?.kill();
    drift?.kill();
    for (const split of splits) split.revert();
  };
}

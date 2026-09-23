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

  return () => {
    for (const split of splits) split.revert();
  };
}

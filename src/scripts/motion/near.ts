import { gsap } from 'gsap';

/**
 * Runs `setup` for each element: now if it is within a viewport of the screen, otherwise a viewport before it scrolls
 * into view. Most of the page sits far below the fold at load, so this keeps the start-up task short (splitting text
 * and creating triggers for the whole page at once blocked the main thread for close to a second on a slow phone).
 * Everything runs inside one gsap context, so the returned cleanup reverts lazily created animations too.
 */
export function whenNear<T extends HTMLElement>(elements: Iterable<T>, setup: (element: T) => void): () => void {
  const context = gsap.context(() => {});
  const reach = window.innerHeight;
  const later: T[] = [];
  for (const element of elements) {
    const box = element.getBoundingClientRect();
    if (box.top < window.innerHeight + reach && box.bottom > -reach) context.add(() => setup(element));
    else later.push(element);
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        context.add(() => setup(entry.target as T));
      }
    },
    { rootMargin: '100% 0px' },
  );
  for (const element of later) observer.observe(element);
  return () => {
    observer.disconnect();
    context.revert();
  };
}

import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { headerIsSolid, nextHeaderHidden } from '../../lib/motion';

export function initHeader({ allowHide }: { allowHide: boolean }): () => void {
  const header = document.querySelector<HTMLElement>('[data-header]');
  if (!header) return () => {};
  const menu = document.querySelector<HTMLDialogElement>('dialog[data-menu]');
  let lastY = window.scrollY;
  let hidden = false;

  const update = (y: number): void => {
    const focused = header.matches(':focus-within');
    const locked = !allowHide || focused || Boolean(menu?.open);
    // A pinned set piece (html.is-pinned) keeps the header away, even on scroll-up, unless it has focus.
    const pinned = allowHide && !focused && document.documentElement.classList.contains('is-pinned');
    hidden = pinned || nextHeaderHidden({ y, lastY, hidden, locked });
    lastY = y;
    header.dataset.solid = String(headerIsSolid(y));
    header.dataset.hidden = String(hidden);
  };

  const scroll = ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (self) => update(self.scroll()) });

  // Over the dark contact section and footer the header switches to its night palette.
  const contact = document.getElementById('contact');
  const tone = contact
    ? ScrollTrigger.create({
        trigger: contact,
        start: () => `top ${Math.round(header.offsetHeight / 2)}px`,
        end: 'max',
        onToggle: (self) => {
          header.dataset.tone = self.isActive ? 'dark' : 'light';
        },
      })
    : null;

  update(window.scrollY);
  return () => {
    scroll.kill();
    tone?.kill();
  };
}

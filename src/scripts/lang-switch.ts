/** Id of the last section whose top edge has passed 35% of the viewport height. */
function currentSectionId(): string | null {
  const probe = window.innerHeight * 0.35;
  let current: string | null = null;
  for (const section of document.querySelectorAll<HTMLElement>('main > section[id]')) {
    if (section.getBoundingClientRect().top <= probe) current = section.id;
  }
  return current;
}

export function initLangSwitch(): void {
  for (const link of document.querySelectorAll<HTMLAnchorElement>('a[data-lang-link]')) {
    link.addEventListener('click', () => {
      const id = currentSectionId();
      link.hash = id && id !== 'top' ? `#${id}` : '';
    });
  }
}

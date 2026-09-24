export function initMenu(): void {
  const dialog = document.querySelector<HTMLDialogElement>('dialog[data-menu]');
  const opener = document.querySelector<HTMLButtonElement>('[data-menu-open]');
  if (!dialog || !opener) return;

  // Escape and the close button hand focus back to the Menu button; a followed link lets its target take focus.
  let returnFocus = true;
  const close = (restore = true): void => {
    returnFocus = restore;
    dialog.close();
  };

  opener.addEventListener('click', () => {
    dialog.showModal();
    opener.setAttribute('aria-expanded', 'true');
  });
  dialog.addEventListener('close', () => {
    opener.setAttribute('aria-expanded', 'false');
    // WebKit never focuses a clicked or tapped button, so the dialog's own focus restoration has nothing to return to.
    if (returnFocus) opener.focus();
    returnFocus = true;
  });
  dialog.querySelector('[data-menu-close]')?.addEventListener('click', () => close());
  for (const link of dialog.querySelectorAll('[data-menu-link]')) link.addEventListener('click', () => close(false));

  const desktop = window.matchMedia('(min-width: 64rem)');
  desktop.addEventListener('change', (event) => {
    if (event.matches && dialog.open) close();
  });
}

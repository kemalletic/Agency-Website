export function initMenu(): void {
  const dialog = document.querySelector<HTMLDialogElement>('dialog[data-menu]');
  const opener = document.querySelector<HTMLButtonElement>('[data-menu-open]');
  if (!dialog || !opener) return;

  const close = (): void => dialog.close();

  opener.addEventListener('click', () => {
    dialog.showModal();
    opener.setAttribute('aria-expanded', 'true');
  });
  dialog.addEventListener('close', () => opener.setAttribute('aria-expanded', 'false'));
  dialog.querySelector('[data-menu-close]')?.addEventListener('click', close);
  for (const link of dialog.querySelectorAll('[data-menu-link]')) link.addEventListener('click', close);

  const desktop = window.matchMedia('(min-width: 64rem)');
  desktop.addEventListener('change', (event) => {
    if (event.matches && dialog.open) close();
  });
}

import { expect, test, type Page } from '@playwright/test';

/** Collects page errors and console errors (three's informational logs are not errors). */
function watch(page: Page, { expected404 }: { expected404?: string } = {}): string[] {
  const problems: string[] = [];
  page.on('pageerror', (error) => problems.push(error.message));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    // A 404 page is served with status 404; the browser logs that for the document itself.
    if (expected404 && message.location().url.endsWith(expected404) && message.text().includes('404')) return;
    problems.push(message.text());
  });
  return problems;
}

const rings = (page: Page) => page.evaluate(() => document.documentElement.dataset.rings ?? 'none');

for (const { path, lang } of [
  { path: '/', lang: 'en' },
  { path: '/bs/', lang: 'bs' },
]) {
  test(`${path} loads cleanly and settles the rings`, async ({ page }) => {
    const problems = watch(page);
    await page.goto(path);
    await expect(page.locator('html')).toHaveAttribute('lang', lang);
    await expect(page.locator('h1')).toBeVisible();
    // 3D where the GPU allows it, posters otherwise — never stuck waiting.
    await expect.poll(() => rings(page), { timeout: 10_000 }).toMatch(/^(live|off)$/);
    expect(problems).toEqual([]);
  });
}

test('reduced motion shows posters and never pins', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const problems = watch(page);
  await page.goto('/');
  expect(await rings(page)).toBe('none');
  await expect(page.locator('canvas')).toHaveCount(0);
  const hero = page.locator('[data-stage="hero"] img');
  await expect(hero).toBeVisible();
  expect(await hero.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  expect(await page.locator('#approach .approach-grid').evaluate((grid) => grid.parentElement?.classList.contains('pin-spacer'))).toBe(false);
  expect(problems).toEqual([]);
});

test('without WebGL the rings stay posters and three.js is never downloaded', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    // @ts-expect-error — narrowing the overloads is not the point of this stub
    HTMLCanvasElement.prototype.getContext = function (type: string, ...rest: unknown[]) {
      return type === 'webgl2' ? null : original.call(this, type as '2d', ...(rest as []));
    };
  });
  const chunks: string[] = [];
  page.on('request', (request) => {
    if (/\/rings\.[\w-]+\.js$/.test(request.url())) chunks.push(request.url());
  });
  await page.goto('/');
  await expect.poll(() => rings(page)).toBe('off');
  await page.waitForTimeout(1500);
  expect(chunks).toEqual([]);
  await expect(page.locator('[data-stage="hero"] img')).toBeVisible();
});

test('switches language and keeps the page', async ({ page, isMobile }) => {
  test.skip(isMobile, 'the switch lives in the menu on phones (covered below)');
  await page.goto('/');
  // The menu's copy of the switch sits in the closed dialog; role queries skip hidden elements.
  await page.getByRole('link', { name: 'Bosanski' }).click();
  await expect(page).toHaveURL(/\/bs\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'bs');
});

test('the work cursor pill hides again after the pointer only brushes a card', async ({ page, isMobile }) => {
  test.skip(isMobile, 'the pill needs a fine pointer');
  await page.goto('/');
  await page.waitForFunction(() => document.documentElement.classList.contains('motion-ready'));
  const card = page.locator('.pj-card').first();
  await card.scrollIntoViewIfNeeded();
  // In and straight out again, as when a fast scroll carries a card under a resting pointer: the hide starts while
  // the show is still running. Dispatched in one task, because two real mouse moves are too far apart to race.
  await card.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const at = { clientX: box.x + box.width / 2, clientY: box.y + box.height / 2 };
    element.dispatchEvent(new PointerEvent('pointerenter', at));
    element.dispatchEvent(new PointerEvent('pointerleave', at));
  });
  await page.waitForTimeout(800);
  await expect(page.locator('.cursor-pill')).toBeHidden();
});

test('the phone menu opens, traps focus and closes with Escape', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'desktop has no menu');
  await page.goto('/');
  const toggle = page.locator('[data-menu-open]');
  await toggle.click();
  const menu = page.locator('dialog[data-menu]');
  await expect(menu).toHaveAttribute('open', '');
  await page.keyboard.press('Escape');
  await expect(menu).not.toHaveAttribute('open', '');
  await expect(toggle).toBeFocused();
});

test('a deep link lands on its section even with the pins above it', async ({ page }) => {
  await page.goto('/#services');
  await page.waitForFunction(() => document.documentElement.classList.contains('motion-ready'));
  await page.waitForTimeout(500);
  const offset = await page.evaluate(() => {
    const padding = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    return Math.abs((document.getElementById('services')?.getBoundingClientRect().top ?? Infinity) - padding);
  });
  expect(offset).toBeLessThan(4);
});

test('every reveal has played by the end of the page, those prepared on the way included', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.documentElement.classList.contains('motion-ready'));
  // A screen at a time, the way a reader goes, so the reveals further down are prepared as they come near.
  for (let step = 0; step < 80; step++) {
    const end = await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight * 0.8);
      return window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    });
    await page.waitForTimeout(100);
    if (end) break;
  }
  const hidden = () =>
    page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'))
        .filter((el) => [el, ...el.querySelectorAll<HTMLElement>('[style]')].some((node) => node.style.opacity !== '' && Number(node.style.opacity) < 0.99))
        .map((el) => el.outerHTML.slice(0, 80)),
    );
  await expect.poll(hidden, { timeout: 5_000 }).toEqual([]);
});

test('the contact form validates and sends (intercepted)', async ({ page }) => {
  let sent: Record<string, unknown> | null = null;
  await page.route('https://api.web3forms.com/**', async (route) => {
    sent = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });
  await page.goto('/#contact');
  const form = page.locator('form[data-contact-form]');
  // The deep link lands on the section; bring the form itself into view so its reveal plays.
  await form.evaluate((element) => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await form.locator('button[type="submit"]').click();
  await expect(form.locator('[data-error-for="name"]')).toBeVisible();
  await expect(form.locator('#cf-name')).toHaveAttribute('aria-invalid', 'true');

  await form.locator('#cf-name').fill('Test Person');
  await form.locator('#cf-email').fill('test@example.org');
  await form.locator('#cf-message').fill('We need a small online shop with invoicing.');
  await form.locator('input[name="access_key"]').evaluate((input: HTMLInputElement) => (input.value = 'test-key'));
  await form.locator('button[type="submit"]').click();
  await expect(form).toHaveAttribute('data-state', 'success');
  await expect(form.locator('[data-form-status]')).not.toBeEmpty();
  expect(sent).toMatchObject({ name: 'Test Person', email: 'test@example.org', access_key: 'test-key' });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the whole page is there, with posters and labels', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('[data-stage="hero"] img')).toBeVisible();
    await expect(page.locator('.stage-label')).toHaveCount(3);
    await expect(page.locator('form[data-contact-form]')).toHaveAttribute('action', /web3forms/);
  });
});

test('the skip link jumps to the content', async ({ page, isMobile, browserName }) => {
  test.skip(isMobile, 'keyboard navigation');
  await page.goto('/');
  const skip = page.locator('.skip-link');
  // Safari's Tab skips links unless "Press Tab to highlight each item" is on; focus the link directly there.
  if (browserName === 'webkit') await skip.focus();
  else await page.keyboard.press('Tab');
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused({ timeout: 5000 });
});

test('unknown pages answer 404 with the fallen rings', async ({ page }) => {
  const problems = watch(page, { expected404: '/nowhere-at-all' });
  const response = await page.goto('/nowhere-at-all');
  expect(response?.status()).toBe(404);
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  await page.locator('main a[href="/"]').first().click();
  await expect(page).toHaveURL(/\/$/);
  expect(problems).toEqual([]);
});

test('under /bs/ the 404 page leads in Bosnian', async ({ page }) => {
  const problems = watch(page, { expected404: '/bs/nigdje-nema' });
  const response = await page.goto('/bs/nigdje-nema');
  expect(response?.status()).toBe(404);
  await expect(page.locator('html')).toHaveAttribute('lang', 'bs');
  // The heading holds both titles; only the Bosnian one is shown.
  await expect(page.locator('h1')).toHaveText('Ova stranica se raspala.', { useInnerText: true });
  await page.getByRole('link', { name: 'Nazad na početnu' }).click();
  await expect(page).toHaveURL(/\/bs\/$/);
  expect(problems).toEqual([]);
});

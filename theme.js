'use strict';
/* Design preference is intentionally outside the encrypted work vault. */
(function () {
  const THEME_KEY = 'sipetak:ui-theme:v3';
  const THEME_COLOR_LIGHT = '#f7f7ff';
  const THEME_COLOR_DARK = '#111326';
  function current() { try { return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'; } catch { return 'light'; } }
  function apply(theme) {
    const chosen = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', chosen);
    document.documentElement.style.colorScheme = chosen;
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.content = chosen === 'dark' ? THEME_COLOR_DARK : THEME_COLOR_LIGHT;
    document.querySelectorAll('[data-theme-toggle]').forEach(button => {
      button.setAttribute('aria-pressed', String(chosen === 'dark'));
      button.title = chosen === 'dark' ? 'Aktifkan tema terang' : 'Aktifkan tema gelap';
      button.setAttribute('aria-label', button.title);
      const icon = button.querySelector('[data-theme-icon]');
      if (icon) icon.textContent = chosen === 'dark' ? '☀' : '☾';
      const label = button.querySelector('[data-theme-label]');
      if (label) label.textContent = chosen === 'dark' ? 'Terang' : 'Gelap';
    });
  }
  function change(next) {
    const value = next === 'dark' ? 'dark' : 'light';
    try { localStorage.setItem(THEME_KEY, value); } catch {}
    apply(value);
    document.dispatchEvent(new CustomEvent('sipetak:theme', { detail: { theme: value } }));
  }
  window.SIPETAK_THEME = { current, apply, change };
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-theme-toggle]');
    if (!b) return;
    e.preventDefault();
    change(current() === 'dark' ? 'light' : 'dark');
  }, true);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => apply(current()));
  else apply(current());
  apply(current());
})();

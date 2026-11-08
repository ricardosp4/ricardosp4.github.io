/* Theme toggle. It works without WebGL; book.js listens for "themechange"
   to relight the desk. */

(function () {
  const root = document.documentElement;
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const toggle = document.querySelector('.theme-toggle');

  const currentTheme = () => root.dataset.theme || (darkQuery.matches ? 'dark' : 'light');
  const announce = () => document.dispatchEvent(new Event('themechange'));
  function syncLabel() {
    if (!toggle) return;
    toggle.setAttribute('aria-label',
      currentTheme() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }

  if (toggle) {
    toggle.addEventListener('click', () => {
      const next = currentTheme() === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch (e) {}
      syncLabel();
      announce();
    });
  }
  darkQuery.addEventListener('change', () => { syncLabel(); announce(); });
  syncLabel();

  window.currentTheme = currentTheme;
})();

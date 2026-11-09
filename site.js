/* Panels and the day/night toggle. Both work without WebGL.
   desk.js listens for "themechange" to move the sun, and for
   "panelopen" / "panelclose" to lift and lower the object on the desk. */

(function () {
  const root = document.documentElement;
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const toggle = document.querySelector('.theme-toggle');

  /* ---------- Day and night ---------- */

  const currentTheme = () => root.dataset.theme || (darkQuery.matches ? 'dark' : 'light');
  const announce = () => document.dispatchEvent(new Event('themechange'));
  function syncLabel() {
    if (!toggle) return;
    toggle.setAttribute('aria-label', currentTheme() === 'dark' ? 'Switch to day' : 'Switch to night');
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

  /* ---------- Panels ---------- */

  const panels = {};
  document.querySelectorAll('dialog.panel').forEach((d) => {
    const id = d.id.replace('panel-', '');
    panels[id] = d;
    d.querySelector('.panel__close').addEventListener('click', () => d.close());
    // a click on the backdrop (outside the sheet) closes it
    d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
    d.addEventListener('close', () => {
      root.classList.remove('panel-open');
      document.dispatchEvent(new CustomEvent('panelclose', { detail: id }));
      if (location.hash === '#' + id) history.replaceState(null, '', location.pathname + location.search);
    });
  });

  function openPanel(id) {
    const d = panels[id];
    if (!d) return;
    Object.values(panels).forEach((p) => { if (p !== d && p.open) p.close(); });
    if (!d.open) {
      d.showModal();
      // focus the text, not the close button, so the sheet opens without a ring
      // on click and the arrow keys scroll it at once
      const body = d.querySelector('.panel__body');
      body.setAttribute('tabindex', '-1');
      body.scrollTop = 0;
      body.focus({ preventScroll: true });
      root.classList.add('panel-open');
      document.dispatchEvent(new CustomEvent('panelopen', { detail: id }));
      if (location.hash !== '#' + id) history.replaceState(null, '', '#' + id);
    }
  }
  window.openPanel = openPanel;

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-open]');
    if (!b) return;
    e.preventDefault();
    // the desk lifts the object first when it can; otherwise open at once
    if (window.deskOpen) window.deskOpen(b.dataset.open);
    else openPanel(b.dataset.open);
  });

  // a link like ricardosp4.github.io/#projects opens that panel
  const start = location.hash.slice(1);
  if (panels[start]) openPanel(start);
})();

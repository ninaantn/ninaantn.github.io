(() => {
  const root = document.documentElement;
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  const storageKey = 'portfolio-theme';
  let preference;

  try {
    const saved = localStorage.getItem(storageKey);
    if (saved === 'light' || saved === 'dark') preference = saved;
  } catch {
    // Theme switching still works when browser storage is unavailable.
  }

  function applyTheme() {
    const theme = preference ?? (systemTheme.matches ? 'dark' : 'light');
    root.dataset.theme = theme;
    return theme;
  }

  applyTheme();

  document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('theme-toggle');

    function update() {
      const dark = applyTheme() === 'dark';
      toggle.setAttribute('aria-pressed', String(dark));
      updateTitle();
    }

    function updateTitle() {
      const dark = root.dataset.theme === 'dark';
      toggle.title = root.lang === 'en'
        ? (dark ? 'Switch to light mode' : 'Switch to dark mode')
        : (dark ? 'Включить светлую тему' : 'Включить тёмную тему');
    }

    toggle.addEventListener('click', () => {
      preference = root.dataset.theme === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(storageKey, preference);
      } catch {
        // Keep the current choice for this visit.
      }
      update();
    });

    systemTheme.addEventListener('change', update);
    document.addEventListener('portfolio-languagechange', updateTitle);
    update();
    toggle.hidden = false;
  });
})();

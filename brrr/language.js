(() => {
  document.addEventListener('DOMContentLoaded', () => {
    const root = document.documentElement;
    const toggle = document.getElementById('language-toggle');
    const storageKey = 'portfolio-language';
    const translations = [
      ...Array.from(document.querySelectorAll('[data-en]'), element => ({
        element, ru: element.textContent, en: element.dataset.en
      })),
      ...['aria-label', 'content'].flatMap(attribute =>
        Array.from(document.querySelectorAll(`[data-en-${attribute}]`), element => ({
          element, attribute, ru: element.getAttribute(attribute),
          en: element.getAttribute(`data-en-${attribute}`)
        }))
      )
    ];

    function setLanguage(language) {
      root.lang = language;
      for (const translation of translations) {
        const { element, attribute } = translation;
        if (attribute) element.setAttribute(attribute, translation[language]);
        else element.textContent = translation[language];
      }

      const english = language === 'en';
      toggle.lang = english ? 'ru' : 'en';
      toggle.textContent = english ? 'RU' : 'EN';
      toggle.setAttribute('aria-label', english ? 'Переключить на русский' : 'Switch to English');
      document.dispatchEvent(new Event('portfolio-languagechange'));
    }

    let saved;
    try {
      saved = localStorage.getItem(storageKey);
    } catch {
      // Language switching still works without browser storage.
    }
    setLanguage(saved === 'en' ? 'en' : 'ru');

    toggle.addEventListener('click', () => {
      const language = root.lang === 'en' ? 'ru' : 'en';
      setLanguage(language);
      try {
        localStorage.setItem(storageKey, language);
      } catch {
        // Keep the current choice for this visit.
      }
    });

    toggle.hidden = false;
  });
})();

// ============================================================
// Mendly — i18n Helper
// ============================================================
const I18N = (() => {
  let currentLang = localStorage.getItem("mendly_lang") || "en";

  function t(key) {
    return (TRANSLATIONS[currentLang] && TRANSLATIONS[currentLang][key])
      || TRANSLATIONS.en[key]
      || key;
  }

  function setLang(lang) {
    if (!TRANSLATIONS[lang]) return;
    currentLang = lang;
    localStorage.setItem("mendly_lang", lang);
    applyTranslations();
    updateLangLabels();
    document.querySelectorAll('.lang-switcher.open').forEach(s => s.classList.remove('open'));
  }

  function getLang() { return currentLang; }

  function updateLangLabels() {
    const lbl = t("lang_name");
    ["landingLangLabel", "topnavLangLabel", "mobileLangLabel"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = lbl;
    });
  }

  function applyTranslations() {
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      const translated = t(key);
      if (translated.includes("<") && translated.includes(">")) {
        el.innerHTML = translated;
      } else {
        el.textContent = translated;
      }
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
      const key = el.getAttribute("data-i18n-placeholder");
      el.placeholder = t(key);
    });
    document.querySelectorAll("[data-i18n-title]").forEach(el => {
      const key = el.getAttribute("data-i18n-title");
      el.title = t(key);
    });
    document.documentElement.lang = currentLang;
  }

  function renderLangDropdown(container) {
    if (!container) return;
    const langs = Object.keys(TRANSLATIONS);
    container.innerHTML = "";
    langs.forEach(code => {
      const btn = document.createElement("button");
      btn.className = "lang-option";
      btn.textContent = TRANSLATIONS[code].lang_name;
      btn.setAttribute("data-lang", code);
      if (code === currentLang) btn.classList.add("active");
      btn.onclick = () => { setLang(code); };
      container.appendChild(btn);
    });
  }

  return { t, setLang, getLang, applyTranslations, updateLangLabels, renderLangDropdown };
})();

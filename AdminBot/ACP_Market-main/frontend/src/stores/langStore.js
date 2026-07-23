import { create } from 'zustand';
import { useTranslationStore } from 'react-i18next';

const LANG_KEY = 'acp-market-lang';

function getInitialLang() {
  const stored = localStorage.getItem(LANG_KEY);
  if (stored && ['zh-CN', 'en-US'].includes(stored)) return stored;
  const browserLang = navigator.language;
  if (browserLang.startsWith('zh')) return 'zh-CN';
  return 'en-US';
}

const useLangStore = create((set) => ({
  lang: getInitialLang(),
  setLang: (lang) => {
    localStorage.setItem(LANG_KEY, lang);
    set({ lang });
  },
}));

export default useLangStore;

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n from '../i18n';

export type Lang = 'zh-CN' | 'en-US' | 'system';

interface LangState {
  lang: Lang;
  setLang: (lang: Lang) => void;
  resolvedLang: 'zh-CN' | 'en-US';
}

function getSystemLang(): 'zh-CN' | 'en-US' {
  if (typeof navigator !== 'undefined') {
    const nav = navigator.language;
    if (nav.startsWith('zh')) return 'zh-CN';
  }
  return 'en-US';
}

function resolveLang(lang: Lang): 'zh-CN' | 'en-US' {
  if (lang === 'system') return getSystemLang();
  return lang;
}

function applyLang(lang: Lang) {
  const resolved = resolveLang(lang);
  i18n.changeLanguage(resolved);
  return resolved;
}

// Apply on module load
const initialLang: Lang = (() => {
  try {
    const stored = localStorage.getItem('adminchat-lang');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.state?.lang ?? 'system';
    }
  } catch { /* ignore */ }
  return 'system';
})();

const initialResolved = applyLang(initialLang);

export const useLangStore = create<LangState>()(
  persist(
    (set) => ({
      lang: initialLang,
      resolvedLang: initialResolved,

      setLang: (lang: Lang) => {
        const resolved = applyLang(lang);
        set({ lang, resolvedLang: resolved });
      },
    }),
    {
      name: 'adminchat-lang',
    }
  )
);

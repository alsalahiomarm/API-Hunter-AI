"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import arTranslations from "@/locales/ar";
import enTranslations from "@/locales/en";

export type Language = "ar" | "en";

interface I18nContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
  isRtl: boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = "api-hunter-lang";

const TRANSLATIONS: Record<Language, Record<string, any>> = {
  ar: arTranslations,
  en: enTranslations,
};

function loadStoredLang(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
    if (stored === "ar" || stored === "en") return stored;
  } catch {
    // localStorage may be unavailable
  }
  return "ar";
}

function getNested(obj: Record<string, any>, key: string): string {
  const parts = key.split(".");
  let cur: any = obj;
  for (const p of parts) {
    if (cur == null) return key;
    cur = cur[p];
  }
  if (typeof cur === "string") return cur;
  return key;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => loadStoredLang());
  const [ready, setReady] = useState(true);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
    document.documentElement.setAttribute("dir", next === "ar" ? "rtl" : "ltr");
    document.documentElement.setAttribute("lang", next);
  }, []);

  const t = useCallback(
    (key: string): string => {
      const dict = TRANSLATIONS[lang] ?? TRANSLATIONS["ar"];
      return getNested(dict, key);
    },
    [lang]
  );

  useEffect(() => {
    document.documentElement.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    document.documentElement.setAttribute("lang", lang);
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t, isRtl: lang === "ar" }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

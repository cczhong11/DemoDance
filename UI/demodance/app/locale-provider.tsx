"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Locale = "en" | "zh";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  tr: (en: string, zh: string) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem("demodance.locale");
    if (stored === "en" || stored === "zh") {
      setLocale(stored);
      return;
    }

    const browserLang = window.navigator.language.toLowerCase();
    if (browserLang.startsWith("zh")) {
      setLocale("zh");
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("demodance.locale", locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<LocaleContextValue>(() => {
    return {
      locale,
      setLocale,
      tr: (en: string, zh: string) => (locale === "en" ? en : zh),
    };
  }, [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return ctx;
}

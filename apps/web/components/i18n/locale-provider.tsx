"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionary";

type LocaleContextValue = {
  readonly locale: Locale;
  readonly setLocale: (value: Locale) => void;
  readonly t: (key: string) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readStoredLocale(): Locale {
  if (typeof document === "undefined") return defaultLocale;
  const cookieMatch = document.cookie.match(/(?:^|; )eve-locale=([^;]+)/);
  if (cookieMatch && isLocale(decodeURIComponent(cookieMatch[1]))) {
    return cookieMatch[1] as Locale;
  }
  const stored = window.localStorage.getItem("eve-locale");
  return isLocale(stored) ? stored : defaultLocale;
}

function translate(dictionary: ReturnType<typeof getDictionary>, key: string): string {
  const parts = key.split(".");
  let current: unknown = dictionary;
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }
  return typeof current === "string" ? current : key;
}

export function LocaleProvider({
  children,
  initialLocale = defaultLocale,
}: {
  readonly children: ReactNode;
  readonly initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    const stored = readStoredLocale();
    if (stored !== locale) setLocaleState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.cookie = `eve-locale=${locale}; path=/; max-age=31536000`;
    window.localStorage.setItem("eve-locale", locale);
  }, [locale]);

  const setLocale = useCallback((value: Locale) => {
    setLocaleState(value);
  }, []);

  const dictionary = getDictionary(locale);
  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key) => translate(dictionary, key),
    }),
    [dictionary, locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const value = useContext(LocaleContext);
  if (!value) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return value;
}
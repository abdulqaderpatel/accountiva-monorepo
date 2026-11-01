import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import en from "./locales/en.json";
import hi from "./locales/hi.json";
import es from "./locales/es.json";
import ar from "./locales/ar.json";

export type LocaleCode = "en" | "hi" | "es" | "ar";

export interface LocaleInfo {
  code: LocaleCode;
  name: string;
  nativeName: string;
  dir: "ltr" | "rtl";
}

export const SUPPORTED_LOCALES: LocaleInfo[] = [
  { code: "en", name: "English", nativeName: "English", dir: "ltr" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", dir: "ltr" },
  { code: "es", name: "Spanish", nativeName: "Español", dir: "ltr" },
  { code: "ar", name: "Arabic", nativeName: "العربية", dir: "rtl" },
];

const messages: Record<LocaleCode, any> = {
  en,
  hi,
  es,
  ar,
};

interface I18nContextValue {
  locale: LocaleCode;
  setLocale: (locale: LocaleCode) => void;
  isRTL: boolean;
  t: (key: string, paramsOrFallback?: Record<string, string | number> | string, fallback?: string) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

function resolveKey(obj: any, path: string): string | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  const parts = path.split(".");
  let current = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = current[part];
  }
  return typeof current === "string" ? current : undefined;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(() => {
    const saved = localStorage.getItem("accountiva_locale") as LocaleCode;
    if (saved && ["en", "hi", "es", "ar"].includes(saved)) {
      return saved;
    }
    return "en";
  });

  const setLocale = useCallback((newLocale: LocaleCode) => {
    setLocaleState(newLocale);
    localStorage.setItem("accountiva_locale", newLocale);
  }, []);

  const isRTL = locale === "ar";

  useEffect(() => {
    document.documentElement.setAttribute("lang", locale);
    document.documentElement.setAttribute("dir", isRTL ? "rtl" : "ltr");
  }, [locale, isRTL]);

  const t = useCallback(
    (key: string, paramsOrFallback?: Record<string, string | number> | string, fallback?: string): string => {
      let params: Record<string, string | number> | undefined;
      let defaultText: string | undefined;

      if (typeof paramsOrFallback === "string") {
        defaultText = paramsOrFallback;
      } else if (typeof paramsOrFallback === "object") {
        params = paramsOrFallback;
        defaultText = fallback;
      }

      // Try active locale
      let result = resolveKey(messages[locale], key);

      // Fallback to English
      if (result === undefined && locale !== "en") {
        result = resolveKey(messages.en, key);
      }

      // Fallback to provided default text or key itself
      if (result === undefined) {
        result = defaultText !== undefined ? defaultText : key;
      }

      // Interpolate parameters {param}
      if (params && Object.keys(params).length > 0) {
        for (const [pKey, pVal] of Object.entries(params)) {
          result = result.replace(new RegExp(`\\{${pKey}\\}`, "g"), String(pVal));
        }
      }

      return result;
    },
    [locale]
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      isRTL,
      t,
    }),
    [locale, setLocale, isRTL, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}

export const useTranslation = useI18n;

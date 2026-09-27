"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
type Locale = "en" | "zh";
const Context = createContext({
  locale: "en" as Locale,
  setLocale: (_v: Locale) => {},
  t: (en: string, zh: string) => en,
});
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem("research-locale") === "zh") setLocale("zh");
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
    try {
      localStorage.setItem("research-locale", locale);
    } catch {}
  }, [locale, ready]);
  return (
    <Context.Provider
      value={{ locale, setLocale, t: (en, zh) => (locale === "zh" ? zh : en) }}
    >
      {children}
    </Context.Provider>
  );
}
export const useLocale = () => useContext(Context);
export function LanguageToggle() {
  const { locale, setLocale } = useLocale();
  if (locale === "en") return null;
  return (
    <button
      className="button button-secondary language-toggle"
      onClick={() => setLocale("en")}
      aria-label="Switch to English"
    >
      English
    </button>
  );
}

"use client";

import { useLocale } from "./locale-provider";

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1 text-xs">
      <button
        className={`rounded-full px-2 py-1 ${locale === "es" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        onClick={() => setLocale("es")}
        type="button"
      >
        ES
      </button>
      <button
        className={`rounded-full px-2 py-1 ${locale === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        onClick={() => setLocale("en")}
        type="button"
      >
        EN
      </button>
    </div>
  );
}
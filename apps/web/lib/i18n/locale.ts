export type Locale = "es" | "en";

export const locales: readonly Locale[] = ["es", "en"];

export const defaultLocale: Locale = "es";

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "es" || value === "en";
}
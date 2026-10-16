import { sql, type SQLWrapper } from "drizzle-orm";

// Helper de búsqueda que ignora acentos/caracteres especiales, sin depender de
// la extensión `unaccent` de Postgres. Usa TRANSLATE/ilike nativo de Postgres.
const MAP: ReadonlyArray<readonly [string, string]> = [
  ["á", "a"], ["à", "a"], ["ä", "a"], ["â", "a"], ["ã", "a"], ["å", "a"],
  ["é", "e"], ["è", "e"], ["ë", "e"], ["ê", "e"],
  ["í", "i"], ["ì", "i"], ["ï", "i"], ["î", "i"],
  ["ó", "o"], ["ò", "o"], ["ö", "o"], ["ô", "o"], ["õ", "o"],
  ["ú", "u"], ["ù", "u"], ["ü", "u"], ["û", "u"],
  ["ñ", "n"], ["ç", "c"],
];
const TRANSLATE_FROM = MAP.map(([from]) => from).join("");
const TRANSLATE_TO = MAP.map(([, to]) => to).join("");

/** Normaliza un término de búsqueda: minúsculas, sin acentos, solo a-z0-9/espacios. */
export function foldTerm(value: string): string {
  const lower = value.toLocaleLowerCase("es").normalize("NFC");
  let out = "";
  for (const ch of lower) {
    const idx = TRANSLATE_FROM.indexOf(ch);
    out += idx >= 0 ? TRANSLATE_TO[idx] : ch;
  }
  return out.replace(/[^a-z0-9 ]/gu, " ").replace(/\s+/gu, " ").trim();
}

/**
 * LIKE insensible a mayúsculas y acentos para una columna de texto.
 * Uso: where(or(accentInsensitiveLike(urbanRoutes.zone, "Ivan"), ...))
 */
export function accentInsensitiveLike(column: SQLWrapper, term: string): SQLWrapper {
  const folded = foldTerm(term);
  if (!folded) {
    return sql`false`;
  }
  return sql`translate(lower(${column}::text), ${TRANSLATE_FROM}, ${TRANSLATE_TO}) ilike ${`%${folded}%`}`;
}

/**
 * `true` cuando el término aparece en al menos una de las columnas. El predicado
 * se evalúa en Postgres, así que el resultado coincide exactamente con
 * {@link accentInsensitiveLike} y puede devolverse como columna calculada.
 */
export function matchesAny(columns: ReadonlyArray<SQLWrapper>, term: string): SQLWrapper {
  const folded = foldTerm(term);
  if (!folded) {
    return sql`false`;
  }
  const predicate = sql.join(
    columns.map(
      (column) =>
        sql`translate(lower(${column}::text), ${TRANSLATE_FROM}, ${TRANSLATE_TO}) ilike ${`%${folded}%`}`,
    ),
    sql` or `,
  );
  return sql`(${predicate})`;
}
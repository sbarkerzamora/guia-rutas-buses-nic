import { or, sql } from "drizzle-orm";
import { db } from "./db/client";
import { interurbanRoutes, routeSearchLog, urbanRoutes } from "./db/schema";
import { foldTerm, matchesAny } from "./route-search";

export type BusRouteSearchType = "urban" | "interurban" | "both";

export interface UrbanRouteMatch {
  tipo: "urbana";
  numeroRuta: string | null;
  zona: string | null;
  horario: string | null;
  paradasPrincipales: string | null;
  tarifa: string | null;
}

export interface InterurbanRouteMatch {
  tipo: "interurbana";
  terminal: string | null;
  destino: string | null;
  horariosFrecuencia: string | null;
  precio: string | null;
  /**
   * Horario propio del destino buscado, extraído de la celda del CSV
   * ("Granada (cada media hora 5:30am-9pm)" → "cada media hora 5:30am-9pm").
   * `null` cuando la celda no separa el dato por destino.
   */
  horarioDelDestino: string | null;
  /** Precio propio del destino buscado ("25"), o `null` si no viene separado. */
  precioDelDestino: string | null;
}

export interface BusRouteMatches {
  urbanas: UrbanRouteMatch[];
  interurbanas: InterurbanRouteMatch[];
}

export interface BusRouteSearchResult {
  origin: string;
  destination: string;
  type: BusRouteSearchType;
  resumen: {
    conexionesDirectas: number;
    viaMismaTerminal: number;
    sirvenOrigen: number;
    sirvenDestino: number;
    totalCoincidencias: number;
  };
  /** Una misma fila cubre el viaje: la ruta pasa por el origen y el destino. */
  conexionesDirectas: BusRouteMatches;
  /**
   * Solo en interurbanas: el origen **no** es una terminal, y tanto el origen
   * como el destino aparecen en la lista de destinos de una misma terminal.
   * Viaje por tramos: primero hay que llegar a esa terminal.
   */
  viaMismaTerminal: BusRouteMatches;
  /** Filas que solo mencionan el origen. No son conexiones por sí solas. */
  sirvenOrigen: BusRouteMatches;
  /** Filas que solo mencionan el destino. No son conexiones por sí solas. */
  sirvenDestino: BusRouteMatches;
  comoLeer: string;
}

const ROUTE_CACHE_TTL_MS = 5 * 60 * 1000;
const ROUTE_CACHE_MAX = 100;
const routeCache = new Map<string, { expires: number; result: BusRouteSearchResult }>();

function routeCacheKey(origin: string, destination: string, type: BusRouteSearchType) {
  return `${origin.toLowerCase()}::${destination.toLowerCase()}::${type}`;
}

function getCachedRoute(key: string): BusRouteSearchResult | null {
  const entry = routeCache.get(key);
  if (!entry) return null;
  if (entry.expires < Date.now()) {
    routeCache.delete(key);
    return null;
  }
  return structuredClone(entry.result);
}

function setCachedRoute(key: string, result: BusRouteSearchResult) {
  if (routeCache.size >= ROUTE_CACHE_MAX) {
    const oldest = routeCache.keys().next().value;
    if (oldest) routeCache.delete(oldest);
  }
  routeCache.set(key, { expires: Date.now() + ROUTE_CACHE_TTL_MS, result: structuredClone(result) });
}

const COMO_LEER =
  "conexionesDirectas: una misma fila cubre el viaje (en interurbanas significa que el origen ES la terminal de salida y el destino esta en su lista). " +
  "viaMismaTerminal: el origen y el destino son ambos destinos de la misma terminal de Managua; NO hay ruta directa, el viaje requiere un tramo previo hacia esa terminal. " +
  "sirvenOrigen y sirvenDestino: filas que solo mencionan un lado; NO son conexiones, son pistas para armar el viaje por tramos. " +
  "En interurbanas 'terminal' es la terminal de salida en Managua y 'destino' la lista de destinos que atiende. " +
  "Nunca presentes una fila de viaMismaTerminal, sirvenOrigen o sirvenDestino como si conectara el origen con el destino.";

const URBAN_COLUMNS = [urbanRoutes.zone, urbanRoutes.stops, urbanRoutes.route_number];

function emptyMatches(): BusRouteMatches {
  return { urbanas: [], interurbanas: [] };
}

function normalizeType(value: string | null | undefined): BusRouteSearchType {
  const lower = (value ?? "").toLowerCase();
  return lower === "urban" || lower === "interurban" ? lower : "both";
}

/**
 * Las celdas interurbanas del CSV guardan un valor por destino en texto libre:
 * `"Rivas (reg 65, exp 72), Granada (25), Masaya (13)"`. Devuelve el detalle que
 * corresponde al lugar buscado y `null` cuando la celda no lo separa por destino
 * (entonces aplica el valor completo de la celda).
 */
export function detalleDelDestino(raw: string | null, place: string): string | null {
  if (!raw) return null;
  const folded = foldTerm(place);
  if (!folded) return null;
  // El nombre completo primero ("San Juan del Sur"); si no aparece, la palabra
  // más larga ("Peñas" encuentra "Peñas Blancas").
  const terminos = [folded, ...[...folded.split(" ")].sort((a, b) => b.length - a.length)[0]].filter(
    (termino) => termino.length >= 3,
  );

  for (const parte of raw.split(/\),\s*/)) {
    const match = parte.match(/^(.*?)\s*\(([^()]+)\)?\s*$/u);
    if (!match) continue;
    const nombre = foldTerm(match[1]);
    if (terminos.some((termino) => nombre.includes(termino))) return match[2].trim();
  }

  return null;
}

/** Busca rutas urbanas e interurbanas y clasifica cada coincidencia por lado. */
export async function searchBusRoutes(input: {
  origin: string;
  destination: string;
  type?: string | null;
}): Promise<BusRouteSearchResult> {
  const origin = input.origin.trim();
  const destination = input.destination.trim();

  if (!origin && !destination) {
    throw new Error("Proporciona origin y/o destination.");
  }

  // Con un solo término, se usa para ambos lados de la búsqueda.
  const originTerm = origin || destination;
  const destinationTerm = destination || origin;
  const type = normalizeType(input.type);
  const cacheKey = routeCacheKey(origin, destination, type);
  const cached = getCachedRoute(cacheKey);
  if (cached) return cached;

  const kinds = type === "both" ? (["urban", "interurban"] as const) : ([type] as const);

  const result: BusRouteSearchResult = {
    origin,
    destination,
    type,
    resumen: {
      conexionesDirectas: 0,
      viaMismaTerminal: 0,
      sirvenOrigen: 0,
      sirvenDestino: 0,
      totalCoincidencias: 0,
    },
    conexionesDirectas: emptyMatches(),
    viaMismaTerminal: emptyMatches(),
    sirvenOrigen: emptyMatches(),
    sirvenDestino: emptyMatches(),
    comoLeer: COMO_LEER,
  };

  if (kinds.includes("urban")) {
    // En las rutas urbanas la fila es la ruta y las paradas van en una lista
    // con ida y vuelta, así que coincidir en ambos lados conecta los puntos.
    const originHit = matchesAny(URBAN_COLUMNS, originTerm);
    const destinationHit = matchesAny(URBAN_COLUMNS, destinationTerm);
    const rows = await db
      .select({
        numeroRuta: urbanRoutes.route_number,
        zona: urbanRoutes.zone,
        horario: urbanRoutes.horario,
        paradasPrincipales: urbanRoutes.stops,
        tarifa: urbanRoutes.fare,
        coincideOrigen: sql<boolean>`${originHit}`,
        coincideDestino: sql<boolean>`${destinationHit}`,
      })
      .from(urbanRoutes)
      .where(or(originHit, destinationHit))
      .limit(60);

    for (const row of rows) {
      const match: UrbanRouteMatch = {
        tipo: "urbana",
        numeroRuta: row.numeroRuta,
        zona: row.zona,
        horario: row.horario,
        paradasPrincipales:
          row.paradasPrincipales && row.paradasPrincipales.length > 220
            ? `${row.paradasPrincipales.slice(0, 220)}…`
            : row.paradasPrincipales,
        tarifa: row.tarifa,
      };
      if (row.coincideOrigen && row.coincideDestino) result.conexionesDirectas.urbanas.push(match);
      else if (row.coincideOrigen) result.sirvenOrigen.urbanas.push(match);
      else result.sirvenDestino.urbanas.push(match);
    }
  }

  if (kinds.includes("interurban")) {
    // La fila interurbana es terminal de Managua -> lista de destinos. Por eso
    // hay que separar "el origen ES esa terminal" (conexión real) de "el origen
    // también es un destino de esa terminal" (viaje por tramos).
    const terminalHit = matchesAny([interurbanRoutes.terminal], originTerm);
    const originDestHit = matchesAny([interurbanRoutes.destination], originTerm);
    const destinationHit = matchesAny([interurbanRoutes.destination], destinationTerm);
    const rows = await db
      .select({
        terminal: interurbanRoutes.terminal,
        destino: interurbanRoutes.destination,
        horariosFrecuencia: interurbanRoutes.horario_frecuencia,
        precio: interurbanRoutes.price,
        coincideTerminal: sql<boolean>`${terminalHit}`,
        origenEsDestino: sql<boolean>`${originDestHit}`,
        coincideDestino: sql<boolean>`${destinationHit}`,
      })
      .from(interurbanRoutes)
      .where(or(terminalHit, originDestHit, destinationHit))
      .limit(60);

    for (const row of rows) {
      // El detalle por destino se busca con el destino del viaje y, si la celda
      // lo separa por el otro extremo, con el origen.
      const detalle = (raw: string | null) =>
        detalleDelDestino(raw, destinationTerm) ?? detalleDelDestino(raw, originTerm);

      const match: InterurbanRouteMatch = {
        tipo: "interurbana",
        terminal: row.terminal,
        destino: row.destino,
        horariosFrecuencia: row.horariosFrecuencia,
        precio: row.precio,
        horarioDelDestino: detalle(row.horariosFrecuencia),
        precioDelDestino: detalle(row.precio),
      };
      if (row.coincideTerminal && row.coincideDestino) {
        result.conexionesDirectas.interurbanas.push(match);
      } else if (row.origenEsDestino && row.coincideDestino) {
        result.viaMismaTerminal.interurbanas.push(match);
      } else if (row.coincideTerminal || row.origenEsDestino) {
        result.sirvenOrigen.interurbanas.push(match);
      } else {
        result.sirvenDestino.interurbanas.push(match);
      }
    }
  }

  const count = (bucket: BusRouteMatches) => bucket.urbanas.length + bucket.interurbanas.length;
  const conexionesDirectas = count(result.conexionesDirectas);
  const viaMismaTerminal = count(result.viaMismaTerminal);
  const sirvenOrigen = count(result.sirvenOrigen);
  const sirvenDestino = count(result.sirvenDestino);
  result.resumen = {
    conexionesDirectas,
    viaMismaTerminal,
    sirvenOrigen,
    sirvenDestino,
    totalCoincidencias: conexionesDirectas + viaMismaTerminal + sirvenOrigen + sirvenDestino,
  };

  setCachedRoute(cacheKey, result);
  return result;
}

/**
 * Registro anónimo (sin datos personales) de la búsqueda. `success` es `true`
 * solo cuando existe una conexión directa, así que las filas con
 * `success = false` son los pares origen/destino que el agente semanal debe
 * investigar.
 */
export async function logRouteSearch(
  result: Pick<BusRouteSearchResult, "origin" | "destination" | "type" | "resumen">,
): Promise<void> {
  try {
    await db.insert(routeSearchLog).values({
      origin: result.origin || null,
      destination: result.destination || null,
      type: result.type,
      success: result.resumen.conexionesDirectas > 0,
      routeCount: result.resumen.totalCoincidencias,
    });
  } catch (error) {
    console.error("Error inserting route search log (continuing):", error);
  }
}

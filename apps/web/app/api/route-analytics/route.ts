import { NextResponse } from "next/server";
import { desc, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { routeSearchLog } from "@/lib/db/schema";

// Registro anónimo de búsquedas de rutas por parte de los usuarios, para que
// el agente semanal identifique qué orígenes/destinos se buscan sin resultados
// (datos faltantes) y complete la base.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const entry = {
      origin: typeof body?.origin === "string" ? body.origin : null,
      destination: typeof body?.destination === "string" ? body.destination : null,
      type: body?.type ?? "both",
      success: Boolean(body?.success),
      routeCount: Number(body?.route_count ?? body?.routeCount ?? 0),
    };

    let inserted = null;
    try {
      const rows = await db
        .insert(routeSearchLog)
        .values({
          origin: entry.origin,
          destination: entry.destination,
          type: entry.type,
          success: entry.success,
          routeCount: entry.routeCount,
        })
        .returning({ id: routeSearchLog.id });
      inserted = rows[0];
    } catch (error) {
      console.error("Error inserting route search log (continuing):", error);
    }

    return NextResponse.json({ success: true, logged: entry, id: inserted?.id ?? null });
  } catch (error) {
    console.error("Error logging conversation:", error);
    return NextResponse.json(
      { error: "Failed to log conversation" },
      { status: 500 },
    );
  }
}

// Estadísticas semanales: destinos más buscados y búsquedas sin resultado
// (datos faltantes que la investigación semanal debe cubrir).
export async function GET() {
  try {
    const [countRow] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(routeSearchLog);

    const [missingRow] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(routeSearchLog)
      .where(sql`${routeSearchLog.success} = false`);

    const topOrigins = await db
      .select({
        value: routeSearchLog.origin,
        count: sql<number>`count(*)::int`,
      })
      .from(routeSearchLog)
      .where(sql`${routeSearchLog.origin} is not null`)
      .groupBy(routeSearchLog.origin)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    const topDestinations = await db
      .select({
        value: routeSearchLog.destination,
        count: sql<number>`count(*)::int`,
      })
      .from(routeSearchLog)
      .where(sql`${routeSearchLog.destination} is not null`)
      .groupBy(routeSearchLog.destination)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    const missing = await db
      .select({
        origin: routeSearchLog.origin,
        destination: routeSearchLog.destination,
        count: sql<number>`count(*)::int`,
      })
      .from(routeSearchLog)
      .where(sql`${routeSearchLog.success} = false`)
      .groupBy(routeSearchLog.origin, routeSearchLog.destination)
      .orderBy(desc(sql`count(*)`))
      .limit(20);

    return NextResponse.json({
      totalLogs: countRow?.total ?? 0,
      sinResultado: missingRow?.total ?? 0,
      topOrigenes: topOrigins.map((r) => [r.value, r.count]),
      topDestinos: topDestinations.map((r) => [r.value, r.count]),
      datosFaltantes: missing.map((r) => ({
        origin: r.origin,
        destination: r.destination,
        count: r.count,
      })),
      analisis:
        "Búsquedas con success = false no encontraron una conexión directa entre ese origen y destino; el agente semanal debe investigarlas. route_count registra cuántas coincidencias parciales hubo.",
    });
  } catch (error) {
    console.error("Error analyzing route searches:", error);
    return NextResponse.json(
      { error: "Failed to analyze route searches" },
      { status: 500 },
    );
  }
}
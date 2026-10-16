import { NextResponse } from "next/server";
import { logRouteSearch, searchBusRoutes } from "@/lib/bus-routes";

// Busca rutas urbanas e interurbanas en la base de datos Neon y clasifica cada
// coincidencia como conexión directa, ruta que sirve al origen o ruta que sirve
// al destino.
// Uso: GET /api/bus-routes?origin=Chinandega&destination=San%20Juan%20del%20Sur&type=interurban
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = (searchParams.get("origin") || "").trim();
  const destination = (searchParams.get("destination") || "").trim();
  const requestedType = searchParams.get("type") || "both";

  if (!origin && !destination) {
    return NextResponse.json(
      { error: "Proporciona origin y/o destination." },
      { status: 400 },
    );
  }

  try {
    const result = await searchBusRoutes({ origin, destination, type: requestedType });

    // Registro anónimo (sin datos personales) para detectar datos faltantes.
    await logRouteSearch(result);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error searching routes:", error);
    return NextResponse.json(
      { error: "Failed to search routes", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
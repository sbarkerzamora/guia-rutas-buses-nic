// Busca rutas de bus en Nicaragua consultando la base de datos Neon
// directamente con drizzle (misma base que expone la API /api/bus-routes).
// El nombre del archivo (search_bus_routes) es el nombre con que el modelo ve
// la herramienta: snake_case ASCII.
import { defineTool } from "eve/tools";
import { z } from "zod";
import { logRouteSearch, searchBusRoutes } from "../../apps/web/lib/bus-routes";

export default defineTool({
  description:
    "Busca rutas de transporte público en Nicaragua: rutas urbanas de Managua (numero de ruta, zona, horario, paradas, tarifa 2.50 NIO) y rutas interurbanas desde las terminales de Managua (La UCA, Roberto Huembes, Israel Lewites, Mayoreo, Ivan Montenegro) hacia ciudades como Granada, León, Rivas, San Juan del Sur, Masaya, Chinandega, Matagalpa, Estelí, Jinotega, Ocotal, etc. Cada fila interurbana trae ademas `horarioDelDestino` y `precioDelDestino`: el horario y la tarifa que la terminal publica para ese destino en concreto. Devuelve solo las conexiones que cubren el viaje completo en `conexionesDirectas`; `viaMismaTerminal`, `sirvenOrigen` y `sirvenDestino` son coincidencias parciales que sirven para armar el viaje por tramos y nunca deben presentarse como conexiones.",
  inputSchema: z.object({
    origin: z
      .string()
      .min(1)
      .describe(
        "Origen: lugar concreto (ciudad, barrio/colonia, terminal, mercado o parada), ej. 'Chinandega', 'Zumen', 'Mercado Iván Montenegro', 'Terminal La UCA'. Evita 'Managua' a secas: las rutas urbanas se buscan por barrio, mercado o parada.",
      ),
    destination: z
      .string()
      .min(1)
      .describe(
        "Destino: ciudad, barrio, terminal o parada (ej. 'San Juan del Sur', 'Granada', 'León', 'Mercado El Mayoreo').",
      ),
    type: z
      .enum(["urban", "interurban", "both"])
      .optional()
      .default("both")
      .describe(
        "'urban' busca rutas dentro de Managua; 'interurban' busca rutas entre ciudades; 'both' (default) busca en ambos.",
      ),
  }),
  async execute({ origin, destination, type }) {
    const result = await searchBusRoutes({ origin, destination, type });

    // El registro no debe bloquear la respuesta al usuario.
    void logRouteSearch(result);

    return result;
  },
});
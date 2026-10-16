// Neon MCP server — hosted at https://mcp.neon.tech/mcp (Streamable HTTP).
//
// This connection lets the eve agent inspect the Neon Postgres database that
// stores the Nicaragua transport data (urban_routes, interurban_routes, stops,
// route_stops, route_search_log). Read-only mode is enabled so the agent can
// only query, never modify the database.
//
// Auth uses a Neon API key (https://neon.tech/docs/manage/api-keys). Set
// NEON_API_KEY in .env.local. When the key is missing, this connection simply
// reports "authorization required" and falls back to the `search_bus_routes`
// tool, which reads the same database directly.
import {
  ConnectionAuthorizationRequiredError,
  defineMcpClientConnection,
} from "eve/connections";

export default defineMcpClientConnection({
  url: "https://mcp.neon.tech/mcp?readonly=true",
  description:
    "Neon Postgres database with Nicaragua public transport data: urban bus routes of Managua (zones, route numbers, schedules, stops, fare 2.50 NIO), interurban routes from Managua terminals (La UCA, Roberto Huembes, Israel Lewites, Mayoreo, Ivan Montenegro) to Granada, León, Rivas, San Juan del Sur, Matagalpa and more.",
  auth: {
    getToken: async () => {
      const token = process.env.NEON_API_KEY?.trim();
      if (!token) {
        throw new ConnectionAuthorizationRequiredError("neon", {
          message:
            "The Neon MCP connection needs a NEON_API_KEY. Set NEON_API_KEY in .env.local (https://neon.tech/docs/manage/api-keys). Meanwhile, use the search_bus_routes tool, which reads the same data.",
        });
      }
      return { token };
    },
  },
});
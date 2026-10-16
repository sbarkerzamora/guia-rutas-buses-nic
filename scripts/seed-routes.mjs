// Seed script: carga las rutas de bus desde los CSV en docs/ hacia Neon Postgres.
// Uso:  node scripts/seed-routes.mjs
// Necesita DATABASE_URL (se lee de .env.local o del entorno).
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnv() {
  try {
    const raw = readFileSync(join(root, ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (m && !(m[1] in process.env)) {
        let value = m[2].trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        process.env[m[1]] = value;
      }
    }
  } catch {
    // no .env.local present
  }
}

// CSV simple: respeta comillas dobles para campos con comas.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (field !== "" || row.length > 0) {
        row.push(field);
        rows.push(row);
      }
      field = "";
      row = [];
      // skip \r\n
      if (ch === "\r" && text[i + 1] === "\n") i++;
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

const docsDir = join(root, "docs");
const urbanFiles = readdirSync(docsDir).filter((f) => f.includes("Rutas Urbanas Managua"));
const interFiles = readdirSync(docsDir).filter((f) => f.includes("Interurbanos Managua"));

if (urbanFiles.length !== 1 || interFiles.length !== 1) {
  console.error("No se encontraron los CSV esperados en docs/.", { urbanFiles, interFiles });
  process.exit(1);
}

const urbanCsv = parseCsv(readFileSync(join(docsDir, urbanFiles[0]), "utf8"));
const interCsv = parseCsv(readFileSync(join(docsDir, interFiles[0]), "utf8"));

// Cabeceras: [Zona / Categoría, Número de Ruta, Horario, Puntos de Transbordo / Paradas Principales, Tarifa]
const urbanHeader = urbanCsv[0];
const uZone = urbanHeader.findIndex((h) => h.includes("Zona"));
const uNum = urbanHeader.findIndex((h) => h.includes("Número"));
const uHor = urbanHeader.findIndex((h) => h.includes("Horario"));
const uStops = urbanHeader.findIndex((h) => h.includes("Paradas"));
const uFare = urbanHeader.findIndex((h) => h.includes("Tarifa"));

const urbanRows = urbanCsv.slice(1).map((r) => ({
  zone: (r[uZone] ?? "").trim(),
  route_number: (r[uNum] ?? "").trim(),
  horario: (r[uHor] ?? "").trim(),
  stops: (r[uStops] ?? "").trim(),
  fare: (r[uFare] ?? "").trim(),
}));

// Cabeceras: [Terminal, Destino, Horarios/Frecuencia, Precio (NIO)]
const interHeader = interCsv[0];
const iTerm = interHeader.findIndex((h) => h.includes("Terminal"));
const iDest = interHeader.findIndex((h) => h.includes("Destino"));
const iHor = interHeader.findIndex((h) => h.includes("Horarios"));
const iPrice = interHeader.findIndex((h) => h.includes("Precio"));

const interRows = interCsv.slice(1).map((r) => ({
  terminal: (r[iTerm] ?? "").trim(),
  destination: (r[iDest] ?? "").trim(),
  horario_frecuencia: (r[iHor] ?? "").trim(),
  price: (r[iPrice] ?? "").trim(),
}));

loadEnv();
const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("DATABASE_URL no está definida.");
  process.exit(1);
}

const sql = neon(url);

async function main() {
  // Limpia antes de sembrar (idempotente).
  await sql`
    TRUNCATE route_stops, urban_routes, interurban_routes, stops RESTART IDENTITY
  `;
  let done = 0;
  for (const u of urbanRows) {
    await sql`
      INSERT INTO urban_routes (zone, route_number, horario, stops, fare, route_type)
      VALUES (${u.zone}, ${u.route_number}, ${u.horario}, ${u.stops}, ${u.fare}, 'urban')
    `;
    done++;
  }
  console.log(`urban_routes: ${done} rutas`);

  done = 0;
  for (const d of interRows) {
    await sql`
      INSERT INTO interurban_routes (terminal, destination, horario_frecuencia, price, route_type)
      VALUES (${d.terminal}, ${d.destination}, ${d.horario_frecuencia}, ${d.price}, 'interurban')
    `;
    done++;
  }
  console.log(`interurban_routes: ${done} rutas`);

  const [counts] = await sql`
    SELECT
      (SELECT count(*) FROM urban_routes) AS urban,
      (SELECT count(*) FROM interurban_routes) AS interurban
  `;
  console.log("Verificación en Neon:", counts);
  process.exit(0);
}

main().catch((err) => {
  console.error("Error sembrando datos:", err);
  process.exit(1);
});
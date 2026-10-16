import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { ClientSessionState, MessageStreamEvent } from "eve/client";

// Urban bus routes from CSV: Rutas Urbanas Managua (TUC)
export const urbanRoutes = pgTable(
  "urban_routes",
  {
    id: serial("id").primaryKey(),
    zone: text("zone"),
    route_number: text("route_number"), // may be "102", "MR4", "125 CS", "Vanegas", ...
    horario: text("horario"),
    stops: text("stops"), // comma-separated list of main stops
    fare: text("fare"), // in NIO
    route_type: text("route_type").default("urban"),
  },
  (table) => [
    index("idx_urban_routes_number").on(table.route_number),
    index("idx_urban_routes_zone").on(table.zone),
  ],
);

// Interurban bus routes from CSV: Nicaragua - Interurbanos Managua
export const interurbanRoutes = pgTable(
  "interurban_routes",
  {
    id: serial("id").primaryKey(),
    terminal: text("terminal"),
    destination: text("destination"),
    horario_frecuencia: text("horario_frecuencia"),
    price: text("price"), // in NIO
    route_type: text("route_type").default("interurban"),
  },
  (table) => [
    index("idx_interurban_terminal").on(table.terminal),
    index("idx_interurban_destination").on(table.destination),
  ],
);

// Bus stops/terminals
export const stops = pgTable("stops", {
  id: serial("id").primaryKey(),
  name: text("name"),
  terminal: text("terminal"),
  description: text("description"),
});

// Route stops relationship
export const routeStops = pgTable("route_stops", {
  id: serial("id").primaryKey(),
  routeId: integer("route_id").references(() => urbanRoutes.id, { onDelete: "cascade" }),
  stopName: text("stop_name"),
  order_index: integer("order_index"),
  type: text("type"), // "urban" or "interurban"
});

// Anonymized log of route searches. No personally identifiable information.
// The weekly agent reads this to find which origin/destination pairs are
// searched without a direct route (`success = false`), so the missing data can
// be researched.
export const routeSearchLog = pgTable("route_search_log", {
  id: serial("id").primaryKey(),
  origin: text("origin"),
  destination: text("destination"),
  type: text("type").default("interurban"), // "urban" | "interurban"
  success: boolean("success").notNull().default(false),
  routeCount: integer("route_count").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const chat = pgTable(
  "chat",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("New chat"),
    eveSession: jsonb("eve_session").$type<ClientSessionState | null>(),
    pendingUserMessage: text("pending_user_message"),
    pendingUserMessageCreatedAt: timestamp("pending_user_message_created_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_chat_user_updated").on(table.userId, table.updatedAt),
    index("idx_chat_user_created").on(table.userId, table.createdAt),
  ],
);

export const chatEvent = pgTable(
  "chat_event",
  {
    id: text("id").primaryKey(),
    chatId: text("chat_id")
      .notNull()
      .references(() => chat.id, { onDelete: "cascade" }),
    eventIndex: integer("event_index").notNull(),
    event: jsonb("event")
      .$type<MessageStreamEvent>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_chat_event_chat").on(table.chatId),
    uniqueIndex("idx_chat_event_chat_index").on(table.chatId, table.eventIndex),
  ],
);

export type Chat = typeof chat.$inferSelect;
export type ChatEvent = typeof chatEvent.$inferSelect;
export type User = typeof user.$inferSelect;
CREATE TABLE "route_search_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"origin" text,
	"destination" text,
	"type" text DEFAULT 'interurban',
	"success" boolean DEFAULT false NOT NULL,
	"route_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "urban_routes" ALTER COLUMN "route_number" SET DATA TYPE text;
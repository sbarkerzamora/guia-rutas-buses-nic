CREATE TABLE "interurban_routes" (
	"id" serial PRIMARY KEY NOT NULL,
	"terminal" text,
	"destination" text,
	"horario_frecuencia" text,
	"price" text,
	"route_type" text DEFAULT 'interurban'
);
--> statement-breakpoint
CREATE TABLE "route_stops" (
	"id" serial PRIMARY KEY NOT NULL,
	"route_id" integer,
	"stop_name" text,
	"order_index" integer,
	"type" text
);
--> statement-breakpoint
CREATE TABLE "stops" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text,
	"terminal" text,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "urban_routes" (
	"id" serial PRIMARY KEY NOT NULL,
	"zone" text,
	"route_number" integer,
	"horario" text,
	"stops" text,
	"fare" text,
	"route_type" text DEFAULT 'urban'
);
--> statement-breakpoint
ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_route_id_urban_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."urban_routes"("id") ON DELETE cascade ON UPDATE no action;
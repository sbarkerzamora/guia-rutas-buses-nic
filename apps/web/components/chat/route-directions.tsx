"use client";

import { useState, type ReactNode } from "react";
import {
  ArrowRight,
  Bus,
  CaretDown,
  CheckCircle,
  Clock,
  CurrencyDollar,
  Flag,
  Footprints,
  Info,
  MapPin,
  Path,
  Signpost,
  Tag,
  Ticket,
  Timer,
  WarningCircle,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type {
  BusRouteSearchResult,
  InterurbanRouteMatch,
  UrbanRouteMatch,
} from "@/lib/bus-routes";
import { useLocale } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";

type Translate = (key: string) => string;
type StepKind = "walk" | "bus" | "transfer" | "arrive";

type Chip = {
  readonly icon?: "clock" | "money" | "zone" | "ticket";
  readonly label: string;
};

/** Salidas de la terminal para el destino buscado. */
type Departures = {
  readonly horario: string | null;
  readonly precio: string;
  readonly nota: string | null;
  readonly terminal: string | null;
  readonly destinos: readonly string[];
  readonly elegido: string | null;
};

type Step = {
  readonly id: string;
  readonly kind: StepKind;
  readonly title: string;
  readonly detail?: string | null;
  readonly chips?: readonly Chip[];
  readonly stops?: readonly string[];
  readonly salidas?: Departures;
};

type Alternative = {
  readonly id: string;
  readonly label: string;
  readonly detail: string | null;
  readonly chips: readonly Chip[];
  readonly notas?: string | null;
  readonly stops?: readonly string[];
};

type TerminalAccess = {
  readonly terminal: string;
  /** Pasan por el origen y además llegan a la terminal. */
  readonly directas: readonly UrbanRouteMatch[];
  /** Solo pasan por el origen: pistas para preguntar en la parada. */
  readonly cercanas: readonly UrbanRouteMatch[];
};

type Card = {
  readonly steps: readonly Step[];
  readonly notice: string | null;
  readonly noticeTone: "warning" | "info" | "success";
  readonly alternatives: readonly Alternative[];
  readonly access: TerminalAccess | null;
  readonly totalFare: number | null;
};

function currency(value: string | null, unknownFare: string): string {
  if (!value) return unknownFare;
  return value.includes("NIO") ? value : `${value} NIO`;
}

/**
 * La columna de precio interurbana mezcla tarifas con notas ("Masaya (Buses 13,
 * Micro 19), León (Micro 61-78)"). Devuelve el texto a mostrar como pasaje y,
 * cuando la celda es prosa y no un precio, la nota cruda aparte.
 */
function fareInfo(
  value: string | null,
  t: Translate,
): { readonly text: string; readonly note: string | null } {
  const clean = value?.trim() ?? "";
  if (!clean) return { text: t("route.unknownFare"), note: null };
  if (/^\d+(?:[.,]\d+)?$/u.test(clean)) return { text: `${clean} NIO`, note: null };
  if (clean.length <= 24 || /^\d/u.test(clean)) return { text: clean, note: null };
  return { text: t("route.unknownFare"), note: clean };
}

/** "Terminal La UCA" ya incluye la palabra; las etiquetas ya la traen. */
function terminalName(value: string): string {
  return value.replace(/^terminal\s+/iu, "");
}

/** El destino buscado dentro de la lista de destinos que atiende la terminal. */
function targetOf(route: InterurbanRouteMatch, searched: string): string {
  const destinos = (route.destino ?? "")
    .split(/,\s*/u)
    .map((destino) => destino.trim())
    .filter(Boolean);
  return destinos.find((destino) => mentionsTerminal(destino, searched)) ?? searched;
}

/** Solo cuando la celda es un número limpio; nunca adivina dentro de texto. */
function parseFare(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = value.trim().match(/^(\d+(?:[.,]\d+)?)\s*(?:NIO)?$/i);
  return match ? Number(match[1].replace(",", ".")) : null;
}

function routeNumber(route: UrbanRouteMatch): string {
  return route.numeroRuta ?? "s/n";
}

function routeLabel(route: UrbanRouteMatch): string {
  return `${routeNumber(route)}${route.zona ? ` · ${route.zona}` : ""}`;
}

/** Las paradas vienen como lista separada por comas en una sola celda. */
function stopList(value: string | null | undefined): string[] {
  return (value ?? "")
    .split(/,\s*/u)
    .map((stop) => stop.trim())
    .filter(Boolean);
}

function urbanChips(route: UrbanRouteMatch, t: Translate): Chip[] {
  const chips: Chip[] = [];
  if (route.zona) chips.push({ icon: "zone", label: route.zona });
  chips.push({ icon: "clock", label: route.horario ?? t("route.schedule") });
  chips.push({ icon: "money", label: currency(route.tarifa, t("route.unknownFare")) });
  return chips;
}

/** "Mercado Roberto Huembes" y "Roberto Huembes" son la misma terminal. */
const IGNORED_WORDS = new Set(["terminal", "mercado", "de", "la", "el", "los", "las", "del"]);

function significantWords(value: string): string[] {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/u)
    .filter((word) => word.length > 2 && !IGNORED_WORDS.has(word));
}

function mentionsTerminal(text: string, terminal: string): boolean {
  const words = new Set(significantWords(text));
  const needed = significantWords(terminal);
  return words.size > 0 && needed.length > 0 && needed.every((word) => words.has(word));
}

function stopCount(route: UrbanRouteMatch): number | null {
  const stops = stopList(route.paradasPrincipales);
  return stops.length > 0 ? stops.length : null;
}

function departuresFor(
  route: InterurbanRouteMatch,
  searched: string,
  t: Translate,
): Departures {
  const destinos = (route.destino ?? "")
    .split(/,\s*/u)
    .map((destino) => destino.trim())
    .filter(Boolean);
  const fare = fareInfo(route.precioDelDestino ?? route.precio, t);

  return {
    horario: route.horarioDelDestino ?? route.horariosFrecuencia ?? t("route.schedule"),
    precio: fare.text,
    nota: fare.note,
    terminal: route.terminal ? terminalName(route.terminal) : null,
    destinos,
    elegido: destinos.find((destino) => mentionsTerminal(destino, searched)) ?? null,
  };
}

function interurbanSteps(
  route: InterurbanRouteMatch,
  origin: string,
  destination: string,
  t: Translate,
  originHint: string | null,
): Step[] {
  const target = targetOf(route, destination);
  const steps: Step[] = [];

  // El paso de terminal solo aporta si el origen todavía no es esa terminal.
  if (route.terminal && !mentionsTerminal(origin, route.terminal)) {
    steps.push({
      id: "terminal",
      kind: "transfer",
      title: `${t("route.goToTerminal")} ${terminalName(route.terminal)}`,
      detail: originHint,
    });
  }

  steps.push({
    id: "board",
    kind: "bus",
    title: `${t("route.boardTo")} ${target}`,
    salidas: departuresFor(route, destination, t),
  });
  steps.push({ id: "arrive", kind: "arrive", title: `${t("route.arrive")} ${target}` });

  return steps;
}

function urbanSteps(
  route: UrbanRouteMatch,
  destination: string,
  t: Translate,
  originHint: string | null,
): Step[] {
  const label = routeNumber(route);

  return [
    {
      id: "walk",
      kind: "walk",
      title: `${t("route.walkToStop")} ${label}`,
      detail: originHint,
    },
    {
      id: "board",
      kind: "bus",
      title: `${t("route.boardRoute")} ${label}`,
      chips: urbanChips(route, t),
      stops: stopList(route.paradasPrincipales),
    },
    { id: "arrive", kind: "arrive", title: `${t("route.arrive")} ${destination}` },
  ];
}

/** Rutas urbanas que sirven al origen y, entre ellas, las que llegan a la terminal. */
function buildAccess(
  terminal: string | null,
  urbanas: readonly UrbanRouteMatch[],
): TerminalAccess | null {
  if (!terminal) return null;
  const cercanas = urbanas.filter((route) => route.numeroRuta);
  if (cercanas.length === 0) return null;

  const directas = cercanas.filter((route) =>
    mentionsTerminal(route.paradasPrincipales ?? "", terminal),
  );
  return {
    terminal,
    directas,
    cercanas: cercanas.filter((route) => !directas.includes(route)),
  };
}

/**
 * Solo se muestra un total cuando la tarifa de cada tramo está registrada: sumar
 * lo conocido y callar el resto daría un costo falso.
 */
function totalFare(fares: readonly (number | null)[]): number | null {
  if (fares.length === 0 || fares.some((fare) => fare === null)) return null;
  return fares.reduce<number>((total, fare) => total + (fare ?? 0), 0);
}

/**
 * Ordena las terminales que sirven al destino: primero la que el origen puede
 * alcanzar con una ruta urbana (es la que permite dibujar "cómo llegar"), luego
 * la que trae precio y horario propios del destino.
 */
function orderTerminals(
  routes: readonly InterurbanRouteMatch[],
  urbanas: readonly UrbanRouteMatch[],
): InterurbanRouteMatch[] {
  const weight = (route: InterurbanRouteMatch): number => {
    const terminal = route.terminal;
    const reachable =
      terminal !== null &&
      urbanas.some((urban) => mentionsTerminal(urban.paradasPrincipales ?? "", terminal));
    return (reachable ? 100 : 0) + (route.precioDelDestino ? 2 : 0) + (route.horarioDelDestino ? 1 : 0);
  };
  return [...routes].sort((a, b) => weight(b) - weight(a));
}

/** Las terminales con precio u horario propio del destino van primero. */
function byKnownDetail(routes: readonly InterurbanRouteMatch[]): InterurbanRouteMatch[] {
  return orderTerminals(routes, []);
}

function buildCard(result: BusRouteSearchResult, t: Translate): Card {
  const directUrban = result.conexionesDirectas.urbanas;
  const directInterurban = result.conexionesDirectas.interurbanas;
  const transfer = result.viaMismaTerminal.interurbanas;
  const originHint =
    result.sirvenOrigen.urbanas.length > 0
      ? `${t("route.routesNearOrigin")}: ${result.sirvenOrigen.urbanas
          .slice(0, 2)
          .map(routeLabel)
          .join(", ")}`
      : null;

  const alternativesFromUrban = (routes: readonly UrbanRouteMatch[]): Alternative[] =>
    routes.map((route) => ({
      id: `urban-${route.numeroRuta ?? routeLabel(route)}`,
      label: routeLabel(route),
      detail: route.horario,
      chips: [{ icon: "money", label: currency(route.tarifa, t("route.unknownFare")) }],
      stops: stopList(route.paradasPrincipales),
    }));

  const alternativesFromInterurban = (routes: readonly InterurbanRouteMatch[]): Alternative[] =>
    byKnownDetail(routes).map((route) => {
      const fare = fareInfo(route.precioDelDestino ?? route.precio, t);
      return {
        id: `interurban-${route.terminal ?? ""}-${route.destino ?? ""}`,
        label: `${route.terminal ? terminalName(route.terminal) : t("route.originFallback")} → ${targetOf(route, result.destination)}`,
        detail: route.horarioDelDestino ?? route.horariosFrecuencia,
        chips: [{ icon: "ticket", label: fare.text }],
        notas: fare.note,
      };
    });

  if (directUrban.length > 0) {
    const route = directUrban[0];
    return {
      steps: urbanSteps(route, result.destination, t, originHint),
      notice: null,
      noticeTone: "success",
      alternatives: [
        ...alternativesFromUrban(directUrban.slice(1)),
        ...alternativesFromInterurban(directInterurban),
      ],
      access: null,
      totalFare: totalFare([parseFare(route.tarifa)]),
    };
  }

  if (directInterurban.length > 0) {
    const route = directInterurban[0];
    return {
      steps: interurbanSteps(route, result.origin, result.destination, t, originHint),
      notice: null,
      noticeTone: "success",
      alternatives: alternativesFromInterurban(directInterurban.slice(1)),
      access: null,
      totalFare: totalFare([parseFare(route.precioDelDestino)]),
    };
  }

  if (transfer.length > 0) {
    const ordered = orderTerminals(transfer, result.sirvenOrigen.urbanas);
    const route = ordered[0]!;
    const target = targetOf(route, result.destination);
    return {
      steps: [
        {
          id: "terminal",
          kind: "transfer",
          title: route.terminal
            ? `${t("route.goToTerminal")} ${terminalName(route.terminal)}`
            : `${t("route.boardTo")} ${target}`,
          detail: originHint,
        },
        {
          id: "board",
          kind: "bus",
          title: `${t("route.boardTo")} ${target}${
            route.terminal ? ` ${t("route.fromTerminal")} ${terminalName(route.terminal)}` : ""
          }`,
          salidas: departuresFor(route, target, t),
        },
        { id: "arrive", kind: "arrive", title: `${t("route.arrive")} ${target}` },
      ],
      notice: t("route.viaTerminal"),
      noticeTone: "warning",
      alternatives: alternativesFromInterurban(ordered.slice(1)),
      access: buildAccess(route.terminal, result.sirvenOrigen.urbanas),
      totalFare: totalFare([
        parseFare(result.sirvenOrigen.urbanas[0]?.tarifa),
        parseFare(route.precioDelDestino),
      ]),
    };
  }

  const destinationTerminals = orderTerminals(
    result.sirvenDestino.interurbanas,
    result.sirvenOrigen.urbanas,
  );
  const destinationTerminal = destinationTerminals[0] ?? null;
  const originRoute = result.sirvenOrigen.urbanas[0];
  const destinationRoute = result.sirvenDestino.urbanas[0];
  const steps: Step[] = [];

  if (originRoute) {
    steps.push({
      id: "origin",
      kind: "bus",
      title: `${t("route.forOrigin")} · ${t("route.boardRoute")} ${routeNumber(originRoute)}`,
      chips: urbanChips(originRoute, t),
      stops: stopList(originRoute.paradasPrincipales),
    });
  }

  if (destinationTerminal) {
    steps.push({
      id: "terminal",
      kind: "transfer",
      title: destinationTerminal.terminal
        ? `${t("route.forDestination")} · ${t("route.goToTerminal")} ${terminalName(destinationTerminal.terminal)}`
        : `${t("route.forDestination")} · ${t("route.boardTo")} ${targetOf(destinationTerminal, result.destination)}`,
      salidas: departuresFor(destinationTerminal, result.destination, t),
    });
  } else if (destinationRoute) {
    steps.push({
      id: "destination",
      kind: "bus",
      title: `${t("route.forDestination")} · ${t("route.boardRoute")} ${routeNumber(destinationRoute)}`,
      chips: urbanChips(destinationRoute, t),
      stops: stopList(destinationRoute.paradasPrincipales),
    });
  }

  if (steps.length > 0) {
    steps.push({
      id: "arrive",
      kind: "arrive",
      title: `${t("route.arrive")} ${result.destination}`,
    });
  }

  return {
    steps,
    notice: t("route.noDirect"),
    noticeTone: "info",
    alternatives: alternativesFromInterurban(destinationTerminals.slice(1)),
    access: buildAccess(
      destinationTerminal?.terminal ?? null,
      result.sirvenOrigen.urbanas,
    ),
    totalFare: totalFare([
      parseFare(originRoute?.tarifa),
      parseFare(destinationTerminal?.precioDelDestino),
    ]),
  };
}

export function RouteDirections({ result }: { readonly result: BusRouteSearchResult }) {
  const { t } = useLocale();
  const card = buildCard(result, t);
  const direct = result.conexionesDirectas.urbanas.length + result.conexionesDirectas.interurbanas.length > 0;

  return (
    <section className="my-3 w-full max-w-2xl overflow-hidden rounded-xl border border-border/70 bg-card/70 shadow-sm">
      <header className="flex flex-wrap items-center gap-3 border-b border-border/60 bg-muted/30 px-3 py-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Path className="size-4" weight="bold" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
            <MapPin className="size-3.5 shrink-0 text-muted-foreground" weight="bold" />
            <span>{result.origin || t("route.originFallback")}</span>
            <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
            <Flag className="size-3.5 shrink-0 text-muted-foreground" weight="bold" />
            <span>{result.destination || t("route.destinationFallback")}</span>
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
            {card.steps.length > 0 ? (
              <span>
                {card.steps.length} {t("route.steps")}
              </span>
            ) : null}
            {card.totalFare !== null ? (
              <span className="flex items-center gap-1">
                <Ticket className="size-3" />
                {t("route.estimatedTotal")} {card.totalFare.toFixed(2)} NIO
              </span>
            ) : null}
          </p>
        </div>
        {card.steps.length > 0 ? (
          <Badge
            className={direct ? "bg-emerald-600 text-white" : undefined}
            variant={direct ? "default" : "secondary"}
          >
            {direct ? t("route.directBadge") : t("route.transferBadge")}
          </Badge>
        ) : null}
      </header>

      <div className="space-y-3 p-3">
        {card.notice && card.steps.length > 0 ? (
          <p
            className={cn(
              "flex items-start gap-2 rounded-lg p-2 text-xs",
              card.noticeTone === "warning"
                ? "bg-amber-500/10 text-amber-900 dark:text-amber-200"
                : "bg-muted/50 text-muted-foreground",
            )}
          >
            <Info className="mt-0.5 size-3.5 shrink-0" />
            <span>{card.notice}</span>
          </p>
        ) : null}

        {card.steps.length > 0 ? (
          <ol className="space-y-0">
            {card.steps.map((step, index) => (
              <StepRow
                index={index}
                isLast={index === card.steps.length - 1}
                key={step.id}
                step={step}
                t={t}
              />
            ))}
          </ol>
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <WarningCircle className="size-4 shrink-0" />
            {t("route.noData")}
          </p>
        )}

        {card.access ? <TerminalAccessPanel access={card.access} t={t} /> : null}

        {card.alternatives.length > 0 ? (
          <AlternativesList alternatives={card.alternatives} t={t} />
        ) : null}
      </div>
    </section>
  );
}

function StepRow({
  step,
  index,
  isLast,
  t,
}: {
  readonly step: Step;
  readonly index: number;
  readonly isLast: boolean;
  readonly t: Translate;
}) {
  return (
    <li className="relative flex gap-3">
      {!isLast ? (
        <span
          aria-hidden
          className="absolute top-9 bottom-0 left-4 w-px -translate-x-1/2 bg-linear-to-b from-border to-border/10"
        />
      ) : null}
      <span className="flex flex-col items-center">
        <span
          className={cn(
            "relative z-10 mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border",
            KIND_STYLES[step.kind],
          )}
        >
          <StepGlyph kind={step.kind} />
        </span>
      </span>
      <div className="min-w-0 flex-1 space-y-1.5 pb-4">
        <p className="text-sm leading-tight font-medium">{step.title}</p>
        {step.detail ? <p className="text-xs text-muted-foreground">{step.detail}</p> : null}

        {step.chips && step.chips.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {step.chips.map((chip) => (
              <Badge className="font-normal text-muted-foreground" key={chip.label} variant="secondary">
                <ChipGlyph icon={chip.icon} />
                {chip.label}
              </Badge>
            ))}
          </div>
        ) : null}

        {step.salidas ? <DeparturesPanel salidas={step.salidas} t={t} /> : null}

        {step.stops && step.stops.length > 0 ? (
          <Disclosure
            label={`${t("route.showStops")} (${step.stops.length})`}
            labelOpen={`${t("route.hideStops")} (${step.stops.length})`}
          >
            <div className="flex flex-wrap gap-1.5">
              {step.stops.map((stop) => (
                <Badge
                  className="font-normal text-muted-foreground"
                  key={stop}
                  variant="outline"
                >
                  {stop}
                </Badge>
              ))}
            </div>
          </Disclosure>
        ) : null}
      </div>
    </li>
  );
}

/** Salidas, precio y destinos que atiende la terminal para el destino buscado. */
function DeparturesPanel({ salidas, t }: { readonly salidas: Departures; readonly t: Translate }) {
  const otros = salidas.destinos.slice(0, 12);

  return (
    <div className="space-y-2 rounded-lg border border-border/60 bg-background/60 p-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
        <Tooltip>
          <TooltipTrigger asChild>
            {/* tabIndex: el disparador es texto, no un botón; sin foco no hay tooltip con teclado. */}
            <span className="flex items-center gap-1.5 font-medium" tabIndex={0}>
              <Timer className="size-3.5 text-emerald-600 dark:text-emerald-400" weight="bold" />
              {t("route.departures")}: {salidas.horario}
            </span>
          </TooltipTrigger>
          <TooltipContent>{t("route.departuresHint")}</TooltipContent>
        </Tooltip>
        <span className="flex items-center gap-1.5">
          <Ticket className="size-3.5 text-muted-foreground" />
          {t("route.fare")}: {salidas.precio}
        </span>
        {salidas.terminal ? (
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Signpost className="size-3.5" />
            {t("route.fromTerminal")} {salidas.terminal}
          </span>
        ) : null}
      </div>

      {salidas.nota ? (
        <Disclosure label={t("route.fareNotes")} labelOpen={t("route.fareNotes")}>
          <p className="text-[11px] text-muted-foreground">{salidas.nota}</p>
        </Disclosure>
      ) : null}

      {otros.length > 1 ? (
        <Disclosure label={`${t("route.alsoServes")} (${otros.length})`} labelOpen={t("route.hideDestinations")}>
          <div className="flex flex-wrap gap-1.5">
            {otros.map((destino) => {
              const esDestino = salidas.elegido === destino;
              return (
                <Badge
                  className="font-normal"
                  key={destino}
                  variant={esDestino ? "default" : "outline"}
                >
                  <Bus className="size-3" />
                  {destino}
                </Badge>
              );
            })}
          </div>
        </Disclosure>
      ) : null}
    </div>
  );
}

/** Cómo llegar a la terminal desde el origen, con las rutas urbanas del CSV. */
function TerminalAccessPanel({
  access,
  t,
}: {
  readonly access: TerminalAccess;
  readonly t: Translate;
}) {
  const routes = access.directas.length > 0 ? access.directas : access.cercanas;

  return (
    <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-2.5">
      <p className="flex items-center gap-1.5 text-xs font-semibold">
        <Signpost className="size-3.5 text-amber-600 dark:text-amber-400" weight="bold" />
        {t("route.howToReachTerminal")} {access.terminal}
      </p>
      {access.directas.length > 0 ? (
        <p className="text-[11px] text-muted-foreground">{t("route.routesThatReachTerminal")}</p>
      ) : (
        <p className="text-[11px] text-muted-foreground">{t("route.noRouteToTerminal")}</p>
      )}

      <ul className="space-y-1.5">
        {routes.slice(0, 6).map((route) => (
          <li
            className="rounded-md border border-border/60 bg-background/60 p-2 transition-colors hover:border-primary/40"
            key={routeLabel(route)}
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge className="font-semibold" variant="outline">
                <Bus className="size-3" weight="bold" />
                {routeNumber(route)}
              </Badge>
              {route.zona ? <span className="text-[11px] text-muted-foreground">{route.zona}</span> : null}
              {access.directas.includes(route) ? (
                <Badge className="bg-emerald-600 text-white" variant="default">
                  <CheckCircle className="size-3" weight="fill" />
                  {t("route.reachesTerminal")}
                </Badge>
              ) : null}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Badge className="font-normal text-muted-foreground" variant="secondary">
                <ChipGlyph icon="clock" />
                {route.horario ?? t("route.schedule")}
              </Badge>
              <Badge className="font-normal text-muted-foreground" variant="secondary">
                <ChipGlyph icon="money" />
                {currency(route.tarifa, t("route.unknownFare"))}
              </Badge>
              {stopCount(route) ? (
                <Badge className="font-normal text-muted-foreground" variant="secondary">
                  <Path className="size-3" />
                  {stopCount(route)} {t("route.stops")}
                </Badge>
              ) : null}
            </div>
            {route.paradasPrincipales ? (
              <div className="mt-1.5">
                <Disclosure
                  label={t("route.showStops")}
                  labelOpen={t("route.hideStops")}
                >
                  <div className="flex flex-wrap gap-1.5">
                    {stopList(route.paradasPrincipales).map((stop) => (
                      <Badge className="font-normal text-muted-foreground" key={stop} variant="outline">
                        {stop}
                      </Badge>
                    ))}
                  </div>
                </Disclosure>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AlternativesList({
  alternatives,
  t,
}: {
  readonly alternatives: readonly Alternative[];
  readonly t: Translate;
}) {
  return (
    <div className="space-y-2 border-t border-border/60 pt-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <Info className="size-3.5" />
        {t("route.alternatives")} ({alternatives.length})
      </p>
      <ul className="space-y-1.5">
        {alternatives.map((alternative) => (
          <li
            className="rounded-md border border-border/60 p-2 transition-colors hover:border-primary/40"
            key={alternative.id}
          >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="flex items-center gap-1.5 text-xs font-medium">
                <Bus className="size-3.5 shrink-0" />
                {alternative.label}
              </span>
              {alternative.chips.map((chip) => (
                <Badge className="font-normal text-muted-foreground" key={chip.label} variant="secondary">
                  <ChipGlyph icon={chip.icon} />
                  {chip.label}
                </Badge>
              ))}
            </div>
            {alternative.detail ? (
              <p className="mt-1 text-[11px] text-muted-foreground">{alternative.detail}</p>
            ) : null}
            {alternative.notas ? (
              <p className="mt-1 text-[11px] text-muted-foreground">{alternative.notas}</p>
            ) : null}
            {alternative.stops && alternative.stops.length > 0 ? (
              <div className="mt-1.5">
                <Disclosure label={t("route.showStops")} labelOpen={t("route.hideStops")}>
                  <div className="flex flex-wrap gap-1.5">
                    {alternative.stops.map((stop) => (
                      <Badge className="font-normal text-muted-foreground" key={stop} variant="outline">
                        {stop}
                      </Badge>
                    ))}
                  </div>
                </Disclosure>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Fila desplegable reutilizada por paradas, destinos y alternativas. */
function Disclosure({
  label,
  labelOpen,
  children,
}: {
  readonly label: string;
  readonly labelOpen?: string;
  readonly children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible onOpenChange={setOpen} open={open}>
      <CollapsibleTrigger className="group flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground">
        <CaretDown className="size-3.5 transition-transform group-data-[state=open]:rotate-180" />
        {open ? (labelOpen ?? label) : label}
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">{children}</CollapsibleContent>
    </Collapsible>
  );
}

const KIND_STYLES: Record<StepKind, string> = {
  walk: "border-border bg-muted/60 text-muted-foreground",
  bus: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  transfer: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  arrive: "border-primary/40 bg-primary/10 text-primary",
};

function StepGlyph({ kind }: { readonly kind: StepKind }) {
  if (kind === "walk") return <Footprints className="size-4" />;
  if (kind === "bus") return <Bus className="size-4" weight="bold" />;
  if (kind === "transfer") return <Signpost className="size-4" weight="bold" />;
  return <Flag className="size-4" weight="bold" />;
}

function ChipGlyph({ icon }: { readonly icon: Chip["icon"] }) {
  if (icon === "clock") return <Clock className="size-3" />;
  if (icon === "money") return <CurrencyDollar className="size-3" />;
  if (icon === "zone") return <Tag className="size-3" />;
  if (icon === "ticket") return <Ticket className="size-3" />;
  return null;
}

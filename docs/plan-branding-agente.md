# Plan — marca, agente y blindaje (iteración 2)

Decisiones tomadas con el usuario:

1. Idioma: selector en el hero solo para invitados; en el dropdown del usuario cuando hay sesión.
2. Dependencias: actualizar todo de una vez, incluidos majors (`eve 0.80`, `next 16.4`, `react 19.3`).
3. Blindaje: sí a CI en GitHub Actions y Playwright queda como devDependency (E2E del chat).
4. Tarjeta de rutas: línea de tiempo de pasos con un icono por movimiento y texto del agente de 2 líneas.

## 1. Quitar el bloque promocional del footer
- [x] `apps/web/components/chat/template-footer-links.tsx`: eliminar "Build your own chat agent…", `GitHub`, `Deploy` y `Copy Prompt` con su código muerto (`COPY_PROMPT`, `DEPLOY_URL`, `GITHUB_URL`, `DEPLOY_ENV_VARS`, `copyTextToClipboard`, estado `copied`, iconos `Check`/`Copy`). Quedó en 36 líneas.
- [x] Conservar la fila de Términos / Privacidad / Cookies (la usan la home y el shell estático).
- [x] Verificado: el footer renderiza solo "Términos de uso · Privacidad · Cookies" (y su versión en inglés).

## 2. Logo Vercel → marca Path
- [x] `apps/web/components/icons.tsx`: `TransportMarkIcon` (SVG en línea con `currentColor`, segura en server components), misma geometría que `public/icon.svg`.
- [x] Reemplazado en: `components/chat/sidebar.tsx` (header), `app/_components/agent-chat-skeleton.tsx` (header y hero), `components/auth/user-menu.tsx` (avatar). Se dejó `VercelIcon` únicamente en el botón "Sign in with Vercel" y en el modal de OAuth, donde el triángulo denota el proveedor, no la marca de la app.
- [x] `user-menu.tsx`: `onError` en la imagen del avatar → cae en `TransportMarkIcon` (antes quedaba el ícono de imagen rota).
- [x] Hero unificado: home y estado vacío del chat usan `TransportMarkIcon`; se borró `app/_components/transport-icon.tsx` y el `<img src="/eve.svg">`.
- [x] Verificado: claro/oscuro, sidebar, dropdown, skeleton, 390px y 1280px sin errores de consola.

## 3. Idioma al dropdown del usuario
- [x] `apps/web/app/_components/home-chat-page.tsx`: el hero muestra `LanguageSwitcher` solo sin sesión (o con `authMode === "local-dev"`, que no tiene dropdown).
- [x] `apps/web/components/auth/user-menu.tsx`: submenú "Idioma" con radio Español/English, reusando `useLocale()`.
- [x] Persistencia sin cambios (`eve-locale` en cookie + localStorage, `locale-provider` intacto).
- [x] Verificado: elegir English escribe `eve-locale=en`, `<html lang>` pasa a `en` y `/terms` muestra "Terms of use".

## 4. Blindaje con pnpm
- [x] `package.json`: `engines.node >= 24` y `preinstall` con `scripts/ensure-pnpm.mjs`.
- [x] `pnpm-workspace.yaml`: `minimumReleaseAge: 1440`, `blockExoticSubdeps`, `trustPolicy: no-downgrade` (+ `trustPolicyExclude` para 5 paquetes sin provenance), `strictDepBuilds`, `verifyDepsBeforeRun: install`, `saveExact`; se mantienen `allowBuilds` y `legacy-peer-deps`.
- [x] `.npmrc`: `engine-strict=true` (además de `legacy-peer-deps`).
- [x] `.github/workflows/ci.yml`: corepack + `pnpm install --frozen-lockfile` + `pnpm audit --audit-level high` + typecheck + build.
- [x] Verificado: `pnpm install --frozen-lockfile` pasa y el lockfile pasa las políticas; `pnpm run preinstall` sale 0 y `npm run preinstall` sale 1 a propósito.

## 5. Actualizar dependencias (todo de una vez, incluidos majors)
- [x] Actualizadas en una sola pasada: `ai 7.0.141`, `eve 0.80.0`, `next 16.4.1`, `react`/`react-dom 19.3.1`, `zod 4.6.7`, `@streamdown/code 2.0.0`, `@types/node 26.6.5`, `playwright 1.64.1`, `lucide-react 1.57.0`, `radix-ui 1.8.1`, `better-auth 1.7.8`, `shiki`/`@shikijs/* 4.5.0`, `streamdown 2.7.0`, `@vercel/connect 2.5.2`, `@neondatabase/serverless 1.2.0`, `@upstash/redis 1.39.0`, `drizzle-orm 0.45.4`, `drizzle-kit 0.31.11`, `tailwind-merge 3.7.0`, `@ai-sdk/openai-compatible 3.0.69`, `@streamdown/{cjk,math,mermaid}`, `@types/react(-dom) 19.3.0`.
- [x] `eve`/`ai`/`@vercel/connect` actualizados juntos (eve 0.80 pide `ai >= 7.0.137` y `@vercel/connect >= 2.5.2`).
- [x] **microsandbox se queda en 0.5.10 a propósito**: eve 0.80 declara el peer `microsandbox: ^0.5.0` y desde 0.79.2 el framework falla en el arranque con versiones 0.7.x. No subirlo hasta que eve acepte 0.6+/0.8+.
- [x] `ai` queda en 7.0.141, no 7.0.142: la 7.0.142 arrastra `@ai-sdk/gateway@4.0.115`, `@ai-sdk/provider@4.0.28` y `@ai-sdk/provider-utils@5.0.61`, publicados hace horas, y `minimumReleaseAge: 1440` los bloquea. Subir la 7.0.142 cuando cumpla 24 h.
- [x] Verificado: `pnpm install`, `pnpm typecheck` y `pnpm build` (16/16 páginas) limpios con los majors nuevos.
- [x] `pnpm exec playwright install chromium` tras subir Playwright (los binarios de 1.50 ya no sirven para 1.64).
- [x] `pnpm audit --audit-level high` quedaba en rojo (3 avisos *high* de dependencias transitivas), así que se añadieron dos `overrides` en `pnpm-workspace.yaml` — `undici 7.30.0` y `source-map-js 1.2.2`, ambos dentro de su major y ya maduros. El CI ahora pasa el audit (quedan 3 low y 4 moderate, por debajo del umbral).
- [x] Revisado el CHANGELOG de eve 0.73→0.80: no afecta al repo (no se usan `load_skill`, `task_wait`, `task_cancel`, `final_output`, `connection_search` ni `connection_execute`; el montaje de self-modification ya usa `eve/self-modification/local`).
- [x] Smoke test del agente con eve 0.80: `node scripts/smoke-chat.mjs "Managua a Granada"` → 2 llamadas a `search_bus_routes`, `finishReason=stop`.
- [x] De paso: borrado `apps/web/app/_components/eve-image-mark.tsx`, código muerto que dibujaba el wordmark viejo de eve y ya no importaba nadie.

## 6. El chat pregunta el origen que falta
- [x] `agent/tools/ask_question.ts` (`eve add tool/ask_question` falla en este repo: revierte por `dependency_install`, así que se escribió el archivo de 2 líneas que documenta la guía).
- [x] `agent/instructions.md`: sección "Asking for what is missing" — preguntar el origen antes de buscar, 2-3 opciones de terminales con texto libre, aceptar ciudad/barrio/parada/ruta/terminal/`[Ubicación aproximada]`, nunca buscar con un origen inventado, no volver a preguntar lo ya respondido.
- [x] La UI ya renderiza la pregunta (`message.tsx` → `InputRequestActions`), sin trabajo de frontend.
- [x] Verificado con el agente real: `node scripts/smoke-chat.mjs "¿Cómo llego a Rivas?"` → el modelo llama `ask_question` con la pregunta y las opciones de terminales.
- [x] El prefijo `[Idioma: …]` que `home-chat-page.tsx` anteponía al mensaje se retiró: se filtraba al globo visible del usuario. El agente detecta el idioma del propio mensaje (la instrucción sigue vigente).

## 7. Respuestas al grano con iconos por movimiento
- [x] `apps/web/components/chat/route-directions.tsx`: línea de tiempo con ícono por movimiento (caminar → tomar bus → transbordo/terminal → llegar), chips de zona, horario y tarifa, badge de conexión directa, "Otras opciones" al pie, y el aviso ámbar o neutro según falte la conexión o el tramo. Incluye viaje por tramos y el caso "sin datos".
- [x] `agent/instructions.md`: sección "Answering a route" — una línea con el viaje en orden de viaje, como máximo una línea extra, sin repetir lo que ya muestra la tarjeta.
- [x] Claves nuevas `route.*` en es/en; se retiraron `directUrban`, `directInterurban` y `steps` (ya sin uso).
- [x] Verificado con la página temporal de resultados de ejemplo (6 casos) en claro/oscuro y 390px; la página se borró después de las capturas.


## 8. Tarjeta de viaje más rica y pregunta por la zona de Managua
- [x] `apps/web/lib/bus-routes.ts`: nuevas `horarioDelDestino` y `precioDelDestino` por fila interurbana. El CSV guarda el horario y la tarifa por destino dentro de una sola celda ("Rivas (cada 30 min), Granada (cada media hora 5:30am-9pm)"); el parseo solo actúa cuando la celda separa el dato y si no, cae al texto completo.
- [x] `route-directions.tsx` reescrito como tarjeta compuesta con los primitivos que ya existían (`Badge`, `Collapsible`, `Tooltip`): encabezado origen → destino con pasos y costo (solo si todas las tarifas están registradas), línea de tiempo con ícono y color por movimiento, panel de salidas por destino (horario, pasaje, destinos de la terminal en chips, notas cuando la celda de precio es prosa), bloque "Cómo llegar a la terminal" con las rutas urbanas que salen del origen y llegan a la terminal, y alternativas desplegables con paradas.
- [x] La tarjeta no aparecía en el chat: `message.tsx` metía `search_bus_routes` en el grupo de herramientas plegado, así que la rama que dibuja la tarjeta nunca se ejecutaba. Ahora se dibuja en su sitio (con estado "Buscando rutas…" y mensaje propio si la búsqueda falla) y el resto de herramientas siguen agrupadas.
- [x] `agent/instructions.md`: con origen "Managua" a secas se pregunta en qué parte (mercados/zonas como opciones, texto libre para colonia o parada) y se busca una sola vez con ese lugar como origen; documentados `horarioDelDestino`/`precioDelDestino` y que la tarjeta ya dibuja los tramos.
- [x] `agent/tools/search_bus_routes.ts`: la descripción del origen ya no sugiere "Managua" a secas y anuncia los campos por destino.
- [x] De paso: dos textos que seguían fijos en inglés pasan por el diccionario — el compositor de la sesión (`session-chat-page.tsx`, ahora usa la clave de la home) y la caja de respuesta de `ask_question` más el "Responded:", con claves nuevas `chat.*`.
- [x] Corregido un fallo del flujo de preguntas que lo hacía inutilizable: eve 0.80 marca la pausa por pregunta con `turn.waiting` (`on: "input"`), que **no** cierra el turno, así que la app seguía en estado "ocupado" (`hasOpenTurn`/`isBusy`) y deshabilitaba las opciones y la caja de respuesta para siempre (comprobado en el navegador: 15 min con "Thinking…" y el botón de parar en el compositor). Ahora `message.tsx` expone `hasPendingInputRequest()` y `agent-chat.tsx` la usa para permitir responder, no mostrar "pensando" y no bloquear `handleInputResponses`. eve acepta la respuesta con el turno en vuelo (`assertAnswerable` solo rechaza responder dos veces la misma pregunta).
- [x] Revisada con 6 casos reales (Zumen→Granada, Managua→Granada, Terminal La UCA→Granada, Metrocentro→Zumen, Linda Vista→Rivas y un par inexistente) en claro/oscuro y 390px, más el E2E en el chat autenticado.

## Orden de ejecución
1 → 2 → 3 (marca, bajo riesgo), 4 (blindaje), 6 → 7 (agente y diseño), 5 (dependencias al final, con el árbol ya limpio).

## Riesgos
- El salto `eve 0.73 → 0.80` es el más delicado (streaming, `inputRequest`, sandbox `just-bash`/`microsandbox`); si rompe, se revierte ese grupo y se documenta.
- `minimumReleaseAge` puede frenar versiones recién publicadas: se resuelve con `minimumReleaseAgeExclude` temporal, como ya está con eve/ai.
- El agente depende de un modelo lento e irregular (~13 s a ~6 min por llamada): los E2E del chat necesitan esperas de 10-15 min y un timeout holgado.
- La tarjeta solo muestra el costo total cuando todas las tarifas están registradas; en el resto de casos lo omite en lugar de sumar solo una parte.

# Plan de mejoras — guía rutas buses nic

## 1. Ocultar razonamiento del modelo
- [x] No renderizar `ReasoningPart` en `apps/web/components/chat/message.tsx`
- [x] Mantener `GenerationLoader` como único indicador de carga en `agent-chat.tsx`
- [x] Verificar que el stream no muestra texto de reasoning (caso `reasoning` ahora retorna `null`)

## 2. Bienvenida y sugerencias de viaje
- [x] Agregar mensaje de bienvenida en pantalla vacía
- [x] Agregar chips de sugerencias populares
- [x] Rellenar/enviar consulta al hacer clic en sugerencia

## 3. Ubicación del usuario
- [x] Solicitar geolocalización con manejo de permisos (Home)
- [x] Fallback manual si se deniega (la app muestra error y permite escribir origen)
- [x] Inyectar contexto de ubicación en el turno

## 4. Documentación y agente
- [x] Refinar `agent/instructions.md` (performance guidance)
- [x] Mejorar descripción de `search_bus_routes` (ya detallada con ejemplos)
- [x] Alinear skill `plan_a_trip.md` (incluye rutas de bus)
- [x] Actualizar docs del chatbot (resumen de cambios)

## 5. Optimización de búsqueda
- [x] Añadir índices SQL (urban/interurban)
- [x] Reducir payload de resultados (paradas truncadas)
- [x] Cachear consultas frecuentes (TTL 5 min)
- [x] Mover log a background

## 6. Respuestas estructuradas y UI/UX
- [x] Definir formato estructurado de rutas (via BusRouteSearchResult)
- [x] Componente de resultado de ruta (`RouteDirections` con Phosphor Icons)
- [x] Estados de carga/vacío/error/transferencia
- [x] Accesibilidad y estabilidad de layout (componentes estructurados)

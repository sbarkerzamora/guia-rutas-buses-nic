# Plan bilingüe — español e inglés

## alcance
- Locale por cookie `eve-locale` con fallback español.
- Diccionario local para UI.
- Selector visible en Home y chat.
- Agente responde en el idioma detectado o configurado.

## fases
1. Infraestructura i18n y provider.
2. Switcher + layout.
3. Textos de Home, Composer y RouteDirections.
4. Textos de auth/sidebar/errores.
5. Contexto de idioma al agente.
6. Validación build/typecheck y smoke manual.
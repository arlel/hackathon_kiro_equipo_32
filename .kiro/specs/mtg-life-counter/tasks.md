# Implementation Plan: MTG Life Counter

## Overview

Implementación incremental de las funcionalidades del MTG Life Counter sobre la arquitectura existente (FastAPI + WebSockets + React + TypeScript). Se extienden los modelos de datos, el RoomManager, los endpoints REST, y se crean nuevos componentes frontend para soportar veneno, partners, eliminaciones, estadísticas por mazo/rival, colección de mazos, sala local, exportación CSV, y selección aleatoria de jugador inicial.

## Tasks

- [x] 1. Extender modelos de datos y migración de BD
  - [x] 1.1 Extender modelo Game con campos nuevos (poison_enabled, turn_counter_enabled, creator_id, is_local) y modelo GamePlayer con campos nuevos (deck_id, partner_name, final_poison, elimination_cause, elimination_order)
    - Modificar `backend/app/models/game.py` para añadir las columnas según el diseño
    - Crear modelo Deck en `backend/app/models/deck.py`
    - Actualizar `backend/app/models/__init__.py` con el nuevo modelo
    - _Requirements: 1.6, 1.7, 8.4, 13.2, 14.6, 17.5, 17.6, 19.1, 21.4_

  - [x] 1.2 Crear migración Alembic para los cambios de esquema
    - Generar y aplicar migración con nuevas tablas y columnas
    - _Requirements: 1.6, 1.7, 17.5, 21.4_

  - [x] 1.3 Crear schemas Pydantic para los nuevos dominios (Deck, Stats, GameEdit)
    - Crear `backend/app/schemas/deck.py` con DeckCreate, DeckUpdate, DeckResponse
    - Crear `backend/app/schemas/game.py` con GameEditRequest, GameHistoryResponse, StatsResponse
    - Crear `backend/app/schemas/stats.py` con GeneralStats, DeckStats, RivalStats, GameLogEntry
    - _Requirements: 9.1, 9.7, 9.8, 9.9, 18.2, 18.3, 20.2, 21.4_

- [x] 2. Extender RoomManager del backend
  - [x] 2.1 Extender PlayerState y Room con campos de veneno, partner, eliminación y config
    - Añadir `poison_counters`, `partner_name`, `partner_image`, `elimination_cause`, `elimination_order`, `deck_id` a PlayerState
    - Añadir `RoomConfig` dataclass con `poison_enabled`, `turn_counter_enabled`
    - Añadir `elimination_counter`, `is_local`, `creator_id` a Room
    - _Requirements: 1.6, 1.7, 13.2, 17.1, 17.5, 21.9_

  - [x] 2.2 Implementar método `adjust_poison` con clamping a 0
    - Ajustar veneno del jugador con `max(0, current + amount)`
    - _Requirements: 13.4, 13.5, 13.8_

  - [x] 2.3 Implementar método `apply_commander_damage_v2` con ajuste de vida automático y soporte partners
    - Incremento: reduce vida del destino en la misma cantidad; clamp daño a mínimo 0
    - Decremento: incrementa vida del destino; clamp daño a mínimo 0 (no aplicar vida si resultaría negativo)
    - _Requirements: 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9_

  - [x] 2.4 Implementar métodos `check_elimination` y `revive_player`
    - Evaluar causa: vida <= 0 → "daño normal", daño cmd >= 21 → "daño de comandante", veneno >= 10 → "veneno"
    - Revive: cancelar eliminación si vida > 0, ajustar orden de eliminación
    - _Requirements: 16.1, 16.7, 16.8, 16.9, 17.1, 17.2, 17.3, 17.4, 17.5, 17.7, 17.8, 17.9_

  - [x] 2.5 Implementar método `select_random_starter`
    - Seleccionar jugador aleatorio entre los activos de la sala
    - _Requirements: 15.2, 15.5_

  - [x] 2.6 Implementar método `finalize_game` y `restart_game`
    - `finalize_game`: preparar datos para persistencia (vida final, veneno, daño cmd, eliminaciones)
    - `restart_game`: reiniciar vida, veneno, daño cmd, turnos al estado inicial
    - _Requirements: 8.4, 16.3, 16.4_

  - [x] 2.7 Actualizar `get_state_payload` para incluir veneno, partners, eliminaciones y config
    - Extender payload JSON con campos nuevos según protocolo del diseño
    - _Requirements: 3.1, 13.1, 17.1_

  - [x] 2.8 Escribir tests de propiedad para RoomManager (vida)
    - **Property 2: Vida inicial según formato**
    - **Property 3: Máximo de jugadores por sala**
    - **Property 6: Aritmética de vida**
    - **Property 7: Ajuste de vida sobre jugador inexistente**
    - **Validates: Requirements 1.4, 1.5, 3.8, 4.3, 4.4, 4.7, 4.9, 4.10, 11.2**

  - [x] 2.9 Escribir tests de propiedad para RoomManager (veneno)
    - **Property 15: Aritmética de veneno y clamping a 0**
    - **Property 16: Detección de eliminación por veneno**
    - **Validates: Requirements 13.4, 13.5, 13.8, 13.9, 17.4**

  - [x] 2.10 Escribir tests de propiedad para RoomManager (daño de comandante)
    - **Property 9: Daño de comandante reduce vida automáticamente**
    - **Property 10: Decremento de daño de comandante incrementa vida**
    - **Property 11: Daño de comandante no puede ser negativo**
    - **Property 12: Detección de eliminación por daño de comandante**
    - **Validates: Requirements 6.3, 6.4, 6.8, 6.9, 6.10, 17.1, 17.2, 17.3**

  - [x] 2.11 Escribir tests de propiedad para RoomManager (eliminación y turnos)
    - **Property 14: Incremento de turno**
    - **Property 18: Detección del último jugador en pie**
    - **Property 19: Orden de eliminación secuencial**
    - **Validates: Requirements 10.1, 16.1, 16.7, 17.5, 17.9**

- [x] 3. Extender WebSocket Handler
  - [x] 3.1 Añadir acciones `adjust_poison`, `select_starter`, `restart_game` al handler
    - Extender el switch de acciones en `backend/app/ws/handlers.py`
    - Añadir parámetros de conexión: `partner_name`, `partner_image`, `poison_enabled`, `turn_counter_enabled`, `starting_life`, `deck_id`
    - _Requirements: 13.4, 15.5, 16.4_

  - [x] 3.2 Implementar acción `end_game` con persistencia en BD
    - Crear registros Game y GamePlayer con todos los datos finales
    - Broadcast mensaje `game_ended` a todos los jugadores
    - _Requirements: 8.4, 17.6_

  - [x] 3.3 Extender acción `commander_damage` para usar `apply_commander_damage_v2` con soporte partners
    - Cambiar `fromId` por `commanderSourceId` para identificar comandante específico
    - _Requirements: 6.2, 6.3, 6.9_

  - [x] 3.4 Implementar validación de sala llena (máximo 12 jugadores) y reconexión
    - Rechazar conexión con close code 4001 si sala llena
    - Restaurar estado en reconexión dentro de 30 minutos
    - _Requirements: 1.5, 3.6, 3.8_

  - [x] 3.5 Escribir tests de propiedad para reconexión
    - **Property 20: Reconexión restaura estado completo**
    - **Validates: Requirements 3.6**

- [x] 4. Checkpoint - Verificar backend core
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implementar endpoints REST nuevos
  - [x] 5.1 Crear router de Decks (`backend/app/api/decks.py`) con CRUD completo
    - GET `/api/decks` — listar mazos del usuario
    - POST `/api/decks` — crear mazo
    - PUT `/api/decks/{deck_id}` — actualizar estado (active/inactive)
    - DELETE `/api/decks/{deck_id}` — eliminar mazo
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.11_

  - [x] 5.2 Crear módulo Stats Engine (`backend/app/core/stats.py`) con cálculos de estadísticas
    - `get_general_stats`: total partidas, victorias, winRate, desglose eliminaciones
    - `get_stats_by_deck`: métricas por mazo
    - `get_stats_by_rival`: métricas por rival
    - `get_game_log`: log completo de partidas
    - `recalculate_affected_stats`: recálculo tras edición
    - _Requirements: 9.1, 9.2, 9.3, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10, 9.11_

  - [x] 5.3 Extender router de Games con endpoints de estadísticas y edición
    - GET `/api/games/stats/by-deck` — estadísticas por mazo
    - GET `/api/games/stats/by-rival` — estadísticas por rival
    - GET `/api/games/stats/log` — log de partidas
    - PUT `/api/games/{game_id}/edit` — editar historial (causa y orden eliminación)
    - _Requirements: 9.7, 9.8, 9.9, 18.1, 18.2, 18.3, 18.4, 18.6, 18.7_

  - [x] 5.4 Extender endpoint `/api/games/history` con causa de eliminación y datos nuevos
    - Incluir elimination_cause, elimination_order, partner_name, final_poison en respuesta
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 5.5 Crear endpoint POST `/api/rooms/validate/{code}` para validación de sala
    - Verificar formato del código y existencia en RoomManager
    - _Requirements: 2.1, 2.2_

  - [x] 5.6 Escribir tests de propiedad para validación y estadísticas
    - **Property 1: Formato del código de sala**
    - **Property 4: Validación de código de sala**
    - **Property 5: Validación de nombre de jugador**
    - **Property 13: Cálculo del porcentaje de victorias**
    - **Property 22: Validación de registro de usuario**
    - **Validates: Requirements 1.1, 2.1, 2.2, 2.3, 2.7, 7.1, 7.3, 9.2**

  - [x] 5.7 Registrar nuevos routers en `backend/app/main.py`
    - Incluir decks_router
    - _Requirements: 21.1_

- [x] 6. Checkpoint - Verificar endpoints REST
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Extender tipos TypeScript del frontend
  - [x] 7.1 Actualizar `frontend/src/types/game.ts` con tipos nuevos
    - Añadir RoomConfig, EliminationCause, DeckRecord, GeneralStats, DeckStats, RivalStats, GameLogEntry
    - Extender Player con poisonCounters, partnerName, partnerImage, eliminationCause, eliminationOrder, deckId
    - Actualizar GameFormat a 'commander' | '20vida' | 'custom'
    - _Requirements: 1.2, 13.1, 17.1, 21.6_

- [x] 8. Implementar hooks y servicios frontend
  - [x] 8.1 Crear hook `useWebSocket` (`frontend/src/hooks/useWebSocket.ts`)
    - Conexión WebSocket con reconexión automática (3 reintentos)
    - Cola de acciones offline
    - Estado de conexión (connected, connecting, error)
    - _Requirements: 2.5, 2.6, 3.2, 3.3, 3.4, 3.5_

  - [x] 8.2 Crear hook `useLongPress` (`frontend/src/hooks/useLongPress.ts`)
    - Diferencia entre tap (±1) y long-press 500ms (±10)
    - Retorna handlers: onPointerDown, onPointerUp, onPointerLeave
    - _Requirements: 4.5, 4.6, 6.5, 6.6, 13.6, 13.7_

  - [x] 8.3 Crear hook `useLocalRoom` (`frontend/src/hooks/useLocalRoom.ts`) con LocalRoomManager
    - Réplica de la lógica del RoomManager en el cliente
    - Métodos: createRoom, addPlayer, adjustLife, adjustPoison, applyCommanderDamage, incrementTurn, selectRandomStarter, checkElimination, revivePlayer, endGame, restartGame
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.7, 15.6_

  - [x] 8.4 Crear servicio REST centralizado (`frontend/src/services/api.ts`)
    - Cliente HTTP con token JWT automático
    - Métodos para: historial, stats, decks CRUD, edición de partidas, validación de sala
    - _Requirements: 7.6, 7.7, 8.1, 9.1, 21.1_

  - [x] 8.5 Crear servicio CSV (`frontend/src/services/csv.ts`)
    - Generación de CSV con codificación UTF-8, separador coma, headers en español
    - Descarga automática con nombre formato `estadisticas_{username}_{YYYYMMDD}.csv`
    - _Requirements: 20.2, 20.3, 20.4, 20.5, 20.6, 20.7_

  - [x] 8.6 Crear contexto de autenticación (`frontend/src/context/AuthContext.tsx`)
    - Provider con estado de usuario, token, login, logout, isAuthenticated
    - Persistencia en localStorage
    - _Requirements: 7.4, 7.6, 7.8_

  - [x] 8.7 Escribir tests de propiedad para frontend
    - **Property 8: Imagen de carta doble cara**
    - **Property 17: Selección aleatoria dentro de la lista de jugadores**
    - **Property 21: CSV con formato correcto**
    - **Validates: Requirements 5.7, 15.2, 20.3**

- [x] 9. Checkpoint - Verificar hooks y servicios
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implementar componentes UI reutilizables
  - [x] 10.1 Crear componente `LifeCounter` (`frontend/src/components/LifeCounter.tsx`)
    - Botones ±1 con long-press ±10, fuente mínima 48px, área táctil 44x44px
    - _Requirements: 4.1, 4.2, 4.5, 4.6_

  - [x] 10.2 Crear componente `PoisonCounter` (`frontend/src/components/PoisonCounter.tsx`)
    - Contador de veneno con botones ±1/±10, indicador visual al llegar a 10
    - _Requirements: 13.1, 13.3, 13.9_

  - [x] 10.3 Crear componente `CmdDamagePanel` (`frontend/src/components/CmdDamagePanel.tsx`)
    - Lista de fuentes de daño con soporte partners (dos entradas por jugador con partners)
    - Botones ±1/±10 con long-press
    - _Requirements: 6.1, 6.2, 6.5, 6.6, 6.10_

  - [x] 10.4 Crear componente `PlayerCard` (`frontend/src/components/PlayerCard.tsx`)
    - Tarjeta de jugador con fondo de arte/color, borde púrpura para jugador local
    - Indicador de desconexión, indicador de eliminación
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [x] 10.5 Crear componente `StarterPicker` (`frontend/src/components/StarterPicker.tsx`)
    - Animación tipo ruleta (2-4 segundos), borde dorado al seleccionado (3s)
    - _Requirements: 15.1, 15.3, 15.4_

  - [x] 10.6 Crear componente `DeckSelector` (`frontend/src/components/DeckSelector.tsx`)
    - Toggle "Mis Mazos" con lista filtrada por formato
    - Pre-relleno de datos de comandante al seleccionar mazo
    - _Requirements: 21.7, 21.8_

  - [x] 10.7 Extender componente `CommanderSearch` para soporte Partner
    - Detectar habilidad "Partner" y mostrar segundo campo de búsqueda
    - _Requirements: 5.4, 5.5_

- [x] 11. Implementar páginas principales
  - [x] 11.1 Extender `Home.tsx` con opciones de configuración de sala
    - Selector formato (Commander/20vida/Custom), toggle veneno, toggle turnos
    - Campo vida personalizada para Custom
    - Botón "Crear Sala Local" (requiere auth)
    - Validación de código al unirse
    - _Requirements: 1.2, 1.6, 1.7, 2.1, 2.2, 11.5, 14.8_

  - [x] 11.2 Refactorizar `Game.tsx` usando nuevos componentes y hooks
    - Usar useWebSocket, PlayerCard, LifeCounter, PoisonCounter, CmdDamagePanel
    - Integrar StarterPicker, detección último jugador en pie, diálogo end_game/restart
    - Integrar DeckSelector en el formulario de unión
    - _Requirements: 4.8, 15.1, 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 21.7_

  - [x] 11.3 Crear página `LocalGame.tsx` para sala local
    - Usar useLocalRoom hook, mismos componentes visuales que Game.tsx
    - Gestión de jugadores locales (añadir/eliminar)
    - Persistencia al finalizar via API REST
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7_

  - [x] 11.4 Extender `History.tsx` con causa de eliminación y editor
    - Mostrar causa de eliminación por jugador, orden de eliminación
    - Panel de edición para modificar causa y orden
    - _Requirements: 8.1, 8.2, 8.3, 18.1, 18.2, 18.3, 18.4, 18.5_

  - [x] 11.5 Crear página `Stats.tsx` con estadísticas y exportación CSV
    - Tabs: General, Por Mazo, Por Rival, Log de Partidas
    - Botón exportar CSV
    - _Requirements: 9.1, 9.6, 9.7, 9.8, 9.9, 9.10, 9.11, 20.1, 20.2_

  - [x] 11.6 Crear página `Decks.tsx` para gestión de mazos
    - Lista de mazos con stats resumidas
    - Formulario de creación (Commander con Scryfall, otros con nombre libre)
    - Toggle activo/inactivo, eliminación
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 21.10, 21.11_

- [x] 12. Actualizar enrutamiento y navegación
  - [x] 12.1 Actualizar `App.tsx` con nuevas rutas y AuthContext provider
    - Añadir rutas: /local-game, /stats, /decks
    - Envolver con AuthContext provider
    - _Requirements: 14.1, 9.1, 21.1_

- [x] 13. Checkpoint - Verificar integración completa
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Tests de integración y cleanup final
  - [x] 14.1 Escribir tests de integración WebSocket end-to-end
    - Conectar 2+ clientes, enviar acciones (vida, veneno, cmd damage), verificar broadcast
    - Verificar persistencia al end_game
    - _Requirements: 3.1, 3.2, 8.4_

  - [x] 14.2 Escribir tests de integración REST con autenticación
    - Flujo completo: register → login → crear mazo → jugar → historial → stats → editar
    - _Requirements: 7.1, 7.4, 8.1, 9.1, 18.4, 21.4_

  - [x] 14.3 Escribir tests unitarios para CSV y LocalRoomManager
    - Verificar formato CSV con datos de ejemplo
    - Verificar flujo completo de sala local
    - _Requirements: 14.1, 20.3_

- [x] 15. Checkpoint final - Verificar todo el sistema
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia requerimientos específicos para trazabilidad
- Los checkpoints aseguran validación incremental
- Los tests de propiedades validan las 22 propiedades de correctitud universales definidas en el diseño
- Los tests unitarios validan ejemplos específicos y casos borde
- La migración de Alembic (tarea 1.2) debe ejecutarse antes de cualquier test de integración con BD
- El frontend necesita `vitest` y `fast-check` como devDependencies (instalar si no están)
- El backend necesita `hypothesis`, `pytest`, `pytest-asyncio`, `httpx` como dependencias de test

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["2.1", "7.1"] },
    { "id": 3, "tasks": ["2.2", "2.3", "2.4", "2.5", "2.6", "2.7"] },
    { "id": 4, "tasks": ["2.8", "2.9", "2.10", "2.11", "3.1", "3.3"] },
    { "id": 5, "tasks": ["3.2", "3.4"] },
    { "id": 6, "tasks": ["3.5", "5.1", "5.2"] },
    { "id": 7, "tasks": ["5.3", "5.4", "5.5", "5.7"] },
    { "id": 8, "tasks": ["5.6"] },
    { "id": 9, "tasks": ["8.1", "8.2", "8.3", "8.4", "8.5", "8.6"] },
    { "id": 10, "tasks": ["8.7"] },
    { "id": 11, "tasks": ["10.1", "10.2", "10.3", "10.4", "10.5", "10.6", "10.7"] },
    { "id": 12, "tasks": ["11.1", "11.3", "11.4", "11.5", "11.6", "12.1"] },
    { "id": 13, "tasks": ["11.2"] },
    { "id": 14, "tasks": ["14.1", "14.2", "14.3"] }
  ]
}
```

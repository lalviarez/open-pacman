# SPEC 01 — IA de los 4 fantasmas

> **Estado:** Implementado
> **Depende de:** ninguna
> **Fecha:** 2026-09-04
> **Objetivo:** Los cuatro fantasmas clásicos (Blinky agresivo, Pinky emboscador, Inky flanqueador, Clyde tímido) se mueven cada uno con su propia lógica de target, alternando fases scatter/chase y saliendo de la casa de forma escalonada.

## Por qué existe esta spec

El juego tiene hoy 2 fantasmas con IA mínima (`hunter` con Manhattan y `random`). Esta spec los sustituye por los 4 del original e introduce el primer archivo nuevo desde el esqueleto (`ghosts.js`), sentando el patrón de carga de scripts para futuras specs.

## Alcance

**In:**

- 4 fantasmas con lógica clásica de target:
  - **Blinky** (rojo): target = tile de Pac-Man (persecución agresiva directa).
  - **Pinky** (rosa): target = tile 4 celdas delante de Pac-Man según su dirección.
  - **Inky** (cian): target = reflejo de «2 celdas delante de Pac-Man» respecto a Blinky: `t = 2 * ( pac + 2 * dir ) − blinky`.
  - **Clyde** (naranja): target = tile de Pac-Man si está a más de 8 celdas; si no, su esquina.
- Fase global scatter/chase por timer: 420 frames (~7 s) scatter → 1200 frames (~20 s) chase, en bucle. En scatter el target de todos es su esquina.
- Inversión de dirección de todo fantasma fuera de la casa en el frame en que cambia la fase.
- Salida escalonada por tiempo: Blinky nace fuera (13,11); Pinky sale a los ~2 s, Inky a los ~6 s, Clyde a los ~10 s. Mientras esperan, oscilan arriba/abajo en su x dentro de la casa.
- Desempate clásico en cruces: distancia euclídea al cuadrado al target; en empate gana `up > left > down > right`. Sin reversa salvo callejón (como hoy).
- `src/js/ghosts.js` (nuevo) con toda la IA, `<script>` en `src/index.html` entre `maze.js` y `game.js`.
- `maze.js`: `GHOST_STARTS` ampliado a 4 entradas con `kind`, `corner`, `exitDelay`.
- `render.js`: color fijo por `kind` (no por índice) y marcadores de debug.
- Tecla **D**: alterna `game.debug`; dibuja el tile-objetivo de cada fantasma con su color y muestra la fase (SCATTER/CHASE) en el HUD.
- Reset instantáneo al perder vida (comportamiento actual), con salida escalonada re-iniciada.

**Out of scope (para futuras specs):**

- Power pellets, modo frightened y comer fantasmas.
- Velocidades distintas por fantasma / «Cruise Elroy».
- Animación o pausa de muerte.
- Salida de la casa por contadores de dots comidos.
- Ciclo de fases exacto del nivel 1 original (7-20-7-20-7-20-5-∞).
- Niveles, dificultad creciente, sonido, loop con dt real.

## Modelo de datos

```js
// maze.js — GHOST_STARTS pasa de 2 a 4 entradas
const GHOST_STARTS = [
  { x: 13, y: 11, kind: 'blinky', corner: { x: 25, y: 0 },  exitDelay: 0 },   // ya fuera
  { x: 13, y: 14, kind: 'pinky',  corner: { x: 2, y: 0 },   exitDelay: 120 }, // ~2 s
  { x: 12, y: 14, kind: 'inky',   corner: { x: 27, y: 30 }, exitDelay: 360 }, // ~6 s
  { x: 15, y: 14, kind: 'clyde',  corner: { x: 0, y: 30 },  exitDelay: 600 }, // ~10 s
];
```

- `exitDelay` en frames a ~60 fps. Las esquinas pueden caer sobre muros o bordes: solo sirven para comparar distancias, nunca se ocupan.
- Blinky es siempre `game.ghosts[ 0 ]` (Inky necesita su posición).

```js
// game.js — createGame: cada fantasma gana campos y el juego gana fase
ghost: {
  x, y, dir, speed,                     // como hoy
  kind: 'blinky' | 'pinky' | 'inky' | 'clyde',
  corner: { x, y },
  exitDelay: 0,                         // frames restantes para salir
  inHouse: true,                        // false tras salir; Blinky nace false
},
mode: { phase: 'scatter', timer: 420 },
debug: false,
```

```js
// ghosts.js — constantes y API exportada por window
const SCATTER_FRAMES = 420;
const CHASE_FRAMES = 1200;
const DIR_PRIORITY = [ 'up', 'left', 'down', 'right' ]; // desempate clásico
function ghostTarget( game, g ) { ... }   // tile-objetivo según kind y fase
function updateGhost( game, g ) { ... }   // casa + decidir + mover (sustituye a moveGhost)
function updateGhostMode( game ) { ... }  // timer de fase + inversión al cambiar
```

```js
// render.js — color fijo por kind (sustituye al array por índice)
const GHOST_COLORS = {
  blinky: '#ff0000', pinky: '#ffb8ff', inky: '#00ffff', clyde: '#ffb852',
};
```

Convenciones: celdas con origen arriba-izquierda; velocidades en celdas/frame (como hoy).

## Plan de implementación

1. Crear `src/js/ghosts.js` con cabecera y añadir su `<script>` a `index.html` (orden maze → ghosts → game → render → main). Mover `decideGhost`, `moveGhost` (renombrado a `updateGhost`) y `GHOST_SPEED` de `game.js` a `ghosts.js` sin cambios. Prueba manual: juego idéntico con 2 fantasmas, sin errores en consola.
2. Ampliar `GHOST_STARTS` en `maze.js` y los campos nuevos en `createGame` (`corner`, `exitDelay`, `inHouse`, `mode`, `debug`). En `decideGhost`, `blinky` usa la rama perseguidor actual (era `hunter`) y el resto random. Colores por `kind` en `render.js`. Prueba: 4 fantasmas con su color; Blinky persigue desde el frame 1.
3. Implementar `ghostTarget( game, g )` con los 4 targets clásicos y la elección de dirección con euclídea al cuadrado + `DIR_PRIORITY` (sustituye la Manhattan del paso 2). Prueba: cada fantasma muestra un patrón distinto y estable.
4. Implementar `updateGhostMode( game )` (llamada desde `update` antes de mover): timer 420/1200 en bucle, targets de esquina en scatter, inversión de dirección al cambiar de fase (solo fuera de la casa). Prueba: cada ~7 s se retiran a su esquina y el giro de 180° se aprecia al cambiar.
5. Implementar la casa en `updateGhost`: con `inHouse`, oscilar en la propia x entre y ≈ 13.5 y 14.5; al llegar `exitDelay` a 0, ir a x = 13 y subir por la puerta hasta (13,11), `inHouse = false`. `resetPositions` restaura `inHouse`/`exitDelay` y reinicia `mode`. Prueba: salidas escalonadas al iniciar y tras perder una vida.
6. Tecla D en `main.js` (toggle `game.debug`) y marcadores en `render.js`: cuadrado de 4 px del color del fantasma en su tile-objetivo + fase en el HUD. Prueba: los marcadores coinciden con cada personalidad y con la fase.

## Criterios de aceptación

- [ ] Al iniciar se ven 4 fantasmas: Blinky rojo en (13,11) fuera de la casa; Pinky, Inky y Clyde (rosa, cian, naranja) dentro.
- [ ] Con la tecla D, el marcador de Blinky coincide con el tile de Pac-Man en cada cruce.
- [ ] Con la tecla D, el marcador de Pinky cae 4 celdas delante de la dirección de Pac-Man.
- [ ] Con la tecla D, el marcador de Inky es `2 * ( pac + 2 * dir ) − blinky`.
- [ ] El marcador de Clyde pasa de Pac-Man a su esquina cuando su distancia a Pac-Man es ≤ 8 celdas.
- [ ] En scatter los 4 marcadores son las esquinas; el HUD muestra SCATTER o CHASE según la fase.
- [ ] Al cambiar de fase, todo fantasma fuera de la casa invierte su dirección en ese frame.
- [ ] Pinky, Inky y Clyde salen ~2 s, ~6 s y ~10 s después de iniciar o de perder una vida, oscilando mientras esperan.
- [ ] La colisión resta una vida, resetea al instante y re-inicia la salida escalonada; con 0 vidas sale PERDISTE y sin dots GANASTE.
- [ ] No hay errores en consola durante una partida completa.

## Decisiones

- **Sí:** set clásico de personalidades. Cada target es verificable de forma independiente con el marcador de debug.
- **Sí:** timer de fase repetitivo (420/1200) en vez del ciclo exacto del nivel 1. Mantiene el ritmo sin estado extra.
- **Sí:** inversión de dirección al cambiar de fase. Señal clásica, coste mínimo.
- **Sí:** salida por timer, no por dots comidos. Más simple de verificar y suficiente.
- **Sí:** euclídea al cuadrado + prioridad up > left > down > right. Determinista y fiel al original (sustituye la Manhattan actual).
- **Sí:** misma velocidad (`GHOST_SPEED = 0.1`) para los 4. La personalidad nace solo del target.
- **Sí:** archivo nuevo `ghosts.js`. Aísla la IA de las reglas; `game.js` queda como árbitro.
- **Sí:** tecla D de debug. Sin ella, los criterios de Pinky e Inky no son verificables a simple vista.
- **No:** power pellets / frightened. Decisión explícita del usuario: va en otra spec.
- **No:** velocidades distintas, animación de muerte, niveles, sonido, dt real.
- Nota: definición con fase de preguntas completa (dos bloques).

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| `ghosts.js` carga antes que `game.js` pero usa `DIRS`/`OPPOSITE` (globals de game.js) | Solo se referencian dentro de funciones, nunca en tiempo de carga. Orden documentado en `index.html`. |
| Oscilación en la casa usa y = 13.5, no alineada con la rejilla | La rama `inHouse` de `updateGhost` no pasa por `aligned`/`decideGhost`; es lógica propia. |
| Las esquinas caen sobre muros o fuera del mapa | Intencional: son solo puntos de comparación, nunca se ocupan. |
| Timer en frames asume ~60 fps; a 120 Hz+ todo va al doble de rápido | Heredado del juego actual (velocidades ya son por frame). Pendiente para una futura spec de dt. |

## Lo que **no** está en esta spec

- Power pellets, modo frightened y comer fantasmas.
- Velocidades por fantasma / Cruise Elroy.
- Animación o pausa de muerte.
- Salida de casa por dots comidos.
- Niveles, dificultad, sonido, loop con dt real.

Cada uno, si llega, va en su propia spec.

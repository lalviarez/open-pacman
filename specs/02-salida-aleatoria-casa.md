# SPEC 02 — Salida aleatoria de la casa por agresividad

> **Estado:** Aprobado
> **Depende de:** SPEC 01
> **Fecha:** 2026-09-04
> **Objetivo:** Los fantasmas salen de la casa en orden creciente de agresividad (Clyde → Inky → Pinky → Blinky) con intervalos aleatorios de 2–6 s entre salidas, re-sorteados en cada vida.

## Por qué existe esta spec

SPEC 01 fijó la salida por timers constantes (Pinky ~2 s, Inky ~6 s, Clyde ~10 s) con Blinky fuera desde el frame 1. El usuario quiere imprevisibilidad y una rampa de dificultad creciente: primero sale el tímido y el agresivo cierra. Es una revisión de una decisión de SPEC 01, no un añadido.

## Alcance

**In:**

- Orden de salida fijo por agresividad creciente: Clyde (`exitOrder` 0), Inky (1), Pinky (2), Blinky (3, último).
- Blinky nace DENTRO de la casa, en (14,14) (slot libre junto a la puerta); ya no persigue desde el frame 1. Pinky, Inky y Clyde conservan sus x actuales.
- Clyde sale con `exitDelay` 0: en el frame 1 ya camina hacia la puerta.
- Cada intervalo entre salidas se sortea uniforme en [120, 360] frames (~2–6 s a 60 fps) con `Math.random`; los delays son acumulativos.
- Nuevo sorteo en cada `createGame` y en cada `resetPositions` (perder vida).
- `maze.js`: `GHOST_STARTS` sustituye `exitDelay` por `exitOrder`.
- `game.js`: `rollExitDelays()` + `inHouse: true` explícito para los 4.
- `render.js`: con la tecla D, el HUD añade los frames restantes de salida de cada fantasma en casa (verificabilidad del rango y del orden).
- La mecánica de la casa en `updateGhost` (ghosts.js) NO cambia: cuenta atrás, oscilación y salida por la puerta siguen igual.

**Out of scope (para futuras specs):**

- Salida por contadores de dots comidos (aplazada ya en SPEC 01).
- Cambios en la IA de targets o en el ciclo scatter/chase (SPEC 01 intacta).
- Velocidades distintas por fantasma / «Cruise Elroy».
- Seed reproducible o RNG inyectable para tests automáticos.
- Niveles, dificultad creciente, sonido, loop con dt real.

## Modelo de datos

```js
// maze.js — GHOST_STARTS: exitDelay FUERA, exitOrder DENTRO (0 = sale primero).
// El orden del array NO cambia: Blinky sigue siendo ghosts[ 0 ] (Inky lo usa).
const GHOST_STARTS = [
  { x: 14, y: 14, kind: 'blinky', corner: { x: 25, y: 0 },  exitOrder: 3 },
  { x: 13, y: 14, kind: 'pinky',  corner: { x: 2, y: 0 },   exitOrder: 2 },
  { x: 12, y: 14, kind: 'inky',   corner: { x: 27, y: 30 }, exitOrder: 1 },
  { x: 15, y: 14, kind: 'clyde',  corner: { x: 0, y: 30 },  exitOrder: 0 },
];
```

```js
// game.js — constantes y sorteo (nuevo)
const EXIT_GAP_MIN = 120; // ~2 s a 60 fps
const EXIT_GAP_MAX = 360; // ~6 s a 60 fps

// Delays absolutos indexados por exitOrder: [ 0, g1, g1+g2, g1+g2+g3 ]
function rollExitDelays() {
  const delays = [ 0 ];
  for ( let i = 1; i < GHOST_STARTS.length; i++ ) {
    delays[ i ] = delays[ i - 1 ] + EXIT_GAP_MIN +
      Math.floor( Math.random() * ( EXIT_GAP_MAX - EXIT_GAP_MIN + 1 ) );
  }
  return delays;
}
```

El objeto `ghost` no gana campos: `exitDelay` pasa de constante de `maze.js` a valor de runtime asignado en `createGame`/`resetPositions` (vía `GHOST_STARTS[ i ].exitOrder`), e `inHouse` arranca `true` para los 4 (antes `g.exitDelay > 0`, que dejaría a Clyde dentro pero marcado como fuera).

Convenciones: como SPEC 01 (frames a ~60 fps, origen arriba-izquierda).

## Plan de implementación

1. `maze.js` + `game.js`: sustituir `exitDelay` por `exitOrder` en `GHOST_STARTS` (Blinky a (14,14)); añadir `EXIT_GAP_MIN`/`EXIT_GAP_MAX` y `rollExitDelays()`; en `createGame` asignar `exitDelay` desde el sorteo con `inHouse: true`; en `resetPositions` re-sortear y reasignar (siguiendo reseteando `mode` como hoy). Prueba manual: partida nueva → 4 fantasmas dentro, Clyde sale en el frame 1 y luego Inky, Pinky y Blinky en ese orden con esperas distintas; perder una vida → la secuencia reinicia con otros tiempos; sin errores en consola.
2. `render.js` (`drawHUD`): con `game.debug`, línea extra con `kind` y frames restantes de cada fantasma con `inHouse`. Prueba manual: tecla D → los contadores bajan hasta 0 como máximo ~6 s, cada contador al llegar a 0 coincide con la salida de ese fantasma y el orden es C → I → P → B.

## Criterios de aceptación

- [ ] Al iniciar y tras perder cada vida, los 4 fantasmas están dentro: Blinky (14,14), Pinky (13,14), Inky (12,14), Clyde (15,14); ninguno persigue en el frame 1.
- [ ] Clyde sale de inmediato: en el primer segundo ya cruza la puerta.
- [ ] En varias partidas y vidas, el orden de salida observado es siempre Clyde → Inky → Pinky → Blinky.
- [ ] Con la tecla D, cada intervalo entre salidas consecutivas queda dentro de [120, 360] frames.
- [ ] Tras perder una vida, al menos uno de los 3 intervalos difiere de los de la vida anterior.
- [ ] La IA de SPEC 01 no cambia: con la tecla D, los marcadores de Blinky, Pinky y Clyde siguen sus reglas; el de Inky sigue la fórmula `2 * ( pac + 2 * dir ) − blinky` (con Blinky esperando dentro da targets cerca de la casa: esperado).
- [ ] La colisión resta una vida, resetea al instante y re-sortea; con 0 vidas PERDISTE y sin dots GANASTE.
- [ ] No hay errores en consola durante una partida completa.

## Decisiones

- **Sí:** orden Clyde → Inky → Pinky → Blinky. Ranking clásico de agresividad, confirmado por el usuario.
- **Sí:** Blinky nace dentro en (14,14). Consecuencia asumida: ningún perseguidor en el frame 1; inicio más tranquilo.
- **Sí:** intervalos uniformes [120, 360] con `Math.random`, como delays acumulativos por fantasma. Reutiliza la cuenta atrás de `updateGhost` sin tocar `ghosts.js`.
- **Sí:** Clyde con delay 0. La aleatoriedad vive solo entre salidas, como pidió el usuario.
- **Sí:** re-sorteo en cada vida. Cada vida es distinta y no añade estado.
- **Sí:** frames restantes en el HUD de debug. Sin eso, el rango y el re-sorteo no son verificables a simple vista (mismo papel que la tecla D en SPEC 01).
- **No:** scheduler central con «siguiente que sale». Más estado para el mismo resultado; la cuenta atrás por fantasma ya existe.
- **No:** seed/RNG inyectable. No hay suite de tests; `Math.random` basta.
- **No:** salida por dots comidos. Sigue aplazada desde SPEC 01.
- Nota: definición con fase de preguntas completa (un bloque de 5).

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| La expresión actual `inHouse: g.exitDelay > 0` dejaría a Clyde (delay 0) marcado como fuera dentro de la casa | Se sustituye por `inHouse: true` explícito para los 4 en `createGame` y `resetPositions`. |
| Inky refleja a un Blinky que aún espera dentro (sale último): targets extraños hasta que Blinky sale | Aceptado: la fórmula de SPEC 01 sigue siendo exacta; solo se aprecia con debug y se corrige solo al salir Blinky. |
| Intervalos y delays asumen ~60 fps (heredado) | Pendiente de una futura spec de dt real, igual que SPEC 01. |
| Dos vidas con intervalos idénticos por azar | Probabilidad ≈ (1/241)³; aceptado. |

## Lo que **no** está en esta spec

- Salida por dots comidos.
- Cambios en la IA de targets o el ciclo de fases.
- Velocidades distintas / Cruise Elroy.
- Seed determinista, niveles, sonido, dt real.

Cada uno, si llega, va en su propia spec.

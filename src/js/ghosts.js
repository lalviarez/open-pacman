// ghosts.js
// IA de los fantasmas: target por personalidad, decision de direccion y movimiento.
// Carga ANTES que game.js: sus globals (DIRS, OPPOSITE, canMove, aligned,
// wrapTunnel) solo se referencian dentro de funciones, nunca al cargar.

const GHOST_SPEED = 0.1; // 1/10 celda/frame
const DIR_PRIORITY = [ 'up', 'left', 'down', 'right' ]; // desempate clasico

// Tile-objetivo del fantasma segun su personalidad (kind).
function ghostTarget( game, g ) {
  const p = game.pacman;
  const px = Math.round( p.x );
  const py = Math.round( p.y );

  if ( g.kind === 'blinky' ) {
    // Agresivo: el tile de Pac-Man.
    return { x: px, y: py };
  }
  if ( g.kind === 'pinky' ) {
    // Emboscador: 4 celdas delante de Pac-Man segun su direccion.
    const d = DIRS[ p.dir ];
    return { x: px + d.x * 4, y: py + d.y * 4 };
  }
  if ( g.kind === 'inky' ) {
    // Flanqueador: reflejo de "2 delante de Pac-Man" respecto a Blinky.
    const d = DIRS[ p.dir ];
    const ax = px + d.x * 2;
    const ay = py + d.y * 2;
    const b = game.ghosts[ 0 ]; // Blinky es siempre ghosts[ 0 ]
    return { x: 2 * ax - Math.round( b.x ), y: 2 * ay - Math.round( b.y ) };
  }
  // Clyde, timido: a mas de 8 celdas (euclidea) persigue; cerca, su esquina.
  const dist2 = ( g.x - px ) ** 2 + ( g.y - py ) ** 2;
  if ( dist2 > 64 ) return { x: px, y: py };
  return { x: g.corner.x, y: g.corner.y };
}

function decideGhost( game, g ) {
  const grid = game.grid;
  const target = ghostTarget( game, g );

  const options = Object.keys( DIRS ).filter(
    ( dir ) => dir !== OPPOSITE[ g.dir ] && canMove( grid, g.x, g.y, dir, 'ghost' )
  );
  // Sin salida (callejon): permitir el giro de 180.
  const choices = options.length ? options : [ '' + OPPOSITE[ g.dir ] ];

  // Eleccion clasica: euclidea al cuadrado al target. Basta iterar
  // DIR_PRIORITY con "<" estricto para que los empates resuelvan
  // up > left > down > right.
  let best = choices[ 0 ];
  let bestDist = Infinity;
  for ( const dir of DIR_PRIORITY ) {
    if ( !choices.includes( dir ) ) continue;
    const d = DIRS[ dir ];
    const nx = g.x + d.x;
    const ny = g.y + d.y;
    const dist = ( nx - target.x ) ** 2 + ( ny - target.y ) ** 2;
    if ( dist < bestDist ) {
      bestDist = dist;
      best = dir;
    }
  }
  g.dir = best;
}

function updateGhost( game, g ) {
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( g.x ) && aligned( g.y ) ) {
    g.x = Math.round( g.x );
    g.y = Math.round( g.y );
    decideGhost( game, g );
    if ( !canMove( grid, g.x, g.y, g.dir, 'ghost' ) ) return;
  }

  const d = DIRS[ g.dir ];
  g.x += d.x * g.speed;
  g.y += d.y * g.speed;
  wrapTunnel( g, width );
}

window.GHOST_SPEED = GHOST_SPEED;
window.ghostTarget = ghostTarget;
window.updateGhost = updateGhost;

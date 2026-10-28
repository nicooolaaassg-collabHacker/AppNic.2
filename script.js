// =========================================================
// AppNic.2 — un avión blanco cruza el cielo sobre un valle de
// montañas nevadas. En la pradera, una pata amarilla pasea con
// sus patitos, que corren a comer las semillas que les tires.
// De vez en cuando sopla el viento.
// =========================================================

const canvas = document.getElementById('cielo');
const ctx = canvas.getContext('2d');

// ---------- Ajustes ----------
const VEL_CRUCERO = 95;         // velocidad normal del avión (px por segundo)
const VEL_MOTORES = 420;        // velocidad con los motores a tope
const NUM_PATITOS = 4;
const VELOCIDAD_PATO = 42;      // la pata grande camina tranquila
const CARRERA_PATITO = 125;     // los patitos corren cuando van a por semillas

// El sol está arriba a la izquierda: de ahí viene la luz de toda la escena.
const SOL = { x: 0.16, y: 0.13 };

const COLORES = {
  cielo: ['#2f6fb5', '#5d9bd6', '#9cc6e8', '#d9e9f1'],
  bruma: '214, 232, 242',
  nieve: ['#ffffff', '#e4edf6'],
  sombraMontana: '38, 58, 92',
  montanaLejos: ['#8ea3bd', '#a9bccd'],
  montanaMedia: ['#6f8798', '#8aa0ad'],
  colinas: ['#55734f', '#6d8a5f'],
  pinosLejos: '#3f5c4a',
  pinos: ['#243d2b', '#2d4a33', '#35553a'],
  pradera: ['#a3c46a', '#7cb046', '#5a9632', '#3c7522'],
  briznas: ['#3f7a24', '#4f8b2c', '#619c38', '#78b04a', '#8fbf5a'],
  tallo: '#4b7a2a',
  flores: {
    margarita: { petalo: '#fbfbf6', sombra: '#d9dbd0', centro: '#f2c230' },
    amapola: { petalo: '#d8291f', sombra: '#8f1510', centro: '#2a1a14' },
    aciano: { petalo: '#4a6fd6', sombra: '#2c4596', centro: '#2b2f5a' },
    boton: { petalo: '#f6cf2a', sombra: '#c99a12', centro: '#d9a514' },
  },
  pato: { claro: '#fff4c2', base: '#f0cb45', sombra: '#b08a1c', ala: '#ecc547', alaSombra: '#c49b22' },
  patito: { claro: '#ffffff', base: '#f2efe6', sombra: '#b4ad9c', ala: '#e6e1d4', alaSombra: '#b9b2a2' },
  pico: ['#f6a445', '#c8691a'],
  patas: '#e3852a',
};

// ---------- Utilidades ----------
const azar = (min, max) => min + Math.random() * (max - min);
const limitar = (v, min, max) => Math.max(min, Math.min(max, v));
const GRADO = Math.PI / 180;

function normalizarAngulo(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

// Números "al azar" pero siempre los mismos, para que el paisaje no cambie al recargar.
function azarFijo(semilla) {
  let s = semilla;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

let ancho = 0;
let alto = 0;
let suelo = 0;   // altura (y) donde empieza la pradera
let tiempoTotal = 0;

// Profundidad en la pradera: 0 al fondo (horizonte), 1 justo delante.
function profundidad(y) {
  return limitar((y - suelo) / Math.max(1, alto - suelo), 0, 1);
}

// ---------- Paisaje ----------
// El paisaje fijo se dibuja una sola vez en un lienzo aparte y luego se copia en cada fotograma.
const fondo = document.createElement('canvas');
const fctx = fondo.getContext('2d');

// Lo que se mueve con el viento y los patos se crean junto con el paisaje.
const briznas = [];
const plantas = [];
let patos = null;

function dibujarCielo() {
  const g = fctx.createLinearGradient(0, 0, 0, suelo);
  COLORES.cielo.forEach((c, i) => g.addColorStop(i / (COLORES.cielo.length - 1), c));
  fctx.fillStyle = g;
  fctx.fillRect(0, 0, ancho, alto);

  // Resplandor del sol.
  const sx = ancho * SOL.x;
  const sy = suelo * SOL.y;
  const r = Math.max(ancho, suelo) * 0.55;
  const halo = fctx.createRadialGradient(sx, sy, 0, sx, sy, r);
  halo.addColorStop(0, 'rgba(255, 252, 235, 0.95)');
  halo.addColorStop(0.04, 'rgba(255, 248, 220, 0.75)');
  halo.addColorStop(0.18, 'rgba(255, 240, 210, 0.25)');
  halo.addColorStop(1, 'rgba(255, 240, 210, 0)');
  fctx.fillStyle = halo;
  fctx.fillRect(0, 0, ancho, suelo);
}

// Nube de tipo cúmulo: muchas bolas suaves, blancas arriba y algo grises por debajo.
function dibujarNube(rnd, cx, cy, tam) {
  const bolas = [];
  const n = 20 + Math.floor(rnd() * 12);
  for (let i = 0; i < n; i++) {
    const t = rnd();
    bolas.push({
      x: cx + (t - 0.5) * tam * 2.2,
      // Más altas en el centro, base plana.
      y: cy - Math.sin(t * Math.PI) * tam * (0.25 + rnd() * 0.45),
      r: tam * (0.25 + rnd() * 0.3) * (0.6 + Math.sin(t * Math.PI) * 0.6),
    });
  }
  for (const b of bolas) {
    const g = fctx.createRadialGradient(b.x - b.r * 0.3, b.y - b.r * 0.4, b.r * 0.1, b.x, b.y, b.r);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.6, 'rgba(250,252,255,0.75)');
    g.addColorStop(1, 'rgba(240,245,250,0)');
    fctx.fillStyle = g;
    fctx.beginPath();
    fctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    fctx.fill();
  }
  // Sombra suave en la base de la nube.
  for (const b of bolas) {
    const g = fctx.createRadialGradient(b.x, b.y + b.r * 0.5, 0, b.x, b.y + b.r * 0.5, b.r * 0.8);
    g.addColorStop(0, 'rgba(150,165,185,0.22)');
    g.addColorStop(1, 'rgba(150,165,185,0)');
    fctx.fillStyle = g;
    fctx.beginPath();
    fctx.arc(b.x, b.y + b.r * 0.5, b.r * 0.8, 0, Math.PI * 2);
    fctx.fill();
  }
}

// Cresta de montaña con relieve natural: unos picos principales y,
// entre ellos, muchos picos pequeños (subdivisión con desplazamiento al azar).
function cresta(rnd, base, alturaMin, alturaMax, pasoMin, pasoMax, rugosidad) {
  let puntos = [];
  let x = -120;
  let pico = rnd() < 0.5;
  while (x < ancho + 120) {
    const altura = pico ? alturaMin + rnd() * (alturaMax - alturaMin) : alturaMin * (0.25 + rnd() * 0.35);
    puntos.push({ x, y: base - altura, pico });
    x += pasoMin + rnd() * (pasoMax - pasoMin);
    pico = !pico;
  }
  // Último punto ya fuera de la pantalla, para que la cordillera no acabe cortada en vertical.
  puntos.push({ x, y: base - alturaMin * (pico ? 1 : 0.4), pico });
  const principales = puntos.map((p) => ({ ...p }));
  const niveles = 6;
  for (let n = 0; n < niveles; n++) {
    const nuevos = [puntos[0]];
    for (let i = 0; i < puntos.length - 1; i++) {
      const a = puntos[i];
      const b = puntos[i + 1];
      const largo = b.x - a.x;
      nuevos.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + (rnd() - 0.5) * largo * rugosidad }, b);
    }
    puntos = nuevos;
  }
  // Cada pico principal quedó en la posición i * 2^niveles.
  const salto = 2 ** niveles;
  principales.forEach((p, i) => (p.indice = i * salto));
  return { puntos, principales };
}

function trazarCresta(c, base) {
  fctx.beginPath();
  fctx.moveTo(c.puntos[0].x, base);
  for (const p of c.puntos) fctx.lineTo(p.x, p.y);
  fctx.lineTo(c.puntos[c.puntos.length - 1].x, base);
  fctx.closePath();
}

// Una cordillera completa: roca con degradado, nieve opcional, cara en sombra
// (la que no mira al sol), surcos de roca y bruma en la base.
function dibujarCordillera(rnd, c, base, colores, opciones) {
  const arriba = Math.min(...c.puntos.map((p) => p.y));
  const g = fctx.createLinearGradient(0, arriba, 0, base);
  g.addColorStop(0, colores[0]);
  g.addColorStop(1, colores[1]);
  trazarCresta(c, base);
  fctx.fillStyle = g;
  fctx.fill();

  fctx.save();
  trazarCresta(c, base);
  fctx.clip();

  // Nieve en las cumbres, con el borde de abajo irregular (bajando por los surcos).
  if (opciones.nieve) {
    const linea = opciones.nieve;
    const gn = fctx.createLinearGradient(0, arriba, 0, linea + 40);
    gn.addColorStop(0, COLORES.nieve[0]);
    gn.addColorStop(1, COLORES.nieve[1]);
    fctx.fillStyle = gn;
    fctx.beginPath();
    fctx.moveTo(c.puntos[0].x, c.puntos[0].y);
    for (const p of c.puntos) fctx.lineTo(p.x, p.y);
    for (let i = c.puntos.length - 1; i >= 0; i -= 2) {
      const p = c.puntos[i];
      const lengua = Math.pow(rnd(), 3) * 45 + Math.sin(p.x * 0.05) * 6;
      fctx.lineTo(p.x, Math.max(p.y, linea + lengua));
    }
    fctx.closePath();
    fctx.fill();
  }

  // Cara en sombra de cada pico: del pico hacia el valle de la derecha (el sol está a la izquierda).
  for (const p of c.principales) {
    if (!p.pico) continue;
    const inicio = p.indice;
    const fin = Math.min(c.puntos.length - 1, inicio + 2 ** 6);
    const cima = c.puntos[inicio];
    const valle = c.puntos[fin];
    const gs = fctx.createLinearGradient(0, cima.y, 0, base);
    gs.addColorStop(0, `rgba(${COLORES.sombraMontana}, ${opciones.sombra})`);
    gs.addColorStop(1, `rgba(${COLORES.sombraMontana}, ${opciones.sombra * 0.3})`);
    fctx.fillStyle = gs;
    fctx.beginPath();
    fctx.moveTo(cima.x, cima.y);
    for (let i = inicio; i <= fin; i++) fctx.lineTo(c.puntos[i].x, c.puntos[i].y);
    fctx.lineTo(valle.x, base);
    // La arista que separa luz y sombra baja en zigzag desde la cima.
    const pie = cima.x + (valle.x - cima.x) * 0.2;
    const pasos = 14;
    for (let k = pasos; k >= 0; k--) {
      const t = k / pasos;
      fctx.lineTo(cima.x + (pie - cima.x) * t + (rnd() - 0.5) * 10 * t, cima.y + (base - cima.y) * t);
    }
    fctx.closePath();
    fctx.fill();
  }

  // Surcos y grietas en la roca.
  fctx.lineCap = 'round';
  for (let i = 0; i < opciones.surcos; i++) {
    const p = c.puntos[Math.floor(rnd() * c.puntos.length)];
    const largo = 15 + rnd() * 60;
    const y0 = p.y + 4 + rnd() * 30;
    fctx.strokeStyle = rnd() < 0.5 ? 'rgba(30, 45, 70, 0.08)' : 'rgba(255, 255, 255, 0.08)';
    fctx.lineWidth = 0.6 + rnd() * 1.2;
    fctx.beginPath();
    fctx.moveTo(p.x, y0);
    fctx.quadraticCurveTo(p.x + (rnd() - 0.5) * 10, y0 + largo * 0.5, p.x + (rnd() - 0.5) * 16, y0 + largo);
    fctx.stroke();
  }
  fctx.restore();

  // Bruma en la base: lo lejano se ve más claro y azulado.
  const alturaCapa = base - arriba;
  const gb = fctx.createLinearGradient(0, base - alturaCapa * 0.7, 0, base);
  gb.addColorStop(0, `rgba(${COLORES.bruma}, 0)`);
  gb.addColorStop(1, `rgba(${COLORES.bruma}, ${opciones.bruma})`);
  fctx.fillStyle = gb;
  fctx.fillRect(0, base - alturaCapa * 0.7, ancho, alturaCapa * 0.7 + 2);
}

// Pino visto de lejos: varias capas de ramas, más claro por el lado del sol.
function dibujarPino(x, base, alto, colorSombra, colorLuz) {
  const anchoBase = alto * 0.42;
  const capas = 4;
  for (let i = 0; i < capas; i++) {
    const t = i / capas;
    const yb = base - alto * t * 0.8;
    const ya = yb - alto * (0.45 - t * 0.08);
    const w = anchoBase * (1 - t * 0.7);
    fctx.fillStyle = colorSombra;
    fctx.beginPath();
    fctx.moveTo(x, ya);
    fctx.lineTo(x + w / 2, yb);
    fctx.lineTo(x - w / 2, yb);
    fctx.closePath();
    fctx.fill();
    fctx.fillStyle = colorLuz;
    fctx.beginPath();
    fctx.moveTo(x, ya);
    fctx.lineTo(x, yb);
    fctx.lineTo(x - w / 2, yb);
    fctx.closePath();
    fctx.fill();
  }
}

function dibujarBosque(rnd) {
  // Fila de atrás: pinos pequeños y con bruma.
  for (let x = -10; x < ancho + 10; x += 3 + rnd() * 5) {
    const h = 8 + rnd() * 10;
    dibujarPino(x, suelo + 2, h, COLORES.pinosLejos, '#4d6b58');
  }
  const gb = fctx.createLinearGradient(0, suelo - 22, 0, suelo + 2);
  gb.addColorStop(0, `rgba(${COLORES.bruma}, 0.35)`);
  gb.addColorStop(1, `rgba(${COLORES.bruma}, 0.15)`);
  fctx.fillStyle = gb;
  fctx.fillRect(0, suelo - 22, ancho, 24);

  // Fila de delante: pinos más grandes y oscuros, en grupos.
  let x = -10;
  while (x < ancho + 10) {
    const grupo = 2 + Math.floor(rnd() * 6);
    for (let i = 0; i < grupo; i++) {
      const h = 14 + rnd() * 20;
      const tono = Math.floor(rnd() * COLORES.pinos.length);
      dibujarPino(x, suelo + 3, h, COLORES.pinos[tono], COLORES.pinos[Math.min(COLORES.pinos.length - 1, tono + 1)]);
      x += 4 + rnd() * 6;
    }
    x += rnd() * 40;
  }
}

function dibujarPradera(rnd) {
  // Color base: más claro y amarillento al fondo, más verde y oscuro delante.
  const g = fctx.createLinearGradient(0, suelo, 0, alto);
  COLORES.pradera.forEach((c, i) => g.addColorStop(i / (COLORES.pradera.length - 1), c));
  fctx.fillStyle = g;
  fctx.fillRect(0, suelo, ancho, alto - suelo);

  // Manchas suaves de luz y sombra para que no sea un color plano.
  for (let i = 0; i < 40; i++) {
    const t = rnd();
    const y = suelo + t * (alto - suelo);
    const rx = 30 + rnd() * 120 * (0.4 + t);
    const ry = rx * (0.12 + t * 0.15);
    const x = rnd() * ancho;
    const gm = fctx.createRadialGradient(x, y, 0, x, y, rx);
    const oscuro = rnd() < 0.5;
    gm.addColorStop(0, oscuro ? 'rgba(40, 80, 20, 0.16)' : 'rgba(210, 230, 140, 0.14)');
    gm.addColorStop(1, 'rgba(0,0,0,0)');
    fctx.fillStyle = gm;
    fctx.save();
    fctx.translate(x, y);
    fctx.scale(1, ry / rx);
    fctx.translate(-x, -y);
    fctx.beginPath();
    fctx.arc(x, y, rx, 0, Math.PI * 2);
    fctx.fill();
    fctx.restore();
  }

  // Miles de briznas cortas: diminutas al fondo y más largas delante (perspectiva).
  const cantidad = Math.round((ancho * (alto - suelo)) / 14);
  const trazos = COLORES.briznas.map(() => new Path2D());
  for (let i = 0; i < cantidad; i++) {
    const t = Math.pow(rnd(), 0.8);
    const y = suelo + 1 + t * (alto - suelo);
    const x = rnd() * ancho;
    const largo = 1.2 + t * 9 * (0.6 + rnd() * 0.6);
    const lado = (rnd() - 0.5) * largo * 0.6;
    const camino = trazos[Math.floor(rnd() * trazos.length)];
    camino.moveTo(x, y);
    camino.lineTo(x + lado, y - largo);
  }
  fctx.lineCap = 'round';
  trazos.forEach((camino, i) => {
    fctx.strokeStyle = COLORES.briznas[i];
    fctx.globalAlpha = 0.55;
    fctx.lineWidth = 0.9;
    fctx.stroke(camino);
  });
  fctx.globalAlpha = 1;

  // Bruma muy suave en el horizonte de la pradera.
  const gb = fctx.createLinearGradient(0, suelo, 0, suelo + (alto - suelo) * 0.25);
  gb.addColorStop(0, `rgba(${COLORES.bruma}, 0.35)`);
  gb.addColorStop(1, `rgba(${COLORES.bruma}, 0)`);
  fctx.fillStyle = gb;
  fctx.fillRect(0, suelo, ancho, (alto - suelo) * 0.25);
}

// Grano muy fino por encima de todo, como en una foto.
function anadirGrano(rnd) {
  const datos = fctx.getImageData(0, 0, fondo.width, fondo.height);
  const px = datos.data;
  for (let i = 0; i < px.length; i += 4) {
    const ruido = (rnd() - 0.5) * 9;
    px[i] += ruido;
    px[i + 1] += ruido;
    px[i + 2] += ruido;
  }
  fctx.putImageData(datos, 0, 0);
}

// Hierbas altas, flores y la franja de hierba que tapa el borde de abajo.
function generarPlantas(rnd) {
  plantas.length = 0;
  briznas.length = 0;
  const arriba = suelo + 6;
  const abajo = alto - 4;

  const cantidadHierbas = Math.round(ancho / 45);
  for (let i = 0; i < cantidadHierbas; i++) {
    const y = arriba + Math.pow(rnd(), 0.7) * (abajo - arriba);
    plantas.push({
      tipo: 'hierba',
      x: rnd() * ancho,
      y,
      alto: (14 + rnd() * 22) * (0.35 + profundidad(y) * 0.9),
      hojas: 5 + Math.floor(rnd() * 6),
      fase: rnd() * Math.PI * 2,
      tonos: [0, 1, 2].map(() => COLORES.briznas[Math.floor(rnd() * COLORES.briznas.length)]),
    });
  }

  const especies = Object.keys(COLORES.flores);
  const cantidadFlores = Math.round(ancho / 30);
  for (let i = 0; i < cantidadFlores; i++) {
    const y = arriba + Math.pow(rnd(), 0.8) * (abajo - arriba);
    // Las flores salen en grupitos, como en un prado de verdad.
    const x = rnd() * ancho;
    const especie = especies[Math.floor(rnd() * especies.length)];
    const enGrupo = 1 + Math.floor(rnd() * 3);
    for (let k = 0; k < enGrupo; k++) {
      const yk = limitar(y + (rnd() - 0.5) * 10, arriba, abajo);
      const e = 0.35 + profundidad(yk) * 0.85;
      plantas.push({
        tipo: 'flor',
        especie,
        x: x + (rnd() - 0.5) * 24 * e,
        y: yk,
        alto: (16 + rnd() * 20) * e,
        tam: (3.2 + rnd() * 1.6) * e,
        fase: rnd() * Math.PI * 2,
        giro: rnd() * Math.PI,
      });
    }
  }

  // Hierba alta en primer plano, pegada al borde de abajo.
  for (let x = -5; x < ancho + 5; x += 3 + rnd() * 5) {
    briznas.push({
      x,
      y: alto + 2,
      alto: 14 + rnd() * 30,
      ancho: 2 + rnd() * 2,
      fase: rnd() * Math.PI * 2,
      curva: (rnd() - 0.5) * 0.5,
      color: COLORES.briznas[Math.floor(rnd() * 3)],
    });
  }
}

function dibujarFondo(dpr) {
  fondo.width = canvas.width;
  fondo.height = canvas.height;
  fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const rnd = azarFijo(20261028);

  dibujarCielo();

  // Nubes en lo alto del cielo.
  const nubes = Math.max(2, Math.round(ancho / 380));
  for (let i = 0; i < nubes; i++) {
    const cx = ((i + 0.3 + rnd() * 0.5) / nubes) * ancho;
    dibujarNube(rnd, cx, suelo * (0.12 + rnd() * 0.22), Math.min(ancho, 1400) * (0.04 + rnd() * 0.035));
  }

  // Tres capas de montañas: las lejanas nevadas, las del medio y las colinas verdes.
  const espacio = suelo;
  const base = suelo + 4;
  const lejanas = cresta(rnd, base, espacio * 0.28, espacio * 0.5, 150, 300, 0.32);
  dibujarCordillera(rnd, lejanas, base, COLORES.montanaLejos, {
    nieve: base - espacio * 0.36, sombra: 0.32, surcos: Math.round(ancho / 4), bruma: 0.75,
  });
  const medias = cresta(rnd, base, espacio * 0.14, espacio * 0.27, 110, 220, 0.3);
  dibujarCordillera(rnd, medias, base, COLORES.montanaMedia, {
    nieve: null, sombra: 0.3, surcos: Math.round(ancho / 5), bruma: 0.6,
  });
  const colinas = cresta(rnd, base, espacio * 0.05, espacio * 0.11, 80, 170, 0.12);
  dibujarCordillera(rnd, colinas, base, COLORES.colinas, {
    nieve: null, sombra: 0.22, surcos: 0, bruma: 0.35,
  });

  dibujarBosque(rnd);
  dibujarPradera(rnd);
  anadirGrano(rnd);
  generarPlantas(rnd);

  // Los patos y las semillas se vuelven a colocar dentro de la pradera nueva.
  patos = null;
  semillas.length = 0;
}

function ajustarTamano() {
  const dpr = window.devicePixelRatio || 1;
  ancho = window.innerWidth;
  alto = window.innerHeight;
  suelo = alto - Math.max(90, alto * 0.2);
  canvas.width = Math.round(ancho * dpr);
  canvas.height = Math.round(alto * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  dibujarFondo(dpr);
  ajustarAvion();
}

// ---------- Viento ----------
// Pasa muy de vez en cuando: a veces al minuto, a veces a los pocos minutos
// y a veces tarda hasta una hora. Cada ráfaga sube, se mantiene y se apaga.
// "valor" va de -1 a 1: el signo dice hacia dónde sopla y el tamaño, cuánta fuerza tiene.
const viento = { fase: 'calma', tiempo: 0, duracion: azar(25, 60), fuerza: 0, maximo: 1, dir: 1, valor: 0 };
const hojasVolando = [];   // hojas y briznas que arrastra el viento

function duracionCalma() {
  const r = Math.random();
  if (r < 0.35) return azar(45, 90);       // más o menos un minuto
  if (r < 0.65) return azar(150, 240);     // unos tres minutos
  if (r < 0.85) return azar(300, 900);     // entre cinco y quince minutos
  return azar(1800, 3600);                 // hasta una hora
}

function actualizarViento(dt) {
  viento.tiempo += dt;
  if (viento.tiempo > viento.duracion) {
    viento.tiempo = 0;
    if (viento.fase === 'calma') {
      viento.fase = 'rafaga';
      viento.duracion = azar(2.5, 4.5);
      viento.dir = Math.random() < 0.75 ? 1 : -1;   // casi siempre sopla hacia la derecha
      viento.maximo = azar(0.6, 1);
    } else {
      viento.fase = 'calma';
      viento.duracion = duracionCalma();
    }
  }

  let objetivo = 0;
  if (viento.fase === 'rafaga') {
    const sube = Math.min(1, viento.tiempo / 0.6);
    const baja = Math.min(1, (viento.duracion - viento.tiempo) / 0.8);
    objetivo = viento.maximo * Math.min(sube, baja);
  }
  viento.fuerza += (objetivo - viento.fuerza) * Math.min(1, dt * 4);
  // Racheado: la fuerza sube y baja un poquito todo el rato.
  viento.valor = viento.dir * viento.fuerza * (0.85 + 0.15 * Math.sin(tiempoTotal * 7));

  // El viento arrastra hojas y briznas sueltas por la pradera y el aire bajo.
  if (viento.fuerza > 0.2 && Math.random() < viento.fuerza * 18 * dt) {
    const y = azar(suelo - (alto - suelo) * 1.5, alto - 10);
    const cerca = profundidad(y);
    hojasVolando.push({
      x: viento.dir > 0 ? -20 : ancho + 20,
      y,
      vx: azar(260, 480) * viento.dir * (0.6 + cerca * 0.6),
      fase: Math.random() * Math.PI * 2,
      giro: Math.random() * Math.PI,
      vgiro: azar(-8, 8),
      tam: azar(2.5, 5) * (0.6 + cerca * 0.8),
      color: ['#7a9a3a', '#a3a03c', '#b8862e', '#5e8a2e'][Math.floor(Math.random() * 4)],
    });
  }
  for (let i = hojasVolando.length - 1; i >= 0; i--) {
    const h = hojasVolando[i];
    h.x += h.vx * (0.4 + viento.fuerza * 0.8) * dt;
    h.y += Math.sin(tiempoTotal * 3 + h.fase) * 30 * dt;
    h.giro += h.vgiro * dt;
    if (h.x < -40 || h.x > ancho + 40) hojasVolando.splice(i, 1);
  }
}

function dibujarHojasVolando() {
  for (const h of hojasVolando) {
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate(h.giro);
    ctx.scale(1, Math.abs(Math.sin(h.giro * 0.7)) * 0.8 + 0.2);   // se ve de canto al girar
    ctx.fillStyle = h.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, h.tam, h.tam * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(-h.tam, 0);
    ctx.lineTo(h.tam, 0);
    ctx.stroke();
    ctx.restore();
  }
}

// Inclinación de una planta: un vaivén suave siempre, más el empujón del viento.
function inclinacion(fase, flexible) {
  return (
    Math.sin(tiempoTotal * 1.6 + fase) * 0.06 +
    viento.valor * 0.55 * flexible +
    Math.sin(tiempoTotal * 11 + fase * 3) * 0.07 * viento.fuerza
  );
}

// ---------- Avión ----------
// Un avión de pasajeros blanco, sin marcas, visto de lado. Vuela recto y nivelado
// y el viento no le afecta. Con los motores a tope acelera y deja estela blanca.
const avion = { x: 0, y: 0, velocidad: VEL_CRUCERO, escala: 1, distanciaEmision: 0 };
let motores = false;
const estela = [];      // partículas de la estela de condensación
const VIDA_ESTELA = 6;  // segundos que tarda en deshacerse

// Tamaño del avión según la pantalla.
function escalaAvion() {
  return limitar(ancho / 1400, 0.55, 1);
}

function nuevaPasada() {
  avion.escala = escalaAvion();
  avion.x = -130 * avion.escala;
  avion.y = azar(suelo * 0.12, suelo * 0.42);
}

function ajustarAvion() {
  avion.escala = escalaAvion();
  if (!avion.y || avion.y > suelo * 0.5) avion.y = azar(suelo * 0.12, suelo * 0.42);
}

// Bolita de humo difuminada, dibujada una vez y reutilizada para toda la estela.
const bolitaHumo = document.createElement('canvas');
bolitaHumo.width = bolitaHumo.height = 64;
(() => {
  const b = bolitaHumo.getContext('2d');
  const g = b.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.75)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  b.fillStyle = g;
  b.fillRect(0, 0, 64, 64);
})();

// Salida de los dos motores (coordenadas del dibujo del avión).
const TOBERAS = [
  { x: -8, y: 17 },   // motor del lado que vemos
  { x: -4, y: 15.5 }, // motor del otro lado, casi tapado
];

function actualizarAvion(dt) {
  // Los motores empujan poco a poco, como un avión de verdad.
  const objetivo = motores ? VEL_MOTORES : VEL_CRUCERO;
  const respuesta = motores ? 0.9 : 0.5;
  avion.velocidad += (objetivo - avion.velocidad) * Math.min(1, dt * respuesta);
  const paso = avion.velocidad * dt;
  avion.x += paso;

  // Estela: sale de los motores solo cuando están a tope.
  if (motores) {
    avion.distanciaEmision += paso;
    while (avion.distanciaEmision > 4) {
      avion.distanciaEmision -= 4;
      for (const t of TOBERAS) {
        estela.push({
          x: avion.x + t.x * avion.escala - avion.distanciaEmision,
          y: avion.y + t.y * avion.escala,
          edad: 0,
          escala: avion.escala,
        });
      }
    }
  }

  // La estela se ensancha, la mueve el viento y se va deshaciendo.
  for (let i = estela.length - 1; i >= 0; i--) {
    const p = estela[i];
    p.edad += dt;
    p.x += viento.valor * 40 * dt;
    p.y += 1.5 * dt;
    if (p.edad > VIDA_ESTELA) estela.splice(i, 1);
  }

  if (avion.x > ancho + 130 * avion.escala) nuevaPasada();
}

function dibujarEstela() {
  ctx.save();
  for (const p of estela) {
    const vida = p.edad / VIDA_ESTELA;
    // Justo detrás de los motores aún no se ve: el vapor tarda un instante en condensarse.
    const aparece = limitar(p.edad / 0.25, 0, 1);
    const alfa = 0.5 * aparece * Math.pow(1 - vida, 1.3);
    if (alfa <= 0.01) continue;
    const radio = (1.4 + p.edad * 5) * p.escala;
    ctx.globalAlpha = alfa;
    ctx.drawImage(bolitaHumo, p.x - radio, p.y - radio, radio * 2, radio * 2);
  }
  ctx.restore();
}

// Luz que parpadea con un pequeño halo.
function luz(x, y, color, encendida) {
  if (!encendida) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, 6);
  g.addColorStop(0, color);
  g.addColorStop(0.3, color);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, Math.PI * 2);
  ctx.fill();
}

function dibujarMotor(dx, dy, claro, oscuro) {
  // Pilón que une el motor al ala.
  ctx.fillStyle = oscuro;
  ctx.beginPath();
  ctx.moveTo(8 + dx, 8 + dy);
  ctx.lineTo(22 + dx, 6 + dy);
  ctx.lineTo(24 + dx, 12 + dy);
  ctx.lineTo(10 + dx, 12.5 + dy);
  ctx.closePath();
  ctx.fill();

  // Góndola del motor.
  const g = ctx.createLinearGradient(0, 12 + dy, 0, 22 + dy);
  g.addColorStop(0, '#fbfcfd');
  g.addColorStop(0.45, claro);
  g.addColorStop(1, oscuro);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(30 + dx, 12 + dy);
  ctx.lineTo(6 + dx, 12.5 + dy);
  ctx.quadraticCurveTo(-1 + dx, 14 + dy, -2 + dx, 17 + dy);
  ctx.quadraticCurveTo(-1 + dx, 20 + dy, 6 + dx, 21.5 + dy);
  ctx.lineTo(30 + dx, 22 + dy);
  ctx.quadraticCurveTo(32 + dx, 17 + dy, 30 + dx, 12 + dy);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(60,70,80,0.35)';
  ctx.lineWidth = 0.6;
  ctx.stroke();

  // Toma de aire y tobera de salida.
  ctx.fillStyle = '#59626b';
  ctx.beginPath();
  ctx.ellipse(30.5 + dx, 17 + dy, 1.8, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1c2126';
  ctx.beginPath();
  ctx.ellipse(30.8 + dx, 17 + dy, 1, 3.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7d868f';
  ctx.beginPath();
  ctx.moveTo(-2 + dx, 15 + dy);
  ctx.lineTo(-8 + dx, 17 + dy);
  ctx.lineTo(-2 + dx, 19 + dy);
  ctx.closePath();
  ctx.fill();
}

function dibujarAvion() {
  ctx.save();
  // Un leve vaivén vertical, como el aire en altura.
  ctx.translate(avion.x, avion.y + Math.sin(tiempoTotal * 0.9) * 0.8);
  ctx.scale(avion.escala, avion.escala);
  ctx.lineJoin = 'round';
  const contorno = 'rgba(60,70,80,0.35)';

  // Deriva (aleta de cola).
  let g = ctx.createLinearGradient(-62, -9, -100, -44);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#dce2e7');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-60, -9);
  ctx.lineTo(-89, -44);
  ctx.lineTo(-101, -44);
  ctx.lineTo(-99, -8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = contorno;
  ctx.lineWidth = 0.6;
  ctx.stroke();

  // Motor del otro lado, más en sombra y casi tapado por el fuselaje.
  dibujarMotor(4, -1.5, '#d5dbe0', '#8f98a0');

  // Fuselaje con sombreado: claro arriba, más oscuro en la panza.
  g = ctx.createLinearGradient(0, -10, 0, 10);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.35, '#f3f5f7');
  g.addColorStop(0.7, '#d9dee3');
  g.addColorStop(1, '#aeb6be');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-100, -8);
  ctx.lineTo(60, -10);
  ctx.bezierCurveTo(85, -10, 100, -4, 102, 1);
  ctx.bezierCurveTo(100, 7, 88, 10, 70, 10);
  ctx.lineTo(-45, 10);
  ctx.bezierCurveTo(-70, 9, -90, 0, -102, -5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = contorno;
  ctx.lineWidth = 0.7;
  ctx.stroke();

  // Carenado bajo el ala.
  g = ctx.createLinearGradient(0, 6, 0, 12);
  g.addColorStop(0, '#dfe4e8');
  g.addColorStop(1, '#a3abb3');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(2, 9, 24, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Líneas de paneles, muy suaves.
  ctx.strokeStyle = 'rgba(0,0,0,0.07)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(-88, -1);
  ctx.lineTo(78, -1);
  ctx.stroke();

  // Puertas.
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  for (const px of [72, 30, -50]) {
    ctx.beginPath();
    ctx.roundRect(px, -7, 4, 11, 1);
    ctx.stroke();
  }

  // Ventanillas de pasajeros.
  ctx.fillStyle = '#3a4654';
  for (let x = -62; x < 68; x += 5.5) {
    if (Math.abs(x - 30) < 4 || Math.abs(x + 50) < 4) continue;
    ctx.beginPath();
    ctx.roundRect(x, -5.2, 2.3, 3, 1);
    ctx.fill();
  }

  // Cabina.
  g = ctx.createLinearGradient(84, -6, 94, -2);
  g.addColorStop(0, '#2b3440');
  g.addColorStop(1, '#4b5868');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(83, -6.4);
  ctx.lineTo(90, -5.6);
  ctx.lineTo(94, -2.2);
  ctx.lineTo(85, -2.6);
  ctx.closePath();
  ctx.fill();

  // Estabilizador horizontal de este lado.
  ctx.fillStyle = '#e6eaee';
  ctx.beginPath();
  ctx.moveTo(-78, -3);
  ctx.lineTo(-104, 0);
  ctx.lineTo(-110, 3);
  ctx.lineTo(-84, 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = contorno;
  ctx.lineWidth = 0.6;
  ctx.stroke();

  // Ala de este lado, en flecha, con su winglet.
  g = ctx.createLinearGradient(0, 5, 0, 13);
  g.addColorStop(0, '#e9edf0');
  g.addColorStop(1, '#9aa3ab');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(26, 5);
  ctx.lineTo(-22, 13);
  ctx.lineTo(-32, 13);
  ctx.lineTo(-16, 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#e4e8ec';
  ctx.beginPath();
  ctx.moveTo(-24, 13);
  ctx.lineTo(-31, 4);
  ctx.lineTo(-35, 4);
  ctx.lineTo(-33, 13);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Motor de este lado.
  dibujarMotor(0, 0, '#e6eaee', '#a7b0b8');

  // Luces: baliza roja que parpadea y destellos blancos en cola y ala.
  const t = tiempoTotal;
  const baliza = t % 1 < 0.12;
  const destello = t % 1.3 < 0.06 || (t % 1.3 > 0.18 && t % 1.3 < 0.24);
  luz(12, -10.5, '#ff2a2a', baliza);
  luz(6, 10.5, '#ff2a2a', baliza);
  luz(-103, -5, '#ffffff', destello);
  luz(-33, 4, '#ffffff', destello);

  ctx.restore();
}

// ---------- Hierbas y flores ----------
// Hoja de hierba afilada: ancha en la base, acaba en punta y se curva al inclinarse.
function hojaHierba(x, y, largo, angulo, grosor, curva) {
  const px = x + Math.sin(angulo) * largo;
  const py = y - Math.cos(angulo) * largo;
  const cx = x + Math.sin(angulo * 0.4 + curva) * largo * 0.55;
  const cy = y - largo * 0.55;
  ctx.beginPath();
  ctx.moveTo(x - grosor / 2, y);
  ctx.quadraticCurveTo(cx - grosor * 0.3, cy, px, py);
  ctx.quadraticCurveTo(cx + grosor * 0.3, cy, x + grosor / 2, y);
  ctx.closePath();
  ctx.fill();
}

// Hierba alta del primer plano, a lo largo del borde de abajo.
function dibujarBriznas() {
  ctx.save();
  for (const b of briznas) {
    ctx.fillStyle = b.color;
    hojaHierba(b.x, b.y, b.alto, inclinacion(b.fase, 1.1), b.ancho, b.curva);
  }
  ctx.restore();
}

function dibujarHierba(h) {
  const base = inclinacion(h.fase, 1);
  const e = 0.35 + profundidad(h.y) * 0.9;
  for (let j = 0; j < h.hojas; j++) {
    const abanico = (j - (h.hojas - 1) / 2) * 0.16;
    const largo = h.alto * (0.55 + 0.45 * (((j * 37) % 10) / 10));
    ctx.fillStyle = h.tonos[j % 3];
    hojaHierba(h.x + abanico * 8 * e, h.y, largo, base + abanico, 1.8 * e, abanico * 0.8);
  }
}

function dibujarFlor(f) {
  const a = inclinacion(f.fase, 1.2);
  const colores = COLORES.flores[f.especie];
  const e = f.tam;

  // Tallo fino.
  const punta = { x: f.x + Math.sin(a) * f.alto, y: f.y - Math.cos(a) * f.alto };
  ctx.strokeStyle = COLORES.tallo;
  ctx.lineWidth = Math.max(0.6, e * 0.28);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(f.x, f.y);
  ctx.quadraticCurveTo(f.x + Math.sin(a) * f.alto * 0.2, f.y - f.alto * 0.55, punta.x, punta.y);
  ctx.stroke();

  // Hojitas en la base.
  ctx.fillStyle = COLORES.tallo;
  ctx.beginPath();
  ctx.ellipse(f.x - e * 0.9, f.y - e * 0.8, e * 1.3, e * 0.35, -0.7 + a * 0.5, 0, Math.PI * 2);
  ctx.ellipse(f.x + e * 0.9, f.y - e * 1.2, e * 1.2, e * 0.32, 0.7 + a * 0.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(punta.x, punta.y);
  ctx.rotate(a);
  // Vistas un poco de lado: la corola se aplasta en vertical.
  ctx.scale(1, 0.6);

  if (f.especie === 'amapola') {
    // Cuatro pétalos grandes en forma de copa.
    for (let p = 0; p < 4; p++) {
      const ang = f.giro + (p / 4) * Math.PI * 2;
      const g = ctx.createRadialGradient(0, 0, 0, Math.cos(ang) * e, Math.sin(ang) * e, e * 1.6);
      g.addColorStop(0, colores.sombra);
      g.addColorStop(0.5, colores.petalo);
      g.addColorStop(1, colores.petalo);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(Math.cos(ang) * e * 0.7, Math.sin(ang) * e * 0.7, e * 1.05, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    const n = f.especie === 'margarita' ? 12 : f.especie === 'aciano' ? 9 : 5;
    const largo = f.especie === 'boton' ? e * 0.9 : e * 1.3;
    const fino = f.especie === 'margarita' ? e * 0.28 : f.especie === 'aciano' ? e * 0.35 : e * 0.6;
    for (let p = 0; p < n; p++) {
      const ang = f.giro + (p / n) * Math.PI * 2;
      // Los pétalos de abajo quedan un poco en sombra.
      ctx.fillStyle = Math.sin(ang) > 0.3 ? colores.sombra : colores.petalo;
      ctx.beginPath();
      ctx.ellipse(Math.cos(ang) * largo * 0.6, Math.sin(ang) * largo * 0.6, largo * 0.6, fino, ang, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Centro con un punto de brillo.
  ctx.fillStyle = colores.centro;
  ctx.beginPath();
  ctx.arc(0, 0, e * (f.especie === 'margarita' ? 0.45 : 0.35), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.arc(-e * 0.12, -e * 0.15, e * 0.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ---------- Semillas ----------
// Con el botón "Semillas" activo, cada clic suelta un puñado que cae a la pradera.
const semillas = [];
let modoSemillas = false;

function soltarSemillas(x, y) {
  const z = zonaPatos();
  const cantidad = 6 + Math.floor(Math.random() * 4);
  for (let i = 0; i < cantidad; i++) {
    // Si se suelta sobre la pradera caen ahí mismo; si se suelta en el cielo, caen hasta el suelo.
    const dentro = y >= z.arriba - 10;
    const destY = dentro ? limitar(y + azar(-8, 12), z.arriba, z.abajo) : azar(z.arriba, z.abajo);
    semillas.push({
      x: x + azar(-14, 14),
      y: Math.min(y, destY) + azar(-6, 2),
      vx: azar(-25, 25),
      vy: azar(-60, 0),
      destY,
      giro: Math.random() * Math.PI,
      posada: false,
    });
  }
  // Que no se acumulen infinitas.
  while (semillas.length > 80) semillas.shift();
}

function actualizarSemillas(dt) {
  for (const s of semillas) {
    if (s.posada) continue;
    s.vy += 900 * dt;
    s.vx += viento.valor * 120 * dt;
    s.x = limitar(s.x + s.vx * dt, 8, ancho - 8);
    s.y += s.vy * dt;
    s.giro += dt * 8;
    if (s.y >= s.destY) {
      s.y = s.destY;
      s.posada = true;
    }
  }
}

function dibujarSemilla(s) {
  const e = 0.7 + profundidad(s.y) * 0.5;
  ctx.save();
  if (s.posada) {
    ctx.fillStyle = 'rgba(20,40,10,0.25)';
    ctx.beginPath();
    ctx.ellipse(s.x + 0.8, s.y + 1.4, 3.4 * e, 1.1 * e, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.translate(s.x, s.y);
  ctx.rotate(s.giro);
  ctx.scale(e, e);
  const g = ctx.createLinearGradient(0, -2, 0, 2);
  g.addColorStop(0, '#5a4330');
  g.addColorStop(1, '#2a1d12');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, 3.6, 1.9, 0, 0, Math.PI * 2);
  ctx.fill();
  // Rayitas claras, como una pipa de girasol.
  ctx.strokeStyle = 'rgba(225, 205, 165, 0.85)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(-2.6, -0.7);
  ctx.lineTo(2.6, -0.7);
  ctx.moveTo(-2.6, 0.7);
  ctx.lineTo(2.6, 0.7);
  ctx.stroke();
  ctx.restore();
}

// ---------- Patos ----------
// La pata amarilla pasea por la pradera: camina, se para a picotear y sigue.
// Los patitos la siguen a su aire: se quedan atrás, corren para alcanzarla y
// salen corriendo a por las semillas que caen. Con viento, todos se quedan quietos.
function zonaPatos() {
  return { arriba: suelo + (alto - suelo) * 0.3, abajo: alto - 14 };
}

// Tamaño en pantalla de un pato según lo cerca que esté.
function escalaPato(p, adulto) {
  const z = zonaPatos();
  const lejania = limitar((p.y - z.arriba) / Math.max(1, z.abajo - z.arriba), 0, 1);
  // En pantallas estrechas (móvil) se ven un poco más pequeños.
  const pantalla = limitar(ancho / 1000, 0.75, 1);
  return (adulto ? 1.1 : 0.78) * (0.8 + 0.3 * lejania) * pantalla;
}

// Hasta dónde llega el pico de un patito al picotear el suelo (en el dibujo, a escala 1).
const ALCANCE_PICO_PATITO = 22;

function nuevoDestinoPato() {
  const z = zonaPatos();
  const lider = patos.lider;
  let x;
  do x = azar(60, ancho - 60); while (Math.abs(x - lider.x) < Math.min(150, ancho * 0.3));
  lider.destino = { x, y: azar(z.arriba, z.abajo) };
  lider.velocidadCrucero = VELOCIDAD_PATO * azar(0.8, 1.2);
}

function crearPatos() {
  const z = zonaPatos();
  const y = (z.arriba + z.abajo) / 2;
  const lider = {
    x: ancho * 0.35, y, dir: 1, rumbo: 0, paso: 0, velocidad: 0,
    velocidadCrucero: VELOCIDAD_PATO, destino: null, pausa: 0, picoteo: 0, reloj: 0,
  };
  // Rastro inicial hacia la izquierda. camino[0] es el punto más reciente.
  const camino = [];
  for (let d = 0; d < 400; d += 2) camino.push({ x: lider.x - d, y });
  const patitos = [];
  for (let i = 0; i < NUM_PATITOS; i++) {
    patitos.push({
      x: lider.x - 48 - i * 30, y, dir: 1, paso: Math.random() * 6, velocidad: 0,
      estado: 'seguir', semilla: null, comer: 0, picoteo: 0, reloj: Math.random() * 10,
      fase: Math.random() * Math.PI * 2,
    });
  }
  patos = { lider, camino, patitos, quietos: false };
  nuevoDestinoPato();
}

// Mueve la cabeza arriba y abajo: 0 = cabeza alta, 1 = pico en el suelo.
function animarPicoteo(p, dt, activo, ritmo) {
  p.reloj += dt;
  let objetivo = 0;
  if (activo) objetivo = Math.sin(p.reloj * ritmo) > 0.1 ? 1 : 0.2;
  p.picoteo += (objetivo - p.picoteo) * Math.min(1, dt * 14);
}

function actualizarLider(dt, z, esperando) {
  const lider = patos.lider;
  if (lider.pausa > 0 && !patos.quietos) lider.pausa -= dt;

  const parada = patos.quietos || lider.pausa > 0 || esperando;
  const objetivoVel = parada ? 0 : lider.velocidadCrucero;
  // Frena en seco cuando llega el viento y arranca con calma.
  const reaccion = parada ? 10 : 3;
  lider.velocidad += (objetivoVel - lider.velocidad) * Math.min(1, dt * reaccion);

  // Mientras espera, picotea el suelo a ratos.
  const picoteando = !patos.quietos && (lider.pausa > 0 || esperando) && Math.sin(lider.reloj * 1.3) > -0.2;
  animarPicoteo(lider, dt, picoteando, 9);

  const dx = lider.destino.x - lider.x;
  const dy = lider.destino.y - lider.y;
  if (Math.hypot(dx, dy) < 24) {
    // Al llegar, a veces se para un rato a picotear.
    if (Math.random() < 0.55) lider.pausa = azar(1.2, 3.5);
    nuevoDestinoPato();
    return;
  }
  if (lider.velocidad < 0.5) return;

  // Gira poco a poco (en curva) hacia su destino, para que los patitos no se le crucen.
  const giro = normalizarAngulo(Math.atan2(dy, dx) - lider.rumbo);
  const maxGiro = 2.2 * dt * (lider.velocidad / VELOCIDAD_PATO);
  lider.rumbo = normalizarAngulo(lider.rumbo + limitar(giro, -maxGiro, maxGiro));

  const paso = lider.velocidad * dt;
  lider.x += Math.cos(lider.rumbo) * paso;
  lider.y = limitar(lider.y + Math.sin(lider.rumbo) * paso, z.arriba - 6, z.abajo + 4);
  lider.paso += paso * 0.09;
  if (Math.abs(Math.cos(lider.rumbo)) > 0.05) lider.dir = Math.cos(lider.rumbo) > 0 ? 1 : -1;

  const ultimo = patos.camino[0];
  if (Math.hypot(lider.x - ultimo.x, lider.y - ultimo.y) >= 2) {
    patos.camino.unshift({ x: lider.x, y: lider.y });
    if (patos.camino.length > 400) patos.camino.pop();
  }
}

// La semilla más cercana al patito (también las que aún van cayendo: ya las ha visto).
function semillaMasCercana(p) {
  let mejor = null;
  let mejorDist = Infinity;
  for (const s of semillas) {
    const d = Math.hypot(s.x - p.x, s.destY - p.y);
    if (d < mejorDist) {
      mejorDist = d;
      mejor = s;
    }
  }
  return mejor;
}

function actualizarPatito(p, i, dt, z) {
  if (patos.quietos) {
    p.velocidad = 0;
    animarPicoteo(p, dt, false, 0);
    return;
  }

  // Si hay semillas, deja de seguir a la pata y va a por la más cercana.
  if (p.estado !== 'comer') {
    const s = semillaMasCercana(p);
    if (s) {
      p.estado = 'semilla';
      p.semilla = s;
    } else {
      p.estado = 'seguir';
      p.semilla = null;
    }
  }

  if (p.estado === 'comer') {
    p.velocidad = 0;
    animarPicoteo(p, dt, true, 16);
    p.comer -= dt;
    // Si otro patito se la ha comido antes, busca otra.
    if (!semillas.includes(p.semilla)) {
      p.estado = 'seguir';
      p.semilla = null;
    } else if (p.comer <= 0) {
      semillas.splice(semillas.indexOf(p.semilla), 1);
      p.estado = 'seguir';
      p.semilla = null;
    }
    return;
  }
  animarPicoteo(p, dt, false, 0);

  let objetivo;
  let velocidadDeseada;
  if (p.estado === 'semilla') {
    // Se coloca para que el pico caiga justo sobre la semilla.
    const lado = Math.sign(p.semilla.x - p.x) || p.dir;
    const alcance = ALCANCE_PICO_PATITO * escalaPato({ y: p.semilla.destY }, false);
    objetivo = { x: p.semilla.x - lado * alcance, y: p.semilla.destY };
    velocidadDeseada = CARRERA_PATITO;
  } else {
    // Su sitio en la fila, detrás de la pata, con un pequeño vaivén propio.
    const atras = 48 + i * 30;
    const punto = patos.camino[Math.min(patos.camino.length - 1, Math.round(atras / 2))];
    objetivo = { x: punto.x, y: punto.y + Math.sin(tiempoTotal * 0.8 + p.fase) * 4 };
    // Cuanto más lejos se ha quedado, más rápido va (y si está lejos, corre).
    velocidadDeseada = Math.min(CARRERA_PATITO, Math.hypot(objetivo.x - p.x, objetivo.y - p.y) * 2.5);
  }

  const dx = objetivo.x - p.x;
  const dy = objetivo.y - p.y;
  const distancia = Math.hypot(dx, dy);
  p.velocidad += (velocidadDeseada - p.velocidad) * Math.min(1, dt * 6);

  if (p.estado === 'semilla' && distancia < 4 && p.semilla.posada) {
    p.estado = 'comer';
    p.comer = azar(0.35, 0.7);
    p.dir = Math.sign(p.semilla.x - p.x) || p.dir;
    return;
  }

  if (distancia > 0.8) {
    const paso = Math.min(distancia, p.velocidad * dt);
    p.x += (dx / distancia) * paso;
    p.y += (dy / distancia) * paso;
    p.paso += paso * 0.17;
    if (Math.abs(dx) > 0.5) p.dir = dx > 0 ? 1 : -1;
  }

  // No se amontonan: se apartan un poco entre ellos y de la pata.
  for (const otro of [...patos.patitos, patos.lider]) {
    if (otro === p) continue;
    const minimo = otro === patos.lider ? 30 : 15;
    const ox = p.x - otro.x;
    const oy = p.y - otro.y;
    const d = Math.hypot(ox, oy);
    if (d > 0 && d < minimo && p.estado !== 'semilla') {
      p.x += (ox / d) * (minimo - d) * 0.3;
      p.y += (oy / d) * (minimo - d) * 0.3;
    }
  }
  p.x = limitar(p.x, 10, ancho - 10);
  p.y = limitar(p.y, z.arriba - 6, z.abajo + 4);
}

function actualizarPatos(dt) {
  if (!patos) crearPatos();
  const z = zonaPatos();

  // Con viento se paran; cuando se calma, siguen caminando.
  if (viento.fuerza > 0.12) patos.quietos = true;
  else if (viento.fuerza < 0.06) patos.quietos = false;

  // La pata espera mientras sus patitos están comiendo.
  const esperando = patos.patitos.some((p) => p.estado !== 'seguir');
  actualizarLider(dt, z, esperando);
  patos.patitos.forEach((p, i) => actualizarPatito(p, i, dt, z));
}

// Pata palmeada.
function dibujarPata(cadera, caderaY, pieX, grosor) {
  ctx.strokeStyle = COLORES.patas;
  ctx.lineWidth = grosor;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cadera, caderaY);
  ctx.lineTo(pieX, -1);
  ctx.stroke();
  ctx.fillStyle = COLORES.patas;
  ctx.beginPath();
  ctx.moveTo(pieX - 2, 0);
  ctx.lineTo(pieX + 3, -1.5);
  ctx.lineTo(pieX + 8, 0.2);
  ctx.lineTo(pieX + 6.5, 1);
  ctx.lineTo(pieX + 4, 0.4);
  ctx.lineTo(pieX + 1.5, 1);
  ctx.closePath();
  ctx.fill();
}

// Relleno con volumen: claro donde da el sol (arriba a la izquierda) y sombra abajo.
function rellenoPlumaje(colores, luzX, luzY, radio) {
  const g = ctx.createRadialGradient(luzX, luzY, radio * 0.08, luzX + radio * 0.25, luzY + radio * 0.35, radio);
  g.addColorStop(0, colores.claro);
  g.addColorStop(0.45, colores.base);
  g.addColorStop(1, colores.sombra);
  return g;
}

// Pico de pato (plano y redondeado) con su línea de cierre y el orificio nasal.
function dibujarPico(x, y, largo, alto) {
  const g = ctx.createLinearGradient(0, y - alto, 0, y + alto);
  g.addColorStop(0, COLORES.pico[0]);
  g.addColorStop(1, COLORES.pico[1]);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x, y - alto * 0.7);
  ctx.bezierCurveTo(x + largo * 0.5, y - alto * 1.1, x + largo * 0.9, y - alto * 0.6, x + largo, y + alto * 0.1);
  ctx.quadraticCurveTo(x + largo * 0.96, y + alto * 0.8, x + largo * 0.75, y + alto * 0.8);
  ctx.bezierCurveTo(x + largo * 0.5, y + alto * 0.9, x + largo * 0.2, y + alto, x, y + alto * 0.9);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(90, 40, 0, 0.35)';
  ctx.lineWidth = 0.4;
  ctx.beginPath();
  ctx.moveTo(x + largo * 0.1, y + alto * 0.25);
  ctx.quadraticCurveTo(x + largo * 0.6, y + alto * 0.35, x + largo * 0.95, y + alto * 0.2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(70, 30, 0, 0.6)';
  ctx.beginPath();
  ctx.ellipse(x + largo * 0.32, y - alto * 0.35, largo * 0.06, alto * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
}

// Ojo con su brillo; cerrado si aguanta el viento.
function dibujarOjo(x, y, r, cerrado) {
  if (cerrado) {
    ctx.strokeStyle = 'rgba(40, 25, 10, 0.8)';
    ctx.lineWidth = r * 0.5;
    ctx.beginPath();
    ctx.arc(x, y - r * 0.4, r * 1.1, 0.3, Math.PI - 0.3);
    ctx.stroke();
    return;
  }
  ctx.fillStyle = '#17110b';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.32, 0, Math.PI * 2);
  ctx.fill();
}

// Dibuja un pato de lado mirando a la derecha (dir 1) o a la izquierda (dir -1).
// El origen son sus patas, así se apoya en el suelo.
function dibujarPato(p, adulto) {
  const s = escalaPato(p, adulto);
  const colores = adulto ? COLORES.pato : COLORES.patito;
  const quieto = patos.quietos;
  const andando = !quieto && p.velocidad > 3;
  const corriendo = limitar((p.velocidad - 60) / 60, 0, 1);
  const k = p.picoteo;
  // La luz viene de la izquierda del mundo; al mirar a la izquierda, el dibujo se voltea.
  const luzX = -8 * p.dir;

  // Sombra en el suelo.
  ctx.save();
  const gs = ctx.createRadialGradient(p.x + 3 * s, p.y, 0, p.x + 3 * s, p.y, (adulto ? 26 : 18) * s);
  gs.addColorStop(0, 'rgba(20, 45, 10, 0.35)');
  gs.addColorStop(1, 'rgba(20, 45, 10, 0)');
  ctx.fillStyle = gs;
  ctx.translate(p.x + 3 * s, p.y);
  ctx.scale(1, 0.22);
  ctx.beginPath();
  ctx.arc(0, 0, (adulto ? 26 : 18) * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(p.dir * s, s);
  // Con viento se agachan hacia él para aguantar; caminando se balancean;
  // corriendo y picoteando se echan hacia delante.
  const aguante = -viento.valor * 0.22 * p.dir;
  let inclinacionCuerpo = quieto ? aguante : (andando ? Math.sin(p.paso) * 0.05 : 0) + corriendo * 0.12;
  inclinacionCuerpo += k * 0.3;
  const bote = andando ? -Math.abs(Math.sin(p.paso)) * (1.5 + corriendo * 2) : 0;

  // Patas (la de atrás un poco más oscura).
  const zancada = andando ? Math.sin(p.paso) * (4 + corriendo * 3) : 0;
  ctx.globalAlpha = 0.85;
  dibujarPata(adulto ? 2 : 1, (adulto ? -7 : -5) + bote, (adulto ? 2 : 1) - zancada, adulto ? 2.2 : 1.8);
  ctx.globalAlpha = 1;
  dibujarPata(adulto ? -3 : -2, (adulto ? -7 : -5) + bote, (adulto ? -3 : -2) + zancada, adulto ? 2.2 : 1.8);

  ctx.rotate(inclinacionCuerpo);
  ctx.translate(0, bote);

  // Cuello y cabeza giran juntos alrededor de la base del cuello al picotear.
  const balanceo = andando ? Math.sin(p.paso * 2) * (adulto ? 1.2 : 0.8) : 0;
  const colocarCabeza = (bx, by) => {
    ctx.translate(bx, by);
    ctx.rotate(k * 1.05);
    ctx.translate(balanceo, 0);
  };
  const ojosCerrados = quieto && viento.fuerza > 0.3;

  if (adulto) {
    // El cuello va primero para que el cuerpo tape su base.
    ctx.save();
    colocarCabeza(12, -26);
    ctx.fillStyle = rellenoPlumaje(colores, luzX * 0.5, -14, 22);
    ctx.beginPath();
    ctx.moveTo(-9, 4);
    ctx.bezierCurveTo(-8, -6, -6, -13, -2, -17);
    ctx.lineTo(9, -15);
    ctx.bezierCurveTo(9, -8, 11, -2, 14, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Cuerpo alargado con la cola levantada.
    const gc = ctx.createLinearGradient(0, -32, 0, -4);
    gc.addColorStop(0, colores.claro);
    gc.addColorStop(0.45, colores.base);
    gc.addColorStop(1, colores.sombra);
    ctx.fillStyle = gc;
    ctx.beginPath();
    ctx.moveTo(-31, -27);
    ctx.quadraticCurveTo(-24, -31, -12, -31);
    ctx.bezierCurveTo(2, -32, 16, -30, 21, -22);
    ctx.bezierCurveTo(25, -14, 19, -6, 6, -5);
    ctx.bezierCurveTo(-8, -4, -20, -8, -26, -16);
    ctx.quadraticCurveTo(-29, -20, -31, -27);
    ctx.closePath();
    ctx.fill();
    // Brillo del sol en el lomo.
    const gb = ctx.createRadialGradient(luzX - 2, -28, 0, luzX - 2, -28, 22);
    gb.addColorStop(0, 'rgba(255,255,255,0.4)');
    gb.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gb;
    ctx.fill();

    // Ala plegada con las plumas largas hacia la cola (con viento se levanta un poco).
    ctx.save();
    ctx.translate(6, -24);
    ctx.rotate(-(quieto ? viento.fuerza * 0.18 : 0));
    const ga = ctx.createLinearGradient(0, -6, 0, 10);
    ga.addColorStop(0, colores.ala);
    ga.addColorStop(1, colores.alaSombra);
    ctx.fillStyle = ga;
    ctx.beginPath();
    ctx.moveTo(4, 2);
    ctx.bezierCurveTo(-2, -6, -20, -6, -33, -2);
    ctx.bezierCurveTo(-28, 4, -14, 9, 0, 8);
    ctx.quadraticCurveTo(5, 6, 4, 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(90, 60, 0, 0.25)';
    ctx.lineWidth = 0.5;
    for (let f = 0; f < 5; f++) {
      ctx.beginPath();
      ctx.moveTo(-8 - f * 2.5, 1 + f * 1.2);
      ctx.quadraticCurveTo(-18 - f * 2, 0 + f, -30 + f * 1.5, -1 + f * 0.6);
      ctx.stroke();
    }
    ctx.restore();

    // Cabeza, encima del cuerpo (al picotear queda por delante del pecho).
    ctx.save();
    colocarCabeza(12, -26);
    ctx.fillStyle = rellenoPlumaje(colores, luzX * 0.4 + 2, -22, 13);
    ctx.beginPath();
    ctx.moveTo(-2, -17);
    ctx.lineTo(9, -15);
    ctx.lineTo(8, -11);
    ctx.lineTo(-1, -12);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(4, -19, 10, 8, -0.12, 0, Math.PI * 2);
    ctx.fill();
    dibujarPico(13, -18, 13, 3);
    dibujarOjo(6, -21.5, 1.6, ojosCerrados);
    ctx.restore();
  } else {
    // Cuello corto y gordito (va detrás del cuerpo).
    ctx.save();
    colocarCabeza(6, -17);
    ctx.fillStyle = colores.base;
    ctx.beginPath();
    ctx.ellipse(1, -3, 6.5, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Patito: cuerpo redondo de plumón.
    ctx.fillStyle = rellenoPlumaje(colores, luzX, -18, 22);
    ctx.beginPath();
    ctx.moveTo(-17, -14);
    ctx.quadraticCurveTo(-16, -23, -4, -23);
    ctx.bezierCurveTo(8, -24, 15, -18, 15, -11);
    ctx.bezierCurveTo(15, -4, 6, -3, -2, -3);
    ctx.bezierCurveTo(-10, -3, -17, -6, -17, -14);
    ctx.closePath();
    ctx.fill();

    // Plumón: borde de arriba suave y algo esponjoso.
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (let fx = -14; fx <= 11; fx += 2.5) {
      const fy = -21.6 + ((fx + 4) * (fx + 4)) / 50;
      ctx.beginPath();
      ctx.arc(fx, fy, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Alita.
    ctx.fillStyle = colores.ala;
    ctx.beginPath();
    ctx.ellipse(-4, -13, 6.5, 4, -0.25 - (quieto ? viento.fuerza * 0.25 : 0), 0, Math.PI * 2);
    ctx.fill();

    // Cabeza grande y redonda.
    ctx.save();
    colocarCabeza(6, -17);
    ctx.fillStyle = rellenoPlumaje(colores, luzX * 0.4, -12, 12);
    ctx.beginPath();
    ctx.arc(3, -9, 8, 0, Math.PI * 2);
    ctx.fill();
    dibujarPico(9.5, -8, 7.5, 2.1);
    dibujarOjo(5, -11, 1.35, ojosCerrados);
    ctx.restore();
  }

  ctx.restore();
}

// Hierbas, flores, semillas y patos se dibujan de atrás hacia delante según su altura en la pradera.
function dibujarSuelo() {
  const escena = plantas.map((pl) => ({ y: pl.y, dibujar: () => (pl.tipo === 'flor' ? dibujarFlor(pl) : dibujarHierba(pl)) }));
  for (const s of semillas) if (s.posada) escena.push({ y: s.y - 0.5, dibujar: () => dibujarSemilla(s) });
  escena.push({ y: patos.lider.y, dibujar: () => dibujarPato(patos.lider, true) });
  for (const p of patos.patitos) escena.push({ y: p.y, dibujar: () => dibujarPato(p, false) });
  escena.sort((a, b) => a.y - b.y);
  ctx.save();
  for (const e of escena) e.dibujar();
  ctx.restore();
  // Las que aún caen van por delante de todo.
  for (const s of semillas) if (!s.posada) dibujarSemilla(s);
}

// ---------- Botones ----------
const botonMotores = document.getElementById('motores');
const botonSemillas = document.getElementById('semillas');

botonMotores.addEventListener('click', () => {
  motores = !motores;
  botonMotores.setAttribute('aria-pressed', String(motores));
});

botonSemillas.addEventListener('click', () => {
  modoSemillas = !modoSemillas;
  botonSemillas.setAttribute('aria-pressed', String(modoSemillas));
  document.body.classList.toggle('modo-semillas', modoSemillas);
});

canvas.addEventListener('pointerdown', (e) => {
  if (modoSemillas) soltarSemillas(e.clientX, e.clientY);
});

// ---------- Bucle principal ----------
// Al cambiar el tamaño de la ventana, el paisaje se redibuja (con una pequeña espera
// para no rehacerlo muchas veces seguidas mientras se arrastra el borde).
let esperaRedibujo = null;
window.addEventListener('resize', () => {
  clearTimeout(esperaRedibujo);
  esperaRedibujo = setTimeout(ajustarTamano, 150);
});
ajustarTamano();
nuevaPasada();
avion.x = ancho * 0.15;

let ultimo = performance.now();

function bucle(ahora) {
  // Limita el paso por si la pestaña estuvo en segundo plano.
  const dt = Math.min(0.05, (ahora - ultimo) / 1000);
  ultimo = ahora;
  tiempoTotal += dt;

  actualizarViento(dt);
  actualizarAvion(dt);
  actualizarSemillas(dt);
  actualizarPatos(dt);

  ctx.drawImage(fondo, 0, 0, ancho, alto);
  dibujarEstela();
  dibujarAvion();
  dibujarSuelo();
  dibujarHojasVolando();
  dibujarBriznas();

  requestAnimationFrame(bucle);
}

requestAnimationFrame(bucle);

// =========================================================
// AppNic.2 — avión de papel volando de izquierda a derecha
// dejando una estela de líneas negras entrecortadas.
// =========================================================

const canvas = document.getElementById('cielo');
const ctx = canvas.getContext('2d');

// ---------- Ajustes ----------
const VELOCIDAD = 190;          // px por segundo
const ESCALA_AVION = 1.15;
const COLOR_CREMA = '#f3e6c8';
const COLOR_CREMA_SOMBRA = '#e2d0a6';
const COLOR_BORDE = '#111111';
const TRAZO_GUION = [14, 10];   // largo del guion, largo del hueco
const MARGEN = 90;              // distancia mínima a los bordes de arriba y abajo

let ancho = 0;
let alto = 0;

function ajustarTamano() {
  const dpr = window.devicePixelRatio || 1;
  ancho = window.innerWidth;
  alto = window.innerHeight;
  canvas.width = Math.round(ancho * dpr);
  canvas.height = Math.round(alto * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', ajustarTamano);
ajustarTamano();

// ---------- Utilidades ----------
const azar = (min, max) => min + Math.random() * (max - min);
const limitar = (v, min, max) => Math.max(min, Math.min(max, v));
const signoAzar = () => (Math.random() < 0.5 ? -1 : 1);
const GRADO = Math.PI / 180;

function normalizarAngulo(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

// ---------- Estado del avión ----------
// Ángulo 0 = hacia la derecha. Ángulo negativo = subiendo (en canvas la Y crece hacia abajo).
const avion = {
  x: -60,
  y: 0,
  angulo: 0,
  giro: 0,           // velocidad de giro actual (rad/s)
  velocidad: VELOCIDAD,
  recorrido: 0,      // distancia total recorrida, sirve para la estela
};

// La estela guarda puntos con la distancia recorrida en ese momento.
// "corte" marca dónde empieza un tramo nuevo (cuando el avión vuelve a salir por la izquierda).
const estela = [];

// ---------- Maniobras ----------
// Cada maniobra dice cuánto dura y qué giro quiere el avión en cada momento.
let maniobra = null;

function anguloObjetivoSeguro(objetivo) {
  // Si está cerca del borde, obliga a ir hacia el centro.
  if (avion.y < MARGEN * 1.5) return Math.max(objetivo, azar(15, 35) * GRADO);
  if (avion.y > alto - MARGEN * 1.5) return Math.min(objetivo, -azar(15, 35) * GRADO);
  return objetivo;
}

function nuevaManiobra() {
  const cercaBorde = avion.y < MARGEN * 1.8 || avion.y > alto - MARGEN * 1.8;
  const r = Math.random();

  // Recto: mantiene casi la misma dirección.
  if (r < 0.22 || cercaBorde) {
    const objetivo = anguloObjetivoSeguro(azar(-8, 8) * GRADO);
    return { tipo: 'recto', tiempo: 0, duracion: azar(0.8, 1.6), objetivo };
  }

  // Diagonal: sube o baja en línea recta.
  if (r < 0.48) {
    const objetivo = anguloObjetivoSeguro(signoAzar() * azar(22, 40) * GRADO);
    return { tipo: 'diagonal', tiempo: 0, duracion: azar(0.9, 1.8), objetivo };
  }

  // Curva suave en forma de S (ondas).
  if (r < 0.72) {
    return {
      tipo: 'ondas',
      tiempo: 0,
      duracion: azar(1.8, 3.2),
      amplitud: azar(25, 45) * GRADO,
      frecuencia: azar(0.6, 1.1),
      fase: Math.random() * Math.PI * 2,
    };
  }

  // Curva amplia hacia arriba o hacia abajo.
  if (r < 0.88) {
    const sentido = avion.y > alto / 2 ? -1 : 1;
    return { tipo: 'curva', tiempo: 0, duracion: azar(0.7, 1.2), giro: sentido * azar(0.9, 1.5) };
  }

  // Rizo completo (looping), siempre hacia arriba, si hay espacio.
  const radio = VELOCIDAD / 3.4;
  if (avion.y > radio * 2 + MARGEN && Math.abs(avion.angulo) < 20 * GRADO) {
    return { tipo: 'rizo', tiempo: 0, girado: 0, giro: -3.4 };
  }
  return { tipo: 'recto', tiempo: 0, duracion: 1, objetivo: anguloObjetivoSeguro(0) };
}

// Calcula el giro deseado según la maniobra actual.
function giroDeseado(dt) {
  const m = maniobra;
  m.tiempo += dt;

  if (m.tipo === 'recto' || m.tipo === 'diagonal') {
    return limitar((m.objetivo - avion.angulo) * 3, -1.8, 1.8);
  }
  if (m.tipo === 'ondas') {
    const objetivo = anguloObjetivoSeguro(
      Math.sin(m.tiempo * m.frecuencia * Math.PI * 2 + m.fase) * m.amplitud
    );
    return limitar((objetivo - avion.angulo) * 4, -2.2, 2.2);
  }
  if (m.tipo === 'curva') {
    // No deja que la curva apunte demasiado hacia arriba o abajo.
    if (Math.abs(avion.angulo) > 65 * GRADO && Math.sign(avion.angulo) === Math.sign(m.giro)) {
      return 0;
    }
    return m.giro;
  }
  if (m.tipo === 'rizo') {
    return m.giro;
  }
  return 0;
}

function maniobraTerminada() {
  const m = maniobra;
  if (m.tipo === 'rizo') return Math.abs(m.girado) >= Math.PI * 2 - 0.05;
  return m.tiempo >= m.duracion;
}

// ---------- Reinicio por la izquierda ----------
function reiniciarAvion() {
  avion.x = -60;
  avion.y = azar(alto * 0.25, alto * 0.75);
  avion.angulo = azar(-15, 15) * GRADO;
  avion.giro = 0;
  estela.push({ corte: true });
  maniobra = nuevaManiobra();
}

// ---------- Actualización del vuelo ----------
let tiempoTotal = 0;
let distanciaUltimoPunto = 0;

function actualizar(dt) {
  tiempoTotal += dt;

  if (!maniobra || maniobraTerminada()) maniobra = nuevaManiobra();

  // Giro suavizado: el avión no cambia de dirección de golpe.
  const deseado = giroDeseado(dt);
  const suavizado = maniobra.tipo === 'rizo' ? 6 : 3;
  avion.giro += (deseado - avion.giro) * Math.min(1, dt * suavizado);
  avion.angulo += avion.giro * dt;
  if (maniobra.tipo === 'rizo') maniobra.girado += avion.giro * dt;
  else avion.angulo = normalizarAngulo(avion.angulo);

  // Como un avión de papel: pierde velocidad al subir y la gana al bajar.
  const objetivoVel = VELOCIDAD * (1 + 0.35 * Math.sin(avion.angulo));
  avion.velocidad += (objetivoVel - avion.velocidad) * Math.min(1, dt * 1.5);

  const paso = avion.velocidad * dt;
  avion.x += Math.cos(avion.angulo) * paso;
  avion.y += Math.sin(avion.angulo) * paso;
  avion.recorrido += paso;

  // Guarda un punto de la estela desde la cola del avión.
  if (avion.recorrido - distanciaUltimoPunto > 3) {
    const cola = -18 * ESCALA_AVION;
    estela.push({
      x: avion.x + Math.cos(avion.angulo) * cola,
      y: avion.y + Math.sin(avion.angulo) * cola,
      d: avion.recorrido,
    });
    distanciaUltimoPunto = avion.recorrido;
  }

  // Cuando sale por la derecha, vuelve a entrar por la izquierda.
  if (avion.x > ancho + 80) reiniciarAvion();

  // Borra la parte de la estela que ya desapareció del todo.
  const largoMax = largoEstela().total;
  while (estela.length && (estela[0].corte || avion.recorrido - estela[0].d > largoMax)) {
    estela.shift();
  }
}

// La estela se ve entera hasta "visible" y luego se va desvaneciendo hasta "total".
function largoEstela() {
  const visible = Math.max(380, ancho * 0.45);
  return { visible, total: visible + Math.max(300, ancho * 0.35) };
}

// ---------- Dibujo ----------
function dibujarEstela() {
  const { visible, total } = largoEstela();
  ctx.save();
  ctx.strokeStyle = COLOR_BORDE;
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.setLineDash(TRAZO_GUION);

  for (let i = 1; i < estela.length; i++) {
    const a = estela[i - 1];
    const b = estela[i];
    if (a.corte || b.corte) continue;

    const atras = avion.recorrido - b.d;
    let alfa = 1;
    if (atras > visible) alfa = 1 - (atras - visible) / (total - visible);
    if (alfa <= 0) continue;

    ctx.globalAlpha = alfa;
    // El desfase hace que los guiones sigan el recorrido y no "bailen".
    ctx.lineDashOffset = a.d;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();
}

function dibujarAvion() {
  ctx.save();
  ctx.translate(avion.x, avion.y);

  // Pequeño temblor de papel y alabeo según lo fuerte que gira.
  const temblor = Math.sin(tiempoTotal * 11) * 1.6 * GRADO;
  ctx.rotate(avion.angulo + temblor);
  const alabeo = 1 - Math.min(0.45, Math.abs(avion.giro) * 0.12);
  ctx.scale(ESCALA_AVION, ESCALA_AVION * alabeo);

  ctx.lineJoin = 'round';
  ctx.lineWidth = 2 / ESCALA_AVION;
  ctx.strokeStyle = COLOR_BORDE;

  // Ala de abajo (más oscura, queda detrás).
  ctx.beginPath();
  ctx.moveTo(30, 0);
  ctx.lineTo(-22, 17);
  ctx.lineTo(-12, 3);
  ctx.closePath();
  ctx.fillStyle = COLOR_CREMA_SOMBRA;
  ctx.fill();
  ctx.stroke();

  // Quilla (el pliegue central).
  ctx.beginPath();
  ctx.moveTo(30, 0);
  ctx.lineTo(-12, 3);
  ctx.lineTo(-17, 9);
  ctx.closePath();
  ctx.fillStyle = COLOR_CREMA_SOMBRA;
  ctx.fill();
  ctx.stroke();

  // Ala de arriba (la grande y clara).
  ctx.beginPath();
  ctx.moveTo(30, 0);
  ctx.lineTo(-24, -18);
  ctx.lineTo(-12, 3);
  ctx.closePath();
  ctx.fillStyle = COLOR_CREMA;
  ctx.fill();
  ctx.stroke();

  // Línea del doblez del ala.
  ctx.beginPath();
  ctx.moveTo(26, -1);
  ctx.lineTo(-16, -9);
  ctx.lineWidth = 1 / ESCALA_AVION;
  ctx.stroke();

  ctx.restore();
}

// ---------- Bucle principal ----------
let ultimo = performance.now();

function bucle(ahora) {
  // Limita el paso por si la pestaña estuvo en segundo plano.
  const dt = Math.min(0.05, (ahora - ultimo) / 1000);
  ultimo = ahora;

  actualizar(dt);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, ancho, alto);
  dibujarEstela();
  dibujarAvion();

  requestAnimationFrame(bucle);
}

avion.y = alto / 2;
maniobra = nuevaManiobra();
requestAnimationFrame(bucle);

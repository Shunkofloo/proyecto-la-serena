require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const CORS_ORIGIN = process.env.CORS_ORIGIN;
const ADMIN_RUT = normalizeRut(process.env.ADMIN_RUT || '');
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

if (!JWT_SECRET || JWT_SECRET.includes('cambia_este_valor')) {
  console.warn(
    '\n[SIGED] ADVERTENCIA: define un JWT_SECRET propio y seguro en tu archivo .env antes de usar en producción.\n'
  );
}
if (!ADMIN_PASSWORD_HASH || ADMIN_PASSWORD_HASH.includes('PEGA_AQUI')) {
  console.warn(
    '[SIGED] ADVERTENCIA: no hay ADMIN_PASSWORD_HASH configurado. Ejecuta "npm run hash -- \\"tu_clave\\"" y copia el resultado en .env.\n'
  );
}

// ---------- Middlewares de seguridad base ----------
app.use(helmet());
app.use(
  cors({
    origin: CORS_ORIGIN || false,
    credentials: true,
  })
);
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

// Limita intentos de login para mitigar fuerza bruta
const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de inicio de sesión. Intenta nuevamente en un minuto.' },
});

// ---------- Utilidades de RUT chileno ----------
// Normaliza: solo deja dígitos y un guion, sin puntos ni espacios.
function normalizeRut(rut) {
  return String(rut || '')
    .toUpperCase()
    .replace(/[^0-9-]/g, '');
}

// Valida formato: 1 a 8 dígitos de cuerpo + "-" + 1 dígito verificador (solo números, sin K)
// y valida el dígito verificador con módulo 11.
function isValidRut(rut) {
  const clean = normalizeRut(rut);
  const match = /^([0-9]{1,8})-([0-9])$/.exec(clean);
  if (!match) return false;

  const body = match[1];
  const dv = match[2];

  // máximo 9 dígitos en total (cuerpo + verificador), como pide el formulario
  if (body.length + 1 > 9) return false;

  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const remainder = 11 - (sum % 11);
  let expectedDv = String(remainder);
  if (remainder === 11) expectedDv = '0';
  if (remainder === 10) return false; // el verificador sería "K", no permitido por este formulario

  return expectedDv === dv;
}

// ---------- Autenticación ----------
function signSession(rut) {
  return jwt.sign({ rut, role: 'ADMINISTRADOR' }, JWT_SECRET, { expiresIn: '8h' });
}

function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies.siged_session;
  if (!token) return res.status(401).json({ error: 'No autenticado.' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Sesión inválida o expirada.' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: 'No tienes autorización para acceder a este recurso.' });
    }
    return next();
  };
}

app.post('/api/login', loginLimiter, async (req, res) => {
  const { rut, password } = req.body || {};

  if (typeof rut !== 'string' || typeof password !== 'string' || !rut.trim() || !password) {
    return res.status(400).json({ error: 'Debes ingresar RUT y contraseña.' });
  }
  if (Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(400).json({ error: 'La contraseña supera el largo permitido.' });
  }
  if (!isValidRut(rut)) {
    return res.status(400).json({ error: 'El RUT ingresado no tiene un formato válido.' });
  }

  const cleanRut = normalizeRut(rut);

  // Respuesta genérica en ambos casos de fallo, para no revelar cuál dato es incorrecto
  const invalidCredentials = () => res.status(401).json({ error: 'RUT o contraseña incorrectos.' });

  if (cleanRut !== ADMIN_RUT) return invalidCredentials();
  if (!ADMIN_PASSWORD_HASH) return res.status(500).json({ error: 'El servidor no tiene credenciales configuradas.' });
  if (!JWT_SECRET || JWT_SECRET.includes('cambia_este_valor')) {
    return res.status(500).json({ error: 'El servidor no tiene la sesión configurada de forma segura.' });
  }

  const passwordOk = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
  if (!passwordOk) return invalidCredentials();

  const token = signSession(cleanRut);
  res.cookie('siged_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000,
  });

  return res.json({ ok: true });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('siged_session');
  res.json({ ok: true });
});

app.get('/api/session', requireAuth, (req, res) => {
  res.json({ rut: req.user.rut, role: req.user.role });
});

// ---------- Datos de ejemplo (mismos escenarios del documento de diseño) ----------
const delegaciones = [
  'Central',
  'Rural',
  'La Antena',
  'La Pampa',
  'Avenida del Mar',
  'Las Compañías',
];

const areas = [
  'Seguridad Ciudadana',
  'Gestión Social y Comunitaria',
  'Servicio a la Comunidad',
  'Instituciones Municipales y Participación',
];

const requerimientos = [
  { id: 'TK-1042', fecha: '2026-08-24', vecino: 'Pedro Soto', area: 'Seguridad Ciudadana', delegacion: 'La Antena', dias: 2, semaforo: 'VERDE', estado: 'En Proceso', responsable: 'Patrulla Sector 3' },
  { id: 'TK-1038', fecha: '2026-08-21', vecino: 'Carmen Luz', area: 'Servicio a la Comunidad', delegacion: 'Las Compañías', dias: 5, semaforo: 'AMARILLO', estado: 'Pendiente Material', responsable: 'Cuadrilla Verde' },
  { id: 'TK-0995', fecha: '2026-08-15', vecino: 'Roberto Vera', area: 'Gestión Social y Comunitaria', delegacion: 'Rural', dias: 11, semaforo: 'ROJO', estado: 'Cuello Botella Central', responsable: 'DIDECO Soporte' },
  { id: 'TK-1050', fecha: '2026-09-05', vecino: 'Marta Rojas', area: 'Servicio a la Comunidad', delegacion: 'Avenida del Mar', dias: 1, semaforo: 'VERDE', estado: 'Pendientes', responsable: '—' },
  { id: 'TK-1048', fecha: '2026-09-05', vecino: 'Luis Araya', area: 'Servicio a la Comunidad', delegacion: 'La Pampa', dias: 1, semaforo: 'VERDE', estado: 'Pendientes', responsable: '—' },
  { id: 'TK-1020', fecha: '2026-08-10', vecino: 'Sofía Muñoz', area: 'Gestión Social y Comunitaria', delegacion: 'Central', dias: 0, semaforo: 'VERDE', estado: 'Resuelto', responsable: 'DIDECO Soporte' },
];

// Todas las rutas de datos requieren sesión activa
app.get('/api/catalogos', requireAuth, requireRole('ADMINISTRADOR'), (req, res) => {
  res.json({ delegaciones, areas });
});

app.get('/api/requerimientos', requireAuth, requireRole('ADMINISTRADOR'), (req, res) => {
  res.json(requerimientos);
});

app.post('/api/requerimientos', requireAuth, requireRole('ADMINISTRADOR'), (req, res) => {
  const { nombre, telefono, delegacion, canal, area, tipo, descripcion, funcionario } = req.body || {};

  if (!nombre || !telefono || !delegacion || !canal || !area || !tipo || !descripcion) {
    return res.status(400).json({ error: 'Faltan campos obligatorios del formulario.' });
  }
  if (!/^\+569\d{8}$/.test(String(telefono))) {
    return res.status(400).json({ error: 'El teléfono debe comenzar con +569 y contener 8 números adicionales.' });
  }

  const nuevo = {
    id: `TK-${1000 + requerimientos.length + 1}`,
    fecha: new Date().toISOString().slice(0, 10),
    vecino: nombre,
    area,
    delegacion,
    dias: 0,
    semaforo: 'VERDE',
    estado: 'Ingresado',
    responsable: funcionario || '—',
  };

  requerimientos.unshift(nuevo);
  res.status(201).json(nuevo);
});

// ---------- Páginas y archivos estáticos del frontend ----------
// dashboard.html vive fuera de /public a propósito: así nunca se sirve como
// archivo estático sin pasar antes por requireAuth.
app.get('/dashboard', requireAuth, requireRole('ADMINISTRADOR'), (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`SIGED La Serena escuchando en http://localhost:${PORT}`);
});

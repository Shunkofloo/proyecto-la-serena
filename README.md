# SIGED La Serena

Frontend + backend del Sistema Integrado de Gestión Operativa y Control de Requerimientos
Delegacionales, para la Ilustre Municipalidad de La Serena. Incluye login con validación de
RUT chileno y las 3 plantillas descritas en la documentación del proyecto:

1. **Captura de Requerimiento** (sección 6.1)
2. **Panel Semáforo** de cumplimiento diario (sección 6.2)
3. **Tablero Kanban** por estado (sección 6.3)

## Estructura

```
siged-la-serena/
├── server.js              # Backend Express (API + autenticación)
├── package.json
├── .env.example            # Plantilla de variables de entorno
├── scripts/
│   └── generate-hash.js    # Genera el hash bcrypt de la contraseña del admin
├── views/
│   └── dashboard.html      # Página protegida (solo accesible con sesión)
└── public/                 # Archivos estáticos (login, css, js, logo)
    ├── index.html           # Pantalla de login
    ├── css/style.css
    ├── js/login.js
    ├── js/dashboard.js
    └── assets/logo.svg      # Logo PLACEHOLDER — reemplázalo por el oficial
```

## Instalación

```bash
npm install
```

## Configurar credenciales del administrador

Por seguridad, la contraseña **nunca se guarda en texto plano**, ni siquiera en el `.env`.
Se guarda su hash bcrypt.

1. Copia el archivo de entorno de ejemplo:
   ```bash
   cp .env.example .env
   ```
2. Genera el hash de tu contraseña (ejemplo con `admin123`, cámbiala si quieres otra):
   ```bash
   npm run hash -- "admin123"
   ```
3. Copia la línea `ADMIN_PASSWORD_HASH=...` que imprime la consola dentro de tu `.env`.
4. Define el RUT del administrador en `.env` (formato `12345678-9`, sin puntos):
   ```
   ADMIN_RUT=11111111-1
   ```
5. Define un `JWT_SECRET` propio, largo y aleatorio (no uses el de ejemplo).

## Ejecutar

```bash
npm start
```

Por defecto queda disponible en `http://localhost:3000`.

- `/` → pantalla de login
- `/dashboard` → panel de gestión (requiere sesión activa)

## Reemplazar el logo

Cambia `public/assets/logo.svg` por el escudo/logo oficial de la Municipalidad de La Serena
(mismo nombre de archivo, o actualiza la ruta en `public/index.html` y
`views/dashboard.html`).

## Cómo funciona la validación del RUT

- El campo solo permite dígitos (`0-9`) y un guion `-`, tal como se pidió.
- Se limita a un máximo de 9 dígitos en total (8 del cuerpo + 1 dígito verificador),
  ej: `11111111-1`.
- Tanto el frontend (para dar feedback inmediato) como el backend (por seguridad real)
  validan el dígito verificador con el algoritmo módulo 11 del RUT chileno.
- **Nota:** este formulario, tal como se especificó, solo acepta números en el
  verificador. Los RUT cuyo dígito verificador es "K" no son aceptados. Si tu
  municipio necesita aceptar "K", dímelo y ajusto la validación.

## Seguridad implementada

- Contraseña de administrador almacenada como **hash bcrypt**, nunca en texto plano.
- Sesión manejada con **JWT firmado**, guardado en una cookie `httpOnly` (no accesible
  desde JavaScript del navegador) y `sameSite=lax`.
- **Rate limiting** en `/api/login`: máximo 8 intentos cada 15 minutos por IP, para
  mitigar ataques de fuerza bruta.
- Cabeceras de seguridad HTTP con `helmet`.
- Mensajes de error de login genéricos ("RUT o contraseña incorrectos"), sin indicar
  cuál de los dos datos falló.
- Todas las rutas de datos (`/api/requerimientos`, `/api/catalogos`, `/dashboard`)
  exigen sesión válida (middleware `requireAuth`).
- El archivo `dashboard.html` vive fuera de la carpeta pública estática, por lo que
  nunca puede accederse directamente sin pasar por la verificación de sesión.

### Antes de llevarlo a producción

- Sirve la aplicación detrás de HTTPS y activa `secure: true` en la cookie (ya está
  condicionado a `NODE_ENV=production`).
- Reemplaza los datos de ejemplo (`requerimientos`, `delegaciones`, `areas` en
  `server.js`) por la conexión real a PostgreSQL, siguiendo el esquema de la sección 7
  del documento de diseño.
- Considera agregar más usuarios/roles (Coordinador, Delegado, Funcionario, Ciudadano)
  cuando amplíes más allá del login de administrador.

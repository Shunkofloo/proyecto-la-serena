# SIGED La Serena

Sistema Integrado de Gestion Operativa y Control de Requerimientos Delegacionales.

La aplicacion incluye una portada municipal, acceso para funcionarios y un panel protegido con datos de demostracion.

## Requisitos

- Node.js 18 o superior.
- npm.

## Instalacion y ejecucion

1. Instala dependencias con `npm ci`.
2. Copia `.env.example` a `.env`.
3. Configura `JWT_SECRET` con un valor largo, aleatorio y privado.
4. Define el RUT del administrador en `ADMIN_RUT`.
5. Genera un hash bcrypt con `npm run hash -- "tu_clave_segura"` y pega el resultado en `ADMIN_PASSWORD_HASH`.
6. Inicia el servidor con `npm start` y abre `http://localhost:3000`.

No subas `.env` a GitHub. El archivo contiene configuracion local y debe permanecer ignorado por Git.

## Rutas principales

- `/`: portada e inicio de sesion.
- `/dashboard`: panel protegido para la cuenta administradora.
- `/api/session`, `/api/catalogos` y `/api/requerimientos`: API protegida por sesion.

## Controles de acceso

- Contrasena almacenada como hash bcrypt y comparada en el servidor.
- Cookie de sesion JWT `HttpOnly`, con expiracion de 8 horas.
- Maximo de 8 intentos de inicio de sesion por IP cada minuto.
- Rutas del panel y API restringidas al rol `ADMINISTRADOR`.
- Para produccion, configura secretos propios y sirve el sitio mediante HTTPS.

## Seguridad

Consulta [SECURITY.md](SECURITY.md) para las politicas de autenticacion, autorizacion y mitigacion de amenazas.
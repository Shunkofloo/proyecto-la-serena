# Politica de seguridad de acceso

## Autenticacion

- El acceso al portal requiere RUT valido y contrasena. El servidor verifica las credenciales; la contrasena se transmite para esa verificacion, pero no se devuelve al cliente ni se persiste en texto plano.
- La contrasena se almacena como hash bcrypt. Se rechazan contrasenas de mas de 72 bytes para evitar que bcrypt compare solo un prefijo.
- Se permiten como maximo 8 intentos de inicio de sesion por IP cada minuto. Los errores de credenciales no revelan si fallo el RUT o la contrasena.
- Una autenticacion correcta crea una sesion JWT de 8 horas en una cookie `HttpOnly`, `SameSite=Lax` y `Secure` en produccion. Cerrar sesion elimina la cookie.
- En produccion se debe configurar un `JWT_SECRET` largo, aleatorio y privado, un hash bcrypt propio y HTTPS. No se deben reutilizar los valores de ejemplo.

## Autorizacion

- Las rutas de datos y el dashboard requieren sesion valida y rol `ADMINISTRADOR`.
- El rol se comprueba en el servidor en cada solicitud protegida; ocultar controles en la interfaz no sustituye esta comprobacion.
- El modelo actual contempla una cuenta administradora configurada por variables de entorno. Antes de incorporar mas perfiles, se deben definir permisos por rol y probar cada ruta.

## Amenazas y mitigaciones

| Amenaza | Mitigacion aplicada |
| --- | --- |
| Fuerza bruta y abuso de intentos | Limitador de 8 intentos por IP cada minuto en `/api/login`. |
| Robo de contrasenas ante filtracion de configuracion | Hash bcrypt; no guardar contrasenas en texto plano ni en el repositorio. |
| Enumeracion de cuentas por mensajes de error | Respuesta generica para RUT o contrasena incorrectos. |
| Robo de sesion mediante JavaScript | Cookie `HttpOnly`; HTTPS en produccion habilita `Secure`; expiracion de 8 horas. |
| Acceso a rutas sin permiso | Verificacion JWT y autorizacion explicita del rol en dashboard y API. |
| Solicitudes desde sitios web ajenos | CORS desactivado por defecto; si se requiere otro frontend, configurar un origen exacto en `CORS_ORIGIN`. La cookie usa `SameSite=Lax`. |
| Cabeceras inseguras y contenido malicioso | Cabeceras de seguridad configuradas mediante Helmet y validacion de datos en el servidor. |

El limitador de intentos usa almacenamiento en memoria del proceso. En un despliegue con varias instancias o reinicios frecuentes, se debe configurar un almacenamiento compartido para mantener el limite entre instancias.

## Estandares de codificacion segura

- Validar en el servidor tipo, formato y longitud de todo dato recibido; la validacion del navegador es solo una ayuda de usabilidad.
- No concatenar entrada del usuario en comandos, consultas o HTML. Insertar texto en la interfaz con `textContent` y escapar segun el contexto.
- Mantener secretos y credenciales fuera del codigo, del cliente y del control de versiones; usar variables de entorno protegidas.
- Usar mensajes externos genericos para errores de autenticacion y registrar internamente solo la informacion necesaria, sin contrasenas ni tokens.
- Proteger cambios de autenticacion con pruebas de acceso sin sesion, sesion expirada y rol no autorizado.
- Mantener dependencias actualizadas y desplegar el servicio exclusivamente sobre HTTPS en produccion.

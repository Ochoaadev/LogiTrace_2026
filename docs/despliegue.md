# Despliegue de LogiTrace en producción

Guía para instalar LogiTrace en un equipo servidor de la planta (Windows) y usarlo desde los PC de la
oficina y los teléfonos de los repartidores. El GPS del navegador **exige HTTPS**, por eso todo se sirve
detrás de un proxy inverso con certificado.

```
Teléfonos / PC ──HTTPS──► Caddy (443) ──┬── /api/*  → backend Node (localhost:3000) → PostgreSQL
                                        └── resto   → FrontEnd/dist (archivos estáticos)
```

## 1. Requisitos

- Windows 10/11 o Windows Server, con IP fija en la red de la planta (o un dominio propio).
- Node.js 20+ y PostgreSQL 16+ (con `pg_dump`).
- [Caddy](https://caddyserver.com/) 2.x como proxy inverso con HTTPS automático.
- Opcional: [NSSM](https://nssm.cc/) para ejecutar el backend y Caddy como servicios de Windows.

## 2. Base de datos y backend

1. Crear la base (por ejemplo `logitrace`) con un usuario **dueño del esquema** (para las migraciones) y,
   tras las migraciones, el usuario **restringido de la API** con `scripts/rol-base-datos.sql`: solo lee y
   escribe datos, no puede crear, borrar ni vaciar tablas, y la auditoría queda inmodificable.

   ```bash
   psql -U <dueño> -d logitrace -v clave="'<contraseña fuerte>'" -f scripts/rol-base-datos.sql
   ```

   Repetirlo tras cada migración que cree tablas nuevas. En una base gestionada en la nube, la conexión
   debe ir cifrada: `sslmode=require` al final de `DATABASE_URL`.
2. Copiar `BackEnd/.env.example` a `BackEnd/.env` y completar:

   | Variable | Valor en producción |
   |---|---|
   | `DATABASE_URL` | `postgresql://logitrace_app:<clave>@<host>:5432/logitrace?schema=public&sslmode=require` (el rol restringido, nunca `postgres`) |
   | `JWT_SECRET` | resultado de `npm run secreto` (64 caracteres; el backend no arranca con el de ejemplo ni con uno de menos de 32) |
   | `NODE_ENV` | `production` |
   | `CORS_ORIGINS` | la dirección pública, p. ej. `https://192.168.0.10` |
   | `TRUST_PROXY` | `1` (el backend está detrás de Caddy; necesario para HTTPS obligatorio y los límites por IP) |
   | `RESPALDO_CLAVE` | frase secreta larga para cifrar los respaldos; guardarla fuera del servidor |
   | `JWT_EXPIRES_IN` | `15m` (duración del token de acceso; la sesión se renueva sola con la cookie) |
   | `LIMITE_POR_USUARIO`, `LIMITE_POR_IP` | opcional: peticiones por minuto (300 y 900 por defecto) |
   | `SEED_CLAVE_ADMIN`, … | opcional: claves iniciales; si faltan se generan al azar y se muestran una sola vez |

3. Instalar y preparar:

   ```bash
   cd BackEnd
   npm ci --omit=dev
   npx prisma migrate deploy      # con el usuario dueño: crea las tablas y la extensión unaccent
   npm run prisma:seed            # cuentas, catálogos base (anote las claves que muestre)
   npm run zonas:valera -- --aplicar   # zonas de despacho y tipos de sector de Valera
   ```

   **No** ejecutar en producción `scripts/seed-demo-reportes.js` ni `seed-demo-trazabilidad.js`
   (datos de demostración). Si una base ya los tiene, se eliminan con
   `node scripts/seed-demo-reportes.js --limpiar`.

4. Entrar con cada cuenta del seed y **cambiar su contraseña**; desactivar las cuentas que no se usen
   (Administración → Usuarios).

5. Dejar el backend como servicio (arranca solo con Windows):

   ```bat
   nssm install LogiTrace-API "C:\Program Files\nodejs\node.exe" "C:\LogiTrace\BackEnd\src\server.js"
   nssm set LogiTrace-API AppDirectory C:\LogiTrace\BackEnd
   nssm start LogiTrace-API
   ```

## 3. Frontend

```bash
cd FrontEnd
npm ci
npm run build        # genera FrontEnd/dist
```

Servido por HTTPS, el frontend llama a la API en la misma dirección (`/api`), así que no necesita
`VITE_API_URL`.

## 4. Caddy (HTTPS)

`C:\LogiTrace\Caddyfile`:

```caddy
# Red interna: Caddy emite su propio certificado para la IP del servidor
192.168.0.10 {
	tls internal
	encode gzip

	handle /api/* {
		reverse_proxy localhost:3000
	}
	handle {
		root * C:/LogiTrace/FrontEnd/dist
		try_files {path} /index.html
		file_server
	}

	# Cabeceras de seguridad de la aplicación web (la API pone las suyas con helmet)
	header {
		Strict-Transport-Security "max-age=31536000; includeSubDomains"
		Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://*.tile.openstreetmap.org; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'"
		X-Content-Type-Options "nosniff"
		X-Frame-Options "DENY"
		Referrer-Policy "strict-origin-when-cross-origin"
		Permissions-Policy "geolocation=(self), camera=(), microphone=(), payment=()"
		-Server
	}
}
```

Caddy redirige solo de HTTP a HTTPS; la API además rechaza cualquier escritura que no llegue por HTTPS.
La política de contenido (CSP) se probó con el build de producción: mapas, fuentes y sesión funcionan
sin violaciones.

- Con **dominio propio** apuntando al servidor (y puertos 80/443 accesibles), se reemplaza la IP por el
  dominio y se quita `tls internal`: Caddy obtiene un certificado público automáticamente y los
  teléfonos no necesitan configuración adicional.
- Con **`tls internal`** (solo red local), cada teléfono y PC debe confiar en la autoridad raíz de
  Caddy una vez: en el servidor, `caddy trust`; en los teléfonos, instalar el archivo `root.crt` de
  `%AppData%\Caddy\pki\authorities\local\` (Android: Ajustes → Seguridad → Instalar certificado CA;
  iPhone: instalar el perfil y activarlo en Ajustes → General → Información → Confianza de certificados).

Iniciar como servicio: `nssm install LogiTrace-Web "C:\caddy\caddy.exe" run --config C:\LogiTrace\Caddyfile`.

## 5. Respaldos

```bash
cd BackEnd
npm run respaldo     # crea respaldos/<base>-AAAAMMDD-HHMM.dump.enc (cifrado) y conserva los últimos 14
```

Programarlo a diario (Símbolo del sistema como administrador):

```bat
schtasks /Create /SC DAILY /ST 23:00 /TN "LogiTrace respaldo" /TR "cmd /c cd /d C:\LogiTrace\BackEnd && npm run respaldo >> respaldos\respaldo.log 2>&1"
```

- Copiar periódicamente la carpeta `respaldos/` **fuera del servidor** (disco externo o nube de la empresa).
- Con `RESPALDO_CLAVE` el respaldo se cifra con AES-256-GCM y no queda copia legible. Para restaurar,
  primero se descifra (`node scripts/descifrar-respaldo.js respaldos\<archivo>.dump.enc`) y luego:
  `pg_restore --clean --if-exists --no-owner -d "postgresql://<dueño>@localhost:5432/logitrace" respaldos\<archivo>.dump`
  Borre el `.dump` descifrado al terminar. Sin la frase secreta los respaldos no se pueden recuperar.
- Probar una restauración al menos una vez, en una base aparte, antes de depender de los respaldos.

Los respaldos contienen todos los datos (incluidos los hashes de contraseñas): están excluidos del
repositorio y deben guardarse con el mismo cuidado que el servidor.

## 6. Seguridad incluida

| Control | Cómo está resuelto |
| --- | --- |
| Secretos | `.env` fuera de Git; el frontend no contiene claves; claves iniciales al azar en producción |
| Base de datos | El navegador nunca accede a ella; la API usa un rol con permisos mínimos y conexión TLS |
| Acceso a registros | Permisos por perfil en cada ruta del servidor; el repartidor solo ve y actualiza su despacho |
| Manipulación de campos | Cada servicio guarda solo una lista de campos permitidos; estado, personas y fechas cambian solo por sus acciones |
| Sesión | Token de acceso de 15 min solo en memoria; renovación en cookie httpOnly + Secure + SameSite=Strict, rotada en cada uso |
| Contraseñas | bcrypt (coste 12); mismo mensaje y tiempo de respuesta para correo inexistente o clave errada |
| Abuso y bots | 5 intentos de login por cuenta e IP (20 por IP) cada 15 min; 300 peticiones/min por usuario; campo trampa en el login |
| Entrada | Validación por ruta; cuerpos de hasta 100 kB; se descartan claves de prototipo y caracteres de control |
| Consultas | Prisma parametriza todas las consultas; el SQL manual usa parámetros y nombres fijos del código |
| Salida | Errores sin detalles internos; CSV protegidos contra fórmulas; React muestra todo texto como texto |
| Archivos | El sistema no acepta subidas de archivos |
| Transporte | HTTPS obligatorio (redirección, rechazo de escrituras por HTTP, HSTS) y cabeceras de seguridad |
| Datos en reposo | Disco cifrado de la base gestionada; respaldos cifrados con AES-256-GCM |
| Auditoría | Accesos, intentos fallidos y toda escritura; tabla inmodificable desde la API |
| Dependencias | `npm audit` sin vulnerabilidades en backend y frontend; revisar antes de cada despliegue |

## 7. Lista de verificación

- [ ] `NODE_ENV=production` y `JWT_SECRET` generado con `npm run secreto`
- [ ] API conectada con el rol `logitrace_app` (scripts/rol-base-datos.sql) y `sslmode=require`
- [ ] `RESPALDO_CLAVE` definida y guardada fuera del servidor
- [ ] `npm audit` sin vulnerabilidades en `BackEnd` y `FrontEnd`
- [ ] Migraciones aplicadas, seed ejecutado, zonas de Valera cargadas, sin datos demo
- [ ] Contraseñas del seed cambiadas; cuentas sin uso desactivadas
- [ ] HTTPS funcionando en PC y teléfonos (el GPS de "Mi ruta" responde)
- [ ] Respaldo diario programado y una restauración de prueba realizada
- [ ] Inventario inicial cargado para todos los productos que se despachan
- [ ] Centros y radios de zonas y tipos de sector revisados en el mapa

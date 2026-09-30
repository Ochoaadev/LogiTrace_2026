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

1. Crear la base (por ejemplo `logitrace`) y un usuario de PostgreSQL propio, con contraseña fuerte (no `postgres/postgres`).
2. Copiar `BackEnd/.env.example` a `BackEnd/.env` y completar:

   | Variable | Valor en producción |
   |---|---|
   | `DATABASE_URL` | `postgresql://<usuario>:<clave>@localhost:5432/logitrace?schema=public` |
   | `JWT_SECRET` | resultado de `npm run secreto` (64 caracteres; el backend no arranca con el de ejemplo ni con uno de menos de 32) |
   | `NODE_ENV` | `production` |
   | `CORS_ORIGINS` | la dirección pública, p. ej. `https://192.168.0.10` |
   | `TRUST_PROXY` | `1` (el backend está detrás de Caddy) |
   | `SEED_CLAVE_ADMIN`, … | opcional: claves iniciales; si faltan se generan al azar y se muestran una sola vez |

3. Instalar y preparar:

   ```bash
   cd BackEnd
   npm ci --omit=dev
   npx prisma migrate deploy      # crea las tablas y la extensión unaccent
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
}
```

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
npm run respaldo     # crea respaldos/<base>-AAAAMMDD-HHMM.dump y conserva los últimos 14
```

Programarlo a diario (Símbolo del sistema como administrador):

```bat
schtasks /Create /SC DAILY /ST 23:00 /TN "LogiTrace respaldo" /TR "cmd /c cd /d C:\LogiTrace\BackEnd && npm run respaldo >> respaldos\respaldo.log 2>&1"
```

- Copiar periódicamente la carpeta `respaldos/` **fuera del servidor** (disco externo o nube de la empresa).
- Restaurar (sobre una base existente):
  `pg_restore --clean --if-exists --no-owner -d "postgresql://<usuario>@localhost:5432/logitrace" respaldos\<archivo>.dump`
- Probar una restauración al menos una vez, en una base aparte, antes de depender de los respaldos.

Los respaldos contienen todos los datos (incluidos los hashes de contraseñas): están excluidos del
repositorio y deben guardarse con el mismo cuidado que el servidor.

## 6. Seguridad incluida

- Contraseñas con bcrypt; el rol y el estado de cada cuenta se verifican en la base en cada petición.
- Tras 5 intentos fallidos de inicio de sesión (por cuenta e IP) o 20 (por IP) se bloquea 15 minutos.
- Auditoría de accesos y de toda escritura (monitor de auditoría en Administración).
- Los servicios de los catálogos maestros y de pedidos solo guardan los campos permitidos.

## 7. Lista de verificación

- [ ] `NODE_ENV=production` y `JWT_SECRET` generado con `npm run secreto`
- [ ] Usuario de PostgreSQL propio con contraseña fuerte
- [ ] Migraciones aplicadas, seed ejecutado, zonas de Valera cargadas, sin datos demo
- [ ] Contraseñas del seed cambiadas; cuentas sin uso desactivadas
- [ ] HTTPS funcionando en PC y teléfonos (el GPS de "Mi ruta" responde)
- [ ] Respaldo diario programado y una restauración de prueba realizada
- [ ] Inventario inicial cargado para todos los productos que se despachan
- [ ] Centros y radios de zonas y tipos de sector revisados en el mapa

# Mi Casa

App web gratuita para organizar la economía y las actividades del hogar. Está en español, usa pesos argentinos (ARS), fechas dd/mm/aaaa y la zona horaria de Córdoba. Es 100 % estática: sin servidor, sin cuentas, sin rastreadores. Los datos quedan en el navegador (IndexedDB).

## Qué incluye esta versión
- **Inicio:** saldo estimado, ingresos, gastos pagados, cuentas pendientes y vencidas, próximos vencimientos, avisos y resumen de compras, con selector de mes.
- **Dinero:** ingresos y gastos (pagado o pendiente), 11 categorías, editar, eliminar, marcar como pagada, balance mensual y comparación con el mes anterior, gastos por categoría.
- **Compras:** listas ilimitadas, productos con cantidad, precio y notas opcionales (alcanza con escribir el nombre), progreso, presupuesto estimado, duplicar, vaciar comprados, compartir, copiar, WhatsApp (enlace `wa.me`) e imprimir.
- **Avisos:** recordatorios con hora, lugar y anticipación (mismo día, 1 día, 3 días, 1 semana), descarga `.ics` y enlace a Google Calendar.
- **Ajustes:** tema claro/oscuro, copia de seguridad JSON (con validación antes de restaurar), exportar CSV, borrar todo con confirmación.
- **PWA:** instalable y con funcionamiento sin conexión después de la primera carga.

## Fórmula del saldo estimado
`saldo = ingresos acumulados hasta fin del mes − gastos PAGADOS acumulados hasta fin del mes`.
Las cuentas pendientes no se descuentan hasta marcarlas como pagadas, así nunca se restan dos veces. Los importes se guardan en centavos enteros. En los formularios, el punto es separador de miles y la coma es decimal (`1.500,50`).

## Probarlo localmente
Los módulos ES y el service worker necesitan un servidor local (no abras `index.html` con doble clic):
```
cd mi-casa
python3 -m http.server 8080      # o: npx serve .
```
Abrí http://localhost:8080. Pruebas automáticas (requieren Node 20+): `npm test`.

## Publicar gratis en GitHub Pages
1. Creá una cuenta en github.com y un repositorio nuevo, por ejemplo `mi-casa` (público).
2. Subí **el contenido** de esta carpeta a la raíz del repositorio ("Add file → Upload files" o `git push`).
3. En el repositorio: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, rama `main`, carpeta `/ (root)`.
4. Esperá uno o dos minutos. La app queda en `https://TU-USUARIO.github.io/mi-casa/`.

Todas las rutas son relativas, así que funciona en la subruta `/mi-casa/` sin configurar nada. No usa Vite ni paso de compilación.

## Actualizar la app
Editá los archivos, subí los cambios y **cambiá el número de `CACHE` en `sw.js`** (`mi-casa-v1` → `mi-casa-v2`). Si agregaste archivos nuevos, sumalos a `FILES`. Si cambia la estructura de datos, subí `VER` en `src/lib/db.js` y escribí la migración en `onupgradeneeded`.

## Instalar en el celular
Android (Chrome): menú ⋮ → "Instalar aplicación". iPhone (Safari): Compartir → "Agregar a pantalla de inicio".

## Datos y copias de seguridad
Los datos pertenecen al navegador y al dispositivo donde se cargaron. En otro celular o computadora no aparecen solos: usá **Ajustes → Descargar copia** y **Restaurar copia**. Borrar los datos del navegador elimina todo lo que no esté respaldado.

## Conexión y notificaciones
- Funciona sin conexión: todo lo que hay en la app (cálculos, listas, avisos, copias, CSV).
- Necesita conexión: abrir WhatsApp y Google Calendar, y la primera carga de la app.
- Las notificaciones del navegador solo se muestran mientras la app está abierta. GitHub Pages no puede enviar avisos con la app cerrada. Para eso, descargá el `.ics` o usá el enlace de Google Calendar, y el calendario del teléfono se encarga del aviso.

## Licencia
MIT. No usa bibliotecas externas.

# GymFlow Pro v5

Versión corregida y reestructurada de la app de seguimiento de gimnasio.

## Qué cambia respecto a v4
- Se corrige la pérdida accidental de sesión activa: si intentas iniciar la misma rutina otra vez, la app continúa la sesión en lugar de reiniciarla.
- Se sincroniza `sessionHistory` cuando borras bloques procedentes de una sesión.
- Se modulariza el código en:
  - `js/store.js`
  - `js/session.js`
  - `js/analytics.js`
  - `js/ui-dashboard.js`
  - `js/ui-session.js`
  - `js/ui-records.js`
  - `js/ui-meta.js`
  - `js/pwa.js`
  - `js/utils.js`
  - `js/catalog.js`
- Se evita depender de `bindActionButtons()` tras cada render usando delegación de eventos.
- Se mejora la persistencia con:
  - cola de guardado
  - flush en `pagehide` y `visibilitychange`
  - indicador visual de guardado
  - respaldo en `localStorage` si falla IndexedDB
- Se normalizan ejercicios mediante catálogo y alias.
- Se mejora la sugerencia de carga teniendo en cuenta rango objetivo, reps, foco de rutina y RPE.
- Se renombra la métrica de cabecera para que sea más coherente:
  - `Sesiones este mes` → `Días entrenados este mes`
  - `Racha activa` → `Continuidad activa`
- Se simplifica la actualización PWA para que la activación del nuevo service worker dependa del botón de actualizar.
- Se corrigen las rutas reales de iconos y se incluye carpeta `icons/` lista para desplegar.

## Estructura
- `index.html`
- `styles.css`
- `app.js`
- `manifest.webmanifest`
- `sw.js`
- `js/`
- `icons/`

## Cómo probarla en local
```bash
cd gymflow-pro-v5
python -m http.server 4173
```

Luego abre:
```bash
http://localhost:4173
```

## Notas
- La app sigue siendo **offline-first**.
- Los datos viven en el navegador del dispositivo.
- Se guarda en IndexedDB y además mantiene un respaldo local.
- Puedes exportar JSON o CSV como copia de seguridad.

# GymFlow Pro v4

Versión mejorada de la app de seguimiento de gimnasio.

## Qué cambia respecto a v3
- Persistencia en **IndexedDB** en lugar de depender solo de `localStorage`
- Corrección del cálculo de fecha local
- IDs con `crypto.randomUUID()` cuando está disponible
- Conserva `createdAt` y añade `updatedAt`
- Flujo de **sesión serie por serie**
- Dashboard más inteligente para sugerir qué rutina hacer hoy
- Selector de métrica para el gráfico de ejercicio: **carga, e1RM, volumen y reps**
- Estado PWA más realista
- Service worker más robusto
- Mejoras de accesibilidad:
  - labels visibles
  - navegación por tabs accesible
  - skip link
  - toasts con `aria-live`

## Archivos
- `index.html`
- `styles.css`
- `app.js`
- `manifest.webmanifest`
- `sw.js`
- `icons/icon-192.png`
- `icons/icon-512.png`

## Cómo probarla en local
```bash
cd gymflow-pro-v4
python -m http.server 4173
```

Luego abre:
```bash
http://localhost:4173
```

## Notas
- La app sigue siendo **offline-first**
- Los datos viven en el navegador del dispositivo
- Puedes exportar JSON o CSV como copia de seguridad

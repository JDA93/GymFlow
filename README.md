# GymFlow Pro

Versión actual de GymFlow Pro con foco en entrenar rápido: offline-first, sesión activa robusta y navegación móvil simplificada.

## Qué incluye
- navegación principal simplificada: **Hoy · Sesión · Historial · Más**
- sesión activa más compacta y escaneable
- progreso de sesión que separa completados y omitidos
- búsqueda robusta en histórico (tolerante a tildes)
- constructor de rutinas seguro cuando existe sesión activa
- registros manuales y sesiones completas claramente diferenciados
- persistencia en IndexedDB + fallback local con migración desde claves antiguas
- PWA instalable

## Estructura
- `index.html`
- `styles.css`
- `app.js`
- `manifest.webmanifest`
- `sw.js`
- `js/`
- `icons/`

## Cómo probarla
```bash
cd /workspace/GymFlow
python -m http.server 4173
```

Abre:
```bash
http://localhost:4173
```

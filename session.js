# GymFlow Pro fixed package

Este paquete corrige la ruptura principal que había en la subida:
- varios archivos estaban cruzados de nombre
- faltaba `app.js` en la raíz real del proyecto
- no había un `sw.js` válido
- faltaba un `ui-session.js` funcional
- `styles.css` no contenía CSS utilizable

## Estructura
Sube el contenido de esta carpeta a la raíz del proyecto:
- index.html
- styles.css
- app.js
- analytics.js
- catalog.js
- session.js
- store.js
- pwa.js
- ui-common.js
- ui-dashboard.js
- ui-meta.js
- ui-records.js
- ui-session.js
- utils.js
- manifest.webmanifest
- sw.js

## Nota
Los iconos siguen apuntando a `icons/icon-192.png` y `icons/icon-512.png`.
Si ya los tenías en tu repo, no necesitas tocar nada más.

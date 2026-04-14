# GymFlow Pro v2

Versión mejorada de la PWA de seguimiento de gimnasio, lista para subir a GitHub y desplegar.

## Qué cambia en esta versión
- KPI extra con **e1RM top**
- Exportación en **JSON y CSV**
- Estado **online/offline** visible
- Aviso cuando hay una **nueva versión** de la app
- Filtro y **ordenación** del historial de entrenos
- Sugerencia de progresión de carga en la **sesión activa**
- Mejor estrategia del service worker para documentos HTML
- Estructura correcta de iconos en carpeta `icons/`

## Archivos
- `index.html`
- `styles.css`
- `app.js`
- `manifest.webmanifest`
- `sw.js`
- `icons/icon-192.png`
- `icons/icon-512.png`

## Cómo probarla en local
### Opción A: Python
```bash
cd gymflow-pro-v2
python -m http.server 4173
```

Después abre `http://localhost:4173`.

### Opción B: VS Code
Abre la carpeta y ejecuta Live Server.

## Cómo desplegarla
Puedes subir la carpeta a GitHub Pages, Netlify o Vercel.

## Cómo instalarla
### Android / Chrome
- Abre la URL publicada
- Espera a que aparezca el botón `Instalar app` o usa el menú del navegador

### iPhone / Safari
- Abre la URL en Safari
- Pulsa compartir
- Toca `Añadir a pantalla de inicio`

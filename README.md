# GymFlow Pro v3

Versión auditada y corregida de la PWA de seguimiento de gimnasio.

## Qué mejora esta versión
- Pantalla **Hoy** más accionable
- **Sesión activa** más clara y rápida
- Registro rápido con bloque de **datos opcionales**
- Mejor lectura de **PRs, volumen, e1RM y tendencias**
- Mejor estado de instalación **PWA**
- Service worker y manifest más robustos
- Estructura final preparada para desplegar en GitHub Pages, Netlify o Vercel

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
cd gymflow-pro-v3
python -m http.server 4173
```

Después abre `http://localhost:4173`.

## Instalación PWA
### Android / Chrome
- Abre la URL publicada
- Espera a que aparezca el botón `Instalar app` o usa el menú del navegador

### iPhone / Safari
- Abre la URL en Safari
- Pulsa compartir
- Toca `Añadir a pantalla de inicio`

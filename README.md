# GymFlow Pro

Versión mejorada de la PWA de seguimiento de gimnasio, pensada ya para uso real durante el entreno.

## Mejoras principales
- Sesión activa por rutina
- Guardado rápido de series desde la sesión
- Temporizador de descanso
- Edición y borrado de rutinas, entrenos y mediciones
- Búsqueda y filtros en historial
- Dashboard con foco del día, PRs y tendencias
- Preferencias de descanso por defecto
- PWA más sólida con iconos reales y ayuda para iPhone
- Backup e importación JSON

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
cd gymflow_v2
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

## Siguiente paso recomendado
Si luego quieres sincronizar móvil y ordenador, el siguiente salto natural es conectar Supabase.

# GymFlow PWA

PWA estática para seguimiento de gimnasio: rutinas, cargas, medidas, objetivos y evolución.

## Qué incluye
- Rutinas por días o bloques
- Registro de entrenamientos con kg, series, reps, RPE, descanso y notas
- Medidas corporales y sueño
- Dashboard con progreso por ejercicio y evolución corporal
- Resumen de volumen y récords personales
- Objetivos de composición y de fuerza
- Exportación/importación de backup en JSON
- Manifest y service worker para instalación como PWA

## Cómo verla en tu ordenador
Puedes servir esta carpeta con cualquier servidor estático. Dos opciones simples:

### Opción A: Python
```bash
cd gym-pwa
python -m http.server 4173
```

Luego abre `http://localhost:4173`.

### Opción B: VS Code Live Server
Abre la carpeta en VS Code y ejecuta Live Server sobre `index.html`.

## Cómo instalarla en el móvil
1. Súbela a GitHub Pages, Netlify o Vercel.
2. Abre la URL desde Chrome o Safari móvil.
3. Usa **Añadir a pantalla de inicio** o el botón **Instalar app** cuando aparezca.

## Archivos principales
- `index.html`
- `styles.css`
- `app.js`
- `manifest.webmanifest`
- `sw.js`

## Nota
Los datos se guardan localmente en el navegador del dispositivo. Para sincronizar entre ordenador y móvil, el siguiente paso ideal es conectar Supabase o Firebase.

# GymFlow Pro v1.1

Versión mejorada de la PWA de seguimiento de gimnasio, lista para subir a GitHub y desplegar.

## Qué cambia en esta versión
- El KPI principal ya cuenta **días entrenados** y no ejercicios guardados
- El botón **Entrenar ahora** inicia una sesión real
- El temporizador muestra el descanso por defecto configurado
- Guardar desde sesión **actualiza** el registro del ejercicio y evita duplicados
- Confirmaciones antes de borrar rutinas, entrenos, medidas o reiniciar datos
- Importación y carga demo con migración de estado más robusta
- Tendencias semanales calculadas por **días de entreno**, no por número de logs

## Archivos
- `index.html`
- `styles.css`
- `app.js`
- `manifest.webmanifest`
- `sw.js`

## Cómo probarla en local
### Opción A: Python
```bash
cd gymflow-pro-v11
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

## Nota
Asegúrate de subir también la carpeta `icons/` con tus iconos `icon-192.png` e `icon-512.png`.

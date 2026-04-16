# GymFlow Pro

GymFlow Pro es una aplicación web **offline-first** para registrar entrenamientos de gimnasio, rutinas, medidas corporales y analítica de progreso.

## Características

- Registro de entrenamientos y series por ejercicio.
- Gestión de rutinas.
- Seguimiento de medidas corporales.
- Analítica de rendimiento (volumen, tendencias, PRs, etc.).
- Soporte PWA con `service worker` y `manifest`.

## Estructura principal

- `index.html`: shell principal de la aplicación.
- `app.js`: entrypoint y orquestación de estado/UI.
- `analytics-core.js`, `catalog.js`, `session.js`, `store.js`: lógica de dominio.
- `ui-*.js`: renderizado por secciones.
- `sw.js`, `manifest.webmanifest`, `pwa.js`: capa PWA.
- `styles.css`: estilos.

## Ejecución local

Sirve el proyecto con cualquier servidor estático (por ejemplo, `npx serve .`) y abre la URL local en el navegador.

> Nota: para probar correctamente Service Worker/PWA, usa un contexto seguro (`https`) o `localhost`.

## Nota de mantenimiento

- La carpeta legacy `js/` fue eliminada para evitar duplicidad de módulos y confusión de entrypoints.
- La aplicación usa los módulos en la raíz (`app.js`, `analytics-core.js`, `catalog.js`, etc.).

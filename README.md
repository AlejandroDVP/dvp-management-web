# DVP Management Web

Sitio web oficial de **DVP Management** para `https://dvp.football`.

## Estado

- Producción: `https://dvp.football`
- Hosting: Vercel
- Dominio/DNS: Squarespace
- Correo: Google Workspace
- Idioma principal: español (México)

## Arquitectura

El sitio es una web estática multipágina con HTML, CSS y JavaScript. La portada conserva las animaciones y el recorrido visual de DVP; las páginas de servicio añaden contenido rastreable para SEO.

### URLs principales

- `/`
- `/representacion-futbolistas/`
- `/patrimonio-futbolistas/`
- `/marca-personal-futbolistas/`
- `/videoanalisis-futbolistas/`
- `/bienestar-futbolistas/`
- `/sobre-dvp/`
- `/guia-primer-contacto-agencia/`

## Flujo de trabajo recomendado

- `main`: producción.
- Cambios nuevos: crear una rama (`feature/...` o `fix/...`).
- Vercel genera un Preview Deployment para revisar cada rama/PR.
- Después de aprobación, merge a `main` para desplegar a producción.

## Conectar con el proyecto existente de Vercel

No crear un proyecto nuevo. En el proyecto de Vercel que ya aloja `dvp.football`, usar **Connect Git** y seleccionar este repositorio.

Configuración esperada:

- Framework Preset: `Other`
- Root Directory: `.`
- Build Command: vacío / ninguno
- Output Directory: vacío / raíz del proyecto
- Install Command: vacío / ninguno

El archivo `vercel.json` ya contiene headers, clean URLs y redirects del sitio.

## Cómo cambiar CSS o JS

Los archivos de `build/` se sirven con caché inmutable de un año (`vercel.json`), así que **nunca se editan en su lugar**: se editan y después se renombran con su hash de contenido. El script lo hace y actualiza las referencias en todas las páginas:

```bash
sh tools/rehash.sh
```

Mapa de archivos de la portada (`index.html`):

- `build/styles.*.css`: estilos base (desktop y móvil).
- `build/mobile-layout.*.css`: ajustes móviles y la cámara en teléfonos (se carga al final, gana la cascada).
- `build/service-cards.*.css/.js`: tarjetas de servicio que abren los diálogos.
- `build/management-full-card.*.css`: arte completo de la tarjeta de Management.
- `build/app.*.js`: la cámara cinemática (`mountDvpMobile`). Expone `window.dvpExperience` (`status()`, `goTo(id)`, `refresh()`) para revisión visual.

Las páginas de servicio usan solo `build/services.*.css`.

### Comportamiento en teléfonos

- La cámara cinemática se mantiene. El marco se fija al viewport pequeño (`100svh`), por lo que la barra del navegador nunca reconstruye el recorrido.
- Al terminar un desplazamiento a mitad de viaje, la cámara se acomoda sola en la escena más cercana.
- Los vectores voladores (logo rebotando, globo y logotipo viajeros) solo existen en escritorio; en teléfonos cada escena muestra su logotipo y globo estáticos.
- Si la pantalla es baja, el contenido se compacta (`frame-compact`, `frame-tight`) o se escala (`--layout-scale`) antes de renunciar a la cámara.
- El botón **Pausar** solo detiene las animaciones decorativas; nunca desactiva la cámara. La vista de lectura sigue disponible con «Leer sin movimiento», `?view=calm` o `prefers-reduced-motion`.

## SEO

- `robots.txt` permite rastreo y referencia `https://dvp.football/sitemap.xml`.
- `sitemap.xml` enumera las páginas públicas.
- Las páginas tienen canonical tags, títulos, meta descriptions y schema markup.
- La página 404 usa `noindex,follow`, de forma intencional.

## Seguridad y privacidad

Este repositorio no debe contener contratos, pasaportes, documentación fiscal, información médica, credenciales, archivos de negociación ni datos privados de jugadores. Los secretos, si se incorporan en el futuro, deben almacenarse como variables de entorno en Vercel y nunca commitearse.

## Contacto público

- `alejandro@dvp.football`
- `+52 55 4341 7223`

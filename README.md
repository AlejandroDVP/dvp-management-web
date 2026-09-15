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

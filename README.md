# Sebastián Pinzón Reyes · Portafolio

Portafolio profesional de Sebastián Pinzón Reyes, desarrollador Full Stack en Bogotá, Colombia.

Sitio estático hecho a mano con HTML, CSS y JavaScript, sin frameworks ni dependencias.

## Contenido

- Experiencia, proyectos, habilidades, educación y contacto.
- Demos interactivas con datos ficticios de los sistemas desarrollados para Sun Air Supply y del sistema de parqueadero.
- CV descargable en `cv/`.

## Seguridad

- Política de seguridad de contenido (CSP) estricta: solo recursos propios.
- Encabezados de seguridad en `vercel.json` (HSTS, bloqueo de iframes, `nosniff`, Referrer-Policy, Permissions-Policy).
- El texto que escribe el usuario en las demos se muestra con `textContent`, nunca con `innerHTML`.
- Correo y teléfono armados con JavaScript para dificultar la recolección por bots.
- `robots.txt` que excluye el CV de los buscadores y niega el acceso a rastreadores de IA.

## Publicar en Vercel

Importa este repositorio en Vercel sin configuración adicional: no hay paso de compilación. Vercel aplica los encabezados de `vercel.json` automáticamente.

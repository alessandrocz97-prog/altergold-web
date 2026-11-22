# ALTER GOLD · web (rama «mejoras»)

Versión con mejoras (22-11-2026): portada con la película del lingote, cotización real a través de `/api/precios`
(función de Vercel; la clave de GoldAPI va en la variable de entorno `GOLDAPI_KEY`, nunca en el código) y archivos
versionados (`?v=`) para caché larga. Es una rama de pruebas: `vercel.json` la marca como no indexable.
La rama `main` sigue siendo la copia de trabajo anterior.

---

# ALTER GOLD · web (copia de trabajo)

Sitio estático del rediseño de ALTER GOLD, versión corporativa (v5.6, 17-11-2026).
Se publica en Vercel tal cual, sin compilación. `vercel.json` marca todo el sitio como no indexable:
es una copia de pruebas, no la web definitiva.

Las fuentes editables del rediseño (estilos por capas, parches y herramientas) no están en este
repositorio; aquí solo va el resultado publicable.

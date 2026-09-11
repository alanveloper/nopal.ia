# NeuroCareer

Landing de NeuroCareer: conecta talento neurodivergente con espacios de trabajo donde puede crecer.

## Estructura del frontend

- `index.html`: la landing completa (HTML, CSS y JS en línea).
- `public/assets/`: imágenes y SVG provisionales que se sirven tal cual.
- `vite.config.js`: Vite solo empaqueta y sirve la página estática.

## Ejecutar localmente

```powershell
npm install
npm run dev
```

## Validar producción

```powershell
npm run build
npm run preview
```

## Despliegue en Vercel

`vercel.json` ya configura el proyecto: `npm install`, `npm run build` y publica `dist/`.
Importa el repositorio en Vercel con la raíz del proyecto como *Root Directory*; no hace falta configurar nada más.

El backend (`backend/` y `supabase/`) se despliega por separado y no forma parte del build de Vercel.

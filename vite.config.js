import { defineConfig } from 'vite'

// Landing estática: index.html en la raíz y recursos en public/assets.
// Los archivos de Vite se emiten en dist/static para no mezclarse con public/assets.
export default defineConfig({
  build: {
    assetsDir: 'static',
  },
})

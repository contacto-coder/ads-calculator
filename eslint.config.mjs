/**
 * Configuración de ESLint 9 (flat config).
 *
 * El template de SaaS Factory trae `eslint` y `eslint-config-next` instalados
 * pero sin ningún archivo de configuración, y su script apuntaba a `next lint`,
 * que Next 16 ya no incluye: `npm run lint` fallaba con "Invalid project
 * directory".
 *
 * `eslint-config-next` 16 ya exporta flat config nativo, así que se importa
 * directo — pasarlo por `FlatCompat` revienta con "circular structure".
 */
import coreWebVitals from 'eslint-config-next/core-web-vitals'
import typescript from 'eslint-config-next/typescript'

const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'next-env.d.ts',
      // Plantillas de los skills de la fábrica: son referencia para generar
      // código, no código de esta app.
      '.claude/**',
    ],
  },
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      // Obliga a `unknown` y a estrechar el tipo en vez de `any`.
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
]

export default config

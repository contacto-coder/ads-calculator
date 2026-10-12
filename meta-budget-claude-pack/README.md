# Pack para Claude Code — Calculadora de presupuesto Meta inmobiliario

## Uso
1. Descomprime este pack en una carpeta vacía o dentro del repositorio de la app.
2. Abre esa carpeta con Claude Code.
3. Copia y pega el contenido de `PROMPT_INICIAL.md`.
4. Claude debe construir y verificar la aplicación siguiendo los documentos del pack.

Este pack contiene especificaciones; no contiene una app ya implementada.

## Documentos
- CLAUDE.md: instrucciones de trabajo.
- PROMPT_INICIAL.md: encargo listo para pegar.
- docs/PRODUCTO.md: alcance y experiencia.
- docs/REGLAS_CALCULO.md: fórmulas y redondeos.
- docs/ARQUITECTURA.md: estructura técnica y contrato de datos.
- docs/DISENO.md: interfaz y textos.
- docs/ACEPTACION.md: pruebas y definición de terminado.

## Decisiones tomadas
React + TypeScript + Vite, aplicación en español, sin servidor, cuentas ni integración con Meta. Moneda configurable y almacenamiento local. Cuatro etapas de 7/7/7/9 días. Los importes son planificación, no garantías de venta. No desplegar ni publicar sin una solicitud explícita.

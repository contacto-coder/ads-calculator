# Presupuesto inmobiliario para Meta

Calculadora web para asesores inmobiliarios que venden propiedades de terceros. Responde tres preguntas sobre una venta individual:

1. Cuánto recibiría el asesor si la venta se cierra y se cobra.
2. Cuánto puede asignar a publicidad en Meta (escenarios del 5, 10 y 20 % de su comisión).
3. Cómo repartir ese presupuesto en un plan de 30 días, con el importe exacto de cada día.

Funciona en español, en el celular y sin cuentas ni servidor: todo se calcula y se guarda en el dispositivo. Es una herramienta de planificación independiente; no está conectada con Meta ni con ninguna cuenta publicitaria, y sus importes no garantizan una venta ni un plazo.

La especificación completa está en [meta-budget-claude-pack/docs/](meta-budget-claude-pack/docs/).

## Requisitos

- Node.js 20.19 o superior (probado con 20.20.1).
- npm (el repositorio incluye `package-lock.json`).

## Instalación

```bash
npm install
```

## Uso

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Inicia la app en desarrollo. Ábrela en <http://localhost:3000> (si el puerto está ocupado, la terminal muestra el que se usó). |
| `npm test` | Ejecuta todas las pruebas una vez (motor de cálculo, guardado y recorridos de interfaz). |
| `npm run test:watch` | Ejecuta las pruebas en modo continuo. |
| `npm run typecheck` | Comprueba los tipos con TypeScript estricto. |
| `npm run lint` | Revisa el código con ESLint. |
| `npm run build` | Genera la versión de producción. |
| `npm run preview` | Sirve la versión de producción ya compilada (requiere `npm run build` antes). |

La app no necesita variables de entorno. El archivo `.env.local` pertenece a la base del proyecto y la calculadora no lo usa.

## Cómo funciona

El asistente tiene cinco pasos y permite volver atrás sin perder datos:

1. **Propiedad**: país (opcional, solo referencia), moneda (USD, MXN, COP, EUR o PEN) y precios.
2. **Comisión**: comisión única con reparto o comisión por puntas (captación y venta). Cada comisión admite un porcentaje del cierre o un importe fijo, más la participación final del asesor.
3. **Capacidad**: dinero disponible para publicidad. Vacío significa "no lo sé"; `0` significa "no tengo".
4. **Escenarios**: inversión del 5, 10 o 20 %. Ninguno viene preseleccionado. Si el elegido supera la disponibilidad, se avisa y se pide una aceptación explícita; el importe nunca se modifica.
5. **Plan**: fecha de inicio, resultados explicados, cuatro etapas (7, 7, 7 y 9 días con 10, 20, 30 y 40 % del presupuesto), calendario diario e impresión o guardado como PDF desde el navegador.

Las reglas de cálculo están en [meta-budget-claude-pack/docs/REGLAS_CALCULO.md](meta-budget-claude-pack/docs/REGLAS_CALCULO.md). En resumen:

- El dinero se calcula con `decimal.js` y redondeo HALF_UP; los resultados son enteros de centavos. No se usa coma flotante binaria para calcular importes.
- El presupuesto se reparte entre etapas con el método del mayor resto y, dentro de cada etapa, los primeros días reciben el centavo sobrante. La suma de los 30 días es siempre exactamente el presupuesto.
- Las fechas son locales (`YYYY-MM-DD`) y se suman como días de calendario con `date-fns`, de modo que un cambio de horario no pierde ni repite días.

## Estructura

```
src/app/                      Página y layout (Next.js). La página solo monta la calculadora.
src/features/calculator/
├── domain/                   Motor de cálculo: funciones puras, sin React ni localStorage.
│   ├── money.ts              Interpretación de entradas decimales y redondeo.
│   ├── commission.ts         Comisión única y por puntas.
│   ├── scenarios.ts          Escenarios del 5/10/20 %.
│   ├── allocation.ts         Etapas y calendario exacto.
│   ├── dates.ts              Fechas locales.
│   ├── validation.ts         Validación de entradas.
│   ├── calculate.ts          Punto de entrada del motor.
│   └── form.ts               Borrador del formulario y su traducción a entrada del motor.
├── state/                    Estado del asistente (reducer puro): pasos, errores, aceptación.
├── storage/                  Guardado local validado y versionado.
├── components/               Interfaz: pasos, campos, tablas, diálogo e informe impreso.
├── hooks/                    Guardado automático y formato regional.
├── styles/                   tokens.css, app.css y print.css (CSS propio).
├── format.ts                 Formato visual de importes, porcentajes y fechas.
├── messages.ts               Textos, nombres de etapas y mensajes de error.
└── test/                     Utilidades compartidas por las pruebas de interfaz.
```

Las pruebas están junto al código que verifican (`*.test.ts` y `*.test.tsx`).

## Datos guardados

- Se guarda una sola simulación en `localStorage`, con la clave `meta-real-estate-budget:v1`.
- Se guardan las entradas (incluidos los borradores del modelo de comisión que no está activo), el paso actual y la aceptación del aviso de exceso. Los resultados nunca se guardan: se recalculan al abrir.
- Al leer se valida la forma y la versión de los datos. Si están dañados, la app avisa, empieza en blanco y permite borrarlos; si el navegador no deja guardar, la calculadora funciona igual y lo indica.
- No se guardan datos sensibles, de propietarios ni direcciones.

## Decisiones y supuestos

- **Base del proyecto.** La especificación pide React + TypeScript + Vite salvo que exista una base compatible. Este repositorio ya tenía una base Next.js 16 + React 19 + TypeScript estricto (SaaS Factory), así que se conservó. La calculadora es una pantalla de cliente que se prerenderiza como página estática: no usa rutas de servidor, base de datos ni autenticación. Vite está presente solo como motor de Vitest.
- **Sin Tailwind, Zod ni Zustand en la calculadora.** Siguiendo la especificación, la interfaz usa CSS propio con variables, la validación vive en el dominio y el estado es un `useReducer`. Tailwind sigue instalado para el resto de la base.
- **Moneda sin valor por defecto.** Hay que elegirla explícitamente, para no suponer una moneda por el país o el dispositivo.
- **Entrada de números.** Se acepta punto o coma como separador decimal y no se aceptan separadores de miles. Un importe con exactamente tres decimales (`1.234`) se rechaza como ambiguo, porque puede leerse como miles. Nunca se trunca: si sobran decimales, se rechaza.
- **Lectura de las cifras.** Como el campo no admite separadores de miles, debajo de cada importe se muestra cómo se lee lo escrito (`Se lee: COP 350,000,000.50`), para detectar un cero de más o de menos.
- **Resumen siempre a la vista.** En escritorio es una tarjeta lateral; en móvil, una barra fija abajo con la comisión estimada y el presupuesto elegido.
- **Formato de los resultados.** Los importes se muestran siempre con el código de moneda (`USD 5,000.00`). Se usa el formato regional en español del dispositivo y, si el dispositivo no está en español, `es-MX`. El formato solo afecta a cómo se muestran las cifras, no a cómo se interpretan.
- **Aceptación del exceso.** Queda ligada a los importes exactos aceptados: si cambian el presupuesto o la disponibilidad (incluso al cambiar de escenario y volver), hay que aceptar de nuevo.
- **Navegación.** Se puede saltar desde el indicador a cualquier paso cuyos pasos anteriores sean válidos. Los errores de un campo se muestran al salir de él o al intentar continuar, no mientras se escribe.
- **Presupuestos muy pequeños.** Un día con importe cero es válido; se avisa de que el plan queda muy fragmentado, sin inventar mínimos de Meta.
- **Lista de países.** Es solo una referencia para el informe; no cambia cálculos, moneda, contratos ni impuestos.

## Verificación

- `npm test`: 184 pruebas en 12 archivos. Cubren los 14 casos del motor y los recorridos de interfaz de [meta-budget-claude-pack/docs/ACEPTACION.md](meta-budget-claude-pack/docs/ACEPTACION.md).
- `npm run typecheck`, `npm run lint` y `npm run build` sin errores.
- Revisión en Chrome sobre la versión de producción: recorrido completo a 360 px sin desbordamiento horizontal, navegación solo con teclado, diseño de escritorio y vista impresa (sin navegación, botones ni campos). El PDF ocupa 2 páginas, en carta y en A4, sin tablas ni secciones partidas entre páginas. La misma revisión se repitió sobre la URL publicada.

## Limitaciones

- No hay cuentas, nube ni sincronización: la simulación vive en un solo navegador y se pierde si se borran sus datos.
- Solo se guarda una simulación a la vez.
- No convierte monedas ni calcula impuestos, costos de producción, mínimos publicitarios, leads o probabilidad de venta. No se conecta con la API de Meta.
- La revisión en navegador real se hizo con Chrome mediante un script puntual que no forma parte de `npm test`. No se probó en Safari, Firefox ni en teléfonos físicos.
- El aspecto del selector de fecha y del diálogo de impresión depende de cada navegador.
- Las rutas `/login`, `/signup` y `/dashboard` y el cliente de Supabase son plantillas de la base del proyecto; la calculadora no las usa ni enlaza.
- `npm audit` informa 9 avisos (2 moderados, 7 altos), todos en herramientas de desarrollo de la base (ESLint y Tailwind). Las dependencias que llegan al navegador no tienen avisos (`npm audit --omit=dev`).

## Publicación

- Producción: <https://ads-calculator-five.vercel.app>
- Proyecto de Vercel: `ads-calculator` (equipo `contacto-coders-projects`), creado solo para esta app.
- Se publica desde esta carpeta con la CLI de Vercel: `vercel deploy --prod`. No hay repositorio de git conectado, así que no se publica sola al cambiar el código.
- No necesita variables de entorno en Vercel.

## Sobre la base del proyecto

El repositorio conserva la fábrica SaaS Factory (carpeta `.claude/` y `CLAUDE.md`) con la que se creó. Su documentación está en [.claude/README.md](.claude/README.md).

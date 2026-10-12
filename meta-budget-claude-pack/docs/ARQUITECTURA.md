# Arquitectura

## Stack
React, TypeScript estricto, Vite, decimal.js, date-fns, Vitest, Testing Library. CSS propio con variables y componentes reutilizables; no hace falta una biblioteca visual pesada. npm como gestor por defecto, mantener lockfile.

## Estructura sugerida
src/domain/types.ts
src/domain/money.ts
src/domain/commission.ts
src/domain/scenarios.ts
src/domain/allocation.ts
src/domain/validation.ts
src/domain/*.test.ts
src/storage/simulationStorage.ts
src/components/{MoneyInput,PercentInput,StepIndicator,ScenarioCard,PlanTable}.tsx
src/features/calculator/{Calculator,PropertyStep,CommissionStep,CapacityStep,ScenarioStep,PlanStep,Results}.tsx
src/styles/{tokens,app,print}.css

## Contrato orientativo
MoneyInput = cadena decimal; MoneyResult = entero de centavos.
CommissionSpec = {kind: 'percentage'|'fixed', value: string, advisorSharePercent: string}.
CommissionModel = {kind:'single', single:CommissionSpec} | {kind:'split', listing:CommissionSpec, selling:CommissionSpec}.
SimulationInput = {country?:string, currency:'USD'|'MXN'|'COP'|'EUR'|'PEN', listingPrice?:string, closingPrice:string, commission:CommissionModel, availableBudget?:string, selectedScenario:5|10|20|null, startDate:string}.
SavedSimulation = {schemaVersion:1, calculationVersion:1, savedAt:string, input:SimulationInput}.
CalculationResult = {advisorCommissionMinor:number, breakdown:..., scenarios:..., selectedPlan?:{stages:..., days:...}, notices:...}.

Guardar entradas, no resultados como fuente de verdad. Recalcular al recuperar. Validar datos de localStorage y versionado. Archivo corrupto: avisar y permitir reiniciar, sin bloquear la app. Manejar acceso denegado o cuota sin perder funcionalidad. Clave: meta-real-estate-budget:v1. Nada de datos sensibles, propietarios o direcciones exactas.

Dominio sin React, localStorage ni formateo visual. Funciones puras deterministas. Estado de formulario conserva borradores y errores; cálculo solo con datos válidos. Mantener avisos de exceso ligados al presupuesto actual: invalidar aceptación si cambian presupuesto o disponibilidad.

README final: instalación, desarrollo, tests, typecheck, build y limitaciones. Scripts esperados: dev, test, typecheck, build, preview.

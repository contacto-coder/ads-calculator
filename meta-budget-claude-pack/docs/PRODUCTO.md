# Producto

## Objetivo
Responder: cuánto recibiría el asesor si cierra y cobra, cuánto puede asignar a publicidad y cómo distribuirlo en 30 días. Público: asesores que venden propiedades de terceros; no desarrolladores. Venta individual, no portafolios ni renta.

## Flujo
1. Propiedad: país opcional, moneda obligatoria, precio publicado opcional, precio de cierre estimado obligatorio. País no determina contratos ni impuestos. Monedas MVP: USD, MXN, COP, EUR y PEN, todas con dos decimales contables. País y moneda independientes. No conversión.
2. Comisión: elegir comisión única con reparto o comisión por puntas. Explicar captación = conseguir propiedad; venta = conseguir comprador. Cada comisión admite porcentaje del cierre o importe fijo en la moneda seleccionada. Participación final del asesor entre 0 y 100 %, después de repartos con agencia o socios.
3. Capacidad: dinero disponible opcional. Vacío significa desconocido, cero significa ninguna disponibilidad. No confundirlos.
4. Escenarios: mostrar siempre 5/10/20 %. Elegir explícitamente uno; no preseleccionar el mayor ni prometer rapidez. Si excede disponibilidad, avisar y permitir continuar mediante aceptación explícita del aviso; nunca cambiar el importe.
5. Plan: fecha de inicio obligatoria, por defecto fecha local del dispositivo. Duración fija 30 días; cuatro etapas 7/7/7/9. Mostrar resumen y calendario.

Se puede volver atrás sin perder información. Resultados se actualizan después de cambios válidos. Mostrar comisión, porcentaje publicitario, presupuesto, promedio diario, saldo, retorno condicionado opcional en bloque explicativo y plan completo. Acción imprimir / guardar como PDF mediante navegador. Acción empezar de nuevo con confirmación si hay datos. Guardado automático local de una simulación con indicador y recuperación al recargar.

## Fuera del MVP
API Meta, ajustes automáticos, mínimos publicitarios, predicción de venta, leads estimados, autenticación, nube, tipos de cambio, impuestos y costos de producción. El dinero publicitario corresponde solo a medios.

## Mensajes obligatorios
“Comisión estimada si se cierra y cobra la venta.”
“Saldo antes de otros gastos e impuestos.”
“Estos porcentajes son una metodología de planificación; no son mínimos exigidos por Meta.”
“El presupuesto no garantiza la venta ni el plazo de cierre.”
“Los importes diarios son promedios de planificación; el gasto real de la plataforma puede variar.”

No alegar límites actuales de Meta ni reglas nacionales sin verificación oficial futura.

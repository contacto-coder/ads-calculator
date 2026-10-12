# Reglas de cálculo, versión 1

## Entradas y precisión
Entradas monetarias como cadenas decimales no negativas, máximo dos decimales. Precio de cierre > 0. Porcentajes entre 0 y 100, máximo cuatro decimales. Validar formato antes de convertir; no truncar silenciosamente. Usar decimal.js, redondeo HALF_UP. Resultados monetarios en enteros de centavos seguros; rechazar cantidades fuera de Number.MAX_SAFE_INTEGER. No usar Intl para interpretar entradas, solo para mostrar resultados.

## Comisión
Única: bruto = precioCierre × tasa/100, o monto fijo. ComisiónAsesor = redondearCentavos(bruto × participación/100).
Puntas: calcular bruto captación y venta independientemente; aplicar participación a cada bruto; redondear a centavos cada resultado; sumar ambos. Mostrar desglose con la misma política. Participación cero es válida. No aplicar reparto global adicional. Comisiones del modelo inactivo no participan.

## Escenarios
Para r en [5,10,20]: presupuesto = HALF_UP(comisiónCentavos × r/100). Saldo = comisiónCentavos − presupuestoCentavos. Promedio = presupuesto/30, mostrado a dos decimales; nunca usar este promedio redondeado para reconstruir el total.
Retorno condicionado = saldo/presupuesto × 100, solo si presupuesto > 0. Mostrar a dos decimales y aclarar que considera solo publicidad y supone cierre y cobro. No mostrar Infinity/NaN. Comisión cero: mostrar explicación y bloquear plan de inversión. Presupuesto que redondea a cero: mostrar escenario no planificable.
Disponibilidad: supera si presupuesto > disponibilidad, comparando centavos.

## Distribución exacta
Pesos [10,20,30,40], días [7,7,7,9]. Usar método del mayor resto: calcular cuota exacta en centavos, asignar floor a cada etapa y distribuir centavos sobrantes por fracción descendente; empates se resuelven por índice de etapa ascendente. Garantizar suma = presupuesto.
Para cada etapa dividir centavos por cantidad de días: base = floor(total/días), sobrante = total % días; primeros sobrante días reciben base+1. Mostrar promedio por etapa y calendario diario exacto. Un día con importe cero es válido; indicar que la planificación queda muy fragmentada si ocurre, sin inventar mínimo Meta.
Fechas como YYYY-MM-DD local. Sumar días de calendario con date-fns o equivalente, nunca 24 horas en milisegundos ni parseo UTC de fecha sin zona. Día 30 = inicio + 29 días. Etapas inclusivas sin huecos ni solapamientos.

## Cambio de moneda
No convertir cifras. Si existen importes, solicitar confirmación: “Cambiar la moneda no convierte los importes. Se conservarán los números con la nueva moneda.” Permitir cancelar.

## Ejemplo principal
Comisión asesor 5000 USD: presupuestos 250/500/1000; saldos 4750/4500/4000; promedios 8.33/16.67/33.33; retornos condicionados 1900/900/400 %.
Para 250: etapas 25/50/75/100; promedios 3.57/7.14/10.71/11.11. Calendario etapa 1: un día 3.58 y seis 3.57; etapa 2: dos días 7.15 y cinco 7.14; etapa 3: tres días 10.72 y cuatro 10.71; etapa 4: un día 11.12 y ocho 11.11.

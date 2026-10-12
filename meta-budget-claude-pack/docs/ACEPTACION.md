# Aceptación

## Pruebas del motor
1. Única: cierre 200000, tasa 5 %, participación 50 % => 500000 centavos.
2. Puntas: cierre 200000, captación 2 % con participación 0 %, venta 3 % con participación 50 % => 300000 centavos.
3. Ambas puntas: mismo cierre, captación 2 % al 100 % + venta 3 % al 100 % => 1000000 centavos.
4. Fija: 1200 con participación 25 % => 30000 centavos.
5. Modelo inactivo nunca cambia resultados.
6. Comisión 500000 centavos => presupuestos 25000/50000/100000 y saldos 475000/450000/400000.
7. Plan 25000 => etapas [2500,5000,7500,10000], 30 días y suma exacta; comprobar calendario del ejemplo.
8. Presupuesto 101 centavos => etapas [10,20,30,41]. Presupuesto 3 => [0,1,1,1]. Presupuesto 5 => [1,1,1,2] por desempate.
9. Generar múltiples presupuestos enteros, incluidas cifras pequeñas: suma de etapas y días exacta; enteros no negativos; pesos conservados con diferencia de redondeo menor a un centavo por cuota.
10. Inicio 2026-10-12 => final 2026-11-10; comprobar cambio de mes, año bisiesto y zona con cambio horario sin perder días.
11. Cero: sin división por cero; plan bloqueado si comisión o escenario seleccionado son cero.
12. Disponibilidad vacía no avisa; cero sí avisa para presupuesto positivo; igualdad no avisa.
13. Decimales: cierre 100.01, comisión 2.5 %, participación 50 % => 125 centavos.
14. Rechazar negativos, no finitos, porcentaje >100, formato ambiguo y números fuera de precisión segura.

## Recorridos de interfaz
- Completar ambos modelos y verificar resultados visibles.
- Volver atrás y editar cierre: recalcular todo sin datos obsoletos.
- Cambiar modelo: mantener borradores pero calcular solo el activo.
- Escenario sobre disponibilidad: aviso y aceptación explícita; cambiar entradas invalida aceptación.
- Recuperar datos al recargar; manejar almacenamiento corrupto y no disponible.
- Cambiar moneda: cancelar conserva todo; aceptar cambia denominación sin convertir números.
- Navegar por teclado; errores claros; sin desbordamiento horizontal a 360 px.
- Imprimir: solo informe limpio con cifras, fechas y supuestos.

## Definición de terminado
Aplicación funcional, sin placeholders ni botones vacíos; tests relevantes pasan; typecheck y build pasan; README y lockfile presentes; versión móvil revisada si hay herramientas disponibles. Reportar verificaciones reales, sin afirmar que se ejecutaron si no se ejecutaron. No requiere publicación para considerarse terminado.

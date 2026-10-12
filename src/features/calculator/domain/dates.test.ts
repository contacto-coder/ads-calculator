import { afterEach, describe, expect, it } from 'vitest'
import { buildPlan } from './allocation'
import { addCalendarDays, isValidLocalDate, parseLocalDate, toLocalISODate } from './dates'

const ORIGINAL_TZ = process.env.TZ

function useTimeZone(zone: string): void {
  process.env.TZ = zone
}

afterEach(() => {
  if (ORIGINAL_TZ === undefined) delete process.env.TZ
  else process.env.TZ = ORIGINAL_TZ
})

describe('fechas locales', () => {
  it('valida el formato YYYY-MM-DD y fechas reales del calendario', () => {
    expect(isValidLocalDate('2026-10-12')).toBe(true)
    expect(isValidLocalDate('2028-02-29')).toBe(true)
    expect(isValidLocalDate('2027-02-29')).toBe(false)
    expect(isValidLocalDate('2026-13-01')).toBe(false)
    expect(isValidLocalDate('2026-04-31')).toBe(false)
    expect(isValidLocalDate('12/10/2026')).toBe(false)
    expect(isValidLocalDate('2026-10-12T00:00:00Z')).toBe(false)
    expect(isValidLocalDate('')).toBe(false)
  })

  it('interpreta la fecha en hora local, no en UTC', () => {
    useTimeZone('America/Mazatlan')
    const date = parseLocalDate('2026-10-12')
    expect(date?.getFullYear()).toBe(2026)
    expect(date?.getMonth()).toBe(9)
    expect(date?.getDate()).toBe(12)
    expect(toLocalISODate(new Date(2026, 9, 12, 23, 30))).toBe('2026-10-12')
  })

  // Aceptación 10
  it('el día 30 es inicio + 29 días, con cambio de mes', () => {
    expect(addCalendarDays('2026-10-12', 29)).toBe('2026-11-10')
    expect(buildPlan(25000, '2026-10-12', 5).endDate).toBe('2026-11-10')
  })

  it('cruza el cambio de año', () => {
    expect(addCalendarDays('2026-12-15', 29)).toBe('2027-01-13')
  })

  it('respeta los años bisiestos', () => {
    expect(addCalendarDays('2028-02-01', 28)).toBe('2028-02-29')
    expect(addCalendarDays('2028-02-01', 29)).toBe('2028-03-01')
    expect(addCalendarDays('2027-02-01', 29)).toBe('2027-03-02')
    expect(addCalendarDays('2100-02-01', 29)).toBe('2100-03-02')
  })

  it.each([
    // Inicio del horario de verano (día de 23 horas) y fin (día de 25 horas).
    ['America/New_York', '2026-03-01', '2026-03-30'],
    ['America/New_York', '2026-10-20', '2026-11-18'],
    ['Europe/Madrid', '2026-03-15', '2026-04-13'],
    ['Europe/Madrid', '2026-10-10', '2026-11-08'],
    // Zonas donde el cambio ocurre a medianoche: ese día no tiene 00:00.
    ['America/Santiago', '2026-08-25', '2026-09-23'],
    ['America/Havana', '2026-02-25', '2026-03-26'],
  ])('no pierde ni repite días con cambio horario en %s desde %s', (zone, start, expectedEnd) => {
    useTimeZone(zone)
    const offsets = new Set(
      Array.from({ length: 30 }, (_, day) => new Date(2026, 0, 1 + day * 12).getTimezoneOffset())
    )
    expect(offsets.size, `${zone} debería tener cambio horario`).toBeGreaterThan(1)

    const plan = buildPlan(25000, start, 5)
    const dates = plan.days.map((day) => day.date)

    expect(dates[0]).toBe(start)
    expect(dates[29]).toBe(expectedEnd)
    expect(new Set(dates).size).toBe(30)
    dates.slice(1).forEach((date, index) => {
      expect(addCalendarDays(dates[index], 1)).toBe(date)
    })
  })

  it('rechaza sumar días a una fecha inválida', () => {
    expect(() => addCalendarDays('no-es-fecha', 1)).toThrow(RangeError)
  })
})

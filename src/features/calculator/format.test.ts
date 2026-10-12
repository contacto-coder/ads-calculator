import { describe, expect, it } from 'vitest'
import { FALLBACK_LOCALE, createFormatters, resolveDisplayLocale } from './format'

/** Los formatos regionales usan espacios duros; se normalizan para comparar. */
const plain = (text: string) => text.replace(/\s/g, ' ')

describe('resolveDisplayLocale', () => {
  it('usa el formato regional en español del dispositivo', () => {
    expect(resolveDisplayLocale('es-CO')).toBe('es-CO')
    expect(resolveDisplayLocale('es-MX')).toBe('es-MX')
    expect(resolveDisplayLocale('es')).toBe('es')
  })

  it('recurre a es-MX si el dispositivo no está en español o no informa idioma', () => {
    expect(FALLBACK_LOCALE).toBe('es-MX')
    expect(resolveDisplayLocale('en-US')).toBe('es-MX')
    expect(resolveDisplayLocale('pt-BR')).toBe('es-MX')
    expect(resolveDisplayLocale(undefined)).toBe('es-MX')
    expect(resolveDisplayLocale('')).toBe('es-MX')
    expect(resolveDisplayLocale('esto no es un idioma')).toBe('es-MX')
  })
})

describe('createFormatters', () => {
  const fmt = createFormatters('es-MX')

  it('muestra siempre el código de moneda y dos decimales', () => {
    expect(plain(fmt.money(500000, 'USD'))).toBe('USD 5,000.00')
    expect(plain(fmt.money(125, 'EUR'))).toBe('EUR 1.25')
    expect(plain(fmt.money(0, 'MXN'))).toBe('MXN 0.00')
    expect(plain(fmt.money(5, 'PEN'))).toBe('PEN 0.05')
    expect(plain(fmt.money(35000000000, 'COP'))).toBe('COP 350,000,000.00')
  })

  it('no pierde centavos con importes muy grandes', () => {
    expect(plain(fmt.money(Number.MAX_SAFE_INTEGER, 'USD'))).toBe('USD 90,071,992,547,409.91')
    expect(plain(fmt.money(Number.MAX_SAFE_INTEGER - 92, 'USD'))).toBe('USD 90,071,992,547,408.99')
  })

  it('respeta el formato regional sin cambiar las cifras', () => {
    expect(plain(createFormatters('es-CO').money(500000, 'COP'))).toBe('COP 5.000,00')
    expect(plain(createFormatters('es-ES').money(12345678, 'EUR'))).toBe('123.456,78 EUR')
  })

  it('formatea porcentajes escritos con punto o coma', () => {
    expect(plain(fmt.percent('5'))).toBe('5 %')
    expect(plain(fmt.percent('2,5'))).toBe('2.5 %')
    expect(plain(fmt.percent('33.3333'))).toBe('33.3333 %')
    expect(plain(fmt.fixedPercent('1900.00', 2))).toBe('1,900.00 %')
    expect(plain(fmt.fixedPercent('400', 2))).toBe('400.00 %')
  })

  it('devuelve el texto original si no es un número', () => {
    expect(fmt.percent('abc')).toBe('abc')
    expect(fmt.fixedPercent('abc', 2)).toBe('abc')
  })

  it('formatea fechas locales sin desplazarlas por zona horaria', () => {
    expect(fmt.date('2026-10-12')).toBe('12 oct 2026')
    expect(fmt.date('2026-11-01')).toBe('1 nov 2026')
    expect(fmt.weekdayDate('2026-10-12')).toBe('lun, 12 oct 2026')
    expect(fmt.weekdayDate('no-es-fecha')).toBe('no-es-fecha')
    expect(fmt.date('no-es-fecha')).toBe('no-es-fecha')
  })

  it('formatea la hora de guardado y tolera instantes inválidos', () => {
    expect(fmt.time('2026-10-12T18:30:00.000Z')).toMatch(/\d{1,2}:30/)
    expect(fmt.time('ayer')).toBe('')
  })
})

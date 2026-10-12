import { describe, expect, it } from 'vitest'
import { D, parseMoney, parsePercent, percentOf, roundMinor } from './money'

describe('parseMoney', () => {
  it('convierte importes válidos a centavos enteros', () => {
    expect(parseMoney('200000')).toEqual({ ok: true, value: 20000000 })
    expect(parseMoney('100.01')).toEqual({ ok: true, value: 10001 })
    expect(parseMoney('0')).toEqual({ ok: true, value: 0 })
    expect(parseMoney('0.5')).toEqual({ ok: true, value: 50 })
  })

  it('acepta coma decimal y espacios alrededor', () => {
    expect(parseMoney('100,01')).toEqual({ ok: true, value: 10001 })
    expect(parseMoney('  1250,5  ')).toEqual({ ok: true, value: 125050 })
  })

  it('no pierde precisión con decimales que el binario no representa', () => {
    expect(parseMoney('0.07')).toEqual({ ok: true, value: 7 })
    expect(parseMoney('1.15')).toEqual({ ok: true, value: 115 })
    expect(parseMoney('8.95')).toEqual({ ok: true, value: 895 })
  })

  // Aceptación 14
  it('rechaza negativos', () => {
    expect(parseMoney('-5')).toEqual({ ok: false, error: 'negative' })
    expect(parseMoney('−5,50')).toEqual({ ok: false, error: 'negative' })
  })

  it('rechaza valores no finitos', () => {
    for (const raw of ['Infinity', '-Infinity', 'NaN', 'inf', '∞']) {
      expect(parseMoney(raw)).toEqual({ ok: false, error: 'notFinite' })
    }
  })

  it('rechaza formatos ambiguos con separadores de miles', () => {
    for (const raw of ['1,234.56', '1.234,56', '1.234.567', '1 234', "1'234", '1.234']) {
      expect(parseMoney(raw)).toEqual({ ok: false, error: 'ambiguousFormat' })
    }
  })

  it('rechaza más de dos decimales sin truncar', () => {
    expect(parseMoney('10.1234')).toEqual({ ok: false, error: 'tooManyDecimals' })
    expect(parseMoney('0,00001')).toEqual({ ok: false, error: 'tooManyDecimals' })
  })

  it('rechaza formatos que no son un decimal simple', () => {
    for (const raw of ['abc', '1e5', '$100', '12.', '.5', '+5', '5%', '0x10', '12 %']) {
      expect(parseMoney(raw)).toEqual({ ok: false, error: 'invalidFormat' })
    }
  })

  it('distingue vacío de cero', () => {
    expect(parseMoney('')).toEqual({ ok: false, error: 'required' })
    expect(parseMoney('   ')).toEqual({ ok: false, error: 'required' })
  })

  it('rechaza importes fuera de la precisión segura', () => {
    // Number.MAX_SAFE_INTEGER = 9007199254740991 centavos
    expect(parseMoney('90071992547409.91')).toEqual({ ok: true, value: Number.MAX_SAFE_INTEGER })
    expect(parseMoney('90071992547409.92')).toEqual({ ok: false, error: 'unsafeAmount' })
    expect(parseMoney('999999999999999999999')).toEqual({ ok: false, error: 'unsafeAmount' })
  })
})

describe('parsePercent', () => {
  it('acepta de 0 a 100 con hasta cuatro decimales', () => {
    expect(parsePercent('0')).toMatchObject({ ok: true })
    expect(parsePercent('100')).toMatchObject({ ok: true })
    expect(parsePercent('2.5')).toMatchObject({ ok: true })
    expect(parsePercent('2,125')).toMatchObject({ ok: true })
    expect(parsePercent('33.3333')).toMatchObject({ ok: true })
  })

  it('conserva el valor exacto', () => {
    const parsed = parsePercent('33,3333')
    expect(parsed.ok && parsed.value.toString()).toBe('33.3333')
  })

  // Aceptación 14
  it('rechaza porcentajes mayores que 100', () => {
    expect(parsePercent('100.0001')).toEqual({ ok: false, error: 'outOfRange' })
    expect(parsePercent('101')).toEqual({ ok: false, error: 'outOfRange' })
  })

  it('rechaza negativos, no finitos, ambiguos y exceso de decimales', () => {
    expect(parsePercent('-1')).toEqual({ ok: false, error: 'negative' })
    expect(parsePercent('NaN')).toEqual({ ok: false, error: 'notFinite' })
    expect(parsePercent('1,5.0')).toEqual({ ok: false, error: 'ambiguousFormat' })
    expect(parsePercent('2.12345')).toEqual({ ok: false, error: 'tooManyDecimals' })
    expect(parsePercent('')).toEqual({ ok: false, error: 'required' })
  })
})

describe('roundMinor', () => {
  it('redondea HALF_UP', () => {
    expect(roundMinor(new D('0.5'))).toBe(1)
    expect(roundMinor(new D('1.5'))).toBe(2)
    expect(roundMinor(new D('2.5'))).toBe(3)
    expect(roundMinor(new D('2.4999'))).toBe(2)
    expect(roundMinor(new D('125.0125'))).toBe(125)
  })

  it('devuelve null fuera de la precisión segura', () => {
    expect(roundMinor(new D(Number.MAX_SAFE_INTEGER))).toBe(Number.MAX_SAFE_INTEGER)
    expect(roundMinor(new D(Number.MAX_SAFE_INTEGER).plus(1))).toBeNull()
  })
})

describe('percentOf', () => {
  it('no arrastra errores de coma flotante binaria', () => {
    // En binario, 1.15 * 100 = 114.99999999999999
    expect(percentOf(115, 100).toString()).toBe('115')
    expect(percentOf(10001, new D('2.5')).toString()).toBe('250.025')
  })
})

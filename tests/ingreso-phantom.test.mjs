import test from 'node:test'
import assert from 'node:assert/strict'

import { parseIngresoPhantomId } from '../src/lib/ingreso-phantom.ts'

test('recognizes legacy phantom ids ending in _next', () => {
  assert.deepEqual(parseIngresoPhantomId('abc_next'), {
    isPhantom: true,
    originalId: 'abc',
  })
})

test('recognizes projected phantom ids with sequence suffix', () => {
  assert.deepEqual(parseIngresoPhantomId('abc_next_1'), {
    isPhantom: true,
    originalId: 'abc',
  })
})

test('leaves persisted ingreso ids unchanged', () => {
  assert.deepEqual(parseIngresoPhantomId('abc-123'), {
    isPhantom: false,
    originalId: 'abc-123',
  })
})

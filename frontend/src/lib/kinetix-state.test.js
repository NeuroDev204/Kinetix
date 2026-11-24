// @vitest-environment happy-dom
// Kinetix state keys on the client: meals and english merge per entry across devices, a meal photo
// counts as a media reference, and a state with a meal has data.
import { describe, it, expect } from 'vitest'
import { STAMPED_MAPS, mergeStates } from './sync-merge.js'
import { stateMediaRefs } from './media-refs.js'
import { DEF } from '../store/useStore.js'

const HASH = 'c'.repeat(64)
const meal = (ts, extra = {}) => ({ d: '2026-11-24', at: ts, m: { hash: HASH, mime: 'image/jpeg' }, items: [], status: 'done', edited: false, _ts: ts, ...extra })

describe('Kinetix state keys', () => {
  it('meals and english are stamped maps', () => {
    expect(STAMPED_MAPS).toEqual(expect.arrayContaining(['meals', 'english']))
  })

  it('two devices adding different meals keep both', () => {
    const a = { ...DEF, meals: { m1: meal(100) } }
    const b = { ...DEF, meals: { m2: meal(200) } }
    expect(Object.keys(mergeStates(a, b).meals).sort()).toEqual(['m1', 'm2'])
  })

  it('a removal stamped later beats an earlier add', () => {
    const a = { ...DEF, meals: { m1: meal(100) } }
    const b = { ...DEF, meals: { m1: { _ts: 300 } } }
    expect(mergeStates(a, b).meals.m1.d).toBeUndefined()
  })

  it('a meal photo is a media reference', () => {
    expect(stateMediaRefs({ ...DEF, meals: { m1: meal(1) } }).map(m => m.hash)).toContain(HASH)
  })
})

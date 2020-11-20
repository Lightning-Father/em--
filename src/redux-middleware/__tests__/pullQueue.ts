import { store } from '../../store'
import { RANKED_ROOT, ROOT_TOKEN } from '../../constants'
import { initialize } from '../../initialize'
import { getAllChildren, getParent, rankThoughtsFirstMatch } from '../../selectors'
import * as dexie from '../../data-providers/dexie'
import getContext from '../../data-providers/data-helpers/getContext'
import { DataProvider } from '../../data-providers/DataProvider'

// mock getUserRef (firebase's database.ref)
jest.mock('../../util/getUserRef')
jest.useFakeTimers()

// mock debounce and throttle
// fake timers cause an infinite loop on _.debounce
// Jest v26 contains a 'modern' option for useFakeTimers (https://github.com/facebook/jest/pull/7776), but I am getting a "TypeError: Cannot read property 'useFakeTimers' of undefined" error when I call jest.useFakeTimers('modern'). The same error does not uccor when I use 'legacy' or omit the argument (react-scripts v4.0.0-next.64).
// https://github.com/facebook/jest/issues/3465#issuecomment-504908570
jest.mock('lodash', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { debounce, throttle } = require('../../test-helpers/mock-debounce-throttle')
  return Object.assign({},
    jest.requireActual('lodash'),
    {
      debounce,
      throttle,
    }
  )
})

const db = dexie as DataProvider

/** Switch to real timers to set a real delay, then set back to fake timers. This was the only thing that worked to force the test to wait for flushPending (or getManyDescendants?) to complete. */
const delay = async (n: number) => {
  jest.useRealTimers()
  await new Promise(resolve => setTimeout(resolve, n))
  jest.useFakeTimers()
}

describe('thoughtCache', () => {

  beforeEach(async () => {
    await initialize()
    jest.runOnlyPendingTimers()
  })

  afterEach(async () => {
    store.dispatch({ type: 'clear' })
    await db.clearAll()
    jest.runOnlyPendingTimers()
  })

  it('disable isLoading after initialize', async () => {
    await delay(100)
    expect(store.getState().isLoading).toBe(false)
  })

  it('load thought', async () => {

    const parentEntryRoot1 = await getContext(db, [ROOT_TOKEN])
    jest.runOnlyPendingTimers()
    expect(parentEntryRoot1).toBeUndefined()

    // create a thought, which will get persisted to local db
    store.dispatch({ type: 'newThought', value: 'a' })
    jest.runOnlyPendingTimers()

    const parentEntryRoot = await getContext(db, [ROOT_TOKEN])
    jest.runOnlyPendingTimers()
    expect(parentEntryRoot).toMatchObject({
      children: [{ value: 'a', rank: 0 }]
    })

    // clear state
    store.dispatch({ type: 'clear' })
    jest.runOnlyPendingTimers()

    const children = getAllChildren(store.getState(), [ROOT_TOKEN])
    expect(children).toHaveLength(0)

    // confirm thought is still in local db after state has been cleared
    const parentEntryRootAfterReload = await getContext(db, [ROOT_TOKEN])
    jest.runOnlyPendingTimers()
    expect(parentEntryRootAfterReload).toMatchObject({
      children: [{ value: 'a' }]
    })

    // clear and call initialize again to reload from db (simulating page refresh)
    store.dispatch({ type: 'clear' })
    jest.runOnlyPendingTimers()
    await initialize()
    await delay(100)

    const childrenAfterInitialize = getAllChildren(store.getState(), [ROOT_TOKEN])
    expect(childrenAfterInitialize).toMatchObject([
      { value: 'a' }
    ])
  })

  it('do not repopulate deleted thought', async () => {

    jest.runOnlyPendingTimers()

    store.dispatch([
      { type: 'newThought', value: '' },
      {
        type: 'existingThoughtDelete',
        context: [ROOT_TOKEN],
        thoughtRanked: { value: '', rank: 0 },
      },
      // Need to setCursor to trigger the pullQueue
      // Must set cursor manually since existingThoughtDelete does not.
      // (The cursor is normally set after deleting via the deleteThought reducer).
      { type: 'setCursor', path: null }
    ])

    jest.runOnlyPendingTimers()
    await delay(500)

    const parentEntryRoot = getParent(store.getState(), [ROOT_TOKEN])
    expect(parentEntryRoot).toBe(undefined)

    const parentEntryChild = getParent(store.getState(), [''])
    expect(parentEntryChild).toBe(undefined)
  })

  it('load buffered thoughts', async () => {

    store.dispatch({
      type: 'importText',
      path: RANKED_ROOT,
      text: `
        - a
          - b
            - c
              - d
                - e`
    })

    jest.runOnlyPendingTimers()

    expect(await getContext(db, [ROOT_TOKEN])).toMatchObject({ children: [{ value: 'a' }] })
    expect(await getContext(db, ['a'])).toMatchObject({ children: [{ value: 'b' }] })
    expect(await getContext(db, ['a', 'b'])).toMatchObject({ children: [{ value: 'c' }] })
    expect(await getContext(db, ['a', 'b', 'c'])).toMatchObject({ children: [{ value: 'd' }] })
    expect(await getContext(db, ['a', 'b', 'c', 'd'])).toMatchObject({ children: [{ value: 'e' }] })
    expect(await getContext(db, ['a', 'b', 'c', 'd', 'e'])).toBeUndefined()

    // clear state
    // call initialize again to reload from db (simulating page refresh)
    store.dispatch({ type: 'clear' })
    jest.runOnlyPendingTimers()
    await initialize()
    await delay(500)

    const state = store.getState()
    expect(getAllChildren(state, [ROOT_TOKEN])).toMatchObject([{ value: 'a' }])
    expect(getAllChildren(state, ['a'])).toMatchObject([{ value: 'b' }])
    expect(getAllChildren(state, ['a', 'b'])).toMatchObject([{ value: 'c' }])
    expect(getAllChildren(state, ['a', 'b', 'c'])).toMatchObject([{ value: 'd' }])
    expect(getAllChildren(state, ['a', 'b', 'c', 'd'])).toMatchObject([{ value: 'e' }])
    expect(getAllChildren(state, ['a', 'b', 'c', 'd', 'e'])).toMatchObject([])
  })

  it('delete thought with buffered descendants', async () => {

    store.dispatch([
      {
        type: 'importText',
        path: RANKED_ROOT,
        text: `
          - x
          - a
            - b
              - c
                - d
                  - e
      ` },
      { type: 'setCursor', path: [{ value: 'x', rank: 0 }] },
    ])

    jest.runOnlyPendingTimers()

    expect(await getContext(db, [ROOT_TOKEN])).toMatchObject({ children: [{ value: 'x' }, { value: 'a' }] })
    expect(await getContext(db, ['a'])).toMatchObject({ children: [{ value: 'b' }] })
    expect(await getContext(db, ['a', 'b'])).toMatchObject({ children: [{ value: 'c' }] })
    expect(await getContext(db, ['a', 'b', 'c'])).toMatchObject({ children: [{ value: 'd' }] })
    expect(await getContext(db, ['a', 'b', 'c', 'd'])).toMatchObject({ children: [{ value: 'e' }] })
    expect(await getContext(db, ['a', 'b', 'c', 'd', 'e'])).toBeUndefined()

    // clear and call initialize again to reload from db (simulating page refresh)
    store.dispatch({ type: 'clear' })
    jest.runOnlyPendingTimers()
    await initialize()
    await delay(100)

    // delete thought with buffered descendants
    store.dispatch({
      type: 'existingThoughtDelete',
      context: [ROOT_TOKEN],
      thoughtRanked: { value: 'a', rank: 1 }
    })
    jest.runOnlyPendingTimers()

    // wait until thoughts are buffered in and then deleted in a separate existingThoughtDelete call
    // existingThoughtDelete -> pushQueue -> thoughtCache -> existingThoughtDelete
    await delay(500)

    expect(getAllChildren(store.getState(), [ROOT_TOKEN])).toMatchObject([{ value: 'x' }])

    expect(await getContext(db, [ROOT_TOKEN])).toMatchObject({ children: [{ value: 'x' }] })
    expect(await getContext(db, ['a'])).toBeFalsy()
    expect(await getContext(db, ['a', 'b'])).toBeFalsy()
    expect(await getContext(db, ['a', 'b', 'c'])).toBeFalsy()
    expect(await getContext(db, ['a', 'b', 'c', 'd'])).toBeFalsy()
    expect(await getContext(db, ['a', 'b', 'c', 'd', 'e'])).toBeFalsy()
  })

  it('move thought with buffered descendants', async () => {

    store.dispatch([
      {
        type: 'importText',
        path: RANKED_ROOT,
        text: `
          - x
          - a
            - m
            - b
              - c
                - d
                  - e
      ` },
      { type: 'setCursor', path: [{ value: 'x', rank: 0 }] },
    ])

    jest.runOnlyPendingTimers()

    expect(await getContext(db, [ROOT_TOKEN])).toMatchObject({ children: [{ value: 'x' }, { value: 'a' }] })
    expect(await getContext(db, ['a'])).toMatchObject({ children: [{ value: 'm' }, { value: 'b' }] })
    expect(await getContext(db, ['a', 'b'])).toMatchObject({ children: [{ value: 'c' }] })
    expect(await getContext(db, ['a', 'm'])).toBeUndefined()
    expect(await getContext(db, ['a', 'b', 'c'])).toMatchObject({ children: [{ value: 'd' }] })
    expect(await getContext(db, ['a', 'b', 'c', 'd'])).toMatchObject({ children: [{ value: 'e' }] })
    expect(await getContext(db, ['a', 'b', 'c', 'd', 'e'])).toBeUndefined()

    // clear and call initialize again to reload from db (simulating page refresh)
    store.dispatch({ type: 'clear' })
    jest.runOnlyPendingTimers()
    await initialize()
    await delay(100)

    // delete thought with buffered descendants
    const aPath = rankThoughtsFirstMatch(store.getState(), ['a'])
    const xPath = rankThoughtsFirstMatch(store.getState(), ['x'])
    store.dispatch({
      type: 'existingThoughtMove',
      context: [ROOT_TOKEN],
      oldPath: aPath,
      newPath: [...xPath, ...aPath],
    })
    jest.runOnlyPendingTimers()

    // wait until thoughts are buffered in and then deleted in a separate existingThoughtDelete call
    // existingThoughtDelete -> pushQueue -> thoughtCache -> existingThoughtDelete
    await delay(500)

    expect(getAllChildren(store.getState(), [ROOT_TOKEN])).toMatchObject([{ value: 'x' }])

    expect(await getContext(db, [ROOT_TOKEN])).toMatchObject({ children: [{ value: 'x' }] })
    expect(await getContext(db, ['a'])).toBeFalsy()
    expect(await getContext(db, ['a', 'b'])).toBeFalsy()
    expect(await getContext(db, ['a', 'b', 'c'])).toBeFalsy()
    expect(await getContext(db, ['a', 'b', 'c', 'd'])).toBeFalsy()
    expect(await getContext(db, ['a', 'b', 'c', 'd', 'e'])).toBeFalsy()

    expect(await getContext(db, ['x'])).toMatchObject({ children: [{ value: 'a' }] })
    expect(await getContext(db, ['x', 'a'])).toMatchObject({ children: [{ value: 'm' }, { value: 'b' }] })
    expect(await getContext(db, ['x', 'a', 'b'])).toMatchObject({ children: [{ value: 'c' }] })
    expect(await getContext(db, ['x', 'a', 'b', 'c'])).toMatchObject({ children: [{ value: 'd' }] })
    expect(await getContext(db, ['x', 'a', 'b', 'c', 'd'])).toMatchObject({ children: [{ value: 'e' }] })
    expect(await getContext(db, ['x', 'a', 'b', 'c', 'd', 'e'])).toBeUndefined()

  })

  it('edit thought with buffered descendants', async () => {

    store.dispatch([
      {
        type: 'importText',
        path: RANKED_ROOT,
        text: `
          - x
          - a
            - m
            - b
              - c
                - d
                  - e
      ` },
      { type: 'setCursor', path: [{ value: 'x', rank: 0 }] },
    ])

    jest.runOnlyPendingTimers()

    expect(await getContext(db, [ROOT_TOKEN])).toMatchObject({ children: [{ value: 'x' }, { value: 'a' }] })
    expect(await getContext(db, ['a'])).toMatchObject({ children: [{ value: 'm' }, { value: 'b' }] })
    expect(await getContext(db, ['a', 'b'])).toMatchObject({ children: [{ value: 'c' }] })
    expect(await getContext(db, ['a', 'm'])).toBeUndefined()
    expect(await getContext(db, ['a', 'b', 'c'])).toMatchObject({ children: [{ value: 'd' }] })
    expect(await getContext(db, ['a', 'b', 'c', 'd'])).toMatchObject({ children: [{ value: 'e' }] })
    expect(await getContext(db, ['a', 'b', 'c', 'd', 'e'])).toBeUndefined()

    // clear and call initialize again to reload from db (simulating page refresh)
    store.dispatch({ type: 'clear' })
    jest.runOnlyPendingTimers()
    await initialize()
    await delay(100)

    // delete thought with buffered descendants
    store.dispatch({
      type: 'existingThoughtChange',
      oldValue: 'a',
      newValue: 'a!',
      context: [ROOT_TOKEN],
      path: [{ value: 'a', rank: 1 }],
    })
    jest.runOnlyPendingTimers()

    // wait until thoughts are buffered in and then deleted in a separate existingThoughtDelete call
    // existingThoughtDelete -> pushQueue -> thoughtCache -> existingThoughtDelete
    await delay(500)

    expect(getAllChildren(store.getState(), [ROOT_TOKEN])).toMatchObject([{ value: 'x' }, { value: 'a!' }])

    expect(await getContext(db, [ROOT_TOKEN])).toMatchObject({ children: [{ value: 'x' }, { value: 'a!' }] })
    expect(await getContext(db, ['a'])).toBeFalsy()
    expect(await getContext(db, ['a', 'b'])).toBeFalsy()
    expect(await getContext(db, ['a', 'b', 'c'])).toBeFalsy()
    expect(await getContext(db, ['a', 'b', 'c', 'd'])).toBeFalsy()
    expect(await getContext(db, ['a', 'b', 'c', 'd', 'e'])).toBeFalsy()

    expect(await getContext(db, ['a!'])).toMatchObject({ children: [{ value: 'm' }, { value: 'b' }] })
    expect(await getContext(db, ['a!', 'b'])).toMatchObject({ children: [{ value: 'c' }] })
    expect(await getContext(db, ['a!', 'b', 'c'])).toMatchObject({ children: [{ value: 'd' }] })
    expect(await getContext(db, ['a!', 'b', 'c', 'd'])).toMatchObject({ children: [{ value: 'e' }] })
    expect(await getContext(db, ['a!', 'b', 'c', 'd', 'e'])).toBeUndefined()

  })

})
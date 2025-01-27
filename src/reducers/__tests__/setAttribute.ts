import { HOME_TOKEN } from '../../constants'
import { initialState, reducerFlow } from '../../util'
import { exportContext } from '../../selectors'

// reducers
import newSubthought from '../newSubthought'
import newThought from '../newThought'
import setAttribute from '../setAttribute'
import setCursorFirstMatch from '../../test-helpers/setCursorFirstMatch'

it('set', () => {
  const steps = [
    newThought('a'),
    setAttribute({
      context: ['a'],
      key: '=test',
      value: 'hello',
    }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - =test
      - hello`)
})

it('different value should override existing value', () => {
  const steps = [
    newThought('a'),
    setAttribute({
      context: ['a'],
      key: '=test',
      value: 'hello',
    }),
    setAttribute({
      context: ['a'],
      key: '=test',
      value: 'goodbye',
    }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - =test
      - goodbye`)
})

it('add attribute if key has already been created', () => {
  const steps = [
    newThought('a'),
    newSubthought('=test'),
    setCursorFirstMatch(['a']),
    setAttribute({
      context: ['a'],
      key: '=test',
      value: 'hello',
    }),
    setAttribute({
      context: ['a'],
      key: '=test',
      value: 'goodbye',
    }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - =test
      - goodbye`)
})

it('omit value to set only attribute', () => {
  const steps = [
    newThought('a'),
    setAttribute({
      context: ['a'],
      key: '=test',
    }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - =test`)
})

it('set empty attribute', () => {
  const steps = [
    newThought('a'),
    setAttribute({
      context: ['a'],
      key: '=test',
      value: '',
    }),
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())
  const exported = exportContext(stateNew, [HOME_TOKEN], 'text/plain')

  expect(exported).toBe(`- ${HOME_TOKEN}
  - a
    - =test
      -${' '}`)
})

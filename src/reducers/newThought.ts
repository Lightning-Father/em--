import _ from 'lodash'
import { State } from '../util/initialState'
import { Path } from '../types'

// constants
import {
  RANKED_ROOT,
  TUTORIAL2_STEP_CONTEXT1,
  TUTORIAL2_STEP_CONTEXT1_HINT,
  TUTORIAL2_STEP_CONTEXT1_PARENT,
  TUTORIAL2_STEP_CONTEXT1_PARENT_HINT,
  TUTORIAL2_STEP_CONTEXT2,
  TUTORIAL2_STEP_CONTEXT2_HINT,
  TUTORIAL2_STEP_CONTEXT2_PARENT,
  TUTORIAL2_STEP_CONTEXT2_PARENT_HINT,
  TUTORIAL_STEP_FIRSTTHOUGHT,
  TUTORIAL_STEP_FIRSTTHOUGHT_ENTER,
  TUTORIAL_STEP_SECONDTHOUGHT,
  TUTORIAL_STEP_SECONDTHOUGHT_ENTER,
  TUTORIAL_STEP_SUBTHOUGHT,
} from '../constants'

// util
import {
  createId,
  ellipsize,
  head,
  headValue,
  parentOf,
  pathToContext,
  reducerFlow,
  rootedParentOf,
  unroot,
} from '../util'

// selectors
import {
  getNextRank,
  getPrevRank,
  getRankAfter,
  getRankBefore,
  getSetting,
  hasChild,
  isContextViewActive,
  simplifyPath,
} from '../selectors'

// reducers
import {
  alert,
  newThoughtSubmit,
  setCursor,
  tutorialNext,
  tutorialStep as tutorialStepReducer,
} from '../reducers'

export interface NewThoughtPayload {
  at?: Path,
  insertNewSubthought?: boolean,
  insertBefore?: boolean,
  value?: string,
  offset?: number,
  preventSetCursor?: boolean,
}

/** Adds a new thought to the cursor. NOOP if the cursor is not set.
 *
 * @param offset The focusOffset of the selection in the new thought. Defaults to end.
 */
const newThought = (state: State, payload: NewThoughtPayload | string) => {

  // optionally allow string value to be passed as entire payload
  if (typeof payload === 'string') {
    payload = { value: payload }
  }

  const { at, insertNewSubthought, insertBefore, value = '', offset, preventSetCursor }: NewThoughtPayload = payload

  const tutorialStep = +(getSetting(state, 'Tutorial Step') || 0)
  const tutorialStepNewThoughtCompleted =
    // new thought
    (!insertNewSubthought && (
      Math.floor(tutorialStep) === TUTORIAL_STEP_FIRSTTHOUGHT ||
      Math.floor(tutorialStep) === TUTORIAL_STEP_SECONDTHOUGHT
    )) ||
    // new thought in context
    (insertNewSubthought && Math.floor(tutorialStep) === TUTORIAL_STEP_SUBTHOUGHT) ||
    // enter after typing text
    (state.cursor && headValue(state.cursor).length > 0 &&
      (tutorialStep === TUTORIAL_STEP_SECONDTHOUGHT_ENTER ||
        tutorialStep === TUTORIAL_STEP_FIRSTTHOUGHT_ENTER))

  const path = at || state.cursor || RANKED_ROOT
  const simplePath = simplifyPath(state, path)
  const thoughts = pathToContext(simplePath)
  const context = pathToContext(rootedParentOf(simplePath))

  // prevent adding Subthought to readonly or unextendable Thought
  const sourceContext = insertNewSubthought ? thoughts : context
  if (hasChild(state, sourceContext, '=readonly')) {
    return alert(state, {
      value: `"${ellipsize(head(sourceContext))}" is read-only. No subthoughts may be added.`
    })
  }
  else if (hasChild(state, sourceContext, '=unextendable')) {
    return alert(state, {
      value: `"${ellipsize(head(sourceContext))}" is unextendable. No subthoughts may be added.`
    })
  }

  const showContexts = isContextViewActive(state, thoughts)
  const showContextsParent = isContextViewActive(state, pathToContext(parentOf(simplePath)))

  // use the live-edited value
  // const thoughtsLive = showContextsParent
  //   ? parentOf(parentOf(thoughts)).concat().concat(head(thoughts))
  //   : thoughts
  // const pathLive = showContextsParent
  //   ? parentOf(parentOf(path).concat({ value: innerTextRef, rank })).concat(head(path))
  //   : path

  // if meta key is pressed, add a child instead of a sibling of the current thought
  // if shift key is pressed, insert the child before the current thought
  const newRank = (showContextsParent && !insertNewSubthought) || (showContexts && insertNewSubthought)
    ? 0 // rank does not matter here since it is autogenerated
    : insertBefore
      ? insertNewSubthought || !simplePath ? getPrevRank(state, thoughts) : getRankBefore(state, simplePath)
      : insertNewSubthought || !simplePath ? getNextRank(state, thoughts) : getRankAfter(state, simplePath)

  const id = createId()

  const reducers = [

    // newThoughtSubmit
    newThoughtSubmit({
      context: insertNewSubthought
        ? thoughts
        : context,
      // inserting a new child into a context functions the same as in the normal thought view
      addAsContext: (showContextsParent && !insertNewSubthought) || (showContexts && insertNewSubthought),
      rank: newRank,
      value,
      id,
    }),

    // setCursor
    !preventSetCursor
      ? setCursor({
        editing: true,
        path: unroot([
          ...insertNewSubthought ? path : parentOf(path),
          { value, rank: newRank, id }
        ]),
        offset: offset != null ? offset : value.length,
      })
      : null,

    // tutorial step 1
    tutorialStepNewThoughtCompleted ? tutorialNext({})
    // some hints are rolled back when a new thought is created
    : tutorialStep === TUTORIAL2_STEP_CONTEXT1_PARENT_HINT ? tutorialStepReducer({ value: TUTORIAL2_STEP_CONTEXT1_PARENT })
    : tutorialStep === TUTORIAL2_STEP_CONTEXT1_HINT ? tutorialStepReducer({ value: TUTORIAL2_STEP_CONTEXT1 })
    : tutorialStep === TUTORIAL2_STEP_CONTEXT2_PARENT_HINT ? tutorialStepReducer({ value: TUTORIAL2_STEP_CONTEXT2_PARENT })
    : tutorialStep === TUTORIAL2_STEP_CONTEXT2_HINT ? tutorialStepReducer({ value: TUTORIAL2_STEP_CONTEXT2 })
    : null,
  ]

  return reducerFlow(reducers)(state)
}

export default _.curryRight(newThought)
import { unroot } from './unroot'
import { Context, State } from '../@types'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'

/** Get max depth of a visible context. */
export const getDepth = (state: State, context: Context): number => {
  const children = getAllChildrenAsThoughts(state, context) ?? []
  return children.length === 0
    ? 0
    : Math.max(
        ...children.map(child => {
          const contextNew = [...unroot(context), child.value]
          return getDepth(state, contextNew)
        }),
      ) + 1
}

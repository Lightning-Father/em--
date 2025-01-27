import UndoIcon from '../components/UndoIcon'
import { Shortcut } from '../@types'
import { isUndoEnabled } from '../selectors/isUndoEnabled'
import { alert as alertAction } from '../action-creators'
import { startCase } from 'lodash'
import { getLatestActionType } from '../util/getLastActionType'

const undoShortcut: Shortcut = {
  id: 'undo',
  label: 'Undo',
  description: getState => {
    const lastActionType = getLatestActionType(getState().undoPatches)

    if (lastActionType) {
      return `Undo ${startCase(lastActionType)}`
    }

    return 'Undo.'
  },
  svg: UndoIcon,
  exec: (dispatch, getState) => {
    if (!isUndoEnabled(getState())) return

    const lastActionType = getLatestActionType(getState().undoPatches)

    dispatch({ type: 'undoAction' })

    if (!lastActionType) return

    dispatch(
      alertAction(`Undo: ${startCase(lastActionType)}`, { isInline: true, clearDelay: 3000, showCloseLink: false }),
    )
  },
  canExecute: getState => isUndoEnabled(getState()),
}

export default undoShortcut

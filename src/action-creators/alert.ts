import { FunctionComponent } from 'react'
import { Thunk } from '../@types'

interface Options {
  alertType?: string
  showCloseLink?: boolean
  clearDelay?: number
  isInline?: boolean
}

let clearAlertTimeoutId: ReturnType<typeof setTimeout> | null = null // eslint-disable-line fp/no-let

/**
 * Dispatches an alert action.
 *
 * @param value The string or React Component that will be rendered in the alert.
 * @param showCloseLink Show a small 'x' in the upper right corner that allows the user to close the alert. Default: true.
 * @param type An arbitrary alert type that can be added to the alert. This is useful if specific alerts needs to be detected later on, for example, to determine if the alert should be closed, or if it has been superceded by a different alert type.
 * @param clearDelay Timeout after which alert will be cleared.
 */
const alert =
  (value: string | FunctionComponent | null, { alertType, showCloseLink, clearDelay, isInline }: Options = {}): Thunk =>
  (dispatch, getState) => {
    const { alert } = getState()

    // if clearDelay is not provided i.e undefined alert should not dismiss.
    if (clearDelay) {
      // if clearAlertTimeoutId !== null, it means that previous alert hasn't been cleared yet. In this case cancel previous timeout and start new.
      clearAlertTimeoutId && clearTimeout(clearAlertTimeoutId)
      clearAlertTimeoutId = setTimeout(() => {
        dispatch({
          type: 'alert',
          alertType,
          showCloseLink,
          value: null,
          isInline,
        })
        clearAlertTimeoutId = null
      }, clearDelay)
    }

    if (alert && alert.value === value) return

    dispatch({
      type: 'alert',
      alertType,
      showCloseLink,
      value,
      isInline,
    })
  }

export default alert

import React from 'react'
import { attributeEquals, simplifyPath } from '../selectors'
import { pathToContext } from '../util'
import { alert, toggleAttribute } from '../action-creators'
import { Icon as IconType, Shortcut } from '../@types'
import { HOME_PATH } from '../constants'

// eslint-disable-next-line jsdoc/require-jsdoc
const Icon = ({ size = 20, style }: IconType) => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    className='icon'
    version='1.1'
    x='0px'
    y='0px'
    viewBox='0 0 23 20'
    width={size}
    height={size}
    style={style}
  >
    <g transform='translate(-514 -140)'>
      <g xmlns='http://www.w3.org/2000/svg'>
        <path d='M525,154.95V166h1v-11.05c1.694-0.245,3-1.688,3-3.45c0-1.933-1.566-3.5-3.5-3.5s-3.5,1.567-3.5,3.5    C522,153.261,523.306,154.705,525,154.95z M523,151.5c0-1.381,1.119-2.5,2.5-2.5s2.5,1.119,2.5,2.5s-1.119,2.5-2.5,2.5    S523,152.881,523,151.5z' />
        <path d='M533,159h1v-11.05c1.694-0.245,3-1.688,3-3.45c0-1.933-1.566-3.5-3.5-3.5s-3.5,1.567-3.5,3.5c0,1.761,1.306,3.205,3,3.45    V159z M531,144.5c0-1.381,1.119-2.5,2.5-2.5s2.5,1.119,2.5,2.5s-1.119,2.5-2.5,2.5S531,145.881,531,144.5z' />
        <path d='M517,160h1v-11.05c0.354-0.051,0.688-0.151,1-0.299c1.18-0.563,2-1.757,2-3.15c0-1.933-1.566-3.5-3.5-3.5    s-3.5,1.567-3.5,3.5c0,1.394,0.82,2.587,2,3.15c0.312,0.148,0.646,0.248,1,0.299V160z M515,145.5c0-1.381,1.119-2.5,2.5-2.5    s2.5,1.119,2.5,2.5s-1.119,2.5-2.5,2.5S515,146.881,515,145.5z' />
      </g>
    </g>
  </svg>
)

const pinSubthoughtsShortcut: Shortcut = {
  id: 'pinSubthoughts',
  label: 'Pin Open Subthoughts',
  description: "Pin open the current thought's subthoughts.",
  keyboard: { key: 'p', meta: true, shift: true },
  svg: Icon,
  canExecute: getState => !!getState().cursor,
  exec: (dispatch, getState, e, { type }) => {
    const state = getState()
    const { cursor } = state
    if (!cursor) return

    const simplePath = simplifyPath(state, cursor)
    const context = pathToContext(state, simplePath)

    // if the user used the keyboard to activate the shortcut, show an alert describing the sort direction
    // since the user won't have the visual feedbavk from the toolbar due to the toolbar hiding logic
    if (type === 'keyboard') {
      const pinned = attributeEquals(state, context, '=pinChildren', 'true')
      dispatch(
        alert(pinned ? 'Unpinned subthoughts' : 'Pinned subthoughts', { clearDelay: 2000, showCloseLink: false }),
      )
    }

    dispatch(
      toggleAttribute({
        context,
        key: '=pinChildren',
        value: 'true',
      }),
    )
  },
  isActive: getState => {
    const state = getState()
    const { cursor } = state
    const context = pathToContext(state, cursor ? simplifyPath(state, cursor) : HOME_PATH)
    return attributeEquals(state, context, '=pinChildren', 'true')
  },
}

export default pinSubthoughtsShortcut

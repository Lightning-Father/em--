/* eslint-disable fp/no-class, fp/no-this */
import React from 'react'
import * as classNames from 'classnames'

// constants
import {
  FADEOUT_DURATION,
  HELPER_CLOSE_DURATION,
  HELPER_REMIND_ME_LATER_DURATION,
  TUTORIAL_STEP_NONE,
} from '../constants.js'

// util
import {
  modalCleanup,
} from '../util.js'

// needs to be a class component to use componentWillUnmount
export class ModalComponent extends React.Component {

  constructor(props) {
    super(props)
    this.ref = React.createRef()
  }

  componentDidMount() {

    // for modals that appear within the hierarchy, we have to do some hacky css patching to fix the stack order of next siblings and descendants.

    // if (this.ref.current) {
    //   const closestParentThought = this.ref.current.parentNode.parentNode
    //   closestParentThought.parentNode.classList.add('modal-container')
    //   let siblingsAfter = nextSiblings(closestParentThought)
    //   for (let i = 0; i < siblingsAfter.length; i++) {
    //     if (siblingsAfter[i].classList) {
    //       siblingsAfter[i].classList.add('sibling-after')
    //     }
    //   }
    //   siblingsAfter = nextSiblings(closestParentThought.parentNode)
    //   for (let i = 0; i < siblingsAfter.length; i++) {
    //     if (siblingsAfter[i].classList) {
    //       siblingsAfter[i].classList.add('sibling-after')
    //     }
    //   }
    // }

    // add a global escape listener
    this.escapeListener = e => {
      if (this.props.show && e.key === 'Escape') {
        e.stopPropagation()
        this.close(HELPER_CLOSE_DURATION)
        window.removeEventListener('keydown', this.escapeListener)
      }
    }

    // modal method to animate and close the modal
    this.close = duration => {
      const { id, dispatch } = this.props
      window.removeEventListener('keydown', this.escapeListener)
      modalCleanup()
      if (this.ref.current) {
        this.ref.current.classList.add('animate-fadeout')
      }
      setTimeout(() => {
        dispatch({ type: 'modalRemindMeLater', id, duration })
      }, FADEOUT_DURATION)
    }

    // use capturing so that this fires before the global window Escape which removes the cursor
    window.addEventListener('keydown', this.escapeListener, true)
  }

  componentWillUnmount() {
    modalCleanup()
    window.removeEventListener('keydown', this.escapeListener)
  }

  render() {
    const { show, id, title, arrow, center, opaque, onSubmit, className, style, positionAtCursor, top, children, dispatch } = this.props

    const sel = document.getSelection()
    const cursorCoords = sel.type !== 'None' ? sel.getRangeAt(0).getClientRects()[0] || {} : {}

    if (!show) return null

    return <div ref={this.ref} style={Object.assign({}, style, top ? { top: 55 } : null, positionAtCursor ? {
      top: cursorCoords.y,
      left: cursorCoords.x
    } : null)} className={className + ' ' + classNames({
        modal: true,
        animate: true,
        [`modal-${id}`]: true,
        center,
        opaque
      })}>
      {id !== 'welcome' ? <a className='upper-right popup-x text-small' onClick={() => dispatch({ type: 'modalRemindMeLater', id: 'help' })}>✕</a> : null}
      <div className={classNames({
        'modal-content': true,
        [arrow]: arrow
      })}>
        {title ? <h1 className='modal-title'>{title}</h1> : null}
        <div className='modal-text'>{children}</div>
        <div className='modal-actions'>
          {
          id === 'welcome' ? <a className='button' onClick={() => {
            dispatch({ type: 'modalComplete', id })
          }}>START TUTORIAL</a> :
          id === 'feedback' ? <div>
            <a className='button button-small button-inactive' onClick={() => {
              dispatch({ type: 'modalRemindMeLater', id })
            }}>Cancel</a>
            <a className='button button-small button-active' onClick={e => {
              if (onSubmit) {
                onSubmit(e)
              }
              dispatch({ type: 'modalRemindMeLater', id })
          }}>Send</a>
          </div> :
          id === 'help' ? <a className='button' onClick={() => {
            dispatch({ type: 'modalRemindMeLater', id })
          }}>Close</a> :
          <span>
            <a onClick={() => {
              dispatch({ type: 'modalComplete', id })
            }}>Got it!</a>
            <span> </span><a onClick={() => this.close(HELPER_REMIND_ME_LATER_DURATION)}>Remind me later</a>
            { // <span> </span><a onClick={() => this.close(HELPER_REMIND_ME_TOMORROW_DURATION)}>Remind me tomorrow</a>
            }
          </span>}
          {id === 'welcome' ? <div><a onClick={() => {
            dispatch({ type: 'modalComplete', id })
            dispatch({ type: 'tutorialStep', value: TUTORIAL_STEP_NONE })
          }}>Skip tutorial</a></div> : null}
        </div>
        <a className='modal-close' onClick={() => this.close(HELPER_CLOSE_DURATION)}><span>✕</span></a>
      </div>
    </div>
  }
}

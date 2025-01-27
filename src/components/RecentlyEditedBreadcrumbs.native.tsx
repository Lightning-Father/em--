import React from 'react'
import { useSelector } from 'react-redux'
import { getThoughtById, simplifyPath } from '../selectors'

// components
import Link from './Link'
import Superscript from './Superscript'
import { ContextBreadcrumbs, ContextBreadcrumbProps } from './ContextBreadcrumbs'
import { head, parentOf } from '../util'
import { Path, State } from '../@types'
import { View } from 'moti'
import { commonStyles } from '../style/commonStyles'

/**
 * Varaint of ContextBreadcrumbs for recently edited with collapsing overflow.
 */
const RecentlyEditedBreadcrumbs = (props: Omit<ContextBreadcrumbProps, 'simplePath'> & { path: Path }) => {
  const simplePath = useSelector((state: State) => simplifyPath(state, props.path))
  const parentSimplePath = parentOf(simplePath)
  const value = useSelector((state: State) => getThoughtById(state, head(simplePath)).value)

  return (
    <>
      <View style={[commonStyles.halfOpacity, commonStyles.marginBottomS]}>
        <ContextBreadcrumbs {...props} simplePath={simplePath} />
      </View>
      <Link simplePath={parentSimplePath} label={value} />
      <Superscript simplePath={simplePath} />
    </>
  )
}

export default RecentlyEditedBreadcrumbs

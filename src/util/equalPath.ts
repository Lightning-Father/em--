import { Path } from '../@types'

/** Compares two path arrays using { value, rank } as identity and ignoring other properties. */
export const equalPath = (a: Path | null | undefined, b: Path | null | undefined): boolean =>
  a === b || (!!a && !!b && a.length === b.length && a.every && a.every((_, i) => a[i] === b[i]))

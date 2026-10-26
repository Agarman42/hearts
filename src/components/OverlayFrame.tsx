import { createPortal } from 'react-dom'
import type { HTMLAttributes, ReactNode } from 'react'

type Props = HTMLAttributes<HTMLDivElement> & { children: ReactNode }

/**
 * The table clips overflow and its seats use backdrop-filter. A fixed sheet
 * mounted inside that table paints under those seats on a phone. Body is
 * outside that stacking context.
 */
export function OverlayFrame({ children, ...rest }: Props) {
  return createPortal(<div {...rest}>{children}</div>, document.body)
}

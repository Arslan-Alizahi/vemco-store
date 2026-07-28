import { type ClassValue, clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'
import { fontSizeNames } from '@/design/typography'

/**
 * tailwind-merge, taught the project's role-named type scale.
 *
 * `text-` is ambiguous: it prefixes both font sizes and text colours, and
 * tailwind-merge tells them apart by recognising the suffix. It knows `sm`
 * and `lg` are sizes and `white` is a colour, but `body`, `ui`, `h1` and the
 * rest are ours, so it filed them under colour and put `text-white` and
 * `text-body` in the same conflict group -- last one wins, first one silently
 * deleted.
 *
 * Every primary button in the app was rendering bark-900 on caramel-600 at
 * 3.49:1 because of it. `cva` emits the variant before the size, so the size
 * class always arrived second and always won. The class was gone before the
 * markup existed, which is why nothing upstream of the rendered page could
 * have caught it.
 *
 * Derived from the same object Tailwind generates the classes from, so adding
 * a size cannot reintroduce this.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: fontSizeNames }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

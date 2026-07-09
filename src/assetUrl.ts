/**
 * Public-folder asset URL that works on GitHub Pages project sites
 * (base: './') as well as local dev (base often '/').
 *
 * Absolute paths like `/characters/ace.jpg` break on
 * https://user.github.io/hearts/ — they resolve to github.io root.
 */
export function publicUrl(path: string): string {
  const base = import.meta.env.BASE_URL || './'
  const clean = path.replace(/^\//, '')
  if (base.endsWith('/')) return `${base}${clean}`
  return `${base}/${clean}`
}

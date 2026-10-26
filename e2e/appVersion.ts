import { readFileSync } from 'node:fs'

/** Home stamp must match the package version for the branch under test. */
export function appVersion(): string {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }
  return pkg.version
}

/** Set ROOMS_DISABLED to "1" and deploy to make every room refuse work. */
export function roomsDisabled(env: { ROOMS_DISABLED?: string } | undefined): boolean {
  const value = env?.ROOMS_DISABLED?.trim().toLowerCase()
  return value === '1' || value === 'true' || value === 'yes'
}

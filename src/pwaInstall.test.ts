import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  canNativeInstall,
  dismissPwaTip,
  initPwaInstallListeners,
  installInstructions,
  isPwaTipDismissed,
  promptNativeInstall,
} from './pwaInstall'

describe('pwaInstall', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('remembers dismissed install tip', () => {
    expect(isPwaTipDismissed()).toBe(false)
    dismissPwaTip()
    expect(isPwaTipDismissed()).toBe(true)
  })

  it('captures beforeinstallprompt and can prompt install', async () => {
    const listeners: Record<string, EventListener> = {}
    vi.stubGlobal('window', {
      addEventListener: (type: string, fn: EventListener) => {
        listeners[type] = fn
      },
    })

    initPwaInstallListeners()
    expect(canNativeInstall()).toBe(false)

    const prompt = vi.fn().mockResolvedValue(undefined)
    const event = {
      preventDefault: vi.fn(),
      prompt,
      userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    }
    listeners.beforeinstallprompt?.(event as unknown as Event)

    expect(canNativeInstall()).toBe(true)
    await expect(promptNativeInstall()).resolves.toBe('accepted')
    expect(prompt).toHaveBeenCalled()
    expect(canNativeInstall()).toBe(false)
  })

  it('does not mention an Install button until the browser offers one', () => {
    expect(installInstructions('android').steps.join(' ')).not.toMatch(/below/i)
    expect(installInstructions('desktop').steps.join(' ')).not.toMatch(/below/i)
    expect(installInstructions('android', { nativeReady: true }).steps[0]).toMatch(/Install Card Parlour/)
    expect(installInstructions('desktop', { nativeReady: true }).steps[0]).toMatch(/Install Card Parlour/)
    expect(installInstructions('ios').steps.join(' ')).toMatch(/Add to Home Screen/)
  })
})
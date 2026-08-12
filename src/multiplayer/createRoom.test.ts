import { describe, expect, it, vi } from 'vitest'
import { createRoomOnce, emptyCreateRoomCache } from './createRoom'

describe('createRoomOnce', () => {
  it('shares one in-flight create across overlapping callers', async () => {
    const cache = emptyCreateRoomCache()
    let resolveCreate!: (code: string) => void
    const create = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveCreate = resolve
        }),
    )

    const first = createRoomOnce(cache, create)
    const second = createRoomOnce(cache, create)
    expect(create).toHaveBeenCalledTimes(1)

    resolveCreate('K7QM')
    await expect(first).resolves.toBe('K7QM')
    await expect(second).resolves.toBe('K7QM')
    expect(create).toHaveBeenCalledTimes(1)
    expect(cache.code).toBe('K7QM')
  })

  it('returns the stored code without creating again', async () => {
    const cache = emptyCreateRoomCache()
    const create = vi.fn(async () => 'ABCD')
    await expect(createRoomOnce(cache, create)).resolves.toBe('ABCD')
    await expect(createRoomOnce(cache, create)).resolves.toBe('ABCD')
    expect(create).toHaveBeenCalledTimes(1)
  })

  it('allows a retry after a failed create', async () => {
    const cache = emptyCreateRoomCache()
    const create = vi
      .fn()
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValueOnce('WXYZ')

    await expect(createRoomOnce(cache, create)).rejects.toThrow('down')
    await expect(createRoomOnce(cache, create)).resolves.toBe('WXYZ')
    expect(create).toHaveBeenCalledTimes(2)
  })
})

import { describe, expect, it, vi } from 'vitest'
import { createRoomOnce, emptyCreateRoomCache, postCreateRoom } from './createRoom'

describe('createRoomOnce', () => {
  it('shares one in-flight create across overlapping callers', async () => {
    const cache = emptyCreateRoomCache()
    let resolveCreate!: (result: { code: string; token: string }) => void
    const create = vi.fn(
      () =>
        new Promise<{ code: string; token: string }>((resolve) => {
          resolveCreate = resolve
        }),
    )

    const first = createRoomOnce(cache, create)
    const second = createRoomOnce(cache, create)
    expect(create).toHaveBeenCalledTimes(1)

    resolveCreate({ code: 'K7QM', token: 'tok' })
    await expect(first).resolves.toEqual({ code: 'K7QM', token: 'tok' })
    await expect(second).resolves.toEqual({ code: 'K7QM', token: 'tok' })
    expect(create).toHaveBeenCalledTimes(1)
    expect(cache.result?.code).toBe('K7QM')
  })

  it('returns the stored result without creating again', async () => {
    const cache = emptyCreateRoomCache()
    const create = vi.fn(async () => ({ code: 'ABCD', token: 't' }))
    await expect(createRoomOnce(cache, create)).resolves.toEqual({ code: 'ABCD', token: 't' })
    await expect(createRoomOnce(cache, create)).resolves.toEqual({ code: 'ABCD', token: 't' })
    expect(create).toHaveBeenCalledTimes(1)
  })

  it('allows a retry after a failed create', async () => {
    const cache = emptyCreateRoomCache()
    const create = vi
      .fn()
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValueOnce({ code: 'WXYZ', token: 't' })

    await expect(createRoomOnce(cache, create)).rejects.toThrow('down')
    await expect(createRoomOnce(cache, create)).resolves.toEqual({ code: 'WXYZ', token: 't' })
    expect(create).toHaveBeenCalledTimes(2)
  })
})

describe('postCreateRoom', () => {
  it('repeats a paused-rooms reply', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('Rooms are paused. Try again in a little while.', { status: 503 })),
    )
    await expect(postCreateRoom('ws://127.0.0.1:8787', 'hearts', 'Ada')).rejects.toThrow(/paused/i)
    vi.unstubAllGlobals()
  })

  it('says when this network has opened too many rooms', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('slow down', { status: 429 })))
    await expect(postCreateRoom('ws://127.0.0.1:8787', 'spades', 'Ada')).rejects.toThrow(/too many rooms/i)
    vi.unstubAllGlobals()
  })
})

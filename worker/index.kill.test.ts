import { describe, expect, it } from 'vitest'
import worker from './index'

function pausedEnv() {
  return {
    ROOMS_DISABLED: '1',
    ROOM: {
      idFromName(): string {
        throw new Error('idFromName should not run while rooms are paused')
      },
      get(): { fetch(): Promise<Response> } {
        throw new Error('ROOM.get should not run while rooms are paused')
      },
    },
  }
}

describe('room kill switch', () => {
  it('keeps health up and does not touch a room', async () => {
    const env = pausedEnv()
    const health = await worker.fetch(new Request('https://cardparlour.test/health'), env)
    expect(health.status).toBe(200)
    expect(await health.text()).toBe('ok')

    const create = await worker.fetch(
      new Request('https://cardparlour.test/rooms', {
        method: 'POST',
        body: JSON.stringify({ gameId: 'hearts', name: 'Ada' }),
      }),
      env,
    )
    expect(create.status).toBe(503)

    const join = await worker.fetch(new Request('https://cardparlour.test/room/K7QM'), env)
    expect(join.status).toBe(503)
  })
})

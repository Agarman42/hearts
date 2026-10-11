import { describe, expect, it } from 'vitest'
import { retireAction } from './retire-hearts-room.mjs'

const emptyRefs = {
  success: true,
  result: {
    services: { incoming: [], outgoing: [], pages_function: false },
    durable_objects: [],
    dispatch_outbounds: [],
  },
}
const emptyTails = { success: true, result: [] }

describe('retire hearts-room', () => {
  it('skips a worker that is already gone', () => {
    expect(retireAction({ success: false, errors: [{ code: 10007, message: 'nope' }] }, null).action).toBe('skip')
    expect(retireAction({ success: false, errors: [{ message: 'This Worker does not exist' }] }, null).action).toBe('skip')
    expect(retireAction({ success: false }, null, { refsStatus: 404 }).action).toBe('skip')
  })

  it('deletes when nothing depends on it, including its own Durable Object', () => {
    const ownObject = retireAction(
      {
        ...emptyRefs,
        result: {
          ...emptyRefs.result,
          durable_objects: [{ service: 'hearts-room', durable_object_namespace_name: 'ROOM' }],
        },
      },
      emptyTails,
    )
    expect(ownObject.action).toBe('delete')
    expect(retireAction(emptyRefs, emptyTails).action).toBe('delete')
  })

  it('stops when another worker, Pages, or a tail still uses it', () => {
    expect(
      retireAction(
        { ...emptyRefs, result: { ...emptyRefs.result, services: { incoming: [{ service: 'cardparlour' }], pages_function: false } } },
        emptyTails,
      ).action,
    ).toBe('stop')
    expect(
      retireAction(
        { ...emptyRefs, result: { ...emptyRefs.result, services: { incoming: [], pages_function: true } } },
        emptyTails,
      ).action,
    ).toBe('stop')
    expect(
      retireAction(
        {
          ...emptyRefs,
          result: {
            ...emptyRefs.result,
            durable_objects: [{ service: 'cardparlour', durable_object_namespace_name: 'ROOM' }],
          },
        },
        emptyTails,
      ).action,
    ).toBe('stop')
    expect(retireAction(emptyRefs, { success: true, result: [{ producer: { service: 'cardparlour' } }] }).action).toBe('stop')
  })

  it('stops when the answer is not clear enough to delete', () => {
    expect(retireAction({ success: false, errors: [{ code: 9109, message: 'denied' }] }, null).action).toBe('stop')
    expect(retireAction(emptyRefs, { success: true, result: { not: 'a list' } }).action).toBe('stop')
  })
})

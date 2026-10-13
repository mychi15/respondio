import { beforeEach, describe, expect, it } from 'vitest'
import { useCreateNodeModal } from './useCreateNodeModal'

describe('useCreateNodeModal', () => {
  beforeEach(() => {
    useCreateNodeModal().close()
  })

  it('starts closed with no invocation', () => {
    const { isOpen, invocation } = useCreateNodeModal()
    expect(isOpen.value).toBe(false)
    expect(invocation.value).toBeNull()
  })

  it('open sets isOpen and stores the invocation', () => {
    const { isOpen, invocation, open } = useCreateNodeModal()
    open({ source: 'toolbar' })

    expect(isOpen.value).toBe(true)
    expect(invocation.value).toEqual({ source: 'toolbar' })
  })

  it('open overwrites a previous invocation', () => {
    const { invocation, open } = useCreateNodeModal()
    open({ source: 'toolbar' })
    open({ source: 'quickAdd', attachment: { mode: 'add', parentId: 3 } })

    expect(invocation.value).toEqual({ source: 'quickAdd', attachment: { mode: 'add', parentId: 3 } })
  })

  it('close resets isOpen and clears the invocation', () => {
    const { isOpen, invocation, open, close } = useCreateNodeModal()
    open({ source: 'toolbar' })

    close()

    expect(isOpen.value).toBe(false)
    expect(invocation.value).toBeNull()
  })

  it('shares state across separate calls since the state is module-level', () => {
    const first = useCreateNodeModal()
    const second = useCreateNodeModal()

    first.open({ source: 'toolbar' })

    expect(second.isOpen.value).toBe(true)
    expect(second.invocation.value).toEqual({ source: 'toolbar' })
  })

  it('markCreated records the created node id independently of close', () => {
    const { createdNodeId, markCreated, close } = useCreateNodeModal()
    markCreated('b6a0c1')
    close()

    expect(createdNodeId.value).toBe('b6a0c1')
  })
})

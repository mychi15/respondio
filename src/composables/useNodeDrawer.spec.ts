import { beforeEach, describe, expect, it } from 'vitest'
import { DRAWER_DEFAULT_WIDTH, DRAWER_MAX_WIDTH, DRAWER_MIN_WIDTH, useNodeDrawer } from './useNodeDrawer'

describe('useNodeDrawer', () => {
  beforeEach(() => {
    useNodeDrawer().close()
    useNodeDrawer().setWidth(DRAWER_DEFAULT_WIDTH)
  })

  it('starts closed with no selected node', () => {
    const { isOpen, selectedNodeId } = useNodeDrawer()
    expect(isOpen.value).toBe(false)
    expect(selectedNodeId.value).toBeNull()
  })

  it('open sets isOpen and stores the node id', () => {
    const { isOpen, selectedNodeId, open } = useNodeDrawer()
    open(2)

    expect(isOpen.value).toBe(true)
    expect(selectedNodeId.value).toBe(2)
  })

  it('open overwrites a previously selected node', () => {
    const { selectedNodeId, open } = useNodeDrawer()
    open(2)
    open('b6a0c1')

    expect(selectedNodeId.value).toBe('b6a0c1')
  })

  it('close resets isOpen and clears the selected node', () => {
    const { isOpen, selectedNodeId, open, close } = useNodeDrawer()
    open(2)

    close()

    expect(isOpen.value).toBe(false)
    expect(selectedNodeId.value).toBeNull()
  })

  it('shares state across separate calls since the state is module-level', () => {
    const first = useNodeDrawer()
    const second = useNodeDrawer()

    first.open(4)

    expect(second.isOpen.value).toBe(true)
    expect(second.selectedNodeId.value).toBe(4)
  })

  it('starts at the default width', () => {
    const { width } = useNodeDrawer()
    expect(width.value).toBe(DRAWER_DEFAULT_WIDTH)
  })

  it('setWidth updates the width within bounds', () => {
    const { width, setWidth } = useNodeDrawer()
    setWidth(500)
    expect(width.value).toBe(500)
  })

  it('setWidth clamps below the minimum', () => {
    const { width, setWidth } = useNodeDrawer()
    setWidth(DRAWER_MIN_WIDTH - 100)
    expect(width.value).toBe(DRAWER_MIN_WIDTH)
  })

  it('setWidth clamps above the maximum', () => {
    const { width, setWidth } = useNodeDrawer()
    setWidth(DRAWER_MAX_WIDTH + 100)
    expect(width.value).toBe(DRAWER_MAX_WIDTH)
  })
})

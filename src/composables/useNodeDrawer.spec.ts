import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  CANVAS_MIN_WIDTH,
  DRAWER_DEFAULT_WIDTH,
  DRAWER_MAX_WIDTH,
  DRAWER_MIN_WIDTH,
  DRAWER_OVERLAY_BREAKPOINT,
  useNodeDrawer,
} from './useNodeDrawer'

const initialViewportWidth = window.innerWidth

function setViewportWidth(width: number) {
  window.innerWidth = width
  window.dispatchEvent(new Event('resize'))
}

describe('useNodeDrawer', () => {
  beforeEach(() => {
    setViewportWidth(1920)
    useNodeDrawer().close()
    useNodeDrawer().setWidth(DRAWER_DEFAULT_WIDTH)
  })

  afterEach(() => {
    setViewportWidth(initialViewportWidth)
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

  it('open bumps focusRequest only when focus is requested', () => {
    const { focusRequest, open } = useNodeDrawer()
    const before = focusRequest.value

    open(2)
    expect(focusRequest.value).toBe(before)

    open(2, { focus: true })
    expect(focusRequest.value).toBe(before + 1)
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

  it('caps the width so the canvas keeps its minimum width on a medium viewport', () => {
    const { width, setWidth } = useNodeDrawer()
    setViewportWidth(900)
    setWidth(DRAWER_MAX_WIDTH)

    expect(width.value).toBe(900 - CANVAS_MIN_WIDTH)
  })

  it('shows a capped width when the viewport shrinks but restores the preference once it grows', () => {
    const { width, displayWidth, setWidth } = useNodeDrawer()
    setWidth(DRAWER_MAX_WIDTH)

    setViewportWidth(900)
    expect(displayWidth.value).toBe(900 - CANVAS_MIN_WIDTH)
    expect(width.value).toBe(DRAWER_MAX_WIDTH)

    setViewportWidth(1920)
    expect(displayWidth.value).toBe(DRAWER_MAX_WIDTH)
  })

  it('switches to the full-screen overlay below the breakpoint', () => {
    const { isOverlay } = useNodeDrawer()
    expect(isOverlay.value).toBe(false)

    setViewportWidth(DRAWER_OVERLAY_BREAKPOINT - 1)
    expect(isOverlay.value).toBe(true)
  })
})

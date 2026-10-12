import { VueFlow } from '@vue-flow/core'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { sampleFlowNodes } from '@/stores/sampleFlow'
import CanvasView from './CanvasView.vue'

beforeAll(() => {
  if (typeof ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  }
})

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('CanvasView', () => {
  it('passes the store sample data plus add-node placeholders through to VueFlow as nodes and edges', () => {
    const wrapper = mount(CanvasView)

    const leafCount = sampleFlowNodes.filter(
      (node) => !sampleFlowNodes.some((candidate) => candidate.parentId === node.id),
    ).length

    const vueFlow = wrapper.findComponent(VueFlow)
    expect(vueFlow.props('nodes')).toHaveLength(sampleFlowNodes.length + leafCount)
    expect(vueFlow.props('edges')).toHaveLength(sampleFlowNodes.length - 1 + leafCount)
  })
})

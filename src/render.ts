import type { Component } from './dom'
import { h } from './dom'
import { createReactiveRoot } from './reactive'

export type Root = {
  render(app: Component): void
}

export function createRoot(container: HTMLElement): Root {
  return {
    render(app: Component): void {
      createReactiveRoot(() => {
        const node = h(app, null)
        container.appendChild(node)
      })
    },
  }
}

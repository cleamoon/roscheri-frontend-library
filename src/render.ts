import { Component, h } from './dom'
import { createRoot } from './reactive'

export function renderApp(app: Component): () => void {
  const container = document.getElementById('app')
  if (!container) {
    throw new Error('Container element not found')
  }
  return createRoot((dispose) => {
    const node = h(app, null)
    container!.appendChild(node)

    return () => {
      dispose()
      container!.textContent = ''
    }
  })
}

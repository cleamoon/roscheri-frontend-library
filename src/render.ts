import { createRoot } from './reactive'

export function render(
  code: () => Node,
  container: HTMLElement,
): () => void {
  return createRoot((dispose) => {
    const node = code()
    container.appendChild(node)

    return () => {
      dispose()
      container.textContent = ''
    }
  })
}

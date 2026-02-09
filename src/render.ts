/**
 * Top-level `render()` function — mounts a component tree into a DOM
 * container with automatic cleanup support.
 */

import { createRoot } from './reactive';

/**
 * Render a component tree into a container element.
 *
 * All reactive subscriptions created during rendering are owned by an
 * internal root — calling the returned `dispose` function tears everything
 * down and removes the rendered DOM.
 *
 * @param code      - A function that returns the root DOM node
 *                    (typically `() => h(App, null)`).
 * @param container - The DOM element to mount into.
 * @returns A `dispose` function that unmounts and cleans up.
 *
 * @example
 * ```ts
 * import { h, render, createSignal } from 'roscheri-frontend-library';
 *
 * const App = () => {
 *   const [msg] = createSignal('Hello!');
 *   return h('h1', null, () => msg());
 * };
 *
 * const dispose = render(() => h(App, null), document.getElementById('app')!);
 *
 * // Later, to unmount:
 * dispose();
 * ```
 */
export function render(
  code: () => Node,
  container: HTMLElement,
): () => void {
  return createRoot((dispose) => {
    const node = code();
    container.appendChild(node);

    return () => {
      dispose();
      container.textContent = '';
    };
  });
}

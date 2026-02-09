/**
 * Roscheri Frontend Library
 *
 * A Solid.js-inspired UI library written in pure TypeScript — no JSX,
 * no virtual DOM. Fine-grained reactivity drives surgical DOM updates.
 *
 * @example
 * ```ts
 * import { h, render, createSignal } from 'roscheri-frontend-library';
 *
 * const Counter = () => {
 *   const [count, setCount] = createSignal(0);
 *   return h('button',
 *     { onClick: () => setCount(c => c + 1) },
 *     () => `Clicked ${count()} times`,
 *   );
 * };
 *
 * render(() => h(Counter, null), document.getElementById('app')!);
 * ```
 *
 * @packageDocumentation
 */

// Reactive primitives
export {
  createSignal,
  createEffect,
  createMemo,
  createRoot,
  batch,
  onCleanup,
  untrack,
} from './reactive';
export type { Accessor, Setter } from './reactive';

// DOM builder
export { h } from './dom';
export type { Child, Props } from './dom';

// Components
export type { Component } from './component';

// Renderer
export { render } from './render';

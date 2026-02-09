/**
 * Component type for functional components.
 *
 * A component is a plain function that receives props and returns a real
 * DOM `Node` (typically via `h()`).
 *
 * @example
 * ```ts
 * import { h, createSignal } from 'roscheri-frontend-library';
 * import type { Component } from 'roscheri-frontend-library';
 *
 * const Greeting: Component<{ name: string }> = (props) =>
 *   h('span', null, `Hello, ${props.name}!`);
 * ```
 */

import type { Props } from './dom';

/**
 * A functional component.
 *
 * @template P - The props type accepted by this component.
 */
export type Component<P extends Props = Props> = (props: P) => Node;

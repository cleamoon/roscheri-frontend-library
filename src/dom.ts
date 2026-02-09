/**
 * DOM builder — creates **real** DOM elements with reactive bindings.
 *
 * The `h()` function is the core API. It replaces both `createElement` and
 * JSX — you describe your UI with plain function calls, and reactive values
 * (functions / signal accessors) are automatically wired up.
 *
 * @example
 * ```ts
 * import { h, createSignal } from 'roscheri-frontend-library';
 *
 * const [count, setCount] = createSignal(0);
 *
 * const el = h('button',
 *   { onClick: () => setCount(c => c + 1) },
 *   () => `Clicked ${count()} times`,
 * );
 *
 * document.body.appendChild(el);
 * ```
 */

import type { Component } from './component';
import { createEffect } from './reactive';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Anything that can appear as a child of `h()`. */
export type Child =
  | Node
  | string
  | number
  | boolean
  | null
  | undefined
  | (() => unknown)
  | Child[];

/** Element attributes / component props. */
export type Props = Record<string, unknown>;

// ---------------------------------------------------------------------------
// h()
// ---------------------------------------------------------------------------

/**
 * Create a DOM element (or call a component) with optional props and children.
 *
 * @param type     - An HTML tag name (`'div'`, `'button'`, …) or a component function.
 * @param props    - Attributes, event handlers, styles, etc. (`null` for none).
 * @param children - Static values, DOM nodes, or **reactive functions**.
 *
 * ### Reactive props
 *
 * Any prop whose value is a function (except event handlers starting with
 * `on`) is treated as **reactive** — an effect is created that updates the
 * DOM attribute whenever the function's return value changes.
 *
 * ```ts
 * h('div', { className: () => isActive() ? 'active' : '' })
 * ```
 *
 * ### Reactive children
 *
 * A child that is a function is also reactive — its return value is
 * rendered into the DOM, and the DOM updates automatically when the
 * signals it reads change.
 *
 * ```ts
 * h('span', null, () => `Count: ${count()}`)
 * ```
 *
 * @returns A real DOM `Node`.
 */
export function h(
  type: string | Component,
  props?: Props | null,
  ...children: Child[]
): Node {
  // --- Component ---
  if (typeof type === 'function') {
    const resolved = props ?? {};
    if (children.length > 0) {
      (resolved as Record<string, unknown>).children = children;
    }
    return (type as Component)(resolved);
  }

  // --- Element ---
  const el = document.createElement(type);

  // Props
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (key === 'children') continue;
      applyProp(el, key, value);
    }
  }

  // Children
  appendChildren(el, children);

  return el;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

const EVENT_RE = /^on[A-Z]/;

function applyProp(el: HTMLElement, key: string, value: unknown): void {
  // --- Event listeners (onClick, onInput, …) ---
  if (EVENT_RE.test(key)) {
    const event = key.slice(2).toLowerCase();
    el.addEventListener(event, value as EventListener);
    return;
  }

  // --- Ref ---
  if (key === 'ref') {
    if (typeof value === 'function') {
      (value as (el: HTMLElement) => void)(el);
    } else if (typeof value === 'object' && value !== null && 'current' in value) {
      (value as { current: unknown }).current = el;
    }
    return;
  }

  // --- Style (object or string) ---
  if (key === 'style') {
    applyStyle(el, value);
    return;
  }

  // --- Reactive prop ---
  if (typeof value === 'function') {
    createEffect(() => setProperty(el, key, (value as () => unknown)()));
    return;
  }

  // --- Static prop ---
  setProperty(el, key, value);
}

function setProperty(el: HTMLElement, key: string, value: unknown): void {
  if (key === 'className' || key === 'class') {
    el.className = value == null ? '' : String(value);
  } else if (value == null || value === false) {
    el.removeAttribute(key);
  } else if (value === true) {
    el.setAttribute(key, '');
  } else {
    el.setAttribute(key, String(value));
  }
}

// ---------------------------------------------------------------------------
// Style handling
// ---------------------------------------------------------------------------

function applyStyle(el: HTMLElement, value: unknown): void {
  if (typeof value === 'string') {
    el.setAttribute('style', value);
    return;
  }

  if (typeof value === 'function') {
    createEffect(() => applyStyle(el, (value as () => unknown)()));
    return;
  }

  if (typeof value === 'object' && value !== null) {
    for (const [prop, val] of Object.entries(value as Record<string, unknown>)) {
      if (typeof val === 'function') {
        createEffect(() => setStyleProp(el, prop, (val as () => unknown)()));
      } else {
        setStyleProp(el, prop, val);
      }
    }
  }
}

function setStyleProp(el: HTMLElement, prop: string, value: unknown): void {
  if (value == null || value === false) {
    el.style.removeProperty(camelToKebab(prop));
  } else {
    el.style.setProperty(camelToKebab(prop), String(value));
  }
}

/** Convert camelCase to kebab-case (`fontSize` → `font-size`). */
function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
}

// ---------------------------------------------------------------------------
// Children
// ---------------------------------------------------------------------------

function appendChildren(parent: HTMLElement, children: Child[]): void {
  for (const child of flattenChildren(children)) {
    insertChild(parent, child);
  }
}

/** Recursively flatten nested child arrays into a single list. */
function flattenChildren(children: Child[]): Exclude<Child, Child[]>[] {
  const result: Exclude<Child, Child[]>[] = [];
  for (const child of children) {
    if (Array.isArray(child)) {
      result.push(...flattenChildren(child));
    } else {
      result.push(child as Exclude<Child, Child[]>);
    }
  }
  return result;
}

function insertChild(parent: HTMLElement, child: Child): void {
  if (child == null || typeof child === 'boolean') return;

  // --- Static DOM node ---
  if (child instanceof Node) {
    parent.appendChild(child);
    return;
  }

  // --- Reactive child (function / signal accessor) ---
  if (typeof child === 'function') {
    // Anchor text node — we insert dynamic content just before it.
    const marker = document.createTextNode('');
    parent.appendChild(marker);

    let currentNodes: Node[] = [];

    createEffect(() => {
      const value = (child as () => unknown)();
      const newNodes = resolveNodes(value);

      // Optimisation: if both old and new are a single text node, just update.
      if (
        currentNodes.length === 1 &&
        newNodes.length === 1 &&
        currentNodes[0] instanceof Text &&
        newNodes[0] instanceof Text
      ) {
        currentNodes[0].nodeValue = newNodes[0].nodeValue;
        return;
      }

      // Remove previous nodes.
      for (const n of currentNodes) {
        if (n.parentNode === parent) parent.removeChild(n);
      }

      // Insert new nodes before the marker.
      for (const n of newNodes) {
        parent.insertBefore(n, marker);
      }

      currentNodes = newNodes;
    });
    return;
  }

  // --- Static text ---
  parent.appendChild(document.createTextNode(String(child)));
}

/** Convert an arbitrary value into an array of DOM nodes. */
function resolveNodes(value: unknown): Node[] {
  if (value == null || typeof value === 'boolean') return [];
  if (value instanceof Node) return [value];
  if (Array.isArray(value)) return value.flatMap(resolveNodes);
  return [document.createTextNode(String(value))];
}

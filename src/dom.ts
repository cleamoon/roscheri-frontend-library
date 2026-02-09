import { createEffect } from './reactive';

export type Child =
  | Node
  | string
  | number
  | boolean
  | null
  | undefined
  | (() => unknown)
  | Child[];

export type Props = Record<string, unknown>;

export type Component<P extends Props = Props> = (props: P) => Node;

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

export function h(
  type: string | Component,
  props?: Props | null,
  ...children: Child[]
): Node {
  if (typeof type === 'function') {
    const resolved = props ?? {};
    if (children.length > 0) {
      (resolved as Record<string, unknown>).children = children;
    }
    return (type as Component)(resolved);
  }

  const el = document.createElement(type);

  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (key === 'children') continue;
      applyProp(el, key, value);
    }
  }

  const flattenedChildren = flattenChildren(children);
  for (const child of flattenedChildren) {
    insertChild(el, child);
  }

  return el;
}

function applyProp(el: HTMLElement, key: string, value: unknown): void {
  if (/^on[A-Z]/.test(key)) {
    const event = key.slice(2).toLowerCase();
    el.addEventListener(event, value as EventListener);
    return;
  }

  if (key === 'ref') {
    if (typeof value === 'function') {
      (value as (el: HTMLElement) => void)(el);
    } else if (typeof value === 'object' && value !== null && 'current' in value) {
      (value as { current: unknown }).current = el;
    }
    return;
  }

  if (key === 'style') {
    applyStyle(el, value);
    return;
  }

  if (typeof value === 'function') {
    createEffect(() => setProperty(el, key, (value as () => unknown)()));
    return;
  }

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

function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
}

function insertChild(parent: HTMLElement, child: Child): void {
  if (child == null || typeof child === 'boolean') return;

  if (child instanceof Node) {
    parent.appendChild(child);
    return;
  }

  if (typeof child === 'function') {
    const marker = document.createTextNode('');
    parent.appendChild(marker);

    let currentNodes: Node[] = [];

    createEffect(() => {
      const value = (child as () => unknown)();
      const newNodes = resolveNodes(value);

      if (
        currentNodes.length === 1 &&
        newNodes.length === 1 &&
        currentNodes[0] instanceof Text &&
        newNodes[0] instanceof Text
      ) {
        currentNodes[0].nodeValue = newNodes[0].nodeValue;
        return;
      }

      for (const n of currentNodes) {
        if (n.parentNode === parent) parent.removeChild(n);
      }

      for (const n of newNodes) {
        parent.insertBefore(n, marker);
      }

      currentNodes = newNodes;
    });
    return;
  }

  parent.appendChild(document.createTextNode(String(child)));
}

function resolveNodes(value: unknown): Node[] {
  if (value == null || typeof value === 'boolean') return [];
  if (value instanceof Node) return [value];
  if (Array.isArray(value)) return value.flatMap(resolveNodes);
  return [document.createTextNode(String(value))];
}

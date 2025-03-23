import { VNode, Component } from './vdom';

export function renderToString(node: VNode): string {
    // If the node is a string, return it as is
    if (typeof node === 'string') {
        return node;
    }

    const { type, props, children } = node;

    // If the node is a component, render it recursively
    if (typeof type === 'function') {
        const subNode = (type as Component)(props);
        return renderToString(subNode);
    }

    // If the node is a DOM element, render it as a string
    let html = `<${type}`;
    for (const [key, value] of Object.entries(props)) {
        html += ` ${key}="${String(value)}"`;
    }
    html += '>';

    // Render the children recursively
    for (const child of children) {
        html += renderToString(child);
    }
    
    html += `</${type}>`;
    
    return html;
}

export function createDom(node: VNode, container: HTMLElement): Node {
    if (typeof node === 'string') {
        return document.createTextNode(node);
    }

    const { type, props, children } = node;

    if (typeof type === 'function') {
        const subNode = (type as Component)(props);
        createDom(subNode, container);
    }

    const element = document.createElement(type as keyof HTMLElementTagNameMap);

    for (const [key, value] of Object.entries(props)) {
        if (key.startsWith('on') && typeof value === 'function') {
            const eventType = key.slice(2).toLowerCase() as keyof HTMLElementEventMap;
            element.addEventListener(eventType, value as EventListener);
        } else if (key === 'style' && typeof value === 'object') {
            Object.assign(element.style, value);
        } else {
            element.setAttribute(key, String(value));
        }
    }

    for (const child of children) {
        element.appendChild(createDom(child, container));
    }

    return element;
}

export function renderDom(node: VNode, container: HTMLElement) {
    container.innerHTML = '';
    container.appendChild(createDom(node, container));
}
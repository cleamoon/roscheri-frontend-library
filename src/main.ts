import { renderDom } from './render'
import { h } from './vdom';

function App() {
    return (
        h('div', null,
            h('h1', null, 'Hello, World!'),
            h('button', { onClick: () => alert('Hello, World!') }, 'Click me')
        )
    )
}

const app = document.getElementById('app');

if (app) {
    renderDom(App(), app);
}
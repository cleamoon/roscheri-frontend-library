import { h } from './runtime/h'
import { renderToHtml } from './runtime/renderToHtml'

export function renderPage(route: { path: string, component: any}): string {
    const content = route.component()
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Document</title></head><body>${renderToHtml(content)}</body></html>`
}

export function renderToHtml(node: any): string {
    if (typeof node === "string") return node;
    if (typeof node === "number") return node.toString();
    if (node === null || node === undefined) return '';
    if (Array.isArray(node)) {
        return node.map(renderToHtml).join('');
    }
    if (typeof node === "object" && node.tag) {
        const { tag, props, children } = node;
        const attributes = Object.entries(props).map(([key, value]) => {
            if (key === 'style' && typeof value === 'string') {
                return `style="${value}"`;
            }
            return `${key}="${value}"`;
        }).join(' ');

        const childrenHtml = children.map(renderToHtml).join('');
        return `<${tag} ${attributes}>${childrenHtml}</${tag}>`;
    }
    return '';
}

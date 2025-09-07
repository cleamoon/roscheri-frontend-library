export function h(tag: any, props: any = {}, ...children: any[]) {
    if (typeof tag === "function") {
        return tag({ ...props, children });
    }
    const stringifiedProps = { ...props }
    if (stringifiedProps.style && typeof stringifiedProps.style === "object") {
        stringifiedProps.style = Object.entries(stringifiedProps.style).map(([key, value]) => {
            const formattedKey = key.replace(/[A-Z]/g, (t) => `-${t.toLowerCase()}`)
            return `${formattedKey}:${value}`
        }).join(';')
    }

    return {
        tag,
        props: stringifiedProps,
        children,
    }
}

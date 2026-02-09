export type Component = () => {
    tag: string,
    props?: { [key: string]: any },
    children?: Array<ReturnType<Component> | string>
}

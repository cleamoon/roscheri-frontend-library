export type VNode = 
| string
| {
    type: string | Component<unknown>;
    props: Record<string, unknown>;
    children: VNode[];
}

export type Component<P = Record<string, unknown>> = (props: P) => VNode;

export function h(
    type: string | Component<unknown>,
    props: Record<string, unknown> | null,
    ...children: (VNode | string)[]
): VNode {
    return {
        type,
        props: props || {},
        children: children.flat(),
    }
}

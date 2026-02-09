import type { Props } from './dom';

export type Component<P extends Props = Props> = (props: P) => Node;

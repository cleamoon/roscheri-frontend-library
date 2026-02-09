export type Accessor<T> = () => T;

export type Setter<T> = (value: T | ((prev: T) => T)) => void;

interface Computation {
  fn: (() => void) | null;
  sources: Set<Set<Computation>>;
  cleanups: (() => void)[];
  owner: Computation | null;
  owned: Computation[];
}

let listener: Computation | null = null;

let owner: Computation | null = null;

let batchDepth = 0;

const batchQueue = new Set<Computation>();

function cleanupNode(comp: Computation): void {
  for (const fn of comp.cleanups) fn();
  comp.cleanups = [];

  for (const child of comp.owned) {
    disposeNode(child);
  }
  comp.owned = [];
}

function disposeNode(comp: Computation): void {
  cleanupNode(comp);
  for (const subs of comp.sources) {
    subs.delete(comp);
  }
  comp.sources.clear();
  comp.fn = null;
}

function runComputation(comp: Computation): void {
  if (!comp.fn) return;

  cleanupNode(comp);

  for (const subs of comp.sources) {
    subs.delete(comp);
  }
  comp.sources.clear();

  const prevListener = listener;
  const prevOwner = owner;
  listener = comp;
  owner = comp;
  try {
    comp.fn();
  } finally {
    listener = prevListener;
    owner = prevOwner;
  }
}

function notify(subscribers: Set<Computation>): void {
  const subs = [...subscribers];

  if (batchDepth > 0) {
    for (const s of subs) batchQueue.add(s);
  } else {
    for (const s of subs) runComputation(s);
  }
}

export function createRoot<T>(fn: (dispose: () => void) => T): T {
  const root: Computation = {
    fn: null,
    sources: new Set(),
    cleanups: [],
    owner,
    owned: [],
  };

  if (owner) owner.owned.push(root);

  const prevOwner = owner;
  owner = root;
  try {
    return fn(() => disposeNode(root));
  } finally {
    owner = prevOwner;
  }
}

export function createSignal<T>(initialValue: T): [Accessor<T>, Setter<T>] {
  let value = initialValue;
  const subscribers = new Set<Computation>();

  const read: Accessor<T> = () => {
    if (listener) {
      subscribers.add(listener);
      listener.sources.add(subscribers);
    }
    return value;
  };

  const write: Setter<T> = (next) => {
    const nextVal =
      typeof next === 'function'
        ? (next as (prev: T) => T)(value)
        : next;

    if (!Object.is(value, nextVal)) {
      value = nextVal;
      notify(subscribers);
    }
  };

  return [read, write];
}

export function createEffect(fn: () => void): void {
  const comp: Computation = {
    fn,
    sources: new Set(),
    cleanups: [],
    owner,
    owned: [],
  };

  if (owner) owner.owned.push(comp);

  runComputation(comp);
}

export function createMemo<T>(fn: () => T): Accessor<T> {
  const [read, write] = createSignal<T>(undefined as unknown as T);
  createEffect(() => write(() => fn()));
  return read;
}

export function batch(fn: () => void): void {
  batchDepth++;
  try {
    fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0 && batchQueue.size > 0) {
      const queue = [...batchQueue];
      batchQueue.clear();
      for (const comp of queue) runComputation(comp);
    }
  }
}

export function onCleanup(fn: () => void): void {
  if (owner) {
    owner.cleanups.push(fn);
  }
}

export function untrack<T>(fn: () => T): T {
  const prev = listener;
  listener = null;
  try {
    return fn();
  } finally {
    listener = prev;
  }
}

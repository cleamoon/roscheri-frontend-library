export type Getter<T> = () => T

export type Setter<T> = (value: T | ((prev: T) => T)) => void

type Computation = {
  fn: (() => void) | null;
  sources: Set<Set<Computation>>;
  cleanups: (() => void)[];
  owner: Computation | null;
  owned: Computation[];
}

let listener: Computation | null = null

let owner: Computation | null = null

let batchDepth = 0

const batchQueue = new Set<Computation>()

function cleanupNode(comp: Computation): void {
  comp.cleanups.forEach(cleanup => cleanup())
  comp.owned.forEach(child => disposeNode(child))

  comp.owned = []
  comp.cleanups = []
}

function disposeNode(comp: Computation): void {
  cleanupNode(comp)

  comp.sources.forEach(source => source.delete(comp))
  comp.sources.clear()

  comp.fn = null
}

function runComputation(comp: Computation): void {
  if (!comp.fn) return

  cleanupNode(comp)

  comp.sources.forEach(source => source.delete(comp))
  comp.sources.clear()

  const prevListener = listener
  const prevOwner = owner
  listener = comp
  owner = comp
  try {
    comp.fn()
  } finally {
    listener = prevListener
    owner = prevOwner
  }
}

export function createReactiveRoot<T>(fn: () => T): T {
  const root: Computation = {
    fn: null,
    sources: new Set(),
    cleanups: [() => disposeNode(root)],
    owner,
    owned: [],
  }

  owner = root

  try {
    return fn()
  } finally {
    owner = null
  }
}

export function createSignal<T>(initialValue: T): [Getter<T>, Setter<T>] {
  let value = initialValue
  const subscribers = new Set<Computation>()

  const read: Getter<T> = () => {
    if (listener) {
      subscribers.add(listener)
      listener.sources.add(subscribers)
    }
    return value
  }

  const write: Setter<T> = (next) => {
    const nextVal =
      typeof next === 'function'
        ? (next as (prev: T) => T)(value)
        : next

    if (!Object.is(value, nextVal)) {
      value = nextVal

      if (batchDepth > 0) {
        subscribers.forEach(sub => batchQueue.add(sub))
      } else {
        subscribers.forEach(sub => runComputation(sub))
      }
    }
  }

  return [read, write]
}

export function createEffect(fn: () => void): void {
  const comp: Computation = {
    fn,
    sources: new Set(),
    cleanups: [],
    owner,
    owned: [],
  }

  if (owner) owner.owned.push(comp)

  runComputation(comp)
}

export function createMemo<T>(fn: () => T): Getter<T> {
  const [read, write] = createSignal<T>(undefined as unknown as T)
  createEffect(() => write(() => fn()))
  return read
}

export function batch(fn: () => void): void {
  batchDepth++
  try {
    fn()
  } finally {
    batchDepth--
    if (batchDepth === 0 && batchQueue.size > 0) {
      const queue = [...batchQueue]
      batchQueue.clear()
      for (const comp of queue) runComputation(comp)
    }
  }
}

export function onCleanup(fn: () => void): void {
  if (owner) {
    owner.cleanups.push(fn)
  }
}


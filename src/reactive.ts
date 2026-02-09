/**
 * Fine-grained reactive system.
 *
 * Inspired by Solid.js — signals, effects, and memos with automatic
 * dependency tracking. No virtual DOM, no diffing.
 *
 * @example
 * ```ts
 * const [count, setCount] = createSignal(0);
 *
 * createEffect(() => {
 *   console.log('count is', count()); // re-runs when count changes
 * });
 *
 * setCount(1);        // logs "count is 1"
 * setCount(c => c+1); // logs "count is 2"
 * ```
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Read a reactive value. Calling this inside an effect tracks the dependency. */
export type Accessor<T> = () => T;

/** Update a reactive value — accepts a new value or an updater function. */
export type Setter<T> = (value: T | ((prev: T) => T)) => void;

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

/**
 * A "computation" represents anything that tracks reactive dependencies:
 * effects, memos, and roots.
 */
interface Computation {
  /** The user function to re-execute (null for roots). */
  fn: (() => void) | null;
  /** Subscriber-sets this computation is registered in. */
  sources: Set<Set<Computation>>;
  /** Functions to run when this computation re-executes or is disposed. */
  cleanups: (() => void)[];
  /** The parent owner in the ownership tree. */
  owner: Computation | null;
  /** Child computations owned by this one (disposed together). */
  owned: Computation[];
}

// ---------------------------------------------------------------------------
// Global state
// ---------------------------------------------------------------------------

/** The computation currently being tracked (set during effect / memo execution). */
let listener: Computation | null = null;

/** The current owner — new computations become its children. */
let owner: Computation | null = null;

/** Batch depth counter for `batch()`. */
let batchDepth = 0;

/** Computations queued during a batch. */
const batchQueue = new Set<Computation>();

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Run cleanup functions and dispose owned children. */
function cleanupNode(comp: Computation): void {
  for (const fn of comp.cleanups) fn();
  comp.cleanups = [];

  for (const child of comp.owned) {
    disposeNode(child);
  }
  comp.owned = [];
}

/** Fully dispose a computation — cleanup + unsubscribe from all sources. */
function disposeNode(comp: Computation): void {
  cleanupNode(comp);
  for (const subs of comp.sources) {
    subs.delete(comp);
  }
  comp.sources.clear();
  comp.fn = null;
}

/** Execute a computation's function while tracking dependencies. */
function runComputation(comp: Computation): void {
  if (!comp.fn) return;

  // 1. Clean up the previous run.
  cleanupNode(comp);

  // 2. Unsubscribe from old sources.
  for (const subs of comp.sources) {
    subs.delete(comp);
  }
  comp.sources.clear();

  // 3. Run with tracking enabled.
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

/** Notify a set of subscribers that a value changed. */
function notify(subscribers: Set<Computation>): void {
  // Snapshot to avoid mutation during iteration.
  const subs = [...subscribers];

  if (batchDepth > 0) {
    for (const s of subs) batchQueue.add(s);
  } else {
    for (const s of subs) runComputation(s);
  }
}

// ---------------------------------------------------------------------------
// Public API — Ownership
// ---------------------------------------------------------------------------

/**
 * Create a reactive root that owns all computations created inside `fn`.
 * Returns whatever `fn` returns. The `dispose` callback tears down every
 * signal subscription and effect created within the root.
 *
 * @example
 * ```ts
 * const dispose = createRoot(dispose => {
 *   const [count, setCount] = createSignal(0);
 *   createEffect(() => console.log(count()));
 *   return dispose;
 * });
 *
 * dispose(); // cleans up everything
 * ```
 */
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

// ---------------------------------------------------------------------------
// Public API — Signals
// ---------------------------------------------------------------------------

/**
 * Create a reactive signal (atom).
 *
 * @param initialValue - The starting value.
 * @returns A `[read, write]` tuple.
 *
 * @example
 * ```ts
 * const [name, setName] = createSignal('Alice');
 * console.log(name()); // 'Alice'
 * setName('Bob');
 * ```
 */
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

// ---------------------------------------------------------------------------
// Public API — Effects
// ---------------------------------------------------------------------------

/**
 * Create a reactive side-effect that re-runs whenever its tracked signals
 * change. Runs immediately on creation.
 *
 * @param fn - The effect function. Any signals read inside are auto-tracked.
 *
 * @example
 * ```ts
 * const [count, setCount] = createSignal(0);
 * createEffect(() => console.log('count =', count()));
 * // logs "count = 0"
 *
 * setCount(1);
 * // logs "count = 1"
 * ```
 */
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

// ---------------------------------------------------------------------------
// Public API — Memos
// ---------------------------------------------------------------------------

/**
 * Create a derived reactive value that caches its result and only recomputes
 * when its dependencies change.
 *
 * @param fn - A pure function that derives a value from signals.
 * @returns An accessor (getter function) for the derived value.
 *
 * @example
 * ```ts
 * const [count, setCount] = createSignal(2);
 * const doubled = createMemo(() => count() * 2);
 *
 * console.log(doubled()); // 4
 * setCount(5);
 * console.log(doubled()); // 10
 * ```
 */
export function createMemo<T>(fn: () => T): Accessor<T> {
  const [read, write] = createSignal<T>(undefined as unknown as T);
  createEffect(() => write(() => fn()));
  return read;
}

// ---------------------------------------------------------------------------
// Public API — Batching
// ---------------------------------------------------------------------------

/**
 * Batch multiple signal writes so that effects only run once at the end.
 *
 * @example
 * ```ts
 * batch(() => {
 *   setFirstName('Jane');
 *   setLastName('Doe');
 * });
 * // Effects that depend on firstName or lastName run once, not twice.
 * ```
 */
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

// ---------------------------------------------------------------------------
// Public API — Cleanup & Untrack
// ---------------------------------------------------------------------------

/**
 * Register a cleanup function that runs when the current effect re-executes
 * or is disposed.
 *
 * @example
 * ```ts
 * createEffect(() => {
 *   const id = setInterval(() => tick(), 1000);
 *   onCleanup(() => clearInterval(id));
 * });
 * ```
 */
export function onCleanup(fn: () => void): void {
  if (owner) {
    owner.cleanups.push(fn);
  }
}

/**
 * Run a function **without** tracking any signal reads.
 *
 * @example
 * ```ts
 * createEffect(() => {
 *   // `count()` is tracked, `name()` is not.
 *   console.log(count(), untrack(() => name()));
 * });
 * ```
 */
export function untrack<T>(fn: () => T): T {
  const prev = listener;
  listener = null;
  try {
    return fn();
  } finally {
    listener = prev;
  }
}

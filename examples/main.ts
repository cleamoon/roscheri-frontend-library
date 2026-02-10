import { h, createSignal, createEffect, createRoot } from '../src/index'
import type { Component } from '../src/dom'

const Counter: Component = () => {
  const [count, setCount] = createSignal(0);

  createEffect(() => {
    document.title = `Count: ${count()}`;
  });

  return (
    h('div',
      { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' } },
      h('h1',
        {
          style: {
            fontSize: '2rem',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          },
        },
        'Roscheri Frontend Library'),

      h('p',
        { style: { color: '#94a3b8', fontSize: '0.875rem' } },
        'Fine-grained reactivity in pure TypeScript — no JSX, no virtual DOM'),

      h('div',
        {
          style: {
            marginTop: '16px',
            padding: '32px 48px',
            borderRadius: '16px',
            background: '#1e293b',
            boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
          },
        },

        h('span',
          {
            style: { fontSize: '4rem', fontWeight: '800', fontVariantNumeric: 'tabular-nums' },
          },
          () => `${count()}`),

        h('div',
          { style: { display: 'flex', gap: '12px' } },
          h('button',
            {
              onClick: () => setCount((c) => c - 1),
              style: buttonStyle,
            },
            '\u2212 Decrement'),
          h('button',
            {
              onClick: () => setCount(0),
              style: { ...buttonStyle, background: '#334155' },
            },
            'Reset'),
          h('button',
            {
              onClick: () => setCount((c) => c + 1),
              style: buttonStyle,
            },
            '+ Increment'),
        ),
      ),
    )
  )
};

const buttonStyle: Record<string, string> = {
  padding: '10px 20px',
  border: 'none',
  borderRadius: '8px',
  background: '#6366f1',
  color: '#fff',
  fontSize: '0.875rem',
  fontWeight: '600',
  cursor: 'pointer',
};

createRoot(document.getElementById('app')!).render(Counter)

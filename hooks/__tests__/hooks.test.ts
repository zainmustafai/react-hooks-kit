// hooks/__tests__/hooks.test.ts — B10 (transcribed verbatim from the master plan)
import { renderHook, act, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useToggle } from '../useToggle';
import { useDebouncedValue } from '../useDebouncedValue';
import { useFetchJson } from '../useFetchJson';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('useToggle', () => {
  it('flips the value', () => {
    const { result } = renderHook(() => useToggle());
    expect(result.current[0]).toBe(false);
    act(() => result.current[1]());
    expect(result.current[0]).toBe(true);
  });
});

describe('useDebouncedValue', () => {
  it('only updates after the delay', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ v }) => useDebouncedValue(v, 300),
      { initialProps: { v: 'a' } },
    );
    rerender({ v: 'ab' });
    expect(result.current).toBe('a');
    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current).toBe('ab');
  });
});

describe('useFetchJson', () => {
  it('goes loading → success', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify([1, 2, 3]), { status: 200 }),
    ));
    const { result } = renderHook(() =>
      useFetchJson('/api/nums', (j) => j as number[]),
    );
    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('success'));
  });
});

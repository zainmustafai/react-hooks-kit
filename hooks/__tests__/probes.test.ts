// hooks/__tests__/probes.test.ts
// NOT from the master plan. Rumi's additional stress probes for the plan's
// named risk areas: B4 race conditions + Effect Event freshness, B8 store
// sync, B5/B6 listener behavior, B7 in jsdom, B9 composition end to end.
import { renderHook, act, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDisclosure } from '../useDisclosure';
import { useFetchJson } from '../useFetchJson';
import { useWindowEvent } from '../useWindowEvent';
import { useOnClickOutside } from '../useOnClickOutside';
import { useMediaQuery } from '../useMediaQuery';
import { useLocalStorage } from '../useLocalStorage';
import { useProductSearch } from '../../features/products/useProductSearch';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status });
}

describe('B2 useDisclosure sanity', () => {
  it('open / close / toggle', () => {
    const { result } = renderHook(() => useDisclosure());
    expect(result.current.isOpen).toBe(false);
    act(() => result.current.open());
    expect(result.current.isOpen).toBe(true);
    act(() => result.current.close());
    expect(result.current.isOpen).toBe(false);
    act(() => result.current.toggle());
    expect(result.current.isOpen).toBe(true);
  });
});

describe('B4 useFetchJson races', () => {
  it('idle + no fetch when url is null', () => {
    const fetchStub = vi.fn();
    vi.stubGlobal('fetch', fetchStub);
    const { result } = renderHook(() => useFetchJson(null, (j) => j));
    expect(result.current.status).toBe('idle');
    expect(fetchStub).not.toHaveBeenCalled();
  });

  it('HTTP error lands in the error state', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ nope: true }, 500)),
    );
    const { result } = renderHook(() =>
      useFetchJson('/api/broken', (j) => j),
    );
    await waitFor(() => expect(result.current.status).toBe('error'));
    if (result.current.status === 'error') {
      expect(result.current.error.message).toContain('HTTP 500');
    }
  });

  it('slow A, fast B: B wins when fetch honors the AbortSignal', async () => {
    const pending = new Map<string, ReturnType<typeof deferred<Response>>>();
    const fetchStub = vi.fn(
      (url: string, init?: { signal?: AbortSignal }) => {
        const d = deferred<Response>();
        init?.signal?.addEventListener('abort', () =>
          d.reject(new DOMException('Aborted', 'AbortError')),
        );
        pending.set(url, d);
        return d.promise;
      },
    );
    vi.stubGlobal('fetch', fetchStub);

    const { result, rerender } = renderHook(
      ({ url }) => useFetchJson(url, (j) => j as string),
      { initialProps: { url: '/api/a' } },
    );
    rerender({ url: '/api/b' });
    await act(async () => {
      pending.get('/api/b')!.resolve(jsonResponse('B-data'));
    });
    expect(result.current.status).toBe('success');
    if (result.current.status === 'success') {
      expect(result.current.data).toBe('B-data');
    }
  });

  it('razor edge: A resolves AFTER abort and after B settled - stale A must not clobber B', async () => {
    // This stub deliberately IGNORES the AbortSignal and resolves late,
    // simulating the microtask race where a response lands just as the
    // effect cleanup aborts the controller.
    const pending = new Map<string, ReturnType<typeof deferred<Response>>>();
    const fetchStub = vi.fn((url: string) => {
      const d = deferred<Response>();
      pending.set(url, d);
      return d.promise;
    });
    vi.stubGlobal('fetch', fetchStub);

    const { result, rerender } = renderHook(
      ({ url }) => useFetchJson(url, (j) => j as string),
      { initialProps: { url: '/api/a' } },
    );
    rerender({ url: '/api/b' });
    await act(async () => {
      pending.get('/api/b')!.resolve(jsonResponse('B-data'));
    });
    expect(result.current.status).toBe('success');
    await act(async () => {
      pending.get('/api/a')!.resolve(jsonResponse('A-data'));
    });
    // Derived state compares settled.url to the current url, so a stale
    // success can only show up as a stuck 'loading' - never as B's data.
    // The correct behavior is to ignore the aborted response entirely.
    expect(result.current.status).toBe('success');
    if (result.current.status === 'success') {
      expect(result.current.data).toBe('B-data');
    }
  });

  it('uses the LATEST parse function without refetching', async () => {
    const fetchStub = vi.fn(async () => jsonResponse([1, 2]));
    vi.stubGlobal('fetch', fetchStub);
    const parseV1 = (j: unknown) => (j as number[]).length;
    const parseV2 = (j: unknown) => (j as number[]).length * 10;
    const { result, rerender } = renderHook(
      ({ parse }) => useFetchJson('/api/nums', parse),
      { initialProps: { parse: parseV1 } },
    );
    rerender({ parse: parseV2 });
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(fetchStub).toHaveBeenCalledTimes(1);
    if (result.current.status === 'success') {
      expect(result.current.data).toBe(20); // parseV2 won, not parseV1's 2
    }
  });
});

describe('B5 useWindowEvent', () => {
  it('calls the latest handler and removes the listener on unmount', () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { rerender, unmount } = renderHook(
      ({ h }) => useWindowEvent('keydown', h),
      { initialProps: { h: h1 } },
    );
    window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'a' }));
    expect(h1).toHaveBeenCalledTimes(1);
    rerender({ h: h2 });
    window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'b' }));
    expect(h1).toHaveBeenCalledTimes(1); // stale handler NOT called again
    expect(h2).toHaveBeenCalledTimes(1);
    unmount();
    expect(removeSpy).toHaveBeenCalledWith(
      'keydown',
      expect.any(Function),
      expect.objectContaining({ capture: false }),
    );
    window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'c' }));
    expect(h2).toHaveBeenCalledTimes(1);
  });
});

describe('B6 useOnClickOutside', () => {
  it('fires only for pointerdown outside the element', () => {
    const el = document.createElement('div');
    const child = document.createElement('span');
    const outside = document.createElement('button');
    el.appendChild(child);
    document.body.append(el, outside);
    const ref = { current: el };
    const handler = vi.fn();
    renderHook(() => useOnClickOutside(ref, handler));
    child.dispatchEvent(
      new window.MouseEvent('pointerdown', { bubbles: true }),
    );
    expect(handler).not.toHaveBeenCalled();
    outside.dispatchEvent(
      new window.MouseEvent('pointerdown', { bubbles: true }),
    );
    expect(handler).toHaveBeenCalledTimes(1);
    el.remove();
    outside.remove();
  });
});

describe('B7 useMediaQuery (jsdom needs a matchMedia stub)', () => {
  it('tracks change events', () => {
    let matches = false;
    const listeners = new Set<() => void>();
    const mql = {
      get matches() {
        return matches;
      },
      media: '(max-width: 640px)',
      addEventListener: (_t: string, fn: () => void) => listeners.add(fn),
      removeEventListener: (_t: string, fn: () => void) =>
        listeners.delete(fn),
      addListener: (fn: () => void) => listeners.add(fn),
      removeListener: (fn: () => void) => listeners.delete(fn),
      onchange: null,
      dispatchEvent: () => false,
    };
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => mql),
    );
    const { result } = renderHook(() => useMediaQuery('(max-width: 640px)'));
    expect(result.current).toBe(false);
    act(() => {
      matches = true;
      listeners.forEach((fn) => fn());
    });
    expect(result.current).toBe(true);
  });
});

describe('B8 useLocalStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('reads a stored value, falls back when absent or corrupt', () => {
    window.localStorage.setItem('theme', JSON.stringify('dark'));
    const a = renderHook(() => useLocalStorage('theme', 'light'));
    expect(a.result.current[0]).toBe('dark');
    const b = renderHook(() => useLocalStorage('missing', 'light'));
    expect(b.result.current[0]).toBe('light');
    window.localStorage.setItem('corrupt', '{not json');
    const c = renderHook(() => useLocalStorage('corrupt', 'light'));
    expect(c.result.current[0]).toBe('light');
  });

  it('setValue (value + updater forms) syncs two instances in the same tab; remove resets both', () => {
    const one = renderHook(() => useLocalStorage('k', 'a'));
    const two = renderHook(() => useLocalStorage('k', 'a'));
    act(() => one.result.current[1]('b'));
    expect(one.result.current[0]).toBe('b');
    expect(two.result.current[0]).toBe('b');
    act(() => two.result.current[1]((prev) => prev + '!'));
    expect(one.result.current[0]).toBe('b!');
    expect(window.localStorage.getItem('k')).toBe(JSON.stringify('b!'));
    act(() => one.result.current[2]());
    expect(one.result.current[0]).toBe('a');
    expect(two.result.current[0]).toBe('a');
  });
});

describe('B9 useProductSearch end to end', () => {
  it('short query stays idle; 2+ chars debounce then fetch and parse', async () => {
    vi.useFakeTimers();
    const fetchStub = vi.fn(async (url: string) =>
      jsonResponse([
        { id: 1, name: 'Keyboard', price: 50 },
        { id: 'x', name: 'Bad row', price: 1 },
        { id: 2, name: 'Mouse', price: 25 },
      ]),
    );
    vi.stubGlobal('fetch', fetchStub);
    const { result, rerender } = renderHook(
      ({ q }) => useProductSearch(q),
      { initialProps: { q: 'k' } },
    );
    expect(result.current.status).toBe('idle');
    expect(fetchStub).not.toHaveBeenCalled();
    rerender({ q: 'ke' });
    // NOTE: waitFor() cannot be used here - its polling runs on timers,
    // which are faked in this test, so it would hang until the test
    // timeout. Advance the fake clock inside act and flush microtasks.
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    await act(async () => {});
    expect(result.current.status).toBe('success');
    expect(fetchStub).toHaveBeenCalledWith(
      '/api/products?q=ke',
      expect.anything(),
    );
    if (result.current.status === 'success') {
      expect(result.current.data.map((p) => p.name)).toEqual([
        'Keyboard',
        'Mouse',
      ]);
    }
    void 0;
  });
});

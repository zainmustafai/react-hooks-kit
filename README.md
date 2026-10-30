# react-hooks-kit

Nine production-ready custom hooks for React + TypeScript, plus the lint and
test wiring that keeps them honest. This is the companion code for the
ZainVibes post **"Custom Hooks in React + TypeScript: Patterns Senior Devs
Use, React 19"** and Episode 1 of the *React Patterns Lab* video series.

- Blog post: https://zainvibes.com/blog/react-typescript-custom-hooks
- Video: React Patterns Lab Ep. 1 (link added here at publish)
- Cheat sheet: https://zainvibes.com/hooks-cheat-sheet.pdf

Baseline: React 19.2+ (uses `useEffectEvent` and `useSyncExternalStore`),
TypeScript 5.x strict, framework-agnostic (Vite, Next.js, Remix, Expo web).
In Next.js App Router, put `'use client'` at the top of files that use
these hooks.

## The 10 blocks

| Block | File | What it is |
|---|---|---|
| B0 | `eslint.config.js` | eslint-plugin-react-hooks (compiler-powered rules) **with** the `files` + parser wiring a TS project actually needs |
| B1 | `hooks/useToggle.ts` | Boolean state, tuple API with `as const` |
| B2 | `hooks/useDisclosure.ts` | Open/close state, object API (menus, modals, drawers) |
| B3 | `hooks/useDebouncedValue.ts` | Generic debounced value; the cleanup line is the debounce |
| B4 | `hooks/useFetchJson.ts` | Fetch state as a discriminated union, derived loading, `AbortController`, `useEffectEvent` parser |
| B5 | `hooks/useWindowEvent.ts` | Typed window listeners (`WindowEventMap` generics), attach once |
| B6 | `hooks/useOnClickOutside.ts` | Outside-pointerdown close, refs read only inside the listener |
| B7 | `hooks/useMediaQuery.ts` | `useSyncExternalStore` over `matchMedia`, SSR fallback included |
| B8 | `hooks/useLocalStorage.ts` | Cross-tab synced localStorage via `useSyncExternalStore` (string snapshot) |
| B9 | `features/products/useProductSearch.ts` | Composition: B3 + B4 as a domain hook; `features/products/api.ts` is the pure parser layer |
| B10 | `hooks/__tests__/hooks.test.ts` | `renderHook` + Vitest tests for B1, B3, B4 |

`hooks/__tests__/probes.test.ts` holds 12 additional stress probes (races,
storage sync, listener cleanup, composition end to end). 15 tests total.

## Run it

```bash
npm install
npm run typecheck   # tsc --noEmit (strict, plus exactOptionalPropertyTypes and friends)
npm test            # vitest run - 15/15
npm run lint        # eslint hooks features - zero errors, zero warnings
```

Verified 2026-10-30 on react 19.3.1, typescript 5.9.3,
eslint-plugin-react-hooks 7.1.1, vitest 5.0.5. See `VERIFICATION.md` for
the full method and fix log.

## Found by testing: the race that survives

B4's design claim is that `AbortController` kills the stale-response race.
The normal race does die: a fetch that respects the abort signal can never
write after cleanup. But verification included a probe whose fetch resolves
the *old* request after the new one has settled, landing while `res.json()`
is still parsing during a URL change. The original success handler had no
aborted check (only `.catch` did), so the stale success overwrote the fresh
state and the derived loading check stuck on `loading` forever.

The fix is one line, now at the top of B4's success handler:

```ts
if (controller.signal.aborted) return;
```

Rule of thumb: guard **every** continuation that can write state, not just
the error path. The same probes also caught B4 returning its internal
record (an extra `url` field the public type does not declare); it now
returns exactly the `FetchState<T>` shape. Both stories are told in full in
the blog post's "The race that survives" section.

Two setup traps the kit already wires for you:

- **ESLint (B0):** the plugin's recommended flat config alone lints zero
  TypeScript files (no `files` field, and the default parser cannot parse
  TS). The config here adds the `files` block and `@typescript-eslint/parser`.
- **Vitest alias (B10):** B9 imports via `@/hooks/...`; tsconfig `paths`
  does not reach Vitest/Vite, so `vitest.config.ts` carries the matching
  `resolve.alias`.

And one test-writing trap: never combine `waitFor` with
`vi.useFakeTimers()` - `waitFor` polls on timers and will time out.

## Chapter branches

`BRANCHES.md` describes the per-chapter branch layout (00-before through
09-testing) used to film the video with instant resets.

## License

MIT - see `LICENSE`. Copyright (c) 2026 Muhammad Zain Ul Abidin.

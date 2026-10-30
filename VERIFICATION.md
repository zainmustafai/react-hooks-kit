# VERIFICATION - react-hooks-kit (master plan Section 3, blocks B0-B10)

Verified by Rumi, 2026-10-30. Method: every code block was transcribed
**verbatim first** and run as written; only after a failure was recorded
was a fix applied. Fix log below separates doc bugs from probe/test
mistakes (two of my own probe drafts failed first - also logged, F6/P1).

## Environment

- Node v24.22.1 · npm 10.9.4 · Linux VM
- Installed (exact): react 19.3.1, react-dom 19.3.1 (npm `latest` for
  React is 19.3.1 - matches the plan's Section 1 claim), typescript
  5.9.3 (latest 5.x), @types/react 19.3.0, @types/react-dom 19.3.0,
  eslint 10.13.0, eslint-plugin-react-hooks 7.1.1, vitest 5.0.5,
  @testing-library/react 16.3.3, jsdom 30.1.3
- Added during verification (not in the plan - see F2/F3):
  @typescript-eslint/parser 8.72.1, @types/node 24.19.2
- tsconfig: `strict: true` plus exactOptionalPropertyTypes,
  noUncheckedIndexedAccess, noImplicitOverride,
  noFallthroughCasesInSwitch, verbatimModuleSyntax (stricter than the
  Vite default; flagged where a failure only appears under the extras)

## Command results

### Verbatim doc code (baseline, before any fix)

| Check | Result |
|---|---|
| `npx tsc --noEmit` | **1 error** - hooks/useWindowEvent.ts(13,12) TS2769 (F1; only under exactOptionalPropertyTypes) |
| `npx vitest run` (plan's own B10 tests) | **3/3 pass** |
| `npx eslint hooks features` (plan's B0 config verbatim) | **Lints nothing.** Directory run errors "all of the files matching the glob pattern are ignored"; a direct file run reports "File ignored because no matching configuration was supplied" (F2) |
| `npx eslint` after F2 wiring, code still verbatim | **0 errors, 0 warnings** on all hooks, features and tests |
| Extra stress probes vs verbatim code (12 probes, probes.test.ts) | **11 pass, 1 fail** - the B4 razor-edge race (F4); runtime inspection also exposed the F5 shape leak |

### After fixes

| Check | Result |
|---|---|
| `npx tsc --noEmit` | **GREEN**, zero errors |
| `npx vitest run` | **GREEN - 15/15** (3 plan tests + 12 probes) |
| `npx eslint hooks features` | **GREEN**, exit 0, zero errors, zero warnings |
| React dev warnings during tests | None observed (the B4 Effect Event called from the fetch promise chain logs no warning on react 19.3.1) |

## Fix log

### F1 - B5 useWindowEvent: options object fails strict-plus type-check (LOW)
- File: hooks/useWindowEvent.ts, line 13 (verbatim)
- What was wrong: the effect passes `{ capture, passive }` where
  `passive: boolean | undefined`. Under `exactOptionalPropertyTypes`
  (opt-in, beyond plain `strict`) that is not assignable to
  `AddEventListenerOptions` - TS2769, no overload matches. Under plain
  `strict` the verbatim code type-checks, so this is a latent wart,
  not a hard bug.
- Fix: build the options object and only set `passive` when the caller
  provided it. API and runtime behavior unchanged; now passes both
  plain strict and strict-plus configs.

### F2 - B0 ESLint config: lints no TypeScript at all (MEDIUM, setup gap)
- File: eslint.config.js (verbatim B0)
- What was wrong: `reactHooks.configs.flat.recommended` has no `files`
  field, and in flat-config ESLint a `.ts` file is only linted if some
  block's `files` covers it - so every hook file is silently ignored.
  The plan's claim "install this and the linter will yell at you" is
  untestable as written. Second gap: ESLint's default parser cannot
  parse TS syntax (generics, annotations) even once files match.
- Fix (config only, plan's block kept verbatim): added a preceding
  block `{ files: ['**/*.{ts,tsx}'], languageOptions: { parser:
  tsParser } }` and installed @typescript-eslint/parser.
- Claim test, once wired: the plan's assertion that the examples pass
  the compiler-powered react-hooks rules is **TRUE** - 0 errors, 0
  warnings, including `set-state-in-effect`, `refs`, `purity`,
  `exhaustive-deps` (the v7 plugin correctly treats B4's `parse`,
  consumed via useEffectEvent, as a non-dependency).

### F3 - B9 + B10: `@/…` alias unresolvable by Vitest (MEDIUM, setup gap)
- Files: features/products/useProductSearch.ts (B9 imports),
  vitest.config.ts (B10)
- What was wrong: B9 imports `@/hooks/useDebouncedValue`. tsconfig
  `paths` satisfies tsc, but Vitest/Vite ignores tsconfig paths -
  first probe run died with "Failed to resolve import
  "@/hooks/useDebouncedValue"". Any reader who tests the composed
  hook (or runs the app in Vite, which needs the same alias) hits
  this. The plan never wires the alias anywhere.
- Fix: added `resolve.alias` mapping `@` to the project root in
  vitest.config.ts (plus @types/node for the config's `node:url`
  import). B9 itself untouched.

### F4 - B4 useFetchJson: stale response clobbers fresh state, hook sticks on 'loading' (HIGH - real bug)
- File: hooks/useFetchJson.ts, success `.then` handler (verbatim)
- What was wrong: the `.catch` guards `controller.signal.aborted`,
  but the success handler does not. If a superseded request's promise
  resolves after the cleanup aborted it - the response landed while
  `res.json()` was still parsing during a URL change - its
  `setSettled({ url: OLD, … })` overwrites the newer settled entry.
  The derived state then sees `settled.url !== url` and returns
  'loading' - and nothing will ever fetch again for the current URL,
  so the UI spins forever. This is precisely the race class the plan
  says the design "kills".
- Proof: probe "razor edge" (signal-ignoring fetch stub resolving A
  after B settled) failed against verbatim code with
  `expected 'loading' to be 'success'`; passes after the fix. The
  normal race (fetch honoring AbortSignal) passes verbatim -
  the bug needs the narrow but real abort-too-late window.
- Fix: one guard line at the top of the success handler,
  `if (controller.signal.aborted) return;`, mirroring the catch.

### F5 - B4 useFetchJson: return value leaks the internal `url` field (LOW)
- File: hooks/useFetchJson.ts, final `return settled;` (verbatim)
- What was wrong: the declared return type is `FetchState<T>` (no
  `url`), but the runtime object is the internal `Settled<T>` record,
  so callers actually receive `{ status, data, url }`. TypeScript
  allows it (structural typing, non-literal), so only runtime
  inspection shows it. Noticed when a probe's deep-equal failed on
  the extra key.
- Fix: return exactly the public shape
  (`{ status: 'success', data }` / `{ status: 'error', error }`).

### F6 - Test-method trap (not a doc bug; logged for the tutorial)
- `waitFor()` from @testing-library polls on timers; under
  `vi.useFakeTimers()` it can never advance and the test times out
  (my first B9 probe draft died at the 5000 ms timeout). The plan's
  own B10 avoids the trap by using fake timers only for the debounce
  test and real timers for the fetch test - worth one explicit line
  in the post, because readers combining the two patterns will hit it.

## Suspects checked hard - cleared

- **B4 useEffectEvent(parse)**: correct. Probe proves the latest
  parser is used after a re-render AND fetch is not re-run (1 call).
  Effect deps `[url]` pass exhaustive-deps because the plugin
  understands Effect Events.
- **B4 derived state**: correct for idle/loading/error/success,
  including HTTP 500 landing in the error state with its message.
- **B8 getSnapshot stability**: correct as the plan's comment claims.
  `localStorage.getItem` returns a string (compared by value), so no
  cached-snapshot warning and no render loop. Probes: stored value
  wins, corrupt JSON falls back without throwing, value + updater
  setValue forms work, two hook instances on one key stay in sync in
  the same tab, remove() resets both.
- **B5/B6 listener identity**: latest handler always wins after
  re-render (Effect Event), stale handler never fires, listener
  removed on unmount with matching options; B6 fires only outside.
- **B7**: logic correct; note jsdom ships no `matchMedia`, so the
  plan's test setup cannot exercise this hook without a stub
  (environment fact, not a code bug).

## Verdict per hook

| Block | Verdict |
|---|---|
| B0 eslint setup | **Incomplete as written** - lints nothing on a TS project until F2 wiring is added |
| B1 useToggle | Ships as written |
| B2 useDisclosure | Ships as written (probe-verified; plan ships no test for it) |
| B3 useDebouncedValue | Ships as written |
| B4 useFetchJson | **Ships only with F4 + F5 fixes** - one real race bug, one shape leak |
| B5 useWindowEvent | Ships as written under plain strict; F1 fix needed for exactOptionalPropertyTypes configs |
| B6 useOnClickOutside | Ships as written |
| B7 useMediaQuery | Ships as written (needs a matchMedia stub to test in jsdom) |
| B8 useLocalStorage | Ships as written - the strongest block in the set |
| B9 useProductSearch | Ships as written; its `@/` imports need F3 alias wiring to run/test |
| B10 tests | Ship as written - 3/3 pass verbatim; see F6 trap note |

Usage snippets printed in the plan (UserList exhaustive switch,
SearchPage, theme toggle) were not built - verification scope was the
hook blocks B0-B10 themselves. features/products/api.ts
(parseProducts) is a verification stub: the plan references it but
never prints it.

# Chapter branches

The video (React Patterns Lab Ep. 1) is filmed chapter by chapter. Each
chapter lives on its own branch so a ruined take resets instantly:
check out the branch, the code is exactly where the chapter starts.
`main` always holds the finished kit.

Branches are described here, not pre-created in this prep copy. Create them
in order when the repo is pushed; each branch starts from the previous
chapter's end state.

| Branch | Chapter (video timestamp) | State of the code |
|---|---|---|
| `00-before` | 00:00 The 200-line component problem | The bloated `ProductPage`: fetching, debounce timer, listeners and localStorage sync all inline. No custom hooks, no lint wiring. This branch exists to be suffered through, briefly. |
| `01-linter` | 03:30 Rules of Hooks + linter setup | B0 installed and wired (`files` block + TS parser, see VERIFICATION F2). The `if (open) useToggle()` squiggle demo lives here. Still no hooks extracted. |
| `02-toggle` | 05:00 useToggle + API design | B1 and B2 added under `hooks/`; the component's boolean state moves into them. The `as const` before/after type demo is filmed on this branch. |
| `03-debounce` | 07:00 useDebouncedValue | B3 added; the search input stops firing a request per keystroke. |
| `04-fetch` | 09:30 useFetchJson | B4 added with the discriminated-union state and derived loading. **Ships with the F4 guard in the success handler** (the branch's test suite includes the razor-edge race probe; filming the guard being added is the chapter's payoff). |
| `05-events` | 13:00 useWindowEvent + useEffectEvent | B5 and B6 added; listeners attach once, latest handler always wins. |
| `06-external-store` | 15:00 useSyncExternalStore | B7 and B8 added; the two-tab localStorage demo is filmed from this branch. |
| `07-composition` | 18:00 Composition | B9 + `features/products/api.ts` added; the component shrinks to the readable version. Vitest alias (F3) wired here so the composed hook is testable. |
| `08-architecture` | 18:00 (second half) Architecture | Folder layout in its final three-layer shape: `hooks/` (generic), `features/` (domain), `lib/` (pure). No behavior change from `07-composition`; this branch is the folder-structure screenshot. |
| `09-testing` | 19:30 Testing hooks with renderHook | B10 suite plus the 12 stress probes; identical code to `main`. The anti-patterns speed round (21:00) and recap (22:30) are also filmed from this branch. |

Rule for filming: never commit mid-chapter fixes to a chapter branch.
If a take goes wrong, `git checkout -- .` and go again; the branch is the
reset button.

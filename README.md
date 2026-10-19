# Moon for Mena — love-moon

The moon above us both — Karach&iacute; and Bucharest, one sky. It shows the live
phase, how much of it is lit, how old it is, and counts down to the next **full**
and **new** moon. Pick any date to see the moon of that night.

Live: https://menaammarpro.github.io/love-moon/

## The astronomy

Pure functions on `window.MenaMoon`:

- `moonPhase(date)` — `{ phase, age, fraction, illumination, illuminationPct, isWaxing, index }`
- `phaseFraction(date)`, `moonAge(date)`, `illumination(date)`, `phaseName(date)`, `phaseIndex(f)`
- `nextPhases(date)` / `nextPhase(key, date)` — the next new / first-quarter / full / last-quarter
- `countdown(ms)` — `{ d, h, m, s }`

It counts a **synodic month** of `29.530588853` days from the new moon of
`2000-01-06 18:14 UTC`, and illumination as `(1 − cos 2πf) / 2`.

```js
MenaMoon.moonPhase(new Date()).phase;          // "Waxing Gibbous"
MenaMoon.moonPhase(new Date()).illuminationPct; // 82.4
MenaMoon.nextPhase("full", new Date()).date;    // next full moon
```

## Storage key

- `mena-moon` — `{ date }` (the last night you looked at; `null` = tonight)

## Notes

No external requests, no tracking. The moon is drawn on a canvas; the starfield
comes from the shared love theme. Everything works offline once loaded (PWA).

Made with love, just for you ♥

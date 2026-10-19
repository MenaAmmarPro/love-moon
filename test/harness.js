"use strict";

/*
 * love-moon — Node harness (no dependencies, fake DOM).
 *
 *   node test/harness.js
 *
 * Loads js/app.js in a bare sandbox and checks the pure astronomy plus the
 * storage helpers. All assertions must pass.
 */

const fs = require("fs");
const vm = require("vm");
const path = require("path");

const store = {};
const el = () => ({
  style: {},
  classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
  dataset: {},
  appendChild() {},
  addEventListener() {},
  setAttribute() {},
  removeAttribute() {},
  querySelector: () => null,
  querySelectorAll: () => [],
  focus() {},
  remove() {},
  getContext: () => null,
  getBoundingClientRect: () => ({ width: 260, height: 260, left: 0, top: 0 }),
  innerHTML: "",
  textContent: "",
  value: "",
});

const sandbox = {
  console, setTimeout, clearTimeout, setInterval, clearInterval,
  Date, Math, JSON, Intl, Number, String, Array, Object, parseInt, parseFloat, isNaN,
  localStorage: {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  },
  document: {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener() {},
    createElement: () => el(),
    body: { appendChild() {}, classList: { add() {}, remove() {} } },
    documentElement: { classList: { add() {}, remove() {} } },
  },
  navigator: { language: "en", clipboard: { writeText: async () => {} } },
  requestAnimationFrame: (fn) => setTimeout(fn, 0),
};

sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const root = path.join(__dirname, "..");
vm.runInContext(fs.readFileSync(path.join(root, "js", "app.js"), "utf8"), sandbox, { filename: "js/app.js" });

const M = sandbox.window.MenaMoon;
const DAY = 86400000;
const SYNODIC = 29.530588853;
const EPOCH = Date.UTC(2000, 0, 6, 18, 14, 0);

let failures = 0;
function assert(cond, message) {
  if (!cond) {
    console.error("FAIL: " + message);
    failures += 1;
  } else {
    console.log("ok - " + message);
  }
}
function near(a, b, eps) { return Math.abs(a - b) <= (eps == null ? 1e-9 : eps); }
function at(days) { return new Date(EPOCH + days * DAY); }

/* ---------- namespace + constants ---------- */
assert(!!M, "namespace window.MenaMoon exposed");
assert(near(M.SYNODIC, SYNODIC), "synodic month constant");
assert(M.EPOCH === EPOCH, "epoch is 2000-01-06 18:14 UTC");
assert(M.EPOCH === 947182440000, "epoch ms value");
assert(M.DAY === DAY, "day in ms");
assert(M.STORAGE_KEY === "mena-moon", "storage key is mena-moon");
assert(M.PHASES.length === 8, "eight phase names");

/* ---------- the four principal phases at exact offsets ---------- */
const pNew = M.moonPhase(at(0));
assert(pNew.phase === "New Moon", "epoch is a New Moon");
assert(near(pNew.illumination, 0, 1e-9), "new moon illumination is 0");
assert(near(pNew.age, 0, 1e-9), "new moon age is 0");
assert(pNew.isWaxing === true, "new moon is waxing-side");

const pFirst = M.moonPhase(at(SYNODIC / 4));
assert(pFirst.phase === "First Quarter", "quarter-cycle is First Quarter");
assert(near(pFirst.illumination, 0.5, 1e-9), "first quarter is 50% lit");

const pFull = M.moonPhase(at(SYNODIC / 2));
assert(pFull.phase === "Full Moon", "half-cycle is a Full Moon");
assert(near(pFull.illumination, 1, 1e-9), "full moon illumination is 1");
assert(near(pFull.age, SYNODIC / 2, 1e-3), "full moon age is half a synodic month");
assert(at(SYNODIC / 2 - 0.5) && M.moonPhase(at(SYNODIC / 2 - 0.5)).isWaxing === true,
  "just before full the moon is still waxing");
assert(M.moonPhase(at(SYNODIC / 2 + 0.5)).isWaxing === false,
  "just after full the moon is waning");

const pLast = M.moonPhase(at(3 * SYNODIC / 4));
assert(pLast.phase === "Last Quarter", "three-quarter cycle is Last Quarter");
assert(near(pLast.illumination, 0.5, 1e-9), "last quarter is 50% lit");

/* ---------- a walk through the cycle ---------- */
const names = [];
for (let i = 0; i < 8; i++) {
  names.push(M.phaseName(at((i / 8) * SYNODIC)));
}
assert(names[0] === "New Moon", "cycle 0/8 = New Moon");
assert(names[2] === "First Quarter", "cycle 2/8 = First Quarter");
assert(names[4] === "Full Moon", "cycle 4/8 = Full Moon");
assert(names[6] === "Last Quarter", "cycle 6/8 = Last Quarter");
assert(M.phaseNameFromFraction(0.125) === "Waxing Crescent", "1/8 = Waxing Crescent");
assert(M.phaseNameFromFraction(0.875) === "Waning Crescent", "7/8 = Waning Crescent");

/* ---------- illumination bounds over many dates ---------- */
let minI = 1, maxI = 0, allInRange = true, ageOk = true;
for (let d = 0; d < 400; d += 0.37) {
  const p = M.moonPhase(at(d));
  if (p.illumination < 0 || p.illumination > 1) allInRange = false;
  if (p.age < 0 || p.age >= SYNODIC) ageOk = false;
  minI = Math.min(minI, p.illumination);
  maxI = Math.max(maxI, p.illumination);
}
assert(allInRange, "illumination always within [0,1]");
assert(ageOk, "moon age always within [0, synodic)");
assert(minI < 0.001 && maxI > 0.999, "illumination spans the full range over a cycle");

/* ---------- known real-world dates ---------- */
const realNew = new Date(Date.UTC(2024, 0, 11, 11, 57, 0));
const realFull = new Date(Date.UTC(2024, 0, 25, 17, 54, 0));
assert(M.moonPhase(realNew).phase === "New Moon", "2024-01-11 11:57Z is a New Moon");
assert(M.moonPhase(realNew).illumination < 0.02, "…and nearly unlit");
assert(M.moonPhase(realFull).phase === "Full Moon", "2024-01-25 17:54Z is a Full Moon");
assert(M.moonPhase(realFull).illumination > 0.98, "…and nearly fully lit");

/* ---------- phaseFraction / illumination helpers ---------- */
assert(near(M.phaseFraction(at(0)), 0), "phaseFraction at epoch is 0");
const wrapAfter = M.phaseFraction(at(SYNODIC));
assert(Math.min(wrapAfter, 1 - wrapAfter) < 1e-6, "phaseFraction wraps after a synodic month");
const wrapBefore = M.phaseFraction(at(-SYNODIC));
assert(Math.min(wrapBefore, 1 - wrapBefore) < 1e-6, "phaseFraction wraps before the epoch too");
assert(near(M.illuminationFromFraction(0), 0), "illuminationFromFraction(0)=0");
assert(near(M.illuminationFromFraction(0.25), 0.5), "illuminationFromFraction(0.25)=0.5");
assert(near(M.illuminationFromFraction(0.5), 1), "illuminationFromFraction(0.5)=1");
assert(M.phaseIndex(0) === 0 && M.phaseIndex(0.5) === 4, "phase index mapping");

/* ---------- next phases ---------- */
const from = at(3.2);
const upcoming = M.nextPhases(from);
assert(upcoming.length === 4, "nextPhases returns four entries");
assert(upcoming.map((u) => u.key).join(",") === "new,first,full,last", "nextPhases keys + order");
let allFuture = true;
for (const u of upcoming) {
  if (!(u.ms > 0)) allFuture = false;
  if (!(u.ms < SYNODIC * DAY)) allFuture = false;
}
assert(allFuture, "every next phase is in the future and under one cycle away");

const nf = M.nextPhase("full", at(0));
assert(near(nf.ms, SYNODIC / 2 * DAY, 1000), "next full from the epoch is half a month away");
const nn = M.nextPhase("new", at(0.1));
assert(near(nn.ms, (SYNODIC - 0.1) * DAY, 1000), "next new from just after new is one cycle minus 0.1 day");
assert(M.nextPhase("nope", at(0)) === null, "nextPhase returns null for an unknown key");

/* strictly-next: from a day-past full moon, the next full is a whole cycle later */
const fromFull = at(SYNODIC / 2 + 1);
const nextFull = M.nextPhase("full", fromFull);
assert(nextFull.ms > 0 && near(nextFull.ms, (SYNODIC - 1) * DAY, 3000),
  "next full from a day past the full moon is one cycle later");

/* ---------- countdown ---------- */
const c = M.countdown(90061000);
assert(c.d === 1 && c.h === 1 && c.m === 1 && c.s === 1, "countdown breaks down D/H/M/S");
const c0 = M.countdown(-5000);
assert(c0.d === 0 && c0.h === 0 && c0.m === 0 && c0.s === 0 && c0.total === 0, "countdown clamps negatives");
assert(M.countdown(59000).s === 59 && M.countdown(59000).m === 0, "countdown seconds");

/* ---------- dates ---------- */
const parsed = M.parseDay("2024-01-11");
assert(parsed instanceof Date && parsed.getFullYear() === 2024 && parsed.getMonth() === 0 && parsed.getDate() === 11,
  "parseDay reads YYYY-MM-DD");
assert(M.parseDay("nope") === null, "parseDay rejects junk");
assert(M.parseDay(null) === null, "parseDay rejects null");
assert(M.formatDay(new Date(2024, 0, 5)) === "2024-01-05", "formatDay pads month and day");
assert(M.formatDate(new Date(2024, 0, 11)).indexOf("2024") >= 0, "formatDate includes the year");
assert(M.humanDays(0.2) === "today", "humanDays -> today");
assert(M.humanDays(1.1) === "tomorrow", "humanDays -> tomorrow");
assert(M.humanDays(5.4) === "in 5 days", "humanDays -> in N days");

/* ---------- storage round-trip ---------- */
M.save({ date: "2024-01-11" });
assert(sandbox.localStorage.getItem("mena-moon") !== null, "save writes the mena-moon key");
assert(M.load().date === "2024-01-11", "load reads the saved date back");
M.save({ date: null });
assert(M.load().date === null, "save(null) clears the date");

/* ---------- drawing + misc API present (no canvas in Node) ---------- */
assert(typeof M.paintMoon === "function", "paintMoon exposed");
assert(typeof M.renderMoon === "function", "renderMoon exposed");
assert(M.renderMoon(null, 0.5) === false, "renderMoon is safe without a canvas");
assert(typeof M.LINES["Full Moon"] === "string" && M.LINES["Full Moon"].length > 0, "a line exists for the full moon");
assert(M.GLYPHS.length === 8, "eight phase glyphs");

/* ---------- done ---------- */
console.log("");
if (failures) {
  console.error(failures + " assertion(s) failed");
  process.exit(1);
} else {
  console.log("all assertions passed");
  process.exit(0);
}

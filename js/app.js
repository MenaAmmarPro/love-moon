"use strict";

/*
 * love-moon — the moon, for Mena.
 *
 * The astronomy lives in pure functions: the synodic month (29.530588853 days)
 * counted from the new moon of 2000-01-06 18:14 UTC. `moonPhase(date)` gives the
 * phase name, age and illumination; the page paints the moon on a canvas dark
 * sky and counts down to the next full and new moon.
 *
 * Namespace: window.MenaMoon      Storage key: mena-moon
 */

(function () {
  var DAY = 86400000;
  var SYNODIC = 29.530588853;
  var EPOCH = Date.UTC(2000, 0, 6, 18, 14, 0);
  var LS = "mena-moon";

  var PHASES = [
    "New Moon",
    "Waxing Crescent",
    "First Quarter",
    "Waxing Gibbous",
    "Full Moon",
    "Waning Gibbous",
    "Last Quarter",
    "Waning Crescent"
  ];

  var GLYPHS = [
    "\uD83C\uDF11", "\uD83C\uDF12", "\uD83C\uDF13", "\uD83C\uDF14",
    "\uD83C\uDF15", "\uD83C\uDF16", "\uD83C\uDF17", "\uD83C\uDF18"
  ];

  var LINES = {
    "New Moon": "A new moon \u2014 the sky is quiet; a good night to begin something together.",
    "Waxing Crescent": "A sliver of light is growing \u2014 like us, always a little more.",
    "First Quarter": "Half of the moon tonight \u2014 halfway to full, halfway home to you.",
    "Waxing Gibbous": "Almost full now \u2014 the moon is gathering itself up for you.",
    "Full Moon": "The full moon \u2014 whole and bright. Look up, I am looking at the same one.",
    "Waning Gibbous": "Still generous, still glowing \u2014 the moon is letting go slowly.",
    "Last Quarter": "Half the light left \u2014 but even half a moon still reaches you.",
    "Waning Crescent": "The last thin crescent \u2014 it comes back, and so will we."
  };

  var PHASE_TARGETS = [
    { key: "new", fraction: 0, name: "New Moon" },
    { key: "first", fraction: 0.25, name: "First Quarter" },
    { key: "full", fraction: 0.5, name: "Full Moon" },
    { key: "last", fraction: 0.75, name: "Last Quarter" }
  ];

  var MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  /* ---------------- pure helpers ---------------- */

  function norm(f) { return ((f % 1) + 1) % 1; }

  function ms(date) { return (date instanceof Date) ? date.getTime() : Number(date); }

  function daysSince(date) { return (ms(date) - EPOCH) / DAY; }

  function phaseFraction(date) { return norm(daysSince(date) / SYNODIC); }

  function moonAge(date) { return phaseFraction(date) * SYNODIC; }

  function illuminationFromFraction(f) { return (1 - Math.cos(2 * Math.PI * norm(f))) / 2; }

  function illumination(date) { return illuminationFromFraction(phaseFraction(date)); }

  function phaseIndex(f) { return Math.round(norm(f) * 8) % 8; }

  function phaseNameFromFraction(f) { return PHASES[phaseIndex(f)]; }

  function phaseName(date) { return phaseNameFromFraction(phaseFraction(date)); }

  function moonPhase(date) {
    var f = phaseFraction(date);
    var k = illuminationFromFraction(f);
    var i = phaseIndex(f);
    return {
      date: date,
      ts: ms(date),
      fraction: f,
      age: f * SYNODIC,
      index: i,
      phase: PHASES[i],
      illumination: k,
      illuminationPct: k * 100,
      isWaxing: f < 0.5,
      message: LINES[PHASES[i]]
    };
  }

  /* The next occurrence (strictly after `from`) of a phase at `fraction` in [0,1). */
  function nextPhaseDate(fraction, from) {
    var cycles = daysSince(from) / SYNODIC;
    var k = Math.floor(cycles - fraction) + 1;
    return new Date(EPOCH + (k + fraction) * SYNODIC * DAY);
  }

  function nextPhases(from) {
    return PHASE_TARGETS.map(function (t) {
      var d = nextPhaseDate(t.fraction, from);
      var delta = d.getTime() - ms(from);
      return { key: t.key, name: t.name, date: d, ms: delta, days: delta / DAY };
    });
  }

  function nextPhase(key, from) {
    for (var i = 0; i < PHASE_TARGETS.length; i++) {
      if (PHASE_TARGETS[i].key === key) {
        var d = nextPhaseDate(PHASE_TARGETS[i].fraction, from);
        return { key: key, name: PHASE_TARGETS[i].name, date: d, ms: d.getTime() - ms(from) };
      }
    }
    return null;
  }

  function countdown(milliseconds) {
    var total = Math.max(0, Number(milliseconds) || 0);
    var s = Math.floor(total / 1000);
    var d = Math.floor(s / 86400); s -= d * 86400;
    var h = Math.floor(s / 3600); s -= h * 3600;
    var m = Math.floor(s / 60); s -= m * 60;
    return { d: d, h: h, m: m, s: s, total: total };
  }

  function pad2(n) { return (n < 10 ? "0" : "") + n; }

  function formatDate(date, withTime) {
    var text = date.getDate() + " " + MONTHS[date.getMonth()] + " " + date.getFullYear();
    if (withTime) text += " \u00b7 " + pad2(date.getHours()) + ":" + pad2(date.getMinutes());
    return text;
  }

  function formatDay(date) {
    return date.getFullYear() + "-" + pad2(date.getMonth() + 1) + "-" + pad2(date.getDate());
  }

  function humanDays(days) {
    if (days < 0.5) return "today";
    if (days < 1.5) return "tomorrow";
    return "in " + Math.round(days) + " days";
  }

  function parseDay(str) {
    /* "YYYY-MM-DD" -> a Date at local noon, so timezones can't shift the day. */
    if (!str || typeof str !== "string") return null;
    var parts = str.split("-");
    if (parts.length !== 3) return null;
    var y = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10);
    var d = parseInt(parts[2], 10);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d, 12, 0, 0, 0);
  }

  /* ---------------- storage ---------------- */

  function load() {
    var state = { date: null };
    try {
      var raw = window.localStorage.getItem(LS);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          state.date = typeof parsed.date === "string" ? parsed.date : null;
        }
      }
    } catch (e) { /* fresh start */ }
    return state;
  }

  function save(state) {
    try {
      window.localStorage.setItem(LS, JSON.stringify({ date: state.date || null }));
    } catch (e) { /* ignore */ }
  }

  /* ---------------- canvas moon ---------------- */

  function moonColors() {
    var light = false;
    try {
      if (typeof document !== "undefined" && document.body &&
          document.body.classList && document.body.classList.contains("light-theme")) {
        light = true;
      }
    } catch (e) { /* ignore */ }
    return light
      ? { dark: "#ded8ec", light: "#fffdf6" }
      : { dark: "#1b1d33", light: "#f7f4ea" };
  }

  /* Paint one moon of `fraction` (0 = new, 0.5 = full) centred in a w x h box. */
  function paintMoon(ctx, w, h, fraction, dark, light) {
    var PI = Math.PI;
    var TAU = PI * 2;
    var f = norm(fraction);
    var cx = w / 2;
    var cy = h / 2;
    var r = Math.min(w, h) / 2 * 0.86;

    /* signed semi-axis of the terminator ellipse: +r at new, -r at full */
    var a = r * Math.cos(TAU * f);
    var rx = Math.abs(a);
    var waxing = f < 0.5;

    ctx.clearRect(0, 0, w, h);

    if (typeof ctx.createRadialGradient === "function") {
      var glow = ctx.createRadialGradient(cx, cy, r * 0.75, cx, cy, r * 1.7);
      glow.addColorStop(0, "rgba(242,238,224,0.20)");
      glow.addColorStop(1, "rgba(242,238,224,0)");
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.7, 0, TAU);
      ctx.fillStyle = glow;
      ctx.fill();
    }

    /* the unlit disc */
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.fillStyle = dark || "#1b1d33";
    ctx.fill();

    /* the lit region: a limb arc + the terminator ellipse */
    ctx.beginPath();
    if (waxing) {
      ctx.arc(cx, cy, r, -PI / 2, PI / 2, false);
      ctx.ellipse(cx, cy, rx, r, 0, PI / 2, -PI / 2, a >= 0);
    } else {
      ctx.arc(cx, cy, r, PI / 2, 3 * PI / 2, false);
      ctx.ellipse(cx, cy, rx, r, 0, -PI / 2, PI / 2, a >= 0);
    }
    ctx.closePath();
    ctx.fillStyle = light || "#f7f4ea";
    ctx.fill();

    /* a few gentle craters, clipped to the disc */
    if (typeof ctx.save === "function") {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, TAU);
      ctx.clip();
      ctx.fillStyle = "rgba(120,120,150,0.13)";
      var craters = [
        [-0.32, -0.18, 0.16], [0.22, 0.06, 0.12],
        [-0.06, 0.34, 0.10], [0.36, -0.36, 0.08], [0.04, -0.44, 0.07]
      ];
      for (var i = 0; i < craters.length; i++) {
        ctx.beginPath();
        ctx.arc(cx + craters[i][0] * r, cy + craters[i][1] * r, craters[i][2] * r, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function renderMoon(canvas, fraction) {
    if (!canvas || typeof canvas.getContext !== "function") return false;
    var ctx = canvas.getContext("2d");
    if (!ctx || typeof ctx.arc !== "function") return false;

    var logical = 260;
    try {
      var rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : null;
      if (rect && rect.width) logical = rect.width;
      else if (canvas.width) logical = canvas.width;
    } catch (e) { /* keep default */ }

    var dpr = 1;
    try {
      dpr = Math.min((typeof window !== "undefined" && window.devicePixelRatio) || 1, 2);
    } catch (e) { dpr = 1; }

    var px = Math.round(logical * dpr) || 260;
    if (canvas.width !== px) { canvas.width = px; canvas.height = px; }

    var colors = moonColors();
    paintMoon(ctx, px, px, fraction, colors.dark, colors.light);
    return true;
  }

  /* ---------------- page glue ---------------- */

  function boot() {
    if (typeof document === "undefined" || !document.getElementById) return;

    function byId(id) { return document.getElementById(id); }
    function setText(el, text) { if (el) el.textContent = text; }

    var els = {
      canvas: byId("moon-canvas"),
      name: byId("phase-name"),
      illum: byId("phase-illum"),
      age: byId("phase-age"),
      wax: byId("phase-wax"),
      message: byId("phase-message"),
      date: byId("date-input"),
      today: byId("today-btn"),
      selected: byId("selected-label"),
      strip: byId("phase-strip"),
      list: byId("next-list"),
      fullCount: byId("full-countdown"),
      fullDate: byId("full-date"),
      newCount: byId("new-countdown"),
      newDate: byId("new-date")
    };

    var state = load();
    var selected = parseDay(state.date);
    if (!selected || isNaN(selected.getTime())) selected = new Date();

    function refDate() { return selected; }

    function renderStrip(activeIndex) {
      if (!els.strip) return;
      els.strip.textContent = "";
      for (var i = 0; i < PHASES.length; i++) {
        var span = document.createElement("span");
        span.className = "strip-item" + (i === activeIndex ? " is-active" : "");
        span.setAttribute("title", PHASES[i]);
        span.textContent = GLYPHS[i];
        els.strip.appendChild(span);
      }
    }

    function renderNext(ref) {
      if (!els.list) return;
      els.list.textContent = "";
      var upcoming = nextPhases(ref);
      for (var i = 0; i < upcoming.length; i++) {
        var p = upcoming[i];
        var li = document.createElement("li");
        li.className = "next-item";
        var glyph = GLYPHS[PHASE_TARGETS[i].fraction * 8];
        var label = document.createElement("span");
        label.className = "next-name";
        label.textContent = glyph + " " + p.name;
        var when = document.createElement("span");
        when.className = "next-when";
        when.textContent = formatDate(p.date) + " \u00b7 " + humanDays(p.days);
        li.appendChild(label);
        li.appendChild(when);
        els.list.appendChild(li);
      }
    }

    function render() {
      var ref = refDate();
      var p = moonPhase(ref);
      setText(els.name, p.phase);
      setText(els.illum, Math.round(p.illuminationPct) + "%");
      setText(els.age, p.age.toFixed(1) + " days");
      setText(els.wax, p.isWaxing ? "waxing \u2197" : "waning \u2198");
      setText(els.message, p.message || "");
      setText(els.selected, formatDate(ref) + (isToday(ref) ? " (tonight)" : ""));
      if (els.date && els.date.value !== formatDay(ref)) els.date.value = formatDay(ref);
      renderMoon(els.canvas, p.fraction);
      renderStrip(p.index);
      renderNext(ref);
    }

    function isToday(d) {
      var now = new Date();
      return d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    }

    /* The live countdowns always look at the real sky above us. */
    function tickCountdowns() {
      var now = new Date();
      if (els.fullCount) {
        var full = nextPhase("full", now);
        els.fullCount.textContent = fmtCountdown(countdown(full.ms));
        setText(els.fullDate, formatDate(full.date, true));
      }
      if (els.newCount) {
        var fresh = nextPhase("new", now);
        els.newCount.textContent = fmtCountdown(countdown(fresh.ms));
        setText(els.newDate, formatDate(fresh.date, true));
      }
    }

    function fmtCountdown(c) {
      return c.d + "d " + pad2(c.h) + "h " + pad2(c.m) + "m " + pad2(c.s) + "s";
    }

    if (els.date) {
      els.date.addEventListener("change", function () {
        var picked = parseDay(els.date.value);
        if (picked) {
          selected = picked;
          state.date = formatDay(picked);
          save(state);
          render();
        }
      });
    }

    if (els.today) {
      els.today.addEventListener("click", function () {
        selected = new Date();
        state.date = null;
        save(state);
        render();
      });
    }

    render();
    tickCountdowns();

    if (els.fullCount || els.newCount) {
      try { setInterval(tickCountdowns, 1000); } catch (e) { /* ignore */ }
    }
  }

  var api = {
    DAY: DAY,
    SYNODIC: SYNODIC,
    EPOCH: EPOCH,
    STORAGE_KEY: LS,
    PHASES: PHASES,
    GLYPHS: GLYPHS,
    LINES: LINES,
    moonPhase: moonPhase,
    phaseFraction: phaseFraction,
    phaseName: phaseName,
    phaseNameFromFraction: phaseNameFromFraction,
    phaseIndex: phaseIndex,
    moonAge: moonAge,
    illumination: illumination,
    illuminationFromFraction: illuminationFromFraction,
    nextPhaseDate: nextPhaseDate,
    nextPhase: nextPhase,
    nextPhases: nextPhases,
    countdown: countdown,
    formatDate: formatDate,
    formatDay: formatDay,
    humanDays: humanDays,
    parseDay: parseDay,
    paintMoon: paintMoon,
    renderMoon: renderMoon,
    load: load,
    save: save
  };

  if (typeof window !== "undefined") window.MenaMoon = api;
  if (typeof globalThis !== "undefined") globalThis.MenaMoon = api;

  try { boot(); } catch (e) { /* the page still works without the UI */ }
})();

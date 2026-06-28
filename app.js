// Planeee — UI + state. Calls the Gemini agent when a key exists; otherwise uses
// an on-device heuristic so the demo always runs (zero-setup live demo).
import {
  agentAvailable,
  planFromText,
  planFromImage,
  nudge,
} from "./agent.js";

const $ = (id) => document.getElementById(id);
const PRIO_W = { high: 3, med: 2, low: 1 };
const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---- state -----------------------------------------------------------------
let state = load() || seed();
let composerPrio = "low";

function load() {
  try {
    return JSON.parse(localStorage.getItem("planeee") || "null");
  } catch {
    return null;
  }
}
function save() {
  localStorage.setItem("planeee", JSON.stringify(state));
}

// Seeded overloaded day — the app opens mid-action, never empty.
function seed() {
  return {
    streak: 3,
    lastActive: today(),
    tasks: [
      { id: id(), title: "Finish 5-page Econ report", day: "today", durationMins: 180, priority: "high", reason: "Due in 6h — biggest risk", done: false },
      { id: id(), title: "Prep client demo slides", day: "today", durationMins: 60, priority: "high", reason: "Meeting at 4pm", done: false },
      { id: id(), title: "Review lecture notes", day: "today", durationMins: 45, priority: "med", reason: "Quiz Thursday", done: false },
      { id: id(), title: "Reply to advisor email", day: "today", durationMins: 10, priority: "low", reason: "Quick win", done: false },
      { id: id(), title: "Gym", day: "tomorrow", durationMins: 60, priority: "low", reason: "Recovery", done: false },
    ],
  };
}

// function declarations (hoisted) — seed() calls these before this point.
function id() { return crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2); }
function today() { return new Date().toISOString().slice(0, 10); }

// ---- on-device heuristic (fallback for no-key / agent error) ----------------
function parseHeuristic(raw, defPrio) {
  return raw
    .split(/\n|,| and /i)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((chunk) => {
      const low = chunk.toLowerCase();
      let day = "today";
      const dm = low.match(/\b(today|tomorrow|mon|tue|wed|thu|fri|sat|sun)\w*/);
      if (dm) day = dm[1].slice(0, 3) === "tom" ? "tomorrow" : dm[1].slice(0, 3);
      let durationMins = 30;
      const h = low.match(/(\d+)\s*h/);
      const m = low.match(/(\d+)\s*m(?!o)/);
      if (h) durationMins = +h[1] * 60;
      else if (m) durationMins = +m[1];
      let priority = defPrio || "low";
      if (/\b(exam|final|due|urgent|critical|deadline|asap)\b/.test(low)) priority = "high";
      else if (/\b(quiz|hw|homework|assignment|review|read)\b/.test(low)) priority = "med";
      const title = chunk.replace(/\b(today|tomorrow|by \w+|\d+\s*h(rs?)?|\d+\s*mins?)\b/gi, "").trim() || chunk;
      return { title: title[0]?.toUpperCase() + title.slice(1), day, durationMins, priority, reason: "" };
    });
}

// ---- agentic add (Gemini if available, else heuristic) ----------------------
async function planInput(raw) {
  toast("Planeee is planning…");
  let result;
  try {
    result = await planFromText(raw, state.tasks);
    if (!result.tasks.length) throw new Error("empty");
  } catch {
    result = { tasks: parseHeuristic(raw, composerPrio), recommendation: null, trace: [] };
    result.trace = result.tasks.map((t) => ({
      tool: "createTask",
      text: `${t.title} → ${t.day} · ${t.priority} (on-device)`,
    }));
  }
  ingest(result);
}

function ingest(result) {
  const added = result.tasks.map((t) => ({ ...t, id: id(), done: false }));
  state.tasks.push(...added);
  if (result.trace?.length) renderTrace(result.trace);
  save();
  render();
  say(`Sorted it. Added ${added.length} task${added.length > 1 ? "s" : ""} — start with the red one.`);
}

// ---- recommendation (the relief moment) ------------------------------------
function pickNow() {
  const open = state.tasks.filter((t) => !t.done && t.day === "today");
  if (!open.length) return null;
  return open.sort(
    (a, b) => PRIO_W[b.priority] - PRIO_W[a.priority] || a.durationMins - b.durationMins
  )[0];
}

// ---- rendering -------------------------------------------------------------
function render() {
  const list = $("taskList");
  const ordered = [...state.tasks].sort(
    (a, b) => a.done - b.done || PRIO_W[b.priority] - PRIO_W[a.priority]
  );
  list.innerHTML = "";
  ordered.forEach((t) => list.appendChild(taskEl(t)));

  // now card
  const now = pickNow();
  if (now) {
    $("nowTitle").textContent = now.title;
    $("nowWhy").textContent = now.reason || `${Math.round(now.durationMins / 60 * 10) / 10}h · ${now.priority} priority — knock it out first.`;
    $("nowDone").style.display = "";
  } else {
    $("nowTitle").textContent = "You're clear for today 🎉";
    $("nowWhy").textContent = "Everything's done. Add what's next or rest.";
    $("nowDone").style.display = "none";
  }

  // entropy + ring + status
  const todays = state.tasks.filter((t) => t.day === "today");
  const done = todays.filter((t) => t.done).length;
  const pct = todays.length ? Math.round((done / todays.length) * 100) : 0;
  $("entropyFill").style.height = pct + "%";
  $("entropyPct").textContent = pct + "%";
  $("ring").style.setProperty("--p", pct);
  $("ringPct").textContent = pct + "%";
  $("streak").textContent = "🔥 " + state.streak;

  const load = todays.filter((t) => !t.done).reduce((s, t) => s + t.durationMins, 0);
  const pill = $("statusPill");
  if (todays.length && done === todays.length) {
    pill.textContent = "COMPLETE"; pill.className = "status-pill mono";
  } else if (load > 300) {
    pill.textContent = "HEAVY DAY"; pill.className = "status-pill mono heavy";
  } else {
    pill.textContent = "ON TRACK"; pill.className = "status-pill mono";
  }
}

function taskEl(t) {
  const li = document.createElement("li");
  li.className = "task" + (t.done ? " done" : "");
  li.innerHTML = `
    <span class="task-dot ${t.priority}"></span>
    <div class="task-body">
      <div class="task-title"></div>
      <div class="task-meta">${t.day.toUpperCase()} · ${fmtDur(t.durationMins)} · ${t.priority.toUpperCase()}</div>
    </div>
    <div class="task-check">✓</div>`;
  li.querySelector(".task-title").textContent = t.title;
  li.addEventListener("click", () => toggle(t.id, li));
  return li;
}

const fmtDur = (m) => (m >= 60 ? `${Math.round((m / 60) * 10) / 10}h` : `${m}m`);

function toggle(taskId, el) {
  const t = state.tasks.find((x) => x.id === taskId);
  if (!t) return;
  t.done = !t.done;
  if (t.done) {
    bumpStreak();
    if (!reduce) el.querySelector(".task-check").classList.add("pop");
    say(pickPraise());
  }
  save();
  setTimeout(render, reduce ? 0 : 250);
}

function bumpStreak() {
  if (state.lastActive !== today()) {
    state.streak += 1;
    state.lastActive = today();
  }
}

function renderTrace(steps) {
  const ol = $("traceSteps");
  ol.innerHTML = "";
  steps.forEach((s, i) => {
    const li = document.createElement("li");
    li.className = "trace-step";
    li.style.animationDelay = i * 60 + "ms";
    li.innerHTML = `<span class="trace-tool">${s.tool}()</span> <span class="trace-text"></span>`;
    li.querySelector(".trace-text").textContent = s.text;
    ol.appendChild(li);
  });
}

// ---- agent voice (orb + toast) ---------------------------------------------
const PRAISE = ["Boom. That was the scary one 💪", "Nice — momentum's building.", "One down. You're ahead now.", "That's how you beat the deadline.", "Clean. Next one's easier."];
const pickPraise = () => PRAISE[Math.floor(Math.random() * PRAISE.length)];

let bubbleTimer;
function say(msg) {
  const b = $("orbBubble");
  b.textContent = msg;
  b.classList.add("show");
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => b.classList.remove("show"), 4200);
}
let toastTimer;
function toast(msg) {
  const t = $("toast");
  t.hidden = false;
  t.textContent = msg;
  requestAnimationFrame(() => t.classList.add("show"));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}

// ---- proactive actions -----------------------------------------------------
async function suggestNext() {
  const n = pickNow();
  toast("Finding your best next block…");
  let line;
  try {
    line = await nudge(`User's open tasks today: ${state.tasks.filter((t) => !t.done && t.day === "today").map((t) => t.title).join(", ")}. Suggest which to do next and why, in one sentence.`);
  } catch {
    line = n ? `Do "${n.title}" next — highest leverage right now.` : "You're clear. Take a breath.";
  }
  say(line);
}

function missedToday() {
  const moved = state.tasks.filter((t) => t.day === "today" && !t.done);
  const rest = DAYS.slice(new Date().getDay() + 1);
  moved.forEach((t, i) => (t.day = rest[i % rest.length] || "tomorrow"));
  save();
  render();
  say(`No stress — I lifted ${moved.length} task${moved.length > 1 ? "s" : ""} off today and rebalanced your week.`);
  toast("Re-planned. Today's pressure is off.");
}

// ---- file intake (the magic moment) ----------------------------------------
async function handleFile(file) {
  if (!file) return;
  if (!agentAvailable() || !file.type.startsWith("image/")) {
    toast(agentAvailable() ? "PDF intake needs the deployed build." : "Connect a Gemini key to read documents.");
    return;
  }
  toast("Reading your document…");
  const base64 = await toBase64(file);
  try {
    const result = await planFromImage(base64, file.type);
    if (!result.tasks.length) throw new Error("empty");
    ingest(result);
    say("Pulled every deadline off that doc into your plan ✨");
  } catch {
    toast("Couldn't read that one — try typing it instead.");
  }
}
const toBase64 = (file) =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });

// ---- wiring ----------------------------------------------------------------
$("fab").addEventListener("click", () => {
  const c = $("composer");
  c.hidden = !c.hidden;
  if (!c.hidden) $("composerInput").focus();
});
$("composerAdd").addEventListener("click", submitComposer);
$("composerInput").addEventListener("keydown", (e) => e.key === "Enter" && submitComposer());
function submitComposer() {
  const v = $("composerInput").value.trim();
  if (!v) return;
  $("composerInput").value = "";
  $("composer").hidden = true;
  planInput(v);
}
$("prioChips").addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  composerPrio = chip.dataset.prio;
  [...$("prioChips").children].forEach((c) => c.classList.toggle("chip-on", c === chip));
});
$("fileInput").addEventListener("change", (e) => handleFile(e.target.files[0]));
$("nowDone").addEventListener("click", () => {
  const n = pickNow();
  if (n) toggle(n.id, [...$("taskList").children].find((el) => el.querySelector(".task-title")?.textContent === n.title) || document.createElement("div"));
});
$("suggestNext").addEventListener("click", suggestNext);
$("missedToday").addEventListener("click", missedToday);
$("traceToggle").addEventListener("click", () => {
  const s = $("traceSteps");
  s.hidden = !s.hidden;
  $("traceToggle").textContent = (s.hidden ? "▸" : "▾") + " AGENT REASONING TRACE";
});
$("orb").addEventListener("click", () => say(agentAvailable() ? "I'm live on Gemini. Dump your chaos — I'll plan it." : "Heuristic mode. Deploy with a key to unlock the full agent."));

// ---- boot ------------------------------------------------------------------
render();
setTimeout(() => say(agentAvailable() ? "Here's your day. Do the red one first." : "Demo mode — try the + button."), 900);

# Vibe2Ship — Implementation Plan
**Project:** The Last-Minute Life Saver (Problem Statement 1)
**Build window:** 24 Jun 2026 (now) → 29 Jun 2026, 2:00 PM (hard deadline)
**Core tool:** Google AI Studio (build + deploy) · Gemini API (`@google/genai`)
**Last updated:** 24 Jun 2026

---

## 1. Spec summary (derived — no SPEC.md exists yet)

**One-liner:** An AI productivity companion that doesn't remind you — it *acts*. It reads
your real documents (assignment briefs, syllabi, meeting notes, bills), figures out what's
at risk, builds a plan, and executes the first concrete step (drafts the email, outlines the
report, blocks the time) with a visible reasoning trace.

**Why this wins (mapped to the 100% rubric):**
| Rubric criterion | Weight | How the plan targets it |
|---|---|---|
| Problem Solving & Impact | 20% | Solves the real "I forgot / I'm out of time" failure with action, not alerts |
| **Agentic Depth** | **20%** | Plan→prioritize→execute loop with tool/function calling + visible trace |
| Innovation & Creativity | 20% | "Acts not nags" + document-grounded planning in one deployed app |
| Usage of Google Technologies | 15% | Gemini (function calling, multimodal grounding), AI Studio deploy, optional Calendar/Live |
| Product Experience & Design | 10% | One polished killer-demo flow, clean UI, visible agent reasoning |
| Technical Implementation | 10% | Own agent loop + tool executor (not a wrapper) |
| Completeness & Usability | 5% | Deployed early, all 3 mandatory links ready, end-to-end demo |

**The killer demo (north star for every slice):**
> "I have a 5-page report due in 6 hours, plus 2 meetings today." → Agent ingests the
> assignment brief PDF, extracts the *real* requirements + deadline, re-plans the day,
> flags the report as critical-risk, drafts the report skeleton, and proposes a calendar
> block + a reschedule note — all shown step-by-step.

---

## 2. Assumptions & open decisions (confirm before/at mentor session 24 Jun, 4–6 PM)

| # | Assumption (my recommendation) | Why | Change if… |
|---|---|---|---|
| A1 | **React + TypeScript (Vite)** app — AI Studio "Build" default | Native to AI Studio deploy path | mentor recommends otherwise |
| A2 | **Client-side persistence (localStorage/IndexedDB)** — no custom backend | Keeps it deployable in AI Studio, zero infra in 5 days | data must survive across devices |
| A3 | **`gemini-2.5-flash`** primary (speed + function calling); `gemini-2.5-pro` for hard planning | Agentic loops need fast, cheap turns | confirm latest model id at mentor session |
| A4 | **Google Calendar = simulated** in-app first; real OAuth integration only if time remains | Real OAuth is heavy for a 5-day solo build; risks the deadline | a buffer day opens up |
| A5 | **Voice (Gemini Live / Web Speech) and Audio Overview = OPTIONAL** stretch | Don't risk core loop; Audio Overview can't be cleanly replicated (no public NotebookLM API) | core loop done by Day 3 |

> If any A-row is wrong, it changes scope — flag it now, not on Day 4.

---

## 3. Architecture (high level)

```
┌─────────────────────────────────────────────────────────┐
│  React/TS app (deployed via Google AI Studio)            │
│                                                          │
│  UI layer                                                │
│   • Task/goal input + document upload                    │
│   • Agent reasoning-trace panel (the "depth" proof)      │
│   • Plan board (prioritized, risk-colored)               │
│   • Deliverable preview (drafted email/outline/report)   │
│                                                          │
│  Agent core  (the moat — built by us)                    │
│   • Planner: goal → subtasks (Gemini)                    │
│   • Tool executor: Gemini function calling loop          │
│   • Risk engine: deadline + effort → priority            │
│                                                          │
│  Tools (function declarations)                           │
│   createTask · prioritizeTasks · analyzeDocument ·       │
│   draftDeliverable · buildSchedule · assessDeadlineRisk  │
│                                                          │
│  Gemini API via @google/genai                            │
│  Persistence: localStorage / IndexedDB                   │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Dependency graph

```
        ┌─────────────────────────────┐
        │ P1 Walking skeleton + DEPLOY │  ← root, de-risks mandatory link
        └───────────────┬─────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
 ┌────────────┐  ┌──────────────┐  ┌──────────────┐
 │ P2 Agent   │  │ P3 Document  │  │ (P3 enriches │
 │ planning   │  │ grounding    │  │  P2's plans) │
 │ loop+trace │  │ (Gemini      │  └──────────────┘
 └─────┬──────┘  │ multimodal)  │
       │         └──────┬───────┘
       │                │
       ▼                ▼
 ┌────────────┐  ┌──────────────┐
 │ P4 Execute │  │ P5 Risk-based│
 │ (draft     │  │ prioritization│
 │ deliverable│  │ + proactive  │
 │ via tool)  │  │ surfacing    │
 └─────┬──────┘  └──────┬───────┘
       └────────┬───────┘
                ▼
        ┌───────────────┐
        │ P6 Polish +    │
        │ killer demo +  │
        │ submission     │
        │ (+opt voice/cal)│
        └───────────────┘
```

**Critical path:** P1 → P2 → P4 → P6. P3 and P5 run alongside and plug in.

---

## 5. Phases & tasks (vertical slices — each is independently demoable)

### Phase 1 — Walking skeleton + deploy  ⟵ do this FIRST, today
Goal: a *deployed* AI Studio app where typing a task + deadline returns a Gemini-generated
prioritized list. Proves the whole pipeline end-to-end before building depth.

- **T1.1** Scaffold AI Studio Build app (React/TS), wire `@google/genai` + API key.
  - *AC:* App runs locally; a hardcoded prompt returns a Gemini response on screen.
  - *Verify:* `npm run dev`, type a task, see model output rendered.
- **T1.2** Minimal UI: task input + deadline + "Plan it" button + results list.
  - *AC:* User adds 3 tasks; Gemini returns an ordered list with one-line rationale each.
  - *Verify:* Manual — enter 3 tasks with different deadlines, order is sensible.
- **T1.3** **Deploy to AI Studio and capture the public URL.**
  - *AC:* Public URL loads the app for an incognito visitor and the flow works.
  - *Verify:* Open deployed URL in incognito; complete T1.2 flow.

> ⛳ **CHECKPOINT A — "It's live."** Deployed URL works for a stranger. The mandatory
> "publicly accessible, fully functional" link now exists. *Do not proceed until green.*

---

### Phase 2 — Agentic planning loop + visible trace  (Agentic Depth core)
Goal: give a goal, agent decomposes it into subtasks via **function calling**, showing its
reasoning steps.

- **T2.1** Define tool schema: `createTask`, `prioritizeTasks` (function declarations).
  - *AC:* Gemini returns valid function calls for a multi-part goal; app executes them.
  - *Verify:* Input "prep for Friday's client demo" → ≥3 createTask calls logged.
- **T2.2** Implement the agent loop (model ↔ tool-result round trips until done).
  - *AC:* Loop runs ≥2 tool round-trips and terminates cleanly (no infinite loop).
  - *Verify:* Inspect trace; confirm it stops and produces a final plan.
- **T2.3** Reasoning-trace UI panel (each step: thought → tool → result).
  - *AC:* Judge can read *what the agent decided and why* without opening devtools.
  - *Verify:* Run the killer-demo goal; trace is human-readable and ordered.

---

### Phase 3 — Document grounding (the NotebookLM-style value, built natively)
Goal: upload a PDF/text; agent grounds the plan in its actual contents.

- **T3.1** File upload → pass to Gemini (multimodal / inline data or Files API).
  - *AC:* Agent answers a question only answerable from the uploaded doc.
  - *Verify:* Upload a sample assignment brief; ask "what's the deadline + word count?"
- **T3.2** `analyzeDocument` tool: extract deadlines, requirements, deliverables.
  - *AC:* Extracted fields feed `createTask` automatically (doc → tasks).
  - *Verify:* Upload brief → tasks appear pre-filled with real dates/requirements.

> ⛳ **CHECKPOINT B — "It thinks and reads."** Agentic loop + grounding demoable on the
> deployed URL. Re-deploy and re-verify in incognito.

---

### Phase 4 — Execution ("acts, not nags")
Goal: agent produces a real deliverable, not just a task.

- **T4.1** `draftDeliverable` tool (email / outline / report skeleton) using doc context.
  - *AC:* For a chosen task the agent outputs a usable draft grounded in the doc.
  - *Verify:* "Draft the report skeleton" → structured outline matching brief sections.
- **T4.2** Deliverable preview UI with copy/edit.
  - *AC:* User can read, copy, and tweak the draft in-app.
  - *Verify:* Copy button works; edits persist in the session.

---

### Phase 5 — Risk-based prioritization + proactive surfacing
Goal: agent computes deadline risk and proactively says what to do *now*.

- **T5.1** `assessDeadlineRisk` (deadline proximity + estimated effort → risk score).
  - *AC:* Tasks render color-coded (critical/warning/ok); riskiest is surfaced on top.
  - *Verify:* Two tasks, one due in 2h one in 3d → 2h flagged critical and pinned.
- **T5.2** Proactive "Right now, do this" recommendation card on load.
  - *AC:* On open, app names the single highest-leverage next action with reasoning.
  - *Verify:* Load app with seeded tasks → one clear recommended action shown.

> ⛳ **CHECKPOINT C — "Full value loop."** ingest → plan → prioritize → draft → recommend,
> end-to-end on the deployed URL. This is the demo-able product.

---

### Phase 6 — Polish, killer demo, submission (+ optional stretch)
- **T6.1** Visual polish pass (layout, empty states, loading, mobile-reasonable).
  - *AC:* No broken states in the killer-demo path; looks intentional, not AI-generated.
- **T6.2** Seed the killer-demo scenario (sample doc + tasks) for one-click judge replay.
  - *AC:* A "Try the demo" button reproduces the north-star flow in <60s.
- **T6.3** Write the **Project Description Google Doc** (problem, solution, key features,
  technologies used, Google technologies utilized) — link-shared.
  - *AC:* Doc accessible to anyone-with-link; all 5 required sections present.
- **T6.4** Prepare **GitHub repo** (code + README + setup/run docs).
  - *AC:* Public repo; README explains architecture + how to run.
- **T6.5** Record a short demo walkthrough (backup if live demo fails).
- **T6.6 (STRETCH, only if Checkpoint C done by Day 3):** voice input (Web Speech / Gemini
  Live) and/or real Google Calendar OAuth block-creation.

> ⛳ **CHECKPOINT D — "Submission-ready."** All 3 mandatory links live (deployed app,
> GitHub, Google Doc). Submit via BlockseBlock **with buffer**, not at 1:59 PM.

---

## 6. Timeline (5 days, front-loaded — deploy risk killed on Day 0)

| Day | Date | Focus | Exit state |
|---|---|---|---|
| 0 | 24 Jun (eve) | Mentor session → Phase 1 | **Checkpoint A: deployed URL live** |
| 1 | 25 Jun | Phase 2 + Phase 3 | **Checkpoint B: thinks + reads** |
| 2 | 26 Jun | Phase 4 + Phase 5 | **Checkpoint C: full value loop** |
| 3 | 27 Jun | Phase 6 polish + demo seed; stretch if ahead | Demo-ready build |
| 4 | 28 Jun | Google Doc, GitHub, demo recording, bug-fix | All 3 links drafted |
| 5 | 29 Jun (by 2 PM) | Final verify + **submit early** | **Checkpoint D: submitted** |

> The mandatory rule: *"Once you Final Submit you cannot edit or resubmit."* Submit only
> when satisfied — but aim to be done by morning of the 29th, not the deadline minute.

---

## 7. Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| AI Studio deploy fails/late | Med | **Fatal** (mandatory link) | Phase 1 deploys Day 0; never leave deploy to the end |
| Agent loop runs away / loops | Med | High | Hard cap on tool round-trips; termination test (T2.2) |
| Scope creep (voice/calendar) | High | High | Stretch-only, gated behind Checkpoint C |
| Gemini model id / API change | Low | Med | Confirm model + SDK usage at mentor session (A3) |
| Doc grounding token limits | Low | Med | Trim/summarize large docs before grounding |
| Final-submit irreversibility | Low | **Fatal** | Submit morning of 29th, double-check all 3 links first |

---

## 8. Definition of Done (submission)
- [ ] Deployed AI Studio app — public, loads in incognito, killer demo works
- [ ] GitHub repo — public, README with architecture + run steps
- [ ] Google Doc — anyone-with-link, all 5 required sections
- [ ] Killer-demo flow reproducible in <60s via "Try the demo"
- [ ] Submitted on BlockseBlock with both Notes toggled + Final Submit

# Vibe2Ship — Task List (TODO)
**Project:** The Last-Minute Life Saver (PS1 only) · See `plan.md` for full context.
**Deadline:** 29 Jun 2026, 2:00 PM · **Submit early on the 29th, not at the deadline.**

Legend: `[ ]` todo · `[~]` in progress · `[x]` done · ⛳ = checkpoint gate

---

## Phase 1 — Walking skeleton + DEPLOY (Day 0, today)
- [ ] T1.1 Scaffold AI Studio Build app (React/TS) + wire `@google/genai` + API key
- [ ] T1.2 Minimal UI: task input + deadline + "Plan it" → Gemini-ordered list w/ rationale
- [ ] T1.3 Deploy to AI Studio; capture public URL; verify in incognito
- [ ] ⛳ **CHECKPOINT A — deployed URL works for a stranger** (mandatory link exists)

## Phase 2 — Agentic planning loop + visible trace (Day 1)
- [ ] T2.1 Tool schema: `createTask`, `prioritizeTasks` (function declarations)
- [ ] T2.2 Agent loop (model ↔ tool round-trips, hard cap, clean termination)
- [ ] T2.3 Reasoning-trace UI panel (thought → tool → result, human-readable)

## Phase 3 — Document grounding (CORE — built natively w/ Gemini) (Day 1)
- [ ] T3.1 File upload → Gemini multimodal/Files API; answer doc-only question
- [ ] T3.2 `analyzeDocument` tool: extract deadlines/requirements → auto `createTask`
- [ ] ⛳ **CHECKPOINT B — thinks + reads, re-deployed & verified in incognito**

## Phase 4 — Execution ("acts, not nags") (Day 2)
- [ ] T4.1 `draftDeliverable` tool (email / outline / report skeleton, doc-grounded)
- [ ] T4.2 Deliverable preview UI (copy + edit)

## Phase 5 — Risk-based prioritization + proactive surfacing (Day 2)
- [ ] T5.1 `assessDeadlineRisk` (deadline + effort → risk score, color-coded, pinned)
- [ ] T5.2 Proactive "Right now, do this" recommendation card on load
- [ ] ⛳ **CHECKPOINT C — full value loop end-to-end on deployed URL**

## Phase 6 — Polish, demo, submission (Days 3–5)
- [ ] T6.1 Visual polish (layout, loading/empty states, mobile-reasonable)
- [ ] T6.2 Seed killer-demo scenario + "Try the demo" one-click replay (<60s)
- [ ] T6.3 Project Description Google Doc (5 sections, anyone-with-link)
- [ ] T6.4 GitHub repo: code + README (architecture + run steps), public
- [ ] T6.5 Record short demo walkthrough (live-demo backup)
- [ ] ⛳ **CHECKPOINT D — all 3 mandatory links live → Final Submit on BlockseBlock**

## Optional / Stretch (ONLY if Checkpoint C done by Day 3)
- [ ] S1 Voice input (Web Speech API / Gemini Live)
- [ ] S2 Real Google Calendar OAuth block-creation (replaces simulated calendar)
- [ ] S3 NotebookLM-style "Audio Overview" of the plan — DEFERRED: no public NotebookLM
      API; only attempt if a clean Gemini-native TTS path exists and core is fully done

---

## Pre-submission checklist (Definition of Done)
- [ ] Deployed app public + killer demo works in incognito
- [ ] GitHub repo public with README
- [ ] Google Doc shared (anyone-with-link), all 5 sections
- [ ] BlockseBlock: both Notes toggled → Final Submit (irreversible — verify links first)

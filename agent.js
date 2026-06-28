// Planeee — agent core. Gemini function-calling loop (the agentic-depth moat).
// AI Studio injects the key as process.env.API_KEY at deploy time. If it's absent
// (e.g. local preview with no key), every export throws and app.js falls back to
// the on-device heuristic so the demo always runs.
// NOTE: @google/genai is imported lazily (dynamic import) so a missing key or an
// unreachable CDN can never take the whole app down — the UI always boots and
// falls back to the on-device heuristic.
const KEY =
  (typeof process !== "undefined" && process.env && process.env.API_KEY) || null;
const MODEL = "gemini-2.5-flash";

let ai = null;
let initTried = false;
async function getAI() {
  if (initTried) return ai;
  initTried = true;
  if (!KEY) return null;
  try {
    const { GoogleGenAI } = await import("@google/genai");
    ai = new GoogleGenAI({ apiKey: KEY });
  } catch {
    ai = null;
  }
  return ai;
}

export function agentAvailable() {
  return !!KEY;
}

// ---- Tool schema (function declarations) -----------------------------------
const tools = [
  {
    functionDeclarations: [
      {
        name: "createTask",
        description:
          "Add one concrete, actionable task to the user's plan. Break vague goals into specific steps.",
        parameters: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING", description: "Short actionable task title" },
            day: {
              type: "STRING",
              description: "today | tomorrow | mon | tue | wed | thu | fri | sat | sun",
            },
            durationMins: { type: "NUMBER", description: "Estimated minutes of effort" },
            priority: { type: "STRING", description: "high | med | low" },
            reason: { type: "STRING", description: "Why this priority / placement" },
          },
          required: ["title", "day", "priority"],
        },
      },
      {
        name: "recommendNow",
        description:
          "Name the single highest-leverage action the user should do RIGHT NOW, with a one-line reason.",
        parameters: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING" },
            why: { type: "STRING", description: "One persuasive sentence" },
          },
          required: ["title", "why"],
        },
      },
    ],
  },
];

const SYSTEM = `You are Planeee, a proactive productivity agent for last-minute students.
You don't nag — you act. Given a messy brain-dump or an image of a syllabus/brief:
1. Decompose it into concrete tasks. Call createTask once per task with a realistic
   day, durationMins and priority. Split big items ("write report") into steps.
2. Infer deadlines/priority from cues ("due Friday", "exam", "2h", "urgent").
3. Finish by calling recommendNow exactly once with the most urgent, highest-leverage action.
Be decisive. Prefer fewer, well-scoped tasks over many tiny ones.`;

// ---- Generic function-calling loop -----------------------------------------
async function runLoop(userParts) {
  const ai = await getAI();
  if (!ai) throw new Error("no-key");

  const contents = [{ role: "user", parts: userParts }];
  const collected = { tasks: [], recommendation: null, trace: [] };

  for (let round = 0; round < 5; round++) {
    const res = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: { systemInstruction: SYSTEM, tools },
    });

    const calls = res.functionCalls || [];
    if (!calls.length) break;

    const responseParts = [];
    for (const call of calls) {
      const a = call.args || {};
      if (call.name === "createTask") {
        collected.tasks.push({
          title: a.title,
          day: (a.day || "today").toLowerCase(),
          durationMins: a.durationMins || 30,
          priority: (a.priority || "low").toLowerCase(),
          reason: a.reason || "",
        });
        collected.trace.push({
          tool: "createTask",
          text: `${a.title} → ${a.day || "today"} · ${a.priority || "low"}${
            a.reason ? " · " + a.reason : ""
          }`,
        });
      } else if (call.name === "recommendNow") {
        collected.recommendation = { title: a.title, why: a.why };
        collected.trace.push({ tool: "recommendNow", text: `${a.title} — ${a.why}` });
      }
      responseParts.push({
        functionResponse: { name: call.name, response: { ok: true } },
      });
    }

    // feed tool results back so the model can continue or finish
    contents.push({ role: "model", parts: calls.map((c) => ({ functionCall: c })) });
    contents.push({ role: "user", parts: responseParts });
  }

  return collected;
}

// ---- Public API ------------------------------------------------------------
export async function planFromText(rawInput, existing = []) {
  const ctx = existing.length
    ? `\n\nExisting tasks (don't duplicate): ${existing.map((t) => t.title).join("; ")}`
    : "";
  return runLoop([{ text: `Brain-dump:\n${rawInput}${ctx}` }]);
}

export async function planFromImage(base64Data, mimeType) {
  return runLoop([
    { text: "Extract every deadline and deliverable from this document into tasks." },
    { inlineData: { mimeType, data: base64Data } },
  ]);
}

// Lightweight, non-tool call for the "Suggest next" / "I missed today" nudges.
export async function nudge(prompt) {
  const ai = await getAI();
  if (!ai) throw new Error("no-key");
  const res = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      systemInstruction:
        "You are Planeee. Reply with ONE short, warm, motivating sentence (<14 words). No emoji unless it lands.",
    },
  });
  return (res.text || "").trim();
}

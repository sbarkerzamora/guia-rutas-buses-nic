// Smoke test: drive the eve agent over the same HTTP protocol the web app uses.
//   node scripts/smoke-chat.mjs "pregunta" [baseUrl]
const BASE = process.argv[3] ?? "http://localhost:3000";
const message = process.argv[2] ?? "Hola";
const SHOW_REASONING = process.env.SHOW_REASONING === "1";

const deadline = Date.now() + 180_000;
for (;;) {
  try {
    const response = await fetch(`${BASE}/eve/v1/health`);
    if (response.ok) break;
  } catch {}
  if (Date.now() > deadline) throw new Error(`server at ${BASE} never became ready`);
  await new Promise((resolve) => setTimeout(resolve, 1_000));
}

const started = Date.now();
const create = await fetch(`${BASE}/eve/v1/session`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ message }),
});
const created = await create.json();
if (!created.sessionId) {
  console.error("create failed", create.status, JSON.stringify(created));
  process.exit(1);
}

console.log(`# session ${created.sessionId} (created in ${Date.now() - started}ms)`);
console.log(`# prompt: ${message}\n`);

const stream = await fetch(`${BASE}/eve/v1/session/${created.sessionId}/stream`);
console.log(`# stream HTTP ${stream.status}`);

let text = "";
let reasoningChars = 0;
const counts = new Map();
const models = new Set();
const toolCalls = [];
let usage = null;
let lastBeat = Date.now();

const bump = (type) => counts.set(type, (counts.get(type) ?? 0) + 1);
const elapsed = () => ((Date.now() - started) / 1000).toFixed(1);

for await (const chunk of (await stream.body)[Symbol.asyncIterator]()) {
  for (const line of Buffer.from(chunk).toString("utf8").split("\n")) {
    if (!line.trim()) continue;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }

    const type = event.type;
    const data = event.data ?? {};
    bump(type);

    if (type === "step.started") {
      models.add(data.modelId);
      console.log(`\n# [${elapsed()}s] step ${data.stepIndex} on ${data.modelId}`);
    } else if (type === "message.appended") {
      text += data.messageDelta ?? "";
      process.stdout.write(data.messageDelta ?? "");
    } else if (type === "reasoning.appended") {
      reasoningChars += (data.reasoningDelta ?? "").length;
      if (SHOW_REASONING) process.stdout.write(data.reasoningDelta ?? "");
    } else if (type === "actions.requested") {
      for (const action of data.actions ?? []) {
        console.log(`\n# [${elapsed()}s] tool call ${action.toolName} ${JSON.stringify(action.input)}`);
        toolCalls.push(action);
      }
    } else if (type === "action.result") {
      const output = data.result?.output;
      const summary =
        output?.resumen !== undefined
          ? `${output.resumen.totalCoincidencias} coincidencias, ${output.resumen.conexionesDirectas} directas`
          : JSON.stringify(output)?.slice(0, 200);
      console.log(`# [${elapsed()}s] tool result: ${summary}`);
    } else if (type === "message.completed") {
      console.log(`\n# [${elapsed()}s] message.completed (finishReason=${data.finishReason})`);
    } else if (type === "session.waiting" || type === "session.completed" || type === "session.failed") {
      usage = data.usage ?? null;
      console.log(`\n# [${elapsed()}s] settled: ${type}`);
      console.log(`# models: ${[...models].join(", ") || "(none)"}`);
      console.log(`# tool calls: ${toolCalls.map((c) => c.toolName).join(", ") || "(none)"}`);
      console.log(`# assistant text: ${text.length} chars, reasoning: ${reasoningChars} chars`);
      if (usage) console.log(`# usage: ${JSON.stringify(usage)}`);
      if (type === "session.failed") console.log(`# FAILURE: ${JSON.stringify(data).slice(0, 2000)}`);
      console.log(`# events: ${JSON.stringify(Object.fromEntries(counts))}`);
      process.exit(type === "session.failed" ? 3 : 0);
    }

    if (Date.now() - lastBeat > 5_000) {
      lastBeat = Date.now();
      process.stderr.write(`   ... ${elapsed()}s (${type})\n`);
    }
  }
}

console.log("\n# stream ended without a settling event");
console.log(`# events: ${JSON.stringify(Object.fromEntries(counts))}`);
process.exit(2);
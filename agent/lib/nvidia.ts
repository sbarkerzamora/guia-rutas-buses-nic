import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/**
 * NVIDIA-hosted models through their OpenAI-compatible endpoint.
 *
 * The Vercel AI Gateway is bypassed on purpose: requests go straight to
 * `https://integrate.api.nvidia.com/v1` using `NVIDIA_API_KEY`.
 *
 * `NVIDIA_MODEL` picks the model. `deepseek-ai/deepseek-v4.1-flash` is a
 * reasoning model whose hosted endpoint answers in minutes rather than
 * seconds; the `nvidia/nemotron-3.5-lightning-*` and `openai/gpt-oss-*`
 * families on the same endpoint answer in about a second.
 */
export const nvidia = createOpenAICompatible({
  name: "nvidia",
  baseURL: process.env.NVIDIA_BASE_URL ?? "https://integrate.api.nvidia.com/v1",
  apiKey: process.env.NVIDIA_API_KEY,
  // NVIDIA only reports token usage on streamed responses when asked, and eve
  // needs it for the session token budget.
  includeUsage: true,
  // Disable reasoning/thinking on Nemotron models for direct, fast responses.
  // This is passed as `chat_template_kwargs: {thinking: false}` to the NIM endpoint.
  chatTemplateKwargs: { thinking: false },
});

export const nvidiaModelId = process.env.NVIDIA_MODEL ?? "deepseek-ai/deepseek-v4.1-flash";

/**
 * A provider-bound model value. Pass this instead of the model id whenever a
 * slot would otherwise resolve the id through the AI Gateway catalog, which
 * does not list NVIDIA models.
 */
export const nvidiaModel = nvidia(nvidiaModelId);

// NVIDIA models are not in the AI Gateway catalog, so eve cannot look the
// window up and needs the value stated here for compaction.
export const nvidiaContextWindowTokens = Number(
  process.env.NVIDIA_CONTEXT_WINDOW_TOKENS ?? 128_000,
);

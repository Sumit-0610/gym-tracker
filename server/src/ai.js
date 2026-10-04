// The one place the server talks to an LLM. Everything AI-related goes through
// generateText(), so switching provider or model is a change to this file only.
//
// Provider: Google Gemini over its REST API (no SDK — one fetch call).
//   GEMINI_API_KEY  required; without it AI features report "not available"
//   AI_MODEL        optional, defaults to DEFAULT_MODEL
//
// The key lives only on the server (env var); it never reaches the browser.

const DEFAULT_MODEL = 'gemini-3.5-flash';
const TIMEOUT_MS = 20_000;
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/** True when an API key is configured, i.e. AI features can run at all. */
const isConfigured = () => Boolean(process.env.GEMINI_API_KEY);

/**
 * Send a system prompt + user message, return the model's plain-text reply.
 * Throws on a missing key, a timeout, an HTTP error or an empty answer, so
 * callers have one failure path.
 * @param {{ system: string, user: string }} prompt
 * @returns {Promise<string>}
 */
async function generateText({ system, user }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set');
  const model = process.env.AI_MODEL || DEFAULT_MODEL;

  const res = await fetch(
    `${API_BASE}/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { temperature: 0.6, maxOutputTokens: 2048 },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    },
  );
  if (!res.ok) {
    // The body can echo the request; keep only the status in the error.
    throw new Error(`AI provider returned HTTP ${res.status}`);
  }
  const data = /** @type {any} */ (await res.json());
  /** @type {{ text?: string }[]} */
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .map((p) => p.text ?? '')
    .join('')
    .trim();
  if (!text) throw new Error('AI provider returned an empty answer');
  return text;
}

module.exports = { isConfigured, generateText };

// Shared helper for the two AI-assist endpoints in this folder
// (evaluate-ai and ask-ai) — one place that knows how to call Claude, so
// the model name, error handling and API shape only live once.
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
// Haiku: cheapest/fastest Claude model — the right fit for short
// evaluation/Q&A tasks on a small budget (see .env#ANTHROPIC_API_KEY).
const MODEL = 'claude-haiku-4-5-20251001';

export const isAIConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY);

// Returns { ok: true, text } or { ok: false, status, message } — callers
// turn the failure case into their own HTTP response instead of this
// helper doing it, since the right status/message differs per endpoint.
export const callClaude = async ({ system, prompt, maxTokens = 300 }) => {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    console.error(`[results.anthropic] Anthropic API error (${response.status}):`, errBody);
    return { ok: false, status: 502, message: 'Error al contactar el servicio de IA' };
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || '';
  return { ok: true, text };
};

export const buildTranscript = (answers) =>
  answers.map((a, i) => `${i + 1}. ${a.question}\nRespuesta: ${JSON.stringify(a.answer)}`).join('\n\n');

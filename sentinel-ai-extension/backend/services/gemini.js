const fetch = globalThis.fetch;

async function generate({ apiKey, model, prompt, temperature = 0.2, maxTokens = 256, signal }) {
  const models = Array.isArray(model) ? model : [model];
  let lastErr;
  for (const m of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
    const body = {
      contents: [{ parts: [{ text: prompt }]}],
      generationConfig: { temperature, maxOutputTokens: maxTokens }
    };
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal
      });
      if (!res.ok) {
        const txt = await res.text();
        const err = new Error(`Gemini ${res.status}`);
        err.status = res.status;
        err.body = txt;
        if (err.status === 404) throw err;
        throw err;
      }
      const data = await res.json();
      const output = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!output) throw new Error('Empty output');
      return { text: output, modelUsed: m };
    } catch (e) {
      lastErr = e;
      if (e.status === 404) continue;
      throw e;
    }
  }
  throw lastErr || new Error('Gemini request failed');
}

module.exports = { generate };

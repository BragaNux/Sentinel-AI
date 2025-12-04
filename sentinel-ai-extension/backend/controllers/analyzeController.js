const fetch = globalThis.fetch;
const { info, audit } = require('../utils/logger');
const { buildPrompt, isImageUrl } = require('../utils/prompt');
const { CACHE_TTL_MS } = require('../config');
const gemini = require('../services/gemini');
const { adjustRiskForDomain } = require('../utils/domainReputation');

const { GEMINI_API_KEY } = process.env;
const { MODEL_PROVIDER = 'gemini', OLLAMA_MODEL_NAME = 'llama3' } = process.env;
const { GEMINI_MODEL = 'gemini-2.5-pro-exp-03-25', GEMINI_TEMPERATURE = '0.2', GEMINI_MAX_TOKENS = '256' } = process.env;

const cacheData = new Map();

async function analyzeContent(text) {
  if (typeof text !== 'string') throw new Error('Entrada insuficiente: informe texto não vazio');
  const t = text.trim();
  if (!t) throw new Error('Entrada insuficiente: informe texto não vazio');
  const alnumLen = t.replace(/[^a-zA-Z0-9çáéíóúàèìòùäëïöüÂÊÎÔÛÁÉÍÓÚÀÈÌÒÙÄËÏÖÜ]+/g, '').length;
  if (alnumLen === 0) throw new Error('Entrada insuficiente: inclua caracteres alfanuméricos');
  if (!GEMINI_API_KEY && MODEL_PROVIDER === 'gemini') throw new Error('Chave GEMINI_API_KEY ausente');
  const key = text.trim();
  const cached = cacheData.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const prompt = buildPrompt(text);
  audit('analyze_request', { type: isImageUrl(text) ? 'image' : 'text', text: text.slice(0, 200), provider: MODEL_PROVIDER });
  let output;
  let attempt = 0;
  const maxAttempts = 3;
  const delay = ms => new Promise(r => setTimeout(r, ms));
  while (attempt < maxAttempts) {
    attempt += 1;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      if (MODEL_PROVIDER === 'gemini') {
        const { text: out, modelUsed } = await gemini.generate({ apiKey: GEMINI_API_KEY, model: [GEMINI_MODEL, 'gemini-2.0-flash', 'gemini-1.5-pro'], prompt, temperature: parseFloat(GEMINI_TEMPERATURE), maxTokens: parseInt(GEMINI_MAX_TOKENS, 10), signal: controller.signal });
        clearTimeout(timeout);
        info('provider_response', { provider: MODEL_PROVIDER, size: out.length, model: modelUsed });
        output = out;
        break;
      } else {
        const response = await fetch('http://localhost:11434/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: OLLAMA_MODEL_NAME, prompt, stream: false }), signal: controller.signal });
        clearTimeout(timeout);
        if (response.ok) {
          const data = await response.json();
          info('provider_response', { provider: MODEL_PROVIDER, size: JSON.stringify(data).length, model: OLLAMA_MODEL_NAME });
          output = data?.response?.trim();
          break;
        } else if (response.status >= 500 || response.status === 429) {
          await delay(500 * attempt);
        } else {
          const errText = await response.text();
          throw new Error(`Falha Ollama ${response.status}: ${errText}`);
        }
      }
    } catch (e) {
      clearTimeout(timeout);
      if (attempt >= maxAttempts) throw e;
      await delay(500 * attempt);
    }
  }
  if (!output) throw new Error('Sem saída da IA');
  let cleanOutput = output;
  if (cleanOutput.startsWith('```json')) cleanOutput = cleanOutput.replace(/```json\s*/, '').replace(/```$/, '').trim();
  let json;
  try { json = JSON.parse(cleanOutput); } catch { throw new Error('Resposta inválida: o provedor não retornou JSON válido'); }
  let finalJson = json;
  try {
    const isUrl = /^https?:\/\//i.test(text);
    if (isUrl) {
      finalJson = await adjustRiskForDomain(text, json);
    }
  } catch {}
  cacheData.set(key, { value: finalJson, expiresAt: Date.now() + CACHE_TTL_MS });
  audit('analyze_response', { provider: MODEL_PROVIDER, json: finalJson });
  return finalJson;
}

async function analyzeGeneric(req, res) {
  try { const out = await analyzeContent(req.body.text); return res.json(out); } catch (e) { return res.status(400).json({ error: e.message }); }
}
async function analyzeText(req, res) {
  try { const out = await analyzeContent(String(req.body.text || '')); return res.json(out); } catch (e) { return res.status(400).json({ error: e.message }); }
}
async function analyzeUrl(req, res) {
  const url = String(req.body.url || '');
  try { new URL(url); } catch { return res.status(400).json({ error: 'URL inválida' }); }
  try { const out = await analyzeContent(url); return res.json(out); } catch (e) { return res.status(400).json({ error: e.message }); }
}
async function analyzeCode(req, res) {
  try { const out = await analyzeContent(String(req.body.code || '')); return res.json(out); } catch (e) { return res.status(400).json({ error: e.message }); }
}
async function analyzeBatch(req, res) {
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  if (!items.length) return res.status(400).json({ error: 'Lista vazia' });
  const texts = items.map(i => i.text || i.url || i.code).filter(Boolean);
  const results = [];
  for (const t of texts) {
    try { results.push(await analyzeContent(String(t))); } catch (e) { results.push({ error: e.message }); }
  }
  return res.json(results);
}

module.exports = { analyzeGeneric, analyzeText, analyzeUrl, analyzeCode, analyzeBatch };

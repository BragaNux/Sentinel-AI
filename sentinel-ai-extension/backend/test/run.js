const assert = require('assert');
const { buildPrompt, isImageUrl } = require('../utils/prompt');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
let analyzeCtrl = require('../controllers/analyzeController');

function testPromptLink() {
  const p = buildPrompt('https://example.com/phishing');
  assert(p.toLowerCase().includes('json'));
  assert(p.includes('probability'));
  assert(p.includes('tags'));
}

function testPromptCode() {
  const p = buildPrompt('function test() { return 1 }');
  assert(p.toLowerCase().includes('json'));
  assert(p.includes('probability'));
  assert(p.includes('tags'));
}

function testPromptImage() {
  const p = buildPrompt('https://site.com/a.png');
  assert(isImageUrl('https://site.com/a.png'));
  assert(p.toLowerCase().includes('json'));
  assert(p.includes('probability'));
  assert(p.includes('tags'));
}

async function run() {
  testPromptLink();
  testPromptCode();
  testPromptImage();
  testPromptShortDirective();
  await testAnalyzeEmptyInputError();
  await testContextMenuHistorySave();
  await testManualAnalyzeSingleRun();
  await testObservationsNoProbabilityOrTip();
  await testSafeDomainsLowRisk();
  console.log('OK');
}

run().catch((e) => { console.error(e); process.exit(1); });
function testPromptShortDirective() {
  const p = buildPrompt('This sounds like the ending of a good movie');
  assert(p.includes('Diretrizes'));
  assert(p.includes('Não utilize "Entrada insuficiente"'));
}

function testAnalyzeEmptyInputError() {
  const req = { body: { text: '   ' } };
  let statusCode = 200; let payload;
  const res = {
    status(code) { statusCode = code; return this; },
    json(obj) { payload = obj; return this; }
  };
  return analyzeCtrl.analyzeText(req, res).then(() => {
    assert.strictEqual(statusCode, 400);
    assert(/Entrada insuficiente/i.test(payload.error));
  });
}

function testContextMenuHistorySave() {
  const bgPath = path.join(__dirname, '..', '..', 'extension', 'js', 'background.js');
  const code = fs.readFileSync(bgPath, 'utf8');
  const saved = { history: [] };
  const listeners = {};
  global.fetch = async () => ({ json: async () => ({ author:'humano', risk:'baixo', probability:0.1, tags:['teste'], reason:'ok' }) });
  global.chrome = {
    runtime: { getManifest: () => ({ version: '1.0' }), onInstalled: { addListener: () => {} }, setUninstallURL: () => {} },
    contextMenus: { create: () => {}, onClicked: { addListener: (fn) => { listeners.onClicked = fn; } } },
    storage: { local: {
      set: (obj, cb) => { Object.assign(saved, obj); cb && cb(); },
      get: (query, cb) => { cb({ history: saved.history || [] }); }
    } },
    action: { openPopup: () => {} },
    notifications: { create: () => {} },
    tabs: { create: () => {} }
  };
  vm.runInThisContext(code);
  return Promise.resolve().then(async () => {
    await listeners.onClicked({ menuItemId: 'analyzeText', selectionText: 'Hello world' }, {});
    assert(Array.isArray(saved.history));
    assert(saved.history.length >= 1);
    const entry = saved.history[0];
    assert(entry.text === 'Hello world');
    assert(entry.result && typeof entry.result === 'object');
    assert(entry.timestamp && typeof entry.timestamp === 'string');
  });
}

function testManualAnalyzeSingleRun() {
  const popPath = path.join(__dirname, '..', '..', 'extension', 'js', 'popup.js');
  const code = fs.readFileSync(popPath, 'utf8');
  const saved = { history: [] };
  const elMap = new Map();
  const mkEl = (id) => {
    const el = { id, classList: { add: () => {}, remove: () => {} }, disabled: false, textContent: '', value: '', style: {} };
    el.addEventListener = (evt, fn) => { el.__listener = fn; };
    return el;
  };
  ['reason','manualText','analyzeManual','historyList','reanalyze','analyzeCurrentUrl','clearHistory','copyResult','exportCsv','loading','skeleton','resultContent'].forEach(id => {
    const el = mkEl(id); elMap.set(id, el);
  });
  elMap.get('manualText').value = 'Texto de teste único';
  global.document = {
    getElementById: (id) => elMap.get(id) || mkEl(id),
    querySelectorAll: () => ({ forEach: () => {} }),
    addEventListener: () => {}
  };
  global.window = { __sentinelLoadingTimer: undefined };
  global.chrome = { storage: { local: {
    set: (obj, cb) => { Object.assign(saved, obj); cb && cb(); },
    get: (query, cb) => { cb(saved); }
  } } };
  global.fetch = async () => ({ json: async () => ({ author:'humano', risk:'baixo', probability:0.2, tags:['manual'], reason:'ok' }) });
  vm.runInThisContext(code);
  const btn = elMap.get('analyzeManual');
  assert(btn && btn.__listener);
  return Promise.resolve().then(async () => {
    await btn.__listener();
    assert(Array.isArray(saved.history));
    assert(saved.history.length >= 1);
    const entry = saved.history[0];
    assert(entry.text === 'Texto de teste único');
    assert(entry.result && typeof entry.result === 'object');
  });
}

async function testSafeDomainsLowRisk() {
  // Mock Gemini before requiring controller again
  process.env.GEMINI_API_KEY = 'test';
  const modPath = require.resolve('../services/gemini');
  delete require.cache[modPath];
  require.cache[modPath] = { id: modPath, filename: modPath, loaded: true, exports: {
    generate: async () => ({ text: JSON.stringify({ author:'humano', risk:'médio', probability:0.4, tags:['link'], reason:'análise padrão' }), modelUsed: 'mock' })
  }};
  const ctrlPath = require.resolve('../controllers/analyzeController');
  delete require.cache[ctrlPath];
  analyzeCtrl = require('../controllers/analyzeController');

  async function call(url) {
    let statusCode = 200; let payload;
    const req = { body: { url } };
    const res = { status(code){ statusCode=code; return this; }, json(obj){ payload=obj; return this; } };
    await analyzeCtrl.analyzeUrl(req, res);
    return { statusCode, payload };
  }

  const yt = await call('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  const gm = await call('https://mail.google.com');
  [yt, gm].forEach(({ statusCode, payload }) => {
    assert.strictEqual(statusCode, 200);
    assert(typeof payload === 'object');
    assert(payload.probability <= 0.05);
    assert((payload.risk || '').toLowerCase().startsWith('baix'));
    assert(/Política de confiança/i.test(payload.reason));
    assert(/v1\.2/i.test(payload.reason));
    assert(/domínio_confiável/.test(JSON.stringify(payload.tags)));
    assert(/ssl_valido/.test(JSON.stringify(payload.tags)));
    assert(/reputação_verificada/.test(JSON.stringify(payload.tags)));
  });
}

function testObservationsNoProbabilityOrTip() {
  const popPath = path.join(__dirname, '..', '..', 'extension', 'js', 'popup.js');
  const code = fs.readFileSync(popPath, 'utf8');
  const saved = { history: [] };
  const elMap = new Map();
  const mkEl = (id) => {
    const el = { id, classList: { add: () => {}, remove: () => {} }, disabled: false, textContent: '', innerHTML: '', value: '', style: {} };
    el.addEventListener = (evt, fn) => { el.__listener = fn; };
    return el;
  };
  ['reason','manualText','analyzeManual','historyList','reanalyze','analyzeCurrentUrl','clearHistory','copyResult','exportCsv','loading','skeleton','resultContent'].forEach(id => {
    const el = mkEl(id); elMap.set(id, el);
  });
  elMap.get('manualText').value = 'https://example.com/login?redirect=https://real.com';
  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    URL,
    URLSearchParams,
    Blob: function() {},
    navigator: {},
    document: {
      getElementById: (id) => elMap.get(id) || mkEl(id),
      querySelectorAll: () => ({ forEach: () => {} }),
      addEventListener: () => {}
    },
    window: { __sentinelLoadingTimer: undefined },
    chrome: { storage: { local: {
      set: (obj, cb) => { Object.assign(saved, obj); cb && cb(); },
      get: (query, cb) => { cb(saved); }
    } } },
    fetch: async () => ({ json: async () => ({ author:'humano', risk:'baixo', probability:0.2, tags:['link','ssl_valido'], reason:'ok' }) })
  };
  vm.runInNewContext(code, sandbox);
  const btn = elMap.get('analyzeManual');
  return Promise.resolve().then(async () => {
    await btn.__listener();
    const html = String(elMap.get('reason').innerHTML || '');
    assert(!/Probabilidade/i.test(html));
    assert(!/Dica:/i.test(html));
  });
}

function detectType(text) {
  const codePattern = /function\s+\w+\(|class\s+\w+|const\s+\w+\s*=|let\s+\w+\s*=|#include|public\s+|import\s+\w+|\{[\s\S]*?\}/;
  const urlPattern = /(https?:\/\/[^\s]+)/gi;
  if (urlPattern.test(text)) return "link";
  if (codePattern.test(text)) return "código";
  return "texto";
}

function parseAIResponse(text) {
  if (!text || typeof text !== "string") return null;
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/```json/, "").replace(/```/, "").trim();
  }
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.warn("❌ Erro ao interpretar JSON:", cleaned);
    return null;
  }
}

function renderResult(result, inputText) {
  if (!result || typeof result !== "object") return;
  const loadingEl = document.getElementById('loading');
  if (loadingEl) loadingEl.className = 'hidden';
  const skeleton = document.getElementById('skeleton');
  const content = document.getElementById('resultContent');
  if (skeleton) skeleton.className = 'skeleton-group hidden';
  if (content) { content.classList.remove('hidden'); content.style.opacity = '1'; }
  const originEl = document.getElementById("origin");
  if (originEl) originEl.textContent = (result.author || "N/A");
  const riskEl = document.getElementById("risk");
  function labelRisk(risk) {
    const r = (risk || "").toLowerCase();
    if (r.startsWith("low") || r.startsWith("baix")) return "Baixo";
    if (r.startsWith("med") || r.startsWith("méd") || r.startsWith("medium")) return "Médio";
    if (r.startsWith("high") || r.startsWith("alt")) return "Alto";
    return "Neutro";
  }
  riskEl.textContent = labelRisk(result.risk);
  function normalizeRisk(risk) {
    const r = (risk || "").toLowerCase();
    if (r === "low" || r === "medium" || r === "high" || r === "neutral") return r;
    if (r.startsWith("baix")) return "low";
    if (r.startsWith("med") || r.startsWith("méd")) return "medium";
    if (r.startsWith("alt")) return "high";
    return "neutral";
  }
  const norm = normalizeRisk(result.risk);
  if (riskEl) {
    ['low','medium','high','neutral'].forEach(c => riskEl.classList.remove(c));
    riskEl.classList.add('badge');
    if (norm) riskEl.classList.add(norm);
    riskEl.classList.add('has-tooltip');
  }
  if (riskEl && typeof riskEl.setAttribute === 'function') {
    riskEl.setAttribute('data-tooltip', result.reason || '');
  }
  const reasonEl = document.getElementById("reason");
  function esc(s){ return String(s||'').replace(/[<>]/g,''); }
  function friendly(result, inputText){
    const kind = inputText ? detectType(inputText) : 'texto';
    const tags = Array.isArray(result.tags) ? result.tags.map(t=>String(t)) : [];
    const riskText = String(result.risk||'baixo');
    const reason = String(result.reason||'');
    if (kind === 'link') {
      let host = '';
      let https = false;
      let redirectInfo = '';
      let embed = false;
      try {
        const u = new URL(inputText);
        host = u.hostname;
        https = u.protocol === 'https:';
        const params = new URLSearchParams(u.search);
        const rkeys = ['redirect','redir','url','to','dest','destination','u','link'];
        for (const k of rkeys) {
          const v = params.get(k);
          if (v && /^https?:\/\//i.test(v)) { try { redirectInfo = new URL(v).hostname; } catch { redirectInfo = v; } break; }
        }
      } catch {}
      embed = /<iframe|<embed|<object/i.test(String(inputText||''));
      const bullets = [];
      if (host) bullets.push(`Domínio: ${host}`);
      bullets.push(`Conexão: ${https ? 'HTTPS' : 'HTTP'}`);
      if (redirectInfo) bullets.push(`Redireciona para: ${redirectInfo}`);
      if (embed) bullets.push('Possível conteúdo incorporado');
      if (tags.includes('domínio_confiável') || tags.includes('domínio confiável')) bullets.push('Reputação: confiável');
      if (tags.includes('reputação_verificada')) bullets.push('Reputação verificada');
      if (tags.includes('ssl_valido') || tags.includes('ssl válido')) bullets.push('Certificado SSL válido');
      const intro = `Classificação: ${riskText}.`;
      const tech = reason.split('Política')[0] || '';
      const list = bullets.map(b=>`<li>${esc(b)}</li>`).join('');
      const extra = tech ? `<li>${esc(tech)}</li>` : '';
      const age = `<li>Idade do registro: não verificada</li>`;
      return `<div>${esc(intro)}</div><ul>${age}${list}${extra}</ul>`;
    }
    if (kind === 'código') {
      const intro = `Classificação: ${riskText}.`;
      const tech = reason.split('Política')[0] || '';
      const bullets = [];
      if (tech) bullets.push(tech);
      const styleTags = tags.filter(t => /estilo|simples|complexo/i.test(t)).slice(0,3);
      styleTags.forEach(t => bullets.push(`Padrão: ${t}`));
      return `<div>${esc(intro)}</div><ul>${bullets.map(b=>`<li>${esc(b)}</li>`).join('')}</ul>`;
    }
    if (/https?:\/\/[^\s]+\.(png|jpg|jpeg|gif|webp)/i.test(String(inputText||''))) {
      const intro = `Classificação: ${riskText}.`;
      const bullets = [];
      const extMatch = String(inputText||'').match(/\.(png|jpg|jpeg|gif|webp)\b/i);
      if (extMatch) bullets.push(`Formato: ${extMatch[1].toUpperCase()}`);
      if (tags.includes('manipulação')) bullets.push('Possível manipulação visual');
      if (tags.includes('texto embutido')) bullets.push('Texto embutido detectado');
      bullets.push('Metadados não disponíveis para verificação local');
      const tech = reason.split('Política')[0] || '';
      if (tech) bullets.push(tech);
      return `<div>${esc(intro)}</div><ul>${bullets.map(b=>`<li>${esc(b)}</li>`).join('')}</ul>`;
    }
    const intro = `Classificação: ${riskText}.`;
    const bullets = [];
    const t = String(inputText||'');
    const patterns = [
      { re: /\b(senha|password)\b/i, label:'Menciona senha' },
      { re: /\b(clique aqui|click here)\b/i, label:'Chamada para clique' },
      { re: /\b(urgente|imediato|agora)\b/i, label:'Urgência incomum' },
      { re: /\b(verificar|confirmar)\s+(sua|a)\s+conta\b/i, label:'Solicita verificação de conta' },
      { re: /\b(promoção|oferta|ganhe|grátis)\b/i, label:'Oferta promocional' }
    ];
    patterns.forEach(p => { if (p.re.test(t)) bullets.push(p.label); });
    const tech = reason.split('Política')[0] || '';
    if (tech) bullets.push(tech);
    if (!bullets.length) bullets.push('Texto informativo sem sinais claros de phishing');
    return `<div>${esc(intro)}</div><ul>${bullets.map(b=>`<li>${esc(b)}</li>`).join('')}</ul>`;
  }
  if (reasonEl) reasonEl.innerHTML = friendly(result, inputText);
  const prob = typeof result.probability === 'number' ? Math.max(0, Math.min(1, result.probability)) : null;
  const bar = (typeof document.querySelector === 'function') ? document.querySelector('.confidence-fill') : null;
  const probText = document.getElementById('confidenceValue');
  if (bar && probText) {
    const pct = prob !== null ? Math.round(prob * 100) : 0;
    bar.style.width = pct + '%';
    probText.textContent = pct + '%';
  }
  const tagsEl = document.getElementById('tags');
  if (tagsEl) {
    const tags = Array.isArray(result.tags) ? result.tags : [];
    tagsEl.innerHTML = tags.map(t => `<span class="tag-item">${String(t).slice(0,32)}</span>`).join('');
  }
  const resultCard = document.getElementById('result');
  if (resultCard) {
    resultCard.classList.remove('reveal');
    void resultCard.offsetWidth;
    resultCard.classList.add('reveal');
  }
}

function saveToHistory(text, result) {
  return new Promise((resolve) => {
    const entry = {
      text,
      result,
      type: detectType(text),
      timestamp: new Date().toISOString()
    };
    chrome.storage.local.get({ history: [] }, (data) => {
      const hist = Array.isArray(data.history) ? data.history : [];
      const updated = [entry, ...hist].slice(0, 30);
      chrome.storage.local.set({ history: updated }, () => {
        try { renderHistory(updated); } catch {}
        resolve(updated);
      });
    });
  });
}

function renderHistory(entries) {
  const filter = document.getElementById("filterType").value;
  const filtered = entries.filter(e => filter === "all" || e.type === filter);
  const countsEl = document.getElementById("counts");
  if (countsEl) {
    const counts = entries.reduce((acc, e) => { acc[e.type] = (acc[e.type]||0)+1; acc.all=(acc.all||0)+1; return acc; }, {});
    countsEl.textContent = `(Todos: ${counts.all||0} • Texto: ${counts["texto"]||0} • Código: ${counts["código"]||0} • Link: ${counts["link"]||0})`;
  }
  const html = filtered.map((item, idx) => {
    const result = item.result || {};
    function normalizeRisk(risk) {
      const r = (risk || "").toLowerCase();
      if (r === "low" || r === "medium" || r === "high" || r === "neutral") return r;
      if (r.startsWith("baix")) return "low";
      if (r.startsWith("med") || r.startsWith("méd")) return "medium";
      if (r.startsWith("alt")) return "high";
      return "neutral";
    }
    const isLink = item.type === "link";
    let textHtml;
    if (isLink) {
      try {
        const u = new URL(item.text);
        const host = u.hostname;
        textHtml = `<a href="${item.text}" target="_blank" rel="noopener">${host}</a>`;
      } catch { textHtml = item.text || ""; }
    } else {
      const truncated = item.text ? (item.text.length > 120 ? item.text.slice(0, 120) + '...' : item.text) : '';
      textHtml = truncated;
    }
    const riskClass = normalizeRisk(result.risk);
    return `
      <li class="${riskClass}" data-idx="${idx}">
        <p><strong>${item.type?.toUpperCase() || 'TIPO'}</strong> | ${new Date(item.timestamp).toLocaleString()}</p>
        <p class="entry-text">${textHtml}</p>
        <button class="toggle-text">Ver mais</button>
        <p>
          <span class="tag-item">${item.type || ''}</span>
          <span class="tag-item">${result.risk || 'N/A'}</span>
        </p>
        <p>Autor: ${result.author || 'Desconhecido'}</p>
        <p>Comentário: ${result.reason || 'Sem justificativa'}</p>
      </li>
    `;
  }).join("");
  document.getElementById("historyList").innerHTML = html;
}

function setLoading(isLoading, durationMs = 8000) {
  const ids = ["reanalyze", "analyzeCurrentUrl", "clearHistory", "copyResult", "exportCsv", "analyzeManual"];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = isLoading;
  });
  const loadingEl = document.getElementById("loading");
  if (loadingEl) loadingEl.className = isLoading ? "" : "hidden";
  const skeleton = document.getElementById('skeleton');
  const content = document.getElementById('resultContent');
  if (skeleton) skeleton.className = isLoading ? 'skeleton-group' : 'skeleton-group hidden';
  if (content) { content.classList.remove('hidden'); content.style.opacity = isLoading ? '0.4' : '1'; }
  if (isLoading) {
    clearTimeout(window.__sentinelLoadingTimer);
    window.__sentinelLoadingTimer = setTimeout(() => {
      try { setLoading(false); } catch {}
    }, durationMs);
  } else {
    clearTimeout(window.__sentinelLoadingTimer);
  }
}

document.getElementById("filterType").addEventListener("change", () => {
  chrome.storage.local.get("history", (data) => renderHistory(data.history || []));
});

document.getElementById("reanalyze").addEventListener("click", () => {
  const btn = document.getElementById("reanalyze");
  btn.classList.add('ripple');
  chrome.storage.local.get("lastText", (data) => {
    const text = data.lastText;
    if (!text) {
      document.getElementById("reason").textContent = "Nenhum texto anterior encontrado.";
      return;
    }

    setLoading(true, 20000);
    fetchWithTimeout("http://localhost:3000/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    }, 8000)
      .then(res => res.json())
      .then(data => {
        const parsed = typeof data === "string" ? parseAIResponse(data) : data;
        if (parsed) {
          renderResult(parsed, text);
          saveToHistory(text, parsed);
          chrome.storage.local.set({ lastAnalysis: parsed, lastText: text, lastUseAt: Date.now() });
        } else {
          document.getElementById("reason").textContent = "Resposta inválida.";
        }
    })
      .catch(err => {
        document.getElementById("reason").textContent = "Erro: " + err.message;
        showErrorOverlay(err.message);
      })
      .finally(() => setLoading(false));
  });
});

document.getElementById("analyzeCurrentUrl").addEventListener("click", () => {
  const btn = document.getElementById("analyzeCurrentUrl");
  btn.classList.add('ripple');
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    const url = tab?.url;
    if (!url) {
      document.getElementById("reason").textContent = "Não foi possível capturar a URL.";
      return;
    }

    setLoading(true, 20000);
    fetchWithTimeout("http://localhost:3000/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: url })
    }, 8000)
      .then(res => res.json())
      .then(data => {
        const parsed = typeof data === "string" ? parseAIResponse(data) : data;
        if (parsed) {
          renderResult(parsed, url);
          saveToHistory(url, parsed);
          chrome.storage.local.set({ lastAnalysis: parsed, lastText: url, lastUseAt: Date.now() });
        } else {
          document.getElementById("reason").textContent = "Erro ao interpretar a resposta da IA.";
        }
    })
      .catch(err => {
        document.getElementById("reason").textContent = "Erro: " + err.message;
        showErrorOverlay(err.message);
      })
      .finally(() => setLoading(false));
  });
});

const clearBtn = document.getElementById("clearHistory");
if (clearBtn) {
  clearBtn.addEventListener("click", () => {
    clearBtn.classList.add('ripple');
    chrome.storage.local.set({ history: [] }, () => renderHistory([]));
  });
}

document.getElementById("copyResult").addEventListener("click", async () => {
  chrome.storage.local.get(["lastAnalysis"], async (data) => {
    const result = data.lastAnalysis;
    const text = typeof result === "string" ? result : JSON.stringify(result, null, 2);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      document.getElementById("reason").textContent = "Resultado copiado para a área de transferência.";
    } catch (e) {
      document.getElementById("reason").textContent = "Falha ao copiar.";
    }
  });
});

document.getElementById("exportCsv").addEventListener("click", () => {
  chrome.storage.local.get(["history"], (data) => {
    const entries = data.history || [];
    const header = ["timestamp", "type", "author", "risk", "reason", "text"];
    const rows = entries.map(e => {
      const r = e.result || {};
      const safe = s => (s || "").replace(/"/g, '""').replace(/[\n\r]+/g, ' ');
      return [e.timestamp, e.type, r.author, r.risk, r.reason, e.text].map(v => `"${safe(v)}"`).join(",");
    });
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sentinel-history.csv";
    a.click();
    URL.revokeObjectURL(url);
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const overlay = document.getElementById('overlay');
  if (overlay) overlay.classList.add('hidden');
  setLoading(false);
  document.querySelectorAll('.btn').forEach(b => b.classList.add('ripple'));
  chrome.storage.local.get(["lastAnalysis", "lastText", "history", "updateSeen", "lastUseAt"], (data) => {
    const result = data.lastAnalysis;
    const text = data.lastText || "";
    if (result && text) {
      const parsed = typeof result === "string" ? parseAIResponse(result) : result;
      if (parsed) {
        renderResult(parsed, text);
        try {
          const entry = { text, result: parsed, type: detectType(text), timestamp: new Date().toISOString() };
          const hist = Array.isArray(data.history) ? data.history : [];
          const already = hist.length > 0 && hist[0] && hist[0].text === text && JSON.stringify(hist[0].result) === JSON.stringify(parsed);
          if (!already) {
            const updated = [entry, ...hist].slice(0, 30);
            chrome.storage.local.set({ history: updated });
          }
        } catch {}
      }
    }
    chrome.storage.local.get(["history"], (h) => {
      renderHistory(h.history || []);
    });
    if (!data.lastText) {
      const btn = document.getElementById("reanalyze");
      if (btn) btn.disabled = true;
    }
    if (!data.lastAnalysis) {
      const btn = document.getElementById("copyResult");
      if (btn) btn.disabled = true;
    }
    const updateCard = document.getElementById('updateCard');
    const dismissBtn = document.getElementById('dismissUpdate');
    if (updateCard && dismissBtn) {
      if (data.updateSeen === false) {
        updateCard.classList.remove('hidden');
      }
      dismissBtn.addEventListener('click', () => {
        updateCard.classList.add('hidden');
        chrome.storage.local.set({ updateSeen: true });
      });
    }
    const reCard = document.getElementById('reengageCard');
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
    if (reCard) {
      const last = data.lastUseAt || 0;
      if (Date.now() - last > THIRTY_DAYS) {
        reCard.classList.remove('hidden');
      } else {
        reCard.classList.add('hidden');
      }
    }
  });
});

document.getElementById("historyList").addEventListener("click", (e) => {
  const t = e.target;
  if (t && t.classList.contains("toggle-text")) {
    const li = t.closest("li");
    const idx = parseInt(li.getAttribute("data-idx"), 10);
    chrome.storage.local.get(["history"], (data) => {
      const entries = data.history || [];
      const item = entries[idx];
      const textEl = li.querySelector(".entry-text");
      if (textEl && item && item.text) {
        const expanded = t.getAttribute("data-expanded") === "true";
        if (expanded) {
          textEl.textContent = item.text.length > 120 ? item.text.slice(0, 120) + "..." : item.text;
          t.textContent = "Ver mais";
          t.setAttribute("data-expanded", "false");
        } else {
          textEl.textContent = item.text;
          t.textContent = "Ver menos";
          t.setAttribute("data-expanded", "true");
        }
      }
    });
  }
});

async function analyzeManualWithRetry(text, maxAttempts = 2) {
  let attempt = 0;
  let lastError;
  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      const res = await fetchWithTimeout("http://localhost:3000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      }, 30000);
      const data = await res.json();
      const parsed = typeof data === "string" ? parseAIResponse(data) : data;
      if (parsed && typeof parsed === 'object') {
        renderResult(parsed, text);
        await saveToHistory(text, parsed);
        chrome.storage.local.set({ lastAnalysis: parsed, lastText: text, lastUseAt: Date.now() });
        return parsed;
      }
      throw new Error("Resposta inválida.");
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        document.getElementById("reason").textContent = `Erro (${attempt}/${maxAttempts - 1}). Tentando novamente...`;
        await new Promise(r => setTimeout(r, 500));
      }
    }
  }
  document.getElementById("reason").textContent = "Erro: " + (lastError?.message || "Falha");
  showErrorOverlay(lastError?.message || "Falha na análise");
  return null;
}

let __manualRunning = false;
document.getElementById("analyzeManual").addEventListener("click", async () => {
  const btn = document.getElementById("analyzeManual");
  if (btn && btn.disabled) return;
  if (__manualRunning) return;
  __manualRunning = true;
  btn.classList.add('ripple');
  const ta = document.getElementById("manualText");
  const text = (ta.value || "").trim();
  if (!text) {
    document.getElementById("reason").textContent = "Informe um texto para análise.";
    __manualRunning = false;
    return;
  }
  const preview = text.length > 120 ? text.slice(0, 120) + '...' : text;
  document.getElementById("reason").textContent = `Analisando: ${preview}`;
  setLoading(true, 30000);
  try { chrome.storage.local.set({ lastAnalysis: null, lastText: text }); } catch {}
  try {
    await analyzeManualWithRetry(text, 2);
  } finally {
    setLoading(false);
    __manualRunning = false;
  }
});

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const target = tab.getAttribute('data-tab');
    const current = document.querySelector('.view:not(.hidden)');
    const next = document.getElementById(target);
    if (current && next && current !== next) {
      current.classList.add('fade-out');
      setTimeout(() => {
        current.classList.add('hidden');
        current.classList.remove('fade-out');
        next.classList.remove('hidden');
        next.classList.add('fade-in');
        setTimeout(() => next.classList.remove('fade-in'), 250);
      }, 150);
    } else if (next) {
      next.classList.remove('hidden');
    }
    document.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-selected', t === tab ? 'true' : 'false'));
  });
  tab.addEventListener('keydown', (e) => {
    const tabs = Array.from(document.querySelectorAll('.tab'));
    const idx = tabs.indexOf(tab);
    let nextIdx = idx;
    if (e.key === 'ArrowRight') nextIdx = (idx + 1) % tabs.length;
    if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + tabs.length) % tabs.length;
    if (e.key === 'Home') nextIdx = 0;
    if (e.key === 'End') nextIdx = tabs.length - 1;
    if (nextIdx !== idx) {
      e.preventDefault();
      tabs[nextIdx].focus();
      tabs[nextIdx].click();
    }
  });
});

document.getElementById('historyList').addEventListener('click', (e) => {
  const li = e.target.closest('li');
  if (!li) return;
  const idx = parseInt(li.getAttribute('data-idx'), 10);
  chrome.storage.local.get(['history'], (data) => {
    const entries = data.history || [];
    const item = entries[idx];
    if (!item) return;
    const r = item.result || {};
    const html = `
      <h3>Detalhe da análise</h3>
      <p><strong>Tipo:</strong> ${item.type}</p>
      <p><strong>Autor:</strong> ${r.author || 'N/A'}</p>
      <p><strong>Risco:</strong> ${r.risk || 'N/A'}</p>
      <p><strong>Probabilidade de Risco:</strong> ${typeof r.probability === 'number' ? Math.round(Math.max(0, Math.min(1, r.probability)) * 100) + '%' : 'N/A'}</p>
      <p><strong>Tags:</strong> ${(Array.isArray(r.tags) ? r.tags : []).map(t => String(t)).join(', ')}</p>
      <p><strong>Justificativa:</strong> ${r.reason || ''}</p>
      <hr>
      <p><strong>Conteúdo:</strong></p>
      <pre>${(item.text || '').replace(/[<>]/g, '')}</pre>
    `;
    document.getElementById('overlayBody').innerHTML = html;
    document.getElementById('overlay').classList.remove('hidden');
  });
});

document.getElementById('closeOverlay').addEventListener('click', () => {
  document.getElementById('overlay').classList.add('hidden');
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const ov = document.getElementById('overlay');
    if (ov && !ov.classList.contains('hidden')) ov.classList.add('hidden');
  }
});
function fetchWithTimeout(resource, options = {}, timeout = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const opts = { ...options, signal: controller.signal };
  return fetch(resource, opts).finally(() => clearTimeout(id));
}

function showErrorOverlay(message) {
  const html = `
    <h3>Erro na análise</h3>
    <p class="muted">${(message || 'Falha inesperada').replace(/[<>]/g,'')}</p>
    <ul>
      <li>Verifique sua conexão com a internet</li>
      <li>Confirme se o backend está rodando em <code>http://localhost:3000</code></li>
      <li>Cheque sua chave e modelo na configuração</li>
    </ul>
    <button id="retryAnalyze" class="btn primary small">Tentar novamente</button>
  `;
  const ovBody = document.getElementById('overlayBody');
  const ov = document.getElementById('overlay');
  if (!ovBody || !ov) return;
  ovBody.innerHTML = html;
  ov.classList.remove('hidden');
  const btn = document.getElementById('retryAnalyze');
  if (btn) {
    btn.addEventListener('click', () => {
      ov.classList.add('hidden');
      const reBtn = document.getElementById('reanalyze');
      if (reBtn && !reBtn.disabled) reBtn.click();
    });
  }
}

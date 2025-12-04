const tls = require('tls');
const urlLib = require('url');

const TRUSTED_DOMAINS = [
  'youtube.com',
  'youtu.be',
  'google.com',
  'gmail.com',
  'mail.google.com',
  'docs.google.com',
  'drive.google.com'
];
const TRUSTED_REPUTATION_FACTOR = {
  'youtube.com': 0.2,
  'youtu.be': 0.2,
  'google.com': 0.2,
  'gmail.com': 0.2,
  'mail.google.com': 0.2,
  'docs.google.com': 0.2,
  'drive.google.com': 0.2
};
const TRUST_POLICY_VERSION = 'v1.2';

function getHost(input) {
  try { return new urlLib.URL(input).hostname.toLowerCase(); } catch { return ''; }
}

function isHttps(input) {
  try { return new urlLib.URL(input).protocol === 'https:'; } catch { return false; }
}

function isSubdomainOf(host, domain) {
  if (!host || !domain) return false;
  return host === domain || host.endsWith('.' + domain);
}

function isTrustedHost(host) {
  return TRUSTED_DOMAINS.some(d => isSubdomainOf(host, d));
}

function hasSuspiciousPatterns(host, input) {
  const h = (host || '').toLowerCase();
  const u = (input || '').toLowerCase();
  if (h.includes('xn--')) return true; // punycode
  const keywords = ['login', 'verify', 'secure', 'account', 'update', 'support', 'credential', 'password'];
  const inHost = keywords.some(k => h.includes(k));
  const inPath = keywords.some(k => u.includes('/' + k));
  return inHost || inPath;
}

async function checkSslValid(host) {
  return new Promise((resolve) => {
    const socket = tls.connect({ host, port: 443, servername: host, rejectUnauthorized: true }, () => {
      try {
        const authorized = socket.authorized === true;
        const cert = socket.getPeerCertificate();
        let notExpired = true;
        if (cert && cert.valid_to) {
          notExpired = new Date(cert.valid_to) > new Date();
        }
        socket.end();
        resolve(Boolean(authorized && notExpired));
      } catch {
        try { socket.end(); } catch {}
        resolve(false);
      }
    });
    socket.setTimeout(3000, () => { try { socket.destroy(); } catch {}; resolve(false); });
    socket.on('error', () => { resolve(false); });
  });
}

function baseDomain(host) {
  const parts = (host || '').toLowerCase().split('.');
  if (parts.length <= 2) return host.toLowerCase();
  return parts.slice(-2).join('.');
}

function normalizeRisk(risk) {
  const r = (risk || '').toLowerCase();
  if (r.startsWith('alt') || r === 'high') return 'alto';
  if (r.startsWith('méd') || r.startsWith('med') || r === 'medium') return 'médio';
  if (r.startsWith('baix') || r === 'low') return 'baixo';
  return 'baixo';
}

function reduceRiskLevels(risk, levels = 2) {
  const order = ['alto','médio','baixo'];
  const idx = Math.max(0, order.indexOf(normalizeRisk(risk)));
  const newIdx = Math.min(order.length - 1, idx + levels);
  return order[newIdx];
}

async function adjustRiskForDomain(inputUrl, result) {
  const host = getHost(inputUrl);
  const httpsOk = isHttps(inputUrl);
  let sslOk = false;
  try { sslOk = host ? await checkSslValid(host) : false; } catch { sslOk = false; }

  const tags = Array.isArray(result.tags) ? result.tags.slice() : [];
  let probability = typeof result.probability === 'number' ? result.probability : 0.5;
  let risk = (result.risk || 'baixo');
  let reason = (result.reason || '').trim();

  const trusted = isTrustedHost(host);
  const suspicious = hasSuspiciousPatterns(host, inputUrl);
  const nowDate = new Date().toISOString().slice(0,10);

  if (trusted && httpsOk && sslOk) {
    const base = baseDomain(host);
    const factor = TRUSTED_REPUTATION_FACTOR[base] ?? 0.3;
    probability = Math.min(probability * factor, 0.05);
    risk = reduceRiskLevels(risk, 2); // pelo menos 2 níveis
    if (risk !== 'baixo') risk = 'baixo';
    if (!tags.includes('domínio_confiável')) tags.push('domínio_confiável');
    if ((sslOk || httpsOk) && !tags.includes('ssl_valido')) tags.push('ssl_valido');
    if (!tags.includes('reputação_verificada')) tags.push('reputação_verificada');
    const criteria = [
      `Elegível (lista pré-aprovada): ${base}`,
      `HTTPS: ${httpsOk ? 'sim' : 'não'}`,
      `SSL válido por CA: ${sslOk ? 'sim' : 'não'}`,
      'Sem padrões suspeitos'
    ];
    const expl = `Redução proporcional por reputação. Política de confiança ${TRUST_POLICY_VERSION}. Data: ${nowDate}. Critérios: ${criteria.join(' • ')}`;
    const src = 'Fonte: verificação TLS, whitelist interna';
    reason = reason ? `${reason} | ${expl} | ${src}` : `${expl} | ${src}`;
  } else if (suspicious) {
    probability = Math.max(probability, 0.6);
    risk = 'médio';
    if (!tags.includes('suspenso')) tags.push('suspenso');
    const criteria = [`Padrões suspeitos em: ${host}`];
    const expl = `Aumento de risco por indicadores de phishing. Critérios: ${criteria.join(' • ')}`;
    reason = reason ? `${reason} | ${expl}` : expl;
  }

  return { ...result, probability, risk, tags, reason };
}

module.exports = { adjustRiskForDomain, isTrustedHost, checkSslValid };

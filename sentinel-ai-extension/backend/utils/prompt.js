function isCodeSnippet(text) {
  const codeIndicators = [
    /function\s+\w+\(/,
    /class\s+\w+/, /const\s+\w+\s*=/,
    /let\s+\w+\s*=/, /public\s+\w+/, /if\s*\(.*\)/,
    /#include\s+<.*>/, /import\s+\w+/, /\{[\s\S]*?\}/
  ];
  return codeIndicators.some((regex) => regex.test(text));
}

function containsLink(text) {
  const urlPattern = /(https?:\/\/[^\s]+)/gi;
  return urlPattern.test(text);
}

function isImageUrl(text) {
  const t = (text || "").toLowerCase();
  return /(https?:\/\/[^\s]+\.(png|jpg|jpeg|gif|webp))/i.test(t);
}

function buildPrompt(text) {
  const now = new Date().toISOString().slice(0, 10);
  const meta = {
    version: "1.1.0",
    updatedAt: now,
    author: "Sentinel Team",
    useCases: ["texto", "link", "código", "imagem"]
  };
  const schema = `{
  "author": "humano" ou "IA",
  "risk": "baixo" | "médio" | "alto",
  "probability": número entre 0 e 1,
  "tags": ["..."],
  "reason": "explicação curta técnica"
}`;
  const base = `Contexto: Você é o módulo de análise do Sentinel AI (extensão Chrome + backend Express). Seu papel é classificar autoria (humano/IA), risco e confiança de entradas do usuário.
Objetivo: Gerar exclusivamente um JSON válido conforme o esquema, sem markdown nem texto adicional.
Formato: ${schema}
Diretrizes:
- Preserve exatamente as chaves e tipos do esquema.
- Não inclua comentários, markdown, rótulos ou campos extras.
- Use português nas saídas.
- Garanta probability em [0,1] e listas de tags curtas.
- Em entradas ambíguas ou vazias, retorne risk "baixo" com probability <= 0.15 e reason mínimo.
 - Não utilize "Entrada insuficiente" como razão para frases curtas; avalie estilo/semântica e forneça saída válida.
Validação:
- Se qualquer valor não puder ser inferido com segurança, aplique defaults: author "humano", risk "baixo", probability 0.0, tags [], reason "Entrada insuficiente".
Compatibilidade: mantenha compatibilidade retroativa com respostas anteriores.`;

  const examplesTexto = `Exemplos (não repetir na saída):
Input válido:
"""
Este é um parágrafo informativo sobre segurança digital.
"""
Output válido:
{"author":"humano","risk":"baixo","probability":0.12,"tags":["informativo"],"reason":"Linguagem natural sem padrões de IA"}`;

  const examplesTextoCurto = `Exemplos (não repetir na saída):
Input curto válido:
"""
This sounds like the ending of a good movie
"""
Output válido:
{"author":"humano","risk":"baixo","probability":0.10,"tags":["opinião","narrativa"],"reason":"Frase curta opinativa sem sinais de geração automática"}`;

  const examplesLink = `Exemplos (não repetir na saída):
Input válido:
"""
https://example.com/login?ref=promo
"""
Output válido:
{"author":"humano","risk":"médio","probability":0.55,"tags":["login","rastreamento"],"reason":"Parâmetros suspeitos e redirecionamento"}`;

  const examplesCodigo = `Exemplos (não repetir na saída):
Input válido:
"""
function hello(){return 1}
"""
Output válido:
{"author":"IA","risk":"baixo","probability":0.23,"tags":["estilo","simples"],"reason":"Trecho minimalista típico de exemplos gerados"}`;

  const examplesImagem = `Exemplos (não repetir na saída):
Input válido:
"""
https://site.com/banner.jpg
"""
Output válido:
{"author":"IA","risk":"médio","probability":0.48,"tags":["manipulação","texto embutido"],"reason":"Arte com elementos sintéticos e tipografia incomum"}`;

  const metaBlock = `Metadados:
${JSON.stringify(meta)}\n`;

  if (isImageUrl(text)) {
    return `\n${metaBlock}${base}\n\nTarefa específica: Analise a imagem referenciada e identifique indícios de fraude, phishing, manipulação gráfica ou textos suspeitos.\n${examplesImagem}\n\nEntrada:\n"""\n${text}\n"""\n\nResponda SOMENTE com um JSON válido conforme o esquema.`;
  }
  if (containsLink(text)) {
    return `\n${metaBlock}${base}\n\nTarefa específica: Analise links e indique se parecem confiáveis ou perigosos (phishing, fraude, rastreamento).\n${examplesLink}\n\nEntrada:\n"""\n${text}\n"""\n\nResponda SOMENTE com um JSON válido conforme o esquema.`;
  }
  if (isCodeSnippet(text)) {
    return `\n${metaBlock}${base}\n\nTarefa específica: Avalie se o trecho de código parece escrito por humano ou gerado por IA e riscos associados.\n${examplesCodigo}\n\nEntrada:\n"""\n${text}\n"""\n\nResponda SOMENTE com um JSON válido conforme o esquema.`;
  }
  return `\n${metaBlock}${base}\n\nTarefa específica: Analise o conteúdo textual e classifique autoria, risco e confiança, adicionando tags contextuais.\n${examplesTexto}\n\n${examplesTextoCurto}\n\nEntrada:\n"""\n${text}\n"""\n\nResponda SOMENTE com um JSON válido conforme o esquema.`;
}

module.exports = { isCodeSnippet, containsLink, isImageUrl, buildPrompt };

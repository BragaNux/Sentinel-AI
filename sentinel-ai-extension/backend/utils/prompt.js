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
  if (isImageUrl(text)) {
    return `\nVocê é um verificador de imagens. Analise a imagem apontada pelo link abaixo e identifique se há indícios de fraude, phishing, manipulação gráfica ou textos suspeitos.\n\nResponda SOMENTE com um JSON válido, sem markdown, com a estrutura exata:\n{\n  "author": "humano" ou "IA",\n  "risk": "baixo" | "médio" | "alto",\n  "probability": número entre 0 e 1,\n  "tags": ["..."],\n  "reason": "explicação curta técnica"\n}\n\nImagem:\n"""\n${text}\n"""\n`;
  }
  if (containsLink(text)) {
    return `\nVocê é um verificador de links de segurança. Analise o link (ou conjunto de links) abaixo e identifique se parecem confiáveis ou potencialmente perigosos.\n\nResponda SOMENTE com JSON válido, sem markdown, seguindo exatamente:\n{\n  "author": "humano" ou "IA",\n  "risk": "baixo" | "médio" | "alto",\n  "probability": número entre 0 e 1,\n  "tags": ["phishing", "fraude", "seguro", ...],\n  "reason": "explicação técnica curta"\n}\n\nConteúdo:\n"""\n${text}\n"""\n`;
  }
  if (isCodeSnippet(text)) {
    return `\nVocê é um analisador de código automatizado. Avalie se o trecho abaixo parece ter sido escrito por um humano ou gerado por uma IA.\n\nResponda SOMENTE com JSON válido, sem markdown, seguindo exatamente:\n{\n  "author": "IA" ou "humano",\n  "risk": "baixo" | "médio" | "alto",\n  "probability": número entre 0 e 1,\n  "tags": ["estilo", "plágio", "segurança", ...],\n  "reason": "explique em 1 frase técnica"\n}\n\nCódigo:\n"""\n${text}\n"""\n`;
  }
  return `\nVocê é um analisador de conteúdo automatizado. Analise o conteúdo a seguir e responda SOMENTE com JSON válido, sem markdown.\n\nFormato esperado:\n{\n  "author": "IA" ou "humano",\n  "risk": "baixo" | "médio" | "alto",\n  "probability": número entre 0 e 1,\n  "tags": ["..."],\n  "reason": "explicação curta em 1 frase"\n}\n\nConteúdo:\n"""\n${text}\n"""\n`;
}

module.exports = { isCodeSnippet, containsLink, isImageUrl, buildPrompt };

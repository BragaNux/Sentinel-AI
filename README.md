# Sentinel AI — Guia de Apresentação e Uso

Extensão MV3 para verificar autoria e risco de conteúdo (texto, links, imagens) com um backend local. Ideal para demonstrar em aula com um fluxo simples, visual e técnico.

## Visão Rápida

- Analisa conteúdo e retorna `author`, `risk`, `probability`, `tags`, `reason`.
- Popup com histórico, exportação CSV e ações rápidas.
- Backend Node/Express com Swagger e suporte a Gemini/Ollama.

## Pré‑requisitos

- Navegador baseado em Chromium (Chrome, Edge, Brave)
- Docker Desktop ou Node.js 18+
- Chave `GEMINI_API_KEY` (opcional se usar modelo local via Ollama)

## Backend (Docker)

1. Crie `.env` em `sentinel-ai-extension/backend/` com:
   - `GEMINI_API_KEY=<sua_key>`
   - `MODEL_PROVIDER=gemini` (ou `ollama`)
   - `GEMINI_MODEL=gemini-2.5-pro-exp-03-25`
   - `GEMINI_TEMPERATURE=0.2`
   - `GEMINI_MAX_TOKENS=256`
   - `REQUIRE_API_KEY=false`
2. Construa e rode:
   - `cd sentinel-ai-extension/backend/`
   - `docker build -t sentinel-backend .`
   - `docker run -p 3000:3000 --env-file .env sentinel-backend`

Referência detalhada: `backend/docs/DOCKER.md`.

## Backend (Node)

1. `cd sentinel-ai-extension/backend/`
2. `npm install`
3. `.env` igual ao exemplo acima
4. `npm start`

## Instalar a Extensão

1. Abra `chrome://extensions`
2. Ative o modo desenvolvedor
3. Clique em `Carregar sem compactação`
4. Selecione `sentinel-ai-extension/extension/`

## Como Usar

- `Botão direito → Analisar com Sentinel IA` em texto/link/imagem
- `Popup → Analisar URL atual` (captura a aba ativa)
- `Popup → Reanalisar` (usa o último texto armazenado)
- `Histórico` com filtro por tipo e detalhes no overlay
- `Exportar CSV` para compartilhar resultados

## Roteiro de Apresentação (5–7 min)

- Contexto: checagem de autoria e segurança de conteúdo acadêmico
- Demonstração:
  - Abrir popup e analisar um parágrafo colado manualmente
  - Clicar em `Analisar URL` em uma notícia para ver risco e tags
  - Abrir `Histórico`, mostrar detalhes, copiar JSON e exportar CSV
- Técnica:
  - Prompt estruturado, baixa temperatura e fallback de modelos
  - Logs e rate limiting no backend

## Endpoints Principais

- `GET /health` — status
- `GET /models` — provedor/modelo
- `GET /config` — parâmetros expostos
- `GET /audit/logs` — últimas linhas
- `POST /analyze` — `{ text }`
- `POST /analyze/text` — `{ text }`
- `POST /analyze/url` — `{ url }`
- `POST /analyze/code` — `{ code }`
- `POST /analyze/batch` — `{ items: [...] }`

Swagger: `http://localhost:3000/docs` — `http://localhost:3000/swagger.json`

## Fluxo Interno

- Extensão envia para `http://localhost:3000/analyze`
- Backend aplica prompt e chama Gemini/Ollama
- UI renderiza JSON com origem, risco, confiança, tags e justificativa

## Troubleshooting

- Porta em uso: troque `-p 3000:3000`
- `Gemini 404`: ajuste `GEMINI_MODEL`; há fallback automático
- Sem chave: defina `GEMINI_API_KEY` ou use `MODEL_PROVIDER=ollama`
- Verifique saúde: `GET /health`

## Segurança

- Chaves em `.env` e nunca no frontend
- Logs em `backend/audit.log`

## Licença

MIT — pode usar, modificar e compartilhar

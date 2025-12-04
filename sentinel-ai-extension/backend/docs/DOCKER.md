# Guia de Deploy no Docker — Sentinel AI Backend

## Pré‑requisitos
- Docker Desktop instalado e em execução
- Arquivo `.env` no diretório `backend/` com:
  - `GEMINI_API_KEY=<sua_key>`
  - `MODEL_PROVIDER=gemini`
  - `GEMINI_MODEL=gemini-2.5-pro-exp-03-25`
  - `GEMINI_TEMPERATURE=0.2`
  - `GEMINI_MAX_TOKENS=256`
  - `REQUIRE_API_KEY=false`

## Build da imagem
```bash
cd sentinel-ai-extension/backend
docker build -t sentinel-backend .
```

## Subir o container
```bash
docker run --name sentinel-backend -p 3000:3000 --env-file .env sentinel-backend
```

## Verificar serviço
- Health: `http://localhost:3000/health`
- Swagger UI: `http://localhost:3000/docs`
- OpenAPI: `http://localhost:3000/swagger.json`

### Testes rápidos (PowerShell/Windows)
```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:3000/health | Select-Object -Expand Content

Invoke-WebRequest -UseBasicParsing http://localhost:3000/docs | Select-Object -Expand RawContent

$body = '{"text":"A Revolução Francesa teve início em 1789..."}'
Invoke-RestMethod -Method Post -Uri http://localhost:3000/analyze -ContentType 'application/json' -Body $body
```

### Testes rápidos (curl)
```bash
curl http://localhost:3000/health

curl -X POST http://localhost:3000/analyze \
  -H 'Content-Type: application/json' \
  -d '{"text":"A Revolução Francesa teve início em 1789..."}'

curl -X POST http://localhost:3000/analyze/url \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com/noticia"}'

curl -X POST http://localhost:3000/analyze/code \
  -H 'Content-Type: application/json' \
  -d '{"code":"function hello(){return 1}"}'

curl -X POST http://localhost:3000/analyze/batch \
  -H 'Content-Type: application/json' \
  -d '{"items":[{"text":"um texto"},{"url":"https://exemplo.com"},{"code":"print(1)"}]}'
```

## Logs e ciclo de vida
```bash
docker logs -f sentinel-backend        # acompanhar logs
docker rm -f sentinel-backend          # parar e remover container
```

## Segurança e API Key (opcional)
- No `.env`, defina `REQUIRE_API_KEY=true` e `SENTINEL_API_KEY=<sua_chave_cliente>`
- Envie o header `x-api-key` nas requisições:
```bash
curl -X POST http://localhost:3000/analyze \
  -H 'Content-Type: application/json' \
  -H 'x-api-key: SUA_CHAVE CLIENTE' \
  -d '{"text":"conteúdo"}'
```

## Parametrização do modelo
- Ajuste `GEMINI_MODEL`, `GEMINI_TEMPERATURE` (0.0–0.3 para análise), `GEMINI_MAX_TOKENS` no `.env`.

## Troubleshooting
- Porta em uso: altere `-p 3000:3000` para uma porta livre
- `.env` ausente: crie o arquivo e reexecute com `--env-file .env`
- Chave inválida: verifique `GEMINI_API_KEY` e cotas no Google Cloud

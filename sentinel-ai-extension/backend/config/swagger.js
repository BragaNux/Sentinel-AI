const spec = {
  openapi: '3.0.0',
  info: { title: 'Sentinel AI Backend', version: '1.0.0', description: 'API para análise de conteúdo com Gemini' },
  servers: [{ url: 'http://localhost:3000' }],
  paths: {
    '/health': { get: { summary: 'Status de saúde', responses: { '200': { description: 'OK' } } } },
    '/audit/logs': { get: { summary: 'Últimas linhas do log de auditoria', responses: { '200': { description: 'Texto' } } } },
    '/models': { get: { summary: 'Modelo e provedor atual', responses: { '200': { description: 'Configuração' } } } },
    '/config': { get: { summary: 'Parâmetros de backend seguros', responses: { '200': { description: 'Config' } } } },
    '/analyze': { post: { summary: 'Analisar conteúdo (genérico)', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } } } }, responses: { '200': { description: 'Resultado JSON' }, '400': { description: 'Entrada inválida' } } } },
    '/analyze/text': { post: { summary: 'Analisar texto', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } } } }, responses: { '200': { description: 'Resultado JSON' } } } },
    '/analyze/url': { post: { summary: 'Analisar URL', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { url: { type: 'string', format: 'uri' } }, required: ['url'] } } } }, responses: { '200': { description: 'Resultado JSON' } } } },
    '/analyze/code': { post: { summary: 'Analisar código', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { code: { type: 'string' } }, required: ['code'] } } } }, responses: { '200': { description: 'Resultado JSON' } } } },
    '/analyze/batch': { post: { summary: 'Analisar múltiplos conteúdos', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { items: { type: 'array', items: { type: 'object', properties: { text: { type: 'string' }, url: { type: 'string' }, code: { type: 'string' } } } } }, required: ['items'] } } } }, responses: { '200': { description: 'Array de resultados' } } } }
  }
};

module.exports = spec;

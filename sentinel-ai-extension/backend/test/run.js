const assert = require('assert');
const { buildPrompt, isImageUrl } = require('../utils/prompt');

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

function run() {
  testPromptLink();
  testPromptCode();
  testPromptImage();
  console.log('OK');
}

run();

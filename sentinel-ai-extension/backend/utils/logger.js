const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, '..', 'audit.log');

function writeLine(obj) {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...obj }) + '\n';
  fs.appendFile(logFile, line, () => {});
}

function info(message, meta) {
  const payload = { level: 'info', message, meta };
  console.log(JSON.stringify(payload));
  writeLine(payload);
}

function error(message, meta) {
  const payload = { level: 'error', message, meta };
  console.error(JSON.stringify(payload));
  writeLine(payload);
}

function audit(event, meta) {
  writeLine({ level: 'audit', event, meta });
}

module.exports = { info, error, audit };

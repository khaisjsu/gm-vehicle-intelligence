const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const server = spawn(process.execPath, ['server.js'], { cwd: __dirname + '/..', env: { ...process.env, PORT: '4176' } });
test.after(() => server.kill());
test('query returns grounded citation', async () => { await new Promise(r => setTimeout(r, 150)); const res = await fetch('http://localhost:4176/api/query',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query:'What happens above 55 C?'})}); const data=await res.json(); assert.match(data.answer,/controlled shutdown/i); assert.equal(data.citations[0].id,'doc-001'); });
test('evaluation suite passes', async () => { const res=await fetch('http://localhost:4176/api/evaluate',{method:'POST'}); const data=await res.json(); assert.equal(data.pass_rate,1); });

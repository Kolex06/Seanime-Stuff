const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { stripTypeScriptTypes } = require('node:module');
process.env.TZ = 'Europe/Oslo';
const source = fs.readFileSync(process.argv[2] || path.join(__dirname, 'provider.ts'), 'utf8');
new vm.Script(stripTypeScriptTypes(source));
const helpers = source.slice(source.indexOf('function readableLogTimestamp'), source.indexOf('// @ts-ignore'));
const ctx = vm.createContext({ Date, Number });
vm.runInContext(stripTypeScriptTypes(helpers), ctx);
assert.equal(ctx.readableLogLine('2026-10-04T00:59:22 | Success | Token valid'),
  '04 Oct 2026, 02:59:22 (UTC+02:00) | Success | Token valid');
assert.equal(ctx.readableLogLine('2026-01-04T00:59:22 | Success | Token valid'),
  '04 Jan 2026, 01:59:22 (UTC+01:00) | Success | Token valid');
assert.equal(ctx.readableLogLine('04 Oct 2026, 02:59:22 (UTC+02:00) | Success | Token valid'),
  '04 Oct 2026, 02:59:22 (UTC+02:00) | Success | Token valid');
assert.equal(ctx.tokenCheckFailure({ message: 'lookup: no such host' }).level, 'Warning');
assert.equal(ctx.tokenCheckFailure({ message: 'timeout' }).level, 'Warning');
assert.equal(ctx.tokenCheckFailure({ status: 503, message: 'Unavailable' }).level, 'Warning');
assert.equal(ctx.tokenCheckFailure({ status: 401, message: 'Unauthorized' }).status, 'Please sign in again');
console.log('PASS: old/new timestamps, local timezone, DST, and network versus authentication errors');

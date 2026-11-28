// Kiro hook helper: runs checks and reports the result to the agent. It never edits files.
//
//   node .kiro/hooks/run-tests.mjs task            type check + all tests (PostTaskExec)
//   node .kiro/hooks/run-tests.mjs related <file>  tests for one saved file (PostFileSave)
//
// Exit 0: passed, or nothing to check. A one-line summary goes to stdout, which Kiro adds to the
//         agent's context. Files outside src/core and tests produce no output at all.
// Exit 1: failed. The end of the tool output goes to stderr, which Kiro sends to the agent.
//         (Vitest prints results to stdout, so a plain `npm test` hook would hide the details.)

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MAX_OUTPUT_CHARS = 6000;
const VITEST = path.join(repoRoot, 'node_modules', 'vitest', 'vitest.mjs');
const TSC = path.join(repoRoot, 'node_modules', 'typescript', 'bin', 'tsc');

function fail(message) {
  process.stderr.write(`[run-tests] ${message}\n`);
  process.exit(1);
}

function run(label, script, args) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
    timeout: 110_000,
  });
  const output = result.error
    ? String(result.error)
    : `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
  return { label, ok: result.status === 0, output };
}

function report(results) {
  const failed = results.filter((r) => !r.ok);
  if (failed.length === 0) {
    process.stdout.write(`[run-tests] Passed: ${results.map((r) => r.label).join(', ')}.\n`);
    process.exit(0);
  }
  for (const r of failed) {
    const out =
      r.output.length > MAX_OUTPUT_CHARS ? `...\n${r.output.slice(-MAX_OUTPUT_CHARS)}` : r.output;
    process.stderr.write(`[run-tests] ${r.label} failed:\n${out}\n\n`);
  }
  process.exit(1);
}

// The saved file comes from {{filePath}} in the hook command. If Kiro didn't substitute it,
// fall back to the JSON payload on stdin (its field name isn't documented, so try a few).
function savedFile() {
  const arg = process.argv[3];
  if (arg && !arg.includes('{{')) return arg;
  try {
    const payload = JSON.parse(readFileSync(0, 'utf8'));
    const candidates = [
      payload.file_path,
      payload.filePath,
      payload.path,
      payload.file,
      payload.tool_input?.path,
    ];
    return candidates.find((v) => typeof v === 'string' && v.length > 0) ?? null;
  } catch {
    return null;
  }
}

function requireDeps() {
  if (!existsSync(VITEST) || !existsSync(TSC)) fail('Dependencies are missing. Run `npm install`.');
}

const mode = process.argv[2];

if (mode === 'task') {
  requireDeps();
  report([run('type check', TSC, ['--noEmit', '-p', 'tsconfig.json']), run('tests', VITEST, ['run'])]);
} else if (mode === 'related') {
  const file = savedFile();
  if (!file) process.exit(0);
  const rel = path.relative(repoRoot, path.resolve(repoRoot, file)).split(path.sep).join('/');
  if (!/^(src\/core|tests)\/.+\.ts$/.test(rel)) process.exit(0);
  requireDeps();
  const args = rel.endsWith('.test.ts')
    ? ['run', rel]
    : ['related', '--run', '--passWithNoTests', rel];
  report([run(`tests for ${rel}`, VITEST, args)]);
} else {
  fail('Usage: node .kiro/hooks/run-tests.mjs task | related <file>');
}

// Kiro PreToolUse hook: blocks Kiro file edits outside the current user's paths.
// Map: .kiro/ownership.json. Current user: `git config user.name`, matched against members[].gitNames.
// Exit 0 allows the tool call. Exit 2 blocks it, and stderr is sent back to Kiro.
// Any unexpected error also exits 2, so a broken guard fails closed.
// The last payload and decision are written to <system temp>/tombspad-scope-guard.log for debugging.

import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const mapFile = path.join(repoRoot, '.kiro', 'ownership.json');
const logFile = path.join(tmpdir(), 'tombspad-scope-guard.log');

// Argument names that hold a file path in Kiro's file tools
// (fs_write/fs_append/str_replace: path, delete_file: targetFile, smart_relocate: sourcePath/destinationPath).
const PATH_KEYS = ['path', 'targetFile', 'sourcePath', 'destinationPath', 'file_path', 'filePath'];
const SHARED = Symbol('shared');

let rawPayload = '';

function writeLog(decision, message) {
  try {
    const entry = { time: new Date().toISOString(), decision, message, payload: rawPayload.slice(0, 4000) };
    writeFileSync(logFile, JSON.stringify(entry, null, 2));
  } catch {
    // Logging is best effort.
  }
}

function allow(message) {
  writeLog('allow', message);
  process.exit(0);
}

function block(message) {
  writeLog('block', message);
  process.stderr.write(`[scope-guard] ${message}\n`);
  process.exit(2);
}

const normalize = (p) => (process.platform === 'win32' ? p.toLowerCase() : p);

function currentMember(map) {
  let gitName = '';
  try {
    gitName = execFileSync('git', ['config', 'user.name'], { cwd: repoRoot, encoding: 'utf8' }).trim();
  } catch {
    // Handled below as an unknown user.
  }
  for (const [member, info] of Object.entries(map.members ?? {})) {
    if ((info.gitNames ?? []).some((n) => n.toLowerCase() === gitName.toLowerCase())) {
      return { member, gitName };
    }
  }
  return { member: null, gitName };
}

// Returns a repo-relative POSIX path, or null if the target is outside the repo.
function toRepoPath(target, cwd) {
  const rel = path.relative(repoRoot, path.resolve(cwd, target));
  if (rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) return null;
  return rel.split(path.sep).join('/');
}

function ownerOf(rel, map) {
  const r = normalize(rel);
  const rules = [
    ...Object.entries(map.paths ?? {}).map(([p, owner]) => ({ p, owner })),
    ...(map.shared ?? []).map((p) => ({ p, owner: SHARED })),
  ];
  let best = null;
  for (const rule of rules) {
    const p = normalize(rule.p);
    const hit = p.endsWith('/') ? r.startsWith(p) || `${r}/` === p : r === p;
    if (hit && (best === null || p.length > best.length)) best = { length: p.length, owner: rule.owner };
  }
  return best ? best.owner : map.defaultOwner;
}

function main() {
  rawPayload = readFileSync(0, 'utf8');
  const payload = JSON.parse(rawPayload);
  let input = payload.tool_input ?? {};
  if (typeof input === 'string') input = JSON.parse(input);

  const targets = PATH_KEYS.map((k) => input[k]).filter((v) => typeof v === 'string' && v.length > 0);
  if (targets.length === 0) {
    block(
      `No file path found in tool_input for tool "${payload.tool_name}". ` +
        `See ${logFile} and add the right key to PATH_KEYS in .kiro/hooks/scope-guard.mjs.`,
    );
  }

  const map = JSON.parse(readFileSync(mapFile, 'utf8'));
  const { member, gitName } = currentMember(map);
  if (!member) {
    block(
      `git config user.name "${gitName}" is not listed in members[].gitNames in .kiro/ownership.json. ` +
        `Ask nabotz to add it. File edits in this repo are blocked until then.`,
    );
  }

  const cwd = typeof payload.cwd === 'string' && payload.cwd ? payload.cwd : repoRoot;
  for (const target of targets) {
    const rel = toRepoPath(target, cwd);
    if (rel === null) continue; // Outside the repo, e.g. personal steering in ~/.kiro.
    const owner = ownerOf(rel, map);
    if (owner === SHARED || owner === member) continue;
    block(
      `${rel} belongs to ${owner}, not ${member}. Do not edit it. ` +
        `Tell the user, and write the proposed change in the chat so they can pass it to ${owner}. ` +
        `Map: .kiro/ownership.json.`,
    );
  }

  allow(`${member}: ${targets.join(', ')}`);
}

try {
  main();
} catch (err) {
  block(`Guard error, edit blocked to be safe: ${err instanceof Error ? err.message : String(err)}`);
}

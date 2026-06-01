// src/cli-scanner.ts
// Standalone CLI invoked by the git pre-commit hook
// Usage: node dist/cli-scanner.js <file1> <file2> ...

import * as fs from 'fs';
import { scanFile } from './scanner';

const files = process.argv.slice(2);

if (files.length === 0) {
  process.exit(0);
}

let hasError = false;

for (const filePath of files) {
  let content = '';

  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    // Binary file or unreadable — scan filename only
  }

  const results = scanFile(filePath, content);

  if (results.length === 0) continue;

  for (const result of results) {
    const redacted =
      result.matchedValue.length > 8
        ? result.matchedValue.substring(0, 4) + '****' + result.matchedValue.slice(-4)
        : '****';

    const icon = result.severity === 'error' ? '❌' : '⚠️';
    const location = result.line > 0 ? `:${result.line}` : '';

    console.error(
      `${icon} [SecretGuard] ${result.severity.toUpperCase()} — ${result.ruleName}\n` +
      `   File: ${filePath}${location}\n` +
      `   Match: ${redacted}\n` +
      (result.remediationUrl ? `   Rotate at: ${result.remediationUrl}\n` : '')
    );

    if (result.severity === 'error') hasError = true;
  }
}

process.exit(hasError ? 1 : 0);

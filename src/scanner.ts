// src/scanner.ts
// Core detection engine — no VSCode dependencies (pure Node.js)
// This file is also used by the CLI scanner invoked from the git hook.

import { CONTENT_RULES } from './rules/contentRules';
import { FILE_RULES } from './rules/fileRules';
import { isHighEntropy, shannonEntropy } from './rules/entropyCheck';
import * as path from 'path';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScanResult {
  filePath: string;
  line: number;         // 1-indexed; 0 means filename-level finding
  column: number;
  ruleId: string;
  ruleName: string;
  severity: 'error' | 'warning';
  message: string;
  matchedValue: string; // actual matched text (redacted in UI)
  entropy?: number;
  remediationUrl?: string;
  isFalsePositive?: boolean;
}

export interface ScanOptions {
  entropyThreshold?: number;
  maxFileSizeKb?: number;
  ignorePatterns?: string[];
}

// ─── Filename Scanner ──────────────────────────────────────────────────────────

/**
 * Checks a file's basename against the file rule list.
 * Returns findings even if the file is empty / binary.
 */
export function scanFilename(filePath: string): ScanResult[] {
  const results: ScanResult[] = [];
  const basename = path.basename(filePath);

  for (const rule of FILE_RULES) {
    if (rule.pattern.test(basename)) {
      results.push({
        filePath,
        line: 0,
        column: 0,
        ruleId: rule.id,
        ruleName: rule.name,
        severity: rule.severity,
        message: `Sensitive file detected: ${rule.description}. This file should NOT be committed.`,
        matchedValue: basename
      });
    }
  }

  return results;
}

// ─── Content Scanner ───────────────────────────────────────────────────────────

/**
 * Scans file content line-by-line against all content rules.
 * Applies entropy checks and false-positive heuristics.
 */
export function scanContent(
  filePath: string,
  content: string,
  opts: ScanOptions = {}
): ScanResult[] {
  const results: ScanResult[] = [];
  const lines = content.split('\n');
  const threshold = opts.entropyThreshold ?? 3.5;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];

    // Skip common comment lines to reduce false positives
    const trimmed = line.trimStart();
    if (
      trimmed.startsWith('//') ||
      trimmed.startsWith('#') ||
      trimmed.startsWith('*') ||
      trimmed.startsWith('<!--')
    ) {
      continue;
    }

    for (const rule of CONTENT_RULES) {
      // Reset lastIndex for global-flagged regexes
      rule.pattern.lastIndex = 0;

      const match = rule.pattern.exec(line);
      if (!match) continue;

      const capturedValue: string = match[rule.captureGroup] ?? match[0];
      if (!capturedValue) continue;

      // Entropy gate
      let entropy: number | undefined;
      if (rule.entropyCheck) {
        entropy = shannonEntropy(capturedValue);
        if (entropy < (rule.entropyThreshold ?? threshold)) continue;
      }

      // False positive suppression
      const lowerLine = line.toLowerCase();
      const isFalsePositive = (rule.falsePositiveHints ?? []).some(hint =>
        lowerLine.includes(hint.toLowerCase())
      );

      // Redact: show first 4 + last 4 chars only
      const redacted =
        capturedValue.length > 8
          ? capturedValue.substring(0, 4) + '****' + capturedValue.slice(-4)
          : '****';

      results.push({
        filePath,
        line: lineIdx + 1,
        column: match.index,
        ruleId: rule.id,
        ruleName: rule.name,
        severity: isFalsePositive ? 'warning' : rule.severity,
        message: `[${rule.name}] Possible secret detected: \`${redacted}\`${entropy !== undefined ? ` (entropy: ${entropy.toFixed(2)})` : ''}`,
        matchedValue: capturedValue,
        entropy,
        remediationUrl: rule.remediationUrl,
        isFalsePositive
      });
    }
  }

  return results;
}

// ─── Combined Scanner ──────────────────────────────────────────────────────────

/**
 * Full file scan: filename check + content check.
 */
export function scanFile(
  filePath: string,
  content: string,
  opts: ScanOptions = {}
): ScanResult[] {
  return [
    ...scanFilename(filePath),
    ...scanContent(filePath, content, opts)
  ];
}

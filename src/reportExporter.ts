// src/reportExporter.ts
// Exports scan results as HTML or JSON report

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ScanResult } from './scanner';

export async function exportReport(results: ScanResult[]): Promise<void> {
  const format = await vscode.window.showQuickPick(['HTML Report', 'JSON Report'], {
    placeHolder: 'Choose export format'
  });

  if (!format) return;

  const uri = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.file(
      path.join(
        vscode.workspace.workspaceFolders?.[0].uri.fsPath ?? process.cwd(),
        `secretguard-report-${Date.now()}.${format === 'HTML Report' ? 'html' : 'json'}`
      )
    ),
    filters:
      format === 'HTML Report'
        ? { 'HTML Files': ['html'] }
        : { 'JSON Files': ['json'] }
  });

  if (!uri) return;

  const content =
    format === 'HTML Report' ? generateHtml(results) : generateJson(results);

  fs.writeFileSync(uri.fsPath, content, 'utf8');

  const action = await vscode.window.showInformationMessage(
    `✅ SecretGuard: Report saved to ${path.basename(uri.fsPath)}`,
    'Open Report'
  );

  if (action === 'Open Report') {
    await vscode.env.openExternal(uri);
  }
}

// ─── HTML Generator ────────────────────────────────────────────────────────────

function generateHtml(results: ScanResult[]): string {
  const errors = results.filter(r => r.severity === 'error');
  const warnings = results.filter(r => r.severity === 'warning');
  const timestamp = new Date().toISOString();

  const rows = results
    .map(r => {
      const redacted =
        r.matchedValue.length > 8
          ? r.matchedValue.substring(0, 4) + '****' + r.matchedValue.slice(-4)
          : '****';
      return `
      <tr class="${r.severity}">
        <td class="sev ${r.severity}">${r.severity.toUpperCase()}</td>
        <td>${escapeHtml(r.ruleName)}</td>
        <td class="path">${escapeHtml(r.filePath)}</td>
        <td>${r.line > 0 ? r.line : 'filename'}</td>
        <td><code>${escapeHtml(redacted)}</code></td>
        <td>${r.remediationUrl ? `<a href="${r.remediationUrl}" target="_blank">Rotate →</a>` : '—'}</td>
      </tr>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SecretGuard Scan Report</title>
  <style>
    :root {
      --bg: #0d1117;
      --surface: #161b22;
      --border: #30363d;
      --text: #e6edf3;
      --muted: #8b949e;
      --error: #f85149;
      --warning: #e3b341;
      --success: #3fb950;
      --accent: #58a6ff;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 2rem; }
    h1 { font-size: 1.8rem; margin-bottom: 0.25rem; }
    .subtitle { color: var(--muted); margin-bottom: 2rem; font-size: 0.9rem; }
    .stats { display: flex; gap: 1.5rem; margin-bottom: 2rem; }
    .stat { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 1rem 1.5rem; }
    .stat .label { font-size: 0.75rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .stat .value { font-size: 2rem; font-weight: 700; margin-top: 0.25rem; }
    .stat.error .value { color: var(--error); }
    .stat.warning .value { color: var(--warning); }
    .stat.total .value { color: var(--accent); }
    table { width: 100%; border-collapse: collapse; background: var(--surface); border-radius: 8px; overflow: hidden; border: 1px solid var(--border); }
    th { background: #21262d; color: var(--muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; padding: 0.75rem 1rem; text-align: left; }
    td { padding: 0.75rem 1rem; border-top: 1px solid var(--border); font-size: 0.875rem; vertical-align: middle; }
    .sev { font-weight: 700; font-size: 0.7rem; letter-spacing: 0.05em; }
    .sev.error { color: var(--error); }
    .sev.warning { color: var(--warning); }
    .path { font-family: monospace; font-size: 0.8rem; color: var(--muted); word-break: break-all; }
    code { background: #21262d; padding: 0.2em 0.4em; border-radius: 4px; font-family: monospace; }
    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }
    tr.error { background: rgba(248, 81, 73, 0.04); }
    tr.warning { background: rgba(227, 179, 65, 0.04); }
    .footer { margin-top: 2rem; color: var(--muted); font-size: 0.8rem; }
  </style>
</head>
<body>
  <h1>🛡️ SecretGuard Scan Report</h1>
  <p class="subtitle">Generated: ${timestamp}</p>

  <div class="stats">
    <div class="stat total">
      <div class="label">Total Findings</div>
      <div class="value">${results.length}</div>
    </div>
    <div class="stat error">
      <div class="label">Errors</div>
      <div class="value">${errors.length}</div>
    </div>
    <div class="stat warning">
      <div class="label">Warnings</div>
      <div class="value">${warnings.length}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Severity</th>
        <th>Rule</th>
        <th>File</th>
        <th>Line</th>
        <th>Matched Value</th>
        <th>Remediation</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="6" style="text-align:center;color:var(--success)">✓ No findings</td></tr>'}
    </tbody>
  </table>

  <p class="footer">SecretGuard — Production-grade secret detection for VSCode</p>
</body>
</html>`;
}

// ─── JSON Generator ────────────────────────────────────────────────────────────

function generateJson(results: ScanResult[]): string {
  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      total: results.length,
      errors: results.filter(r => r.severity === 'error').length,
      warnings: results.filter(r => r.severity === 'warning').length
    },
    findings: results.map(r => ({
      ...r,
      // Redact the actual matched value in the JSON too
      matchedValue:
        r.matchedValue.length > 8
          ? r.matchedValue.substring(0, 4) + '****' + r.matchedValue.slice(-4)
          : '****'
    }))
  };

  return JSON.stringify(report, null, 2);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

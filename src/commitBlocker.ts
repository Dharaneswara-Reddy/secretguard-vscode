// src/commitBlocker.ts
// Shows a Y/N modal when a secret is detected and the user tries to commit

import * as vscode from 'vscode';
import { ScanResult } from './scanner';

/**
 * Shows a blocking modal warning the user about detected secrets.
 * Returns true if the user chose to proceed (bypass), false to abort.
 */
export async function showCommitBlocker(results: ScanResult[]): Promise<boolean> {
  const errors = results.filter(r => r.severity === 'error');
  const warnings = results.filter(r => r.severity === 'warning');

  const lines = [
    `**SecretGuard detected ${results.length} issue(s) in staged files:**`,
    '',
    errors.length > 0
      ? `🔴 ${errors.length} error(s) — HIGH RISK secrets (API keys, private keys, tokens)`
      : '',
    warnings.length > 0
      ? `🟡 ${warnings.length} warning(s) — potential secrets or sensitive files`
      : '',
    '',
    'Top findings:',
    ...results.slice(0, 3).map(
      r =>
        `• [${r.severity.toUpperCase()}] ${r.ruleName} in ${r.filePath.split('/').pop() ?? r.filePath}${r.line > 0 ? `:${r.line}` : ' (filename)'}`
    ),
    results.length > 3 ? `  …and ${results.length - 3} more` : ''
  ]
    .filter(l => l !== '')
    .join('\n');

  const config = vscode.workspace.getConfiguration('secretguard');
  const allowBypass = config.get<boolean>('allowBypass') ?? true;

  const options = allowBypass
    ? ['🚫 Abort Commit (Recommended)', '⚠️ Commit Anyway', 'View Findings']
    : ['🚫 Abort Commit', 'View Findings'];

  const choice = await vscode.window.showWarningMessage(
    lines,
    { modal: true },
    ...options
  );

  if (choice === '⚠️ Commit Anyway') {
    return true; // user bypassed
  }

  if (choice === 'View Findings') {
    await vscode.commands.executeCommand('secretguard.showFindings');
  }

  return false; // abort
}

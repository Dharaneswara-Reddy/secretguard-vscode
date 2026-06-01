// src/historyScanner.ts
// Scans the git commit history for already-committed secrets

import * as vscode from 'vscode';
import { execSync } from 'child_process';
import { scanContent, ScanResult } from './scanner';
import { DiagnosticsManager } from './diagnostics';

export interface HistoryFinding {
  commitHash: string;
  commitDate: string;
  author: string;
  findings: ScanResult[];
}

const MAX_COMMITS = 500;

export async function scanHistory(
  _diagnosticsManager: DiagnosticsManager
): Promise<void> {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
  if (!workspaceRoot) {
    vscode.window.showErrorMessage('SecretGuard: No workspace folder open.');
    return;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'SecretGuard: Scanning git history…',
      cancellable: true
    },
    async (progress, token) => {
      try {
        const log = execSync(
          `git log --oneline -${MAX_COMMITS} --format="%H|%ai|%an"`,
          { cwd: workspaceRoot, encoding: 'utf8' }
        );

        const commits = log.trim().split('\n').filter(Boolean);
        const historyFindings: HistoryFinding[] = [];

        for (let i = 0; i < commits.length; i++) {
          if (token.isCancellationRequested) break;

          progress.report({
            increment: (1 / commits.length) * 100,
            message: `Commit ${i + 1}/${commits.length}`
          });

          const [hash, date, author] = commits[i].split('|');
          if (!hash) continue;

          try {
            const diff = execSync(
              `git show ${hash} --unified=0`,
              { cwd: workspaceRoot, encoding: 'utf8', maxBuffer: 1024 * 1024 * 5 }
            );

            // Only scan lines that were *added* in this commit
            const addedContent = diff
              .split('\n')
              .filter(l => l.startsWith('+') && !l.startsWith('+++'))
              .map(l => l.slice(1))
              .join('\n');

            const findings = scanContent(`git:${hash}`, addedContent);

            if (findings.length > 0) {
              historyFindings.push({
                commitHash: hash,
                commitDate: date ?? '',
                author: author ?? 'Unknown',
                findings
              });
            }
          } catch {
            // Binary commit or merge commit — skip
          }
        }

        const totalFindings = historyFindings.reduce(
          (sum, h) => sum + h.findings.length,
          0
        );

        if (totalFindings === 0) {
          vscode.window.showInformationMessage(
            '✅ SecretGuard: No secrets found in git history.'
          );
          return;
        }

        const result = await vscode.window.showWarningMessage(
          `🚨 SecretGuard: Found ${totalFindings} secret(s) in ${historyFindings.length} commit(s). These need to be purged from git history!`,
          'Export Report',
          'View Purge Guide',
          'Dismiss'
        );

        if (result === 'View Purge Guide') {
          await vscode.env.openExternal(
            vscode.Uri.parse(
              'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository'
            )
          );
        }

        if (result === 'Export Report') {
          const { exportReport } = await import('./reportExporter');
          await exportReport(historyFindings.flatMap(h => h.findings));
        }
      } catch (err) {
        vscode.window.showErrorMessage(
          'SecretGuard: Could not read git history. Make sure you are in a git repository.'
        );
      }
    }
  );
}

// src/gitignoreHelper.ts
// Suggests .gitignore additions for flagged sensitive files

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ScanResult } from './scanner';

export async function addFlaggedToGitignore(
  results: ScanResult[]
): Promise<void> {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
  if (!workspaceRoot) {
    vscode.window.showErrorMessage('SecretGuard: No workspace folder open.');
    return;
  }

  // Collect unique file-level findings (line: 0 = filename rule)
  const sensitiveFiles = [
    ...new Set(
      results
        .filter(r => r.line === 0) // filename-level findings only
        .map(r => path.relative(workspaceRoot, r.filePath))
        .filter(Boolean)
    )
  ];

  if (sensitiveFiles.length === 0) {
    vscode.window.showInformationMessage(
      'SecretGuard: No sensitive filenames to add — only content-level findings were found.'
    );
    return;
  }

  const gitignorePath = path.join(workspaceRoot, '.gitignore');

  // Read existing .gitignore
  let existing = '';
  if (fs.existsSync(gitignorePath)) {
    existing = fs.readFileSync(gitignorePath, 'utf8');
  }

  const existingLines = new Set(
    existing.split('\n').map(l => l.trim()).filter(Boolean)
  );

  const toAdd = sensitiveFiles.filter(f => !existingLines.has(f));

  if (toAdd.length === 0) {
    vscode.window.showInformationMessage(
      'SecretGuard: All flagged files are already in .gitignore.'
    );
    return;
  }

  // Ask the user to confirm
  const confirm = await vscode.window.showWarningMessage(
    `SecretGuard: Add ${toAdd.length} sensitive file(s) to .gitignore?\n${toAdd.slice(0, 5).join(', ')}${toAdd.length > 5 ? '…' : ''}`,
    { modal: true },
    'Add to .gitignore',
    'Cancel'
  );

  if (confirm !== 'Add to .gitignore') return;

  const block =
    '\n# SecretGuard — auto-added sensitive files\n' +
    toAdd.join('\n') +
    '\n';

  fs.writeFileSync(
    gitignorePath,
    existing.endsWith('\n') ? existing + block : existing + '\n' + block
  );

  vscode.window.showInformationMessage(
    `✅ SecretGuard: Added ${toAdd.length} file(s) to .gitignore.`
  );
}

// src/hookManager.ts
// Installs/uninstalls the SecretGuard pre-commit git hook

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import * as os from 'os';

const MARKER = '# SecretGuard managed hook — do not remove this line';

export class HookManager {
  private getGitHooksDir(): string | null {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) return null;

    const gitHooksDir = path.join(
      folders[0].uri.fsPath,
      '.git',
      'hooks'
    );

    if (!fs.existsSync(gitHooksDir)) return null;
    return gitHooksDir;
  }

  /** Returns the path to the pre-commit hook file, or null if no .git dir. */
  private getHookPath(): string | null {
    const dir = this.getGitHooksDir();
    if (!dir) return null;
    return path.join(dir, 'pre-commit');
  }

  /**
   * Install the SecretGuard pre-commit hook.
   * If a hook already exists, appends our block at the end.
   * Idempotent — won't install twice.
   */
  install(): void {
    const hookPath = this.getHookPath();
    if (!hookPath) return; // not a git repo

    // Try to locate the extension's dist path
    const extensionPath =
      vscode.extensions.getExtension('secretguard.secretguard')?.extensionPath ??
      path.join(__dirname, '..'); // fallback during development

    const scannerPath = path.join(extensionPath, 'dist', 'cli-scanner.js');
    // Use forward slashes even on Windows (sh script)
    const scannerPathFwd = scannerPath.split(path.sep).join('/');

    const hookBlock = this.buildHookBlock(scannerPathFwd);

    if (!fs.existsSync(hookPath)) {
      // Create new hook file
      fs.writeFileSync(hookPath, `#!/bin/sh\n${hookBlock}`, { mode: 0o755 });
    } else {
      const existing = fs.readFileSync(hookPath, 'utf8');
      if (!existing.includes(MARKER)) {
        fs.writeFileSync(hookPath, existing + '\n' + hookBlock);
        // Ensure executable
        if (os.platform() !== 'win32') {
          fs.chmodSync(hookPath, 0o755);
        }
      }
    }
  }

  /** Remove SecretGuard's block from the pre-commit hook. */
  uninstall(): void {
    const hookPath = this.getHookPath();
    if (!hookPath || !fs.existsSync(hookPath)) return;

    const existing = fs.readFileSync(hookPath, 'utf8');
    if (!existing.includes(MARKER)) return;

    // Strip everything from our marker to the next blank line after exit 0
    const lines = existing.split('\n');
    let inBlock = false;
    const kept: string[] = [];

    for (const line of lines) {
      if (line.includes(MARKER)) {
        inBlock = true;
        continue;
      }
      if (inBlock && (line.trim() === 'exit 0' || line.trim() === '')) {
        if (line.trim() === 'exit 0') inBlock = false;
        continue;
      }
      if (!inBlock) kept.push(line);
    }

    const cleaned = kept.join('\n').trim();

    if (!cleaned || cleaned === '#!/bin/sh') {
      fs.unlinkSync(hookPath);
    } else {
      fs.writeFileSync(hookPath, cleaned + '\n');
    }
  }

  /** True if our hook block is already present. */
  isInstalled(): boolean {
    const hookPath = this.getHookPath();
    if (!hookPath || !fs.existsSync(hookPath)) return false;
    return fs.readFileSync(hookPath, 'utf8').includes(MARKER);
  }

  private buildHookBlock(scannerPath: string): string {
    return `
${MARKER}
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)
if [ -z "$STAGED_FILES" ]; then
  exit 0
fi

node "${scannerPath}" $STAGED_FILES
RESULT=$?

if [ $RESULT -ne 0 ]; then
  printf "\\033[31m[SecretGuard] Commit blocked — secrets or sensitive files detected.\\033[0m\\n"
  printf "\\033[33mRun 'git commit --no-verify' to bypass (not recommended).\\033[0m\\n"
  exit 1
fi
exit 0
`;
  }
}

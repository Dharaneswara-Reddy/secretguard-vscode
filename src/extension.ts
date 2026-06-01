// src/extension.ts
// Activation entry point — wires all modules together

import * as vscode from 'vscode';
import { scanFile, ScanResult } from './scanner';
import { HookManager } from './hookManager';
import { DiagnosticsManager } from './diagnostics';
import { StatusBarManager } from './statusBar';
import { SidebarProvider } from './sidebarProvider';
import { debounce } from './debounce';
import { ScanCache, hashString } from './cache';

// ─── Activate ──────────────────────────────────────────────────────────────────

export function activate(context: vscode.ExtensionContext): void {
  console.log('[SecretGuard] Extension activating…');

  const config = vscode.workspace.getConfiguration('secretguard');

  // Core services
  const diagnosticsManager = new DiagnosticsManager();
  const statusBar = new StatusBarManager();
  const cache = new ScanCache();
  const hookManager = new HookManager();
  const sidebar = new SidebarProvider(context, cache);

  // Install git hook (silently — only if .git exists)
  hookManager.install();

  // Register sidebar
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('secretguard.findingsView', sidebar)
  );

  // ─── Real-time Scanning ─────────────────────────────────────────────────────

  const debouncedScan = debounce(async (document: vscode.TextDocument) => {
    const cfg = vscode.workspace.getConfiguration('secretguard');
    if (!cfg.get<boolean>('enableRealtime')) return;
    if (document.uri.scheme !== 'file') return;

    const text = document.getText();
    const maxSize = (cfg.get<number>('maxFileSizeKb') ?? 500) * 1024;
    if (text.length > maxSize) return;

    const contentHash = hashString(text);
    if (cache.isValid(document.fileName, contentHash)) return; // not changed

    const results = scanFile(document.fileName, text, {
      entropyThreshold: cfg.get<number>('entropyThreshold')
    });

    cache.set(document.fileName, results, contentHash);
    diagnosticsManager.update(document.uri, results);
    statusBar.update(cache.getAll());
    sidebar.refresh();
  }, config.get<number>('debounceMs') ?? 800);

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(e => debouncedScan(e.document))
  );

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(doc => debouncedScan(doc))
  );

  // Clear cache/diagnostics when a file is closed
  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument(doc => {
      diagnosticsManager.clear(doc.uri);
      cache.invalidate(doc.fileName);
    })
  );

  // ─── Commands ───────────────────────────────────────────────────────────────

  // 1. Scan entire workspace
  context.subscriptions.push(
    vscode.commands.registerCommand('secretguard.scanWorkspace', async () => {
      await scanWorkspace(diagnosticsManager, statusBar, sidebar, cache, config);
    })
  );

  // 2. Scan current file
  context.subscriptions.push(
    vscode.commands.registerCommand('secretguard.scanCurrentFile', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('SecretGuard: No active editor.');
        return;
      }

      const text = editor.document.getText();
      const results = scanFile(editor.document.fileName, text, {
        entropyThreshold: config.get<number>('entropyThreshold')
      });

      cache.set(editor.document.fileName, results, hashString(text));
      diagnosticsManager.update(editor.document.uri, results);
      statusBar.update(cache.getAll());
      sidebar.refresh();

      if (results.length === 0) {
        vscode.window.showInformationMessage('✅ SecretGuard: No secrets found in this file.');
      } else {
        const errors = results.filter(r => r.severity === 'error').length;
        vscode.window.showWarningMessage(
          `🚨 SecretGuard: ${results.length} issue(s) found (${errors} error${errors !== 1 ? 's' : ''}).`
        );
      }
    })
  );

  // 3. Scan git history
  context.subscriptions.push(
    vscode.commands.registerCommand('secretguard.scanGitHistory', async () => {
      const { scanHistory } = await import('./historyScanner');
      await scanHistory(diagnosticsManager);
    })
  );

  // 4. Show findings (focus sidebar)
  context.subscriptions.push(
    vscode.commands.registerCommand('secretguard.showFindings', async () => {
      await vscode.commands.executeCommand('secretguard.findingsView.focus');
    })
  );

  // 5. Export report
  context.subscriptions.push(
    vscode.commands.registerCommand('secretguard.exportReport', async () => {
      const { exportReport } = await import('./reportExporter');
      const allResults = cache.getAll();
      if (allResults.length === 0) {
        vscode.window.showInformationMessage(
          'SecretGuard: No findings to export. Run a scan first.'
        );
        return;
      }
      await exportReport(allResults);
    })
  );

  // 6. Open settings
  context.subscriptions.push(
    vscode.commands.registerCommand('secretguard.openConfig', () => {
      vscode.commands.executeCommand('workbench.action.openSettings', 'secretguard');
    })
  );

  // 7. Add flagged files to .gitignore
  context.subscriptions.push(
    vscode.commands.registerCommand('secretguard.addToGitignore', async () => {
      const { addFlaggedToGitignore } = await import('./gitignoreHelper');
      await addFlaggedToGitignore(cache.getAll());
    })
  );

  // 8. Clear all diagnostics
  context.subscriptions.push(
    vscode.commands.registerCommand('secretguard.clearDiagnostics', () => {
      diagnosticsManager.clearAll();
      cache.clear();
      statusBar.reset();
      sidebar.refresh();
      vscode.window.showInformationMessage('SecretGuard: All warnings cleared.');
    })
  );

  // 9. Show remediation for current cursor position
  context.subscriptions.push(
    vscode.commands.registerCommand('secretguard.showRemediation', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const line = editor.selection.active.line + 1;
      const filePath = editor.document.fileName;
      const cached = cache.get(filePath);

      if (!cached || cached.length === 0) {
        vscode.window.showInformationMessage(
          'SecretGuard: No findings on this file. Run a scan first.'
        );
        return;
      }

      const finding = cached.find(f => f.line === line) ?? cached[0];

      if (!finding.remediationUrl) {
        vscode.window.showInformationMessage(
          `SecretGuard: No specific remediation URL for rule "${finding.ruleName}".`
        );
        return;
      }

      const action = await vscode.window.showInformationMessage(
        `SecretGuard: ${finding.ruleName} — Open rotation guide?`,
        'Open Guide',
        'Dismiss'
      );

      if (action === 'Open Guide') {
        await vscode.env.openExternal(vscode.Uri.parse(finding.remediationUrl));
      }
    })
  );

  // 10. Toggle real-time scanning
  context.subscriptions.push(
    vscode.commands.registerCommand('secretguard.toggleRealtime', async () => {
      const cfg = vscode.workspace.getConfiguration('secretguard');
      const current = cfg.get<boolean>('enableRealtime') ?? true;
      await cfg.update(
        'enableRealtime',
        !current,
        vscode.ConfigurationTarget.Global
      );
      vscode.window.showInformationMessage(
        `SecretGuard real-time scanning: ${!current ? '🟢 ON' : '🔴 OFF'}`
      );
    })
  );

  // ─── Startup scan ──────────────────────────────────────────────────────────
  if (config.get<boolean>('scanOnOpen') !== false) {
    // Delay to let VSCode finish loading
    setTimeout(
      () => scanWorkspace(diagnosticsManager, statusBar, sidebar, cache, config),
      3000
    );
  }

  console.log('[SecretGuard] Extension activated.');
}

// ─── Workspace Scanner ─────────────────────────────────────────────────────────

async function scanWorkspace(
  diagnosticsManager: DiagnosticsManager,
  statusBar: StatusBarManager,
  sidebar: SidebarProvider,
  cache: ScanCache,
  config: vscode.WorkspaceConfiguration
): Promise<void> {
  const excludes = config.get<string[]>('excludePatterns') ?? [
    '**/node_modules/**',
    '**/.git/**',
    '**/dist/**',
    '**/*.min.js'
  ];
  const excludeGlob = `{${excludes.join(',')}}`;
  const files = await vscode.workspace.findFiles('**/*', excludeGlob);

  let totalFindings = 0;
  const maxSize = (config.get<number>('maxFileSizeKb') ?? 500) * 1024;

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'SecretGuard: Scanning workspace…',
      cancellable: true
    },
    async (progress, token) => {
      for (let i = 0; i < files.length; i++) {
        if (token.isCancellationRequested) break;

        progress.report({
          increment: (1 / files.length) * 100,
          message: files[i].fsPath.split('/').pop() ?? ''
        });

        try {
          const doc = await vscode.workspace.openTextDocument(files[i]);
          const text = doc.getText();

          if (text.length > maxSize) continue;

          const contentHash = hashString(text);
          if (cache.isValid(doc.fileName, contentHash)) {
            totalFindings += cache.get(doc.fileName)?.length ?? 0;
            continue;
          }

          const results = scanFile(doc.fileName, text, {
            entropyThreshold: config.get<number>('entropyThreshold')
          });

          if (results.length > 0) {
            diagnosticsManager.update(files[i], results);
            cache.set(doc.fileName, results, contentHash);
            totalFindings += results.length;
          } else {
            cache.set(doc.fileName, [], contentHash);
          }
        } catch {
          // Binary file or unreadable — skip
        }
      }
    }
  );

  statusBar.update(cache.getAll());
  sidebar.refresh();

  if (totalFindings === 0) {
    vscode.window.showInformationMessage(
      `✅ SecretGuard: Workspace is clean — ${files.length} file(s) scanned.`
    );
  } else {
    const action = await vscode.window.showWarningMessage(
      `🚨 SecretGuard: Found ${totalFindings} issue(s) across workspace.`,
      'View Findings',
      'Export Report'
    );

    if (action === 'View Findings') {
      await vscode.commands.executeCommand('secretguard.showFindings');
    } else if (action === 'Export Report') {
      const { exportReport } = await import('./reportExporter');
      await exportReport(cache.getAll());
    }
  }
}

// ─── Deactivate ────────────────────────────────────────────────────────────────

export function deactivate(): void {
  console.log('[SecretGuard] Extension deactivated.');
}

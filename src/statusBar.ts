// src/statusBar.ts
// Bottom-bar shield indicator — green when clean, red when secrets detected

import * as vscode from 'vscode';
import { ScanResult } from './scanner';

export class StatusBarManager {
  private readonly item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    this.item.command = 'secretguard.showFindings';
    this.reset();
    this.item.show();
  }

  update(results: ScanResult[]): void {
    const errors = results.filter(r => r.severity === 'error').length;
    const warnings = results.filter(r => r.severity === 'warning').length;

    if (errors > 0) {
      this.item.text = `$(shield) ${errors} secret${errors > 1 ? 's' : ''}`;
      this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
      this.item.tooltip = `SecretGuard: ${errors} error(s), ${warnings} warning(s) — click to view findings`;
    } else if (warnings > 0) {
      this.item.text = `$(shield) ${warnings} warning${warnings > 1 ? 's' : ''}`;
      this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
      this.item.tooltip = `SecretGuard: ${warnings} warning(s) — click to view findings`;
    } else {
      this.item.text = '$(shield) Secure';
      this.item.backgroundColor = undefined;
      this.item.tooltip = 'SecretGuard: No secrets detected ✓';
    }
  }

  reset(): void {
    this.item.text = '$(shield) SecretGuard';
    this.item.backgroundColor = undefined;
    this.item.tooltip = 'SecretGuard: Click to scan or view findings';
  }

  dispose(): void {
    this.item.dispose();
  }
}

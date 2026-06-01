// src/diagnostics.ts
// Manages VSCode Diagnostic API — the red/yellow underlines in the editor

import * as vscode from 'vscode';
import { ScanResult } from './scanner';

export class DiagnosticsManager {
  private readonly collection: vscode.DiagnosticCollection;

  constructor() {
    this.collection = vscode.languages.createDiagnosticCollection('secretguard');
  }

  /**
   * Replace all diagnostics for a given URI with the new scan results.
   */
  update(uri: vscode.Uri, results: ScanResult[]): void {
    const diagnostics: vscode.Diagnostic[] = results.map(result => {
      // Line 0 means filename-level — use first line of file
      const lineNum = Math.max(0, result.line - 1);
      const col = Math.max(0, result.column);

      const range = new vscode.Range(
        new vscode.Position(lineNum, col),
        new vscode.Position(lineNum, col + result.matchedValue.length)
      );

      const severity =
        result.severity === 'error'
          ? vscode.DiagnosticSeverity.Error
          : vscode.DiagnosticSeverity.Warning;

      const diagnostic = new vscode.Diagnostic(range, result.message, severity);
      diagnostic.source = 'SecretGuard';
      diagnostic.code = {
        value: result.ruleId,
        target: result.remediationUrl
          ? vscode.Uri.parse(result.remediationUrl)
          : vscode.Uri.parse('https://github.com/secretguard/secretguard#rules')
      };

      if (result.entropy !== undefined) {
        diagnostic.tags = [];
        // Add entropy info to the message
        diagnostic.message += `\nEntropy score: ${result.entropy.toFixed(2)} — higher = more likely a real secret.`;
      }

      if (result.isFalsePositive) {
        diagnostic.tags = [vscode.DiagnosticTag.Unnecessary];
        diagnostic.message += '\n⚠️ Possible false positive — contains placeholder hints.';
      }

      return diagnostic;
    });

    this.collection.set(uri, diagnostics);
  }

  /** Remove all diagnostics for a URI. */
  clear(uri: vscode.Uri): void {
    this.collection.delete(uri);
  }

  /** Remove all diagnostics across all files. */
  clearAll(): void {
    this.collection.clear();
  }

  dispose(): void {
    this.collection.dispose();
  }
}

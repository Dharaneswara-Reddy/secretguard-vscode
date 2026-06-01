// src/sidebarProvider.ts
// TreeView sidebar panel — lists all SecretGuard findings grouped by file

import * as vscode from 'vscode';
import * as path from 'path';
import { ScanResult } from './scanner';
import { ScanCache } from './cache';

// ─── Tree Item Classes ────────────────────────────────────────────────────────

class FileItem extends vscode.TreeItem {
  constructor(
    public readonly filePath: string,
    public readonly findings: ScanResult[]
  ) {
    super(
      path.basename(filePath),
      vscode.TreeItemCollapsibleState.Collapsed
    );

    const errors = findings.filter(f => f.severity === 'error').length;
    const warnings = findings.filter(f => f.severity === 'warning').length;

    this.description = `${errors > 0 ? `${errors} error${errors > 1 ? 's' : ''}` : ''}${errors > 0 && warnings > 0 ? ', ' : ''}${warnings > 0 ? `${warnings} warning${warnings > 1 ? 's' : ''}` : ''}`;
    this.tooltip = filePath;
    this.iconPath = errors > 0
      ? new vscode.ThemeIcon('shield', new vscode.ThemeColor('errorForeground'))
      : new vscode.ThemeIcon('shield', new vscode.ThemeColor('editorWarning.foreground'));
    this.contextValue = 'secretguardFile';
  }
}

class FindingItem extends vscode.TreeItem {
  constructor(public readonly finding: ScanResult) {
    super(finding.ruleName, vscode.TreeItemCollapsibleState.None);

    this.description = finding.line > 0 ? `Line ${finding.line}` : 'Filename';
    this.tooltip = finding.message;
    this.iconPath = finding.severity === 'error'
      ? new vscode.ThemeIcon('error', new vscode.ThemeColor('errorForeground'))
      : new vscode.ThemeIcon('warning', new vscode.ThemeColor('editorWarning.foreground'));

    // Navigate to the finding when clicked
    if (finding.line > 0) {
      this.command = {
        command: 'vscode.open',
        title: 'Open File',
        arguments: [
          vscode.Uri.file(finding.filePath),
          {
            selection: new vscode.Range(
              new vscode.Position(finding.line - 1, finding.column),
              new vscode.Position(finding.line - 1, finding.column + finding.matchedValue.length)
            )
          }
        ]
      };
    } else {
      this.command = {
        command: 'vscode.open',
        title: 'Open File',
        arguments: [vscode.Uri.file(finding.filePath)]
      };
    }

    this.contextValue = 'secretguardFinding';
  }
}

// ─── Tree Data Provider ────────────────────────────────────────────────────────

export class SidebarProvider
  implements vscode.TreeDataProvider<FileItem | FindingItem>
{
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<
    FileItem | FindingItem | undefined
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly cache: ScanCache
  ) {}

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: FileItem | FindingItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: FileItem | FindingItem): (FileItem | FindingItem)[] {
    if (!element) {
      // Root: show all files with findings
      const byFile = this.cache.getAllByFile();
      if (byFile.size === 0) {
        // Show a placeholder
        const emptyItem = new vscode.TreeItem('No findings — workspace is clean ✓');
        emptyItem.iconPath = new vscode.ThemeIcon('check');
        return [];
      }

      return Array.from(byFile.entries())
        .map(([filePath, results]) => new FileItem(filePath, results))
        .sort((a, b) => {
          const aErrors = a.findings.filter(f => f.severity === 'error').length;
          const bErrors = b.findings.filter(f => f.severity === 'error').length;
          return bErrors - aErrors; // sort by most errors first
        });
    }

    if (element instanceof FileItem) {
      return element.findings.map(f => new FindingItem(f));
    }

    return [];
  }
}

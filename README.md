# 🛡️ SecretGuard — VSCode Extension

**Production-grade secret detection for VSCode.** Prevents API keys, credentials, and sensitive files from entering your git history.

[![VSCode Engine](https://img.shields.io/badge/vscode-%5E1.85.0-blue)](https://code.visualstudio.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)

---

## Features

- 🔴 **Real-time scanning** — Detects secrets as you type (debounced 800ms)
- 🔒 **Git hook integration** — Blocks commits containing secrets via pre-commit hook
- 📊 **30+ detection rules** — AWS, GitHub, Stripe, Google, OpenAI, Anthropic, Discord, Slack, and more
- 🧮 **Shannon entropy analysis** — Filters out low-entropy placeholders (no false positives)
- 📁 **Filename blocklist** — Catches `.env`, `.pem`, `id_rsa`, `credentials.json`, etc.
- 📜 **Git history scan** — Audits last 500 commits for already-leaked secrets
- 📋 **HTML/JSON reports** — Exportable scan reports for team review
- 🔧 **Auto-gitignore** — One-click add sensitive files to `.gitignore`
- 🔗 **Remediation links** — Every finding links to the rotation/revocation page
- 🌲 **Sidebar panel** — TreeView of all findings grouped by file

---

## Quick Start

1. Install the extension from the VSCode Marketplace
2. Open any git repository — SecretGuard activates automatically
3. It will scan all files on startup and show findings in:
   - The **Problems** panel (red underlines)
   - The **SecretGuard** sidebar panel
   - The **status bar** (bottom left shield icon)

---

## Commands

Open the Command Palette (`Ctrl+Shift+P`) and search for **SecretGuard**:

| Command | Shortcut | Description |
|---|---|---|
| Scan Entire Workspace | `Ctrl+Shift+S` ×2 | Scans all workspace files |
| Scan Current File | — | Scans the active editor |
| Scan Git History | — | Scans last 500 commits |
| Show All Findings | — | Focuses the sidebar panel |
| Export Scan Report | — | Saves HTML or JSON report |
| Open Configuration | — | Opens VSCode settings |
| Add Flagged Files to .gitignore | — | Auto-updates .gitignore |
| Clear All Warnings | — | Resets all diagnostics |
| Show How to Rotate This Secret | — | Opens remediation URL |
| Toggle Real-time Scanning | — | On/off switch |

---

## Detection Rules

### Content Rules (30+ patterns)

| ID | Name | Severity |
|---|---|---|
| `aws-access-key` | AWS Access Key ID | 🔴 Error |
| `aws-secret-key` | AWS Secret Access Key | 🔴 Error |
| `github-pat` | GitHub Personal Access Token | 🔴 Error |
| `github-oauth` | GitHub OAuth Token | 🔴 Error |
| `stripe-live-key` | Stripe Live Secret Key | 🔴 Error |
| `stripe-test-key` | Stripe Test Key | 🟡 Warning |
| `google-api-key` | Google API Key | 🔴 Error |
| `private-key-pem` | PEM Private Key | 🔴 Error |
| `jwt-token` | JSON Web Token | 🟡 Warning |
| `slack-token` | Slack Token | 🔴 Error |
| `slack-webhook` | Slack Webhook URL | 🔴 Error |
| `discord-webhook` | Discord Webhook URL | 🔴 Error |
| `openai-key` | OpenAI API Key | 🔴 Error |
| `openai-key-new` | OpenAI API Key (new format) | 🔴 Error |
| `anthropic-key` | Anthropic API Key | 🔴 Error |
| `sendgrid-key` | SendGrid API Key | 🔴 Error |
| `database-url` | Database Connection String | 🔴 Error |
| `generic-secret` | Generic Secret Assignment | 🟡 Warning |
| ... | (25 more) | ... |

### File Rules (25+ patterns)

Flags dangerous files by name: `.env`, `.pem`, `.key`, `id_rsa`, `credentials.json`, `kubeconfig`, `.vault-token`, and more.

---

## Configuration

```json
{
  "secretguard.enableRealtime": true,
  "secretguard.debounceMs": 800,
  "secretguard.entropyThreshold": 3.5,
  "secretguard.allowBypass": true,
  "secretguard.scanOnOpen": true,
  "secretguard.maxFileSizeKb": 500,
  "secretguard.excludePatterns": [
    "**/node_modules/**",
    "**/.git/**",
    "**/dist/**",
    "**/*.min.js"
  ]
}
```

---

## Shannon Entropy

SecretGuard uses **Shannon entropy** to distinguish real secrets from placeholders:

| String | Entropy | Classification |
|---|---|---|
| `wJalrXUtnFEMI/K7MDENG` | ~4.2 | 🔴 Real secret |
| `AKIAIOSFODNN7EXAMPLE` | ~3.1 | ✅ Placeholder (filtered) |
| `YOUR_API_KEY_HERE` | ~2.8 | ✅ Placeholder (filtered) |

The default threshold is **3.5** bits/char. Increase it to reduce false positives.

---

## Git Hook

SecretGuard automatically installs a `pre-commit` hook in `.git/hooks/pre-commit`. When you try to commit files containing secrets, the commit is **blocked**:

```
❌ [SecretGuard] ERROR — AWS Access Key ID
   File: src/config.js:12
   Match: AKIA****LKEY
   Rotate at: https://docs.aws.amazon.com/IAM/...

[SecretGuard] Commit blocked — secrets or sensitive files detected.
Run 'git commit --no-verify' to bypass (not recommended).
```

---

## License

MIT — See LICENSE file for details.

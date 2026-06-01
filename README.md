# 🛡️ SecretGuard — Git Secret Scanner

> Detects hardcoded API keys, passwords, and secrets in your code **in real time** — before you accidentally commit them.

[![Version](https://img.shields.io/badge/version-1.0.1-blue)](https://marketplace.visualstudio.com/items?itemName=secretguard.secretguard-git-protect)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)
[![Publisher](https://img.shields.io/badge/publisher-secretguard-blueviolet)](https://marketplace.visualstudio.com/publishers/secretguard)
[![Tests](https://img.shields.io/badge/tests-43%20passing-brightgreen)](#-testing)

---

## 🚨 The Problem

Every day, thousands of developers accidentally push API keys, database passwords, and secret tokens to GitHub. Once a secret is in git history — **it's permanent**. Even deleting the file doesn't help; anyone who clones the repo can recover it with `git log`.

**SecretGuard stops secrets at 3 layers:**
- 🔴 **While you type** — real-time red underlines in the editor
- 🔴 **Before you commit** — git pre-commit hook blocks the commit
- 🔴 **Across your workspace** — full scan of every file on startup

---

## ✨ Features

| | Feature | Description |
|---|---|---|
| 🔴 | **Real-time detection** | Scans as you type with 800ms debounce — no manual action needed |
| 🔍 | **Red squiggly underlines** | Just like ESLint — secrets highlighted inline in the editor |
| 📋 | **Sidebar findings panel** | Lists every secret found, grouped by file |
| 🎯 | **Click to jump** | Click any finding in the sidebar to jump to that exact line |
| 🛑 | **Commit blocker** | Pre-commit hook prevents `git commit` if secrets are staged |
| 🧠 | **Shannon entropy** | Distinguishes real secrets from placeholders (`YOUR_KEY_HERE`) |
| 🛡️ | **Status bar indicator** | Shield icon shows SecretGuard is actively protecting you |
| 📜 | **History scanner** | Audits your last 500 git commits for leaked secrets |
| 📊 | **Export reports** | One-click HTML/JSON scan report |
| 🔧 | **Auto-gitignore** | Adds flagged sensitive files to `.gitignore` automatically |

---

## 🔎 What It Detects

### By Value Pattern (30+ rules)

```js
const key = "AKIAIOSFODNN7REALKEY1234"          // ⚠️ AWS Access Key ID
const token = "ghp_aBcDeFgHiJkLmNoPqRsTuVwXy"  // ⚠️ GitHub PAT
const sk = "sk_live_aBcDeFgHiJkLmNoPqRsTuVw"   // ⚠️ Stripe Live Key
const ai = "sk-proj-" + "a".repeat(48)          // ⚠️ OpenAI API Key
const url = "postgres://admin:p@ssw0rd@db:5432" // ⚠️ Database URL
```

### By Filename (25+ blocked files)

```
.env, .env.local, .env.production   → Always flagged
id_rsa, id_ed25519                  → SSH private keys
*.pem, *.p12, *.pfx                 → Certificate files
credentials.json, *service-account* → GCP/AWS credential files
.vault-token, .netrc, .npmrc        → Auth token files
```

### Full List of Supported Secret Types

| Secret Type | Pattern | Severity |
|---|---|---|
| AWS Access Key ID | `AKIA[0-9A-Z]{16}` | 🔴 Error |
| AWS Secret Access Key | 40-char base64 near `aws` | 🔴 Error |
| GitHub PAT | `ghp_[A-Za-z0-9]{36}` | 🔴 Error |
| GitHub OAuth Token | `gho_[A-Za-z0-9]{36}` | 🔴 Error |
| Stripe Live Secret Key | `sk_live_[A-Za-z0-9]{24}` | 🔴 Error |
| Stripe Test Key | `sk_test_[A-Za-z0-9]{24}` | 🟡 Warning |
| Google API Key | `AIza[0-9A-Za-z_-]{35}` | 🔴 Error |
| OpenAI API Key | `sk-proj-[A-Za-z0-9]{48}` | 🔴 Error |
| Anthropic Key | `sk-ant-[A-Za-z0-9]{40}` | 🔴 Error |
| Slack Webhook | `hooks.slack.com/services/...` | 🔴 Error |
| Discord Webhook | `discord.com/api/webhooks/...` | 🔴 Error |
| Slack Bot Token | `xoxb-[0-9]{11}-...` | 🔴 Error |
| Twilio Account SID | `AC[a-z0-9]{32}` | 🔴 Error |
| SendGrid API Key | `SG.[A-Za-z0-9]{22}.[A-Za-z0-9]{43}` | 🔴 Error |
| JWT Token | `eyJ...` | 🟡 Warning |
| PEM Private Key | `-----BEGIN.*PRIVATE KEY-----` | 🔴 Error |
| SSH Private Key | `-----BEGIN OPENSSH PRIVATE KEY-----` | 🔴 Error |
| Database URL | `postgres://`, `mysql://`, `mongodb://` with credentials | 🔴 Error |
| Generic secret assignment | `password = "..."`, `secret = "..."` | 🟡 Warning |
| High entropy string | Any 20+ char string with H(x) ≥ 3.5 bits/char | 🟡 Warning |

---

## 🖥️ How It Works

### 1. Real-time Squiggly Lines

SecretGuard uses the VS Code Diagnostics API (same system as ESLint) to underline secrets inline:

```
const stripe_key = "sk_live_aBcDeFgHiJkLmNoPqRsTuV";
                   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                   ⚠ SecretGuard: Stripe Live Secret Key detected
                     Rotate at: https://dashboard.stripe.com/apikeys
```

### 2. Sidebar Findings Panel

Click the 🛡️ shield icon in the activity bar to open the findings panel:

```
SECRETGUARD: FINDINGS
└── 📄 config.js
    ├── 🔴 Stripe Live Secret Key        Line 3
    ├── 🔴 AWS Access Key ID             Line 7
    └── 🟡 Generic Secret Assignment     Line 12
└── 📄 .env
    ├── 🔴 Database URL                  Line 1
    └── 🔴 GitHub PAT                    Line 4
```

### 3. Commit Blocker (Git Hook)

When you `git commit`, the pre-commit hook runs automatically:

```bash
$ git commit -m "add config"

❌ [SecretGuard] ERROR — Stripe Live Secret Key
   File: config.js:3
   Match: sk_live_****VwXy
   Rotate at: https://dashboard.stripe.com/apikeys

❌ Commit BLOCKED. Fix the issues above, then commit again.
```

---

## 🆚 SecretGuard vs. GitHub Push Protection

| Feature | **SecretGuard** | **GitHub Push Protection** |
|---|:---:|:---:|
| Catches secrets **while typing** | ✅ | ❌ |
| Catches secrets **at commit** | ✅ | ❌ |
| Catches secrets **at push** | ✅ | ✅ |
| Works **offline** | ✅ | ❌ |
| Works with **all git hosts** | ✅ GitLab, Bitbucket, etc. | ❌ GitHub only |
| **Custom detection rules** | ✅ | ⚠️ Enterprise only |
| Shows **exact line** in editor | ✅ | ❌ |
| **Entropy-based** detection | ✅ | ⚠️ Unknown |
| **Redacted** output | ✅ | ✅ |
| **Git history** audit | ✅ Last 500 commits | ⚠️ Push-time only |
| **Export** scan report | ✅ HTML + JSON | ❌ |
| **Auto-gitignore** helper | ✅ | ❌ |
| **Remediation links** per secret | ✅ | ❌ |
| **Response time** | ✅ Milliseconds (local) | ⚠️ Seconds (network) |
| **Cost** | ✅ Free / MIT | ✅ Free for public repos |

> **In short:** GitHub Push Protection is your last line of defense. SecretGuard is your first three.

---

## 🚀 Getting Started

### Install from Marketplace
1. Open VS Code
2. Press `Ctrl+Shift+X` to open Extensions
3. Search **SecretGuard**
4. Click **Install**

### Install from VSIX (manual)
```bash
code --install-extension secretguard-git-protect-1.0.1.vsix
```

### Install Git Hook (blocks commits)
Open the command palette (`Ctrl+Shift+P`) and run:
```
SecretGuard: Install Git Pre-commit Hook
```

---

## ⚙️ Configuration

Open VS Code Settings (`Ctrl+,`) and search `secretguard`:

| Setting | Default | Description |
|---|---|---|
| `secretguard.enableRealtime` | `true` | Scan as you type |
| `secretguard.debounceMs` | `800` | Delay (ms) after keystroke before scanning |
| `secretguard.entropyThreshold` | `3.5` | Entropy cutoff — higher = fewer false positives |
| `secretguard.scanOnOpen` | `true` | Full workspace scan when extension activates |
| `secretguard.maxFileSizeKb` | `500` | Skip files larger than this size |
| `secretguard.excludePatterns` | `node_modules, dist, .git` | Glob patterns to skip |

---

## 🛠️ Commands

Open with `Ctrl+Shift+P` → type `SecretGuard`:

| Command | Description |
|---|---|
| `SecretGuard: Scan Entire Workspace` | Scan all files in the workspace |
| `SecretGuard: Scan Current File` | Scan only the active editor file |
| `SecretGuard: Scan Git History` | Audit the last 500 commits |
| `SecretGuard: Show All Findings` | Focus the sidebar panel |
| `SecretGuard: Export Scan Report` | Save HTML/JSON report to disk |
| `SecretGuard: Add Flagged Files to .gitignore` | Auto-gitignore sensitive files |
| `SecretGuard: Clear All Warnings` | Reset all findings |
| `SecretGuard: Toggle Real-time Scanning` | Enable/disable live scanning |

---

## 🧪 Testing

```
Test Suites: 2 passed
Tests:       43 passed ✓

Coverage:
  ✓ AWS key detection + redaction
  ✓ GitHub PAT detection
  ✓ Stripe live/test keys
  ✓ PostgreSQL + MongoDB URLs
  ✓ PEM / SSH key headers
  ✓ Google API key
  ✓ OpenAI + Anthropic keys
  ✓ Slack + Discord webhooks
  ✓ Placeholder suppression (false positives)
  ✓ Custom entropy thresholds
  ✓ Filename blocklist (.env, id_rsa, etc.)
```

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript (strict mode) |
| Bundler | esbuild (31.7 KB output) |
| Detection Engine | Regex + Shannon Entropy |
| VSCode Integration | Diagnostics API, TreeDataProvider, StatusBar |
| Git Integration | Pre-commit hook (Node.js CLI) |
| Testing | Jest + ts-jest (43 tests) |

For full architecture documentation, see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## 🏗️ Local Development

```bash
# Clone
git clone https://github.com/Dharaneswara-Reddy/secretguard-vscode.git
cd secretguard-vscode

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Press F5 in VS Code to launch Extension Development Host
```

---

## 🤝 Contributing

Contributions welcome! To add a new secret pattern:

1. Fork the repository
2. Add your rule to `src/rules/contentRules.ts`
3. Add a test case to `test/scanner.test.ts`
4. Open a Pull Request

---

## 🚦 Known Limitations

| Limitation | Notes |
|---|---|
| Desktop VS Code only | No browser/web editor support |
| Text files only | Binary files are skipped |
| Obfuscated secrets may pass | Base64-encoded secrets won't match patterns |
| Entropy may flag long random variable names | Raise `entropyThreshold` to reduce false positives |

---

## 🔗 Links

- **Marketplace:** [SecretGuard on VS Marketplace](https://marketplace.visualstudio.com/items?itemName=secretguard.secretguard-git-protect)
- **GitHub:** [secretguard-vscode](https://github.com/Dharaneswara-Reddy/secretguard-vscode)
- **Issues:** [Report a bug](https://github.com/Dharaneswara-Reddy/secretguard-vscode/issues)

---

## 📄 License

MIT © 2026 Palle Venkata Dharaneswara Reddy — see [LICENSE](./LICENSE)

---

> ⭐ If SecretGuard saved you from a security breach, give it a star on GitHub and a review on the Marketplace!

**Built with ❤️ to keep developer secrets safe.**

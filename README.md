# 🛡️ SecretGuard — Git Secret Scanner

> **Production-grade VSCode extension that detects and blocks secrets, API keys, and credentials before they enter your git history.**

[![Version](https://img.shields.io/badge/version-1.0.0-blue)](https://marketplace.visualstudio.com/items?itemName=secretguard.secretguard-git-protect)
[![VSCode Engine](https://img.shields.io/badge/vscode-%5E1.85.0-blueviolet)](https://code.visualstudio.com/)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)
[![Tests](https://img.shields.io/badge/tests-43%20passing-brightgreen)](#testing)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org/)

---

## The Problem SecretGuard Solves

Every year, thousands of developers accidentally commit AWS keys, database passwords, Stripe secrets, and API tokens directly into their codebases. Once a secret is in git history, it is **permanent** — even if you delete the file, the secret lives in every `git clone` forever.

**SecretGuard intercepts secrets at every layer** — while you type, before you commit, and blocks the commit entirely if a secret is found.

---

## 🔐 Security Mechanisms

SecretGuard uses **three independent layers** of protection, working together:

### Layer 1 — Shannon Entropy Analysis

Every potential secret is scored using **Shannon entropy** — a mathematical measure of randomness (bits per character). Real secrets (random tokens) have high entropy. Placeholder values (`YOUR_API_KEY`, `CHANGE_ME`) have low entropy and are filtered out.

```
Entropy = -Σ p(x) × log₂(p(x))
```

| String | Entropy | Classification |
|---|---|---|
| `wJalrXUtnFEMI/K7MDENG` | 4.21 bits/char | 🔴 Real secret |
| `AKIAIOSFODNN7EXAMPLE` | 3.68 bits/char | ✅ Placeholder — ignored |
| `YOUR_API_KEY_HERE` | 2.80 bits/char | ✅ Placeholder — ignored |
| `sk_live_aBcDeFgHiJk` | 4.05 bits/char | 🔴 Real secret |
| `aaaaaaaaaaaaaaaa` | 0.00 bits/char | ✅ Not a secret |

**Default threshold: 3.5 bits/char** (configurable). This is why SecretGuard doesn't fire on documentation examples or template files.

---

### Layer 2 — Regex Pattern Matching (30+ Rules)

Each detection rule uses a carefully crafted regular expression tuned for a specific credential format:

| Rule ID | Secret Type | Pattern | Severity |
|---|---|---|---|
| `aws-access-key` | AWS Access Key ID | `AKIA[0-9A-Z]{16}` | 🔴 Error |
| `aws-secret-key` | AWS Secret Access Key | `[A-Za-z0-9/+=]{40}` near `aws` | 🔴 Error |
| `github-pat` | GitHub Personal Access Token | `ghp_[A-Za-z0-9]{36}` | 🔴 Error |
| `github-oauth` | GitHub OAuth Token | `gho_[A-Za-z0-9]{36}` | 🔴 Error |
| `github-actions` | GitHub Actions Token | `ghs_[A-Za-z0-9]{36}` | 🔴 Error |
| `stripe-live-key` | Stripe Live Secret Key | `sk_live_[A-Za-z0-9]{24}` | 🔴 Error |
| `stripe-test-key` | Stripe Test Key | `sk_test_[A-Za-z0-9]{24}` | 🟡 Warning |
| `google-api-key` | Google API Key | `AIza[0-9A-Za-z_\-]{35}` | 🔴 Error |
| `private-key-pem` | PEM Private Key | `-----BEGIN.*PRIVATE KEY-----` | 🔴 Error |
| `ssh-private-key` | OpenSSH Private Key | `-----BEGIN OPENSSH PRIVATE KEY-----` | 🔴 Error |
| `jwt-token` | JSON Web Token | `eyJ[A-Za-z0-9_\-]{20,}\.eyJ` | 🟡 Warning |
| `slack-token` | Slack Bot Token | `xoxb-[0-9]{11}-[0-9A-Za-z]{24}` | 🔴 Error |
| `slack-webhook` | Slack Webhook URL | `hooks.slack.com/services/T.../B.../...` | 🔴 Error |
| `discord-webhook` | Discord Webhook URL | `discord.com/api/webhooks/...` | 🔴 Error |
| `openai-key` | OpenAI API Key (classic) | `sk-[A-Za-z0-9]{48}` | 🔴 Error |
| `openai-key-new` | OpenAI API Key (new) | `sk-proj-[A-Za-z0-9]{48}` | 🔴 Error |
| `anthropic-key` | Anthropic Claude Key | `sk-ant-[A-Za-z0-9]{40}` | 🔴 Error |
| `sendgrid-key` | SendGrid API Key | `SG\.[A-Za-z0-9_\-]{22}\.[A-Za-z0-9_\-]{43}` | 🔴 Error |
| `database-url` | Database Connection String | `(postgres\|mysql\|mongodb)://.*:.*@` | 🔴 Error |
| `twilio-sid` | Twilio Account SID | `AC[a-z0-9]{32}` | 🔴 Error |
| `twilio-token` | Twilio Auth Token | near `twilio` | 🔴 Error |
| `heroku-key` | Heroku API Key | UUID format near `heroku` | 🔴 Error |
| `generic-secret` | Generic Secret Assignment | `(secret\|password\|token)\s*=\s*["'][^"']{8,}` | 🟡 Warning |
| (+ 10 more) | … | … | … |

---

### Layer 3 — Filename Blocklist (25+ patterns)

Some files should **never** be committed, regardless of content:

| Rule ID | Pattern | Examples |
|---|---|---|
| `env-file` | `.env` | `.env`, `.env.production` |
| `env-local` | `.env.*` | `.env.local`, `.env.staging` |
| `pem-key` | `*.pem` | `server.pem`, `cert.pem` |
| `id-rsa` | `id_rsa` | `~/.ssh/id_rsa` |
| `id-ed25519` | `id_ed25519` | `~/.ssh/id_ed25519` |
| `pkcs12` | `*.p12`, `*.pfx` | `keystore.p12` |
| `credentials-json` | `credentials.json` | Google service account file |
| `service-account` | `*service-account*.json` | GCP service accounts |
| `kubeconfig` | `kubeconfig`, `*.kubeconfig` | Kubernetes configs |
| `vault-token` | `.vault-token` | HashiCorp Vault |
| `docker-config` | `config.json` in `.docker/` | Docker Hub credentials |
| `npmrc-auth` | `.npmrc` | Contains `//registry.../:_authToken` |
| `pypirc` | `.pypirc` | PyPI upload credentials |
| `netrc` | `.netrc` | FTP/HTTP credentials |
| (+ 10 more) | … | … |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        SECRETGUARD ARCHITECTURE                         │
└─────────────────────────────────────────────────────────────────────────┘

  EDITOR LAYER (VSCode Extension — extension.ts)
  ┌─────────────────────────────────────────────────────────────────────┐
  │                                                                     │
  │  onDidChangeTextDocument ──► debounce(800ms) ──► scanCurrentFile   │
  │  onDidOpenTextDocument   ──────────────────────► scanCurrentFile   │
  │  onActivation            ──────────────────────► scanWorkspace     │
  │                                                                     │
  └──────────────────────────────┬──────────────────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │      ScanCache (LRU)     │  ← Skip unchanged files
                    │   key: SHA-256(content)  │    (performance guard)
                    └────────────┬────────────┘
                                 │ cache miss
                    ┌────────────▼────────────┐
                    │    scanner.ts (pure)     │  ← No VSCode deps
                    │                         │
                    │  1. scanFilename()       │  ← File rule check
                    │  2. scanContent()        │  ← Content rules
                    │     ├─ regex match       │
                    │     ├─ entropy check     │
                    │     └─ false positive    │
                    │        suppression       │
                    └────────┬────────┬────────┘
                             │        │
              ┌──────────────▼──┐  ┌──▼──────────────────┐
              │  contentRules   │  │    fileRules.ts       │
              │  (30+ patterns) │  │    (25+ blocklist)    │
              └──────────────┬──┘  └──┬──────────────────┘
                             │        │
                    ┌────────▼────────▼────────┐
                    │      ScanFinding[]        │
                    │  { ruleId, severity,      │
                    │    line, col, match,      │
                    │    entropy, remediation } │
                    └──┬────────┬──────┬───────┘
                       │        │      │
         ┌─────────────▼──┐  ┌──▼──┐  └──────────────────┐
         │ DiagnosticsAPI  │  │Sidebar│           StatusBar │
         │ (red squiggles) │  │TreeView│         (🛡 shield) │
         └────────────────┘  └───────┘           └─────────┘

  GIT LAYER (pre-commit hook — cli-scanner.ts)
  ┌─────────────────────────────────────────────────────────────────────┐
  │                                                                     │
  │  git commit ──► .git/hooks/pre-commit ──► node cli-scanner.js     │
  │                                                    │               │
  │                          ┌─────────────────────────▼─────────────┐ │
  │                          │  Same scanner.ts engine (reused)       │ │
  │                          │  Scans only staged files               │ │
  │                          │  Exit 1 → commit BLOCKED               │ │
  │                          │  Exit 0 → commit allowed               │ │
  │                          └───────────────────────────────────────┘ │
  └─────────────────────────────────────────────────────────────────────┘
```

### Graphviz (Dot) — System Design Diagram

```dot
digraph SecretGuard {
  rankdir=TB;
  node [shape=box, style=filled, fontname="Helvetica"];
  edge [fontname="Helvetica", fontsize=10];

  // Input nodes
  Editor   [label="VSCode Editor\n(file change)", fillcolor="#4A90D9", fontcolor=white];
  GitCmd   [label="git commit", fillcolor="#F5A623", fontcolor=white];

  // Core engine
  Cache    [label="LRU Scan Cache\n(SHA-256 key)", fillcolor="#7ED321", fontcolor=white];
  Scanner  [label="scanner.ts\n(Pure Node.js Engine)", fillcolor="#D0021B", fontcolor=white, shape=ellipse];

  // Rule modules
  Entropy  [label="Shannon Entropy\nentropyCheck.ts", fillcolor="#9B59B6", fontcolor=white];
  Content  [label="Content Rules\n30+ Regex Patterns", fillcolor="#9B59B6", fontcolor=white];
  Files    [label="File Rules\n25+ Blocklist", fillcolor="#9B59B6", fontcolor=white];
  FP       [label="False Positive\nSuppression", fillcolor="#9B59B6", fontcolor=white];

  // Outputs - VSCode
  Diag     [label="Diagnostics API\n(Red underlines)", fillcolor="#1ABC9C", fontcolor=white];
  Sidebar  [label="Sidebar TreeView\n(Findings panel)", fillcolor="#1ABC9C", fontcolor=white];
  Status   [label="Status Bar\n(Shield icon)", fillcolor="#1ABC9C", fontcolor=white];

  // Outputs - Git
  Hook     [label=".git/hooks/\npre-commit", fillcolor="#F5A623", fontcolor=white];
  Block    [label="Commit BLOCKED\n(exit 1)", fillcolor="#D0021B", fontcolor=white];
  Allow    [label="Commit allowed\n(exit 0)", fillcolor="#27AE60", fontcolor=white];

  // Other features
  History  [label="History Scanner\n(last 500 commits)", fillcolor="#95A5A6"];
  Report   [label="Report Exporter\n(HTML / JSON)", fillcolor="#95A5A6"];
  Gitignore [label="Auto-gitignore\nHelper", fillcolor="#95A5A6"];

  // Edges
  Editor   -> Cache   [label="debounced 800ms"];
  Cache    -> Scanner [label="cache miss only"];
  GitCmd   -> Hook;
  Hook     -> Scanner [label="staged files"];

  Scanner  -> Entropy;
  Scanner  -> Content;
  Scanner  -> Files;
  Scanner  -> FP;

  Entropy  -> Scanner [label="score", style=dashed];
  Content  -> Scanner [label="matches", style=dashed];
  Files    -> Scanner [label="blocked", style=dashed];
  FP       -> Scanner [label="filtered", style=dashed];

  Scanner  -> Diag    [label="findings"];
  Scanner  -> Sidebar [label="findings"];
  Scanner  -> Status  [label="health"];
  Scanner  -> Block   [label="secrets found"];
  Scanner  -> Allow   [label="clean"];

  Scanner  -> History [style=dashed, label="on demand"];
  Scanner  -> Report  [style=dashed, label="export"];
  Scanner  -> Gitignore [style=dashed, label="remediate"];
}
```

---

## 🆚 SecretGuard vs. GitHub Push Protection

| Feature | **SecretGuard** (this extension) | **GitHub Push Protection** |
|---|:---:|:---:|
| **Catches secrets while typing** | ✅ Yes (real-time, 800ms) | ❌ No |
| **Catches secrets at save** | ✅ Yes (onDidOpen) | ❌ No |
| **Catches secrets at commit** | ✅ Yes (pre-commit hook) | ❌ No |
| **Catches secrets at push** | ✅ Yes (scan on push too) | ✅ Yes |
| **Works offline** | ✅ Fully offline | ❌ Requires GitHub servers |
| **Works without VSCode** | ❌ Needs VSCode or CLI | ✅ Works from any git client |
| **Works with all git hosts** | ✅ GitLab, Bitbucket, etc. | ❌ GitHub only |
| **Custom regex rules** | ✅ Fully extensible | ⚠️ Partial (enterprise only) |
| **Shows exact line in editor** | ✅ Red underlines | ❌ Only blocks push |
| **Entropy-based detection** | ✅ Shannon entropy | ⚠️ Unknown internals |
| **Redacted output** | ✅ Never shows full secret | ✅ Yes |
| **Auto-gitignore fix** | ✅ One-click | ❌ No |
| **Git history audit** | ✅ Last 500 commits | ⚠️ On push only |
| **Export scan report** | ✅ HTML + JSON | ❌ No |
| **Remediation links** | ✅ Per-secret rotate URLs | ❌ No |
| **Works in private repos** | ✅ Yes | ✅ Yes (with Advanced Security) |
| **Works in public repos** | ✅ Yes | ✅ Free |
| **Free to use** | ✅ MIT open source | ✅ Free for public repos |
| **Response time** | ✅ Milliseconds (local) | ⚠️ Seconds (network round-trip) |
| **False positive suppression** | ✅ Entropy + heuristics | ⚠️ Pattern-only |

> **TL;DR:** GitHub Push Protection is your **last line of defense** at the network level. SecretGuard is your **first three lines of defense** — catching secrets before they're even staged.

---

## 🔄 How the Detection Pipeline Works

```
Developer types code
        │
        ▼ (800ms debounce)
┌───────────────────────┐
│  Is file in cache?    │──YES──► Skip (unchanged)
└──────────┬────────────┘
           │ NO
           ▼
┌───────────────────────┐
│ Check filename against│──MATCH──► Finding (file rule)
│ 25+ blocked patterns  │
└──────────┬────────────┘
           │ no match
           ▼
┌───────────────────────┐
│  Run 30+ regex rules  │──NO MATCH──► Clean ✅
│  against file content │
└──────────┬────────────┘
           │ MATCH
           ▼
┌───────────────────────┐
│ Extract matched value │
│ Compute Shannon H(x)  │
└──────────┬────────────┘
           │
    ┌──────▼──────┐
    │  H(x) ≥ 3.5?│──NO──► False positive, skip
    └──────┬──────┘
           │ YES
           ▼
┌───────────────────────┐
│ Check false positive  │
│ heuristics:           │
│ • Contains "example"? │──YES──► Mark as FP, warning only
│ • Contains "change_me"│
│ • All same character? │
│ • Template placeholder│
└──────────┬────────────┘
           │ REAL SECRET
           ▼
┌───────────────────────────────────────┐
│  Emit ScanFinding:                    │
│  {                                    │
│    ruleId: "aws-access-key",          │
│    severity: "error",                 │
│    line: 12, column: 18,              │
│    matchedValue: "AKIA****LKEY",      │  ← redacted
│    entropy: 3.84,                     │
│    remediationUrl: "https://..."      │
│  }                                    │
└───────────────────────────────────────┘
```

---

## 📁 Project Structure

```
secretguard/
├── src/
│   ├── extension.ts          # VSCode activation, 10 commands, event wiring
│   ├── scanner.ts            # Core detection engine (pure Node.js, no VSCode deps)
│   ├── cli-scanner.ts        # CLI entry point for git pre-commit hooks
│   ├── diagnostics.ts        # VSCode Diagnostics API integration (red underlines)
│   ├── statusBar.ts          # Status bar shield icon manager
│   ├── sidebarProvider.ts    # TreeView findings panel
│   ├── hookManager.ts        # Git pre-commit hook install/update
│   ├── historyScanner.ts     # Git log history auditor (last 500 commits)
│   ├── reportExporter.ts     # HTML + JSON report generator
│   ├── gitignoreHelper.ts    # Auto-add flagged files to .gitignore
│   ├── commitBlocker.ts      # VSCode-level commit prevention
│   ├── cache.ts              # LRU scan cache (SHA-256 content hashing)
│   ├── debounce.ts           # Debounce utility (800ms real-time scanning)
│   ├── remediationLinks.ts   # Per-rule rotation/revocation URLs
│   └── rules/
│       ├── index.ts          # Rule registry
│       ├── contentRules.ts   # 30+ regex patterns with metadata
│       ├── fileRules.ts      # 25+ filename blocklist
│       └── entropyCheck.ts   # Shannon entropy calculator
├── test/
│   ├── scanner.test.ts       # 30 integration tests
│   ├── entropy.test.ts       # 13 entropy unit tests
│   ├── tsconfig.json         # Test-specific TypeScript config (includes @types/jest)
│   └── fixtures/
│       ├── clean.js          # File with no secrets (should produce 0 findings)
│       ├── dirty_aws.js      # AWS key fixture (should produce 2 findings)
│       ├── dirty_github.js   # GitHub PAT fixture
│       ├── dirty_env.js      # Stripe + DB URL fixture
│       └── false_positive.js # Placeholder values (should be suppressed)
├── scripts/
│   └── precommit.sh          # Pre-commit hook shell template
├── dist/                     # esbuild output (gitignored)
│   ├── extension.js          # 31.5 KB bundled VSCode extension
│   └── cli-scanner.js        # 12 KB bundled CLI for git hooks
├── images/
│   └── icon.png              # 128×128 PNG extension icon
├── package.json              # Extension manifest + VSCode contribution points
├── tsconfig.json             # TypeScript config (CommonJS, strict)
├── esbuild.js                # Build script (both extension + CLI targets)
├── jest.config.json          # Jest configuration (ts-jest transformer)
├── secretguard.config.json   # Default user configuration
├── .vscodeignore             # Files excluded from VSIX package
├── LICENSE                   # MIT License
└── README.md                 # This file
```

---

## ⚙️ Configuration

```json
// VSCode settings.json
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

| Setting | Default | Description |
|---|---|---|
| `enableRealtime` | `true` | Scan as you type |
| `debounceMs` | `800` | Delay before scanning after keystroke |
| `entropyThreshold` | `3.5` | Minimum entropy to flag (higher = stricter) |
| `allowBypass` | `true` | Allow committing with `--no-verify` |
| `scanOnOpen` | `true` | Full workspace scan on activation |
| `maxFileSizeKb` | `500` | Skip files larger than this |
| `excludePatterns` | see above | Glob patterns to never scan |

---

## 🧪 Testing

```
Test Suites: 2 passed
Tests:       43 passed

PASS test/entropy.test.ts
  shannonEntropy()
    ✓ returns 0 for empty string
    ✓ returns 0 for single-character strings
    ✓ real AWS secret key has entropy ≥ 4.0
    ✓ common words have lower entropy than random tokens
    ... (7 more)
  isHighEntropy()
    ✓ returns true for high-entropy strings
    ✓ returns false for low-entropy strings
    ✓ respects custom threshold
    ... (5 more)

PASS test/scanner.test.ts
  ✓ Clean file produces zero findings
  ✓ AWS Access Key ID detected
  ✓ AWS key severity = error
  ✓ Remediation URL provided
  ✓ Matched value is redacted in message
  ✓ Example placeholder AWS key ignored
  ✓ GitHub PAT detected
  ✓ Line number correct
  ✓ .env flagged by filename
  ✓ id_rsa flagged by filename
  ✓ Stripe live key = error
  ✓ Stripe test key = warning
  ✓ PostgreSQL URL detected
  ✓ MongoDB URL detected
  ✓ PEM private key detected
  ✓ OpenSSH private key detected
  ✓ Google API key detected
  ✓ OpenAI key detected
  ✓ Anthropic key detected
  ✓ Slack webhook detected
  ✓ Discord webhook detected
  ✓ Placeholder not flagged as error
  ✓ change_me marked as false positive
  ✓ Entropy threshold respected
  ... (19 more)
```

---

## 🚦 Known Limitations

| Limitation | Explanation |
|---|---|
| No browser/web editor support | Only works inside VS Code desktop |
| Git hook only blocks, not scans history automatically | History scan is manual (run via command palette) |
| Binary files not scanned | Only text files are checked |
| Very obfuscated secrets may pass | Base64-encoded or encrypted secrets won't match patterns |
| Minified JS skipped | `*.min.js` excluded for performance |
| Entropy threshold may flag long random variable names | Tune `entropyThreshold` up to reduce |

---

## 🔗 Resources

- **Marketplace:** https://marketplace.visualstudio.com/items?itemName=secretguard.secretguard-git-protect
- **GitHub:** https://github.com/Dharaneswara-Reddy/secretguard-vscode
- **Issues:** https://github.com/Dharaneswara-Reddy/secretguard-vscode/issues
- **AWS Key Rotation:** https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html
- **GitHub Token Revocation:** https://github.com/settings/tokens
- **Stripe Key Rotation:** https://dashboard.stripe.com/apikeys

---

## 📄 License

MIT © 2026 Palle Venkata Dharaneswara Reddy

See [LICENSE](./LICENSE) for full text.

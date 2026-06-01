# 🏗️ SecretGuard — Architecture & Security Deep Dive

> Detailed technical documentation covering detection mechanisms, system design, and internal architecture.

---

## 🔐 Security Mechanisms

SecretGuard uses **three independent layers** of protection working in sequence:

---

### Layer 1 — Shannon Entropy Analysis

Every regex match is scored using **Shannon entropy** — a mathematical measure of randomness (bits per character). Real secrets (randomly generated tokens) have high entropy. Template placeholders (`YOUR_API_KEY`, `CHANGE_ME`) have low entropy and are filtered out automatically.

```
H(X) = -Σ p(x) × log₂(p(x))
```

| String | Entropy | Result |
|---|---|---|
| `wJalrXUtnFEMI/K7MDENG` | 4.21 bits/char | 🔴 Real secret — flagged |
| `AKIAIOSFODNN7EXAMPLE` | 3.68 bits/char | ✅ Placeholder — ignored |
| `YOUR_API_KEY_HERE` | 2.80 bits/char | ✅ Placeholder — ignored |
| `sk_live_aBcDeFgHiJk` | 4.05 bits/char | 🔴 Real secret — flagged |
| `aaaaaaaaaaaaaaaa` | 0.00 bits/char | ✅ Not a secret |
| `change_me_before_deploy` | 3.20 bits/char | ✅ Below threshold — ignored |

**Default threshold: 3.5 bits/char** (configurable via `secretguard.entropyThreshold`).

---

### Layer 2 — Regex Pattern Matching (30+ Rules)

| Rule ID | Secret Type | Pattern | Severity |
|---|---|---|---|
| `aws-access-key` | AWS Access Key ID | `AKIA[0-9A-Z]{16}` | 🔴 Error |
| `aws-secret-key` | AWS Secret Access Key | 40-char base64 near `aws` | 🔴 Error |
| `github-pat` | GitHub Personal Access Token | `ghp_[A-Za-z0-9]{36}` | 🔴 Error |
| `github-oauth` | GitHub OAuth Token | `gho_[A-Za-z0-9]{36}` | 🔴 Error |
| `github-actions` | GitHub Actions Token | `ghs_[A-Za-z0-9]{36}` | 🔴 Error |
| `stripe-live-key` | Stripe Live Secret Key | `sk_live_[A-Za-z0-9]{24}` | 🔴 Error |
| `stripe-test-key` | Stripe Test Key | `sk_test_[A-Za-z0-9]{24}` | 🟡 Warning |
| `google-api-key` | Google API Key | `AIza[0-9A-Za-z_-]{35}` | 🔴 Error |
| `private-key-pem` | PEM Private Key | `-----BEGIN.*PRIVATE KEY-----` | 🔴 Error |
| `ssh-private-key` | OpenSSH Private Key | `-----BEGIN OPENSSH PRIVATE KEY-----` | 🔴 Error |
| `jwt-token` | JSON Web Token | `eyJ[A-Za-z0-9_-]{20,}\.eyJ` | 🟡 Warning |
| `slack-token` | Slack Bot Token | `xoxb-[0-9]{11}-[0-9A-Za-z]{24}` | 🔴 Error |
| `slack-webhook` | Slack Webhook URL | `hooks.slack.com/services/T.../B.../...` | 🔴 Error |
| `discord-webhook` | Discord Webhook URL | `discord.com/api/webhooks/...` | 🔴 Error |
| `openai-key` | OpenAI API Key (classic) | `sk-[A-Za-z0-9]{48}` | 🔴 Error |
| `openai-key-new` | OpenAI API Key (new format) | `sk-proj-[A-Za-z0-9]{48}` | 🔴 Error |
| `anthropic-key` | Anthropic Claude Key | `sk-ant-[A-Za-z0-9]{40}` | 🔴 Error |
| `sendgrid-key` | SendGrid API Key | `SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}` | 🔴 Error |
| `database-url` | Database Connection String | `(postgres\|mysql\|mongodb)://.*:.*@` | 🔴 Error |
| `twilio-sid` | Twilio Account SID | `AC[a-z0-9]{32}` | 🔴 Error |
| `heroku-key` | Heroku API Key | UUID format near `heroku` | 🔴 Error |
| `generic-secret` | Generic Secret Assignment | `(secret\|password\|token)\s*=\s*["'][^"']{8,}` | 🟡 Warning |

---

### Layer 3 — Filename Blocklist (25+ patterns)

| Rule ID | Pattern | Examples |
|---|---|---|
| `env-file` | `.env` | `.env`, `.env.production` |
| `env-local` | `.env.*` | `.env.local`, `.env.staging` |
| `pem-key` | `*.pem` | `server.pem`, `cert.pem` |
| `id-rsa` | `id_rsa` | `~/.ssh/id_rsa` |
| `id-ed25519` | `id_ed25519` | `~/.ssh/id_ed25519` |
| `pkcs12` | `*.p12`, `*.pfx` | `keystore.p12` |
| `credentials-json` | `credentials.json` | Google service account |
| `service-account` | `*service-account*.json` | GCP service accounts |
| `kubeconfig` | `kubeconfig`, `*.kubeconfig` | Kubernetes configs |
| `vault-token` | `.vault-token` | HashiCorp Vault |
| `docker-config` | `config.json` in `.docker/` | Docker Hub credentials |
| `npmrc-auth` | `.npmrc` | npm auth tokens |
| `pypirc` | `.pypirc` | PyPI upload credentials |
| `netrc` | `.netrc` | FTP/HTTP credentials |

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
                    │   key: djb2(content)     │    (performance guard)
                    └────────────┬────────────┘
                                 │ cache miss
                    ┌────────────▼────────────┐
                    │    scanner.ts (pure)     │  ← Zero VSCode deps
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
                    └──┬──────────┬──────┬─────┘
                       │          │      │
         ┌─────────────▼──┐  ┌────▼──┐  └────────────────┐
         │ DiagnosticsAPI  │  │Sidebar│          StatusBar │
         │ (red squiggles) │  │TreeView│        (🛡 shield) │
         └────────────────┘  └───────┘          └─────────┘

  GIT LAYER (pre-commit hook — cli-scanner.ts)
  ┌─────────────────────────────────────────────────────────────────────┐
  │                                                                     │
  │  git commit ──► .git/hooks/pre-commit ──► node cli-scanner.js     │
  │                                                    │               │
  │                       ┌────────────────────────────▼─────────────┐ │
  │                       │  Same scanner.ts engine (reused)          │ │
  │                       │  Scans only git-staged files              │ │
  │                       │  Exit 1 → commit BLOCKED                  │ │
  │                       │  Exit 0 → commit allowed                  │ │
  │                       └──────────────────────────────────────────┘ │
  └─────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Detection Pipeline (Step by Step)

```
Developer types code
        │
        ▼ (800ms debounce)
┌───────────────────────┐
│  Is file in cache?    │──YES──► Skip (content unchanged)
└──────────┬────────────┘
           │ NO
           ▼
┌───────────────────────┐
│ Check filename against│──MATCH──► Emit Finding (file rule)
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
    │  H(x) ≥ 3.5?│──NO──► False positive, silently skip
    └──────┬──────┘
           │ YES
           ▼
┌──────────────────────────┐
│ False positive heuristics │
│ • Contains "example"?    │──YES──► Mark isFalsePositive=true
│ • Contains "change_me"?  │        downgrade to warning
│ • All same character?    │
│ • Template placeholder?  │
└──────────┬───────────────┘
           │ CONFIRMED REAL SECRET
           ▼
┌──────────────────────────────────────┐
│  Emit ScanFinding {                  │
│    ruleId:         "aws-access-key"  │
│    ruleName:       "AWS Access Key"  │
│    severity:       "error"           │
│    filePath:       "/app/config.js"  │
│    line:           12                │
│    column:         18                │
│    matchedValue:   "AKIA****LKEY"    │  ← redacted
│    entropy:        3.84              │
│    remediationUrl: "https://..."     │
│  }                                   │
└──────────────────────────────────────┘
```

---

## 📦 GraphViz System Diagram

Paste this into [graphviz.online](https://graphviz.online) to render a visual diagram:

```dot
digraph SecretGuard {
  rankdir=TB;
  node [shape=box, style=filled, fontname="Helvetica"];
  edge [fontname="Helvetica", fontsize=10];

  Editor   [label="VSCode Editor\n(file change)", fillcolor="#4A90D9", fontcolor=white];
  GitCmd   [label="git commit", fillcolor="#F5A623", fontcolor=white];
  Cache    [label="LRU Scan Cache\n(djb2 hash key)", fillcolor="#7ED321", fontcolor=white];
  Scanner  [label="scanner.ts\n(Pure Node.js Engine)", fillcolor="#D0021B", fontcolor=white, shape=ellipse];
  Entropy  [label="Shannon Entropy\nentropyCheck.ts", fillcolor="#9B59B6", fontcolor=white];
  Content  [label="Content Rules\n30+ Regex Patterns", fillcolor="#9B59B6", fontcolor=white];
  Files    [label="File Rules\n25+ Blocklist", fillcolor="#9B59B6", fontcolor=white];
  FP       [label="False Positive\nSuppression", fillcolor="#9B59B6", fontcolor=white];
  Diag     [label="Diagnostics API\n(Red underlines)", fillcolor="#1ABC9C", fontcolor=white];
  Sidebar  [label="Sidebar TreeView\n(Findings panel)", fillcolor="#1ABC9C", fontcolor=white];
  Status   [label="Status Bar\n(Shield icon)", fillcolor="#1ABC9C", fontcolor=white];
  Hook     [label=".git/hooks/\npre-commit", fillcolor="#F5A623", fontcolor=white];
  Block    [label="Commit BLOCKED\n(exit 1)", fillcolor="#D0021B", fontcolor=white];
  Allow    [label="Commit allowed\n(exit 0)", fillcolor="#27AE60", fontcolor=white];
  History  [label="History Scanner\n(last 500 commits)", fillcolor="#95A5A6"];
  Report   [label="Report Exporter\n(HTML / JSON)", fillcolor="#95A5A6"];
  Gitignore [label="Auto-gitignore\nHelper", fillcolor="#95A5A6"];

  Editor   -> Cache    [label="debounced 800ms"];
  Cache    -> Scanner  [label="cache miss only"];
  GitCmd   -> Hook;
  Hook     -> Scanner  [label="staged files"];
  Scanner  -> Entropy;
  Scanner  -> Content;
  Scanner  -> Files;
  Scanner  -> FP;
  Entropy  -> Scanner  [label="score", style=dashed];
  Content  -> Scanner  [label="matches", style=dashed];
  Files    -> Scanner  [label="blocked", style=dashed];
  FP       -> Scanner  [label="filtered", style=dashed];
  Scanner  -> Diag     [label="findings"];
  Scanner  -> Sidebar  [label="findings"];
  Scanner  -> Status   [label="health"];
  Scanner  -> Block    [label="secrets found"];
  Scanner  -> Allow    [label="clean"];
  Scanner  -> History  [style=dashed, label="on demand"];
  Scanner  -> Report   [style=dashed, label="export"];
  Scanner  -> Gitignore [style=dashed, label="remediate"];
}
```

---

## 📁 Full Project Structure

```
secretguard/
├── src/
│   ├── extension.ts          # Activation, 10 commands, event wiring
│   ├── scanner.ts            # Core engine (pure Node.js, zero VSCode deps)
│   ├── cli-scanner.ts        # CLI entry point for git pre-commit hooks
│   ├── diagnostics.ts        # VSCode Diagnostics API (red underlines)
│   ├── statusBar.ts          # Status bar shield icon
│   ├── sidebarProvider.ts    # TreeView findings panel (own findings Map)
│   ├── hookManager.ts        # Git pre-commit hook install/update
│   ├── historyScanner.ts     # Git log history auditor (last 500 commits)
│   ├── reportExporter.ts     # HTML + JSON report generator
│   ├── gitignoreHelper.ts    # Auto-add flagged files to .gitignore
│   ├── commitBlocker.ts      # VSCode-level commit prevention
│   ├── cache.ts              # LRU scan cache (djb2 content hashing)
│   ├── debounce.ts           # Debounce utility
│   ├── remediationLinks.ts   # Per-rule rotation/revocation URLs
│   └── rules/
│       ├── index.ts          # Rule registry
│       ├── contentRules.ts   # 30+ regex patterns with metadata
│       ├── fileRules.ts      # 25+ filename blocklist
│       └── entropyCheck.ts   # Shannon entropy H(x) calculator
├── test/
│   ├── scanner.test.ts       # 30 integration tests
│   ├── entropy.test.ts       # 13 entropy unit tests
│   ├── tsconfig.json         # Test tsconfig with @types/jest
│   └── fixtures/
│       ├── clean.js          # No secrets — expects 0 findings
│       ├── dirty_aws.js      # AWS key — expects ≥1 finding
│       ├── dirty_github.js   # GitHub PAT fixture
│       ├── dirty_env.js      # Stripe + DB URL fixture
│       └── false_positive.js # Placeholder values — expects 0 errors
├── scripts/
│   └── precommit.sh          # Pre-commit hook shell template
├── dist/                     # esbuild output (gitignored)
│   ├── extension.js          # 31.7 KB bundled VSCode extension
│   └── cli-scanner.js        # 12 KB bundled CLI scanner
├── images/
│   └── icon.png              # 128×128 PNG extension icon
├── package.json              # Extension manifest
├── tsconfig.json             # TypeScript (CommonJS, strict)
├── esbuild.js                # Build script (dual targets)
├── jest.config.json          # Jest + ts-jest config
├── secretguard.config.json   # Default user configuration
├── .vscodeignore             # VSIX exclusions
├── LICENSE                   # MIT License
├── README.md                 # User-facing documentation
└── ARCHITECTURE.md           # This file
```

---

## 🧠 Key Design Decisions

### 1. Decoupled Scanner (`scanner.ts`)
The core detection engine has **zero VSCode dependencies**. It's pure Node.js. This is why the same `scanner.ts` powers both:
- The VSCode extension (real-time UI)
- The CLI git hook (`cli-scanner.js`)

### 2. SidebarProvider Has Its Own Findings Map
The sidebar does **not** read from `ScanCache`. It has its own `Map<string, ScanResult[]>` updated via `setFindings(path, results)` after every scan. This prevents stale cache reads from causing empty panels.

### 3. LRU Cache for Performance
The `ScanCache` uses a djb2 hash of file content as a key. If the hash matches, the file is skipped entirely. This makes re-scanning a 1000-file workspace fast after the first pass.

### 4. esbuild for Bundling
Two entry points are built:
- `dist/extension.js` (31.7 KB) — the VSCode extension
- `dist/cli-scanner.js` (12 KB) — the git hook CLI

Using `external: ['vscode']` ensures VSCode APIs are not bundled.

---

*For user-facing docs, see [README.md](./README.md)*

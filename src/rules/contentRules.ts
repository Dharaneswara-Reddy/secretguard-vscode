// src/rules/contentRules.ts
// Regex-based content patterns for detecting secrets in source code

export interface ContentRule {
  id: string;
  name: string;
  pattern: RegExp;
  captureGroup: number;          // which regex group contains the actual secret value
  entropyCheck: boolean;         // whether to apply Shannon entropy filter
  entropyThreshold?: number;
  severity: 'error' | 'warning';
  remediationUrl?: string;
  falsePositiveHints?: string[]; // phrases that indicate placeholder/example text
}

export const CONTENT_RULES: ContentRule[] = [
  // ── AWS ──────────────────────────────────────────────────────────────
  {
    id: 'aws-access-key',
    name: 'AWS Access Key ID',
    pattern: /\b(AKIA[0-9A-Z]{16})\b/,
    captureGroup: 1,
    entropyCheck: true,
    entropyThreshold: 3.5,
    severity: 'error',
    remediationUrl: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html'
  },
  {
    id: 'aws-secret-key',
    name: 'AWS Secret Access Key',
    pattern: /(?:aws[_\-\s]?secret[_\-\s]?(?:access[_\-\s]?)?key|aws[_\-\s]?secret)\s*[=:]\s*["']?([A-Za-z0-9/+=]{40})["']?/i,
    captureGroup: 1,
    entropyCheck: true,
    entropyThreshold: 4.0,
    severity: 'error',
    remediationUrl: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html'
  },

  // ── GitHub ────────────────────────────────────────────────────────────
  {
    id: 'github-pat',
    name: 'GitHub Personal Access Token',
    pattern: /\b(ghp_[a-zA-Z0-9]{36})\b/,
    captureGroup: 1,
    entropyCheck: false,
    severity: 'error',
    remediationUrl: 'https://github.com/settings/tokens'
  },
  {
    id: 'github-oauth',
    name: 'GitHub OAuth Token',
    pattern: /\b(gho_[a-zA-Z0-9]{36})\b/,
    captureGroup: 1,
    entropyCheck: false,
    severity: 'error',
    remediationUrl: 'https://github.com/settings/applications'
  },
  {
    id: 'github-actions-token',
    name: 'GitHub Actions Token',
    pattern: /\b(ghs_[a-zA-Z0-9]{36})\b/,
    captureGroup: 1,
    entropyCheck: false,
    severity: 'error'
  },

  // ── Stripe ────────────────────────────────────────────────────────────
  {
    id: 'stripe-live-key',
    name: 'Stripe Live Secret Key',
    pattern: /\b(sk_live_[a-zA-Z0-9]{24,})\b/,
    captureGroup: 1,
    entropyCheck: false,
    severity: 'error',
    remediationUrl: 'https://dashboard.stripe.com/apikeys'
  },
  {
    id: 'stripe-test-key',
    name: 'Stripe Test Secret Key',
    pattern: /\b(sk_test_[a-zA-Z0-9]{24,})\b/,
    captureGroup: 1,
    entropyCheck: false,
    severity: 'warning'
  },
  {
    id: 'stripe-restricted-key',
    name: 'Stripe Restricted Key',
    pattern: /\b(rk_live_[a-zA-Z0-9]{24,})\b/,
    captureGroup: 1,
    entropyCheck: false,
    severity: 'error',
    remediationUrl: 'https://dashboard.stripe.com/apikeys'
  },

  // ── Google ────────────────────────────────────────────────────────────
  {
    id: 'google-api-key',
    name: 'Google API Key',
    pattern: /\b(AIza[0-9A-Za-z_\-]{35})\b/,
    captureGroup: 1,
    entropyCheck: false,
    severity: 'error',
    remediationUrl: 'https://console.cloud.google.com/apis/credentials'
  },
  {
    id: 'google-oauth-client',
    name: 'Google OAuth Client Secret',
    pattern: /GOCSPX-[a-zA-Z0-9_\-]{28}/,
    captureGroup: 0,
    entropyCheck: false,
    severity: 'error',
    remediationUrl: 'https://console.cloud.google.com/apis/credentials'
  },

  // ── Crypto / TLS ──────────────────────────────────────────────────────
  {
    id: 'private-key-pem',
    name: 'PEM Private Key',
    pattern: /-----BEGIN (RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY( BLOCK)?-----/,
    captureGroup: 0,
    entropyCheck: false,
    severity: 'error'
  },
  {
    id: 'ssh-private-key',
    name: 'SSH Private Key Content',
    pattern: /-----BEGIN OPENSSH PRIVATE KEY-----/,
    captureGroup: 0,
    entropyCheck: false,
    severity: 'error'
  },
  {
    id: 'certificate-chain',
    name: 'Certificate / Certificate Chain',
    pattern: /-----BEGIN CERTIFICATE-----/,
    captureGroup: 0,
    entropyCheck: false,
    severity: 'warning'
  },

  // ── JWT ───────────────────────────────────────────────────────────────
  {
    id: 'jwt-token',
    name: 'JSON Web Token',
    pattern: /\b(eyJ[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+)\b/,
    captureGroup: 1,
    entropyCheck: true,
    entropyThreshold: 4.5,
    severity: 'warning'
  },

  // ── Slack / Discord ───────────────────────────────────────────────────
  {
    id: 'slack-token',
    name: 'Slack Token',
    pattern: /\b(xox[baprs]-[0-9a-zA-Z\-]{10,})\b/,
    captureGroup: 1,
    entropyCheck: false,
    severity: 'error',
    remediationUrl: 'https://api.slack.com/apps'
  },
  {
    id: 'slack-webhook',
    name: 'Slack Webhook URL',
    pattern: /https:\/\/hooks\.slack\.com\/services\/T[a-zA-Z0-9_]+\/B[a-zA-Z0-9_]+\/[a-zA-Z0-9_]+/,
    captureGroup: 0,
    entropyCheck: false,
    severity: 'error',
    remediationUrl: 'https://api.slack.com/apps'
  },
  {
    id: 'discord-webhook',
    name: 'Discord Webhook URL',
    pattern: /https:\/\/discord(?:app)?\.com\/api\/webhooks\/[0-9]+\/[a-zA-Z0-9_\-]+/,
    captureGroup: 0,
    entropyCheck: false,
    severity: 'error'
  },
  {
    id: 'discord-bot-token',
    name: 'Discord Bot Token',
    pattern: /\b((?:MTA|MTI|MTM|OT|ND|NJ)[a-zA-Z0-9_\-]{20,}\.[\w\-]{6}\.[\w\-]{27,})\b/,
    captureGroup: 1,
    entropyCheck: false,
    severity: 'error'
  },

  // ── Twilio ────────────────────────────────────────────────────────────
  {
    id: 'twilio-account-sid',
    name: 'Twilio Account SID',
    pattern: /\b(AC[a-zA-Z0-9]{32})\b/,
    captureGroup: 1,
    entropyCheck: false,
    severity: 'error',
    remediationUrl: 'https://console.twilio.com/'
  },
  {
    id: 'twilio-auth-token',
    name: 'Twilio Auth Token',
    pattern: /(?:twilio[_\-\s]?auth[_\-\s]?token|TWILIO_AUTH_TOKEN)\s*[=:]\s*["']?([a-f0-9]{32})["']?/i,
    captureGroup: 1,
    entropyCheck: true,
    severity: 'error',
    remediationUrl: 'https://console.twilio.com/'
  },

  // ── Firebase / OpenAI / Anthropic ─────────────────────────────────────
  {
    id: 'firebase-key',
    name: 'Firebase API Key / Service Account',
    pattern: /(?:firebase[_\-\s]?(?:api[_\-\s]?)?key|FIREBASE_API_KEY)\s*[=:]\s*["']?([A-Za-z0-9_\-]{39})["']?/i,
    captureGroup: 1,
    entropyCheck: true,
    severity: 'error',
    remediationUrl: 'https://console.firebase.google.com/'
  },
  {
    id: 'openai-key',
    name: 'OpenAI API Key',
    pattern: /\b(sk-[a-zA-Z0-9]{20}T3BlbkFJ[a-zA-Z0-9]{20})\b/,
    captureGroup: 1,
    entropyCheck: false,
    severity: 'error',
    remediationUrl: 'https://platform.openai.com/api-keys'
  },
  {
    id: 'openai-key-new',
    name: 'OpenAI API Key (new format)',
    pattern: /\b(sk-proj-[a-zA-Z0-9_\-]{48,})\b/,
    captureGroup: 1,
    entropyCheck: false,
    severity: 'error',
    remediationUrl: 'https://platform.openai.com/api-keys'
  },
  {
    id: 'anthropic-key',
    name: 'Anthropic API Key',
    pattern: /\b(sk-ant-[a-zA-Z0-9_\-]{40,})\b/,
    captureGroup: 1,
    entropyCheck: false,
    severity: 'error',
    remediationUrl: 'https://console.anthropic.com/settings/keys'
  },

  // ── Email Services ────────────────────────────────────────────────────
  {
    id: 'sendgrid-key',
    name: 'SendGrid API Key',
    pattern: /\b(SG\.[a-zA-Z0-9_\-]{22}\.[a-zA-Z0-9_\-]{43})\b/,
    captureGroup: 1,
    entropyCheck: false,
    severity: 'error',
    remediationUrl: 'https://app.sendgrid.com/settings/api_keys'
  },
  {
    id: 'mailgun-key',
    name: 'Mailgun API Key',
    pattern: /\b(key-[a-zA-Z0-9]{32})\b/,
    captureGroup: 1,
    entropyCheck: false,
    severity: 'error'
  },

  // ── Cloud / Infrastructure ────────────────────────────────────────────
  {
    id: 'heroku-api-key',
    name: 'Heroku API Key',
    pattern: /\b([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/,
    captureGroup: 1,
    entropyCheck: true,
    entropyThreshold: 3.8,
    severity: 'warning'
  },
  {
    id: 'database-url',
    name: 'Database Connection String',
    pattern: /(?:postgres|postgresql|mysql|mongodb(?:\+srv)?|redis|mssql|sqlserver):\/\/[^:]+:[^@]+@[^\s"']+/i,
    captureGroup: 0,
    entropyCheck: false,
    severity: 'error'
  },
  {
    id: 'npm-auth-token',
    name: 'NPM Auth Token',
    pattern: /(?:NPM_TOKEN|npm_auth_token|\/\/registry\.npmjs\.org\/:_authToken)\s*[=:]\s*["']?([a-zA-Z0-9_\-]{36,})["']?/i,
    captureGroup: 1,
    entropyCheck: false,
    severity: 'error'
  },
  {
    id: 'azure-connection-string',
    name: 'Azure Storage Connection String',
    pattern: /DefaultEndpointsProtocol=https;AccountName=[^;]+;AccountKey=[^;]+;EndpointSuffix=/,
    captureGroup: 0,
    entropyCheck: false,
    severity: 'error',
    remediationUrl: 'https://portal.azure.com/'
  },

  // ── Generic high-entropy secrets ──────────────────────────────────────
  {
    id: 'generic-secret',
    name: 'Generic Secret Assignment',
    pattern: /(?:secret|api[_\-]?key|auth[_\-]?token|access[_\-]?token|private[_\-]?key|client[_\-]?secret)\s*[=:]\s*["']([^"'${}]{8,})["']/i,
    captureGroup: 1,
    entropyCheck: true,
    entropyThreshold: 3.5,
    severity: 'warning',
    falsePositiveHints: ['example', 'placeholder', 'your_', 'change_me', 'xxx', 'todo', 'test', 'fake', 'dummy', 'sample', '<', '>']
  }
];

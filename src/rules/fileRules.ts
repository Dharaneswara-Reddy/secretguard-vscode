// src/rules/fileRules.ts
// Filename / extension blocklist — flags dangerous files by name alone

export interface FileRule {
  id: string;
  name: string;
  pattern: RegExp;
  type: 'regex';
  severity: 'error' | 'warning';
  description: string;
}

export const FILE_RULES: FileRule[] = [
  // ── Environment files ─────────────────────────────────────────────────
  { id: 'env-file',         name: '.env file',              pattern: /^\.env$/,                  type: 'regex', severity: 'error',   description: 'Environment variables file — should NEVER be committed' },
  { id: 'env-local',        name: '.env.* file',            pattern: /^\.env\..+$/,              type: 'regex', severity: 'error',   description: 'Local environment overrides (e.g. .env.local, .env.production)' },
  { id: 'env-generic',      name: '.env.* (any extension)', pattern: /\.env$/i,                  type: 'regex', severity: 'warning', description: 'File ending in .env' },

  // ── Cryptographic material ────────────────────────────────────────────
  { id: 'pem-key',          name: 'PEM Certificate/Key',    pattern: /\.pem$/i,                  type: 'regex', severity: 'error',   description: 'PEM-encoded certificate or private key' },
  { id: 'key-file',         name: 'Key File',               pattern: /\.key$/i,                  type: 'regex', severity: 'error',   description: 'Generic cryptographic key file' },
  { id: 'p12-cert',         name: 'PKCS#12 Certificate',    pattern: /\.p12$/i,                  type: 'regex', severity: 'error',   description: 'PKCS#12 certificate bundle' },
  { id: 'pfx-cert',         name: 'PFX Certificate',        pattern: /\.pfx$/i,                  type: 'regex', severity: 'error',   description: 'Personal Information Exchange file' },
  { id: 'jks-keystore',     name: 'Java KeyStore',          pattern: /\.jks$/i,                  type: 'regex', severity: 'error',   description: 'Java KeyStore file' },

  // ── SSH keys ──────────────────────────────────────────────────────────
  { id: 'id-rsa',           name: 'SSH RSA Private Key',    pattern: /^id_rsa$/,                 type: 'regex', severity: 'error',   description: 'SSH RSA private key' },
  { id: 'id-dsa',           name: 'SSH DSA Private Key',    pattern: /^id_dsa$/,                 type: 'regex', severity: 'error',   description: 'SSH DSA private key' },
  { id: 'id-ed25519',       name: 'SSH Ed25519 Key',        pattern: /^id_ed25519$/,             type: 'regex', severity: 'error',   description: 'SSH Ed25519 private key' },
  { id: 'id-ecdsa',         name: 'SSH ECDSA Key',          pattern: /^id_ecdsa$/,               type: 'regex', severity: 'error',   description: 'SSH ECDSA private key' },

  // ── Google / GCP ──────────────────────────────────────────────────────
  { id: 'credentials-json', name: 'Google Credentials',     pattern: /credentials\.json$/i,      type: 'regex', severity: 'error',   description: 'Google OAuth / service account credentials' },
  { id: 'service-account',  name: 'GCP Service Account',    pattern: /service[-_]account\.json$/i, type: 'regex', severity: 'error', description: 'GCP service account JSON key' },
  { id: 'gcp-key-json',     name: 'GCP Key JSON',           pattern: /gcp[-_]key\.json$/i,       type: 'regex', severity: 'error',   description: 'GCP service key file' },

  // ── NPM / Network credentials ─────────────────────────────────────────
  { id: 'npmrc',            name: '.npmrc with token',      pattern: /^\.npmrc$/,                type: 'regex', severity: 'warning', description: 'NPM config (may contain auth token)' },
  { id: 'netrc',            name: '.netrc credentials',     pattern: /^\.netrc$/,                type: 'regex', severity: 'error',   description: 'Network credentials file (username/password in plaintext)' },
  { id: 'htpasswd',         name: '.htpasswd',              pattern: /\.htpasswd$/i,             type: 'regex', severity: 'error',   description: 'Apache HTTP password file' },

  // ── OS credential stores ──────────────────────────────────────────────
  { id: 'kwallet',          name: 'KWallet file',           pattern: /\.kwallet$/i,              type: 'regex', severity: 'error',   description: 'KDE Wallet credentials store' },
  { id: 'keychain',         name: 'macOS Keychain',         pattern: /\.keychain(-db)?$/i,       type: 'regex', severity: 'error',   description: 'macOS Keychain file' },
  { id: 'wallet-dat',       name: 'Crypto Wallet',          pattern: /wallet\.dat$/i,            type: 'regex', severity: 'error',   description: 'Cryptocurrency wallet data' },

  // ── Cloud / Infra ──────────────────────────────────────────────────────
  { id: 'terraform-tfvars', name: 'Terraform Variables',    pattern: /\.tfvars$/i,               type: 'regex', severity: 'warning', description: 'Terraform variable values (may contain secrets)' },
  { id: 'docker-config',    name: 'Docker Registry Auth',   pattern: /config\.json$/i,           type: 'regex', severity: 'warning', description: 'Docker registry auth config' },
  { id: 'kubeconfig',       name: 'Kubernetes Config',      pattern: /kubeconfig(\.ya?ml)?$/i,   type: 'regex', severity: 'error',   description: 'Kubernetes cluster credentials' },
  { id: 'vault-token',      name: 'HashiCorp Vault Token',  pattern: /\.vault[-_]token$/i,       type: 'regex', severity: 'error',   description: 'HashiCorp Vault token file' }
];

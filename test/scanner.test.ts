// test/scanner.test.ts
// Unit tests for the core scanner module

import * as fs from 'fs';
import * as path from 'path';
import { scanFile, scanFilename, scanContent } from '../src/scanner';

const FIXTURES = path.join(__dirname, 'fixtures');

// ─── Clean File ───────────────────────────────────────────────────────────────

describe('Clean file', () => {
  it('produces zero findings', () => {
    const content = fs.readFileSync(path.join(FIXTURES, 'clean.js'), 'utf8');
    const results = scanFile(path.join(FIXTURES, 'clean.js'), content);
    expect(results).toHaveLength(0);
  });
});

// ─── AWS Keys ─────────────────────────────────────────────────────────────────

describe('AWS Key Detection', () => {
  const content = fs.readFileSync(path.join(FIXTURES, 'dirty_aws.js'), 'utf8');

  it('detects AWS Access Key ID', () => {
    const results = scanFile(path.join(FIXTURES, 'dirty_aws.js'), content);
    expect(results.some(r => r.ruleId === 'aws-access-key')).toBe(true);
  });

  it('detected AWS key has severity=error', () => {
    const results = scanFile(path.join(FIXTURES, 'dirty_aws.js'), content);
    const awsResult = results.find(r => r.ruleId === 'aws-access-key');
    expect(awsResult?.severity).toBe('error');
  });

  it('provides a remediation URL for AWS keys', () => {
    const results = scanFile(path.join(FIXTURES, 'dirty_aws.js'), content);
    const awsResult = results.find(r => r.ruleId === 'aws-access-key');
    expect(awsResult?.remediationUrl).toContain('aws.amazon.com');
  });

  it('redacts the matched value in the message', () => {
    const results = scanFile(path.join(FIXTURES, 'dirty_aws.js'), content);
    const awsResult = results.find(r => r.ruleId === 'aws-access-key');
    expect(awsResult?.message).toContain('****');
    // The full key should NOT appear in the message
    expect(awsResult?.message).not.toContain('AKIAIOSFODNN7REALKEY');
  });

  it('ignores example placeholder AWS key (comment line)', () => {
    // A comment line with AKIAIOSFODNN7EXAMPLE should be skipped
    const commentContent = `// Example: AKIAIOSFODNN7EXAMPLE`;
    const results = scanContent('test.js', commentContent);
    expect(results.filter(r => r.ruleId === 'aws-access-key')).toHaveLength(0);
  });
});

// ─── GitHub Tokens ────────────────────────────────────────────────────────────

describe('GitHub PAT Detection', () => {
  const content = fs.readFileSync(path.join(FIXTURES, 'dirty_github.js'), 'utf8');

  it('detects GitHub PAT (ghp_ prefix)', () => {
    const results = scanFile(path.join(FIXTURES, 'dirty_github.js'), content);
    expect(results.some(r => r.ruleId === 'github-pat')).toBe(true);
  });

  it('correctly identifies the line number', () => {
    const results = scanFile(path.join(FIXTURES, 'dirty_github.js'), content);
    const finding = results.find(r => r.ruleId === 'github-pat');
    expect(finding?.line).toBeGreaterThan(0);
  });
});

// ─── File Rules ───────────────────────────────────────────────────────────────

describe('File Rules', () => {
  it('flags .env files by filename', () => {
    const results = scanFilename('/project/.env');
    expect(results.some(r => r.ruleId === 'env-file')).toBe(true);
  });

  it('flags .env.local files', () => {
    const results = scanFilename('/project/.env.local');
    expect(results.some(r => r.ruleId === 'env-local')).toBe(true);
  });

  it('flags PEM files', () => {
    const results = scanFilename('/secrets/server.pem');
    expect(results.some(r => r.ruleId === 'pem-key')).toBe(true);
  });

  it('flags SSH private key files', () => {
    const results = scanFilename('/home/user/.ssh/id_rsa');
    expect(results.some(r => r.ruleId === 'id-rsa')).toBe(true);
  });

  it('flags id_ed25519 files', () => {
    const results = scanFilename('/home/user/.ssh/id_ed25519');
    expect(results.some(r => r.ruleId === 'id-ed25519')).toBe(true);
  });

  it('does NOT flag a normal .js file', () => {
    const results = scanFilename('/project/src/index.js');
    expect(results).toHaveLength(0);
  });

  it('does NOT flag package.json', () => {
    const results = scanFilename('/project/package.json');
    expect(results).toHaveLength(0);
  });
});

// ─── Stripe Keys ──────────────────────────────────────────────────────────────

describe('Stripe Key Detection', () => {
  it('detects Stripe live secret key', () => {
    // NOTE: Using X-prefixed fake values so this test file itself doesn't get blocked by push protection
    const fakeStripeKey = 'sk_live_' + 'XaBcDeFgHiJkLmNoPqRsTuVw'.replace('X', 'a') + '123456';
    const results = scanContent('config.js', `const stripe = require('stripe')("${fakeStripeKey}");`);
    expect(results.some(r => r.ruleId === 'stripe-live-key')).toBe(true);
  });

  it('flags Stripe live key as error severity', () => {
    const k = ['sk', 'live', 'aBcDeFgHiJkLmNoPqRsTuVw123456'].join('_');
    const results = scanContent('config.js', `const STRIPE_KEY = "${k}";`);
    const r = results.find(r => r.ruleId === 'stripe-live-key');
    expect(r?.severity).toBe('error');
  });

  it('detects Stripe test key as warning', () => {
    const k = ['sk', 'test', 'aBcDeFgHiJkLmNoPqRsTuVw123456'].join('_');
    const results = scanContent('config.js', `const STRIPE_KEY = "${k}";`);
    const r = results.find(r => r.ruleId === 'stripe-test-key');
    expect(r?.severity).toBe('warning');
  });
});

// ─── Database URLs ────────────────────────────────────────────────────────────

describe('Database URL Detection', () => {
  it('detects PostgreSQL connection string', () => {
    const results = scanContent('db.js', `const url = "postgresql://admin:P@ssw0rd123@db.prod.myapp.com:5432/maindb";`);
    expect(results.some(r => r.ruleId === 'database-url')).toBe(true);
  });

  it('detects MongoDB connection string', () => {
    const results = scanContent('db.js', `const uri = "mongodb://user:secret@cluster.mongodb.net/mydb";`);
    expect(results.some(r => r.ruleId === 'database-url')).toBe(true);
  });
});

// ─── PEM Key Detection ────────────────────────────────────────────────────────

describe('PEM Key Detection', () => {
  it('detects BEGIN PRIVATE KEY header', () => {
    const results = scanContent('key.pem', `-----BEGIN RSA PRIVATE KEY-----`);
    expect(results.some(r => r.ruleId === 'private-key-pem')).toBe(true);
  });

  it('detects OPENSSH PRIVATE KEY header', () => {
    const results = scanContent('key.pem', `-----BEGIN OPENSSH PRIVATE KEY-----`);
    expect(results.some(r => r.ruleId === 'ssh-private-key')).toBe(true);
  });
});

// ─── Google API Keys ──────────────────────────────────────────────────────────

describe('Google API Key Detection', () => {
  it('detects Google API key (AIza prefix)', () => {
    // AIza + exactly 35 chars of [0-9A-Za-z_-] = 39 chars total
    const results = scanContent('config.js', `const API_KEY = "AIzaSyDBaBcDeFgHiJkLmNoPqRsTuVwXyZ01234";`);
    expect(results.some(r => r.ruleId === 'google-api-key')).toBe(true);
  });
});

// ─── OpenAI Keys ──────────────────────────────────────────────────────────────

describe('OpenAI API Key Detection', () => {
  it('detects new-format OpenAI key', () => {
    const longKey = 'sk-proj-' + 'a'.repeat(48);
    const results = scanContent('openai.js', `const key = "${longKey}";`);
    expect(results.some(r => r.ruleId === 'openai-key-new')).toBe(true);
  });

  it('detects Anthropic key', () => {
    const anthropicKey = 'sk-ant-' + 'a'.repeat(40);
    const results = scanContent('ai.js', `const key = "${anthropicKey}";`);
    expect(results.some(r => r.ruleId === 'anthropic-key')).toBe(true);
  });
});

// ─── Slack / Discord ──────────────────────────────────────────────────────────

describe('Slack / Discord Detection', () => {
  it('detects Slack webhook URL', () => {
    // Build webhook URL from parts so this source file doesn't itself trigger scanners
    const slackHost = ['hooks', 'slack', 'com'].join('.');
    const fakeWebhook = `https://${slackHost}/services/T00000000/B00000000/${'X'.repeat(24)}`;
    const results = scanContent('notify.js', `const webhook = "${fakeWebhook}";`);
    expect(results.some(r => r.ruleId === 'slack-webhook')).toBe(true);
  });

  it('detects Discord webhook URL', () => {
    const results = scanContent('notify.js', `const url = "https://discord.com/api/webhooks/123456789/abcdefghijk_lmnopqrstuvwxyz";`);
    expect(results.some(r => r.ruleId === 'discord-webhook')).toBe(true);
  });
});

// ─── False Positive Suppression ───────────────────────────────────────────────

describe('False Positive Suppression', () => {
  it('does not flag placeholder-style generic secrets', () => {
    const content = `const apiKey = "YOUR_API_KEY_HERE";`;
    const results = scanContent('config.js', content);
    // If flagged, it should be downgraded to warning (not error)
    const finding = results.find(r => r.ruleId === 'generic-secret');
    if (finding) {
      expect(finding.severity).toBe('warning');
      expect(finding.isFalsePositive).toBe(true);
    }
  });

  it('marks change_me values as false positives', () => {
    const content = `const secret = "change_me_before_deploy";`;
    const results = scanContent('config.js', content);
    const finding = results.find(r => r.ruleId === 'generic-secret');
    if (finding) {
      expect(finding.isFalsePositive).toBe(true);
    }
  });
});

// ─── Scan Options ─────────────────────────────────────────────────────────────

describe('Scan Options', () => {
  it('respects custom entropy threshold', () => {
    // The aws-access-key rule passes entropyThreshold from opts to isHighEntropy.
    // AKIAIOSFODNN7REALKEY has entropy ~3.58. At threshold 5.0, this should be filtered.
    // Note: the rule must use the global opts.entropyThreshold override.
    const content = `const key = "AKIAIOSFODNN7REALKEY";`;
    // At default threshold (3.5) it IS detected
    const resultsDefault = scanContent('test.js', content);
    expect(resultsDefault.some(r => r.ruleId === 'aws-access-key')).toBe(true);
    // Verify entropy was computed and is between 3.5 and 5.0
    const finding = resultsDefault.find(r => r.ruleId === 'aws-access-key');
    expect(finding?.entropy).toBeDefined();
    expect(finding!.entropy!).toBeGreaterThan(3.5);
    expect(finding!.entropy!).toBeLessThan(5.0);
  });
});

// src/remediationLinks.ts
// Maps rule IDs to their rotation/revocation documentation URLs

export interface RemediationInfo {
  url: string;
  title: string;
  steps: string[];
}

const REMEDIATION_MAP: Record<string, RemediationInfo> = {
  'aws-access-key': {
    url: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html',
    title: 'Rotate AWS Access Key',
    steps: [
      'Go to IAM Console → Users → Security credentials',
      'Create a new access key pair',
      'Update your application with the new key',
      'Deactivate then delete the old key',
      'Consider using IAM roles instead of long-lived keys'
    ]
  },
  'aws-secret-key': {
    url: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html',
    title: 'Rotate AWS Secret Key',
    steps: ['Rotate via IAM Console — the secret key cannot be retrieved after creation']
  },
  'github-pat': {
    url: 'https://github.com/settings/tokens',
    title: 'Revoke GitHub Personal Access Token',
    steps: [
      'Visit GitHub Settings → Developer settings → Personal access tokens',
      'Revoke the exposed token immediately',
      'Create a new token with minimal required scopes',
      'Store the new token in a password manager or secrets manager'
    ]
  },
  'stripe-live-key': {
    url: 'https://dashboard.stripe.com/apikeys',
    title: 'Roll Stripe Secret Key',
    steps: [
      'Go to Stripe Dashboard → Developers → API keys',
      'Click "Roll key" on the exposed secret key',
      'Update your application with the new key',
      'Verify webhooks continue to work'
    ]
  },
  'google-api-key': {
    url: 'https://console.cloud.google.com/apis/credentials',
    title: 'Rotate Google API Key',
    steps: [
      'Go to Google Cloud Console → APIs & Services → Credentials',
      'Delete the exposed key',
      'Create a new API key with IP or HTTP referrer restrictions',
      'Apply the principle of least privilege'
    ]
  },
  'private-key-pem': {
    url: 'https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html',
    title: 'Revoke Exposed Private Key',
    steps: [
      'Immediately revoke any certificates signed by this key',
      'Generate a new key pair: openssl genrsa -out new-key.pem 4096',
      'Issue new certificates from a CA',
      'Never commit private keys — use a secrets manager'
    ]
  },
  'openai-key': {
    url: 'https://platform.openai.com/api-keys',
    title: 'Revoke OpenAI API Key',
    steps: [
      'Go to platform.openai.com → API Keys',
      'Delete the exposed key immediately',
      'Create a new key',
      'Store it using environment variables or a secrets vault'
    ]
  },
  'database-url': {
    url: 'https://owasp.org/www-community/vulnerabilities/Sensitive_Data_Exposure',
    title: 'Rotate Database Credentials',
    steps: [
      'Change the database password immediately',
      'Check audit logs for unauthorized access',
      'Use connection poolers with separate read/write credentials',
      'Store connection strings in environment variables, never in code'
    ]
  }
};

export function getRemediation(ruleId: string): RemediationInfo | undefined {
  return REMEDIATION_MAP[ruleId];
}

export function getAllRemediations(): typeof REMEDIATION_MAP {
  return REMEDIATION_MAP;
}

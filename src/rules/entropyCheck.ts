// src/rules/entropyCheck.ts
// Shannon entropy calculation — used by TruffleHog, GitGuardian, and others

/**
 * Computes the Shannon entropy of a string (bits per character).
 * High entropy = random-looking = likely a real secret.
 * Low entropy = human-readable / example text = likely a placeholder.
 */
export function shannonEntropy(str: string): number {
  if (!str || str.length === 0) return 0;

  const freq: Record<string, number> = {};
  for (const ch of str) {
    freq[ch] = (freq[ch] || 0) + 1;
  }

  return -Object.values(freq).reduce((sum, count) => {
    const p = count / str.length;
    return sum + p * Math.log2(p);
  }, 0);
}

/**
 * Returns true if the entropy of `value` is >= `threshold`.
 *
 * Real AWS key:            entropy ≈ 3.8–4.2
 * "AKIAIOSFODNN7EXAMPLE":  entropy ≈ 3.1  ← filtered out
 * Default threshold: 3.5
 */
export function isHighEntropy(value: string, threshold = 3.5): boolean {
  return shannonEntropy(value) >= threshold;
}

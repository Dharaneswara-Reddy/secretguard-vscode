// src/cache.ts
// LRU-style cache for scan results — avoids re-scanning unchanged files

import { ScanResult } from './scanner';

interface CacheEntry {
  results: ScanResult[];
  contentHash: string;
  timestamp: number;
}

export class ScanCache {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly MAX_SIZE = 200;

  /** Store results for a file path, keyed by a cheap content hash. */
  set(filePath: string, results: ScanResult[], contentHash?: string): void {
    // LRU eviction: remove the oldest entry
    if (this.cache.size >= this.MAX_SIZE) {
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
    }
    this.cache.set(filePath, {
      results,
      contentHash: contentHash ?? String(Date.now()),
      timestamp: Date.now()
    });
  }

  /** Retrieve cached results; returns undefined if not cached. */
  get(filePath: string): ScanResult[] | undefined {
    return this.cache.get(filePath)?.results;
  }

  /** Check whether a file is cached with a specific content hash. */
  isValid(filePath: string, contentHash: string): boolean {
    return this.cache.get(filePath)?.contentHash === contentHash;
  }

  /** Flat list of all cached findings across all files. */
  getAll(): ScanResult[] {
    return Array.from(this.cache.values()).flatMap(v => v.results);
  }

  /** Get all findings grouped by file path. */
  getAllByFile(): Map<string, ScanResult[]> {
    const map = new Map<string, ScanResult[]>();
    for (const [filePath, entry] of this.cache.entries()) {
      if (entry.results.length > 0) {
        map.set(filePath, entry.results);
      }
    }
    return map;
  }

  clear(): void {
    this.cache.clear();
  }

  invalidate(filePath: string): void {
    this.cache.delete(filePath);
  }

  get size(): number {
    return this.cache.size;
  }
}

/** Cheap djb2 string hash for change detection */
export function hashString(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return String(hash >>> 0);
}

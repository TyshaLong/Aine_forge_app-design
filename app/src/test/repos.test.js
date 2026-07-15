import { describe, it, expect } from 'vitest';
import { REPOS, repoUrl } from '../lib/repos.js';

describe('REPOS', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(REPOS)).toBe(true);
    expect(REPOS.length).toBeGreaterThan(0);
  });

  it('every entry has required string fields', () => {
    for (const repo of REPOS) {
      expect(typeof repo.short).toBe('string');
      expect(repo.short.length).toBeGreaterThan(0);

      expect(typeof repo.full).toBe('string');
      expect(repo.full).toMatch(/^[^/\s]+\/[^/\s]+$/); // owner/name format

      expect(typeof repo.url).toBe('string');
      expect(repo.url).toMatch(/^https:\/\/github\.com\//);
    }
  });

  it('url field matches the full field for every entry', () => {
    for (const repo of REPOS) {
      expect(repo.url).toBe(`https://github.com/${repo.full}`);
    }
  });

  it('full values are unique', () => {
    const fulls = REPOS.map((r) => r.full);
    expect(new Set(fulls).size).toBe(fulls.length);
  });
});

describe('repoUrl()', () => {
  it('returns the url field for a known repo', () => {
    const known = REPOS[0];
    expect(repoUrl(known.full)).toBe(known.url);
  });

  it('constructs a fallback URL for an unknown repo', () => {
    expect(repoUrl('some-owner/some-repo')).toBe('https://github.com/some-owner/some-repo');
  });

  it('returns the correct URL for every registered repo', () => {
    for (const repo of REPOS) {
      expect(repoUrl(repo.full)).toBe(`https://github.com/${repo.full}`);
    }
  });
});

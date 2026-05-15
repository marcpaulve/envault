import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import {
  createShareToken,
  resolveShareToken,
  revokeShareToken,
  listShareTokens,
} from './sharing';

vi.mock('fs/promises');

const mockFs = fs as unknown as { [K in keyof typeof fs]: ReturnType<typeof vi.fn> };

let storedData: string | null = null;

beforeEach(() => {
  storedData = null;
  mockFs.readFile = vi.fn().mockImplementation(async () => {
    if (!storedData) throw new Error('ENOENT');
    return storedData;
  });
  mockFs.writeFile = vi.fn().mockImplementation(async (_path: string, data: string) => {
    storedData = data;
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('createShareToken', () => {
  it('creates a token with correct structure', async () => {
    const token = await createShareToken(
      '.env.vault',
      'master-pass',
      'recipient-pass',
      'alice',
      ['read'],
      24
    );
    expect(token.id).toHaveLength(32);
    expect(token.vaultPath).toBe('.env.vault');
    expect(token.createdBy).toBe('alice');
    expect(token.permissions).toEqual(['read']);
    expect(token.expiresAt).not.toBeNull();
    expect(token.encryptedKey).toBeTruthy();
  });

  it('creates a token with no expiry when expiresInHours is null', async () => {
    const token = await createShareToken('.env.vault', 'master-pass', 'recipient-pass', 'bob', ['read', 'write'], null);
    expect(token.expiresAt).toBeNull();
  });
});

describe('resolveShareToken', () => {
  it('resolves token and returns master password', async () => {
    const token = await createShareToken('.env.vault', 'secret-master', 'recipient-pass', 'alice', ['read']);
    const result = await resolveShareToken(token.id, 'recipient-pass');
    expect(result.masterPassword).toBe('secret-master');
    expect(result.permissions).toEqual(['read']);
  });

  it('throws for unknown token id', async () => {
    await expect(resolveShareToken('nonexistent-id', 'pass')).rejects.toThrow("Share token 'nonexistent-id' not found");
  });

  it('throws for expired token', async () => {
    const token = await createShareToken('.env.vault', 'master', 'pass', 'alice', ['read'], -1);
    await expect(resolveShareToken(token.id, 'pass')).rejects.toThrow('expired');
  });
});

describe('revokeShareToken', () => {
  it('removes token from store', async () => {
    const token = await createShareToken('.env.vault', 'master', 'pass', 'alice');
    await revokeShareToken(token.id);
    const tokens = await listShareTokens();
    expect(tokens.find((t) => t.id === token.id)).toBeUndefined();
  });
});

describe('listShareTokens', () => {
  it('returns all tokens when no vaultPath filter', async () => {
    await createShareToken('vault-a', 'master', 'pass', 'alice');
    await createShareToken('vault-b', 'master', 'pass', 'bob');
    const tokens = await listShareTokens();
    expect(tokens.length).toBe(2);
  });

  it('filters tokens by vaultPath', async () => {
    await createShareToken('vault-a', 'master', 'pass', 'alice');
    await createShareToken('vault-b', 'master', 'pass', 'bob');
    const tokens = await listShareTokens('vault-a');
    expect(tokens.every((t) => t.vaultPath === 'vault-a')).toBe(true);
  });
});

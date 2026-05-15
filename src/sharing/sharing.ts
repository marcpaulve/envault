import { encrypt, decrypt, deriveKey, serializePayload, deserializePayload } from '../crypto/encryption';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ShareToken {
  id: string;
  vaultPath: string;
  encryptedKey: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string | null;
  permissions: ('read' | 'write')[];
}

export interface ShareTokenStore {
  tokens: ShareToken[];
}

const SHARE_STORE_FILE = '.envault-shares.json';

export async function createShareToken(
  vaultPath: string,
  masterPassword: string,
  recipientPassword: string,
  createdBy: string,
  permissions: ('read' | 'write')[] = ['read'],
  expiresInHours: number | null = null
): Promise<ShareToken> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const masterKey = await deriveKey(masterPassword, salt);
  const recipientKey = await deriveKey(recipientPassword, salt);

  const keyMaterial = Buffer.from(masterPassword).toString('base64');
  const encrypted = await encrypt(keyMaterial, recipientKey);
  const encryptedKey = serializePayload(encrypted);

  const token: ShareToken = {
    id: generateTokenId(),
    vaultPath,
    encryptedKey,
    createdBy,
    createdAt: new Date().toISOString(),
    expiresAt: expiresInHours
      ? new Date(Date.now() + expiresInHours * 3600 * 1000).toISOString()
      : null,
    permissions,
  };

  await persistToken(token);
  return token;
}

export async function resolveShareToken(
  tokenId: string,
  recipientPassword: string
): Promise<{ masterPassword: string; permissions: ('read' | 'write')[] }> {
  const store = await loadTokenStore();
  const token = store.tokens.find((t) => t.id === tokenId);
  if (!token) throw new Error(`Share token '${tokenId}' not found`);
  if (token.expiresAt && new Date(token.expiresAt) < new Date()) {
    throw new Error(`Share token '${tokenId}' has expired`);
  }
  const payload = deserializePayload(token.encryptedKey);
  const salt = payload.salt;
  const recipientKey = await deriveKey(recipientPassword, salt);
  const masterPasswordB64 = await decrypt(payload, recipientKey);
  return {
    masterPassword: Buffer.from(masterPasswordB64, 'base64').toString(),
    permissions: token.permissions,
  };
}

export async function revokeShareToken(tokenId: string): Promise<void> {
  const store = await loadTokenStore();
  store.tokens = store.tokens.filter((t) => t.id !== tokenId);
  await saveTokenStore(store);
}

export async function listShareTokens(vaultPath?: string): Promise<ShareToken[]> {
  const store = await loadTokenStore();
  return vaultPath ? store.tokens.filter((t) => t.vaultPath === vaultPath) : store.tokens;
}

function generateTokenId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function loadTokenStore(): Promise<ShareTokenStore> {
  try {
    const raw = await fs.readFile(SHARE_STORE_FILE, 'utf-8');
    return JSON.parse(raw) as ShareTokenStore;
  } catch {
    return { tokens: [] };
  }
}

async function saveTokenStore(store: ShareTokenStore): Promise<void> {
  await fs.writeFile(SHARE_STORE_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

async function persistToken(token: ShareToken): Promise<void> {
  const store = await loadTokenStore();
  store.tokens.push(token);
  await saveTokenStore(store);
}

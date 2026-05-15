import { encrypt, decrypt, serializePayload, deserializePayload, deriveKey } from '../crypto/encryption';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface VaultEntry {
  key: string;
  value: string;
  updatedAt: string;
  updatedBy: string;
}

export interface VaultFile {
  version: number;
  entries: Record<string, string>; // key -> serialized encrypted payload
  metadata: Record<string, { updatedAt: string; updatedBy: string }>;
}

export async function createVault(filePath: string): Promise<void> {
  const vault: VaultFile = { version: 1, entries: {}, metadata: {} };
  await fs.writeFile(filePath, JSON.stringify(vault, null, 2), 'utf-8');
}

export async function readVault(filePath: string): Promise<VaultFile> {
  const raw = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(raw) as VaultFile;
}

export async function writeVault(filePath: string, vault: VaultFile): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(vault, null, 2), 'utf-8');
}

export async function setSecret(
  filePath: string,
  key: string,
  value: string,
  password: string,
  updatedBy: string
): Promise<void> {
  const vault = await readVault(filePath);
  const derivedKey = await deriveKey(password, key);
  const payload = await encrypt(value, derivedKey);
  vault.entries[key] = serializePayload(payload);
  vault.metadata[key] = { updatedAt: new Date().toISOString(), updatedBy };
  await writeVault(filePath, vault);
}

export async function getSecret(
  filePath: string,
  key: string,
  password: string
): Promise<string> {
  const vault = await readVault(filePath);
  const serialized = vault.entries[key];
  if (!serialized) throw new Error(`Key "${key}" not found in vault.`);
  const derivedKey = await deriveKey(password, key);
  const payload = deserializePayload(serialized);
  return decrypt(payload, derivedKey);
}

export async function deleteSecret(filePath: string, key: string): Promise<void> {
  const vault = await readVault(filePath);
  if (!vault.entries[key]) throw new Error(`Key "${key}" not found in vault.`);
  delete vault.entries[key];
  delete vault.metadata[key];
  await writeVault(filePath, vault);
}

export async function listSecrets(filePath: string): Promise<VaultEntry[]> {
  const vault = await readVault(filePath);
  return Object.keys(vault.entries).map((key) => ({
    key,
    value: '[encrypted]',
    updatedAt: vault.metadata[key]?.updatedAt ?? '',
    updatedBy: vault.metadata[key]?.updatedBy ?? '',
  }));
}

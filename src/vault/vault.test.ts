import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  createVault,
  setSecret,
  getSecret,
  deleteSecret,
  listSecrets,
} from './vault';

let tmpDir: string;
let vaultPath: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'envault-'));
  vaultPath = path.join(tmpDir, 'test.vault.json');
  await createVault(vaultPath);
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('vault', () => {
  const password = 'super-secret-password';
  const user = 'alice@example.com';

  test('createVault creates a valid vault file', async () => {
    const raw = await fs.readFile(vaultPath, 'utf-8');
    const vault = JSON.parse(raw);
    expect(vault.version).toBe(1);
    expect(vault.entries).toEqual({});
    expect(vault.metadata).toEqual({});
  });

  test('setSecret and getSecret round-trip', async () => {
    await setSecret(vaultPath, 'DB_PASSWORD', 'hunter2', password, user);
    const value = await getSecret(vaultPath, 'DB_PASSWORD', password);
    expect(value).toBe('hunter2');
  });

  test('setSecret overwrites an existing key', async () => {
    await setSecret(vaultPath, 'DB_PASSWORD', 'hunter2', password, user);
    await setSecret(vaultPath, 'DB_PASSWORD', 'newpassword', password, user);
    const value = await getSecret(vaultPath, 'DB_PASSWORD', password);
    expect(value).toBe('newpassword');
    const secrets = await listSecrets(vaultPath);
    expect(secrets.filter((s) => s.key === 'DB_PASSWORD')).toHaveLength(1);
  });

  test('getSecret throws for missing key', async () => {
    await expect(getSecret(vaultPath, 'MISSING_KEY', password)).rejects.toThrow(
      'Key "MISSING_KEY" not found in vault.'
    );
  });

  test('getSecret throws for wrong password', async () => {
    await setSecret(vaultPath, 'API_KEY', 'abc123', password, user);
    await expect(getSecret(vaultPath, 'API_KEY', 'wrong-password')).rejects.toThrow();
  });

  test('deleteSecret removes the entry', async () => {
    await setSecret(vaultPath, 'TOKEN', 'mytoken', password, user);
    await deleteSecret(vaultPath, 'TOKEN');
    const secrets = await listSecrets(vaultPath);
    expect(secrets.find((s) => s.key === 'TOKEN')).toBeUndefined();
  });

  test('deleteSecret throws for missing key', async () => {
    await expect(deleteSecret(vaultPath, 'NONEXISTENT')).rejects.toThrow(
      'Key "NONEXISTENT" not found in vault.'
    );
  });

  test('listSecrets returns metadata without plaintext values', async () => {
    await setSecret(vaultPath, 'SECRET_A', 'valueA', password, user);
    await setSecret(vaultPath, 'SECRET_B', 'valueB', password, user);
    const secrets = await listSecrets(vaultPath);
    expect(secrets).toHaveLength(2);
    const entry = secrets.find((s) => s.key === 'SECRET_A')!;
    expect(entry.value).toBe('[encrypted]');
    expect(entry.updatedBy).toBe(user);
    expect(entry.updatedAt).toBeTruthy();
  });
});

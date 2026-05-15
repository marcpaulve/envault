export type { VaultEntry, VaultFile } from './vault';
export {
  createVault,
  readVault,
  writeVault,
  setSecret,
  getSecret,
  deleteSecret,
  listSecrets,
} from './vault';

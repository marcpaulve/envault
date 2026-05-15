import * as path from 'path';
import { appendAuditEntry, createAuditEntry, AuditAction } from './audit';

const DEFAULT_LOG_DIR = '.envault';
const DEFAULT_LOG_FILE = 'audit.log.json';

export interface AuditLoggerOptions {
  logDir?: string;
  logFile?: string;
  actor: string;
}

export class AuditLogger {
  private logPath: string;
  private actor: string;

  constructor(options: AuditLoggerOptions) {
    const dir = options.logDir ?? DEFAULT_LOG_DIR;
    const file = options.logFile ?? DEFAULT_LOG_FILE;
    this.logPath = path.join(dir, file);
    this.actor = options.actor;
  }

  log(action: AuditAction, details?: Record<string, string>): void {
    const entry = createAuditEntry(action, this.actor, details);
    appendAuditEntry(this.logPath, entry);
  }

  logSecretAdd(key: string): void {
    this.log('secret:add', { key });
  }

  logSecretUpdate(key: string): void {
    this.log('secret:update', { key });
  }

  logSecretDelete(key: string): void {
    this.log('secret:delete', { key });
  }

  logSecretRead(key: string): void {
    this.log('secret:read', { key });
  }

  logVaultCreate(vaultName: string): void {
    this.log('vault:create', { vault: vaultName });
  }

  logVaultOpen(vaultName: string): void {
    this.log('vault:open', { vault: vaultName });
  }

  getLogPath(): string {
    return this.logPath;
  }
}

import * as fs from 'fs';
import * as path from 'path';

export type AuditAction =
  | 'vault:create'
  | 'vault:open'
  | 'secret:add'
  | 'secret:update'
  | 'secret:delete'
  | 'secret:read'
  | 'vault:export'
  | 'vault:import';

export interface AuditEntry {
  timestamp: string;
  action: AuditAction;
  actor: string;
  details?: Record<string, string>;
}

export interface AuditLog {
  entries: AuditEntry[];
}

export function createAuditEntry(
  action: AuditAction,
  actor: string,
  details?: Record<string, string>
): AuditEntry {
  return {
    timestamp: new Date().toISOString(),
    action,
    actor,
    details,
  };
}

export function appendAuditEntry(logPath: string, entry: AuditEntry): void {
  let log: AuditLog = { entries: [] };

  if (fs.existsSync(logPath)) {
    const raw = fs.readFileSync(logPath, 'utf-8');
    log = JSON.parse(raw) as AuditLog;
  }

  log.entries.push(entry);

  const dir = path.dirname(logPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(logPath, JSON.stringify(log, null, 2), 'utf-8');
}

export function readAuditLog(logPath: string): AuditLog {
  if (!fs.existsSync(logPath)) {
    return { entries: [] };
  }
  const raw = fs.readFileSync(logPath, 'utf-8');
  return JSON.parse(raw) as AuditLog;
}

export function filterAuditLog(
  log: AuditLog,
  options: { actor?: string; action?: AuditAction; since?: Date }
): AuditEntry[] {
  return log.entries.filter((entry) => {
    if (options.actor && entry.actor !== options.actor) return false;
    if (options.action && entry.action !== options.action) return false;
    if (options.since && new Date(entry.timestamp) < options.since) return false;
    return true;
  });
}

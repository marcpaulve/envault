import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  createAuditEntry,
  appendAuditEntry,
  readAuditLog,
  filterAuditLog,
} from './audit';

let tmpDir: string;
let logPath: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envault-audit-'));
  logPath = path.join(tmpDir, 'audit.log.json');
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('createAuditEntry', () => {
  it('creates an entry with the correct fields', () => {
    const entry = createAuditEntry('secret:add', 'alice', { key: 'DB_URL' });
    expect(entry.action).toBe('secret:add');
    expect(entry.actor).toBe('alice');
    expect(entry.details).toEqual({ key: 'DB_URL' });
    expect(entry.timestamp).toBeTruthy();
  });
});

describe('appendAuditEntry', () => {
  it('creates the log file if it does not exist', () => {
    const entry = createAuditEntry('vault:create', 'bob');
    appendAuditEntry(logPath, entry);
    expect(fs.existsSync(logPath)).toBe(true);
  });

  it('appends multiple entries', () => {
    appendAuditEntry(logPath, createAuditEntry('vault:create', 'alice'));
    appendAuditEntry(logPath, createAuditEntry('secret:add', 'alice', { key: 'API_KEY' }));
    const log = readAuditLog(logPath);
    expect(log.entries).toHaveLength(2);
  });
});

describe('readAuditLog', () => {
  it('returns empty log when file does not exist', () => {
    const log = readAuditLog('/nonexistent/path/audit.json');
    expect(log.entries).toHaveLength(0);
  });
});

describe('filterAuditLog', () => {
  it('filters by actor', () => {
    const log = {
      entries: [
        createAuditEntry('secret:add', 'alice'),
        createAuditEntry('secret:read', 'bob'),
      ],
    };
    const result = filterAuditLog(log, { actor: 'alice' });
    expect(result).toHaveLength(1);
    expect(result[0].actor).toBe('alice');
  });

  it('filters by action', () => {
    const log = {
      entries: [
        createAuditEntry('secret:add', 'alice'),
        createAuditEntry('secret:delete', 'alice'),
      ],
    };
    const result = filterAuditLog(log, { action: 'secret:delete' });
    expect(result).toHaveLength(1);
    expect(result[0].action).toBe('secret:delete');
  });

  it('filters by since date', () => {
    const past = createAuditEntry('vault:open', 'alice');
    past.timestamp = new Date(Date.now() - 10000).toISOString();
    const recent = createAuditEntry('secret:read', 'alice');
    const log = { entries: [past, recent] };
    const result = filterAuditLog(log, { since: new Date(Date.now() - 5000) });
    expect(result).toHaveLength(1);
  });
});

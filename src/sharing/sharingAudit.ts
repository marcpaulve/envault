import { createAuditEntry, appendAuditEntry } from '../audit/audit';
import { ShareToken } from './sharing';

export type SharingAction = 'token_created' | 'token_resolved' | 'token_revoked';

export interface SharingAuditContext {
  auditLogPath: string;
  actor: string;
}

export async function auditTokenCreated(
  token: ShareToken,
  ctx: SharingAuditContext
): Promise<void> {
  const entry = createAuditEntry({
    action: 'token_created',
    actor: ctx.actor,
    vaultPath: token.vaultPath,
    metadata: {
      tokenId: token.id,
      permissions: token.permissions.join(','),
      expiresAt: token.expiresAt ?? 'never',
    },
  });
  await appendAuditEntry(ctx.auditLogPath, entry);
}

export async function auditTokenResolved(
  tokenId: string,
  vaultPath: string,
  ctx: SharingAuditContext
): Promise<void> {
  const entry = createAuditEntry({
    action: 'token_resolved',
    actor: ctx.actor,
    vaultPath,
    metadata: { tokenId },
  });
  await appendAuditEntry(ctx.auditLogPath, entry);
}

export async function auditTokenRevoked(
  tokenId: string,
  vaultPath: string,
  ctx: SharingAuditContext
): Promise<void> {
  const entry = createAuditEntry({
    action: 'token_revoked',
    actor: ctx.actor,
    vaultPath,
    metadata: { tokenId },
  });
  await appendAuditEntry(ctx.auditLogPath, entry);
}

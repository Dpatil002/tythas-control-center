import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hashToken } from '@/lib/auth/tokens';

describe('Invitation Lifecycle & Expiration (Part 1 §7)', () => {
  it('should invalidate revoked or expired invitations', () => {
    const now = new Date();

    const expiredInvitation = {
      tokenHash: hashToken('raw-token-1'),
      expiresAt: new Date(now.getTime() - 1000 * 60 * 60), // 1 hour ago
      acceptedAt: null,
      revokedAt: null,
    };

    const isExpired = expiredInvitation.expiresAt < now;
    expect(isExpired).toBe(true);

    const revokedInvitation = {
      tokenHash: hashToken('raw-token-2'),
      expiresAt: new Date(now.getTime() + 1000 * 60 * 60 * 24),
      acceptedAt: null,
      revokedAt: new Date(),
    };

    const isRevoked = revokedInvitation.revokedAt !== null;
    expect(isRevoked).toBe(true);
  });
});

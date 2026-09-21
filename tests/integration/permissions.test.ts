import { describe, it, expect } from 'vitest';
import { requireRole, AuthContext } from '@/lib/auth/context';
import { ForbiddenError } from '@/lib/http/errors';

describe('Role-Based Permissions & Guardrails (Part 1 §3 & §7)', () => {
  const managerContext: AuthContext = {
    userId: 'manager-1',
    email: 'manager@agency.com',
    organizationId: 'org-1',
    organizationName: 'Agency Org',
    role: 'MANAGER',
    sessionId: 'sess-1',
  };

  const ownerContext: AuthContext = {
    userId: 'owner-1',
    email: 'owner@agency.com',
    organizationId: 'org-1',
    organizationName: 'Agency Org',
    role: 'OWNER',
    sessionId: 'sess-2',
  };

  it('should allow Owner to proceed with OWNER-restricted operations', () => {
    expect(() => requireRole(ownerContext, 'OWNER')).not.toThrow();
  });

  it('should strictly block Manager from performing OWNER-only actions with 403 Forbidden', () => {
    expect(() => requireRole(managerContext, 'OWNER')).toThrow(ForbiddenError);
  });
});

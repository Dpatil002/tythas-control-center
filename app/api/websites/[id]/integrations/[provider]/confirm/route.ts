import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { getIntegrationAdapter, isIntegrationProvider } from '@/lib/integrations/registry';
import { z } from 'zod';

const ConfirmSchema = z.object({
  selectedAccountId: z.string().min(1, 'Account/Property ID is required'),
  selectedAccountName: z.string().min(1, 'Account/Property name is required'),
  tokens: z
    .object({
      accessToken: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().or(z.date()).optional(),
      scopes: z.array(z.string()).optional(),
    })
    .optional(),
});

export const POST = withHandler<{ id: string; provider: string }>(
  async (
    req: Request,
    context: { params: { id: string; provider: string } }
  ) => {
    const ctx = await requireOrgContext(req);
    const website = await requireWebsiteAccess(ctx, context.params.id);

    const upperProvider = context.params.provider.toUpperCase();
    if (!isIntegrationProvider(upperProvider)) {
      return fail(400, 'INVALID_PROVIDER', 'Invalid integration provider');
    }

    const body = await req.json();
    const input = ConfirmSchema.parse(body);

    const adapter = getIntegrationAdapter(upperProvider);

    const tokens = input.tokens
      ? {
          accessToken: input.tokens.accessToken,
          refreshToken: input.tokens.refreshToken,
          expiresAt: input.tokens.expiresAt ? new Date(input.tokens.expiresAt) : undefined,
          scopes: input.tokens.scopes || [],
        }
      : undefined;

    const connection = await adapter.confirmConnection(
      website,
      input.selectedAccountId,
      input.selectedAccountName,
      tokens
    );

    return ok({
      connection,
      message: `Successfully connected ${input.selectedAccountName}`,
    });
  }
);

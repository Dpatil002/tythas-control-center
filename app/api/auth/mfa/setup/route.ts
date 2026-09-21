import { withHandler } from '@/lib/http/with-handler';
import { requireOrgContext } from '@/lib/auth/context';
import { generateMfaSetup } from '@/lib/auth/mfa';
import { ok } from '@/lib/http/respond';

export const POST = withHandler(async (req) => {
  const ctx = await requireOrgContext(req);
  const setup = await generateMfaSetup(ctx.email);

  return ok({
    otpauthUri: setup.otpauthUri,
    qrCodeDataUrl: setup.qrCodeDataUrl,
    secret: setup.secret,
    encryptedSecret: setup.encryptedSecret,
    backupCodes: setup.backupCodes,
    hashedBackupCodes: setup.hashedBackupCodes,
  });
});

import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { db } from '@/lib/db/prisma';
import crypto from 'crypto';
import { z } from 'zod';

const CreateFormSchema = z.object({
  name: z.string().min(1, 'Form name is required'),
  successMessage: z.string().optional(),
  redirectUrl: z.string().optional(),
});

export const GET = withHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const ctx = await requireOrgContext(req);
  await requireWebsiteAccess(ctx, params.id);

  const forms = await db.form.findMany({
    where: { websiteId: params.id },
    include: {
      fields: { orderBy: { order: 'asc' } },
      actions: { orderBy: { order: 'asc' } },
      _count: {
        select: {
          submissions: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return ok({ forms });
});

export const POST = withHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const ctx = await requireOrgContext(req);
  await requireWebsiteAccess(ctx, params.id);

  const body = await req.json();
  const input = CreateFormSchema.parse(body);

  // Generate unguessable public key (e.g. frm_pk_...)
  const publicKey = `frm_pk_${crypto.randomBytes(16).toString('hex')}`;

  const form = await db.form.create({
    data: {
      websiteId: params.id,
      name: input.name,
      publicKey,
      successMessage: input.successMessage || 'Thank you! Your message has been received.',
      redirectUrl: input.redirectUrl || null,
      status: 'DRAFT',
      fields: {
        create: [
          {
            type: 'TEXT',
            label: 'Full Name',
            placeholder: 'John Doe',
            required: true,
            order: 0,
          },
          {
            type: 'EMAIL',
            label: 'Email Address',
            placeholder: 'john@example.com',
            required: true,
            order: 1,
            validation: 'email',
          },
          {
            type: 'PHONE',
            label: 'Phone Number',
            placeholder: '+1 (555) 000-0000',
            required: false,
            order: 2,
            validation: 'phone',
          },
          {
            type: 'TEXT',
            label: 'Message',
            placeholder: 'How can we help you?',
            required: true,
            order: 3,
          },
        ],
      },
      actions: {
        create: [
          {
            type: 'CREATE_LEAD',
            enabled: true,
            order: 0,
            config: JSON.stringify({}),
          },
          {
            type: 'SHOW_SUCCESS_MESSAGE',
            enabled: true,
            order: 1,
            config: JSON.stringify({ message: input.successMessage || 'Thank you! Your message has been received.' }),
          },
        ],
      },
    },
    include: {
      fields: { orderBy: { order: 'asc' } },
      actions: { orderBy: { order: 'asc' } },
    },
  });

  return ok({ form });
});

import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const CreateMediaSchema = z.object({
  url: z.string().min(1, 'URL is required'),
  filename: z.string().min(1, 'Filename is required'),
  folder: z.string().nullable().optional(),
  altText: z.string().nullable().optional(),
  caption: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
  sizeBytes: z.number().nullable().optional(),
  format: z.string().nullable().optional(),
});

export const GET = withHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const ctx = await requireOrgContext(req);
  await requireWebsiteAccess(ctx, params.id);

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim().toLowerCase();
  const folder = url.searchParams.get('folder');
  const auditFilter = url.searchParams.get('audit'); // 'missing_alt' | 'oversized' | 'non_modern'

  const mediaList = await prisma.media.findMany({
    where: {
      websiteId: params.id,
      ...(q
        ? {
            OR: [
              { filename: { contains: q } },
              { title: { contains: q } },
              { altText: { contains: q } },
            ],
          }
        : {}),
      ...(folder ? { folder } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });

  const formatted = mediaList.map((m) => {
    const ext = (m.format || m.filename.split('.').pop() || '').toLowerCase().replace(/^\./, '');
    const isMissingAlt = !m.altText || m.altText.trim() === '';
    const isOversized = (m.sizeBytes || 0) > 500 * 1024; // > 500 KB
    const isNonModern = !['webp', 'avif', 'svg'].includes(ext);

    return {
      ...m,
      format: ext,
      warnings: {
        missingAlt: isMissingAlt,
        oversized: isOversized,
        nonModern: isNonModern,
      },
    };
  });

  const filtered = formatted.filter((m) => {
    if (auditFilter === 'missing_alt') return m.warnings.missingAlt;
    if (auditFilter === 'oversized') return m.warnings.oversized;
    if (auditFilter === 'non_modern') return m.warnings.nonModern;
    return true;
  });

  // Calculate audit stats across all media in website
  const stats = {
    total: formatted.length,
    missingAltCount: formatted.filter((m) => m.warnings.missingAlt).length,
    oversizedCount: formatted.filter((m) => m.warnings.oversized).length,
    nonModernCount: formatted.filter((m) => m.warnings.nonModern).length,
    totalSizeBytes: formatted.reduce((acc, m) => acc + (m.sizeBytes || 0), 0),
  };

  return ok({ media: filtered, stats });
});

export const POST = withHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const ctx = await requireOrgContext(req);
  await requireWebsiteAccess(ctx, params.id);

  const contentType = req.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || null;
    const altText = (formData.get('altText') as string) || null;
    const caption = (formData.get('caption') as string) || null;
    const title = (formData.get('title') as string) || null;

    if (!file) {
      return fail(400, 'FILE_REQUIRED', 'No file provided in multipart upload');
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
    const sizeBytes = buffer.length;

    // Save to public uploads dir
    const uploadsDir = join(process.cwd(), 'public', 'uploads', params.id);
    await mkdir(uploadsDir, { recursive: true });
    const uniqueFilename = `${Date.now()}_${filename}`;
    const filePath = join(uploadsDir, uniqueFilename);
    await writeFile(filePath, buffer);

    const publicUrl = `/uploads/${params.id}/${uniqueFilename}`;

    const media = await prisma.media.create({
      data: {
        websiteId: params.id,
        url: publicUrl,
        filename: uniqueFilename,
        folder,
        altText,
        caption,
        title: title || filename,
        width: 1200, // standard default / extracted
        height: 800,
        sizeBytes,
        format: ext,
      },
    });

    return ok({ media });
  }

  // JSON creation
  const body = await req.json();
  const input = CreateMediaSchema.parse(body);

  const media = await prisma.media.create({
    data: {
      websiteId: params.id,
      url: input.url,
      filename: input.filename,
      folder: input.folder || null,
      altText: input.altText || null,
      caption: input.caption || null,
      title: input.title || input.filename,
      width: input.width || null,
      height: input.height || null,
      sizeBytes: input.sizeBytes || null,
      format: input.format || input.filename.split('.').pop() || 'jpg',
    },
  });

  return ok({ media });
});

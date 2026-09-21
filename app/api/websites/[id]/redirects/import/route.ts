import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { prisma } from '@/lib/db/prisma';
import { normalizePath } from '@/lib/seo/redirects';
import { parse } from 'csv-parse/sync';

export const POST = withHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const ctx = await requireOrgContext(req);
  await requireWebsiteAccess(ctx, params.id);

  let csvContent = '';
  const contentType = req.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return fail(400, 'MISSING_FILE', 'No CSV file was uploaded.');
    }
    csvContent = await file.text();
  } else {
    const body = await req.json();
    csvContent = body.csvContent || '';
  }

  if (!csvContent.trim()) {
    return fail(400, 'EMPTY_CSV', 'CSV content is empty.');
  }

  let records: string[][];
  try {
    records = parse(csvContent, {
      skip_empty_lines: true,
      trim: true
    });
  } catch (err: any) {
    return fail(400, 'INVALID_CSV_SYNTAX', `Failed to parse CSV: ${err?.message}`);
  }

  if (records.length === 0) {
    return fail(400, 'EMPTY_CSV', 'No valid rows found in CSV.');
  }

  // Detect and skip header row if present
  let startIndex = 0;
  const firstRow = records[0];
  if (
    firstRow[0]?.toLowerCase().includes('from') ||
    firstRow[0]?.toLowerCase().includes('source') ||
    firstRow[1]?.toLowerCase().includes('to') ||
    firstRow[1]?.toLowerCase().includes('dest')
  ) {
    startIndex = 1;
  }

  const results: Array<{
    row: number;
    fromPath: string;
    toPath: string;
    type: string;
    status: 'SUCCESS' | 'FAILED';
    error?: string;
  }> = [];

  let importedCount = 0;
  let failedCount = 0;

  for (let i = startIndex; i < records.length; i++) {
    const rowNum = i + 1;
    const row = records[i];
    const rawFrom = row[0];
    const rawTo = row[1];
    let type = (row[2] || '301').toUpperCase().trim();
    if (!type.startsWith('R') && ['301', '302', '307', '308'].includes(type)) {
      type = 'R' + type;
    }
    if (!['R301', 'R302', 'R307', 'R308'].includes(type)) {
      type = 'R301';
    }

    if (!rawFrom || !rawTo) {
      results.push({
        row: rowNum,
        fromPath: rawFrom || '',
        toPath: rawTo || '',
        type,
        status: 'FAILED',
        error: 'Missing from or to path'
      });
      failedCount++;
      continue;
    }

    const fromNorm = normalizePath(rawFrom);
    const toNorm = normalizePath(rawTo);

    if (fromNorm === toNorm) {
      results.push({
        row: rowNum,
        fromPath: fromNorm,
        toPath: toNorm,
        type,
        status: 'FAILED',
        error: 'Cannot redirect path to itself'
      });
      failedCount++;
      continue;
    }

    try {
      await prisma.redirect.upsert({
        where: {
          websiteId_fromPath: {
            websiteId: params.id,
            fromPath: fromNorm
          }
        },
        update: {
          toPath: toNorm,
          type
        },
        create: {
          websiteId: params.id,
          fromPath: fromNorm,
          toPath: toNorm,
          type
        }
      });

      results.push({
        row: rowNum,
        fromPath: fromNorm,
        toPath: toNorm,
        type,
        status: 'SUCCESS'
      });
      importedCount++;
    } catch (dbErr: any) {
      results.push({
        row: rowNum,
        fromPath: fromNorm,
        toPath: toNorm,
        type,
        status: 'FAILED',
        error: dbErr?.message || 'Database error'
      });
      failedCount++;
    }
  }

  return ok({
    importedCount,
    failedCount,
    totalProcessed: records.length - startIndex,
    results
  });
});

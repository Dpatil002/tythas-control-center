import { withHandler } from '@/lib/http/with-handler';
import { ok, fail } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { prisma } from '@/lib/db/prisma';
import { NotFoundError } from '@/lib/http/errors';
import { extractFaqsFromDocument, generateJsonLd } from '@/lib/schema/generate';

export const POST = withHandler(async (req: Request, { params }: { params: { id: string; postId: string } }) => {
  const ctx = await requireOrgContext(req);
  await requireWebsiteAccess(ctx, params.id);

  const post = await prisma.blogPost.findFirst({
    where: { id: params.postId, websiteId: params.id }
  });

  if (!post) {
    throw new NotFoundError('Blog post not found');
  }

  const faqs = extractFaqsFromDocument(post.content);
  if (faqs.length === 0) {
    return fail(400, 'NO_FAQS_FOUND', 'No FAQ questions and answers were found in this blog post content.');
  }

  const schemaData = { faqs };
  const jsonLd = generateJsonLd('FAQ_PAGE', schemaData);

  // Check if an existing auto_faq schema exists and update it, else create
  const existing = await prisma.postSchema.findFirst({
    where: {
      postId: params.postId,
      type: 'FAQ_PAGE',
      source: 'auto_faq'
    }
  });

  let schema;
  if (existing) {
    schema = await prisma.postSchema.update({
      where: { id: existing.id },
      data: {
        data: JSON.stringify(schemaData),
        jsonLd: JSON.stringify(jsonLd)
      }
    });
  } else {
    schema = await prisma.postSchema.create({
      data: {
        postId: params.postId,
        type: 'FAQ_PAGE',
        data: JSON.stringify(schemaData),
        jsonLd: JSON.stringify(jsonLd),
        source: 'auto_faq'
      }
    });
  }

  return ok({
    schema: {
      ...schema,
      data: schemaData,
      jsonLd
    },
    extractedCount: faqs.length
  });
});

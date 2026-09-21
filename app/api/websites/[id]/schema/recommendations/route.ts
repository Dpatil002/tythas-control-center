import { withHandler } from '@/lib/http/with-handler';
import { ok } from '@/lib/http/respond';
import { requireOrgContext, requireWebsiteAccess } from '@/lib/auth/context';
import { prisma } from '@/lib/db/prisma';
import { extractFaqsFromDocument } from '@/lib/schema/generate';

export interface SchemaRecommendation {
  id: string;
  type: string;
  title: string;
  reason: string;
  contentId: string;
  contentType: 'page' | 'post';
  contentTitle: string;
  action: 'create_faq' | 'create_blog_posting' | 'create_org' | 'create_product';
}

export const GET = withHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const ctx = await requireOrgContext(req);
  await requireWebsiteAccess(ctx, params.id);

  const website = await prisma.website.findUnique({
    where: { id: params.id },
    include: {
      pages: {
        include: { schemas: true, sections: true }
      },
      blogPosts: {
        include: { schemas: true }
      }
    }
  });

  if (!website) {
    return ok({ recommendations: [] });
  }

  const recommendations: SchemaRecommendation[] = [];

  // Check 1: Blog posts with FAQ blocks but no FAQ_PAGE schema
  for (const post of website.blogPosts) {
    const hasFaqSchema = post.schemas.some((s) => s.type === 'FAQ_PAGE');
    const faqs = extractFaqsFromDocument(post.content);
    if (faqs.length > 0 && !hasFaqSchema) {
      recommendations.push({
        id: `faq-post-${post.id}`,
        type: 'FAQ_PAGE',
        title: `Add FAQ Schema to "${post.title}"`,
        reason: `Detected ${faqs.length} structured FAQ item${faqs.length === 1 ? '' : 's'} in this blog post.`,
        contentId: post.id,
        contentType: 'post',
        contentTitle: post.title,
        action: 'create_faq'
      });
    }

    // Check 2: Blog post without Article / BlogPosting schema
    const hasArticleSchema = post.schemas.some((s) => s.type === 'BLOG_POSTING' || s.type === 'ARTICLE');
    if (!hasArticleSchema) {
      recommendations.push({
        id: `article-post-${post.id}`,
        type: 'BLOG_POSTING',
        title: `Add BlogPosting Schema to "${post.title}"`,
        reason: 'Adding structured BlogPosting metadata helps search engines attribute authors and indexing dates.',
        contentId: post.id,
        contentType: 'post',
        contentTitle: post.title,
        action: 'create_blog_posting'
      });
    }
  }

  // Check 3: Check Pages for FAQ blocks or Product keywords
  for (const page of website.pages) {
    const hasFaqSchema = page.schemas.some((s) => s.type === 'FAQ_PAGE');
    const hasProductSchema = page.schemas.some((s) => s.type === 'PRODUCT');

    // Check if page sections have FAQ
    const faqs = extractFaqsFromDocument(JSON.stringify({ sections: page.sections }));
    if (faqs.length > 0 && !hasFaqSchema) {
      recommendations.push({
        id: `faq-page-${page.id}`,
        type: 'FAQ_PAGE',
        title: `Add FAQ Schema to "${page.title}"`,
        reason: `Detected ${faqs.length} FAQ accordion items in page sections.`,
        contentId: page.id,
        contentType: 'page',
        contentTitle: page.title,
        action: 'create_faq'
      });
    }

    if (
      (page.slug.includes('shop') || page.slug.includes('product') || page.title.toLowerCase().includes('product')) &&
      !hasProductSchema
    ) {
      recommendations.push({
        id: `product-page-${page.id}`,
        type: 'PRODUCT',
        title: `Add Product Schema to "${page.title}"`,
        reason: 'This page appears to describe a product offering.',
        contentId: page.id,
        contentType: 'page',
        contentTitle: page.title,
        action: 'create_product'
      });
    }
  }

  return ok({ recommendations });
});
